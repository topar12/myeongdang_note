import proj4 from "proj4";

import type {
  CdcHandlers,
  CollectorResult,
  JsonRecord,
  LOCALDATACollectionOptions,
  LOCALDATARecord,
  LatLng,
  LocaldataChangeSet,
  QueryParams,
  SourceChangeType,
  StoreStatus,
} from "./types";

const DEFAULT_LOCALDATA_BASE_URL =
  process.env.LOCALDATA_API_BASE_URL ?? "https://www.localdata.go.kr/platform/rest";
const DEFAULT_LOCALDATA_ENDPOINT_PATH =
  process.env.LOCALDATA_API_ENDPOINT_PATH ?? "TO0/openDataApi";
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const MAX_REASONABLE_FLOOR_AREA = 100000;

proj4.defs(
  "EPSG:5174",
  "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43",
);

export function transformTmToWgs84(x: number, y: number): LatLng | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const [lng, lat] = proj4("EPSG:5174", "EPSG:4326", [x, y]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export function normalizeLocaldataRecord(
  raw: JsonRecord,
  collectedAt: string = new Date().toISOString(),
): LOCALDATARecord {
  const x = pickNumber(raw, ["좌표정보x", "좌표X", "x", "X"]);
  const y = pickNumber(raw, ["좌표정보y", "좌표Y", "y", "Y"]);
  const location = x !== null && y !== null ? transformTmToWgs84(x, y) : null;

  return {
    sourceId: pickStringOrNull(raw, ["관리번호", "localdataId", "id", "개방서비스아이디"]),
    changeType: normalizeChangeType(
      pickStringOrNull(raw, ["rowStatus", "상태코드", "cdcType", "opType"]),
    ),
    storeName: pickString(raw, ["사업장명", "업소명", "storeName", "shopName"]),
    businessCategoryLarge: pickString(raw, ["업태구분명", "대분류명", "largeCategoryName"]),
    businessCategoryMedium: pickString(raw, ["업종명", "중분류명", "mediumCategoryName"]),
    businessCategorySmall: pickString(raw, ["상세영업상태명", "소분류명", "smallCategoryName"]),
    businessCode: pickString(raw, ["업태구분코드", "업종코드", "businessCode"]),
    location,
    sourceCoordinates:
      x !== null && y !== null
        ? {
            x,
            y,
          }
        : null,
    addressJibun: pickStringOrNull(raw, ["소재지지번주소", "지번주소", "addressJibun"]),
    addressRoad: pickStringOrNull(raw, ["소재지도로명주소", "도로명주소", "addressRoad"]),
    dongCode: pickString(raw, ["행정동코드", "법정동코드", "dongCode"]),
    floorArea: normalizeFloorArea(raw),
    openedAt: normalizeDateOnly(
      pickStringOrNull(raw, ["인허가일자", "개업일자", "openedAt", "permitDate"]),
    ),
    closedAt: normalizeDateOnly(
      pickStringOrNull(raw, ["폐업일자", "closedAt", "closureDate"]),
    ),
    status: normalizeStoreStatus(
      pickStringOrNull(raw, ["영업상태명", "상태", "status", "dcbYmd"]),
    ),
    permitDate: normalizeDateOnly(
      pickStringOrNull(raw, ["인허가일자", "permitDate", "openedAt"]),
    ),
    dataUpdatedAt:
      normalizeIsoTimestamp(
        pickStringOrNull(raw, ["데이터갱신일자", "lastUpdateAt", "dataUpdatedAt"]),
      ) ?? collectedAt,
    raw,
  };
}

export async function collectDailyLocaldataChanges(
  options: LOCALDATACollectionOptions,
): Promise<CollectorResult<LOCALDATARecord>> {
  const serviceKey = options.serviceKey ?? process.env.LOCALDATA_API_KEY;

  if (!serviceKey) {
    throw new Error(
      "LOCALDATA API key is required. Set LOCALDATA_API_KEY or pass serviceKey.",
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = stripTrailingSlash(options.baseUrl ?? DEFAULT_LOCALDATA_BASE_URL);
  const endpointPath = stripLeadingSlash(
    options.endpointPath ?? DEFAULT_LOCALDATA_ENDPOINT_PATH,
  );
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const targetDate = normalizeDateParam(options.date);

  const records: LOCALDATARecord[] = [];
  let page = 1;
  let totalCount: number | null = null;
  let pagesFetched = 0;

  while (page <= maxPages) {
    const url = buildRequestUrl(`${baseUrl}/${endpointPath}`, {
      serviceKey,
      resultType: "json",
      pageIndex: page,
      pageSize,
      date: targetDate,
      ...options.extraParams,
    });

    const payload = await fetchJsonWithRetry<JsonRecord>(url, fetchImpl, {
      maxRetries,
      retryDelayMs,
    });
    pagesFetched += 1;
    const items = extractItems(payload);

    if (totalCount === null) {
      totalCount = extractTotalCount(payload);
    }

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      records.push(normalizeLocaldataRecord(item));
    }

    if (items.length < pageSize) {
      break;
    }

    page += 1;
  }

  return {
    records: imputeMissingFloorAreas(records),
    totalCount,
    pagesFetched,
  };
}

export function createLocaldataChangeSet(
  records: LOCALDATARecord[],
): LocaldataChangeSet {
  return records.reduce<LocaldataChangeSet>(
    (accumulator, record) => {
      if (record.changeType === "I") {
        accumulator.inserted.push(record);
      } else if (record.changeType === "U") {
        accumulator.updated.push(record);
      } else {
        accumulator.deleted.push(record);
      }

      return accumulator;
    },
    {
      inserted: [],
      updated: [],
      deleted: [],
    },
  );
}

export async function processLocaldataCdc<TResult = void>(
  records: LOCALDATARecord[],
  handlers: CdcHandlers<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = [];

  for (const record of records) {
    if (record.changeType === "I" && handlers.onInsert) {
      results.push(await handlers.onInsert(record));
      continue;
    }

    if (record.changeType === "U" && handlers.onUpdate) {
      results.push(await handlers.onUpdate(record));
      continue;
    }

    if (record.changeType === "D" && handlers.onDelete) {
      results.push(await handlers.onDelete(record));
    }
  }

  return results;
}

export function imputeMissingFloorAreas(
  records: LOCALDATARecord[],
): LOCALDATARecord[] {
  const groupedAreas = new Map<string, number[]>();

  for (const record of records) {
    if (record.floorArea === null) {
      continue;
    }

    const key = buildMedianGroupKey(record);
    const current = groupedAreas.get(key) ?? [];

    current.push(record.floorArea);
    groupedAreas.set(key, current);
  }

  return records.map((record) => {
    if (record.floorArea !== null) {
      return record;
    }

    const key = buildMedianGroupKey(record);
    const median = calculateMedian(groupedAreas.get(key) ?? []);

    if (median === null) {
      return record;
    }

    return {
      ...record,
      floorArea: median,
    };
  });
}

function buildMedianGroupKey(record: LOCALDATARecord): string {
  const businessKey =
    record.businessCode ||
    record.businessCategorySmall ||
    record.businessCategoryMedium ||
    "unknown-business";
  const dongKey = record.dongCode || "unknown-dong";

  return `${businessKey}::${dongKey}`;
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex] ?? null;
  }

  const leftValue = sortedValues[middleIndex - 1];
  const rightValue = sortedValues[middleIndex];

  if (leftValue === undefined || rightValue === undefined) {
    return null;
  }

  return Number(((leftValue + rightValue) / 2).toFixed(2));
}

