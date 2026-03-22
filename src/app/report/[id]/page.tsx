'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import {
  Lock, Coffee, MapPin, Sparkles, Target, ShieldAlert, Activity,
  Store, AlertTriangle, TrendingDown, TrendingUp, Users, BarChart3, Clock,
  ChevronRight, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ReactMarkdown from 'react-markdown';

// ── 타입 ──
interface ReportData {
  reportId: string; address: string; businessCategory: string; lat?: number; lng?: number;
  freeData: {
    temperature: { score: number; trend: string; percentile: number; insightText?: string };
    peakTimes: { dayType: string; timeSlot: string; relativeScore: number }[];
    competition: { sameCategory: number; densityPercentile: number; insightText?: string };
  } | null;
}

interface AIData {
  aiAnalysis: string;
  stats: Record<string, number | Record<string, number>>;
  competitors: Array<{ name: string; area: number | null; openedAt: string | null; isFranchise: boolean }>;
  categoryDistribution?: Array<{ category: string; count: number; ratio: number }>;
  sameCategoryTrend?: Array<{ quarter: string; count: number }>;
  areaSurvival?: Array<{ range: string; total: number; survived: number; rate: number }>;
  franchiseComparison?: { fcCount: number; fcSurvivalRate: number; indCount: number; indSurvivalRate: number; topBrands: string[] };
  locationHistory?: Array<{ storeName: string; openedAt: string | null; closedAt: string | null; status: string; monthsOperated?: number }>;
  recommendedCategories?: Array<{ category: string; survivalRate: number; storeCount: number; trend: string }>;
  populationStats?: { population: number; households: number; singleHouseholds: number; singleRatio: number };
}

// ── 유틸 컴포넌트 ──
const PEAK_EMOJI: Record<string, string> = { '12:00~13:00': '☀️', '18:00~20:00': '🌙', '15:00~17:00': '🎉' };
const RADAR_DEFAULT = [
  { subject: '점포 밀집', A: 70, fullMark: 100 }, { subject: '매출 규모', A: 55, fullMark: 100 },
  { subject: '유동인구', A: 75, fullMark: 100 }, { subject: '경쟁 강도', A: 65, fullMark: 100 }, { subject: '성장성', A: 50, fullMark: 100 },
];

function RiskBadge({ level }: { level: string }) {
  const s: Record<string, string> = { safe: 'bg-emerald-50 text-emerald-600 border-emerald-200', caution: 'bg-amber-50 text-amber-600 border-amber-200', danger: 'bg-rose-50 text-rose-600 border-rose-200' };
  const l: Record<string, string> = { safe: '🟢 안전', caution: '🟡 주의', danger: '🔴 위험' };
  return <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-black border ${s[level] || s.caution}`}>{l[level] || l.caution}</span>;
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white/90 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white ${className}`}>{children}</div>;
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-2">{icon} {title}</h3>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 mt-4">
      <div className="flex gap-2"><Lightbulb className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /><p className="text-[13px] text-slate-600 font-medium break-keep leading-relaxed">{text}</p></div>
    </div>
  );
}

