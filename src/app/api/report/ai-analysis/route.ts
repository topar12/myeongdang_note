import { NextRequest } from "next/server";
import { z } from "zod";

import { generateAIAnalysis } from "@/lib/ai/gemini-analyst";
import type { AnalysisInput } from "@/lib/ai/gemini-analyst";
import { normalizeBusinessCategoryKey } from "@/lib/algorithms/constants";
import { createAdminSupabase } from "@/lib/supabase";

import {
  ApiError,
  handleApiError,
  jsonOk,
  parseJsonBody,
} from "../../_lib/api-utils";

const aiAnalysisRequestSchema = z
  .object({
    lat: z.number().min(33).max(39.5),
    lng: z.number().min(124).max(132),
    address: z.string().trim().min(3).max(500),
    businessCategory: z.string().trim().min(1).max(100),
    radius: z.number().int().positive().max(3000).default(500),
    userArea: z.number().positive().max(10000).optional(),
    userRent: z.number().nonnegative().max(1_000_000).optional(),
  })
  .strict();

type AdminSupabaseClient = ReturnType<typeof createAdminSupabase>;

interface RadiusStoreRow {
  id: string;
  store_name: string;
  business_category_large: string | null;
  business_category_medium: string | null;
  business_category_small: string | null;
  business_code: string | null;
  location: unknown;
  address_jibun: string | null;
  address_road: string | null;
  dong_code: string | null;
  floor_area: number | string | null;
  opened_at: string | null;
  closed_at: string | null;
  status: string | null;
  is_franchise: boolean | null;
  franchise_brand: string | null;
  semas_id: string | null;
  localdata_id: string | null;
  match_confidence: number | string | null;
  data_updated_at: string | null;
  distance_meters: number | string | null;
}

interface LocationHistoryRow {
  store_name: string;
  opened_at: string | null;
  closed_at: string | null;
  status: string | null;
  address_road: string | null;
}

interface DistrictStatsRow {
  population: number | string | null;
  households: number | string | null;
  single_households: number | string | null;
}

type StoreStatus = "영업/정상" | "휴업" | "폐업" | "취소";
type TrendDirection = "growing" | "stable" | "declining";

interface RadiusStore {
  id: string;
  storeName: string;
  businessCategoryLarge: string;
  businessCategoryMedium: string;
  businessCategorySmall: string;
  businessCode: string;
  addressRoad: string | null;
  dongCode: string;
  floorArea: number | null;
  openedAt: string | null;
  closedAt: string | null;
  status: StoreStatus;
  isFranchise: boolean;
  franchiseBrand: string | null;
  distance: number;
}

interface CategoryDistributionItem {
  category: string;
  count: number;
  ratio: number;
}

interface SameCategoryTrendItem {
  quarter: string;
  count: number;
}

interface AreaSurvivalItem {
  range: "~30" | "30~50" | "50~100" | "100+";
  total: number;
  survived: number;
  rate: number;
}

interface FranchiseComparison {
  fcCount: number;
  fcSurvivalRate: number;
  indCount: number;
  indSurvivalRate: number;
  topBrands: string[];
}

interface LocationHistoryItem {
  storeName: string;
  openedAt: string | null;
  closedAt: string | null;
  status: StoreStatus;
  monthsOperated: number | null;
}

interface RecommendedCategoryItem {
  category: string;
  survivalRate: number;
  storeCount: number;
  trend: TrendDirection;
}

interface PopulationStats {
  population: number;
  households: number;
  singleHouseholds: number;
  singleRatio: number;
}

interface CompetitorItem {
  name: string;
  category: string;
  area: number | null;
  openedAt: string | null;
  isFranchise: boolean;
  franchiseBrand: string | null;
  distance: number;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseJsonBody(request, aiAnalysisRequestSchema);
    const supabase = createAdminSupabase();
    const radiusStores = await fetchRadiusStores(supabase, payload);

