import type {
  ConsumerBlock,
  DistrictStats,
  LatLng,
  ScoreTrend,
  StoreEntity,
  TemperatureScore,
} from "@/types";
import type { LOCALDATARecord } from "@/lib/data-pipeline/types";

import {
  NORMALIZATION_RANGES,
  TEMPERATURE_COMPONENT_WEIGHTS,
  normalizeBusinessCategoryKey,
} from "./constants";
import { calculateDistance } from "./huff-model";

export interface DistrictTemperatureOptions {
  stores?: StoreEntity[];
  recentChanges?: LOCALDATARecord[];
  districtStats?: DistrictStats | null;
  consumerBlocks?: ConsumerBlock[];
  historicalStoreCounts?: number[];
  historicalPopulation?: number[];
  apartmentPriceTrend?: number[];
  comparisonScores?: number[];
  scoreThreeMonthsAgo?: number;
}

export interface InsightFactorInput {
  percentile?: number;
  trendDelta?: number;
  dominantFactor?: string;
  dominantValue?: number;
  secondaryFactor?: string;
  secondaryValue?: number;
  cautionFactor?: string;
}

/**
 * 상권 온도 스코어를 계산한다.
 *
 * @example
 * ```ts
 * const score = districtTemperatureScore(
 *   { lat: 37.55, lng: 126.97 },
 *   500,
 *   "cafe",
 *   { stores, recentChanges, districtStats }
 * );
 * ```
 */
export function districtTemperatureScore(
  location: LatLng,
  radius: number,
  businessCategory: string,
  options: DistrictTemperatureOptions = {},
): TemperatureScore {
  const nearbyStores = filterStoresWithinRadius(options.stores ?? [], location, radius);
  const nearbyChanges = filterChangesWithinRadius(
    options.recentChanges ?? [],
    location,
    radius,
  );
  const sameCategoryStores = nearbyStores.filter((store) =>
    isSameCategory(store, businessCategory),
  );

  const storeGrowthRate = calculateStoreGrowthRate(
    options.historicalStoreCounts ?? [],
    sameCategoryStores.length,
    nearbyChanges,
  );
  const openingCount = nearbyChanges.filter(isOpeningChange).length;
  const closureCount = nearbyChanges.filter(isClosureChange).length;
  const openCloseRatio = openingCount / Math.max(closureCount, 1);
  const diversityEntropy = calculateShannonEntropy(
    nearbyStores.map((store) => normalizeBusinessCategoryKey(store.businessCategorySmall)),
  );
  const storeDynamics = clampScore(
    normalizeAscending(storeGrowthRate, NORMALIZATION_RANGES.storeGrowthRate) * 0.4 +
      normalizeAscending(openCloseRatio, NORMALIZATION_RANGES.closureOpenRatio) * 0.35 +
      normalizeAscending(diversityEntropy, NORMALIZATION_RANGES.diversityEntropy) * 0.25,
  );

  const populationTrend = calculateSeriesTrend(options.historicalPopulation ?? []);
  const singleHouseholdRatio =
    options.districtStats && options.districtStats.households > 0
      ? options.districtStats.singleHouseholds / options.districtStats.households
      : 0.32;
  const apartmentPriceTrend = calculateSeriesTrend(options.apartmentPriceTrend ?? []);
  const demandStability = clampScore(
    normalizeAscending(populationTrend, NORMALIZATION_RANGES.populationTrend) * 0.45 +
      normalizeAscending(
        singleHouseholdRatio,
        NORMALIZATION_RANGES.singleHouseholdRatio,
      ) *
        0.25 +
      normalizeAscending(
        apartmentPriceTrend,
        NORMALIZATION_RANGES.apartmentPriceTrend,
      ) *
        0.3,
  );

  const averageTenureMonths = calculateAverageTenureMonths(nearbyStores);
  const franchisePenetration = calculateFranchisePenetration(nearbyStores);
  const openingAcceleration = calculateOpeningAcceleration(nearbyChanges);
  const districtVitality = clampScore(
    normalizeAscending(
      averageTenureMonths,
      NORMALIZATION_RANGES.averageTenureMonths,
    ) *
      0.4 +
      normalizeAscending(
        franchisePenetration,
        NORMALIZATION_RANGES.franchisePenetration,
      ) *
        0.25 +
      normalizeAscending(
        openingAcceleration,
        NORMALIZATION_RANGES.openingAcceleration,
      ) *
        0.35,
  );

  const score = clampScore(
    storeDynamics * TEMPERATURE_COMPONENT_WEIGHTS.storeDynamics +
      demandStability * TEMPERATURE_COMPONENT_WEIGHTS.demandStability +
      districtVitality * TEMPERATURE_COMPONENT_WEIGHTS.districtVitality,
  );
  const inferredPreviousScore =
    score - storeGrowthRate * 20 - openingAcceleration * 15 - populationTrend * 40;
  const scoreThreeMonthsAgo = options.scoreThreeMonthsAgo ?? inferredPreviousScore;
  const trendDelta = score - scoreThreeMonthsAgo;
  const trend = classifyScoreTrend(trendDelta);
  const percentile = calculatePercentile(
    score,
    options.comparisonScores ?? [],
    50 + (score - 50) * 0.9,
  );

  const dominantComponent = getDominantComponent({
    "점포 동적 지수": storeDynamics,
    "수요 안정성 지수": demandStability,
    "상권 활력 지수": districtVitality,
  });

  return {
    score,
    trend,
    percentile,
    factors: {
      storeDynamics,
      demandStability,
      districtVitality,
    },
    insightText: generateInsightText(score, "temperature", {
      percentile,
      trendDelta,
      dominantFactor: dominantComponent.factor,
      dominantValue: dominantComponent.value,
      secondaryFactor:
        dominantComponent.factor === "점포 동적 지수"
          ? "상권 활력 지수"
          : "점포 동적 지수",
      secondaryValue:
        dominantComponent.factor === "점포 동적 지수"
          ? districtVitality
          : storeDynamics,
    }),
  };
}

