'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { Download, Share2, Copy, Lock, AlertTriangle, TrendingDown, Store, Coffee, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

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
  if (trend === 'up') return <span className="inline-flex items-center gap-1 text-safe-green font-bold"><ArrowUp className="w-4 h-4" />상승 중</span>;
  if (trend === 'down') return <span className="inline-flex items-center gap-1 text-warning-red font-bold"><ArrowDown className="w-4 h-4" />하락 중</span>;
  return <span className="inline-flex items-center gap-1 text-slate-500 font-bold"><ArrowRight className="w-4 h-4" />유지</span>;
}

function RiskBadge({ level }: { level: 'safe' | 'caution' | 'danger' }) {
  const styles = { safe: 'bg-emerald-50 text-emerald-600 border-emerald-200', caution: 'bg-amber-50 text-amber-600 border-amber-200', danger: 'bg-red-50 text-red-600 border-red-200' };
  const labels = { safe: '🟢 안전', caution: '🟡 주의', danger: '🔴 위험' };
  return <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border ${styles[level]}`}>{labels[level]}</span>;
}

function AIInsight({ text }: { text: string }) {
  return (
    <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500 mt-3">
      <p className="text-[15px] leading-relaxed text-slate-700">💡 {text}</p>
    </div>
  );
}

// ScoreGauge는 @/components/report/ScoreGauge에서 import

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [rent, setRent] = useState([200]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('lastReport');
    if (saved) {
      try { setReportData(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const free = reportData?.freeData;
  const address = reportData?.address || '분석 주소';
  const category = reportData?.businessCategory || '업종';
  const tempScore = free?.temperature?.score ?? 65;
  const tempTrend = free?.temperature?.trend ?? 'stable';
  const tempPercentile = free?.temperature?.percentile ?? 50;
  const tempInsight = free?.temperature?.insightText ?? '상권 데이터를 분석하고 있습니다.';

  const peakTimes = free?.peakTimes?.slice(0, 3) ?? [
    { dayType: 'weekday', timeSlot: '12:00~13:00', relativeScore: 85 },
    { dayType: 'weekday', timeSlot: '18:00~20:00', relativeScore: 65 },
    { dayType: 'weekend', timeSlot: '15:00~17:00', relativeScore: 50 },
  ];

  const compCount = free?.competition?.sameCategory ?? 0;
  const compPercentile = free?.competition?.densityPercentile ?? 50;
  const compInsight = free?.competition?.insightText ?? '경쟁 데이터를 분석 중입니다.';
  const compLevel: 'safe' | 'caution' | 'danger' = compPercentile > 70 ? 'danger' : compPercentile > 40 ? 'caution' : 'safe';

  const monthlyRent = rent[0];
  const dailyCoffee = Math.ceil(monthlyRent * 10000 / 4500);
  const rentRisk: 'safe' | 'caution' | 'danger' = monthlyRent > 300 ? 'danger' : monthlyRent > 180 ? 'caution' : 'safe';

  const closureScore = 42;
  const closureLevel: 'safe' | 'caution' | 'danger' = closureScore >= 60 ? 'danger' : closureScore >= 30 ? 'caution' : 'safe';

  if (loading) {
    return <main className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-pulse text-lg text-slate-400">리포트 로딩 중...</div></main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">

      {/* ===== Section 1: Hero ===== */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-6 pb-10 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute top-[-60px] right-[-60px] w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-200 text-xs font-semibold tracking-widest mb-2">명당노트 AI 상권 분석 리포트</p>
              <h1 className="text-[24px] font-extrabold leading-tight">{address}</h1>
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-bold backdrop-blur">{category}</span>
            </div>
            <div className="w-16 h-16 rounded-full border-[3px] border-white/40 flex flex-col items-center justify-center rotate-[-8deg] bg-white/10 backdrop-blur-md shadow-lg shrink-0">
              <span className="text-white font-black text-[11px] leading-none">AI</span>
              <span className="text-white/80 font-bold text-[9px] leading-none mt-0.5">인증분석</span>
            </div>
          </div>
          <p className="text-blue-200 text-xs mt-4">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 분석</p>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">

        {/* ===== Free 카드 1: 상권 온도 ===== */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-slate-800 mb-1">🌡 상권 온도 스코어</h3>
          <ScoreGauge score={tempScore} trend={tempTrend as 'up' | 'down' | 'flat'} label={`상위 ${tempPercentile}%`} />
          <AIInsight text={tempInsight} />
        </div>

        {/* ===== Free 카드 2: 피크타임 ===== */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-slate-800 mb-4">⏰ 피크타임 Top-3</h3>
          <div className="space-y-3">
            {peakTimes.map((pt, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl w-8">{PEAK_EMOJI[pt.timeSlot] || (i === 0 ? '⭐' : '📊')}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-700">{pt.dayType === 'weekday' ? '평일' : '주말'} {pt.timeSlot}</span>
                    <span className="text-sm font-extrabold text-blue-600">{pt.relativeScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-700" style={{ width: `${pt.relativeScore}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <AIInsight text="평일 점심 직장인 유동이 핵심입니다. 런치 메뉴와 테이크아웃에 집중하세요." />
        </div>

        {/* ===== Free 카드 3: 경쟁 포화도 ===== */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-slate-800 mb-1">🏪 경쟁 포화도</h3>
          <div className="flex items-center gap-4 my-3">
            <div className="text-center">
              <div className="text-[36px] font-extrabold text-slate-800">{compCount}</div>
              <div className="text-xs text-slate-400 font-medium">동종업종</div>
            </div>
            <div className="text-center ml-auto">
              <RiskBadge level={compLevel} />
              <div className="text-xs text-slate-400 mt-1">밀집도 상위 {compPercentile}%</div>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={MOCK_RADAR}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 12 }} />
                <Radar dataKey="A" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <AIInsight text={compInsight} />
        </div>

        {/* ===== 페이월 ===== */}
        {!isUnlocked && (
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-lg p-5 blur-[8px] pointer-events-none select-none">
              <h3 className="text-lg font-bold">💰 예상 월매출 범위</h3>
              <div className="flex gap-4 my-4">
                <div className="text-center flex-1"><div className="text-2xl font-bold">1,800만</div><div className="text-xs text-slate-400">하위 25%</div></div>
                <div className="text-center flex-1"><div className="text-3xl font-extrabold text-blue-600">2,400만</div><div className="text-xs">중위</div></div>
                <div className="text-center flex-1"><div className="text-2xl font-bold">3,200만</div><div className="text-xs text-slate-400">상위 25%</div></div>
              </div>
            </div>
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">이 매장의 예상 월 매출이<br />궁금하신가요?</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">경쟁사 매출 분포 · 생존확률 · 실패 원인을<br />숫자로 확인하고, &apos;감&apos; 대신 &apos;확률&apos;로 결정하세요.</p>
              <Button onClick={() => setIsUnlocked(true)} className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg">
                <Coffee className="w-5 h-5 mr-2" />내 리포트 전체 보기 — ₩4,900
              </Button>
              <p className="text-xs text-slate-400 mt-3">신용카드 불필요 · 카카오페이 3초 결제</p>
              <p className="text-xs text-blue-600 font-bold mt-1">점포 선정 실패 비용 5,000만원 방어하기</p>
            </div>
          </div>
        )}

        {/* ===== Paid 카드 (결제 후) ===== */}
        {isUnlocked && (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-4">💰 예상 월매출 범위</h3>
              <div className="flex items-end gap-2 mb-4">
                <div className="text-center flex-1"><div className="text-[22px] font-bold text-slate-500">1,800만</div><div className="text-xs text-slate-400">하위 25%</div></div>
                <div className="text-center flex-1"><div className="text-[36px] font-extrabold text-blue-600">2,400만</div><div className="text-xs font-bold text-blue-600">중위 (P50)</div></div>
                <div className="text-center flex-1"><div className="text-[22px] font-bold text-slate-500">3,200만</div><div className="text-xs text-slate-400">상위 25%</div></div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 relative overflow-hidden">
                <div className="absolute left-[20%] right-[30%] bg-gradient-to-r from-blue-300 via-blue-600 to-blue-300 h-4" />
              </div>
              <div className="flex items-center gap-1 mt-3"><span className="text-sm text-slate-500">신뢰도</span><span className="text-blue-600">★★★★</span><span className="text-slate-300">★</span></div>
              <AIInsight text="이 상권의 카페 중위 매출은 2,400만원이지만, 하위 25%는 1,100만원에 불과합니다. 상위 25%에 진입해야 안정적 운영이 가능합니다." />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-4">🧮 임대료 감당력 시뮬레이터</h3>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">월세</span>
                  <span className="text-lg font-extrabold text-slate-800">{monthlyRent}만원</span>
                </div>
                <Slider value={rent} onValueChange={setRent} min={50} max={500} step={10} className="mt-2" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>50만</span><span>500만</span></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500 mb-1">손익분기점 일일 판매량</p>
                <div className="flex items-center justify-center gap-2">
                  <Coffee className="w-6 h-6 text-amber-600" />
                  <span className="text-[40px] font-extrabold text-slate-800">{dailyCoffee}</span>
                  <span className="text-lg text-slate-500 font-medium">잔/일</span>
                </div>
                <div className="mt-3"><RiskBadge level={rentRisk} /></div>
              </div>
              <AIInsight text={`월세 ${monthlyRent}만원 기준, 하루 ${dailyCoffee}잔 판매가 필요합니다. ${rentRisk === 'safe' ? '안정적인 수준입니다.' : rentRisk === 'caution' ? '월세 조정을 검토해보세요.' : '구조적으로 어렵습니다. 대안 입지를 권장합니다.'}`} />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-4">⚠️ 폐업 리스크 조기경보</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <div className="text-[40px] font-extrabold" style={{ color: closureScore >= 60 ? '#DC2626' : closureScore >= 30 ? '#F59E0B' : '#16A34A' }}>{closureScore}</div>
                  <div className="text-xs text-slate-400">/ 100</div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className="h-4 transition-all duration-700" style={{ width: `${closureScore}%`, background: 'linear-gradient(90deg, #16A34A 0%, #F59E0B 50%, #DC2626 100%)' }} />
                  </div>
                  <div className="mt-2"><RiskBadge level={closureLevel} /></div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { icon: <TrendingDown className="w-4 h-4" />, text: '경쟁 급증', pct: 45 },
                  { icon: <Store className="w-4 h-4" />, text: '임대료 상승', pct: 30 },
                  { icon: <AlertTriangle className="w-4 h-4" />, text: '유동 감소', pct: 25 },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                    <span className="text-slate-400">{f.icon}</span>
                    <span className="text-sm font-medium text-slate-700 flex-1">{f.text}</span>
                    <span className="text-sm font-bold text-slate-500">{f.pct}%</span>
                  </div>
                ))}
              </div>
              <AIInsight text="주변 동종 3년 폐업률이 42%로 높은 편이지만, 최근 6개월 신규 프랜차이즈 진입이 늘어 안정화 가능성이 있습니다." />
            </div>
          </>
        )}

        {/* ===== 하단 ===== */}
        <div className="mt-6 space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12 text-sm font-bold rounded-xl gap-2"><Share2 className="w-4 h-4" />카카오 공유</Button>
            <Button variant="outline" className="flex-1 h-12 text-sm font-bold rounded-xl gap-2"><Download className="w-4 h-4" />PDF 저장</Button>
            <Button variant="outline" className="flex-1 h-12 text-sm font-bold rounded-xl gap-2"><Copy className="w-4 h-4" />링크 복사</Button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed text-center px-4">
            ⚖️ 본 리포트는 공공데이터를 기반으로 추정한 수치로, 실제와 다를 수 있으며 투자 결과에 대한 법적 책임은 지지 않습니다.
          </p>
          <div className="text-center text-xs text-slate-300 pb-4">명당노트 AI 상권 분석 | myeongdangnote.com</div>
        </div>
      </div>

      {/* Sticky 결제 버튼 */}
      {!isUnlocked && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <Button onClick={() => setIsUnlocked(true)} className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg">
            <Coffee className="w-5 h-5 mr-2" />내 리포트 전체 보기 — ₩4,900
          </Button>
        </div>
      )}
    </main>
  );
}
