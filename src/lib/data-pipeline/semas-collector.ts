import type {
  CollectorResult,
  JsonRecord,
  QueryParams,
  QuarterlyDateRange,
  SEMASCollectionOptions,
  SEMASRecord,
} from "./types";

const SEMAS_API_BASE_URL = "https://apis.data.go.kr/B553077/api/open/sdsc2";
const DEFAULT_SEMAS_ENDPOINT_PATH =
  process.env.SEMAS_API_ENDPOINT_PATH ?? "storeListInArea";
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

const FRANCHISE_PATTERNS: Array<{ brand: string; pattern: RegExp }> = [
  { brand: "스타벅스", pattern: /스타벅스|starbucks/i },
  { brand: "이디야", pattern: /이디야|ediya/i },
  {
    brand: "투썸플레이스",
    pattern: /투썸플레이스|투썸|a\s?twosome\s?place|twosome/i,
  },
  { brand: "파리바게뜨", pattern: /파리바게뜨|파리바게트|paris\s?baguette/i },
  { brand: "뚜레쥬르", pattern: /뚜레쥬르|tous\s?les\s?jours/i },
  { brand: "배스킨라빈스", pattern: /배스킨라빈스|baskin\s?robbins|br31/i },
  { brand: "던킨", pattern: /던킨|dunkin/i },
  { brand: "맥도날드", pattern: /맥도날드|mcdonald'?s/i },
  { brand: "버거킹", pattern: /버거킹|burger\s?king/i },
  { brand: "롯데리아", pattern: /롯데리아|lotteria/i },
  { brand: "KFC", pattern: /\bkfc\b/i },
  { brand: "BBQ", pattern: /\bbbq\b|비비큐/i },
  { brand: "교촌", pattern: /교촌|kyochon/i },
  { brand: "BHC", pattern: /\bbhc\b/i },
  { brand: "네네", pattern: /네네|nene/i },
  { brand: "굽네", pattern: /굽네|goobne/i },
  { brand: "올리브영", pattern: /올리브영|olive\s?young/i },
  { brand: "다이소", pattern: /다이소|daiso/i },
  { brand: "GS25", pattern: /\bgs\s?25\b/i },
  { brand: "CU", pattern: /(^|[^a-z])cu([^a-z]|$)|씨유/i },
  { brand: "세븐일레븐", pattern: /세븐일레븐|7\s?eleven|seven\s?eleven/i },
  { brand: "이마트24", pattern: /이마트\s?24|emart\s?24/i },
  { brand: "메가커피", pattern: /메가.?커피|mega\s?coffee/i },
  { brand: "컴포즈", pattern: /컴포즈|compose\s?coffee/i },
  { brand: "빽다방", pattern: /빽다방|paik'?s\s?coffee/i },
];

export function buildQuarterDateRange(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): QuarterlyDateRange {
  const quarterMonthMap = {
    1: ["01", "03", "31"],
    2: ["04", "06", "30"],
    3: ["07", "09", "30"],
    4: ["10", "12", "31"],
  } as const;

  const [startMonth, endMonth, fallbackEndDay] = quarterMonthMap[quarter];
  const endDay = new Date(Date.UTC(year, Number(endMonth), 0)).getUTCDate();

  return {
    year,
    quarter,
    startDate: `${year}${startMonth}01`,
    endDate: `${year}${endMonth}${String(endDay || Number(fallbackEndDay)).padStart(2, "0")}`,
  };
}

export function detectFranchiseBrand(
  storeName: string,
): { isFranchise: boolean; franchiseBrand: string | null } {
  const normalizedStoreName = normalizeText(storeName);

  for (const { brand, pattern } of FRANCHISE_PATTERNS) {
    if (pattern.test(normalizedStoreName)) {
      return {
        isFranchise: true,
        franchiseBrand: brand,
      };
    }
  }

  return {
    isFranchise: false,
    franchiseBrand: null,
  };
}

export function normalizeSemasRecord(
  raw: JsonRecord,
  collectedAt: string = new Date().toISOString(),
): SEMASRecord {
  const storeName = pickString(raw, [
    "bizesNm",
    "storeName",
    "shopName",
    "상호명",
    "업소명",
  ]);
  const longitude = pickNumber(raw, ["lon", "longitude", "경도", "x", "X"]);
  const latitude = pickNumber(raw, ["lat", "latitude", "위도", "y", "Y"]);
  const { isFranchise, franchiseBrand } = detectFranchiseBrand(storeName);

  return {
    sourceId: pickStringOrNull(raw, ["bizesId", "semasId", "id", "상가업소번호"]),
    storeName,
    businessCategoryLarge: pickString(raw, [
      "indsLclsNm",
      "largeCategoryName",
      "대분류명",
    ]),
    businessCategoryMedium: pickString(raw, [
      "indsMclsNm",
      "mediumCategoryName",
      "중분류명",
    ]),
    businessCategorySmall: pickString(raw, [
      "indsSclsNm",
      "smallCategoryName",
      "소분류명",
    ]),
    businessCode: pickString(raw, [
      "indsSclsCd",
      "indsMclsCd",
      "indsLclsCd",
      "businessCode",
      "업종코드",
    ]),
    location:
      latitude !== null && longitude !== null
        ? { lat: latitude, lng: longitude }
        : null,
    addressJibun: pickStringOrNull(raw, [
      "lnoAdr",
      "addressJibun",
      "지번주소",
    ]),
    addressRoad: pickStringOrNull(raw, [
      "rdnmAdr",
      "addressRoad",
      "도로명주소",
    ]),
    dongCode: pickString(raw, ["adongCd", "dongCode", "행정동코드", "법정동코드"]),
    isFranchise,
    franchiseBrand,
    dataUpdatedAt:
      normalizeIsoTimestamp(
        pickStringOrNull(raw, ["stdrDt", "lastUpdateAt", "dataUpdatedAt"]),
      ) ?? collectedAt,
    raw,
  };
}

export async function collectSemasQuarterlyData(
  options: SEMASCollectionOptions,
): Promise<CollectorResult<SEMASRecord>> {
  const serviceKey = options.serviceKey ?? process.env.SEMAS_API_KEY;

  if (!serviceKey) {
    throw new Error("SEMAS API key is required. Set SEMAS_API_KEY or pass serviceKey.");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = stripTrailingSlash(options.baseUrl ?? SEMAS_API_BASE_URL);
  const endpointPath = stripLeadingSlash(
    options.endpointPath ?? DEFAULT_SEMAS_ENDPOINT_PATH,
  );
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const quarterRange = buildQuarterDateRange(options.year, options.quarter);

  const records: SEMASRecord[] = [];
  let page = 1;
  let totalCount: number | null = null;
  let pagesFetched = 0;

  while (page <= maxPages) {
    const url = buildRequestUrl(`${baseUrl}/${endpointPath}`, {
      serviceKey,
      type: "json",
      pageNo: page,
      numOfRows: pageSize,
      bgnYmd: quarterRange.startDate,
      endYmd: quarterRange.endDate,
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
      records.push(normalizeSemasRecord(item));
    }

    if (items.length < pageSize) {
      break;
    }

    page += 1;
  }

  return {
    records,
    totalCount,
    pagesFetched,
  };
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
        throw new Error(`SEMAS request failed (${response.status} ${response.statusText}).`);
      }

      const text = await response.text();

      return JSON.parse(text) as T;
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
    : new Error("SEMAS request failed after retry attempts.");
}

function extractItems(payload: unknown): JsonRecord[] {
  const candidates = [
    payload,
    getNestedValue(payload, ["response", "body", "items", "item"]),
    getNestedValue(payload, ["response", "body", "items"]),
    getNestedValue(payload, ["body", "items", "item"]),
    getNestedValue(payload, ["body", "items"]),
    getNestedValue(payload, ["items", "item"]),
    getNestedValue(payload, ["items"]),
    getNestedValue(payload, ["item"]),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isJsonRecord);
    }

    if (isJsonRecord(candidate)) {
      const nestedArray = candidate.item;

      if (Array.isArray(nestedArray)) {
        return nestedArray.filter(isJsonRecord);
      }
    }
  }

  return [];
}

function extractTotalCount(payload: unknown): number | null {
  const candidates = [
    getNestedValue(payload, ["response", "body", "totalCount"]),
    getNestedValue(payload, ["body", "totalCount"]),
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
    const value = toNumber(record[key]);

    if (value !== null) {
      return value;
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

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));

    return new Date(Date.UTC(year, month, day)).toISOString();
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
