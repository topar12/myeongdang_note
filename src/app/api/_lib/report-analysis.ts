import type {
  BEPSimulation,
  CompetitionDensity,
  DistrictStats,
  GenerateReportRequest,
  PeakTime,
  Report,
  ReportFreeData,
  ReportPaidData,
  StoreEntity,
} from "@/types";
import type { LOCALDATARecord } from "@/lib/data-pipeline/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { closureRiskScore } from "@/lib/algorithms/risk-score";
import { districtTemperatureScore } from "@/lib/algorithms/district-score";
import { estimateMonthlyRevenue } from "@/lib/algorithms/huff-model";
import {
  inferBusinessNatureFromCategory,
  normalizeBusinessCategoryKey,
} from "@/lib/algorithms/constants";

import { ApiError } from "./api-utils";

type AdminSupabaseClient = SupabaseClient;

interface NearbyStoreRow {
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
  floor_area: number | null;
  opened_at: string | null;
  closed_at: string | null;
  status: string | null;
  is_franchise: boolean | null;
  franchise_brand: string | null;
  semas_id: string | null;
  localdata_id: string | null;
  match_confidence: number | null;
  data_updated_at: string | null;
}

interface ReportRow {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  address: string;
  business_category: string;
  temperature_score: number;
  risk_score: number;
  estimated_revenue_min: number;
  estimated_revenue_median: number;
  estimated_revenue_max: number;
  report_data: unknown;
  is_paid: boolean;
  created_at: string;
}

interface SubscriptionRow {
  plan: string;
  target_dong: string | null;
  expires_at: string;
  status: string;
}

interface PaymentRow {
  status: string;
  payment_type: string;
}

const STORE_SELECT_COLUMNS = [
  "id",
  "store_name",
  "business_category_large",
  "business_category_medium",
  "business_category_small",
  "business_code",
  "location",
  "address_jibun",
  "address_road",
  "dong_code",
  "floor_area",
  "opened_at",
  "closed_at",
  "status",
  "is_franchise",
  "franchise_brand",
  "semas_id",
  "localdata_id",
  "match_confidence",
  "data_updated_at",
].join(", ");

export interface ReportAnalysisBundle {
  freeData: ReportFreeData;
  paidData: ReportPaidData;
  nearbyStores: StoreEntity[];
  districtStats: DistrictStats | null;
  targetDong: string | null;
  isPaid: boolean;
  reportData: Record<string, unknown>;
}

export async function buildReportAnalysis(
  adminSupabase: AdminSupabaseClient,
  input: GenerateReportRequest,
  userId: string,
): Promise<ReportAnalysisBundle> {
  const businessCategory = input.businessSubCategory ?? input.businessCategory;
  const nearbyStores = await fetchNearbyStores(adminSupabase, {
    lat: input.lat,
    lng: input.lng,
    radiusMeters: 500,
  });
  const sameCategoryStores = await fetchSameCategoryNearbyStores(
    adminSupabase,
    nearbyStores,
    {
      lat: input.lat,
      lng: input.lng,
      radiusMeters: 500,
      businessCategory,
    },
  );
  const recentClosedSameCategoryStores = await fetchRecentClosedCategoryStores(
    adminSupabase,
    businessCategory,
    {
      lat: input.lat,
      lng: input.lng,
      radiusMeters: 500,
    },
  );
  const districtStats = await fetchDistrictStats(adminSupabase, nearbyStores);
  const syntheticChanges = synthesizeRecentChanges(nearbyStores);
  const storeArea = inferTargetStoreArea(sameCategoryStores, businessCategory);
  const temperature = districtTemperatureScore(
    { lat: input.lat, lng: input.lng },
    500,
    businessCategory,
    {
      stores: nearbyStores,
      recentChanges: syntheticChanges,
      districtStats,
    },
  );
  const competition = buildCompetitionDensity(nearbyStores, businessCategory);
  const peakTimes = buildPeakTimes(
    businessCategory,
    districtStats,
    nearbyStores,
    temperature.score,
  );
  const revenue = estimateMonthlyRevenue(
    { lat: input.lat, lng: input.lng },
    businessCategory,
    storeArea,
    {
      businessNature: inferBusinessNatureFromCategory(businessCategory),
      competitors: nearbyStores.filter((store) => isSameCategory(store, businessCategory)),
      districtStats,
      recentChanges: syntheticChanges,
      targetStoreName: `${businessCategory} 신규 점포`,
    },
  );
  const closureRisk = closureRiskScore(
    { lat: input.lat, lng: input.lng },
    500,
    businessCategory,
    {
      stores: nearbyStores,
      recentChanges: syntheticChanges,
      districtStats,
    },
  );
  const bep = buildBepSimulation(revenue, storeArea);
  const targetDong = getDominantDongCode(nearbyStores);
  const isPaid = await resolveSubscriptionAccess(adminSupabase, userId, targetDong);
  const survivalStats = buildSurvivalStats(sameCategoryStores);
  const competitorList = buildCompetitorList(
    sameCategoryStores,
    { lat: input.lat, lng: input.lng },
    30,
  );
  const openCloseTimeline = buildOpenCloseTimeline(
    sameCategoryStores,
    recentClosedSameCategoryStores,
  );
  const areaSurvival = buildAreaSurvival(sameCategoryStores, storeArea);
  const franchiseAnalysis = buildFranchiseAnalysis(sameCategoryStores);

  const freeData: ReportFreeData = {
    temperature,
    peakTimes,
    competition,
    survivalStats,
  };
  const paidData: ReportPaidData = {
    revenue,
    bep,
    closureRisk,
    competitorList,
    openCloseTimeline,
    areaSurvival,
    franchiseAnalysis,
  };

  return {
    freeData,
    paidData,
    nearbyStores,
    districtStats,
    targetDong,
    isPaid,
    reportData: {
      freeData,
      paidData,
      meta: {
        targetDong,
        generatedAt: new Date().toISOString(),
        nearbyStoreCount: nearbyStores.length,
        districtStats,
      },
    },
  };
}