    const activeStores = radiusStores.filter((store) => store.status === "영업/정상");
    const sameCategoryStores = activeStores.filter((store) =>
      isSameCategory(store, payload.businessCategory),
    );
    const sameCategoryHistoryStores = radiusStores.filter((store) =>
      isSameCategory(store, payload.businessCategory),
    );

    const totalStores = activeStores.length;
    const sameCategory = sameCategoryStores.length;
    const franchiseCount = sameCategoryStores.filter((store) => store.isFranchise).length;
    const franchiseRatio =
      sameCategory > 0 ? Math.round((franchiseCount / sameCategory) * 100) : 0;

    const recentOpenings = countRecentDateEvents(
      sameCategoryHistoryStores,
      "openedAt",
      365,
    );
    const recentClosures = countRecentDateEvents(
      sameCategoryHistoryStores,
      "closedAt",
      365,
    );
    const avgBusinessMonths = calculateAverageMonths(sameCategoryHistoryStores);
    const survivalRate3y = calculateSurvivalRatePercent(sameCategoryHistoryStores);

    const competitors = buildCompetitors(sameCategoryStores, 30);
    const categoryDistribution = buildCategoryDistribution(activeStores);
    const sameCategoryTrend = buildQuarterlyStoreTrend(
      sameCategoryHistoryStores,
      8,
      new Date(),
    );
    const areaSurvival = buildAreaSurvival(sameCategoryHistoryStores);
    const franchiseComparison = buildFranchiseComparison(
      sameCategoryStores,
      sameCategoryHistoryStores,
    );
    const resolvedRoadAddress = resolveTargetRoadAddress(payload.address, radiusStores);
    const locationHistory = resolvedRoadAddress
      ? await fetchLocationHistory(supabase, resolvedRoadAddress)
      : [];
    const recommendedCategories = buildRecommendedCategories(
      activeStores,
      radiusStores,
      new Date(),
    );
    const populationStats = await fetchPopulationStats(supabase, activeStores);

    const baseRevenue =
      sameCategory > 0 ? Math.round(24_000_000 / Math.sqrt(sameCategory)) : 24_000_000;
    const estimatedRevenue = {
      min: Math.round(baseRevenue * 0.72),
      median: baseRevenue,
      max: Math.round(baseRevenue * 1.35),
    };

    const analysisInput: AnalysisInput = {
      address: payload.address,
      businessCategory: payload.businessCategory,
      radius: payload.radius,
      totalStores,
      sameCategory,
      franchiseCount,
      franchiseRatio,
      recentOpenings,
      recentClosures,
      avgBusinessMonths,
      survivalRate3y,
      estimatedRevenue,
      competitors,
      population: populationStats.population,
      userArea: payload.userArea,
      userRent: payload.userRent,
    };

    const aiAnalysis = await generateAIAnalysis(analysisInput);

