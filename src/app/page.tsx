'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, MapPin, Search, FileText, ShieldCheck, TrendingDown, Users, Zap, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white pb-24">

      {/* ===== 히어로 ===== */}
      <section className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white px-5 pt-14 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_60%)]" />
        <div className="relative z-10 max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur text-blue-300 text-xs font-bold rounded-full mb-6 border border-white/10">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            142만개 점포 실시간 분석 중
          </div>

          <h1 className="text-[34px] font-extrabold leading-[1.2] mb-5 tracking-tight">
            이 자리에서<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">살아남을 수 있을까?</span>
          </h1>

          <p className="text-lg text-slate-400 mb-10 leading-relaxed">
            142만개 점포의 생사 기록으로<br />
            <strong className="text-slate-200">중개사도 안 알려주는 진짜 데이터</strong>를 확인하세요
          </p>

          <Button
            onClick={() => router.push('/search')}
            className="w-full max-w-sm h-16 text-[18px] font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            무료로 상권 분석 시작하기
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>

          <p className="text-xs text-slate-500 mt-4">가입 없이 바로 시작 · 카카오톡으로 공유 가능</p>
        </div>
      </section>

      {/* ===== 핵심 가치 3개 ===== */}
      <section className="relative z-20 px-5 -mt-8 max-w-lg mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <ShieldCheck className="w-6 h-6" />, label: '3년 생존율', sub: '실제 폐업 기록 기반', color: 'text-emerald-600 bg-emerald-50' },
            { icon: <TrendingDown className="w-6 h-6" />, label: '폐업 타임라인', sub: '같은 자리 이력 추적', color: 'text-amber-600 bg-amber-50' },
            { icon: <Zap className="w-6 h-6" />, label: 'AI 종합 의견', sub: 'Gemini AI 실시간', color: 'text-blue-600 bg-blue-50' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 text-center">
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-2`}>
                {item.icon}
              </div>
              <div className="font-bold text-sm text-slate-800">{item.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 후킹: 이런 걸 알 수 있습니다 ===== */}
      <section className="px-5 py-16 max-w-lg mx-auto">
        <h2 className="text-[24px] font-extrabold text-center text-slate-900 mb-3">계약 전에 이것만은 확인하세요</h2>
        <p className="text-center text-slate-500 mb-10">다른 곳에서는 볼 수 없는 정보입니다</p>

        <div className="space-y-4">
          {[
            {
              emoji: '☠️',
              title: '같은 자리에서 카페가 3번 연속 폐업',
              desc: '이전 입점자가 왜 망했는지, 몇 개월 만에 문 닫았는지 타임라인으로 보여드립니다.',
              highlight: '중개사는 절대 안 알려줍니다',
            },
            {
              emoji: '📊',
              title: '이 골목 카페 3년 생존율 38%',
              desc: '반경 500m 내 동종업종의 실제 개폐업 기록에서 산출한 팩트입니다.',
              highlight: '추정이 아닌 실제 데이터',
            },
            {
              emoji: '🏪',
              title: '주변 경쟁 매장 전수 리스트',
              desc: '이름, 면적, 업력, 프랜차이즈 여부까지. 직접 발품 팔 필요 없습니다.',
              highlight: '142만개 DB에서 즉시 추출',
            },
            {
              emoji: '🤖',
              title: 'AI 전문가의 종합 의견서',
              desc: '데이터를 종합해 "이 자리에서 해도 되는지" 결론을 내려드립니다.',
              highlight: 'Gemini AI 실시간 분석',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{item.emoji}</span>
                <div className="flex-1">
                  <h3 className="font-extrabold text-[17px] text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-2">{item.desc}</p>
                  <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{item.highlight}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 리포트 미리보기 ===== */}
      <section className="px-5 py-16 bg-slate-50 border-t border-b">
        <div className="max-w-lg mx-auto">
          <h2 className="text-[24px] font-extrabold text-center text-slate-900 mb-2">이런 리포트를 받습니다</h2>
          <p className="text-center text-slate-500 mb-10">모바일에서 바로 확인, 카카오톡으로 즉시 공유</p>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 max-w-sm mx-auto">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <div className="font-extrabold text-base text-slate-800">상권 분석 리포트</div>
                <div className="text-xs text-slate-400">대전 서구 둔산동 · 카페</div>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-blue-200 flex items-center justify-center bg-blue-50">
                <span className="text-[10px] font-black text-blue-600">AI</span>
              </div>
            </div>

            <div className="scale-80 origin-top -mb-6">
              <ScoreGauge score={78} trend="up" label="상위 15%" size={160} />
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-600">동종업종</span>
                <span className="font-extrabold text-slate-800">12개</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-600">3년 생존율</span>
                <span className="font-extrabold text-amber-600">38%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-600">프랜차이즈</span>
                <span className="font-extrabold text-slate-800">58%</span>
              </div>
            </div>

            <div className="mt-4 bg-blue-50 rounded-xl p-3 border-l-4 border-blue-500">
              <p className="text-[13px] text-slate-700 leading-relaxed">
                💡 &quot;프랜차이즈 비율이 높아 개인 카페 진입 시 차별화가 필수적입니다. 디저트 특화 전략을 권장합니다.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 사용 방법 3단계 ===== */}
      <section className="px-5 py-16 max-w-lg mx-auto">
        <h2 className="text-[24px] font-extrabold text-center mb-10">10초면 충분합니다</h2>
        <div className="flex flex-col gap-4">
          {[
            { icon: <MapPin className="h-6 w-6" />, step: '1', title: '지도에서 위치 선택', desc: '터치 한 번으로 분석 위치 설정' },
            { icon: <Search className="h-6 w-6" />, step: '2', title: '업종 선택', desc: '궁금한 업종을 골라주세요' },
            { icon: <FileText className="h-6 w-6" />, step: '3', title: 'AI 분석 완료', desc: '생존율, 경쟁 현황, 종합 의견까지' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border bg-white shadow-sm">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md text-lg font-black">
                {item.step}
              </div>
              <div>
                <div className="font-bold text-[17px] text-slate-900">{item.title}</div>
                <div className="text-sm text-slate-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 신뢰 지표 ===== */}
      <section className="px-5 py-12 bg-slate-900 text-white text-center">
        <div className="flex justify-center gap-10 max-w-lg mx-auto">
          <div>
            <div className="text-3xl font-extrabold text-blue-400">142만</div>
            <div className="text-xs text-slate-400 mt-1">분석 가능 점포</div>
          </div>
          <div className="w-px bg-slate-700" />
          <div>
            <div className="text-3xl font-extrabold text-blue-400">서울·경기·충청</div>
            <div className="text-xs text-slate-400 mt-1">전 지역 커버</div>
          </div>
        </div>
      </section>

      {/* ===== 리뷰 ===== */}
      <section className="px-5 py-16 max-w-lg mx-auto">
        <h2 className="text-[24px] font-extrabold text-center mb-10">실제 사용 후기</h2>
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <div className="flex gap-0.5 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="font-bold text-[15px] text-slate-800 leading-relaxed mb-3">
              &quot;계약하려던 자리에서 같은 업종이 3번 연속 망한 사실을 알려줬어요. 덕분에 다른 자리를 찾아 지금 2년째 잘 운영 중입니다.&quot;
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">박</AvatarFallback></Avatar>
              <span className="text-sm text-slate-500">박OO 사장님 · 대전 둔산동</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <div className="flex gap-0.5 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="font-bold text-[15px] text-slate-800 leading-relaxed mb-3">
              &quot;주변 경쟁 매장을 일일이 돌아다닐 필요 없이 한 번에 다 보여줘요. 면적, 업력까지 나오니까 어디를 이길 수 있는지 바로 감이 옵니다.&quot;
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">이</AvatarFallback></Avatar>
              <span className="text-sm text-slate-500">이OO 예비창업자 · 천안 불당동</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 마지막 CTA ===== */}
      <section className="px-5 py-16 bg-gradient-to-b from-blue-600 to-blue-700 text-white text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-[26px] font-extrabold mb-3">수천만원을 걸기 전에<br />₩4,900으로 검증하세요</h2>
          <p className="text-blue-200 mb-8">보증금 3,000만원 + 인테리어 5,000만원<br />날리기 전에 확인할 수 있습니다</p>
          <Button
            onClick={() => router.push('/search')}
            className="w-full max-w-sm h-16 text-[18px] font-bold bg-white text-blue-700 hover:bg-blue-50 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            무료로 상권 분석 시작하기
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-xs text-blue-300 mt-4">무료 분석 · 가입 불필요 · 10초 완성</p>
        </div>
      </section>

      {/* ===== Sticky CTA ===== */}
      <div className="fixed bottom-[60px] left-0 w-full px-4 py-3 bg-white/95 backdrop-blur border-t z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Button
          onClick={() => router.push('/search')}
          className="w-full h-14 text-[17px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg"
        >
          무료로 상권 분석 시작하기
        </Button>
      </div>
    </main>
  );
}