export async function createReportRecord(
  adminSupabase: AdminSupabaseClient,
  userId: string,
  input: GenerateReportRequest,
  analysis: ReportAnalysisBundle,
): Promise<Report> {
  const businessCategory = input.businessSubCategory ?? input.businessCategory;
  const payload = {
    user_id: userId,
    lat: input.lat,
    lng: input.lng,
    address: input.address,
    business_category: businessCategory,
    temperature_score: analysis.freeData.temperature.score,
    risk_score: analysis.paidData.closureRisk.score,
    estimated_revenue_min: analysis.paidData.revenue.min,
    estimated_revenue_median: analysis.paidData.revenue.median,
    estimated_revenue_max: analysis.paidData.revenue.max,
    report_data: analysis.reportData,
    is_paid: analysis.isPaid,
  };

  const { data, error } = await adminSupabase
    .from("reports")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(500, "리포트 저장에 실패했습니다.", "report_insert_failed", error);
  }

  return mapReportRowToResponse(data as ReportRow, analysis.isPaid);
}

export async function fetchOwnedReport(
  adminSupabase: AdminSupabaseClient,
  reportId: string,
  userId: string,
): Promise<ReportRow> {
  const { data, error } = await adminSupabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new ApiError(404, "리포트를 찾을 수 없습니다.", "report_not_found", error);
  }

  return data as ReportRow;
}

export async function resolveReportAccess(
  adminSupabase: AdminSupabaseClient,
  reportRow: ReportRow,
  userId: string,
): Promise<boolean> {
  const reportData = asRecord(reportRow.report_data);
  const meta = asRecord(reportData.meta);
  const targetDong =
    typeof meta.targetDong === "string" && meta.targetDong.length > 0
      ? meta.targetDong
      : null;

  if (reportRow.is_paid) {
    return true;
  }

  const { data: paymentRows, error: paymentError } = await adminSupabase
    .from("payments")
    .select("status, payment_type")
    .eq("user_id", userId)
    .eq("report_id", reportRow.id)
    .eq("status", "completed");

  if (paymentError) {
    throw new ApiError(
      500,
      "결제 상태를 확인할 수 없습니다.",
      "payment_lookup_failed",
      paymentError,
    );
  }

  const hasCompletedSinglePayment = (paymentRows as PaymentRow[] | null)?.some(
    (payment) => payment.status === "completed" && payment.payment_type === "single",
  );

  if (hasCompletedSinglePayment) {
    return true;
  }

  return resolveSubscriptionAccess(adminSupabase, userId, targetDong);
}

