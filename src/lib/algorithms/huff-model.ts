import type {
  BusinessNature,
  ConsumerBlock,
  DistrictStats,
  DistrictType,
  LatLng,
  MarketShareResult,
  RevenueEstimate,
  StoreEntity,
} from "@/types";
import type { LOCALDATARecord } from "@/lib/data-pipeline/types";

import {
  AVG_MONTHLY_VISITS,
  AVG_SPENDING,
  BASE_RENT_PER_SQM,
  CAPTURE_RATE,
  DEMAND_HEALTH_MULTIPLIER_RANGE,
  DISTANCE_DECAY_MATRIX,
  FRANCHISE_BRANDS,
  MARKET_SHARE_CUTOFF_METERS,
  MARKET_SHARE_EPSILON_METERS,
  TARGET_MARGIN_RATIO,
  WALKING_DISTANCE_MULTIPLIER,
  inferBusinessNatureFromCategory,
  normalizeBusinessCategoryKey,
} from "./constants";

export interface DistanceOptions {
  districtType?: DistrictType;
  walkingMultiplier?: number;
}

export interface MarketShareOptions extends DistanceOptions {
  districtType?: DistrictType;
  businessNature?: BusinessNature;
  cutoffMeters?: number;
}

export interface RevenueEstimationOptions extends MarketShareOptions {
  consumerBlocks?: ConsumerBlock[];
  competitors?: StoreEntity[];
  districtStats?: DistrictStats | null;
  recentChanges?: LOCALDATARecord[];
  monthlyVisitFrequency?: number;
  healthMultiplier?: number;
  percentileBenchmarks?: number[];
  targetStoreName?: string;
  openedAt?: string | null;
}