/**
 * 점수 분해 결과를 바탕으로 규칙 기반 해석 텍스트를 생성한다.
 *
 * @example
 * ```ts
 * const text = generateInsightText(68, "temperature", {
 *   percentile: 82,
 *   dominantFactor: "점포 동적 지수",
 *   trendDelta: 6,
 * });
 * ```
 */
export function generateInsightText(
  score: number,
  type: "temperature" | "risk",
  factors: InsightFactorInput,
): string {
  if (type === "temperature") {
    const lead =
      score >= 70
        ? "이 골목은 최근 지표상 활기를 회복하는 구간입니다."
        : score >= 50
          ? "상권 온도는 중립 이상이지만 업종별 편차가 남아 있습니다."
          : "현재는 회복 탄력이 크지 않아 보수적으로 접근할 필요가 있습니다.";
    const movement =
      (factors.trendDelta ?? 0) >= 5
        ? "최근 3개월 기준으로 개선 흐름이 분명합니다."
        : (factors.trendDelta ?? 0) <= -5
          ? "최근 3개월 기준으로 열기가 둔화되는 모습입니다."
          : "최근 3개월 기준 흐름은 큰 변동 없이 유지되고 있습니다.";
    const ranking =
      typeof factors.percentile === "number"
        ? `동일 업종 비교에서는 상위 ${Math.max(1, 100 - factors.percentile)}% 수준입니다.`
        : "";
    const dominant =
      factors.dominantFactor
        ? `${factors.dominantFactor}가 현재 분위기를 가장 강하게 설명합니다.`
        : "";

    return [lead, movement, dominant || ranking].filter(Boolean).join(" ");
  }

  const lead =
    score >= 70
      ? "폐업 리스크가 높은 구간으로 해석됩니다."
      : score >= 40
        ? "리스크 요인이 누적되고 있어 주의가 필요한 구간입니다."
        : "리스크는 상대적으로 안정권에 가깝습니다.";
  const dominant =
    factors.dominantFactor
      ? `${factors.dominantFactor} 영향이 가장 크게 작용했습니다.`
      : "";
  const caution =
    factors.secondaryFactor
      ? `${factors.secondaryFactor}도 함께 모니터링할 필요가 있습니다.`
      : "";

  return [lead, dominant, caution].filter(Boolean).join(" ");
}

function filterStoresWithinRadius(
  stores: StoreEntity[],
  location: LatLng,
  radius: number,
): StoreEntity[] {
  return stores.filter((store) => {
    return calculateDistance(location, store.location) <= radius;
  });
}

function filterChangesWithinRadius(
  changes: LOCALDATARecord[],
  location: LatLng,
  radius: number,
): LOCALDATARecord[] {
  return changes.filter((record) => {
    return record.location ? calculateDistance(location, record.location) <= radius : false;
  });
}

function isSameCategory(store: StoreEntity, businessCategory: string): boolean {
  return (
    normalizeBusinessCategoryKey(store.businessCategorySmall) ===
    normalizeBusinessCategoryKey(businessCategory)
  );
}

function calculateStoreGrowthRate(
  historicalStoreCounts: number[],
  currentCount: number,
  recentChanges: LOCALDATARecord[],
): number {
  if (historicalStoreCounts.length >= 2) {
    const previousCount = historicalStoreCounts[historicalStoreCounts.length - 2] ?? 0;
    const latestCount = historicalStoreCounts[historicalStoreCounts.length - 1] ?? currentCount;

    return (latestCount - previousCount) / Math.max(previousCount, 1);
  }

  const openings = recentChanges.filter(isOpeningChange).length;
  const closures = recentChanges.filter(isClosureChange).length;
  const estimatedPreviousCount = Math.max(currentCount - openings + closures, 1);

  return (currentCount - estimatedPreviousCount) / estimatedPreviousCount;
}

