import { createAdminSupabase } from "@/lib/supabase";

import type {
  EntityResolverOptions,
  JsonRecord,
  LOCALDATARecord,
  LatLng,
  MatchResult,
  MatchStrategy,
  SEMASRecord,
  StoreEntity,
} from "./types";

const DEFAULT_NAME_SIMILARITY_THRESHOLD = 0.8;
const DEFAULT_SPATIAL_DISTANCE_METERS = 10;
const MAX_LOCALDATA_ONLY_CONFIDENCE = 0.55;
const MAX_SEMAS_ONLY_CONFIDENCE = 0.45;

interface CandidateMatch {
  record: LOCALDATARecord;
  strategy: Exclude<MatchStrategy, "localdata_only" | "semas_only">;
  confidence: number;
  distanceMeters: number | null;
  nameSimilarity: number | null;
}

interface SupabaseClientLike {
  from(table: string): {
    upsert(
      values: JsonRecord[],
      options?: JsonRecord,
    ): Promise<{ error: { message: string } | null }>;
  };
}

export function levenshteinDistance(source: string, target: string): number {
  const a = normalizeComparisonText(source);
  const b = normalizeComparisonText(target);

  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);
  const currentRow = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    currentRow[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;

      currentRow[j] = Math.min(
        currentRow[j - 1]! + 1,
        previousRow[j]! + 1,
        previousRow[j - 1]! + substitutionCost,
      );
    }

    for (let j = 0; j < currentRow.length; j += 1) {
      previousRow[j] = currentRow[j] ?? previousRow[j]!;
    }
  }

  return previousRow[b.length] ?? 0;
}

export function calculateNameSimilarity(source: string, target: string): number {
  const normalizedSource = normalizeComparisonText(source);
  const normalizedTarget = normalizeComparisonText(target);

  if (!normalizedSource || !normalizedTarget) {
    return 0;
  }

  const maxLength = Math.max(normalizedSource.length, normalizedTarget.length);

  if (maxLength === 0) {
    return 1;
  }

  return Number(
    (
      1 -
      levenshteinDistance(normalizedSource, normalizedTarget) / maxLength
    ).toFixed(4),
  );
}

export function haversineDistanceMeters(
  pointA: LatLng | null,
  pointB: LatLng | null,
): number | null {
  if (!pointA || !pointB) {
    return null;
  }

  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLng = toRadians(pointB.lng - pointA.lng);
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Number((earthRadiusMeters * arc).toFixed(2));
}

export function resolveStoreEntities(
  semasRecords: SEMASRecord[],
  localdataRecords: LOCALDATARecord[],
  existingStores: StoreEntity[] = [],
  options: EntityResolverOptions = {},
): MatchResult[] {
  const nameSimilarityThreshold =
    options.nameSimilarityThreshold ?? DEFAULT_NAME_SIMILARITY_THRESHOLD;
  const maxSpatialDistanceMeters =
    options.maxSpatialDistanceMeters ?? DEFAULT_SPATIAL_DISTANCE_METERS;
  const usedLocaldataIds = new Set<string>();
  const roadAddressIndex = buildRoadAddressIndex(localdataRecords);
  const existingStoreIndex = buildExistingStoreIndex(existingStores);
  const results: MatchResult[] = [];

  for (const semasRecord of semasRecords) {
    const candidate = findBestCandidateForSemasRecord(semasRecord, localdataRecords, {
      roadAddressIndex,
      usedLocaldataIds,
      nameSimilarityThreshold,
      maxSpatialDistanceMeters,
    });

    if (candidate) {
      const localdataKey = buildLocaldataKey(candidate.record);

      if (localdataKey) {
        usedLocaldataIds.add(localdataKey);
      }

      const existingStore = findExistingStore(
        existingStoreIndex,
        semasRecord.sourceId,
        candidate.record.sourceId,
      );

      results.push({
        semasRecord,
        localdataRecord: candidate.record,
        matched: true,
        strategy: candidate.strategy,
        confidence: candidate.confidence,
        distanceMeters: candidate.distanceMeters,
        nameSimilarity: candidate.nameSimilarity,
        storeEntity: mergeSourceRecords({
          semasRecord,
          localdataRecord: candidate.record,
          existingStore,
          confidence: candidate.confidence,
        }),
      });

      continue;
    }

    const existingStore = findExistingStore(
      existingStoreIndex,
      semasRecord.sourceId,
      null,
    );

    results.push({
      semasRecord,
      localdataRecord: null,
      matched: false,
      strategy: "semas_only",
      confidence: MAX_SEMAS_ONLY_CONFIDENCE,
      distanceMeters: null,
      nameSimilarity: null,
      storeEntity: mergeSourceRecords({
        semasRecord,
        localdataRecord: null,
        existingStore,
        confidence: MAX_SEMAS_ONLY_CONFIDENCE,
      }),
    });
  }

  for (const localdataRecord of localdataRecords) {
    const localdataKey = buildLocaldataKey(localdataRecord);

    if (localdataKey && usedLocaldataIds.has(localdataKey)) {
      continue;
    }

    const existingStore = findExistingStore(
      existingStoreIndex,
      null,
      localdataRecord.sourceId,
    );

    results.push({
      semasRecord: null,
      localdataRecord,
      matched: false,
      strategy: "localdata_only",
      confidence: MAX_LOCALDATA_ONLY_CONFIDENCE,
      distanceMeters: null,
      nameSimilarity: null,
      storeEntity: mergeSourceRecords({
        semasRecord: null,
        localdataRecord,
        existingStore,
        confidence: MAX_LOCALDATA_ONLY_CONFIDENCE,
      }),
    });
  }

  return results;
}

