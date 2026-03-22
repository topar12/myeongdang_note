import type { LatLng, StoreEntity, StoreStatus } from "@/types";

export type { LatLng, StoreEntity, StoreStatus };

export type JsonRecord = Record<string, unknown>;
export type CollectorFetch = typeof fetch;
export type SourceChangeType = "I" | "U" | "D";
export type MatchStrategy =
  | "road_address_exact"
  | "name_similarity"
  | "spatial_proximity"
  | "semas_only"
  | "localdata_only";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export interface QueryParams {
  [key: string]: QueryValue;
}

export interface CollectorResult<T> {
  records: T[];
  totalCount: number | null;
  pagesFetched: number;
}

export interface QuarterIdentifier {
  year: number;
  quarter: 1 | 2 | 3 | 4;
}

export interface QuarterlyDateRange extends QuarterIdentifier {
  startDate: string;
  endDate: string;
}

export interface SourceCoordinates {
  x: number;
  y: number;
}

export interface SEMASRecord {
  sourceId: string | null;
  storeName: string;
  businessCategoryLarge: string;
  businessCategoryMedium: string;
  businessCategorySmall: string;
  businessCode: string;
  location: LatLng | null;
  addressJibun: string | null;
  addressRoad: string | null;
  dongCode: string;
  isFranchise: boolean;
  franchiseBrand: string | null;
  dataUpdatedAt: string;
  raw: JsonRecord;
}

export interface LOCALDATARecord {
  sourceId: string | null;
  changeType: SourceChangeType;
  storeName: string;
  businessCategoryLarge: string;
  businessCategoryMedium: string;
  businessCategorySmall: string;
  businessCode: string;
  location: LatLng | null;
  sourceCoordinates: SourceCoordinates | null;
  addressJibun: string | null;
  addressRoad: string | null;
  dongCode: string;
  floorArea: number | null;
  openedAt: string | null;
  closedAt: string | null;
  status: StoreStatus;
  permitDate: string | null;
  dataUpdatedAt: string;
  raw: JsonRecord;
}

export interface MatchResult {
  semasRecord: SEMASRecord | null;
  localdataRecord: LOCALDATARecord | null;
  matched: boolean;
  strategy: MatchStrategy;
  confidence: number;
  distanceMeters: number | null;
  nameSimilarity: number | null;
  storeEntity: StoreEntity;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface BaseCollectorOptions extends RetryOptions {
  serviceKey?: string;
  baseUrl?: string;
  endpointPath?: string;
  pageSize?: number;
  maxPages?: number;
  extraParams?: QueryParams;
  fetchImpl?: CollectorFetch;
}

export interface SEMASCollectionOptions
  extends BaseCollectorOptions,
    QuarterIdentifier {}

export interface LOCALDATACollectionOptions extends BaseCollectorOptions {
  date: string | Date;
}

export interface LocaldataChangeSet {
  inserted: LOCALDATARecord[];
  updated: LOCALDATARecord[];
  deleted: LOCALDATARecord[];
}

export interface CdcHandlers<TResult = void> {
  onInsert?: (record: LOCALDATARecord) => Promise<TResult> | TResult;
  onUpdate?: (record: LOCALDATARecord) => Promise<TResult> | TResult;
  onDelete?: (record: LOCALDATARecord) => Promise<TResult> | TResult;
}

export interface EntityResolverOptions {
  nameSimilarityThreshold?: number;
  maxSpatialDistanceMeters?: number;
}
