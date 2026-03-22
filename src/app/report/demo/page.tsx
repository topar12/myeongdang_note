'use client';

import { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { Download, Share2, Copy, AlertTriangle, TrendingDown, Store, Coffee, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ReactMarkdown from 'react-markdown';

// ===== MOCK 데이터 (풀버전 데모) =====

const DEMO = {
  address: '대전 서구 둔산동 1234',
  category: '카페',
  temperature: { score: 58, trend: 'up' as const, percentile: 42 },
  temperatureInsight: '이 골목은 최근 6개월간 디저트 카페 중심으로 신규 입점이 늘어나며 서서히 활기를 되찾고 있습니다. 다만 기존 일반 카페의 폐업도 동시에 발생하고 있어, 업종 교체기에 해당합니다.',
  peakTimes: [
    { dayType: 'weekday', timeSlot: '12:00~13:00', relativeScore: 92 },
    { dayType: 'weekday', timeSlot: '18:00~20:00', relativeScore: 71 },
    { dayType: 'weekend', timeSlot: '15:00~17:00', relativeScore: 58 },
  ],
  competition: { sameCategory: 47, densityPercentile: 68 },
  competitionInsight: '반경 500m 내 카페 47개로 밀집도가 높은 편입니다. 프랜차이즈 비율은 6%로 낮아 개인 매장 간 경쟁이 주를 이루고 있습니다.',
  radar: [
    { subject: '점포 밀집', A: 82 }, { subject: '매출 규모', A: 55 },
    { subject: '유동인구', A: 78 }, { subject: '경쟁 강도', A: 71 }, { subject: '성장성', A: 48 },
  ],
  // Paid 데이터
  survivalStats: { rate3y: 38, sameCategory: 47, avgMonths: 28, recentOpenings: 3, recentClosures: 7 },
  competitors: [
    { name: '스타벅스 둔산점', area: 132, openedAt: '2021-03', isFranchise: true },
    { name: '이디야커피 둔산역점', area: 45, openedAt: '2019-07', isFranchise: true },
    { name: '빽다방 둔산로', area: 28, openedAt: '2024-02', isFranchise: true },
    { name: '카페이수페', area: 52, openedAt: '2023-01', isFranchise: false },
    { name: '포트캔커피', area: 38, openedAt: '2022-08', isFranchise: false },
    { name: '하삼동커피', area: 41, openedAt: '2023-06', isFranchise: false },
    { name: '연결의공간이음', area: 65, openedAt: '2020-11', isFranchise: false },
    { name: '모모스커피 둔산', area: 78, openedAt: '2022-03', isFranchise: false },
    { name: '디어커피', area: 33, openedAt: '2024-09', isFranchise: false },
    { name: '브런치카페 올리', area: 55, openedAt: '2023-11', isFranchise: false },
  ],
  revenue: { min: 252, median: 350, max: 473 },
  closureScore: 42,
  aiAnalysis: `📍 상권 종합 판정: **주의**

🔍 **핵심 분석**

대전 둔산동 카페 상권은 반경 500m 내 동종업종 **47개**가 밀집한 과열 구간입니다. 3년 생존율 **38%**는 전국 카페 평균(42%)보다 낮으며, 최근 1년간 개업 3건 대비 폐업 7건으로 **순감소 4건**이 발생해 상권이 수축 중입니다.

프랜차이즈 비율이 **6%**로 매우 낮아 대부분 개인 매장이 경쟁하는 구조입니다. 이는 진입 장벽이 낮다는 의미이지만, 동시에 브랜드 파워 없이 가격 경쟁에 내몰릴 위험이 큽니다. 평균 영업 기간 **2년 4개월**은 대부분의 매장이 초기 투자금을 회수하기 어려운 기간입니다.

공공데이터 기반 월매출 추정치는 기준 **350만원** 수준이나, 이는 참고용이며 실제 결제 데이터가 아닙니다. 경쟁 47개 매장이 동시에 파이를 나누는 구조에서 신규 진입자가 중위 매출을 달성하기는 쉽지 않습니다.

⚠️ **가장 주의해야 할 리스크**

이 상권의 핵심 위험은 **'저가 출혈 경쟁'**입니다. 프랜차이즈 없이 개인 매장끼리 경쟁하면 가격 인하 → 마진 축소 → 폐업의 악순환에 빠지기 쉽습니다. 최근 폐업한 7곳 중 대부분이 오픈 1년 내 문을 닫은 소형 매장이었습니다.

✅ **추천 행동 5가지**

1. **50㎡ 이상 매장 확보 권장** — 이 상권에서 30㎡ 이하 소형 카페의 생존율은 25%에 불과합니다. 공간 여유가 체류 시간과 객단가를 높입니다.
2. **디저트/브런치 특화 필수** — 일반 아메리카노 카페는 레드오션입니다. 시그니처 디저트나 브런치로 차별화해야 합니다.
3. **평일 점심 직장인 공략** — 피크타임 Top-1이 평일 12~13시(92%)입니다. 런치 세트 메뉴와 테이크아웃 동선을 최적화하세요.
4. **단기 임대 계약 우선** — 3년 이상 장기 계약은 위험합니다. 1~2년 단기 계약으로 시장 반응을 보세요.
5. **대안 입지 검토** — 둔산동 중심가보다 200m 떨어진 이면도로가 임대료 대비 생존율이 높습니다.

💡 **한 줄 결론**: 경쟁 과열 상권이지만, 50㎡ 이상 + 디저트 특화 전략이라면 기회는 있습니다. 단, 자금 여력 없는 소형 매장은 위험합니다.`,
};

const PEAK_EMOJI: Record<string, string> = { '12:00~13:00': '☀️', '18:00~20:00': '🌙', '15:00~17:00': '🎉' };

function AIInsight({ text }: { text: string }) {
  return (
    <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500 mt-3">
      <p className="text-[14px] leading-relaxed text-slate-700">💡 {text}</p>
    </div>
  );
}

function RiskBadge({ level }: { level: 'safe' | 'caution' | 'danger' }) {
  const styles = { safe: 'bg-emerald-50 text-emerald-600 border-emerald-200', caution: 'bg-amber-50 text-amber-600 border-amber-200', danger: 'bg-red-50 text-red-600 border-red-200' };
  const labels = { safe: '🟢 안전', caution: '🟡 주의', danger: '🔴 위험' };
  return <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border ${styles[level]}`}>{labels[level]}</span>;
}

export default function DemoReportPage() {
  const [rent, setRent] = useState([200]);
  const monthlyRent = rent[0];
  const dailyCoffee = Math.ceil(monthlyRent * 10000 / 4500);
  const rentRisk: 'safe' | 'caution' | 'danger' = monthlyRent > 300 ? 'danger' : monthlyRent > 180 ? 'caution' : 'safe';
  const closureLevel: 'safe' | 'caution' | 'danger' = DEMO.closureScore >= 60 ? 'danger' : DEMO.closureScore >= 30 ? 'caution' : 'safe';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* 데모 배너 */}
      <div className="bg-amber-500 text-white text-center py-2 text-sm font-bold">
        📋 데모 보고서 — 실제 분석은 무료로 시작할 수 있습니다
      </div>

      {/* Hero 헤더 */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-5 pt-6 pb-10 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute top-[-60px] right-[-60px] w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-200 text-xs font-semibold tracking-widest mb-2">명당노트 AI 상권 분석 리포트</p>
              <h1 className="text-[24px] font-extrabold leading-tight">{DEMO.address}</h1>
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-bold backdrop-blur">{DEMO.category}</span>
            </div>
            <div className="w-16 h-16 rounded-full border-[3px] border-white/40 flex flex-col items-center justify-center rotate-[-8deg] bg-white/10 backdrop-blur-md shadow-lg shrink-0">
              <span className="text-white font-black text-[11px] leading-none">AI</span>
              <span className="text-white/80 font-bold text-[9px] leading-none mt-0.5">인증분석</span>
            </div>
          </div>
          <p className="text-blue-200 text-xs mt-4">데모 리포트 · 2026년 3월 22일</p>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">
        {/* Free: 상권 온도 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-1">🌡 상권 온도 스코어</h3>
          <ScoreGauge score={DEMO.temperature.score} trend={DEMO.temperature.trend} label={`상위 ${DEMO.temperature.percentile}%`} />
          <AIInsight text={DEMO.temperatureInsight} />
        </div>

        {/* Free: 피크타임 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-4">⏰ 피크타임 Top-3</h3>
          <div className="space-y-3">
            {DEMO.peakTimes.map((pt, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl w-8">{PEAK_EMOJI[pt.timeSlot] || '📊'}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-700">{pt.dayType === 'weekday' ? '평일' : '주말'} {pt.timeSlot}</span>
                    <span className="text-sm font-extrabold text-blue-600">{pt.relativeScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full" style={{ width: `${pt.relativeScore}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Free: 경쟁 포화도 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-3">🏪 경쟁 포화도</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <div className="text-[36px] font-extrabold text-slate-800">{DEMO.competition.sameCategory}</div>
              <div className="text-xs text-slate-400">동종업종</div>
            </div>
            <div className="ml-auto"><RiskBadge level="caution" /></div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={DEMO.radar.map(d => ({ ...d, fullMark: 100 }))}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 12 }} />
                <Radar dataKey="A" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <AIInsight text={DEMO.competitionInsight} />
        </div>

        {/* ===== Paid 영역 (데모에서는 잠금 없이 풀 공개) ===== */}

        {/* P1: 생존 성적표 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">🏆 이 골목 생존 성적표</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
              <div className="text-[28px] font-extrabold text-amber-600">{DEMO.survivalStats.rate3y}%</div>
              <div className="text-[11px] font-bold text-amber-500">3년 생존율</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <div className="text-[28px] font-extrabold text-slate-700">{DEMO.survivalStats.sameCategory}</div>
              <div className="text-[11px] font-bold text-slate-400">동종업종</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <div className="text-[28px] font-extrabold text-blue-600">{Math.floor(DEMO.survivalStats.avgMonths / 12)}년 {DEMO.survivalStats.avgMonths % 12}월</div>
              <div className="text-[11px] font-bold text-blue-400">평균 영업기간</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 text-center border border-emerald-100">
              <span className="text-sm font-bold text-emerald-600">+{DEMO.survivalStats.recentOpenings}</span>
              <span className="text-xs text-emerald-400 ml-1">최근1년 개업</span>
            </div>
            <div className="flex-1 bg-red-50 rounded-lg px-3 py-2 text-center border border-red-100">
              <span className="text-sm font-bold text-red-600">-{DEMO.survivalStats.recentClosures}</span>
              <span className="text-xs text-red-400 ml-1">최근1년 폐업</span>
            </div>
          </div>
          <AIInsight text="3년 생존율 38%로 전국 평균(42%)보다 낮습니다. 최근 1년간 순감소 4건으로 상권이 수축 중입니다." />
        </div>

        {/* P2: 경쟁 전수 리스트 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">🏪 경쟁 매장 전수 조사</h3>
          <div className="space-y-2">
            {DEMO.competitors.map((c, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                <span className="text-xs font-extrabold text-slate-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.area}㎡ · {c.openedAt} 개업</div>
                </div>
                {c.isFranchise && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">FC</span>}
              </div>
            ))}
          </div>
          <AIInsight text="프랜차이즈 비율 6%. 개인 매장 간 경쟁이 주를 이루며, 콘셉트 경쟁력이 생존의 핵심입니다." />
        </div>

        {/* P3: 매출 추정 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-1 flex items-center gap-2">💰 AI 추정 월매출</h3>
          <p className="text-[11px] text-slate-400 mb-4">공공데이터 기반 추정치 · 참고용</p>
          <div className="flex items-end gap-2 mb-3">
            <div className="text-center flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[20px] font-bold text-slate-500">{DEMO.revenue.min}만</div>
              <div className="text-[10px] text-slate-400">보수적</div>
            </div>
            <div className="text-center flex-1 bg-blue-50 rounded-xl p-3 border border-blue-200">
              <div className="text-[28px] font-extrabold text-blue-600">{DEMO.revenue.median}만</div>
              <div className="text-[10px] font-bold text-blue-500">기준 추정</div>
            </div>
            <div className="text-center flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[20px] font-bold text-slate-500">{DEMO.revenue.max}만</div>
              <div className="text-[10px] text-slate-400">낙관적</div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-[12px] text-amber-700">⚠️ 허프 확률 모델 기반 추정치이며, 실제 카드 결제 데이터가 아닙니다.</p>
          </div>
        </div>

        {/* P4: BEP */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-4">🧮 임대료 감당력</h3>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-600">월세</span>
              <span className="text-lg font-extrabold text-slate-800">{monthlyRent}만원</span>
            </div>
            <Slider value={rent} onValueChange={setRent} min={50} max={500} step={10} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">손익분기점 일일 판매량</p>
            <div className="flex items-center justify-center gap-2">
              <Coffee className="w-5 h-5 text-amber-600" />
              <span className="text-[36px] font-extrabold text-slate-800">{dailyCoffee}</span>
              <span className="text-base text-slate-500">잔/일</span>
            </div>
            <div className="mt-2"><RiskBadge level={rentRisk} /></div>
          </div>
        </div>

        {/* P5: 폐업 리스크 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-4">⚠️ 폐업 리스크</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-[36px] font-extrabold text-amber-500">{DEMO.closureScore}</div>
              <div className="text-xs text-slate-400">/ 100</div>
            </div>
            <div className="flex-1">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="h-3" style={{ width: `${DEMO.closureScore}%`, background: 'linear-gradient(90deg, #16A34A 0%, #F59E0B 50%, #DC2626 100%)' }} />
              </div>
              <div className="mt-2"><RiskBadge level={closureLevel} /></div>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { icon: <TrendingDown className="w-4 h-4" />, text: '경쟁 급증', pct: 45 },
              { icon: <Store className="w-4 h-4" />, text: '임대료 상승', pct: 30 },
              { icon: <AlertTriangle className="w-4 h-4" />, text: '유동 감소', pct: 25 },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                <span className="text-slate-400">{f.icon}</span>
                <span className="text-sm text-slate-700 flex-1">{f.text}</span>
                <span className="text-sm font-bold text-slate-500">{f.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* P6: AI 종합 의견서 */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white overflow-visible">
          <h3 className="text-[17px] font-extrabold mb-4 flex items-center gap-2">🤖 AI 종합 분석 의견서</h3>
          <div className="bg-white/10 backdrop-blur rounded-xl p-5 overflow-visible">
            <ReactMarkdown
              components={{
                p: ({children}) => <p className="text-[14px] leading-[1.8] text-blue-100 mb-3 last:mb-0">{children}</p>,
                strong: ({children}) => <strong className="font-extrabold text-white">{children}</strong>,
                ol: ({children}) => <ol className="space-y-2 mb-3">{children}</ol>,
                ul: ({children}) => <ul className="space-y-1.5 mb-3">{children}</ul>,
                li: ({children}) => <li className="text-[14px] leading-[1.7] text-blue-100 flex gap-2"><span className="text-blue-300 shrink-0">•</span><span>{children}</span></li>,
              }}
            >
              {DEMO.aiAnalysis}
            </ReactMarkdown>
          </div>
          <p className="text-[10px] text-blue-300 mt-3 text-center">Powered by Gemini AI · 공공데이터 기반 참고용</p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-center text-white">
          <h3 className="text-lg font-extrabold mb-2">내 상권도 분석해보세요</h3>
          <p className="text-blue-200 text-sm mb-4">무료로 시작, 10초면 완성</p>
          <Button
            onClick={() => window.location.href = '/search'}
            className="w-full max-w-xs h-14 text-[16px] font-bold bg-white text-blue-700 hover:bg-blue-50 rounded-xl shadow-lg mx-auto"
          >
            무료로 상권 분석 시작하기
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3 pt-4 pb-8">
          <p className="text-[11px] text-slate-400 leading-relaxed px-4">
            ⚖️ 본 리포트는 공공데이터 기반 추정치이며, 실제와 다를 수 있습니다.
          </p>
          <div className="text-[11px] font-bold text-slate-300">Myeongdang Note AI Analytics®</div>
        </div>
      </div>
    </main>
  );
}