    return jsonOk({
      data: {
        aiAnalysis,
        stats: {
          totalStores,
          sameCategory,
          franchiseCount,
          franchiseRatio,
          recentOpenings,
          recentClosures,
          avgBusinessMonths,
          survivalRate3y,
          estimatedRevenue,
        },
        competitors,
        categoryDistribution,
        sameCategoryTrend,
        areaSurvival,
        franchiseComparison,
        locationHistory,
        recommendedCategories,
        populationStats,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function fetchRadiusStores(
  supabase: AdminSupabaseClient,
  payload: z.output<typeof aiAnalysisRequestSchema>,
): Promise<RadiusStore[]> {
  const { data, error } = await supabase.rpc("stores_within_radius_with_distance", {
    target_lat: payload.lat,
    target_lng: payload.lng,
    radius_meters: payload.radius,
    category: null,
  });

  if (error) {
    throw new ApiError(
      500,
      "반경 내 점포 이력 조회에 실패했습니다. Supabase 마이그레이션이 적용되어 있는지 확인해주세요.",
      "radius_store_history_failed",
      error,
    );
  }

  const rows = Array.isArray(data) ? (data as RadiusStoreRow[]) : [];

  return rows.map((row) => ({
    id: row.id,
    storeName: row.store_name,
    businessCategoryLarge: sanitizeLabel(row.business_category_large),
    businessCategoryMedium: sanitizeLabel(row.business_category_medium),
    businessCategorySmall: sanitizeLabel(row.business_category_small),
    businessCode: sanitizeLabel(row.business_code),
    addressRoad: row.address_road,
    dongCode: sanitizeLabel(row.dong_code),
    floorArea: toNullableNumber(row.floor_area),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    status: normalizeStoreStatus(row.status),
    isFranchise: Boolean(row.is_franchise),
    franchiseBrand: row.franchise_brand,
    distance: Math.round(toNumber(row.distance_meters, 0)),
  }));
}

async function fetchLocationHistory(
  supabase: AdminSupabaseClient,
  addressRoad: string,
): Promise<LocationHistoryItem[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("store_name, opened_at, closed_at, status, address_road")
    .eq("address_road", addressRoad);

  if (error) {
    throw new ApiError(
      500,
      "같은 주소 점포 이력 조회에 실패했습니다.",
      "location_history_failed",
      error,
    );
  }

  const rows = Array.isArray(data) ? (data as LocationHistoryRow[]) : [];

  return rows
    .map((row) => ({
      storeName: row.store_name,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      status: normalizeStoreStatus(row.status),
      monthsOperated: calculateOperatedMonths(row.opened_at, row.closed_at),
    }))
    .sort((left, right) => getHistorySortValue(right) - getHistorySortValue(left));
}

async function fetchPopulationStats(
  supabase: AdminSupabaseClient,
  activeStores: RadiusStore[],
): Promise<PopulationStats> {
  const dominantDongCode = getDominantDongCode(activeStores);

  if (!dominantDongCode) {
    return {
      population: 0,
      households: 0,
      singleHouseholds: 0,
      singleRatio: 0,
    };
  }

  const { data, error } = await supabase
    .from("district_stats")
    .select("population, households, single_households")
    .eq("dong_code", dominantDongCode)
    .maybeSingle();

  if (error) {
    throw new ApiError(
      500,
      "배후 인구 통계 조회에 실패했습니다.",
      "district_population_stats_failed",
      error,
    );
  }

  const row = (data ?? null) as DistrictStatsRow | null;
  const population = toNumber(row?.population, 0);
  const households = toNumber(row?.households, 0);
  const singleHouseholds = toNumber(row?.single_households, 0);

  return {
    population,
    households,
    singleHouseholds,
    singleRatio:
      households > 0 ? roundNumber((singleHouseholds / households) * 100, 1) : 0,
  };
}

function buildCompetitors(
  stores: RadiusStore[],
  limit: number,
): CompetitorItem[] {
  return [...stores]
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit)
    .map((store) => ({
      name: store.storeName,
      category:
        store.businessCategorySmall ||
        store.businessCategoryMedium ||
        store.businessCategoryLarge,
      area: store.floorArea,
      openedAt: store.openedAt,
      isFranchise: store.isFranchise,
      franchiseBrand: store.franchiseBrand,
      distance: store.distance,
    }));
}

function buildCategoryDistribution(
  activeStores: RadiusStore[],
): CategoryDistributionItem[] {
  if (activeStores.length === 0) {
    return [];
  }

  const counts = new Map<string, number>();

  for (const store of activeStores) {
    const category = store.businessCategoryLarge || "기타";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category, count]) => ({
      category,
      count,
      ratio: Math.round((count / activeStores.length) * 100),
    }));

  if (ranked.length <= 6) {
    return ranked;
  }

  const primary = ranked.slice(0, 6);
  const others = ranked.slice(6).reduce(
    (accumulator, item) => {
      accumulator.count += item.count;
      return accumulator;
    },
    { count: 0 },
  );

  const existingOtherIndex = primary.findIndex((item) => item.category === "기타");

  if (existingOtherIndex >= 0) {
    const merged = [...primary];
    merged[existingOtherIndex] = {
      category: "기타",
      count: merged[existingOtherIndex].count + others.count,
      ratio: Math.round(
        ((merged[existingOtherIndex].count + others.count) / activeStores.length) * 100,
      ),
    };
    return merged;
  }

  return [
    ...primary,
    {
      category: "기타",
      count: others.count,
      ratio: Math.round((others.count / activeStores.length) * 100),
    },
  ];
}

function buildQuarterlyStoreTrend(
  stores: RadiusStore[],
  quarterCount: number,
  now: Date,
): SameCategoryTrendItem[] {
  return buildQuarterSnapshots(now, quarterCount).map((snapshot) => ({
    quarter: snapshot.label,
    count: stores.filter((store) => isStoreActiveAt(store, snapshot.pointInTime)).length,
  }));
}

function buildAreaSurvival(stores: RadiusStore[]): AreaSurvivalItem[] {
  const buckets: Array<{
    range: AreaSurvivalItem["range"];
    predicate: (area: number) => boolean;
  }> = [
    { range: "~30", predicate: (area) => area <= 30 },
    { range: "30~50", predicate: (area) => area > 30 && area <= 50 },
    { range: "50~100", predicate: (area) => area > 50 && area <= 100 },
    { range: "100+", predicate: (area) => area > 100 },
  ];

  return buckets.map(({ range, predicate }) => {
    const bucketStores = stores.filter(
      (store) =>
        typeof store.floorArea === "number" &&
        predicate(store.floorArea) &&
        Boolean(store.openedAt),
    );
    const survived = bucketStores.filter((store) => {
      const months = calculateOperatedMonths(store.openedAt, store.closedAt);
      return months !== null && months >= 36;
    }).length;

    return {
      range,
      total: bucketStores.length,
      survived,
      rate:
        bucketStores.length > 0
          ? Math.round((survived / bucketStores.length) * 100)
          : 0,
    };
  });
}

function buildFranchiseComparison(
  activeSameCategoryStores: RadiusStore[],
  historicalSameCategoryStores: RadiusStore[],
): FranchiseComparison {
  const activeFranchiseStores = activeSameCategoryStores.filter((store) => store.isFranchise);
  const historicalFranchiseStores = historicalSameCategoryStores.filter(
    (store) => store.isFranchise,
  );
  const historicalIndependentStores = historicalSameCategoryStores.filter(
    (store) => !store.isFranchise,
  );
  const brandCounts = new Map<string, number>();

  for (const store of activeFranchiseStores) {
    if (!store.franchiseBrand) {
      continue;
    }

    brandCounts.set(
      store.franchiseBrand,
      (brandCounts.get(store.franchiseBrand) ?? 0) + 1,
    );
  }

  return {
    fcCount: activeFranchiseStores.length,
    fcSurvivalRate: calculateSurvivalRatePercent(historicalFranchiseStores),
    indCount: activeSameCategoryStores.length - activeFranchiseStores.length,
    indSurvivalRate: calculateSurvivalRatePercent(historicalIndependentStores),
    topBrands: [...brandCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([brand]) => brand),
  };
}

function buildRecommendedCategories(
  activeStores: RadiusStore[],
  allStores: RadiusStore[],
  now: Date,
): RecommendedCategoryItem[] {
  const activeCounts = new Map<string, number>();
  const categoryGroups = new Map<string, RadiusStore[]>();

  for (const store of activeStores) {
    const category = getRecommendationCategory(store);

    if (!category) {
      continue;
    }

    activeCounts.set(category, (activeCounts.get(category) ?? 0) + 1);
  }

  for (const store of allStores) {
    const category = getRecommendationCategory(store);

    if (!category) {
      continue;
    }

    const bucket = categoryGroups.get(category) ?? [];
    bucket.push(store);
    categoryGroups.set(category, bucket);
  }

  const ranked = [...categoryGroups.entries()]
    .map(([category, stores]) => ({
      category,
      survivalRate: calculateSurvivalRatePercent(stores),
      storeCount: activeCounts.get(category) ?? 0,
      trend: inferTrend(stores, now),
      sampleSize: stores.filter((store) => Boolean(store.openedAt)).length,
    }))
    .filter((item) => item.storeCount > 0 && item.sampleSize >= 3)
    .sort(
      (left, right) =>
        right.survivalRate - left.survivalRate ||
        right.storeCount - left.storeCount ||
        left.category.localeCompare(right.category, "ko"),
    )
    .slice(0, 3);

  if (ranked.length === 3) {
    return ranked.map(({ sampleSize: _sampleSize, ...item }) => item);
  }

  return [...categoryGroups.entries()]
    .map(([category, stores]) => ({
      category,
      survivalRate: calculateSurvivalRatePercent(stores),
      storeCount: activeCounts.get(category) ?? 0,
      trend: inferTrend(stores, now),
      sampleSize: stores.filter((store) => Boolean(store.openedAt)).length,
    }))
    .filter((item) => item.storeCount > 0 && item.sampleSize > 0)
    .sort(
      (left, right) =>
        right.survivalRate - left.survivalRate ||
        right.storeCount - left.storeCount ||
        left.category.localeCompare(right.category, "ko"),
    )
    .slice(0, 3)
    .map(({ sampleSize: _sampleSize, ...item }) => item);
}

function countRecentDateEvents(
  stores: RadiusStore[],
  dateKey: "openedAt" | "closedAt",
  days: number,
): number {
  const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

  return stores.filter((store) => {
    const timestamp = parseDateValue(store[dateKey]);
    return timestamp !== null && timestamp >= cutoffTimestamp;
  }).length;
}

function calculateAverageMonths(stores: RadiusStore[]): number {
  const months = stores
    .map((store) => calculateOperatedMonths(store.openedAt, store.closedAt))
    .filter((value): value is number => value !== null);

  if (months.length === 0) {
    return 24;
  }

  return Math.round(months.reduce((sum, value) => sum + value, 0) / months.length);
}

function calculateSurvivalRatePercent(stores: RadiusStore[]): number {
  const operatedMonths = stores
    .map((store) => calculateOperatedMonths(store.openedAt, store.closedAt))
    .filter((value): value is number => value !== null);

  if (operatedMonths.length === 0) {
    return 0;
  }

  const survivedCount = operatedMonths.filter((months) => months >= 36).length;
  return Math.round((survivedCount / operatedMonths.length) * 100);
}

function inferTrend(stores: RadiusStore[], now: Date): TrendDirection {
  const snapshots = buildQuarterSnapshots(now, 4);
  const counts = snapshots.map((snapshot) =>
    stores.filter((store) => isStoreActiveAt(store, snapshot.pointInTime)).length,
  );
  const first = counts[0] ?? 0;
  const last = counts[counts.length - 1] ?? 0;

  if (last >= first + 2 || (first > 0 && last >= Math.ceil(first * 1.15))) {
    return "growing";
  }

  if (first >= last + 2 || (first > 0 && last <= Math.floor(first * 0.85))) {
    return "declining";
  }

  return "stable";
}

function buildQuarterSnapshots(
  now: Date,
  count: number,
): Array<{ label: string; pointInTime: Date }> {
  const currentQuarterSequence =
    now.getUTCFullYear() * 4 + Math.floor(now.getUTCMonth() / 3);
  const startSequence = currentQuarterSequence - count + 1;

  return Array.from({ length: count }, (_, index) => {
    const sequence = startSequence + index;
    const year = Math.floor(sequence / 4);
    const quarter = (sequence % 4) + 1;
    const pointInTime =
      sequence === currentQuarterSequence
        ? new Date(now)
        : new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59, 999));

    return {
      label: `${year}Q${quarter}`,
      pointInTime,
    };
  });
}

