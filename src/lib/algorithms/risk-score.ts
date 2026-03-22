import type {
  ClosureRisk,
  DistrictStats,
  LatLng,
  RiskLevel,
  StoreEntity,
} from "@/types";
import type { LOCALDATARecord } from "@/lib/data-pipeline/types";

import {
  NORMALIZATION_RANGES,
  RISK_COMPONENT_WEIGHTS,
  normalizeBusinessCategoryKey,
} from "./constants";
import { generateInsightText } from "./district-score";
import { calculateDistance } from "./huff-model";

export interface ClosureRiskOptions {
  stores?: StoreEntity[];
  recentChanges?: LOCALDATARecord[];
  districtStats?: DistrictStats | null;
  historicalStoreCounts?: number[];
  historicalPopulation?: number[];
  rentIndexSeries?: number[];
  closureCountsHistory?: number[];
  comparisonScores?: number[];
}

/**
 * 폐업 리스크 점수를 계산한다.
 *
 * @example
 * ```ts
 * const risk = closureRiskScore(
 *   { lat: 37.55, lng: 126.97 },
 *   500,
 *   "restaurant",
 *   { stores, recentChanges, rentIndexSeries }
 * );
 * ```
 */
export function closureRiskScore(
  location: LatLng,
  radius: number,
  businessCategory: string,
  options: ClosureRiskOptions = {},
): ClosureRisk {
  const nearbyStores = filterStoresWithinRadius(options.stores ?? [], location, radius);
  const nearbyChanges = filterChangesWithinRadius(
    options.recentChanges ?? [],
    location,
    radius,
  );
  const sameCategoryStores = nearbyStores.filter((store) =>
    isSameCategory(store, businessCategory),
  );
  const sameCategoryChanges = nearbyChanges.filter((record) =>
    isSameCategoryRecord(record, businessCategory),
  );

  const salesTrendProxyValue = calculateSalesTrendProxy(
    options.historicalStoreCounts ?? [],
    sameCategoryStores.length,
    sameCategoryChanges,
  );
  const competitionSurgeValue = calculateCompetitionSurge(
    sameCategoryStores.length,
    sameCategoryChanges,
  );
  const populationTrend = calculateSeriesTrend(options.historicalPopulation ?? []);
  const footTrafficDeclineValue = Math.max(-populationTrend, 0);
  const rentPressureValue = Math.max(calculateSeriesTrend(options.rentIndexSeries ?? []), 0);
  const extinctionAccelerationValue = calculateExtinctionAcceleration(
    options.closureCountsHistory ?? [],
    nearbyChanges,
  );
  const extinctionRate = calculateExtinctionRate(
    sameCategoryStores.length,
    sameCategoryChanges,
  );

  const salesTrendScore = normalizeRiskFromSignedTrend(
    salesTrendProxyValue,
    NORMALIZATION_RANGES.salesTrendProxy,
  );
  const competitionSurgeScore = normalizeAscendingRisk(
    competitionSurgeValue,
    NORMALIZATION_RANGES.competitionSurge,
  );
  const footTrafficDeclineScore = normalizeAscendingRisk(
    footTrafficDeclineValue,
    NORMALIZATION_RANGES.footTrafficDecline,
  );
  const rentPressureScore = normalizeAscendingRisk(
    rentPressureValue,
    NORMALIZATION_RANGES.rentPressure,
  );
  const extinctionAccelerationScore = normalizeAscendingRisk(
    extinctionAccelerationValue,
    NORMALIZATION_RANGES.extinctionAcceleration,
  );

  const weightedComponents = [
    {
      factor: "매출 추세 프록시 악화",
      score: salesTrendScore,
      weight: RISK_COMPONENT_WEIGHTS.salesTrendProxy,
    },
    {
      factor: "경쟁 급증",
      score: competitionSurgeScore,
      weight: RISK_COMPONENT_WEIGHTS.competitionSurge,
    },
    {
      factor: "유동 감소",
      score: footTrafficDeclineScore,
      weight: RISK_COMPONENT_WEIGHTS.footTrafficDecline,
    },
    {
      factor: "임대 압박",
      score: rentPressureScore,
      weight: RISK_COMPONENT_WEIGHTS.rentPressure,
    },
    {
      factor: "폐업 가속도",
      score: extinctionAccelerationScore,
      weight: RISK_COMPONENT_WEIGHTS.extinctionAcceleration,
    },
  ];

  const score = clampScore(
    weightedComponents.reduce((sum, component) => {
      return sum + component.score * component.weight;
    }, 0),
  );
  const level = classifyRiskLevel(score);
  const totalContribution = weightedComponents.reduce((sum, component) => {
    return sum + component.score * component.weight;
  }, 0);
  const topFactors = weightedComponents
    .map((component) => ({
      factor: component.factor,
      contribution:
        totalContribution > 0
          ? Number(
              ((component.score * component.weight) / totalContribution).toFixed(3),
            )
          : 0,
    }))
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 3);
  const riskPercentile = calculatePercentile(
    score,
    options.comparisonScores ?? [],
    50 + (score - 50) * 0.85,
  );

  return {
    score,
    level,
    topFactors,
    extinctionRate: Number(extinctionRate.toFixed(3)),
    insightText: generateInsightText(score, "risk", {
      percentile: riskPercentile,
      dominantFactor: topFactors[0]?.factor,
      dominantValue: topFactors[0]?.contribution,
      secondaryFactor: topFactors[1]?.factor,
      secondaryValue: topFactors[1]?.contribution,
    }),
  };
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