export function mergeSourceRecords(params: {
  semasRecord: SEMASRecord | null;
  localdataRecord: LOCALDATARecord | null;
  existingStore?: StoreEntity | null;
  confidence: number;
}): StoreEntity {
  const { semasRecord, localdataRecord, existingStore, confidence } = params;
  const location =
    localdataRecord?.location ??
    semasRecord?.location ??
    existingStore?.location ??
    { lat: 0, lng: 0 };
  const timestamp = getLatestTimestamp(
    localdataRecord?.dataUpdatedAt,
    semasRecord?.dataUpdatedAt,
    existingStore?.dataUpdatedAt,
  );

  return {
    id: existingStore?.id ?? crypto.randomUUID(),
    storeName:
      firstNonEmpty(
        localdataRecord?.storeName,
        semasRecord?.storeName,
        existingStore?.storeName,
      ) ?? "",
    businessCategoryLarge:
      firstNonEmpty(
        semasRecord?.businessCategoryLarge,
        localdataRecord?.businessCategoryLarge,
        existingStore?.businessCategoryLarge,
      ) ?? "",
    businessCategoryMedium:
      firstNonEmpty(
        semasRecord?.businessCategoryMedium,
        localdataRecord?.businessCategoryMedium,
        existingStore?.businessCategoryMedium,
      ) ?? "",
    businessCategorySmall:
      firstNonEmpty(
        semasRecord?.businessCategorySmall,
        localdataRecord?.businessCategorySmall,
        existingStore?.businessCategorySmall,
      ) ?? "",
    businessCode:
      firstNonEmpty(
        semasRecord?.businessCode,
        localdataRecord?.businessCode,
        existingStore?.businessCode,
      ) ?? "",
    location,
    addressJibun:
      firstNonEmpty(
        semasRecord?.addressJibun,
        localdataRecord?.addressJibun,
        existingStore?.addressJibun ?? null,
      ) ?? null,
    addressRoad:
      firstNonEmpty(
        semasRecord?.addressRoad,
        localdataRecord?.addressRoad,
        existingStore?.addressRoad ?? null,
      ) ?? null,
    dongCode:
      firstNonEmpty(
        semasRecord?.dongCode,
        localdataRecord?.dongCode,
        existingStore?.dongCode,
      ) ?? "",
    floorArea:
      localdataRecord?.floorArea ??
      existingStore?.floorArea ??
      0,
    openedAt:
      firstNonEmpty(
        localdataRecord?.openedAt,
        localdataRecord?.permitDate,
        existingStore?.openedAt ?? null,
      ) ?? null,
    closedAt:
      firstNonEmpty(localdataRecord?.closedAt, existingStore?.closedAt ?? null) ??
      null,
    status: localdataRecord?.status ?? existingStore?.status ?? "영업/정상",
    isFranchise:
      semasRecord?.isFranchise ??
      existingStore?.isFranchise ??
      false,
    franchiseBrand:
      firstNonEmpty(
        semasRecord?.franchiseBrand,
        existingStore?.franchiseBrand ?? null,
      ) ?? null,
    semasId:
      firstNonEmpty(semasRecord?.sourceId, existingStore?.semasId ?? null) ?? null,
    localdataId:
      firstNonEmpty(
        localdataRecord?.sourceId,
        existingStore?.localdataId ?? null,
      ) ?? null,
    matchConfidence: Number(confidence.toFixed(2)),
    dataUpdatedAt: timestamp,
  };
}