function calculateShannonEntropy(categories: string[]): number {
  if (categories.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();

  for (const category of categories) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  let entropy = 0;

  for (const count of counts.values()) {
    const probability = count / categories.length;

    entropy -= probability * Math.log(probability);
  }

  return entropy;
}

function calculateSeriesTrend(series: number[]): number {
  if (series.length < 2) {
    return 0;
  }

  const firstValue = series[0] ?? 0;
  const lastValue = series[series.length - 1] ?? firstValue;

  return (lastValue - firstValue) / Math.max(Math.abs(firstValue), 1);
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

function calculateFranchisePenetration(stores: StoreEntity[]): number {
  if (stores.length === 0) {
    return 0;
  }

  const franchiseCount = stores.filter((store) => store.isFranchise).length;

  return franchiseCount / stores.length;
}

function calculateOpeningAcceleration(recentChanges: LOCALDATARecord[]): number {
  const monthlyOpenings = buildMonthlyChangeSeries(recentChanges, "open");

  return calculateSecondDerivative(monthlyOpenings);
}

function buildMonthlyChangeSeries(
  recentChanges: LOCALDATARecord[],
  mode: "open" | "closure",
): number[] {
  const monthlyCounts = new Map<string, number>();
  const now = new Date();

  for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1),
    );
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    monthlyCounts.set(key, 0);
  }

  for (const record of recentChanges) {
    const isMatching =
      mode === "open" ? isOpeningChange(record) : isClosureChange(record);

    if (!isMatching) {
      continue;
    }

    const dateValue =
      mode === "open"
        ? record.openedAt ?? record.permitDate ?? record.dataUpdatedAt
        : record.closedAt ?? record.dataUpdatedAt;
    const parsed = Date.parse(dateValue);

    if (Number.isNaN(parsed)) {
      continue;
    }

    const date = new Date(parsed);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    if (monthlyCounts.has(key)) {
      monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
    }
  }

  return [...monthlyCounts.values()];
}

function calculateSecondDerivative(series: number[]): number {
  if (series.length < 3) {
    return 0;
  }

  let totalDelta = 0;
  let count = 0;

  for (let index = 2; index < series.length; index += 1) {
    const current = series[index] ?? 0;
    const previous = series[index - 1] ?? 0;
    const beforePrevious = series[index - 2] ?? 0;

    totalDelta += current - 2 * previous + beforePrevious;
    count += 1;
  }

  return count > 0 ? totalDelta / count : 0;
}

function calculateBusinessMonths(
  openedAt: string | null,
  closedAt: string | null,
): number {
  if (!openedAt) {
    return 0;
  }

  const openedTimestamp = Date.parse(openedAt);

  if (Number.isNaN(openedTimestamp)) {
    return 0;
  }

  const closedTimestamp = closedAt ? Date.parse(closedAt) : Date.now();

  if (Number.isNaN(closedTimestamp) || closedTimestamp < openedTimestamp) {
    return 0;
  }

  const monthMs = 1000 * 60 * 60 * 24 * 30.4375;

  return Math.floor((closedTimestamp - openedTimestamp) / monthMs);
}

function isOpeningChange(record: LOCALDATARecord): boolean {
  return record.changeType === "I" || record.status === "영업/정상";
}

function isClosureChange(record: LOCALDATARecord): boolean {
  return record.changeType === "D" || record.status === "폐업";
}

function normalizeAscending(
  value: number,
  range: { min: number; max: number },
): number {
  if (range.max <= range.min) {
    return 50;
  }

  const normalized = ((value - range.min) / (range.max - range.min)) * 100;

  return clampScore(normalized);
}

function calculatePercentile(
  value: number,
  comparisonScores: number[],
  fallbackValue: number,
): number {
  if (comparisonScores.length === 0) {
    return clampScore(fallbackValue);
  }

  const belowOrEqualCount = comparisonScores.filter((score) => score <= value).length;

  return clampScore((belowOrEqualCount / comparisonScores.length) * 100);
}

function getDominantComponent(scores: Record<string, number>): {
  factor: string;
  value: number;
} {
  const sortedScores = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  const [factor, value] = sortedScores[0] ?? ["점포 동적 지수", 50];

  return { factor, value };
}

function classifyScoreTrend(delta: number): ScoreTrend {
  if (delta >= 5) {
    return "up";
  }

  if (delta <= -5) {
    return "down";
  }

  return "stable";
}

function clampScore(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100));
}