function isSameCategoryRecord(
  record: LOCALDATARecord,
  businessCategory: string,
): boolean {
  return (
    normalizeBusinessCategoryKey(record.businessCategorySmall) ===
    normalizeBusinessCategoryKey(businessCategory)
  );
}

function calculateSalesTrendProxy(
  historicalStoreCounts: number[],
  currentCount: number,
  recentChanges: LOCALDATARecord[],
): number {
  if (historicalStoreCounts.length >= 3) {
    return -calculateSecondDerivative(historicalStoreCounts);
  }

  const monthlyNetSeries = buildMonthlyNetSeries(recentChanges);

  if (monthlyNetSeries.length >= 3) {
    return -calculateSecondDerivative(monthlyNetSeries);
  }

  const openings = recentChanges.filter(isOpeningChange).length;
  const closures = recentChanges.filter(isClosureChange).length;
  const estimatedPrevious = Math.max(currentCount - openings + closures, 1);

  return (estimatedPrevious - currentCount) / estimatedPrevious;
}

function calculateCompetitionSurge(
  existingStoreCount: number,
  recentChanges: LOCALDATARecord[],
): number {
  const recentOpenings = recentChanges.filter(isOpeningChange).length;

  return recentOpenings / Math.max(existingStoreCount, 1);
}

function calculateExtinctionAcceleration(
  closureCountsHistory: number[],
  recentChanges: LOCALDATARecord[],
): number {
  if (closureCountsHistory.length >= 3) {
    return calculateSecondDerivative(closureCountsHistory);
  }

  return calculateSecondDerivative(buildMonthlyClosureSeries(recentChanges));
}

function calculateExtinctionRate(
  existingStoreCount: number,
  recentChanges: LOCALDATARecord[],
): number {
  const closures = recentChanges.filter(isClosureChange).length;
  const openings = recentChanges.filter(isOpeningChange).length;

  return closures / Math.max(existingStoreCount + openings, 1);
}

function buildMonthlyNetSeries(recentChanges: LOCALDATARecord[]): number[] {
  const monthlyOpenings = buildMonthlySeries(recentChanges, "open");
  const monthlyClosures = buildMonthlySeries(recentChanges, "closure");

  return monthlyOpenings.map((openings, index) => {
    return openings - (monthlyClosures[index] ?? 0);
  });
}

function buildMonthlyClosureSeries(recentChanges: LOCALDATARecord[]): number[] {
  return buildMonthlySeries(recentChanges, "closure");
}

function buildMonthlySeries(
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

  let total = 0;
  let count = 0;

  for (let index = 2; index < series.length; index += 1) {
    const current = series[index] ?? 0;
    const previous = series[index - 1] ?? 0;
    const beforePrevious = series[index - 2] ?? 0;

    total += current - 2 * previous + beforePrevious;
    count += 1;
  }

  return count > 0 ? total / count : 0;
}

function calculateSeriesTrend(series: number[]): number {
  if (series.length < 2) {
    return 0;
  }

  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? first;

  return (last - first) / Math.max(Math.abs(first), 1);
}

function isOpeningChange(record: LOCALDATARecord): boolean {
  return record.changeType === "I" || record.status === "영업/정상";
}

function isClosureChange(record: LOCALDATARecord): boolean {
  return record.changeType === "D" || record.status === "폐업";
}

function normalizeRiskFromSignedTrend(
  value: number,
  range: { min: number; max: number },
): number {
  const riskValue = Math.max(value, 0);

  return normalizeAscendingRisk(riskValue, range);
}

function normalizeAscendingRisk(
  value: number,
  range: { min: number; max: number },
): number {
  if (range.max <= range.min) {
    return 50;
  }

  const normalized = ((value - range.min) / (range.max - range.min)) * 100;

  return clampScore(normalized);
}

function classifyRiskLevel(score: number): RiskLevel {
  if (score <= 30) {
    return "safe";
  }

  if (score <= 60) {
    return "caution";
  }

  return "danger";
}

function calculatePercentile(
  value: number,
  comparisonScores: number[],
  fallback: number,
): number {
  if (comparisonScores.length === 0) {
    return clampScore(fallback);
  }

  const belowOrEqual = comparisonScores.filter((score) => score <= value).length;

  return clampScore((belowOrEqual / comparisonScores.length) * 100);
}

function clampScore(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100));
}
