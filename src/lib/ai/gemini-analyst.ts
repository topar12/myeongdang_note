/**
 * Gemini AI 상권 분석 모듈
 * 142만건 실 데이터를 기반으로 전문 컨설턴트 수준의 분석 텍스트를 생성
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface StoreInfo {
  name: string;
  category: string;
  area: number | null;
  openedAt: string | null;
  isFranchise: boolean;
  distance?: number;
}

interface AnalysisInput {
  address: string;
  businessCategory: string;
  radius: number;
  // 경쟁 데이터
  totalStores: number;
  sameCategory: number;
  franchiseCount: number;
  franchiseRatio: number;
  // 생존 데이터
  recentOpenings: number; // 최근 1년 개업
  recentClosures: number; // 최근 1년 폐업
  avgBusinessMonths: number;
  survivalRate3y: number; // 3년 생존율
  // 매출 추정
  estimatedRevenue: { min: number; median: number; max: number };
  // 경쟁 매장 리스트
  competitors: StoreInfo[];
  // 배후 수요
  population?: number;
  // 사용자 입력 (선택)
  userArea?: number; // 예정 면적
  userRent?: number; // 예정 월세
}

const SYSTEM_PROMPT = `상권 분석 전문 컨설턴트로서 분석 의견서를 작성합니다.

절대 규칙:
- 인사말, 자기소개, "안녕하세요" 등 일절 금지. 첫 줄부터 바로 분석 시작
- "~입니다/~하세요" 체 사용
- 데이터에 기반한 구체적 숫자를 반드시 인용
- 이모지를 섹션 제목에 사용하여 가독성 확보

반드시 아래 구조를 따를 것:

📍 상권 종합 판정: [GO / 주의 / STOP] 중 하나 (한 줄)

🔍 핵심 분석 (3~4문단)
- 이 상권의 강점과 약점을 데이터 숫자를 인용하며 구체적으로 분석
- 경쟁 구조 (프랜차이즈 비율, 개인 매장 생존 난이도)
- 생존율과 개폐업 추세가 의미하는 바
- 매출 추정치의 현실적 해석

⚠️ 가장 주의해야 할 리스크 (1문단)
- 이 상권에서 실패하는 가장 흔한 패턴

✅ 추천 행동 5가지
1. (구체적 행동)
2. (구체적 행동)
3. (구체적 행동)
4. (구체적 행동)
5. (구체적 행동)

💡 한 줄 결론 (이 상권을 한마디로)

전체 길이: 800~1200자. 빠짐없이 모든 섹션을 채울 것.`;

export async function generateAIAnalysis(input: AnalysisInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackAnalysis(input);
  }

  const userPrompt = buildPrompt(input);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.9,
        },
      }),
    });

    const data = await response.json();
    // Gemini 2.5 Flash "thinking" 모드: 실제 텍스트가 마지막 part에 있을 수 있음
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts = parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text);
    // 마지막 텍스트 part가 본문 (thinking은 앞쪽 part)
    const text = textParts.length > 0 ? textParts[textParts.length - 1] : null;

    if (text) return text;
    return generateFallbackAnalysis(input);
  } catch (error) {
    console.error("Gemini API error:", error);
    return generateFallbackAnalysis(input);
  }
}

function buildPrompt(input: AnalysisInput): string {
  const competitorSummary = input.competitors
    .slice(0, 8)
    .map((c, i) => `${i + 1}. ${c.name} (${c.area ? c.area + "㎡" : "면적미상"}, ${c.openedAt ? "개업:" + c.openedAt.substring(0, 7) : "업력미상"}, ${c.isFranchise ? "프랜차이즈" : "개인"}${c.distance ? ", " + c.distance + "m" : ""})`)
    .join("\n");

  return `다음 상권 데이터를 분석하여 전문적인 상권 분석 의견서를 작성해주세요.

📍 분석 위치: ${input.address}
🏪 분석 업종: ${input.businessCategory}
📐 분석 반경: ${input.radius}m

━━━ 경쟁 현황 ━━━
• 반경 내 전체 상가: ${input.totalStores}개
• 동종업종 점포: ${input.sameCategory}개
• 프랜차이즈: ${input.franchiseCount}개 (${input.franchiseRatio}%)

━━━ 생존 분석 (실제 데이터) ━━━
• 최근 1년 신규 개업: ${input.recentOpenings}개
• 최근 1년 폐업: ${input.recentClosures}개
• 순증감: ${input.recentOpenings - input.recentClosures > 0 ? "+" : ""}${input.recentOpenings - input.recentClosures}개
• 동종업종 3년 생존율: ${input.survivalRate3y}%
• 평균 영업 기간: ${Math.floor(input.avgBusinessMonths / 12)}년 ${input.avgBusinessMonths % 12}개월

━━━ 매출 추정 (공공데이터 기반, 참고용) ━━━
• 보수적: ${(input.estimatedRevenue.min / 10000).toFixed(0)}만원
• 기준: ${(input.estimatedRevenue.median / 10000).toFixed(0)}만원
• 낙관적: ${(input.estimatedRevenue.max / 10000).toFixed(0)}만원

━━━ 배후 수요 ━━━
• 행정동 인구: ${input.population?.toLocaleString() || "미확인"}명

━━━ 주요 경쟁 매장 ━━━
${competitorSummary || "(경쟁 매장 데이터 없음)"}

${input.userArea ? `━━━ 사용자 계획 ━━━\n• 예정 면적: ${input.userArea}㎡\n• 예정 월세: ${input.userRent ? input.userRent + "만원" : "미입력"}` : ""}

위 데이터를 종합하여:
1. 이 상권의 핵심 강점과 약점 (각 1~2가지)
2. 가장 주의해야 할 리스크 1가지
3. 추천 행동 3가지
를 포함한 전문 분석 의견서를 작성해주세요.`;
}

// API 실패 시 템플릿 기반 폴백
function generateFallbackAnalysis(input: AnalysisInput): string {
  const netChange = input.recentOpenings - input.recentClosures;
  const trend = netChange > 0 ? "성장" : netChange < 0 ? "수축" : "정체";
  const riskLevel = input.survivalRate3y < 35 ? "높음" : input.survivalRate3y < 50 ? "보통" : "낮음";

  return `📊 ${input.address} ${input.businessCategory} 상권 분석

이 상권은 현재 ${trend} 추세입니다. 반경 ${input.radius}m 내 동종업종 ${input.sameCategory}개가 영업 중이며, 프랜차이즈 비율이 ${input.franchiseRatio}%입니다.

⚠️ 3년 생존율 ${input.survivalRate3y}%로 리스크가 ${riskLevel} 수준입니다. 최근 1년간 ${input.recentOpenings}개 개업, ${input.recentClosures}개 폐업으로 순 ${netChange > 0 ? "+" : ""}${netChange}개 변동이 있었습니다.

💡 추천 행동:
1. 계약 전 주변 ${input.sameCategory}개 경쟁 매장을 직접 방문하여 영업 상황 확인
2. ${input.franchiseRatio > 50 ? "프랜차이즈 밀집 지역이므로 독자적 콘셉트로 차별화 필요" : "개인 매장 비율이 높아 브랜드 경쟁력 확보 시 유리"}
3. 평균 영업 기간 ${Math.floor(input.avgBusinessMonths / 12)}년 ${input.avgBusinessMonths % 12}개월을 고려해 최소 ${Math.ceil(input.avgBusinessMonths / 12) + 1}년 치 운영 자금 확보 권장`;
}

export type { AnalysisInput, StoreInfo };
