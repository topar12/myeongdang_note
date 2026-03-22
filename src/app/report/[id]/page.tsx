'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { Download, Share2, Copy, Lock, AlertTriangle, TrendingDown, Store, Coffee, ArrowUp, ArrowRight, ArrowDown, Sparkles, MapPin, Target, ShieldAlert, BadgeInfo, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ReactMarkdown from 'react-markdown';

interface ReportData {
  reportId: string;
  address: string;
  businessCategory: string;
  freeData: {
    temperature: { score: number; trend: string; percentile: number; factors?: { storeDynamics: number; demandStability: number; districtVitality: number }; insightText?: string };
    peakTimes: { dayType: string; timeSlot: string; relativeScore: number }[];
    competition: { sameCategory: number; substituteCategory?: number; densityPercentile: number; insightText?: string };
  } | null;
}

const MOCK_RADAR = [
  { subject: '점포 밀집', A: 80, fullMark: 100 },
  { subject: '매출 규모', A: 65, fullMark: 100 },
  { subject: '유동인구', A: 90, fullMark: 100 },
  { subject: '경쟁 강도', A: 70, fullMark: 100 },
  { subject: '성장성', A: 55, fullMark: 100 },
];

const PEAK_EMOJI: Record<string, string> = { '12:00~13:00': '☀️', '18:00~20:00': '🌙', '15:00~17:00': '🎉', '11:00~12:00': '☀️', '19:00~21:00': '🌙' };

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <span className="inline-flex items-center gap-1 text-emerald-500 font-bold"><ArrowUp className="w-4 h-4" />상승 중</span>;
  if (trend === 'down') return <span className="inline-flex items-center gap-1 text-rose-500 font-bold"><ArrowDown className="w-4 h-4" />하락 중</span>;
  return <span className="inline-flex items-center gap-1 text-slate-400 font-bold"><ArrowRight className="w-4 h-4" />유지</span>;
}

