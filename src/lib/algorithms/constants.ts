import type { BusinessNature, DistrictType } from "@/types";

export const CAPTURE_RATE = {
  cafe: 0.15,
  restaurant: 0.25,
  beauty: 0.08,
  bakery: 0.18,
  convenience_store: 0.21,
  retail: 0.1,
  pharmacy: 0.12,
  fitness: 0.07,
  academy: 0.06,
  hospital: 0.05,
} as const;

export const AVG_SPENDING = {
  cafe: 6500,
  restaurant: 9800,
  beauty: 25000,
  bakery: 7200,
  convenience_store: 5200,
  retail: 31000,
  pharmacy: 18500,
  fitness: 89000,
  academy: 210000,
  hospital: 34000,
} as const;

export const AVG_MONTHLY_VISITS = {
  cafe: 4.2,
  restaurant: 2.6,
  beauty: 0.8,
  bakery: 3.1,
  convenience_store: 9.5,
  retail: 1.7,
  pharmacy: 1.2,
  fitness: 5.5,
  academy: 1,
  hospital: 0.6,
} as const;

export type SupportedBusinessCategory = keyof typeof CAPTURE_RATE;

export const FRANCHISE_BRANDS = [
  "스타벅스",
  "이디야",
  "투썸",
  "파리바게뜨",
  "메가커피",
  "빽다방",
  "컴포즈커피",
  "배스킨라빈스",
  "올리브영",
  "다이소",
] as const;

export const DISTANCE_DECAY_MATRIX: Record<
  DistrictType,
  Record<BusinessNature, number>
> = {
  urban: {
    convenience: 1.95,
    shopping: 1.72,
    specialty: 1.56,
  },
  commercial: {
    convenience: 0.98,
    shopping: 0.82,
    specialty: 0.68,
  },
  residential: {
    convenience: 0.38,
    shopping: 0.26,
    specialty: 0.18,
  },
};

export const WALKING_DISTANCE_MULTIPLIER: Record<DistrictType, number> = {
  urban: 1.5,
  commercial: 1.4,
  residential: 1.3,
};

export const MARKET_SHARE_CUTOFF_METERS = 1500;
export const MARKET_SHARE_EPSILON_METERS = 35;

export const DEMAND_HEALTH_MULTIPLIER_RANGE = {
  min: 0.75,
  max: 1.25,
} as const;

export const TEMPERATURE_COMPONENT_WEIGHTS = {
  storeDynamics: 0.4,
  demandStability: 0.3,
  districtVitality: 0.3,
} as const;

export const RISK_COMPONENT_WEIGHTS = {
  salesTrendProxy: 0.24,
  competitionSurge: 0.2,
  footTrafficDecline: 0.18,
  rentPressure: 0.16,
  extinctionAcceleration: 0.22,
} as const;

export const NORMALIZATION_RANGES = {
  storeGrowthRate: { min: -0.3, max: 0.3 },
  closureOpenRatio: { min: 0.5, max: 2 },
  diversityEntropy: { min: 0, max: 1.8 },
  populationTrend: { min: -0.12, max: 0.12 },
  singleHouseholdRatio: { min: 0.15, max: 0.65 },
  apartmentPriceTrend: { min: -0.08, max: 0.18 },
  averageTenureMonths: { min: 6, max: 72 },
  franchisePenetration: { min: 0, max: 0.3 },
  openingAcceleration: { min: -0.5, max: 0.5 },
  salesTrendProxy: { min: -0.4, max: 0.4 },
  competitionSurge: { min: 0, max: 0.45 },
  footTrafficDecline: { min: -0.1, max: 0.12 },
  rentPressure: { min: -0.05, max: 0.2 },
  extinctionAcceleration: { min: -0.3, max: 0.3 },
  extinctionRate: { min: 0, max: 0.5 },
} as const;

export const BASE_RENT_PER_SQM = 55000;
export const TARGET_MARGIN_RATIO = 0.18;

const CATEGORY_KEYWORDS: Array<[string, SupportedBusinessCategory]> = [
  ["cafe", "cafe"],
  ["coffee", "cafe"],
  ["카페", "cafe"],
  ["커피", "cafe"],
  ["restaurant", "restaurant"],
  ["dining", "restaurant"],
  ["식당", "restaurant"],
  ["음식", "restaurant"],
  ["restaurant", "restaurant"],
  ["beauty", "beauty"],
  ["hair", "beauty"],
  ["뷰티", "beauty"],
  ["미용", "beauty"],
  ["bakery", "bakery"],
  ["dessert", "bakery"],
  ["베이커리", "bakery"],
  ["빵", "bakery"],
  ["convenience", "convenience_store"],
  ["편의점", "convenience_store"],
  ["마트", "convenience_store"],
  ["retail", "retail"],
  ["shopping", "retail"],
  ["소매", "retail"],
  ["쇼핑", "retail"],
  ["pharmacy", "pharmacy"],
  ["약국", "pharmacy"],
  ["의약", "pharmacy"],
  ["제과", "bakery"],
  ["디저트", "bakery"],
  ["휴게음식", "bakery"],
  ["한식", "restaurant"],
  ["중식", "restaurant"],
  ["일식", "restaurant"],
  ["양식", "restaurant"],
  ["분식", "restaurant"],
  ["치킨", "restaurant"],
  ["피자", "restaurant"],
  ["패스트푸드", "restaurant"],
  ["간이", "restaurant"],
  ["이용", "beauty"],
  ["네일", "beauty"],
  ["피부", "beauty"],
  ["세탁", "retail"],
  ["안경", "pharmacy"],
  ["의원", "hospital"],
  ["병원", "hospital"],
  ["치과", "hospital"],
  ["한의원", "hospital"],
  ["노래", "retail"],
  ["pc방", "retail"],
  ["인터넷", "retail"],
  ["게임", "retail"],
  ["당구", "retail"],
  ["체육", "fitness"],
  ["태권도", "fitness"],
  ["요가", "fitness"],
  ["필라테스", "fitness"],
  ["수영", "fitness"],
  ["골프", "fitness"],
  ["목욕", "retail"],
  ["사우나", "retail"],
  ["숙박", "retail"],
  ["모텔", "retail"],
  ["호텔", "retail"],
  ["동물", "retail"],
  ["애견", "retail"],
  ["반려", "retail"],
  ["fitness", "fitness"],
  ["gym", "fitness"],
  ["헬스", "fitness"],
  ["피트니스", "fitness"],
  ["academy", "academy"],
  ["education", "academy"],
  ["학원", "academy"],
  ["hospital", "hospital"],
  ["clinic", "hospital"],
  ["병원", "hospital"],
  ["의원", "hospital"],
];

export function normalizeBusinessCategoryKey(
  businessCategory: string,
): SupportedBusinessCategory {
  const normalized = businessCategory
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s/-]+/g, "_")
    .trim();

  if (isSupportedBusinessCategory(normalized)) {
    return normalized;
  }

  for (const [keyword, categoryKey] of CATEGORY_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return categoryKey;
    }
  }

  return "retail";
}

export function inferBusinessNatureFromCategory(
  businessCategory: string,
): BusinessNature {
  const categoryKey = normalizeBusinessCategoryKey(businessCategory);

  switch (categoryKey) {
    case "cafe":
    case "bakery":
    case "convenience_store":
    case "pharmacy":
      return "convenience";
    case "retail":
    case "academy":
      return "shopping";
    default:
      return "specialty";
  }
}

function isSupportedBusinessCategory(
  value: string,
): value is SupportedBusinessCategory {
  return Object.prototype.hasOwnProperty.call(CAPTURE_RATE, value);
}
