'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import {
  AlertTriangle, TrendingDown, Store, Coffee, Lock,
  MapPin, Sparkles, Target, ShieldAlert, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ReactMarkdown from 'react-markdown';

interface ReportData {
  reportId: string;
  address: string;
  businessCategory: string;
  lat?: number;
  lng?: number;
  freeData: {
    temperature: { score: number; trend: string; percentile: number; insightText?: string };
    peakTimes: { dayType: string; timeSlot: string; relativeScore: number }[];
    competition: { sameCategory: number; densityPercentile: number; insightText?: string };
  } | null;
}

const RADAR_DEFAULT = [
  { subject: '점포 밀집', A: 70, fullMark: 100 }, { subject: '매출 규모', A: 55, fullMark: 100 },
  { subject: '유동인구', A: 75, fullMark: 100 }, { subject: '경쟁 강도', A: 65, fullMark: 100 }, { subject: '성장성', A: 50, fullMark: 100 },
];
const PEAK_EMOJI: Record<string, string> = { '12:00~13:00': '☀️', '18:00~20:00': '🌙', '15:00~17:00': '🎉' };

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = { safe: 'bg-emerald-50 text-emerald-600 border-emerald-200', caution: 'bg-amber-50 text-amber-600 border-amber-200', danger: 'bg-rose-50 text-rose-600 border-rose-200' };
  const labels: Record<string, string> = { safe: '🟢 안전 지대', caution: '🟡 리스크 주의', danger: '🔴 고위험군' };
  return <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-black tracking-widest border shadow-sm ${styles[level] || styles.caution}`}>{labels[level] || labels.caution}</span>;
}

export default function ReportPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [rent, setRent] = useState([200]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiStats, setAiStats] = useState<Record<string, number | Record<string, number>> | null>(null);
  const [aiCompetitors, setAiCompetitors] = useState<Array<{ name: string; area: number | null; openedAt: string | null; isFranchise: boolean }>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lastReport');
    if (saved) {
      try { setReportData(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  // 잠금 해제 시 AI 분석 호출
  useEffect(() => {
    if (!isUnlocked || !reportData) return;
    const fetchAI = async () => {
      setAiLoading(true);
      try {
        const res = await fetch('/api/report/ai-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: reportData.lat || 36.3525, lng: reportData.lng || 127.3858,
            address: reportData.address, businessCategory: reportData.businessCategory, radius: 500,
          }),
        });
        const json = await res.json();
        const data = json.data || json;
        setAiAnalysis(data.aiAnalysis || null);
        setAiStats(data.stats || null);
        setAiCompetitors(data.competitors || []);
      } catch { /* fallback */ }
      setAiLoading(false);
    };
    fetchAI();
  }, [isUnlocked, reportData]);

  const free = reportData?.freeData;
  const address = reportData?.address || '분석 주소';
  const category = reportData?.businessCategory || '업종';
  const tempScore = free?.temperature?.score ?? 65;
  const tempTrend = free?.temperature?.trend ?? 'stable';
  const tempPercentile = free?.temperature?.percentile ?? 50;
  const tempInsight = free?.temperature?.insightText ?? '상권 데이터를 분석 중입니다.';
  const peakTimes = free?.peakTimes?.slice(0, 3) ?? [
    { dayType: 'weekday', timeSlot: '12:00~13:00', relativeScore: 85 },
    { dayType: 'weekday', timeSlot: '18:00~20:00', relativeScore: 65 },
    { dayType: 'weekend', timeSlot: '15:00~17:00', relativeScore: 50 },
  ];
  const compCount = free?.competition?.sameCategory ?? 0;
  const compInsight = free?.competition?.insightText ?? '';
  const monthlyRent = rent[0];
  const dailyCoffee = Math.ceil(monthlyRent * 10000 / 4500);
  const rentRisk = monthlyRent > 300 ? 'danger' : monthlyRent > 180 ? 'caution' : 'safe';
  const survivalRate = (aiStats?.survivalRate3y as number) ?? 42;
  const sameCategory = (aiStats?.sameCategory as number) ?? compCount;
  const avgMonths = (aiStats?.avgBusinessMonths as number) ?? 24;
  const recentOpenings = (aiStats?.recentOpenings as number) ?? 0;
  const recentClosures = (aiStats?.recentClosures as number) ?? 0;
  const revenue = aiStats?.estimatedRevenue as Record<string, number> | undefined;

  if (loading) {
    return <main className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-pulse text-slate-400">리포트 로딩 중...</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-200 selection:text-indigo-900 pb-32">

      {/* 플로팅 상단 배너 */}
      <div className="fixed top-0 left-0 right-0 z-50 p-2 pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-md rounded-full px-5 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-white/10 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold text-slate-200 tracking-wider">LIVE REPORT</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Myeongdang AI®</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative pt-24 pb-12 px-5 overflow-hidden rounded-b-[40px] shadow-[0_10px_40px_rgba(30,58,138,0.1)]">
        <div className="absolute inset-0 bg-[#0B1120]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(67,56,202,0.4),_transparent_50%),_radial-gradient(circle_at_80%_80%,_rgba(59,130,246,0.3),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-30" />

        <div className="relative z-20 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
            <MapPin className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[11px] font-bold text-blue-100 tracking-wider">{address}</span>
          </div>
          <h1 className="text-[28px] font-black text-white leading-[1.15] tracking-tight mb-3">
            {category} 상권<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">AI 분석 리포트</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 분석
          </p>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-30 space-y-4">

        {/* 벤토: 생존 지표 (Free에서도 요약 표시) */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white">
          <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-indigo-500" /> 골목 생존 지표
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50">
              <div className="text-[28px] font-black text-slate-700 tracking-tighter">{tempScore}<span className="text-sm font-bold text-slate-400 ml-0.5">점</span></div>
              <div className="text-[10px] font-black text-slate-400 mt-1">상권 온도</div>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50">
              <div className="text-[28px] font-black text-slate-700 tracking-tighter">{compCount}<span className="text-sm font-bold text-slate-400 ml-0.5">곳</span></div>
              <div className="text-[10px] font-black text-slate-400 mt-1">경쟁 매장</div>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50">
              <div className="text-[28px] font-black text-slate-700 tracking-tighter">{tempPercentile}<span className="text-sm font-bold text-slate-400 ml-0.5">%</span></div>
              <div className="text-[10px] font-black text-slate-400 mt-1">상위 백분위</div>
            </div>
          </div>
        </div>

        {/* 벤토 2컬럼: 온도 게이지 + 피크타임 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-5 shadow-xl border border-white flex flex-col items-center text-center">
            <h3 className="text-[13px] font-black text-slate-500 tracking-widest uppercase mb-4">Temperature</h3>
            <div className="scale-90 -my-2">
              <ScoreGauge score={tempScore} trend={tempTrend as 'up' | 'down' | 'flat'} label={`상위 ${tempPercentile}%`} />
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-5 shadow-xl border border-white">
            <h3 className="text-[13px] font-black text-slate-500 tracking-widest uppercase mb-4 text-center">Peak Time</h3>
            <div className="space-y-4">
              {peakTimes.slice(0, 2).map((pt, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-extrabold text-slate-700">{pt.dayType === 'weekday' ? '평일' : '주말'} {PEAK_EMOJI[pt.timeSlot] || '📊'}</span>
                    <span className="text-[12px] font-black text-indigo-600">{pt.relativeScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pt.relativeScore}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] px-6 py-5 shadow-xl border border-white">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-slate-600 font-medium break-keep">{tempInsight}</p>
          </div>
        </div>

        {/* 경쟁 레이더 */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white">
          <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-indigo-500" /> 경쟁 포화도 분석
          </h3>
          <div className="h-[220px] -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DEFAULT}>
                <PolarGrid stroke="#F1F5F9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} />
                <Radar dataKey="A" stroke="#6366F1" strokeWidth={2} fill="#818CF8" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {compInsight && (
            <div className="flex gap-3 mt-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-slate-500 font-medium">{compInsight}</p>
            </div>
          )}
        </div>

        {/* ===== PAYWALL ===== */}
        {!isUnlocked && (
          <div className="relative rounded-[24px] overflow-hidden shadow-xl">
            <div className="bg-white p-6 pointer-events-none select-none blur-[10px] opacity-50 space-y-4" aria-hidden="true">
              <div className="flex gap-3"><div className="flex-1 h-20 bg-amber-100 rounded-xl" /><div className="flex-1 h-20 bg-slate-100 rounded-xl" /><div className="flex-1 h-20 bg-blue-100 rounded-xl" /></div>
              <div className="space-y-2"><div className="h-10 bg-slate-100 rounded-lg" /><div className="h-10 bg-slate-100 rounded-lg" /><div className="h-10 bg-slate-100 rounded-lg" /></div>
              <div className="h-32 bg-indigo-50 rounded-xl" />
            </div>
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[24px] flex flex-col items-center justify-center px-6 py-10 text-center z-10">
              <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-5 shadow-lg">
                <Lock className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-[21px] font-extrabold text-slate-800 leading-tight mb-2">프리미엄 분석 리포트</h3>
              <p className="text-sm text-slate-500 mb-6">생존율 · 경쟁 전수 리스트 · AI 종합 의견서</p>
              <Button onClick={() => setIsUnlocked(true)} className="w-full max-w-xs h-14 text-[16px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg">
                <Coffee className="w-5 h-5 mr-2" /> ₩4,900 잠금 해제
              </Button>
              <p className="text-[11px] text-slate-400 mt-3">카카오페이 · 신용카드 · 간편결제</p>
            </div>
          </div>
        )}

        {/* ===== PAID 영역 ===== */}
        {isUnlocked && (
          <div className="space-y-4">
            {/* 생존 성적표 */}
            {aiStats && (
              <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white">
                <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-indigo-500" /> 생존 성적표
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50">
                    <div className="text-[28px] font-black text-slate-700">{survivalRate}<span className="text-sm font-bold text-slate-400">%</span></div>
                    <div className="text-[10px] font-black text-slate-400 mt-1">3년 생존율</div>
                  </div>
                  <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50">
                    <div className="text-[28px] font-black text-slate-700">{sameCategory}<span className="text-sm font-bold text-slate-400">곳</span></div>
                    <div className="text-[10px] font-black text-slate-400 mt-1">동종업종</div>
                  </div>
                  <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100/50">
                    <div className="text-[28px] font-black text-slate-700">{Math.floor(avgMonths / 12)}<span className="text-sm font-bold text-slate-400">년</span></div>
                    <div className="text-[10px] font-black text-slate-400 mt-1">평균 영업수명</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl bg-emerald-50 p-3 flex items-center justify-between border border-emerald-100/30">
                    <span className="text-[11px] font-extrabold text-emerald-800/60">최근1년 개업</span>
                    <span className="text-[16px] font-black text-emerald-600">+{recentOpenings}</span>
                  </div>
                  <div className="flex-1 rounded-xl bg-rose-50 p-3 flex items-center justify-between border border-rose-100/30">
                    <span className="text-[11px] font-extrabold text-rose-800/60">최근1년 폐업</span>
                    <span className="text-[16px] font-black text-rose-600">-{recentClosures}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 경쟁 전수 리스트 */}
            {aiCompetitors.length > 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white">
                <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2 mb-4">
                  <Store className="w-5 h-5 text-indigo-500" /> 경쟁 매장 전수 조사
                </h3>
                <div className="bg-slate-50/80 rounded-[20px] p-4 border border-slate-100 space-y-1.5">
                  {aiCompetitors.slice(0, 7).map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl shadow-sm border border-slate-100/50">
                      <span className="text-[13px] font-extrabold text-slate-700 truncate mr-2">{c.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400">{c.area ? `${c.area}㎡` : ''} {c.openedAt ? c.openedAt.substring(0, 4) + '년' : ''}</span>
                        {c.isFranchise && <span className="text-[9px] font-black text-white bg-indigo-500 px-1.5 py-0.5 rounded">FC</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 매출 추정 (다크 카드) */}
            {revenue && (
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10" />
                <h3 className="text-[16px] font-black text-white flex items-center gap-2 mb-1">
                  <Target className="w-5 h-5 text-blue-200" /> AI 추정 월매출
                </h3>
                <p className="text-[11px] text-blue-200/80 font-medium mb-6">공공데이터 기반 추정 (참고용)</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[20px] p-4 text-center border border-white/20">
                    <div className="text-[11px] font-bold text-blue-200 mb-1">보수적</div>
                    <div className="text-[20px] font-black text-white">{Math.round(revenue.min / 10000)}만</div>
                  </div>
                  <div className="flex-[1.2] bg-white rounded-[20px] p-5 text-center shadow-lg transform -translate-y-2">
                    <div className="text-[11px] font-bold text-slate-400 mb-1">중위 추정</div>
                    <div className="text-[28px] font-black text-slate-800 leading-none">{Math.round(revenue.median / 10000)}만</div>
                  </div>
                  <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[20px] p-4 text-center border border-white/20">
                    <div className="text-[11px] font-bold text-blue-200 mb-1">낙관적</div>
                    <div className="text-[20px] font-black text-white">{Math.round(revenue.max / 10000)}만</div>
                  </div>
                </div>
              </div>
            )}

            {/* BEP 시뮬레이터 */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white">
              <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2 mb-6">
                <Coffee className="w-5 h-5 text-emerald-500" /> 임대료 감당 시뮬레이터
              </h3>
              <div className="mb-6 bg-slate-50 rounded-[20px] p-5 border border-slate-100">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-[13px] font-extrabold text-slate-500">타겟 월 임대료</span>
                  <span className="text-[24px] font-black text-slate-800">{monthlyRent}<span className="text-[14px] font-bold text-slate-400 ml-1">만원</span></span>
                </div>
                <Slider value={rent} onValueChange={(val) => setRent(val as number[])} min={50} max={500} step={10} />
              </div>
              <div className="flex items-center justify-between px-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">적자 회피량(BEP)</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[32px] font-black text-slate-800 leading-none">{dailyCoffee}</span>
                    <span className="text-[14px] font-bold text-slate-400">잔/일</span>
                  </div>
                </div>
                <RiskBadge level={rentRisk} />
              </div>
            </div>

            {/* AI 종합 분석 (다크 카드) */}
            <div className="bg-slate-900 rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl -z-10" />
              <h3 className="text-[16px] font-black text-white flex items-center gap-2 mb-5">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> AI 종합 리스크 판독기
              </h3>
              {aiLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-8 h-8 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">AI가 142만개 점포 데이터를 분석 중...</p>
                </div>
              ) : aiAnalysis ? (
                <ReactMarkdown
                  components={{
                    p: ({children}) => <p className="text-[14px] leading-relaxed text-slate-300 mb-4">{children}</p>,
                    strong: ({children}) => <strong className="font-extrabold text-white bg-white/10 px-1 rounded">{children}</strong>,
                    li: ({children}) => <li className="text-[14px] text-slate-300 mb-1.5 flex gap-2"><div className="mt-1.5 w-1 h-1 bg-indigo-400 rounded-full shrink-0" /><span>{children}</span></li>,
                  }}
                >
                  {aiAnalysis}
                </ReactMarkdown>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">AI 분석을 불러오는 중 문제가 발생했습니다.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center space-y-3 pb-4">
          <p className="text-[11px] text-slate-400 leading-relaxed px-4">
            ⚖️ 본 리포트는 공공데이터 기반 추정치이며, 실제와 다를 수 있습니다.
          </p>
          <div className="text-[11px] font-black text-slate-300 tracking-widest uppercase">Myeongdang Note AI Analytics®</div>
        </div>
      </div>

      {/* Sticky CTA (잠금 해제 전에만) */}
      {!isUnlocked && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 pt-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent -z-10" />
          <div className="max-w-lg mx-auto pointer-events-auto">
            <Button onClick={() => setIsUnlocked(true)} className="w-full h-16 text-[16px] font-black bg-slate-900 hover:bg-slate-800 text-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              프리미엄 리포트 잠금해제
              <div className="w-1.5 h-1.5 bg-slate-600 rounded-full mx-1" />
              <span className="text-indigo-300 font-black">4,900원</span>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