export function mapReportRowToResponse(
  reportRow: ReportRow,
  hasPaidAccess: boolean,
): Report {
  const reportData = asRecord(reportRow.report_data);
  const freeData = parseFreeData(reportData.freeData, reportRow.business_category, reportRow.temperature_score);
  const paidData = hasPaidAccess
    ? parsePaidData(
        reportData.paidData,
        reportRow,
      )
    : null;

  return {
    id: reportRow.id,
    userId: reportRow.user_id,
    lat: Number(reportRow.lat),
    lng: Number(reportRow.lng),
    address: reportRow.address,
    businessCategory: reportRow.business_category,
    freeData,
    paidData,
    isPaid: hasPaidAccess,
    createdAt: reportRow.created_at,
  };
}

export async function fetchNearbyStores(
  adminSupabase: AdminSupabaseClient,
  params: {
    lat: number;
    lng: number;
    radiusMeters: number;
    category?: string | null;
  },
): Promise<StoreEntity[]> {
  const { data, error } = await adminSupabase.rpc("nearby_stores", {
    target_lat: params.lat,
    target_lng: params.lng,
    radius_meters: params.radiusMeters,
    category: params.category ?? null,
  });

  if (error) {
    throw new ApiError(
      500,
      "주변 점포 조회에 실패했습니다.",
      "nearby_store_lookup_failed",
      error,
    );
  }

  const rows = Array.isArray(data) ? (data as NearbyStoreRow[]) : [];

  return rows.map((row, index) => normalizeStoreRow(row, params, index));
}