interface KDNode {
  axis: 0 | 1;
  store: StoreEntity;
  left: KDNode | null;
  right: KDNode | null;
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface BlockProbabilityResult {
  block: ConsumerBlock;
  targetProbability: number;
  utilityByStoreId: Map<string, number>;
}

interface MarketEvaluationResult {
  totalPopulation: number;
  weightedTargetShare: number;
  weightedUtilityByStoreId: Map<string, number>;
  nearbyCompetitorCount: number;
  blockResults: BlockProbabilityResult[];
}

/**
 * 점포 매력도를 계산한다.
 *
 * 소재지면적은 로그 스케일링하고, 업력 개월 수는 완만한 로그 가중치로 반영한다.
 * 알려진 프랜차이즈는 추가 20% 보너스를 준다.
 *
 * @example
 * ```ts
 * const score = calculateAttractiveness(store);
 * ```
 */
export function calculateAttractiveness(store: StoreEntity): number {
  const effectiveArea = Math.max(store.floorArea, 1);
  const areaScore = Math.log(effectiveArea + 1);
  const monthsInBusiness = calculateBusinessMonths(store.openedAt, store.closedAt);
  const tenureWeight = 1 + 0.1 * Math.log(monthsInBusiness + 1);
  const franchiseWeight = isRecognizedFranchise(store) ? 1.2 : 1;
  const statusWeight = store.status === "영업/정상" ? 1 : 0.85;

  return Number((areaScore * tenureWeight * franchiseWeight * statusWeight).toFixed(4));
}

/**
 * 허프 모델 문서의 원래 오탈자 함수명도 함께 노출한다.
 */
export const calculateAttractivenes = calculateAttractiveness;

/**
 * 두 좌표 사이의 보행 보정 거리를 계산한다.
 *
 * Haversine 직선거리에 상권 유형별 보행 보정 계수를 곱한다.
 *
 * @example
 * ```ts
 * const meters = calculateDistance({ lat: 37.5, lng: 127.0 }, { lat: 37.501, lng: 127.002 });
 * ```
 */
export function calculateDistance(
  pointA: LatLng,
  pointB: LatLng,
  options: DistanceOptions = {},
): number {
  const straightDistance = calculateHaversineMeters(pointA, pointB);
  const districtType = options.districtType ?? "commercial";
  const walkingMultiplier =
    options.walkingMultiplier ?? WALKING_DISTANCE_MULTIPLIER[districtType];

  return Number((straightDistance * walkingMultiplier).toFixed(2));
}

/**
 * 상권 유형과 업종 성격을 받아 거리 마찰 계수 λ를 반환한다.
 *
 * @example
 * ```ts
 * const lambda = determineDistanceDecay("urban", "shopping");
 * ```
 */
export function determineDistanceDecay(
  districtType: DistrictType,
  businessType: BusinessNature,
): number {
  return DISTANCE_DECAY_MATRIX[districtType][businessType];
}

/**
 * 타깃 점포의 시장 점유율을 계산한다.
 *
 * 내부적으로 2차원 KD-tree를 구성해 소비자 블록별 후보 점포를 반경 컷오프로 가지치기한다.
 *
 * @example
 * ```ts
 * const result = calculateMarketShare(targetStore, competitors, consumerBlocks);
 * ```
 */
export function calculateMarketShare(
  targetStore: StoreEntity,
  competitors: StoreEntity[],
  consumerBlocks: ConsumerBlock[],
  options: MarketShareOptions = {},
): MarketShareResult {
  const stores = dedupeActiveStores([targetStore, ...competitors]);
  const districtType = options.districtType ?? inferDistrictType(competitors, consumerBlocks);
  const businessNature =
    options.businessNature ??
    inferBusinessNatureFromCategory(
      targetStore.businessCategorySmall ||
        targetStore.businessCategoryMedium ||
        targetStore.businessCategoryLarge,
    );
  const evaluation = evaluateMarketShare(targetStore, stores, consumerBlocks, {
    districtType,
    businessNature,
    cutoffMeters: options.cutoffMeters ?? MARKET_SHARE_CUTOFF_METERS,
    walkingMultiplier:
      options.walkingMultiplier ?? WALKING_DISTANCE_MULTIPLIER[districtType],
  });
  const rank = calculateStoreRank(targetStore.id, evaluation.weightedUtilityByStoreId);

  return {
    marketShare:
      evaluation.totalPopulation > 0
        ? Number((evaluation.weightedTargetShare / evaluation.totalPopulation).toFixed(4))
        : 0,
    rank,
    totalCompetitors: evaluation.nearbyCompetitorCount,
  };
}

/**
 * 신규 점포의 예상 월매출 구간을 계산한다.
 *
 * 기본 구현은 주입된 소비자 블록과 경쟁 점포를 우선 사용하고,
 * 데이터가 없으면 합리적인 합성 블록을 생성해 보수적인 추정치를 반환한다.
 *
 * @example
 * ```ts
 * const revenue = estimateMonthlyRevenue(
 *   { lat: 37.55, lng: 126.97 },
 *   "cafe",
 *   45,
 *   { competitors, consumerBlocks }
 * );
 * ```
 */
export function estimateMonthlyRevenue(
  targetLocation: LatLng,
  businessCategory: string,
  storeArea: number,
  options: RevenueEstimationOptions = {},
): RevenueEstimate {
  const categoryKey = normalizeBusinessCategoryKey(businessCategory);
  const districtType =
    options.districtType ??
    inferDistrictType(options.competitors ?? [], options.consumerBlocks ?? []);
  const businessNature =
    options.businessNature ?? inferBusinessNatureFromCategory(businessCategory);
  const consumerBlocks =
    options.consumerBlocks ??
    createSyntheticConsumerBlocks(targetLocation, options.districtStats ?? null);
  const competitors = options.competitors ?? [];
  const targetStore = createVirtualTargetStore(
    targetLocation,
    businessCategory,
    storeArea,
    options.targetStoreName ?? "신규 점포",
    options.openedAt ?? null,
  );
  const marketShare = calculateMarketShare(targetStore, competitors, consumerBlocks, {
    districtType,
    businessNature,
    cutoffMeters: options.cutoffMeters,
    walkingMultiplier: options.walkingMultiplier,
  });
  const evaluation = evaluateMarketShare(
    targetStore,
    dedupeActiveStores([targetStore, ...competitors]),
    consumerBlocks,
    {
      districtType,
      businessNature,
      cutoffMeters: options.cutoffMeters ?? MARKET_SHARE_CUTOFF_METERS,
      walkingMultiplier:
        options.walkingMultiplier ?? WALKING_DISTANCE_MULTIPLIER[districtType],
    },
  );
  const captureRate = CAPTURE_RATE[categoryKey];
  const avgSpending = AVG_SPENDING[categoryKey];
  const visitFrequency =
    options.monthlyVisitFrequency ?? AVG_MONTHLY_VISITS[categoryKey];

  let effectiveDemand = 0;

  for (const blockResult of evaluation.blockResults) {
    const blockDemand =
      blockResult.block.population * captureRate * avgSpending * visitFrequency;

    effectiveDemand += blockResult.targetProbability * blockDemand;
  }

  const theta =
    options.healthMultiplier ??
    calculateHealthMultiplier(
      competitors,
      options.recentChanges ?? [],
      options.districtStats ?? null,
    );
  const median = Math.max(0, Math.round(effectiveDemand * theta));
  const breakEvenFloor = calculateBreakEvenFloor(storeArea, competitors);
  const min = Math.max(Math.round(median * 0.72), breakEvenFloor);
  const max = Math.max(Math.round(median * 1.28), Math.round(min * 1.12));
  const confidence = calculateRevenueConfidence(
    consumerBlocks.length,
    competitors.length,
    options.districtStats ?? null,
    options.recentChanges ?? [],
  );
  const percentile = calculateRevenuePercentile(
    median,
    marketShare,
    theta,
    options.percentileBenchmarks ?? [],
  );

  return {
    min,
    median: Math.max(median, min),
    max,
    confidence,
    percentile,
    insightText: buildRevenueInsightText(
      median,
      marketShare,
      theta,
      confidence,
    ),
  };
}

function evaluateMarketShare(
  targetStore: StoreEntity,
  stores: StoreEntity[],
  consumerBlocks: ConsumerBlock[],
  options: Required<Pick<MarketShareOptions, "cutoffMeters">> &
    Required<DistanceOptions> & {
      districtType: DistrictType;
      businessNature: BusinessNature;
    },
): MarketEvaluationResult {
  const tree = buildKdTree(stores);
  const lambda = determineDistanceDecay(options.districtType, options.businessNature);
  const blockResults: BlockProbabilityResult[] = [];
  const weightedUtilityByStoreId = new Map<string, number>();
  let weightedTargetShare = 0;
  let totalPopulation = 0;

  for (const block of consumerBlocks) {
    if (block.population <= 0) {
      continue;
    }

    const nearbyStores = searchStoresWithinDistance(
      tree,
      block.centroid,
      options.cutoffMeters,
      options,
    );

    if (nearbyStores.length === 0) {
      continue;
    }

    const utilityByStoreId = new Map<string, number>();
    let totalUtility = 0;

    for (const store of nearbyStores) {
      const distance = calculateDistance(block.centroid, store.location, options);
      const attractiveness = calculateAttractiveness(store);
      const utility =
        attractiveness /
        Math.pow(Math.max(distance, MARKET_SHARE_EPSILON_METERS), lambda);

      utilityByStoreId.set(store.id, utility);
      totalUtility += utility;
    }

    if (totalUtility <= 0) {
      continue;
    }

    const targetProbability = (utilityByStoreId.get(targetStore.id) ?? 0) / totalUtility;

    weightedTargetShare += targetProbability * block.population;
    totalPopulation += block.population;

    for (const [storeId, utility] of utilityByStoreId) {
      weightedUtilityByStoreId.set(
        storeId,
        (weightedUtilityByStoreId.get(storeId) ?? 0) + utility * block.population,
      );
    }

    blockResults.push({
      block,
      targetProbability,
      utilityByStoreId,
    });
  }

  const nearbyCompetitorCount = searchStoresWithinDistance(
    tree,
    targetStore.location,
    options.cutoffMeters,
    options,
  ).filter((store) => store.id !== targetStore.id).length;

  return {
    totalPopulation,
    weightedTargetShare,
    weightedUtilityByStoreId,
    nearbyCompetitorCount,
    blockResults,
  };
}

function calculateStoreRank(
  targetStoreId: string,
  weightedUtilityByStoreId: Map<string, number>,
): number {
  const ranking = [...weightedUtilityByStoreId.entries()].sort(
    (left, right) => right[1] - left[1],
  );
  const targetIndex = ranking.findIndex(([storeId]) => storeId === targetStoreId);

  return targetIndex >= 0 ? targetIndex + 1 : ranking.length + 1;
}

function calculateHealthMultiplier(
  competitors: StoreEntity[],
  recentChanges: LOCALDATARecord[],
  districtStats: DistrictStats | null,
): number {
  let multiplier = 1;
  const openings = recentChanges.filter(isOpeningChange).length;
  const closures = recentChanges.filter(isClosureChange).length;
  const balanceBase = Math.max(openings + closures, 1);

  multiplier += clamp((openings - closures) / balanceBase, -1, 1) * 0.12;

  const averageTenure = calculateAverageTenureMonths(competitors);

  multiplier += clamp((averageTenure - 24) / 240, -0.08, 0.12);

  if (districtStats && districtStats.households > 0) {
    const singleRatio = districtStats.singleHouseholds / districtStats.households;

    multiplier += clamp((singleRatio - 0.28) * 0.1, -0.03, 0.05);
  }

  return clamp(
    multiplier,
    DEMAND_HEALTH_MULTIPLIER_RANGE.min,
    DEMAND_HEALTH_MULTIPLIER_RANGE.max,
  );
}

function calculateBreakEvenFloor(
  storeArea: number,
  competitors: StoreEntity[],
): number {
  const averageTenure = calculateAverageTenureMonths(competitors);
  const survivalWeight = averageTenure >= 12 ? 1 : 0.88;
  const monthlyFixedCost = Math.max(storeArea, 1) * BASE_RENT_PER_SQM;

  return Math.round((monthlyFixedCost / TARGET_MARGIN_RATIO) * survivalWeight);
}

function calculateRevenueConfidence(
  consumerBlockCount: number,
  competitorCount: number,
  districtStats: DistrictStats | null,
  recentChanges: LOCALDATARecord[],
): RevenueEstimate["confidence"] {
  let dataScore = 0;

  dataScore += Math.min(consumerBlockCount, 8) * 0.5;
  dataScore += Math.min(competitorCount, 20) * 0.15;
  dataScore += districtStats ? 1.5 : 0;
  dataScore += recentChanges.length > 0 ? Math.min(recentChanges.length, 12) * 0.1 : 0;

  if (dataScore >= 7.5) {
    return 5;
  }

  if (dataScore >= 5.8) {
    return 4;
  }

  if (dataScore >= 4) {
    return 3;
  }

  if (dataScore >= 2.5) {
    return 2;
  }

  return 1;
}

function calculateRevenuePercentile(
  medianRevenue: number,
  marketShare: MarketShareResult,
  theta: number,
  percentileBenchmarks: number[],
): number {
  if (percentileBenchmarks.length > 0) {
    return calculatePercentile(medianRevenue, percentileBenchmarks);
  }

  const rankPercentile =
    marketShare.totalCompetitors > 0
      ? 100 -
        ((marketShare.rank - 1) / Math.max(marketShare.totalCompetitors, 1)) * 100
      : 55;
  const healthAdjustment = (theta - 1) * 35;
  const shareAdjustment = marketShare.marketShare * 120;

  return clampNumber(Math.round(rankPercentile * 0.65 + shareAdjustment * 0.35 + healthAdjustment), 1, 99);
}

function buildRevenueInsightText(
  medianRevenue: number,
  marketShare: MarketShareResult,
  theta: number,
  confidence: RevenueEstimate["confidence"],
): string {
  const competitivenessText =
    marketShare.rank <= 3
      ? "동일 상권 내 상위권 흡입력을 기대할 수 있습니다."
      : "경쟁 점포가 많아 초기 점유율 확보는 완만할 가능성이 큽니다.";
  const healthText =
    theta >= 1
      ? "주변 상권 건전성이 완만한 플러스 구간으로 반영됐습니다."
      : "최근 폐업 압력이 있어 보수적으로 추정했습니다.";

  return `예상 월매출 중앙값은 약 ${formatCurrency(medianRevenue)}입니다. ${competitivenessText} ${healthText} 신뢰도는 ${confidence}점 만점 기준 ${confidence}단계입니다.`;
}

function createVirtualTargetStore(
  targetLocation: LatLng,
  businessCategory: string,
  storeArea: number,
  storeName: string,
  openedAt: string | null,
): StoreEntity {
  const timestamp = new Date().toISOString();

  return {
    id: "__virtual_target_store__",
    storeName,
    businessCategoryLarge: businessCategory,
    businessCategoryMedium: businessCategory,
    businessCategorySmall: businessCategory,
    businessCode: normalizeBusinessCategoryKey(businessCategory),
    location: targetLocation,
    addressJibun: null,
    addressRoad: null,
    dongCode: "",
    floorArea: storeArea,
    openedAt,
    closedAt: null,
    status: "영업/정상",
    isFranchise: false,
    franchiseBrand: null,
    semasId: null,
    localdataId: null,
    matchConfidence: 1,
    dataUpdatedAt: timestamp,
  };
}

function createSyntheticConsumerBlocks(
  targetLocation: LatLng,
  districtStats: DistrictStats | null,
): ConsumerBlock[] {
  const totalPopulation = Math.max(districtStats?.population ?? 12000, 4000);
  const weights = [0.28, 0.22, 0.18, 0.17, 0.15];
  const offsets = [
    { lat: 0, lng: 0 },
    { lat: 0.0022, lng: 0.0018 },
    { lat: -0.0022, lng: 0.0014 },
    { lat: 0.0014, lng: -0.0021 },
    { lat: -0.0018, lng: -0.0017 },
  ];

  return offsets.map((offset, index) => ({
    blockId: `synthetic-${index + 1}`,
    centroid: {
      lat: targetLocation.lat + offset.lat,
      lng: targetLocation.lng + offset.lng,
    },
    population: Math.max(120, Math.round(totalPopulation * 0.09 * weights[index]!)),
    dongCode: districtStats?.dongCode ?? "",
  }));
}

function dedupeActiveStores(stores: StoreEntity[]): StoreEntity[] {
  const uniqueStores = new Map<string, StoreEntity>();

  for (const store of stores) {
    if (store.status !== "영업/정상" && store.id !== "__virtual_target_store__") {
      continue;
    }

    uniqueStores.set(store.id, store);
  }

  return [...uniqueStores.values()];
}

function inferDistrictType(
  competitors: StoreEntity[],
  consumerBlocks: ConsumerBlock[],
): DistrictType {
  const activeCompetitorCount = competitors.filter(
    (store) => store.status === "영업/정상",
  ).length;
  const totalPopulation = consumerBlocks.reduce(
    (sum, block) => sum + block.population,
    0,
  );

  if (activeCompetitorCount >= 40 || totalPopulation >= 20000) {
    return "urban";
  }

  if (activeCompetitorCount >= 15 || totalPopulation >= 8000) {
    return "commercial";
  }

  return "residential";
}

function isRecognizedFranchise(store: StoreEntity): boolean {
  const comparisonValue = `${store.franchiseBrand ?? ""} ${store.storeName}`.normalize(
    "NFKC",
  );

  return FRANCHISE_BRANDS.some((brand) => comparisonValue.includes(brand));
}

function calculateBusinessMonths(
  openedAt: string | null,
  closedAt: string | null,
): number {
  if (!openedAt) {
    return 0;
  }

  const startTime = Date.parse(openedAt);

  if (Number.isNaN(startTime)) {
    return 0;
  }

  const endTime = closedAt ? Date.parse(closedAt) : Date.now();

  if (Number.isNaN(endTime) || endTime < startTime) {
    return 0;
  }

  const monthMs = 1000 * 60 * 60 * 24 * 30.4375;

  return Math.max(0, Math.floor((endTime - startTime) / monthMs));
}

function calculateAverageTenureMonths(stores: StoreEntity[]): number {
  if (stores.length === 0) {
    return 18;
  }

  const totalMonths = stores.reduce((sum, store) => {
    return sum + calculateBusinessMonths(store.openedAt, store.closedAt);
  }, 0);

  return totalMonths / stores.length;
}

function calculateHaversineMeters(pointA: LatLng, pointB: LatLng): number {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLng = toRadians(pointB.lng - pointA.lng);
  const latA = toRadians(pointA.lat);
  const latB = toRadians(pointB.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * arc;
}

function buildKdTree(stores: StoreEntity[], depth = 0): KDNode | null {
  if (stores.length === 0) {
    return null;
  }

  const axis: 0 | 1 = depth % 2 === 0 ? 0 : 1;
  const sortedStores = [...stores].sort((left, right) =>
    axis === 0
      ? left.location.lat - right.location.lat
      : left.location.lng - right.location.lng,
  );
  const medianIndex = Math.floor(sortedStores.length / 2);
  const medianStore = sortedStores[medianIndex];

  if (!medianStore) {
    return null;
  }

  return {
    axis,
    store: medianStore,
    left: buildKdTree(sortedStores.slice(0, medianIndex), depth + 1),
    right: buildKdTree(sortedStores.slice(medianIndex + 1), depth + 1),
  };
}

function searchStoresWithinDistance(
  tree: KDNode | null,
  center: LatLng,
  walkingRadiusMeters: number,
  options: Required<DistanceOptions>,
): StoreEntity[] {
  if (!tree) {
    return [];
  }

  const straightRadiusMeters =
    walkingRadiusMeters / Math.max(options.walkingMultiplier, 1.3);
  const boundingBox = createBoundingBox(center, straightRadiusMeters);
  const candidates: StoreEntity[] = [];

  rangeSearchKdTree(tree, boundingBox, candidates);

  return candidates.filter((store) => {
    return calculateDistance(center, store.location, options) <= walkingRadiusMeters;
  });
}

function rangeSearchKdTree(
  node: KDNode | null,
  boundingBox: BoundingBox,
  results: StoreEntity[],
): void {
  if (!node) {
    return;
  }

  const axisValue = node.axis === 0 ? node.store.location.lat : node.store.location.lng;
  const minValue = node.axis === 0 ? boundingBox.minLat : boundingBox.minLng;
  const maxValue = node.axis === 0 ? boundingBox.maxLat : boundingBox.maxLng;

  if (axisValue >= minValue) {
    rangeSearchKdTree(node.left, boundingBox, results);
  }

  if (
    node.store.location.lat >= boundingBox.minLat &&
    node.store.location.lat <= boundingBox.maxLat &&
    node.store.location.lng >= boundingBox.minLng &&
    node.store.location.lng <= boundingBox.maxLng
  ) {
    results.push(node.store);
  }

  if (axisValue <= maxValue) {
    rangeSearchKdTree(node.right, boundingBox, results);
  }
}

function createBoundingBox(center: LatLng, radiusMeters: number): BoundingBox {
  const latDelta = radiusMeters / 111320;
  const lngDivisor = Math.max(Math.cos(toRadians(center.lat)), 0.2) * 111320;
  const lngDelta = radiusMeters / lngDivisor;

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

function isOpeningChange(record: LOCALDATARecord): boolean {
  return (
    record.changeType === "I" ||
    (record.status === "영업/정상" && isRecentDate(record.openedAt ?? record.permitDate, 180))
  );
}

function isClosureChange(record: LOCALDATARecord): boolean {
  return (
    record.changeType === "D" ||
    record.status === "폐업" ||
    isRecentDate(record.closedAt, 180)
  );
}

function isRecentDate(value: string | null, withinDays: number): boolean {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return false;
  }

  const diffDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= withinDays;
}

function calculatePercentile(targetValue: number, benchmarks: number[]): number {
  const sortedBenchmarks = [...benchmarks].sort((left, right) => left - right);

  if (sortedBenchmarks.length === 0) {
    return 50;
  }

  let belowOrEqualCount = 0;

  for (const benchmark of sortedBenchmarks) {
    if (benchmark <= targetValue) {
      belowOrEqualCount += 1;
    }
  }

  return clampNumber(
    Math.round((belowOrEqualCount / sortedBenchmarks.length) * 100),
    1,
    99,
  );
}

function formatCurrency(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