function RiskBadge({ level }: { level: 'safe' | 'caution' | 'danger' }) {
  const styles = { 
    safe: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-sm shadow-emerald-100', 
    caution: 'bg-amber-50 text-amber-700 border-amber-200/50 shadow-sm shadow-amber-100', 
    danger: 'bg-rose-50 text-rose-700 border-rose-200/50 shadow-sm shadow-rose-100' 
  };
  const labels = { safe: '안전', caution: '주의', danger: '위험' };
  const dots = { safe: 'bg-emerald-500', caution: 'bg-amber-500', danger: 'bg-rose-500' };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border tracking-wider ${styles[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[level]} animate-pulse`} />
      {labels[level]}
    </span>
  );
}

function AIInsight({ text }: { text: string }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 rounded-2xl p-4 border border-indigo-100/50 mt-4 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-700" />
      <div className="relative z-10 flex gap-3">
        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-500" />
        </div>
        <p className="text-[13px] leading-relaxed text-slate-700 font-medium tracking-tight pt-1.5">{text}</p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [rent, setRent] = useState([200]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiStats, setAiStats] = useState<Record<string, number> | null>(null);
  const [aiCompetitors, setAiCompetitors] = useState<Array<{ name: string; area: number | null; openedAt: string | null; isFranchise: boolean }>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lastReport');
    if (saved) {
      try { setReportData(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  // 유료 해제 시 AI 분석 호출
  useEffect(() => {
    if (!isUnlocked || !reportData) return;
    const fetchAI = async () => {
      setAiLoading(true);
      try {
        const free = reportData.freeData;
        const lat = (reportData as ReportData & { lat?: number }).lat || 36.3525;
        const lng = (reportData as ReportData & { lng?: number }).lng || 127.3858;
        const res = await fetch('/api/report/ai-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat, lng,
            address: reportData.address,
            businessCategory: reportData.businessCategory,
            radius: 500,
          }),
        });
        const json = await res.json();
        const data = json.data || json;
        setAiAnalysis(data.aiAnalysis || null);
        setAiStats(data.stats || null);
        setAiCompetitors(data.competitors || []);
      } catch { /* fallback handled */ }
      setAiLoading(false);
    };
    fetchAI();
  }, [isUnlocked, reportData]);

  const free = reportData?.freeData;
  const address = reportData?.address || '서울특별시 마포구 동교동 153-15';
  const category = reportData?.businessCategory || '프랜차이즈 카페';
  const tempScore = free?.temperature?.score ?? 65;
  const tempTrend = free?.temperature?.trend ?? 'stable';
  const tempPercentile = free?.temperature?.percentile ?? 50;
  const tempInsight = free?.temperature?.insightText ?? '상권 데이터 수집 및 전처리 완료. 온도 측정 및 밀집도 분석 결과를 모델링 중입니다. (테스트 환경)';

  const peakTimes = free?.peakTimes?.slice(0, 3) ?? [
    { dayType: 'weekday', timeSlot: '12:00~13:00', relativeScore: 85 },
    { dayType: 'weekday', timeSlot: '18:00~20:00', relativeScore: 65 },
    { dayType: 'weekend', timeSlot: '15:00~17:00', relativeScore: 50 },
  ];

  const compCount = free?.competition?.sameCategory ?? 24;
  const compPercentile = free?.competition?.densityPercentile ?? 75;
  const compInsight = free?.competition?.insightText ?? '해당 입지 500m 반경 내 동일 프랜차이즈 및 대형 카페 경쟁 강도가 전국 상위 수준입니다.';
  const compLevel: 'safe' | 'caution' | 'danger' = compPercentile > 70 ? 'danger' : compPercentile > 40 ? 'caution' : 'safe';

  const monthlyRent = rent[0];
  const dailyCoffee = Math.ceil(monthlyRent * 10000 / 4500);
  const rentRisk: 'safe' | 'caution' | 'danger' = monthlyRent > 300 ? 'danger' : monthlyRent > 180 ? 'caution' : 'safe';

  const closureScore = 42;
  const closureLevel: 'safe' | 'caution' | 'danger' = closureScore >= 60 ? 'danger' : closureScore >= 30 ? 'caution' : 'safe';

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <div className="text-[13px] text-slate-500 font-bold tracking-tight animate-pulse uppercase">데이터 모델 분석 중</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-32 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      
      {/* ===== Section 1: Hero (Premium Mesh Gradient) ===== */}
      <div className="relative bg-slate-900/95 pt-8 pb-16 px-6 rounded-b-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-900/20 isolate">
        {/* Dynamic Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-72 h-72 bg-indigo-600/40 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-60 h-60 bg-blue-500/30 rounded-full mix-blend-screen filter blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="flex justify-between items-start">
            <div className="space-y-4 pr-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span className="text-indigo-200 text-[10px] font-black tracking-widest uppercase">명당노트 AI 상권 분석</span>
              </div>
              
              <div>
                <h1 className="text-[26px] md:text-[30px] font-black text-white leading-tight tracking-tight drop-shadow-lg flex gap-2">
                  <MapPin className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
                  <span className="break-keep">{address}</span>
                </h1>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-3.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-[13px] font-bold text-white backdrop-blur-md shadow-inner tracking-wide">
                    {category}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-[60px] h-[60px] rounded-[18px] border border-white/20 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center rotate-[-4deg] shrink-0 group hover:rotate-0 transition-transform duration-300 mt-2">
              <span className="text-white font-black text-[14px] tracking-wider bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80 drop-shadow-md">AI</span>
              <span className="text-indigo-200 font-bold text-[9px] tracking-widest leading-none mt-1">인증</span>
            </div>
          </div>
          
          <div className="mt-10 flex items-center gap-2 text-indigo-300/80 text-[11px] font-bold tracking-tight bg-black/20 w-fit px-3 py-1.5 rounded-full border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 추출 최신 데이터
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-6 -mt-8 space-y-6 max-w-lg mx-auto relative z-20">

        {/* ===== Free 카드 1: 상권 온도 ===== */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center shadow-inner border border-white">
                <span className="text-lg">🌡</span>
              </div>
              상권 온도 스코어
            </h3>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
              <BadgeInfo className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
          
          <div className="py-3 px-2 scale-[1.02] origin-top">
            <ScoreGauge score={tempScore} trend={tempTrend as 'up' | 'down' | 'flat'} label={`상위 ${tempPercentile}%`} />
          </div>
          <AIInsight text={tempInsight} />
        </div>

        {/* ===== Free 카드 2: 피크타임 ===== */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10" />
           <div className="flex items-center justify-between mb-7">
            <h3 className="text-[17px] font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center shadow-inner border border-white">
                <span className="text-lg">⏰</span>
              </div>
              결제 피크타임 Top 3
            </h3>
          </div>
          
          <div className="space-y-4">
            {peakTimes.map((pt, i) => (
              <div key={i} className="flex items-center gap-4 group/item">
                <div className="w-[42px] h-[42px] rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[20px] shadow-sm transform group-hover/item:scale-105 group-hover/item:border-indigo-100 group-hover/item:bg-indigo-50 transition-all">
                  {PEAK_EMOJI[pt.timeSlot] || (i === 0 ? '⭐' : '📊')}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[14px] font-extrabold text-slate-700 tracking-tight">
                      <span className="text-indigo-600 mr-1.5 opacity-90">{pt.dayType === 'weekday' ? '평일' : '주말'}</span> 
                      {pt.timeSlot}
                    </span>
                    <span className="text-[16px] font-black text-slate-800">{pt.relativeScore}<span className="text-[10px] text-slate-400 font-bold ml-0.5">%</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-[10px] overflow-hidden shadow-inner flex">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden
                        ${i === 0 ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 
                          i === 1 ? 'bg-gradient-to-r from-blue-400 to-blue-300' : 'bg-gradient-to-r from-slate-400 to-slate-300'}`}
                      style={{ width: `${pt.relativeScore}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <AIInsight text="평일 점심 직장인 유동이 메인 매출원입니다. 빠른 회전율을 위한 테이크아웃 동선 최적화가 필수적입니다." />
        </div>

        {/* ===== Free 카드 3: 경쟁 포화도 ===== */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[17px] font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center shadow-inner border border-white">
                <span className="text-lg">🏪</span>
              </div>
              경쟁 포화도 스캐닝
            </h3>
          </div>

          <div className="flex items-center gap-4 my-6 bg-slate-50/50 rounded-[20px] p-5 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
            <div className="flex-1 text-center border-r border-slate-200 border-dashed relative z-10">
              <div className="text-[36px] font-black text-slate-800 tracking-tighter leading-none">{compCount}</div>
              <div className="text-[10px] text-slate-400 font-extrabold mt-2 uppercase tracking-widest leading-none">동종업종 밀집군</div>
            </div>
            <div className="flex-[1.2] flex flex-col items-center justify-center relative z-10 pl-2">
              <RiskBadge level={compLevel} />
              <div className="text-[11px] font-bold text-slate-500 mt-2 tracking-tight">전국 밀집도 상위 <strong className="text-slate-800 bg-indigo-50 px-1.5 py-0.5 rounded">{compPercentile}%</strong></div>
            </div>
          </div>

          <div className="h-56 -mx-2 opacity-90 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={MOCK_RADAR}>
                <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                <Radar dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="url(#colorRadar)" fillOpacity={1} />
                <defs>
                  <linearGradient id="colorRadar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <AIInsight text={compInsight} />
        </div>

        {/* ===== Paywall — 블러 뒤는 가짜 placeholder (실제 데이터 없음) ===== */}
        {!isUnlocked && (
          <div className="relative mt-2 rounded-2xl overflow-hidden shadow-xl">
            {/* 가짜 콘텐츠 (실제 데이터 아님, 순수 UI placeholder) */}
            <div className="bg-white p-5 pointer-events-none select-none blur-[10px] opacity-50 space-y-4" aria-hidden="true">
              <div className="flex gap-3">
                <div className="flex-1 h-20 bg-amber-100 rounded-xl" />
                <div className="flex-1 h-20 bg-slate-100 rounded-xl" />
                <div className="flex-1 h-20 bg-blue-100 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-24 bg-blue-50 rounded-xl" />
              <div className="h-32 bg-indigo-50 rounded-xl" />
            </div>

            {/* 오버레이 — 잠금 + CTA 버튼 (여기에 결제 버튼) */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center px-6 py-10 text-center z-10">
              <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-5 shadow-lg">
                <Lock className="w-7 h-7 text-blue-600" />
              </div>

              <h3 className="text-[21px] font-extrabold text-slate-800 leading-tight mb-2">
                프리미엄 분석 리포트
              </h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                생존율 · 경쟁 전수 리스트 · 폐업 타임라인<br />
                매출 추정 · AI 종합 의견서
              </p>

              <Button
                onClick={() => setIsUnlocked(true)}
                className="w-full max-w-xs h-14 text-[16px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Coffee className="w-5 h-5 mr-2" />
                ₩4,900 잠금 해제
              </Button>

              <p className="text-[11px] text-slate-400 mt-3">카카오페이 · 신용카드 · 간편결제</p>
            </div>
          </div>
        )}

        {/* ===== Paid 영역 (잠금 해제 후) — 팩트 → 추정 → AI ===== */}
        {isUnlocked && (
          <div className="space-y-5">

            {/* P1: 생존 성적표 (핵심 팩트) */}
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
              <h3 className="text-[17px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">🏆 이 골목 생존 성적표</h3>
              {aiStats ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                      <div className="text-[28px] font-extrabold text-amber-600">{aiStats.survivalRate3y}%</div>
                      <div className="text-[11px] font-bold text-amber-500">3년 생존율</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <div className="text-[28px] font-extrabold text-slate-700">{aiStats.sameCategory}</div>
                      <div className="text-[11px] font-bold text-slate-400">동종업종</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                      <div className="text-[28px] font-extrabold text-blue-600">{Math.floor((aiStats.avgBusinessMonths || 24) / 12)}년 {(aiStats.avgBusinessMonths || 24) % 12}월</div>
                      <div className="text-[11px] font-bold text-blue-400">평균 영업기간</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 text-center border border-emerald-100">
                      <span className="text-sm font-bold text-emerald-600">+{aiStats.recentOpenings || 0}개</span>
                      <span className="text-xs text-emerald-400 ml-1">최근1년 개업</span>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-lg px-3 py-2 text-center border border-red-100">
                      <span className="text-sm font-bold text-red-600">-{aiStats.recentClosures || 0}개</span>
                      <span className="text-xs text-red-400 ml-1">최근1년 폐업</span>
                    </div>
                  </div>
                  <AIInsight text={`이 상권의 동종업종 3년 생존율은 ${aiStats.survivalRate3y}%입니다. ${aiStats.survivalRate3y < 40 ? '전국 평균(42%)보다 낮아 신규 진입 시 각별한 주의가 필요합니다.' : '평균 수준이지만 경쟁 현황을 반드시 확인하세요.'}`} />
                </>
              ) : (
                <div className="text-center py-6 text-slate-400">잠금 해제 후 데이터 로딩 중...</div>
              )}
            </div>

            {/* P2: 경쟁 매장 전수 리스트 */}
            {aiCompetitors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
                <h3 className="text-[17px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">🏪 경쟁 매장 전수 조사</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {aiCompetitors.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <span className="text-xs font-extrabold text-slate-400 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.area ? `${c.area}㎡` : '면적미상'} · {c.openedAt ? c.openedAt.substring(0, 7) + ' 개업' : '업력미상'}</div>
                      </div>
                      {c.isFranchise && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">FC</span>}
                    </div>
                  ))}
                </div>
                {aiStats && (
                  <AIInsight text={`프랜차이즈 비율 ${aiStats.franchiseRatio}%. ${aiStats.franchiseRatio > 50 ? '프랜차이즈가 지배하는 상권으로, 개인 매장은 강력한 차별화가 필수입니다.' : '개인 매장 비율이 높아 콘셉트 경쟁력으로 승부할 수 있는 구조입니다.'}`} />
                )}
              </div>
            )}

            {/* P3: 매출 추정 (솔직하게) */}
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
              <h3 className="text-[17px] font-extrabold text-slate-800 mb-1 flex items-center gap-2">💰 AI 추정 월매출</h3>
              <p className="text-[11px] text-slate-400 mb-4">공공데이터 기반 추정치 · 실제 카드 결제 데이터가 아닙니다</p>
              {aiStats?.estimatedRevenue ? (
                <>
                  <div className="flex items-end gap-2 mb-3">
                    <div className="text-center flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="text-[20px] font-bold text-slate-500">{(aiStats.estimatedRevenue.min / 10000).toFixed(0)}만</div>
                      <div className="text-[10px] text-slate-400">보수적</div>
                    </div>
                    <div className="text-center flex-1 bg-blue-50 rounded-xl p-3 border border-blue-200">
                      <div className="text-[28px] font-extrabold text-blue-600">{(aiStats.estimatedRevenue.median / 10000).toFixed(0)}만</div>
                      <div className="text-[10px] font-bold text-blue-500">기준 추정</div>
                    </div>
                    <div className="text-center flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="text-[20px] font-bold text-slate-500">{(aiStats.estimatedRevenue.max / 10000).toFixed(0)}만</div>
                      <div className="text-[10px] text-slate-400">낙관적</div>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <p className="text-[12px] text-amber-700 leading-relaxed">⚠️ 이 수치는 허프 확률 모델 기반 추정치이며, 실제 카드 결제 데이터가 아닙니다. 참고용으로만 활용하세요.</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">매출 데이터 로딩 중...</div>
              )}
            </div>

            {/* P4: BEP 시뮬레이터 */}
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
              <h3 className="text-[17px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">🧮 임대료 감당력</h3>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">월세</span>
                  <span className="text-lg font-extrabold text-slate-800">{rent[0]}만원</span>
                </div>
                <Slider value={rent} onValueChange={setRent} min={50} max={500} step={10} />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1"><span>50만</span><span>500만</span></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">손익분기점 일일 판매량</p>
                <div className="flex items-center justify-center gap-2">
                  <Coffee className="w-5 h-5 text-amber-600" />
                  <span className="text-[36px] font-extrabold text-slate-800">{Math.ceil(rent[0] * 10000 / 4500)}</span>
                  <span className="text-base text-slate-500">잔/일</span>
                </div>
                <div className="mt-2">
                  <RiskBadge level={rent[0] > 300 ? 'danger' : rent[0] > 180 ? 'caution' : 'safe'} />
                </div>
              </div>
            </div>

            {/* P5: 폐업 리스크 */}
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-100">
              <h3 className="text-[17px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">⚠️ 폐업 리스크</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <div className="text-[36px] font-extrabold" style={{ color: closureScore >= 60 ? '#DC2626' : closureScore >= 30 ? '#F59E0B' : '#16A34A' }}>{closureScore}</div>
                  <div className="text-xs text-slate-400">/ 100</div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 transition-all" style={{ width: `${closureScore}%`, background: 'linear-gradient(90deg, #16A34A 0%, #F59E0B 50%, #DC2626 100%)' }} />
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

            {/* P6: AI 종합 의견서 (마지막) */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white overflow-visible">
              <h3 className="text-[17px] font-extrabold mb-4 flex items-center gap-2">🤖 AI 종합 분석 의견서</h3>
              {aiLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-8 h-8 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-blue-200 text-sm">AI가 142만개 점포 데이터를 분석 중...</p>
                </div>
              ) : aiAnalysis ? (
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
                    {aiAnalysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-blue-200 text-sm text-center py-4">AI 분석을 불러오는 중 문제가 발생했습니다.</p>
              )}
              <p className="text-[10px] text-blue-300 mt-3 text-center">Powered by Gemini AI · 공공데이터 기반 참고용</p>
            </div>
          </div>
        )}

        {/* ===== Footer Actions ===== */}
        <div className="mt-10 space-y-6 pb-6 relative z-10">
          <div className="grid grid-cols-3 gap-3">
             <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-white border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition-all">
                <Share2 className="w-5 h-5 text-indigo-500" />
                <span className="text-[11px] font-extrabold text-slate-600 tracking-tight">보고서 공유</span>
             </Button>
             <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-white border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition-all">
                <Download className="w-5 h-5 text-indigo-500" />
                <span className="text-[11px] font-extrabold text-slate-600 tracking-tight">PDF 저장</span>
             </Button>
             <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-white border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition-all">
                <Copy className="w-5 h-5 text-indigo-500" />
                <span className="text-[11px] font-extrabold text-slate-600 tracking-tight">링크 복사</span>
             </Button>
          </div>
          
          <div className="bg-slate-200/40 rounded-2xl p-5 mt-8 border border-slate-200/50 backdrop-blur-sm">
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed tracking-tight break-keep text-center opacity-80">
              본 리포트는 공공데이터 및 통계청 기반 알고리즘 추정치입니다.<br/>
              실제 상권 현황과 차이가 있을 수 있으며, 당사는 본 자료를 근거로 한 투자 결과에 법적 책임을 지지 않습니다.
            </p>
          </div>
          <div className="text-center text-[11px] font-black tracking-widest text-slate-300 uppercase py-6">
            Myeongdang Note AI Analytics®
          </div>
        </div>
      </div>

      {/* Sticky 버튼 제거됨 — 결제 버튼은 페이월 카드 안에만 존재 */}
    </main>
  );
}