export async function fetchDistrictStats(
  adminSupabase: AdminSupabaseClient,
  nearbyStores: StoreEntity[],
): Promise<DistrictStats | null> {
  const targetDong = getDominantDongCode(nearbyStores);

  if (!targetDong) {
    return null;
  }

  const { data, error } = await adminSupabase
    .from("district_stats")
    .select("dong_code, dong_name, population, households, single_households, updated_at")
    .eq("dong_code", targetDong)
    .maybeSingle();

  if (error) {
    throw new ApiError(
      500,
      "행정동 통계를 조회할 수 없습니다.",
      "district_stats_lookup_failed",
      error,
    );
  }

  if (!data) {
    return null;
  }

  return {
    dongCode: data.dong_code,
    dongName: data.dong_name,
    population: Number(data.population ?? 0),
    households: Number(data.households ?? 0),
    singleHouseholds: Number(data.single_households ?? 0),
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

function normalizeStoreRow(
  row: NearbyStoreRow,
  params: {
    lat: number;
    lng: number;
  },
  index: number,
): StoreEntity {
  const fallbackLocation = buildDeterministicFallbackLocation(
    params.lat,
    params.lng,
    row.id,
    index,
  );

  return {
    id: row.id,
    storeName: row.store_name,
    businessCategoryLarge: row.business_category_large ?? "",
    businessCategoryMedium: row.business_category_medium ?? "",
    businessCategorySmall: row.business_category_small ?? "",
    businessCode: row.business_code ?? "",
    location: parseLocation(row.location) ?? fallbackLocation,
    addressJibun: row.address_jibun,
    addressRoad: row.address_road,
    dongCode: row.dong_code ?? "",
    floorArea: Number(row.floor_area ?? 0),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    status: normalizeStoreStatus(row.status),
    isFranchise: Boolean(row.is_franchise),
    franchiseBrand: row.franchise_brand,
    semasId: row.semas_id,
    localdataId: row.localdata_id,
    matchConfidence: Number(row.match_confidence ?? 0),
    dataUpdatedAt: row.data_updated_at ?? new Date().toISOString(),
  };
}

function buildCompetitionDensity(
  nearbyStores: StoreEntity[],
  businessCategory: string,
): CompetitionDensity {
  const sameCategoryCount = nearbyStores.filter((store) =>
    isSameCategory(store, businessCategory),
  ).length;
  const substituteCategoryCount = nearbyStores.filter((store) => {
    if (isSameCategory(store, businessCategory)) {
      return false;
    }

    return (
      normalizeBusinessCategoryKey(store.businessCategoryLarge || store.businessCategoryMedium) ===
      normalizeBusinessCategoryKey(businessCategory)
    );
  }).length;
  const densityIndex = sameCategoryCount * 6 + substituteCategoryCount * 2;
  const densityPercentile = Math.max(5, Math.min(99, Math.round(25 + densityIndex)));

  return {
    sameCategory: sameCategoryCount,
    substituteCategory: substituteCategoryCount,
    densityPercentile,
    insightText:
      sameCategoryCount >= 12
        ? "동종업종 경쟁 밀도가 높은 편입니다."
        : sameCategoryCount >= 6
          ? "경쟁 강도는 중간 수준입니다."
          : "아직 경쟁 밀도는 과도하지 않습니다.",
  };
}

function buildPeakTimes(
  businessCategory: string,
  districtStats: DistrictStats | null,
  nearbyStores: StoreEntity[],
  temperatureScore: number,
): PeakTime[] {
  const categoryKey = normalizeBusinessCategoryKey(businessCategory);
  const baseBoost =
    Math.round(Math.min(20, nearbyStores.length * 0.8)) +
    Math.round((districtStats?.population ?? 8000) / 5000) +
    Math.round((temperatureScore - 50) / 8);

  const templates: Record<string, PeakTime[]> = {
    cafe: [
      { dayType: "weekday", timeSlot: "08:00~10:00", relativeScore: 68 },
      { dayType: "weekday", timeSlot: "12:00~13:00", relativeScore: 84 },
      { dayType: "weekend", timeSlot: "14:00~17:00", relativeScore: 79 },
    ],
    restaurant: [
      { dayType: "weekday", timeSlot: "12:00~13:30", relativeScore: 88 },
      { dayType: "weekday", timeSlot: "18:00~20:00", relativeScore: 82 },
      { dayType: "weekend", timeSlot: "12:00~15:00", relativeScore: 76 },
    ],
    beauty: [
      { dayType: "weekday", timeSlot: "18:00~20:00", relativeScore: 73 },
      { dayType: "weekend", timeSlot: "11:00~14:00", relativeScore: 84 },
      { dayType: "weekend", timeSlot: "15:00~18:00", relativeScore: 80 },
    ],
    retail: [
      { dayType: "weekday", timeSlot: "18:00~20:00", relativeScore: 70 },
      { dayType: "weekend", timeSlot: "13:00~16:00", relativeScore: 86 },
      { dayType: "weekend", timeSlot: "17:00~19:00", relativeScore: 78 },
    ],
  };
  const fallbackTemplate = templates.retail;
  const selectedTemplate =
    templates[categoryKey] ?? fallbackTemplate;

  return selectedTemplate
    .map((slot, index) => ({
      ...slot,
      relativeScore: Math.max(
        45,
        Math.min(99, slot.relativeScore + baseBoost - index * 3),
      ),
    }))
    .sort((left, right) => right.relativeScore - left.relativeScore)
    .slice(0, 3);
}

function buildBepSimulation(
  revenue: ReportPaidData["revenue"],
  storeArea: number,
): BEPSimulation {
  const monthlyRent = Math.round(Math.max(storeArea, 20) * 5.5);
  const bepRevenue = Math.round(monthlyRent * 10000 / 0.18);
  const bepCustomers = Math.max(1, Math.round(bepRevenue / 6500 / 30));
  const rentToSalesRatio = Number(
    (monthlyRent * 10000 / Math.max(revenue.median, 1)).toFixed(3),
  );
  const riskLevel =
    rentToSalesRatio >= 0.2
      ? "danger"
      : rentToSalesRatio >= 0.12
        ? "caution"
        : "safe";

  return {
    monthlyRent,
    bepRevenue,
    bepCustomers,
    rentToSalesRatio,
    riskLevel,
    insightText:
      riskLevel === "danger"
        ? "임대료 부담이 큰 편이라 고정비 관리가 중요합니다."
        : riskLevel === "caution"
          ? "손익분기점은 달성 가능하지만 초기 마케팅 효율이 중요합니다."
          : "임대료 부담은 상대적으로 안정적인 편입니다.",
  };
}

async function resolveSubscriptionAccess(
  adminSupabase: AdminSupabaseClient,
  userId: string,
  targetDong: string | null,
): Promise<boolean> {
  // 비로그인 유저는 Free Tier
  if (userId === "anonymous") return false;

  const { data, error } = await adminSupabase
    .from("subscriptions")
    .select("plan, target_dong, expires_at, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new ApiError(
      500,
      "구독 상태를 확인할 수 없습니다.",
      "subscription_lookup_failed",
      error,
    );
  }

  const now = Date.now();
  const subscriptions = (data as SubscriptionRow[] | null) ?? [];

  return subscriptions.some((subscription) => {
    const expiresAt = Date.parse(subscription.expires_at);

    if (Number.isNaN(expiresAt) || expiresAt < now) {
      return false;
    }

    if (subscription.plan === "local_pass") {
      return Boolean(targetDong) && subscription.target_dong === targetDong;
    }

    return true;
  });
}

function parseFreeData(
  value: unknown,
  businessCategory: string,
  temperatureScore: number,
): ReportFreeData {
  const record = asRecord(value);
  const temperature = asRecord(record.temperature);
  const peakTimes = Array.isArray(record.peakTimes)
    ? (record.peakTimes as PeakTime[])
    : [];
  const competition = asRecord(record.competition);

  return {
    temperature: {
      score: asNumber(temperature.score, temperatureScore),
      trend: asTrend(temperature.trend),
      percentile: asNumber(temperature.percentile, 50),
      factors: {
        storeDynamics: asNumber(asRecord(temperature.factors).storeDynamics, 50),
        demandStability: asNumber(asRecord(temperature.factors).demandStability, 50),
        districtVitality: asNumber(asRecord(temperature.factors).districtVitality, 50),
      },
      insightText:
        asString(temperature.insightText) ??
        `${businessCategory} 기준 상권 온도는 중립 수준입니다.`,
    },
    peakTimes,
    competition: {
      sameCategory: asNumber(competition.sameCategory, 0),
      substituteCategory: asNumber(competition.substituteCategory, 0),
      densityPercentile: asNumber(competition.densityPercentile, 50),
      insightText:
        asString(competition.insightText) ?? "경쟁 강도는 기본 수준으로 해석됩니다.",
    },
  };
}

function parsePaidData(
  value: unknown,
  reportRow: ReportRow,
): ReportPaidData {
  const record = asRecord(value);
  const revenue = asRecord(record.revenue);
  const bep = record.bep === null ? null : asRecord(record.bep);
  const closureRisk = asRecord(record.closureRisk);

  return {
    revenue: {
      min: asNumber(revenue.min, reportRow.estimated_revenue_min),
      median: asNumber(revenue.median, reportRow.estimated_revenue_median),
      max: asNumber(revenue.max, reportRow.estimated_revenue_max),
      confidence: asConfidence(revenue.confidence),
      percentile: asNumber(revenue.percentile, 50),
      insightText:
        asString(revenue.insightText) ?? "예상 매출 정보가 준비되었습니다.",
    },
    bep:
      bep === null
        ? null
        : {
            monthlyRent: asNumber(bep.monthlyRent, 0),
            bepRevenue: asNumber(bep.bepRevenue, 0),
            bepCustomers: asNumber(bep.bepCustomers, 0),
            rentToSalesRatio: Number(asNumber(bep.rentToSalesRatio, 0)),
            riskLevel: asRiskLevel(bep.riskLevel),
            insightText:
              asString(bep.insightText) ?? "손익분기점 정보가 준비되었습니다.",
          },
    closureRisk: {
      score: asNumber(closureRisk.score, reportRow.risk_score),
      level: asRiskLevel(closureRisk.level),
      topFactors: Array.isArray(closureRisk.topFactors)
        ? (closureRisk.topFactors as ReportPaidData["closureRisk"]["topFactors"])
        : [],
      extinctionRate: Number(asNumber(closureRisk.extinctionRate, 0)),
      insightText:
        asString(closureRisk.insightText) ?? "폐업 리스크 정보가 준비되었습니다.",
    },
  };
}

function synthesizeRecentChanges(stores: StoreEntity[]): LOCALDATARecord[] {
  return stores.flatMap((store) => {
    const records: LOCALDATARecord[] = [];

    if (store.openedAt && isRecentDate(store.openedAt, 180)) {
      records.push(createSyntheticChangeRecord(store, "I"));
    }

    if (
      store.status === "폐업" ||
      (store.closedAt && isRecentDate(store.closedAt, 180))
    ) {
      records.push(createSyntheticChangeRecord(store, "D"));
    }

    if (records.length === 0) {
      records.push(createSyntheticChangeRecord(store, "U"));
    }

    return records;
  });
}

function createSyntheticChangeRecord(
  store: StoreEntity,
  changeType: LOCALDATARecord["changeType"],
): LOCALDATARecord {
  return {
    sourceId: store.localdataId,
    changeType,
    storeName: store.storeName,
    businessCategoryLarge: store.businessCategoryLarge,
    businessCategoryMedium: store.businessCategoryMedium,
    businessCategorySmall: store.businessCategorySmall,
    businessCode: store.businessCode,
    location: store.location,
    sourceCoordinates: null,
    addressJibun: store.addressJibun,
    addressRoad: store.addressRoad,
    dongCode: store.dongCode,
    floorArea: store.floorArea,
    openedAt: store.openedAt,
    closedAt: store.closedAt,
    status: store.status,
    permitDate: store.openedAt,
    dataUpdatedAt: store.dataUpdatedAt,
    raw: {},
  };
}

function inferTargetStoreArea(
  nearbyStores: StoreEntity[],
  businessCategory: string,
): number {
  const sameCategoryAreas = nearbyStores
    .filter((store) => isSameCategory(store, businessCategory))
    .map((store) => store.floorArea)
    .filter((area) => area > 0)
    .sort((left, right) => left - right);

  if (sameCategoryAreas.length === 0) {
    return 40;
  }

  return sameCategoryAreas[Math.floor(sameCategoryAreas.length / 2)] ?? 40;
}

function getDominantDongCode(stores: StoreEntity[]): string | null {
  if (stores.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();

  for (const store of stores) {
    if (!store.dongCode) {
      continue;
    }

    counts.set(store.dongCode, (counts.get(store.dongCode) ?? 0) + 1);
  }

  const ranking = [...counts.entries()].sort((left, right) => right[1] - left[1]);

  return ranking[0]?.[0] ?? null;
}

function isSameCategory(store: StoreEntity, businessCategory: string): boolean {
  return (
    normalizeBusinessCategoryKey(store.businessCategorySmall || store.businessCategoryMedium) ===
    normalizeBusinessCategoryKey(businessCategory)
  );
}

function parseLocation(
  value: unknown,
): {
  lat: number;
  lng: number;
} | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const pointMatch =
      /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(value);

    if (pointMatch) {
      const lng = Number(pointMatch[1]);
      const lat = Number(pointMatch[2]);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;

    if (typeof record.lat === "number" && typeof record.lng === "number") {
      return {
        lat: record.lat,
        lng: record.lng,
      };
    }

    if (Array.isArray(record.coordinates) && record.coordinates.length >= 2) {
      const [lng, lat] = record.coordinates;

      if (typeof lat === "number" && typeof lng === "number") {
        return { lat, lng };
      }
    }
  }

  return null;
}

function buildDeterministicFallbackLocation(
  lat: number,
  lng: number,
  seed: string,
  index: number,
): {
  lat: number;
  lng: number;
} {
  const hash = [...`${seed}-${index}`].reduce((sum, character, charIndex) => {
    return sum + character.charCodeAt(0) * (charIndex + 1);
  }, 0);
  const radiusMeters = 40 + (hash % 320);
  const angleRadians = ((hash % 360) * Math.PI) / 180;
  const latOffset = (radiusMeters * Math.cos(angleRadians)) / 111320;
  const lngOffset =
    (radiusMeters * Math.sin(angleRadians)) /
    (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));

  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}

function normalizeStoreStatus(value: string | null): StoreEntity["status"] {
  if (value === "휴업" || value === "폐업" || value === "취소") {
    return value;
  }

  return "영업/정상";
}

function isRecentDate(value: string, days: number): boolean {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return false;
  }

  const diffDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown, fallback: number): number {
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

function asTrend(value: unknown): ReportFreeData["temperature"]["trend"] {
  if (value === "up" || value === "stable" || value === "down") {
    return value;
  }

  return "stable";
}

function asRiskLevel(value: unknown): NonNullable<BEPSimulation["riskLevel"]> {
  if (value === "safe" || value === "caution" || value === "danger") {
    return value;
  }

  return "caution";
}

function asConfidence(
  value: unknown,
): ReportPaidData["revenue"]["confidence"] {
  if (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5
  ) {
    return value;
  }

  return 3;
}
