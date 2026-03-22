'use client';

import { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { 
  Store, Coffee, 
  MapPin, Sparkles, Target, ShieldAlert, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

// ===== MOCK 데이터 (풀버전 데모) =====
const DEMO = {
  address: '대전 서구 둔산동 1234',
  category: '프랜차이즈 카페',
  temperature: { score: 58, trend: 'up' as const, percentile: 42 },
  temperatureInsight: '이 골목은 최근 6개월간 디저트 특화 카페 중심으로 신규 입점이 늘어나며 서서히 활기를 되찾고 있습니다. 다만 기존 일반 카페의 폐업도 잦아 업종 타겟팅이 중요합니다.',
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
  survivalStats: { rate3y: 38, sameCategory: 47, avgMonths: 28, recentOpenings: 3, recentClosures: 7 },
  competitors: [
    { name: '스타벅스 둔산점', area: 132, openedAt: '2021-03', isFranchise: true },
    { name: '이디야커피 둔산역점', area: 45, openedAt: '2019-07', isFranchise: true },
    { name: '빽다방 둔산로', area: 28, openedAt: '2024-02', isFranchise: true },
    { name: '카페이수페', area: 52, openedAt: '2023-01', isFranchise: false },
    { name: '포트캔커피', area: 38, openedAt: '2022-08', isFranchise: false },
    { name: '하삼동커피', area: 41, openedAt: '2023-06', isFranchise: false },
    { name: '연결의공간이음', area: 65, openedAt: '2020-11', isFranchise: false },
  ],
  revenue: { min: 252, median: 350, max: 473 },
  closureScore: 42,
  aiAnalysis: `📍 **상권 종합 판정: 주의 (Caution)**

🔍 **핵심 브리핑**
대전 둔산동 카페 상권은 반경 500m 내 동종업종 **47개**가 밀집한 과열 구간입니다. 3년 생존율 **38%**는 전국 카페 평균(42%)보다 현저히 낮으며, 최근 1년간 개업보다 폐업이 4건 더 많아 상권 수축기에 진입했습니다.

프랜차이즈 비율이 **6%**로 매우 낮아 대부분 개인 매장이 혈투를 벌이는 구조입니다. 이는 진입 장벽이 낮음을 의미하지만 동시에 확실한 시그니처가 없다면 가격 경쟁에 내몰릴 위험이 극도로 큽니다.

⚠️ **가장 주의해야 할 리스크 트리거**
핵심 위험은 **'저가 점진적 출혈 경쟁'**입니다. 프랜차이즈 없이 개인 매장끼리 경쟁하면 (가격 인하 → 객단가 하락 → 마진 축소 → 폐업)의 공식 궤도를 따르게 됩니다. 실제로 폐업 매장 상당수가 1년 내 문을 닫은 극소형 테이크아웃 점포였습니다.

💡 **Myeongdang Analytics 추천 전략**
1. **면적 경쟁력 확보** — 소형 평수 생존율이 유독 최악입니다. 50㎡ 이상의 공간 여유를 확보해야 회전율 방어가 가능합니다.
2. **평일 점심 테이크아웃 타겟팅** — 피크타임 1위가 압도적으로 평일 12-13시입니다. 인근 직장인 그룹 테이크아웃 픽업 동선을 1순위로 세팅하세요.
3. **디저트(특화) 무기 장착** — 음료 베이스 경쟁은 이미 포화입니다. 객단가를 높여줄 브런치나 베이커리가 마진을 방어합니다.`,
};

const PEAK_EMOJI: Record<string, string> = { '12:00~13:00': '☀️', '18:00~20:00': '🌙', '15:00~17:00': '🎉' };

function RiskBadge({ level }: { level: 'safe' | 'caution' | 'danger' }) {
  const styles = { safe: 'bg-emerald-50 text-emerald-600 border-emerald-200', caution: 'bg-amber-50 text-amber-600 border-amber-200', danger: 'bg-rose-50 text-rose-600 border-rose-200' };
  const labels = { safe: '🟢 안전 지대', caution: '🟡 리스크 주의', danger: '🔴 고위험군' };
  return <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-black tracking-widest border shadow-sm ${styles[level]}`}>{labels[level]}</span>;
}

function AIInsight({ text }: { text: string }) {
  return (
    <div className="bg-indigo-50/50 backdrop-blur-sm rounded-2xl p-4 border border-indigo-100/50 mt-4 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-blue-500 rounded-l-2xl" />
      <div className="flex gap-3">
        <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-[13px] leading-relaxed text-slate-600 font-medium tracking-tight break-keep">{text}</p>
      </div>
    </div>
  );
}

export default function DemoReportPage() {
  const router = useRouter();
  const [rent, setRent] = useState([200]);
  const monthlyRent = rent[0];
  const dailyCoffee = Math.ceil(monthlyRent * 10000 / 4500);
  const rentRisk = monthlyRent > 300 ? 'danger' : monthlyRent > 180 ? 'caution' : 'safe';
  const closureLevel = DEMO.closureScore >= 60 ? 'danger' : DEMO.closureScore >= 30 ? 'caution' : 'safe';

  return (
    <main className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-200 selection:text-indigo-900 pb-32">
      
      {/* 둥근 최상단 플로팅 배너 */}
      <div className="fixed top-0 left-0 right-0 z-50 p-2 md:p-4 pointer-events-none transition-transform translate-y-0">
        <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-md rounded-full px-5 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-white/10 flex items-center justify-between pointer-events-auto cursor-pointer hover:bg-slate-800 transition-colors"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-200 tracking-wider">PREVIEW REPORT</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium pr-1">Myeongdang AI®</span>
        </div>
      </div>

      {/* Hero Section - Mesh Gradient & Glassmorphism */}
      <section className="relative pt-24 pb-12 px-5 overflow-hidden rounded-b-[40px] shadow-[0_10px_40px_rgba(30,58,138,0.1)]">
        {/* Deep Mesh Background */}
        <div className="absolute inset-0 bg-[#0B1120]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(67,56,202,0.4),_transparent_50%),_radial-gradient(circle_at_80%_80%,_rgba(59,130,246,0.3),_transparent_50%)] animate-pulse duration-[10000ms]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,_black_40%,_transparent_100%)] opacity-30" />
        


        <div className="relative z-20 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
             <MapPin className="w-3.5 h-3.5 text-blue-300" />
             <span className="text-[11px] font-bold text-blue-100 tracking-wider">{DEMO.address}</span>
          </div>
          <h1 className="text-[32px] md:text-[36px] font-black text-white leading-[1.15] tracking-tight mb-4 drop-shadow-md">
            142만 개의 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">생존 알고리즘</span>,<br />결론만 보여드립니다.
          </h1>
          <p className="text-sm text-slate-300 font-medium mb-6 opacity-90 leading-relaxed">
            프리미엄 리포트는 이렇게 구성됩니다.<br/>{DEMO.category} 업종의 입지 위험도를 확인하세요.
          </p>
        </div>
      </section>

      {/* Main Content Area - Overlapping the Hero */}
      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-30 space-y-4">
        
        {/* BENTO GRID: 1. 생존 성적표 (Top Banner) */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2">
               <Activity className="w-5 h-5 text-indigo-500" /> 골목 생존 지표
             </h3>
             <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">{DEMO.category}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
              <div className="text-[28px] font-black text-slate-700 tracking-tighter group-hover:scale-105 transition-transform">{DEMO.survivalStats.rate3y}<span className="text-sm font-bold text-slate-400 ml-0.5">%</span></div>
              <div className="text-[10px] font-black text-slate-400 tracking-tight mt-1">3년 생존율</div>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
              <div className="text-[28px] font-black text-slate-700 tracking-tighter group-hover:scale-105 transition-transform">{DEMO.competition.sameCategory}<span className="text-sm font-bold text-slate-400 ml-0.5">곳</span></div>
              <div className="text-[10px] font-black text-slate-400 tracking-tight mt-1">경쟁 매장수</div>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
              <div className="text-[28px] font-black text-slate-700 tracking-tighter group-hover:scale-105 transition-transform">{Math.floor(DEMO.survivalStats.avgMonths / 12)}<span className="text-sm font-bold text-slate-400 ml-0.5">년</span></div>
              <div className="text-[10px] font-black text-slate-400 tracking-tight mt-1">평균 영업수명</div>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
             <div className="flex-1 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-3 flex items-center justify-between border border-emerald-100/30">
               <span className="text-[11px] font-extrabold text-emerald-800/60">최근 1년 개업</span>
               <span className="text-[16px] font-black text-emerald-600">+{DEMO.survivalStats.recentOpenings}</span>
             </div>
             <div className="flex-1 rounded-xl bg-gradient-to-r from-rose-50 to-rose-100/50 p-3 flex items-center justify-between border border-rose-100/30">
               <span className="text-[11px] font-extrabold text-rose-800/60">최근 1년 폐업</span>
               <span className="text-[16px] font-black text-rose-600">-{DEMO.survivalStats.recentClosures}</span>
             </div>
          </div>
        </div>

        {/* BENTO GRID ROW 2: 온도 & 피크타임 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 상권 온도 */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-5 shadow-xl border border-white flex flex-col items-center justify-center text-center">
            <h3 className="text-[13px] font-black text-slate-500 tracking-widest uppercase mb-4">Temperature</h3>
            <div className="scale-90 transform origin-center -my-2">
              <ScoreGauge score={DEMO.temperature.score} trend={DEMO.temperature.trend} label={`상위 ${DEMO.temperature.percentile}%`} />
            </div>
          </div>

          {/* 피크타임 요약 */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-5 shadow-xl border border-white">
            <h3 className="text-[13px] font-black text-slate-500 tracking-widest uppercase mb-4 text-center">Peak Time</h3>
            <div className="space-y-4">
              {DEMO.peakTimes.slice(0, 2).map((pt, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-extrabold text-slate-700">{pt.dayType === 'weekday' ? '평일' : '주말'} {PEAK_EMOJI[pt.timeSlot]}</span>
                    <span className="text-[12px] font-black text-indigo-600">{pt.relativeScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${pt.relativeScore}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* AI Insight (Bento Block) */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] px-6 py-5 shadow-xl border border-white">
           <p className="text-[14px] leading-relaxed text-slate-700 font-medium break-keep">
             <span className="text-indigo-500 font-black tracking-tight">{DEMO.temperatureInsight.split('업종 교체기')[0]}</span>
             업종 교체기에 해당합니다.
           </p>
        </div>

        {/* 경쟁 매장 레이더 & 리스트 */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl -z-10" />
          <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-indigo-500" /> 경쟁 포화도 분석
          </h3>
          <p className="text-[12px] text-slate-500 font-medium mb-4">AI가 분석한 주변 {DEMO.competition.sameCategory}개 매장의 역학구조</p>
          
          <div className="h-[220px] -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={DEMO.radar.map(d => ({ ...d, fullMark: 100 }))}>
                <PolarGrid stroke="#F1F5F9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} />
                <Radar dataKey="A" stroke="#6366F1" strokeWidth={2} fill="#818CF8" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-50/80 rounded-[20px] p-4 border border-slate-100">
             <div className="flex justify-between items-center mb-3 px-1">
               <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">Live Competitors</span>
             </div>
             <div className="space-y-1.5">
                {DEMO.competitors.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl shadow-sm border border-slate-100/50">
                     <span className="text-[13px] font-extrabold text-slate-700 truncate mr-2">{c.name}</span>
                     <div className="flex items-center gap-2 shrink-0">
                       <span className="text-[10px] text-slate-400 font-medium">{c.openedAt.slice(0, 4)}년 입점</span>
                       {c.isFranchise && <span className="text-[9px] font-black text-white bg-indigo-500 px-1.5 py-0.5 rounded uppercase">FC</span>}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* 매출 추정 */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[24px] p-6 shadow-2xl relative overflow-hidden isolate">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10" />
          <h3 className="text-[16px] font-black text-white flex items-center gap-2 mb-1">
             <Target className="w-5 h-5 text-blue-200" /> AI 추정 월매출 예측
          </h3>
          <p className="text-[11px] text-blue-200/80 font-medium mb-6">허프 확률 모델 및 통계 지리 데이터 기반 (오차범위 ±20%)</p>

          <div className="flex items-center justify-center gap-2 mb-6">
             <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[20px] p-4 text-center border border-white/20 hover:bg-white/20 transition-colors">
                <div className="text-[11px] font-bold text-blue-200 mb-1">보수적 (하위25%)</div>
                <div className="text-[20px] font-black text-white tracking-tighter">{DEMO.revenue.min}만</div>
             </div>
             <div className="flex-[1.2] bg-white rounded-[20px] p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.2)] transform -translate-y-2">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-[9px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Median</div>
                <div className="text-[11px] font-bold text-slate-400 mb-1">중위 추정액</div>
                <div className="text-[28px] font-black text-slate-800 tracking-tighter leading-none">{DEMO.revenue.median}만</div>
             </div>
             <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[20px] p-4 text-center border border-white/20 hover:bg-white/20 transition-colors">
                <div className="text-[11px] font-bold text-blue-200 mb-1">낙관적 (상위25%)</div>
                <div className="text-[20px] font-black text-white tracking-tighter">{DEMO.revenue.max}만</div>
             </div>
          </div>
        </div>

        {/* 임대료 감당 시뮬레이터 */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white">
          <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2 mb-6">
            <Coffee className="w-5 h-5 text-emerald-500" /> 임대료 감당 시뮬레이터
          </h3>
          
          <div className="mb-6 bg-slate-50 rounded-[20px] p-5 border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <span className="text-[13px] font-extrabold text-slate-500">타겟 월 임대료</span>
              <span className="text-[24px] font-black text-slate-800 tracking-tight">{monthlyRent}<span className="text-[14px] font-bold text-slate-400 ml-1">만원</span></span>
            </div>
            <Slider value={rent} onValueChange={(val) => setRent(val as number[])} min={50} max={500} step={10} className="py-2" />
          </div>

          <div className="flex items-center justify-between px-2">
             <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">적자 회피량(BEP)</span>
                <div className="flex items-baseline gap-1">
                   <span className="text-[32px] font-black text-slate-800 tracking-tighter leading-none">{dailyCoffee}</span>
                   <span className="text-[14px] font-bold text-slate-400">잔/일</span>
                </div>
             </div>
             <div className="text-right">
                <RiskBadge level={rentRisk} />
             </div>
          </div>
        </div>

        {/* AI 종합 분석 판정 */}
        <div className="bg-slate-900 rounded-[24px] p-6 shadow-2xl relative overflow-hidden isolate mt-2">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl -z-10" />
          <h3 className="text-[16px] font-black text-white flex items-center gap-2 mb-5">
            <ShieldAlert className="w-5 h-5 text-rose-400" /> AI 종합 리스크 판독기
          </h3>
          
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({children}) => <p className="text-[14px] leading-relaxed text-slate-300 mb-4">{children}</p>,
                strong: ({children}) => <strong className="font-extrabold text-white bg-white/10 px-1 rounded">{children}</strong>,
                h1: ({children}) => <h4 className="text-[15px] font-black text-white mb-2">{children}</h4>,
                h2: ({children}) => <h4 className="text-[15px] font-black text-white mb-2">{children}</h4>,
                li: ({children}) => <li className="text-[14px] text-slate-300 mb-1.5 flex gap-2"><div className="mt-1.5 w-1 h-1 bg-indigo-400 rounded-full shrink-0" /><span>{children}</span></li>,
              }}
            >
              {DEMO.aiAnalysis}
            </ReactMarkdown>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Call To Action */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 pt-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent -z-10" />
        <div className="max-w-lg mx-auto pointer-events-auto">
          <Button
            onClick={() => router.push('/search')}
            className="w-full h-16 text-[16px] font-black bg-slate-900 hover:bg-slate-800 text-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-indigo-300" />
            내 상권 진짜 리스크 확인하기
          </Button>
          <p className="text-[10px] text-slate-400 font-bold text-center mt-3 tracking-widest uppercase">Myeongdang Note AI Analytics®</p>
        </div>
      </div>
    </main>
  );
}