function isStoreActiveAt(store: RadiusStore, pointInTime: Date): boolean {
  const openedAtTimestamp = parseDateValue(store.openedAt);

  if (openedAtTimestamp === null || openedAtTimestamp > pointInTime.getTime()) {
    return false;
  }

  const closedAtTimestamp = parseDateValue(store.closedAt);
  return closedAtTimestamp === null || closedAtTimestamp > pointInTime.getTime();
}

function resolveTargetRoadAddress(
  requestedAddress: string,
  stores: RadiusStore[],
): string | null {
  const normalizedRequestedAddress = normalizeComparableText(requestedAddress);

  if (!normalizedRequestedAddress) {
    return null;
  }

  const exactMatch = stores.find(
    (store) =>
      store.addressRoad &&
      normalizeComparableText(store.addressRoad) === normalizedRequestedAddress,
  );

  if (exactMatch?.addressRoad) {
    return exactMatch.addressRoad;
  }

  const partialMatch = [...stores]
    .sort((left, right) => left.distance - right.distance)
    .find((store) => {
      const normalizedAddress = normalizeComparableText(store.addressRoad);
      return (
        normalizedAddress.length > 0 &&
        (normalizedAddress.startsWith(normalizedRequestedAddress) ||
          normalizedRequestedAddress.startsWith(normalizedAddress))
      );
    });

  return partialMatch?.addressRoad ?? requestedAddress.trim();
}