export async function upsertResolvedStores(
  matchResults: MatchResult[],
): Promise<void> {
  const supabaseClient = createAdminSupabase() as unknown as SupabaseClientLike;

  if (typeof supabaseClient.from !== "function") {
    throw new Error("Supabase client is not configured for store upserts.");
  }

  const payload = matchResults.map(({ storeEntity }) => ({
    id: storeEntity.id,
    store_name: storeEntity.storeName,
    business_category_large: storeEntity.businessCategoryLarge,
    business_category_medium: storeEntity.businessCategoryMedium,
    business_category_small: storeEntity.businessCategorySmall,
    business_code: storeEntity.businessCode,
    location: toGeographyPoint(storeEntity.location),
    address_jibun: storeEntity.addressJibun,
    address_road: storeEntity.addressRoad,
    dong_code: storeEntity.dongCode,
    floor_area: storeEntity.floorArea,
    opened_at: storeEntity.openedAt,
    closed_at: storeEntity.closedAt,
    status: storeEntity.status,
    is_franchise: storeEntity.isFranchise,
    franchise_brand: storeEntity.franchiseBrand,
    semas_id: storeEntity.semasId,
    localdata_id: storeEntity.localdataId,
    match_confidence: storeEntity.matchConfidence,
    data_updated_at: storeEntity.dataUpdatedAt,
  }));

  const { error } = await supabaseClient.from("stores").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Failed to upsert stores: ${error.message}`);
  }
}

function findBestCandidateForSemasRecord(
  semasRecord: SEMASRecord,
  localdataRecords: LOCALDATARecord[],
  options: {
    roadAddressIndex: Map<string, LOCALDATARecord[]>;
    usedLocaldataIds: Set<string>;
    nameSimilarityThreshold: number;
    maxSpatialDistanceMeters: number;
  },
): CandidateMatch | null {
  const exactAddressCandidate = findExactRoadAddressCandidate(semasRecord, options);

  if (exactAddressCandidate) {
    return exactAddressCandidate;
  }

  const nameSimilarityCandidate = findNameSimilarityCandidate(
    semasRecord,
    localdataRecords,
    options.usedLocaldataIds,
    options.nameSimilarityThreshold,
  );

  if (nameSimilarityCandidate) {
    return nameSimilarityCandidate;
  }

  return findSpatialCandidate(
    semasRecord,
    localdataRecords,
    options.usedLocaldataIds,
    options.maxSpatialDistanceMeters,
  );
}

function findExactRoadAddressCandidate(
  semasRecord: SEMASRecord,
  options: {
    roadAddressIndex: Map<string, LOCALDATARecord[]>;
    usedLocaldataIds: Set<string>;
  },
): CandidateMatch | null {
  const roadAddressKey = normalizeComparisonText(semasRecord.addressRoad ?? "");

  if (!roadAddressKey) {
    return null;
  }

  const candidates = (options.roadAddressIndex.get(roadAddressKey) ?? []).filter(
    (record) => {
      const key = buildLocaldataKey(record);

      return !key || !options.usedLocaldataIds.has(key);
    },
  );

  if (candidates.length === 0) {
    return null;
  }

  const bestCandidate = [...candidates].sort((left, right) => {
    const rightScore = categoryAffinityScore(semasRecord, right);
    const leftScore = categoryAffinityScore(semasRecord, left);

    return rightScore - leftScore;
  })[0];

  if (!bestCandidate) {
    return null;
  }

  const confidence = clamp(0.9 + categoryAffinityScore(semasRecord, bestCandidate), 0, 0.99);

  return {
    record: bestCandidate,
    strategy: "road_address_exact",
    confidence: Number(confidence.toFixed(2)),
    distanceMeters: haversineDistanceMeters(
      semasRecord.location,
      bestCandidate.location,
    ),
    nameSimilarity: calculateNameSimilarity(
      semasRecord.storeName,
      bestCandidate.storeName,
    ),
  };
}

function findNameSimilarityCandidate(
  semasRecord: SEMASRecord,
  localdataRecords: LOCALDATARecord[],
  usedLocaldataIds: Set<string>,
  threshold: number,
): CandidateMatch | null {
  let bestCandidate: CandidateMatch | null = null;

  for (const localdataRecord of localdataRecords) {
    const key = buildLocaldataKey(localdataRecord);

    if (key && usedLocaldataIds.has(key)) {
      continue;
    }

    const similarity = calculateNameSimilarity(
      semasRecord.storeName,
      localdataRecord.storeName,
    );

    if (similarity < threshold) {
      continue;
    }

    const confidence = clamp(
      0.72 + similarity * 0.18 + categoryAffinityScore(semasRecord, localdataRecord),
      0,
      0.94,
    );
    const candidate: CandidateMatch = {
      record: localdataRecord,
      strategy: "name_similarity",
      confidence: Number(confidence.toFixed(2)),
      distanceMeters: haversineDistanceMeters(
        semasRecord.location,
        localdataRecord.location,
      ),
      nameSimilarity: similarity,
    };

    if (!bestCandidate || candidate.confidence > bestCandidate.confidence) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function findSpatialCandidate(
  semasRecord: SEMASRecord,
  localdataRecords: LOCALDATARecord[],
  usedLocaldataIds: Set<string>,
  maxDistanceMeters: number,
): CandidateMatch | null {
  let bestCandidate: CandidateMatch | null = null;

  for (const localdataRecord of localdataRecords) {
    const key = buildLocaldataKey(localdataRecord);

    if (key && usedLocaldataIds.has(key)) {
      continue;
    }

    const distanceMeters = haversineDistanceMeters(
      semasRecord.location,
      localdataRecord.location,
    );

    if (distanceMeters === null || distanceMeters > maxDistanceMeters) {
      continue;
    }

    const confidence = clamp(
      0.62 +
        (1 - distanceMeters / maxDistanceMeters) * 0.2 +
        categoryAffinityScore(semasRecord, localdataRecord),
      0,
      0.88,
    );
    const candidate: CandidateMatch = {
      record: localdataRecord,
      strategy: "spatial_proximity",
      confidence: Number(confidence.toFixed(2)),
      distanceMeters,
      nameSimilarity: calculateNameSimilarity(
        semasRecord.storeName,
        localdataRecord.storeName,
      ),
    };

    if (!bestCandidate) {
      bestCandidate = candidate;
      continue;
    }

    const bestDistance = bestCandidate.distanceMeters ?? Number.POSITIVE_INFINITY;

    if (distanceMeters < bestDistance) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function buildRoadAddressIndex(
  records: LOCALDATARecord[],
): Map<string, LOCALDATARecord[]> {
  const index = new Map<string, LOCALDATARecord[]>();

  for (const record of records) {
    const key = normalizeComparisonText(record.addressRoad ?? "");

    if (!key) {
      continue;
    }

    const bucket = index.get(key) ?? [];

    bucket.push(record);
    index.set(key, bucket);
  }

  return index;
}

function buildExistingStoreIndex(
  stores: StoreEntity[],
): {
  bySemasId: Map<string, StoreEntity>;
  byLocaldataId: Map<string, StoreEntity>;
} {
  const bySemasId = new Map<string, StoreEntity>();
  const byLocaldataId = new Map<string, StoreEntity>();

  for (const store of stores) {
    if (store.semasId) {
      bySemasId.set(store.semasId, store);
    }

    if (store.localdataId) {
      byLocaldataId.set(store.localdataId, store);
    }
  }

  return { bySemasId, byLocaldataId };
}

function findExistingStore(
  index: {
    bySemasId: Map<string, StoreEntity>;
    byLocaldataId: Map<string, StoreEntity>;
  },
  semasId: string | null,
  localdataId: string | null,
): StoreEntity | null {
  if (semasId && index.bySemasId.has(semasId)) {
    return index.bySemasId.get(semasId) ?? null;
  }

  if (localdataId && index.byLocaldataId.has(localdataId)) {
    return index.byLocaldataId.get(localdataId) ?? null;
  }

  return null;
}

function categoryAffinityScore(
  semasRecord: SEMASRecord,
  localdataRecord: LOCALDATARecord,
): number {
  let score = 0;

  if (
    semasRecord.businessCode &&
    localdataRecord.businessCode &&
    semasRecord.businessCode === localdataRecord.businessCode
  ) {
    score += 0.06;
  }

  if (
    semasRecord.businessCategorySmall &&
    localdataRecord.businessCategorySmall &&
    semasRecord.businessCategorySmall === localdataRecord.businessCategorySmall
  ) {
    score += 0.03;
  }

  if (
    semasRecord.dongCode &&
    localdataRecord.dongCode &&
    semasRecord.dongCode === localdataRecord.dongCode
  ) {
    score += 0.02;
  }

  return score;
}

function buildLocaldataKey(record: LOCALDATARecord): string | null {
  if (record.sourceId) {
    return record.sourceId;
  }

  if (record.addressRoad || record.storeName) {
    return `${record.addressRoad ?? ""}::${record.storeName}`;
  }

  return null;
}

function normalizeComparisonText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstNonEmpty<T extends string | null | undefined>(
  ...values: T[]
): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    if (value === null) {
      continue;
    }
  }

  return null;
}

function getLatestTimestamp(
  ...values: Array<string | undefined | null>
): string {
  const timestamps = values
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function toGeographyPoint(location: LatLng): string {
  return `SRID=4326;POINT(${location.lng} ${location.lat})`;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