// ── 메인 ──
export default function ReportPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [rent, setRent] = useState([200]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState<AIData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lastReport');
    if (saved) { try { setReportData(JSON.parse(saved)); } catch {} }
    setLoading(false);
  }, []);

  // 잠금 해제 → AI 분석 호출
  useEffect(() => {
    if (!isUnlocked || !reportData) return;
    setAiLoading(true);
    fetch('/api/report/ai-analysis', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: reportData.lat || 36.3525, lng: reportData.lng || 127.3858, address: reportData.address, businessCategory: reportData.businessCategory, radius: 500 }),
    }).then(r => r.json()).then(j => { setAi(j.data || j); setAiLoading(false); }).catch(() => setAiLoading(false));
  }, [isUnlocked, reportData]);

  // 데이터 추출
  const free = reportData?.freeData;
  const address = reportData?.address || '분석 주소';
  const category = reportData?.businessCategory || '업종';
  const score = free?.temperature?.score ?? 65;
  const trend = free?.temperature?.trend ?? 'stable';
  const pct = free?.temperature?.percentile ?? 50;
  const insight = free?.temperature?.insightText ?? '';
  const peaks = free?.peakTimes?.slice(0, 3) ?? [];
  const comp = free?.competition?.sameCategory ?? 0;
  const compPct = free?.competition?.densityPercentile ?? 50;
  const verdict = score >= 70 ? 'GO' : score >= 40 ? '주의' : 'STOP';
  const verdictColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-rose-600';
  const verdictBg = score >= 70 ? 'bg-emerald-50 border-emerald-200' : score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';

  const stats = ai?.stats as Record<string, number> | undefined;
  const survivalRate = stats?.survivalRate3y ?? 42;
  const avgMonths = stats?.avgBusinessMonths ?? 24;
  const openings = stats?.recentOpenings ?? 0;
  const closures = stats?.recentClosures ?? 0;
  const revenue = ai?.stats?.estimatedRevenue as Record<string, number> | undefined;
  const monthlyRent = rent[0];
  const dailyCoffee = Math.ceil(monthlyRent * 10000 / 4500);
  const rentRisk = monthlyRent > 300 ? 'danger' : monthlyRent > 180 ? 'caution' : 'safe';

  if (loading) return <main className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-pulse text-slate-400">로딩 중...</div></main>;

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      {/* 상단 배너 */}
      <div className="fixed top-0 left-0 right-0 z-50 p-2 pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-md rounded-full px-5 py-2.5 shadow-lg border border-white/10 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-emerald-500" /></span>
            <span className="text-[11px] font-bold text-slate-200 tracking-wider">LIVE REPORT</span>
          </div>
          <span className="text-[10px] text-slate-400">Myeongdang AI®</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative pt-24 pb-12 px-5 overflow-hidden rounded-b-[40px]">
        <div className="absolute inset-0 bg-[#0B1120]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(67,56,202,0.4),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.3),transparent_50%)]" />
        <div className="relative z-20 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
            <MapPin className="w-3.5 h-3.5 text-blue-300" /><span className="text-[11px] font-bold text-blue-100">{address}</span>
          </div>
          <h1 className="text-[28px] font-black text-white leading-tight mb-3">{category} 상권<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">AI 분석 리포트</span></h1>
          <p className="text-sm text-slate-400">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-30 space-y-4">

        {/* ===== FREE 영역 ===== */}

        {/* F1: 종합 판정 */}
        <div className={`rounded-[24px] p-6 shadow-xl border text-center ${verdictBg}`}>
          <div className={`text-[40px] font-black ${verdictColor}`}>{verdict}</div>
          <p className="text-sm font-bold text-slate-600 mt-1">이 위치의 {category} 창업</p>
          <p className="text-xs text-slate-400 mt-2">종합점수 {score}/100 · 상위 {pct}%</p>
        </div>

        {/* F2+F3: 온도 + 피크타임 (벤토 2컬럼) */}
        <div className="grid grid-cols-2 gap-3">
          <SectionCard className="flex flex-col items-center text-center !p-4">
            <span className="text-[11px] font-black text-slate-400 tracking-widest mb-3">TEMPERATURE</span>
            <div className="scale-[0.85] -my-2"><ScoreGauge score={score} trend={trend as 'up' | 'down' | 'flat'} size={150} /></div>
          </SectionCard>
          <SectionCard className="!p-4">
            <span className="text-[11px] font-black text-slate-400 tracking-widest mb-3 block text-center">PEAK TIME</span>
            <div className="space-y-3 mt-2">
              {peaks.slice(0, 2).map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1"><span className="text-[11px] font-bold text-slate-600">{p.dayType === 'weekday' ? '평일' : '주말'} {PEAK_EMOJI[p.timeSlot] || '📊'}</span><span className="text-[11px] font-black text-indigo-600">{p.relativeScore}%</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-indigo-500 h-full rounded-full" style={{ width: `${p.relativeScore}%` }} /></div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* F4: 경쟁 요약 */}
        <SectionCard>
          <div className="flex items-center justify-between">
            <div><span className="text-[36px] font-black text-slate-800">{comp}</span><span className="text-sm text-slate-400 ml-1">곳</span><div className="text-[11px] text-slate-400 mt-0.5">반경 500m 동종업종</div></div>
            <div className="text-right"><RiskBadge level={compPct > 70 ? 'danger' : compPct > 40 ? 'caution' : 'safe'} /><div className="text-[10px] text-slate-400 mt-1">밀집도 상위 {compPct}%</div></div>
          </div>
          {insight && <Insight text={insight} />}
        </SectionCard>

        {/* ===== PAYWALL — 블러 영역 확실하게 ===== */}
        {!isUnlocked && (
          <>
            {/* 첫 번째 블러 카드: 생존 성적표 미리보기 */}
            <div className="relative rounded-[24px] overflow-hidden">
              <div className="bg-white p-6 pointer-events-none select-none blur-[14px] opacity-40 space-y-3" aria-hidden="true">
                <div className="text-lg font-bold text-slate-400">🏆 생존 성적표</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-20 bg-amber-100 rounded-xl" />
                  <div className="flex-1 h-20 bg-slate-100 rounded-xl" />
                  <div className="flex-1 h-20 bg-blue-100 rounded-xl" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-10 bg-emerald-100 rounded-lg" />
                  <div className="flex-1 h-10 bg-rose-100 rounded-lg" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-white/70 rounded-[24px] z-10" />
            </div>

            {/* 두 번째 블러 카드: 경쟁 리스트 미리보기 */}
            <div className="relative rounded-[24px] overflow-hidden -mt-2">
              <div className="bg-white p-6 pointer-events-none select-none blur-[14px] opacity-40 space-y-2" aria-hidden="true">
                <div className="text-lg font-bold text-slate-400">🏪 경쟁 매장 전수 조사</div>
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-white/85 to-white/60 rounded-[24px] z-10" />
            </div>

            {/* 잠금 해제 CTA 카드 */}
            <div className="bg-white rounded-[24px] shadow-2xl border border-indigo-100 p-8 text-center -mt-2 relative z-20">
              <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Lock className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">프리미엄 분석 리포트</h3>
              <p className="text-[13px] text-slate-400 mb-1">15개 섹션 · AI 종합 의견서 포함</p>
              <div className="flex flex-wrap justify-center gap-1.5 my-4">
                {['생존 성적표', '폐업 타임라인', '경쟁 전수 리스트', '업종 분포', '면적별 생존율', 'FC 비교', '배후 수요', '추천 업종', '매출 추정', 'BEP 시뮬', 'AI 의견서'].map((t, i) => (
                  <span key={i} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">{t}</span>
                ))}
              </div>
              <Button onClick={() => setIsUnlocked(true)} className="w-full max-w-xs h-14 text-[16px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg mx-auto">
                <Coffee className="w-5 h-5 mr-2" /> ₩3,900 잠금 해제
              </Button>
              <p className="text-[11px] text-slate-400 mt-3">카카오페이 · 간편결제 · 커피보다 저렴</p>
            </div>

            {/* 추가 블러 카드들: 아래에 더 많은 콘텐츠가 있다는 느낌 */}
            <div className="space-y-3 pointer-events-none select-none" aria-hidden="true">
              <div className="bg-white p-5 rounded-[24px] blur-[12px] opacity-30">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="space-y-2"><div className="h-5 bg-slate-100 rounded" /><div className="h-5 bg-slate-100 rounded" /><div className="h-5 bg-slate-100 rounded" /></div>
              </div>
              <div className="bg-indigo-900 p-5 rounded-[24px] blur-[12px] opacity-20">
                <div className="h-6 bg-white/20 rounded w-1/2 mb-3" />
                <div className="h-16 bg-white/10 rounded-xl" />
              </div>
              <div className="bg-slate-900 p-5 rounded-[24px] blur-[12px] opacity-15">
                <div className="h-6 bg-white/20 rounded w-2/3 mb-3" />
                <div className="h-24 bg-white/10 rounded-xl" />
              </div>
            </div>
          </>
        )}

        {/* ===== PAID 영역 (15개 중 11개) ===== */}
        {isUnlocked && (
          <div className="space-y-4">

            {/* P1: 생존 성적표 */}
            <SectionCard>
              <SectionTitle icon={<Activity className="w-5 h-5 text-indigo-500" />} title="생존 성적표" />
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="text-[26px] font-black text-slate-700">{survivalRate}<span className="text-sm text-slate-400">%</span></div>
                  <div className="text-[10px] font-bold text-slate-400">3년 생존율</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="text-[26px] font-black text-slate-700">{stats?.sameCategory ?? comp}<span className="text-sm text-slate-400">곳</span></div>
                  <div className="text-[10px] font-bold text-slate-400">동종업종</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="text-[26px] font-black text-slate-700">{Math.floor(avgMonths / 12)}<span className="text-sm text-slate-400">년</span></div>
                  <div className="text-[10px] font-bold text-slate-400">평균 영업수명</div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-emerald-50 rounded-xl p-2.5 flex justify-between items-center border border-emerald-100"><span className="text-[11px] font-bold text-emerald-600">개업</span><span className="font-black text-emerald-600">+{openings}</span></div>
                <div className="flex-1 bg-rose-50 rounded-xl p-2.5 flex justify-between items-center border border-rose-100"><span className="text-[11px] font-bold text-rose-600">폐업</span><span className="font-black text-rose-600">-{closures}</span></div>
              </div>
            </SectionCard>

            {/* P2: 개폐업 타임라인 (킬러) */}
            {ai?.locationHistory && ai.locationHistory.length > 0 && (
              <SectionCard>
                <SectionTitle icon={<Clock className="w-5 h-5 text-rose-500" />} title="이 자리의 역사" sub="같은 주소의 과거 입점 이력" />
                <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                  {ai.locationHistory.slice(0, 8).map((h, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-white ${h.status === '폐업' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[13px] font-extrabold text-slate-700">{h.status === '폐업' ? '☠️' : '🆕'} {h.storeName}</span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {h.openedAt?.substring(0, 7) || '?'} {h.status === '폐업' ? `→ ${h.closedAt?.substring(0, 7) || '?'} 폐업` : '개업'}
                              {h.monthsOperated ? ` (${h.monthsOperated}개월 영업)` : ''}
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${h.status === '폐업' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{h.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Insight text="같은 위치에서 반복 폐업이 발생했다면, 입지 자체에 구조적 문제(가시성, 동선, 임대료)가 있을 수 있습니다." />
              </SectionCard>
            )}

            {/* P3: 경쟁 전수 리스트 */}
            {ai?.competitors && ai.competitors.length > 0 && (
              <SectionCard>
                <SectionTitle icon={<Store className="w-5 h-5 text-indigo-500" />} title="경쟁 매장 전수 조사" sub={`반경 500m 동종업종 ${ai.competitors.length}개`} />
                <div className="bg-slate-50 rounded-[20px] p-3 border border-slate-100 space-y-1.5 max-h-[280px] overflow-y-auto">
                  {ai.competitors.slice(0, 15).map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-slate-100/50">
                      <span className="text-[13px] font-extrabold text-slate-700 truncate mr-2">{c.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400">{c.area ? `${c.area}㎡` : ''}</span>
                        {c.isFranchise && <span className="text-[9px] font-black text-white bg-indigo-500 px-1.5 py-0.5 rounded">FC</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* P4: 업종 분포 */}
            {ai?.categoryDistribution && ai.categoryDistribution.length > 0 && (
              <SectionCard>
                <SectionTitle icon={<BarChart3 className="w-5 h-5 text-indigo-500" />} title="업종 분포" sub="반경 500m 전체 상가" />
                <div className="space-y-2">
                  {ai.categoryDistribution.slice(0, 6).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[12px] font-bold text-slate-600 w-16 truncate">{c.category}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-5">
                        <div className="bg-indigo-500/70 h-5 rounded-full flex items-center px-2" style={{ width: `${Math.max(c.ratio, 8)}%` }}>
                          <span className="text-[10px] font-black text-white">{c.ratio}%</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 w-10 text-right">{c.count}개</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* P5: 면적별 생존율 */}
            {ai?.areaSurvival && ai.areaSurvival.length > 0 && (
              <SectionCard>
                <SectionTitle icon={<Target className="w-5 h-5 text-emerald-500" />} title="면적별 생존율" sub="매장 크기에 따른 생존 확률" />
                <div className="space-y-2">
                  {ai.areaSurvival.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[12px] font-bold text-slate-600 w-14">{a.range}㎡</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-6">
                        <div className={`h-6 rounded-full flex items-center px-2 ${a.rate >= 50 ? 'bg-emerald-500' : a.rate >= 30 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.max(a.rate, 10)}%` }}>
                          <span className="text-[11px] font-black text-white">{a.rate}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{a.total}곳</span>
                    </div>
                  ))}
                </div>
                <Insight text="소형 매장(30㎡ 이하)의 생존율이 현저히 낮습니다. 공간 여유가 체류 시간과 객단가를 높입니다." />
              </SectionCard>
            )}

            {/* P6: 프랜차이즈 비교 */}
            {ai?.franchiseComparison && (
              <SectionCard>
                <SectionTitle icon={<Store className="w-5 h-5 text-amber-500" />} title="프랜차이즈 vs 개인" />
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                    <div className="text-[22px] font-black text-indigo-600">{ai.franchiseComparison.fcSurvivalRate}%</div>
                    <div className="text-[10px] font-bold text-indigo-400">FC 생존율</div>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="text-[22px] font-black text-slate-600">{ai.franchiseComparison.indSurvivalRate}%</div>
                    <div className="text-[10px] font-bold text-slate-400">개인 생존율</div>
                  </div>
                </div>
                {ai.franchiseComparison.topBrands.length > 0 && (
                  <p className="text-[11px] text-slate-400">상위 브랜드: {ai.franchiseComparison.topBrands.join(', ')}</p>
                )}
              </SectionCard>
            )}

            {/* P7: 배후 수요 */}
            {ai?.populationStats && (
              <SectionCard>
                <SectionTitle icon={<Users className="w-5 h-5 text-blue-500" />} title="배후 수요" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="text-[20px] font-black text-slate-700">{ai.populationStats.population.toLocaleString()}<span className="text-sm text-slate-400">명</span></div><div className="text-[10px] text-slate-400">행정동 인구</div></div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="text-[20px] font-black text-slate-700">{ai.populationStats.singleRatio}<span className="text-sm text-slate-400">%</span></div><div className="text-[10px] text-slate-400">1인 가구</div></div>
                </div>
              </SectionCard>
            )}

            {/* P8: 추천 업종 */}
            {ai?.recommendedCategories && ai.recommendedCategories.length > 0 && (
              <SectionCard>
                <SectionTitle icon={<Lightbulb className="w-5 h-5 text-amber-500" />} title="AI 추천 업종" sub="이 상권에서 가장 유리한 업종" />
                <div className="space-y-2">
                  {ai.recommendedCategories.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      <span className="text-lg font-black text-indigo-600 w-6">{i + 1}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-700">{r.category}</div>
                        <div className="text-[11px] text-slate-400">생존율 {r.survivalRate}% · {r.storeCount}곳 · {r.trend === 'growing' ? '📈 성장' : r.trend === 'declining' ? '📉 감소' : '➡️ 안정'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* P9: 매출 추정 */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <SectionTitle icon={<Target className="w-5 h-5 text-blue-200" />} title="AI 추정 월매출" sub="공공데이터 기반 (참고용)" />
              {revenue ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/10 rounded-[20px] p-3 text-center border border-white/20"><div className="text-[10px] text-blue-200">보수적</div><div className="text-[18px] font-black text-white">{Math.round(revenue.min / 10000)}만</div></div>
                  <div className="flex-[1.2] bg-white rounded-[20px] p-4 text-center shadow-lg -translate-y-1"><div className="text-[10px] text-slate-400">중위</div><div className="text-[24px] font-black text-slate-800">{Math.round(revenue.median / 10000)}만</div></div>
                  <div className="flex-1 bg-white/10 rounded-[20px] p-3 text-center border border-white/20"><div className="text-[10px] text-blue-200">낙관적</div><div className="text-[18px] font-black text-white">{Math.round(revenue.max / 10000)}만</div></div>
                </div>
              ) : <div className="text-center text-blue-200 py-4">데이터 로딩 중...</div>}
            </div>

            {/* P10: BEP */}
            <SectionCard>
              <SectionTitle icon={<Coffee className="w-5 h-5 text-emerald-500" />} title="임대료 감당 시뮬레이터" />
              <div className="bg-slate-50 rounded-[20px] p-4 border border-slate-100 mb-4">
                <div className="flex justify-between mb-4"><span className="text-[13px] font-bold text-slate-500">월 임대료</span><span className="text-[22px] font-black text-slate-800">{monthlyRent}만원</span></div>
                <Slider value={rent} onValueChange={(v) => setRent(v as number[])} min={50} max={500} step={10} />
              </div>
              <div className="flex items-center justify-between">
                <div><span className="text-[11px] font-bold text-slate-400">BEP</span><div className="flex items-baseline gap-1"><span className="text-[30px] font-black text-slate-800">{dailyCoffee}</span><span className="text-sm text-slate-400">잔/일</span></div></div>
                <RiskBadge level={rentRisk} />
              </div>
            </SectionCard>

            {/* P11: AI 종합 의견서 */}
            <div className="bg-slate-900 rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl -z-10" />
              <SectionTitle icon={<ShieldAlert className="w-5 h-5 text-rose-400" />} title="AI 종합 리스크 판독기" />
              {aiLoading ? (
                <div className="flex flex-col items-center py-8 gap-3"><div className="w-8 h-8 border-[3px] border-white border-t-transparent rounded-full animate-spin" /><p className="text-slate-400 text-sm">AI 분석 중...</p></div>
              ) : ai?.aiAnalysis ? (
                <ReactMarkdown components={{
                  p: ({children}) => <p className="text-[14px] leading-relaxed text-slate-300 mb-3">{children}</p>,
                  strong: ({children}) => <strong className="font-extrabold text-white bg-white/10 px-1 rounded">{children}</strong>,
                  li: ({children}) => <li className="text-[14px] text-slate-300 mb-1.5 flex gap-2"><div className="mt-1.5 w-1 h-1 bg-indigo-400 rounded-full shrink-0" /><span>{children}</span></li>,
                }}>{ai.aiAnalysis}</ReactMarkdown>
              ) : <p className="text-slate-400 text-sm text-center py-4">AI 분석을 불러오는 중...</p>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center space-y-3 pb-4">
          <p className="text-[11px] text-slate-400 px-4">⚖️ 공공데이터 기반 추정치이며 실제와 다를 수 있습니다.</p>
          <div className="text-[11px] font-black text-slate-300 tracking-widest uppercase">Myeongdang Note AI Analytics®</div>
        </div>
      </div>

      {/* Sticky */}
      {!isUnlocked && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 pt-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent -z-10" />
          <div className="max-w-lg mx-auto pointer-events-auto">
            <Button onClick={() => setIsUnlocked(true)} className="w-full h-16 text-[16px] font-black bg-slate-900 hover:bg-slate-800 text-white rounded-[20px] shadow-lg flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" /> 프리미엄 15개 섹션 잠금해제 <span className="text-indigo-300 font-black ml-1">₩3,900</span>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