function getRecommendationCategory(store: RadiusStore): string | null {
  const candidates = [
    store.businessCategoryMedium,
    store.businessCategoryLarge,
    store.businessCategorySmall,
  ];

  for (const candidate of candidates) {
    const value = sanitizeLabel(candidate);

    if (value && value !== "기타") {
      return value;
    }
  }

  return null;
}

function getDominantDongCode(stores: RadiusStore[]): string | null {
  const counts = new Map<string, number>();

  for (const store of stores) {
    if (!store.dongCode) {
      continue;
    }

    counts.set(store.dongCode, (counts.get(store.dongCode) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function isSameCategory(store: RadiusStore, businessCategory: string): boolean {
  const targetKey = normalizeBusinessCategoryKey(businessCategory);
  const normalizedTarget = normalizeComparableText(businessCategory);

  // 1. business_category_small 정확 일치 (가장 정확)
  if (store.businessCategorySmall) {
    const smallNorm = normalizeComparableText(store.businessCategorySmall);
    if (smallNorm === normalizedTarget) return true;
    const smallKey = normalizeBusinessCategoryKey(store.businessCategorySmall);
    if (smallKey === targetKey && smallKey !== "retail") return true;
  }

  // 2. 상호명에 업종 키워드 포함 (예: "○○약국", "○○카페")
  if (store.storeName) {
    const nameKey = normalizeBusinessCategoryKey(store.storeName);
    if (nameKey === targetKey && nameKey !== "retail") return true;
  }

  // 3. medium/large 매칭 (단, retail은 제외 — 너무 넓음)
  for (const cat of [store.businessCategoryMedium, store.businessCategoryLarge]) {
    if (!cat) continue;
    const catNorm = normalizeComparableText(cat);
    if (catNorm === normalizedTarget) return true;
    const catKey = normalizeBusinessCategoryKey(cat);
    if (catKey === targetKey && catKey !== "retail" && catKey !== "restaurant") return true;
  }

  return false;
}

function calculateOperatedMonths(
  openedAt: string | null,
  closedAt: string | null,
): number | null {
  const openedAtTimestamp = parseDateValue(openedAt);
  const closedAtTimestamp = parseDateValue(closedAt) ?? Date.now();

  if (openedAtTimestamp === null || closedAtTimestamp < openedAtTimestamp) {
    return null;
  }

  const start = new Date(openedAtTimestamp);
  const end = new Date(closedAtTimestamp);
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

  if (end.getUTCDate() < start.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function getHistorySortValue(historyItem: LocationHistoryItem): number {
  return (
    parseDateValue(historyItem.closedAt) ??
    parseDateValue(historyItem.openedAt) ??
    0
  );
}

function parseDateValue(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeStoreStatus(value: string | null): StoreStatus {
  if (value === "휴업" || value === "폐업" || value === "취소") {
    return value;
  }

  return "영업/정상";
}

function sanitizeLabel(value: string | null): string {
  return value?.trim() ?? "";
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function roundNumber(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function toNumber(value: number | string | null | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}
