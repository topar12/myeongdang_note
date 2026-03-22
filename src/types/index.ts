// ========================================
// 명당노트 공유 타입 정의
// Claude(팀장)가 관리, Gemini/Codex import 전용
// ========================================

// ── 공간 좌표 ──

export interface LatLng {
  lat: number;
  lng: number;
}

// ── 점포 (Store) ──

export type StoreStatus = "영업/정상" | "휴업" | "폐업" | "취소";

export interface StoreEntity {
  id: string;
  storeName: string;
  businessCategoryLarge: string;
  businessCategoryMedium: string;
  businessCategorySmall: string;
  businessCode: string;
  location: LatLng;
  addressJibun: string | null;
  addressRoad: string | null;
  dongCode: string;
  floorArea: number; // ㎡
  openedAt: string | null; // ISO date
  closedAt: string | null;
  status: StoreStatus;
  isFranchise: boolean;
  franchiseBrand: string | null;
  semasId: string | null;
  localdataId: string | null;
  matchConfidence: number; // 0~1
  dataUpdatedAt: string;
}

// ── 행정동 통계 ──

export interface DistrictStats {
  dongCode: string;
  dongName: string;
  population: number;
  households: number;
  singleHouseholds: number;
  updatedAt: string;
}

// ── 소비자 블록 (허프 모델용) ──

export interface ConsumerBlock {
  blockId: string;
  centroid: LatLng;
  population: number;
  dongCode: string;
}

// ── 상권 온도 스코어 ──

export type ScoreTrend = "up" | "stable" | "down";
export type RiskLevel = "safe" | "caution" | "danger";

export interface TemperatureScore {
  score: number; // 0~100
  trend: ScoreTrend;
  percentile: number; // 상위 N%
  factors: {
    storeDynamics: number; // 0~100
    demandStability: number;
    districtVitality: number;
  };
  insightText: string; // AI 서술형 해석
}

// ── 피크타임 ──

export interface PeakTime {
  dayType: "weekday" | "weekend";
  timeSlot: string; // "12:00~13:00"
  relativeScore: number; // 0~100
}

// ── 경쟁 포화도 ──

export interface CompetitionDensity {
  sameCategory: number; // 동종업종 점포 수
  substituteCategory: number; // 대체재 업종 수
  densityPercentile: number; // 상위 N%
  insightText: string;
}

export interface SurvivalStats {
  rate3y: number; // 0~1
  avgMonths: number;
  totalSame: number;
}

// ── 매출 추정 ──

export interface RevenueEstimate {
  min: number; // P25
  median: number; // P50
  max: number; // P75
  confidence: 1 | 2 | 3 | 4 | 5; // 별 1~5
  percentile: number;
  insightText: string;
}

// ── BEP 시뮬레이션 ──

export interface BEPSimulation {
  monthlyRent: number;
  bepRevenue: number; // 손익분기 매출
  bepCustomers: number; // 손익분기 고객 수
  rentToSalesRatio: number; // 임대료/매출 비율
  riskLevel: RiskLevel;
  insightText: string;
}

// ── 폐업 리스크 ──

export interface ClosureRisk {
  score: number; // 0~100
  level: RiskLevel;
  topFactors: Array<{
    factor: string;
    contribution: number; // 0~1
  }>;
  extinctionRate: number; // 소멸률
  insightText: string;
}

export interface CompetitorListItem {
  name: string;
  area: number | null;
  openedAt: string | null;
  isFranchise: boolean;
  franchiseBrand: string | null;
  distance: number;
}

export interface OpenCloseTimelineItem {
  date: string;
  type: "open" | "close";
  storeName: string;
  monthsOperated?: number;
}

export interface AreaSurvival {
  userArea: number;
  survivalRate: number; // 0~1
  avgArea: number;
  largerSurvivalRate: number; // 0~1
}

export interface FranchiseAnalysis {
  count: number;
  ratio: number; // 0~1
  topBrands: string[];
}

// ── 리포트 ──

export interface ReportFreeData {
  temperature: TemperatureScore;
  peakTimes: PeakTime[];
  competition: CompetitionDensity;
  survivalStats: SurvivalStats;
}

export interface ReportPaidData {
  revenue: RevenueEstimate;
  bep: BEPSimulation | null; // 임대료 입력 시에만
  closureRisk: ClosureRisk;
  competitorList: CompetitorListItem[];
  openCloseTimeline: OpenCloseTimelineItem[];
  areaSurvival: AreaSurvival;
  franchiseAnalysis: FranchiseAnalysis;
}

export interface Report {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  address: string;
  businessCategory: string;
  freeData: ReportFreeData;
  paidData: ReportPaidData | null; // 결제 후에만
  isPaid: boolean;
  createdAt: string;
}

// ── 결제 ──

export type PaymentType = "single" | "subscription";
export type PaymentStatus = "pending" | "completed" | "refunded";

export interface Payment {
  id: string;
  userId: string;
  reportId: string | null;
  paymentType: PaymentType;
  amount: number;
  paymentKey: string;
  status: PaymentStatus;
  createdAt: string;
}

// ── 구독 ──

export type PlanType =
  | "local_pass"
  | "b2b_standard"
  | "b2b_pro";

export type SubscriptionStatus = "active" | "cancelled" | "expired";

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  targetDong: string | null; // 로컬 패스용 행정동
  amount: number;
  startedAt: string;
  expiresAt: string;
  status: SubscriptionStatus;
}

// ── API 요청/응답 ──

export interface GenerateReportRequest {
  lat: number;
  lng: number;
  address: string;
  businessCategory: string;
  businessSubCategory?: string;
}

export interface GenerateReportResponse {
  reportId: string;
  freeData: ReportFreeData;
  paidData: ReportPaidData;
  isPaid: boolean;
}

// ── 허프 모델 ──

export interface MarketShareResult {
  marketShare: number; // 0~1
  rank: number;
  totalCompetitors: number;
}

export type DistrictType = "urban" | "commercial" | "residential";
export type BusinessNature = "convenience" | "shopping" | "specialty";
