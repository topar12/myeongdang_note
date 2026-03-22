'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Download, Share2, Copy, AlertTriangle, TrendingDown, Store, BadgeAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ReportCard } from '@/components/report/ReportCard';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { BlurOverlay } from '@/components/report/BlurOverlay';
import { StickyPayButton } from '@/components/report/StickyPayButton';
import { TrafficLightBadge } from '@/components/report/TrafficLightBadge';

// 목업 데이터
const PEAK_TIME_DATA = [
  { time: '평일 12~13시 ⭐', value: 85 },
  { time: '금 18~20시', value: 65 },
  { time: '토 15~17시', value: 50 },
];

const RADAR_DATA = [
  { subject: '점포 밀집도', A: 80, fullMark: 100 },
  { subject: '매출 규모', A: 65, fullMark: 100 },
  { subject: '유동 인구', A: 90, fullMark: 100 },
  { subject: '경쟁 강도', A: 70, fullMark: 100 },
  { subject: '성장성', A: 55, fullMark: 100 },
];

const REVENUE_DATA = [
  { name: '하위 25%', value: 1800 },
  { name: '중위 50%', value: 2400 },
  { name: '상위 25%', value: 3200 },
];

export default function ReportPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [rent, setRent] = useState(200);

  const [reportData, setReportData] = useState<{
    address: string;
    businessCategory: string;
    freeData: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lastReport');
    if (saved) {
      try {
        setReportData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved report', e);
      }
    }
  }, []);

  const handleUnlock = () => {
    // 실제로는 결제 로직 연동
    setIsUnlocked(true);
  };

  const addressName = reportData?.address || '강남구 역삼동';
  
  const getCategoryName = (cat: string) => {
    const map: Record<string, string> = {
      'cafe': '카페/커피숍',
      'restaurant': '음식점',
      'salon': '미용실',
      'convenience': '편의점',
      'academy': '학원',
      'laundry': '세탁소',
      'pharmacy': '약국',
      'realestate': '부동산'
    };
    return map[cat] || cat || '선택 업종';
  };
  const categoryName = getCategoryName(reportData?.businessCategory || 'cafe');
  
  // Type assertion for freeData temperature properties
  const tempRecord = (reportData?.freeData?.temperature as Record<string, unknown>) || {};
  const tempScore = (tempRecord.score as number) ?? 85;
  const tempTrend = (tempRecord.trend as string) ?? 'up';
  const tempText = tempTrend === 'up' ? '뜨거워지는 중' : tempTrend === 'down' ? '식어가는 중' : '유지 중';
  const tempPercentile = (tempRecord.percentile as number) ?? 30;

  // 월세에 따른 손익분기점 (가상의 계산식)
  const coffeeCount = Math.floor(rent * 10000 / 4000); // 잔당 4천원 가정
  const profitStatus = rent > 300 ? "danger" : rent > 150 ? "caution" : "safe";

  // 폐업 리스크 점수
  const closureRiskScore = 72;
  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-warning-red';
    if (score >= 40) return 'bg-caution-yellow';
    return 'bg-safe-green';
  };
  const getRiskTextClass = (score: number) => {
    if (score >= 70) return 'text-warning-red';
    if (score >= 40) return 'text-caution-yellow';
    return 'text-safe-green';
  };

  return (
    <main className="min-h-screen bg-slate-50/50 pb-[120px]">
      {/* 헤더 섹션 */}
      <div className="bg-trust-blue text-white p-6 pb-10 rounded-b-[2.5rem] shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-bold text-trust-blue-100 mb-1.5 opacity-90 text-sm tracking-wide">명당노트 프리미엄 상권 분석 리포트</div>
              <h1 className="text-[26px] font-bold leading-tight">{addressName}<br/>{categoryName}</h1>
            </div>
            {/* 가상의 인증 도장 */}
            <div className="w-16 h-16 rounded-full border-4 border-white/30 flex flex-col items-center justify-center rotate-12 bg-white/10 backdrop-blur-md shadow-lg">
              <span className="text-white/90 font-black text-xs tracking-tighter leading-none">AI</span>
              <span className="text-white/90 font-bold text-[10px] tracking-tighter leading-none mt-0.5">인증</span>
            </div>
          </div>
          <div className="text-sm opacity-80 font-medium">분석 일자: 2026년 3월 22일</div>
        </div>
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <div className="px-4 py-6 flex flex-col gap-3 -mt-8 relative z-20">
        
        {/* [Free Tier 영역] */}
        
        {/* 카드 1: 상권 온도 스코어 */}
        <ReportCard 
          title="상권 온도 스코어" 
          aiComment={`이 골목은 상위 ${tempPercentile}% 밀집도를 보이고 있으며, 상권이 ${tempText} 입니다.`}
        >
          <div className="py-4 flex flex-col items-center">
            <ScoreGauge score={tempScore} trend={tempTrend as "up" | "down" | "flat"} label={tempText} />
            <div className="text-center text-sm font-medium text-slate-500 mt-2">상위 {tempPercentile}% 수준</div>
          </div>
        </ReportCard>

        {/* 카드 2: 피크타임 Top-3 */}
        <ReportCard 
          title="피크타임 Top-3" 
          aiComment="점심시간 직장인 유동이 핵심입니다. 런치 메뉴에 집중하세요."
        >
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PEAK_TIME_DATA} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="time" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--color-foreground)', fontWeight: 600 }} />
                <Tooltip cursor={{fill: 'var(--color-slate-100)'}} />
                <Bar dataKey="value" fill="var(--color-trust-blue)" radius={[0, 6, 6, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

        {/* 카드 3: 경쟁 포화도 레이더 */}
        <ReportCard 
          title="경쟁 포화도 (반경 500m)" 
          aiComment="경쟁이 적당한 편입니다. 차별화 전략으로 충분히 승산이 있습니다."
        >
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center mb-2">
            <span className="font-bold text-lg text-slate-800">동종업종 12개</span> <span className="text-slate-400 mx-2">|</span> <span className="font-medium text-slate-600">상위 30% 밀집도</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
                <PolarGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)', fontWeight: 600 }} />
                <Radar name="상권" dataKey="A" stroke="var(--color-trust-blue)" strokeWidth={2} fill="var(--color-trust-blue)" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>


        {/* [Paid Tier 영역] */}
        {isUnlocked ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-3 mt-2">
            
            {/* 카드 4: 업종별 매출 잠재력 */}
            <ReportCard 
              title="예상 월매출 잠재력" 
              aiComment="이 상권에서 카페는 중위 매출 기준 월 2,400만원이 예상됩니다."
            >
              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={REVENUE_DATA} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 600 }} />
                    <Tooltip formatter={(value) => `${value}만원`} cursor={{fill: 'var(--color-slate-100)'}} />
                    <Bar dataKey="value" fill="var(--color-trust-blue)" radius={[0, 6, 6, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center font-bold text-2xl text-trust-blue mt-4 bg-trust-blue/5 py-3 rounded-xl border border-trust-blue/10">
                1,800만 ~ 3,200만원
              </div>
            </ReportCard>

            {/* 카드 5: 임대료 감당력 시뮬레이터 */}
            <ReportCard 
              title="임대료 감당력 시뮬레이션" 
              aiComment={`월세 ${rent}만원 기준, 하루 ${coffeeCount}잔 판매가 필요합니다. ${profitStatus === 'danger' ? '위험' : profitStatus === 'caution' ? '주의' : '안전'} 구간입니다.`}
            >
              <div className="flex flex-col gap-6 py-4">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">예상 월세 입력</span>
                  <div className="text-2xl font-black text-trust-blue">{rent}<span className="text-base font-bold ml-1 text-slate-600">만원</span></div>
                </div>
                
                <div className="px-2">
                  <Slider 
                    defaultValue={[200]} 
                    max={500} 
                    min={100} 
                    step={10} 
                    value={[rent]}
                    onValueChange={(val) => setRent(Array.isArray(val) ? val[0] : val)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
                    <span>100만</span>
                    <span>500만</span>
                  </div>
                </div>
                
                <div className="border-2 border-slate-100 rounded-2xl p-6 text-center mt-2 flex flex-col items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                    <div className={`h-full transition-all duration-500 ${profitStatus === 'danger' ? 'bg-warning-red' : profitStatus === 'caution' ? 'bg-caution-yellow' : 'bg-safe-green'}`} style={{ width: `${(rent/500)*100}%` }}></div>
                  </div>
                  <TrafficLightBadge status={profitStatus} />
                  <div className="text-lg font-bold text-slate-700 leading-snug mt-2">
                    손익분기점 달성하려면<br/>
                    <span className="text-3xl font-black text-slate-900 mt-2 inline-block">하루 {coffeeCount}잔</span> 판매
                  </div>
                </div>
              </div>
            </ReportCard>

            {/* 카드 6: 폐업 리스크 점수 (게이지 추가 및 개선) */}
            <ReportCard 
              title="폐업 리스크 진단" 
              aiComment="주변 폐업률이 높은 편이지만, 신규 유입도 활발해 기회가 있습니다."
            >
              <div className="flex flex-col gap-6 py-2">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm font-bold text-slate-500">종합 위험도 점수</div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-black tracking-tighter ${getRiskTextClass(closureRiskScore)}`}>{closureRiskScore}</span>
                    <span className="text-lg font-bold text-slate-400">/ 100</span>
                  </div>
                  
                  {/* 수평 위험도 게이지 */}
                  <div className="w-full mt-4">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 px-1">
                      <span>안전</span>
                      <span>주의</span>
                      <span>위험</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative flex">
                      <div className="h-full bg-safe-green/20" style={{ width: '40%' }}></div>
                      <div className="h-full bg-caution-yellow/20" style={{ width: '30%' }}></div>
                      <div className="h-full bg-warning-red/20" style={{ width: '30%' }}></div>
                      {/* 인디케이터 바 */}
                      <div 
                        className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-out ${getRiskColor(closureRiskScore)}`} 
                        style={{ width: `${closureRiskScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border rounded-xl p-5">
                  <div className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning-red" />
                    <span>주요 위험 요인 Top 3</span>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 bg-white p-1.5 rounded-lg border shadow-sm shrink-0">
                        <TrendingDown className="w-4 h-4 text-warning-red" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">최근 1년 임대료 급등</div>
                        <div className="text-sm text-slate-500 mt-0.5">상권 평균 대비 15% 상승</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 bg-white p-1.5 rounded-lg border shadow-sm shrink-0">
                        <Store className="w-4 h-4 text-caution-yellow" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">경쟁 매장 과밀화</div>
                        <div className="text-sm text-slate-500 mt-0.5">반경 300m 내 동종업종 12개</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 bg-white p-1.5 rounded-lg border shadow-sm shrink-0">
                        <BadgeAlert className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">주말 유동인구 감소</div>
                        <div className="text-sm text-slate-500 mt-0.5">오피스 상권 특성상 주말 매출 저조</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </ReportCard>

            {/* 하단 공유 액션 바 (가로 3등분) 및 면책조항/워터마크 */}
            <div className="mt-10 mb-6 bg-white rounded-2xl p-6 border shadow-sm">
              <div className="flex gap-3 w-full mb-8">
                <Button variant="outline" className="flex-1 h-14 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black border-none font-bold text-sm shadow-sm flex flex-col gap-1 rounded-xl">
                  <Share2 className="h-5 w-5" />
                  카톡 공유
                </Button>
                <Button variant="outline" className="flex-1 h-14 bg-slate-800 hover:bg-slate-700 text-white border-none font-bold text-sm shadow-sm flex flex-col gap-1 rounded-xl">
                  <Download className="h-5 w-5" />
                  PDF 다운
                </Button>
                <Button variant="outline" className="flex-1 h-14 bg-white font-bold text-sm shadow-sm flex flex-col gap-1 rounded-xl border-2">
                  <Copy className="h-5 w-5 text-slate-600" />
                  링크 복사
                </Button>
              </div>
              
              <div className="flex flex-col items-center text-center gap-4">
                <div className="font-black text-slate-300 text-xl tracking-widest flex items-center gap-2">
                  <span className="text-trust-blue/40">명당노트</span> 
                  <span className="text-slate-200">|</span> 
                  <span className="text-sm tracking-normal font-bold">myeongdangnote.com</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
                  본 리포트는 공공데이터를 기반으로 추정한 수치로, 실제와 다를 수 있으며 투자 결과에 대한 법적 책임은 지지 않습니다. 명당노트의 AI 상권 예측 알고리즘에 의해 자동 생성되었습니다.
                </p>
              </div>
            </div>

          </div>
        ) : (
          <BlurOverlay onUnlock={handleUnlock} title="이 상권의 진짜 가치, 확인해볼까요?">
            <div className="flex flex-col gap-3">
              <ReportCard title="예상 월매출 잠재력">
                <div className="h-56 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                  상세 차트가 블러 처리되었습니다
                </div>
              </ReportCard>
              <ReportCard title="임대료 감당력 시뮬레이션">
                <div className="h-56 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                  시뮬레이터가 블러 처리되었습니다
                </div>
              </ReportCard>
            </div>
          </BlurOverlay>
        )}
      </div>

      {!isUnlocked && (
        <StickyPayButton onClick={handleUnlock} label="☕ 커피 한 잔 값으로 분석 결과 열기" />
      )}
    </main>
  );
}