function normalizeFloorArea(raw: JsonRecord): number | null {
  const floorArea = pickNumber(raw, [
    "소재지면적",
    "연면적",
    "floorArea",
    "siteArea",
  ]);

  if (floorArea === null) {
    return null;
  }

  if (floorArea <= 0 || floorArea > MAX_REASONABLE_FLOOR_AREA) {
    return null;
  }

  return floorArea;
}

function normalizeChangeType(value: string | null): SourceChangeType {
  if (value === "I" || value === "U" || value === "D") {
    return value;
  }

  return "U";
}

function normalizeStoreStatus(value: string | null): StoreStatus {
  const normalized = (value ?? "").trim();

  if (normalized.includes("폐업")) {
    return "폐업";
  }

  if (normalized.includes("휴업")) {
    return "휴업";
  }

  if (normalized.includes("취소")) {
    return "취소";
  }

  return "영업/정상";
}

function normalizeDateParam(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();

  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  return trimmed;
}

function normalizeDateOnly(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function normalizeIsoTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  }

  return null;
}

function buildRequestUrl(baseUrl: string, params: QueryParams): URL {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

async function fetchJsonWithRetry<T>(
  url: URL,
  fetchImpl: typeof fetch,
  options: { maxRetries: number; retryDelayMs: number },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `LOCALDATA request failed (${response.status} ${response.statusText}).`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (attempt === options.maxRetries) {
        break;
      }

      await sleep(options.retryDelayMs * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LOCALDATA request failed after retry attempts.");
}

function extractItems(payload: unknown): JsonRecord[] {
  const candidates = [
    payload,
    getNestedValue(payload, ["body", "items"]),
    getNestedValue(payload, ["body", "items", "item"]),
    getNestedValue(payload, ["response", "body", "items"]),
    getNestedValue(payload, ["response", "body", "items", "item"]),
    getNestedValue(payload, ["items"]),
    getNestedValue(payload, ["items", "item"]),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isJsonRecord);
    }

    if (isJsonRecord(candidate) && Array.isArray(candidate.item)) {
      return candidate.item.filter(isJsonRecord);
    }
  }

  return [];
}

function extractTotalCount(payload: unknown): number | null {
  const candidates = [
    getNestedValue(payload, ["body", "totalCount"]),
    getNestedValue(payload, ["response", "body", "totalCount"]),
    getNestedValue(payload, ["totalCount"]),
  ];

  for (const candidate of candidates) {
    const numberValue = toNumber(candidate);

    if (numberValue !== null) {
      return numberValue;
    }
  }

  return null;
}

function getNestedValue(value: unknown, path: string[]): unknown {
  let current: unknown = value;

  for (const segment of path) {
    if (!isJsonRecord(current)) {
      return null;
    }

    current = current[segment];
  }

  return current;
}

function pickString(record: JsonRecord, keys: string[]): string {
  return pickStringOrNull(record, keys) ?? "";
}

function pickStringOrNull(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function pickNumber(record: JsonRecord, keys: string[]): number | null {
  for (const key of keys) {
    const numberValue = toNumber(record[key]);

    if (numberValue !== null) {
      return numberValue;
    }
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/,/g, "").trim();

    if (sanitized.length === 0) {
      return null;
    }

    const parsed = Number(sanitized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function stripLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
