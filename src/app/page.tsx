'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Search, ShieldCheck, TrendingDown, Clock, ChevronRight, Activity, Store, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-24 overflow-x-hidden">

      {/* ===== 히어로 (Mesh Gradient & Glassmorphism) ===== */}
      <section className="relative bg-slate-900 pt-20 pb-32 overflow-hidden rounded-b-[3rem] shadow-2xl shadow-indigo-900/20 isolate">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        
        {/* Floating Mini UI Elements for depth */}
        <div className="hidden md:flex absolute top-1/4 left-10 transform -rotate-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl animate-[bounce_5s_infinite]">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
               <ShieldCheck className="w-5 h-5 text-emerald-400" />
             </div>
             <div>
               <div className="text-white/80 text-[10px] uppercase font-bold tracking-wider">3y Survival Rate</div>
               <div className="text-white font-extrabold text-lg">38.5%</div>
             </div>
           </div>
        </div>
        <div className="hidden md:flex absolute top-1/3 right-10 transform rotate-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl animate-[bounce_6s_infinite_0.5s]">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
               <TrendingDown className="w-5 h-5 text-rose-400" />
             </div>
             <div>
               <div className="text-white/80 text-[10px] uppercase font-bold tracking-wider">Closure Risk</div>
               <div className="text-white font-extrabold text-lg flex items-center gap-1">High <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /></div>
             </div>
           </div>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-black rounded-full mb-8 border border-white/10 shadow-inner tracking-widest uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Myeongdang AI Analytics®
          </div>

          <h1 className="text-[38px] md:text-[52px] font-black leading-[1.15] mb-6 tracking-tight text-white drop-shadow-lg break-keep">
            수천만 원의 권리금,<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
              어림짐작으로 거실 건가요?
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-medium bg-black/20 px-6 py-4 rounded-3xl backdrop-blur-sm border border-white/5 inline-block">
            142만 개 점포의 개·폐업 데이터와 딥러닝 기반 생존 알고리즘으로<br />
            <strong className="text-white font-extrabold">중개사가 절대 알려주지 않는 진짜 리스크</strong>를 확인하세요.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push('/search')}
              className="w-full sm:w-auto px-8 h-16 text-[17px] font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] shadow-[0_10px_30px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.03] active:scale-[0.98] border border-indigo-500 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] translate-x-[-150%] group-hover:animate-[shimmer_1.5s_infinite]" />
              상권 심층 분석 시작하기
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/report/demo')}
              className="w-full sm:w-auto px-8 h-16 text-[17px] font-bold bg-white/5 hover:bg-white/10 text-white border-white/20 rounded-[20px] backdrop-blur-md transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              데모 보고서 보기
            </Button>
          </div>

          <p className="text-xs text-indigo-300/80 mt-6 font-semibold tracking-wide flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" /> 가입 없이 주소 입력만으로 즉시 확인
          </p>
        </div>
      </section>

      {/* ===== Bento Grid (핵심 가치 전시) ===== */}
      <section className="relative z-20 px-5 -mt-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Bento Item 1: Large Panel */}
          <div className="md:col-span-2 bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white p-8 group hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)] transition-all flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-100 transition-colors" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[24px] font-black text-slate-800 mb-2 tracking-tight">경쟁 매장 전수 리스트업</h3>
              <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                반경 500m 내 모든 동종업종의 이름, 업력, 프랜차이즈 여부를 142만 개 DB에서 3초 만에 추출합니다. 발품 팔 필요가 없습니다.
              </p>
            </div>
            {/* 밋밋함을 없애는 미니 UI 장식 */}
            <div className="mt-8 flex gap-3 overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity">
               <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 flex-1 min-w-[140px]">
                 <div className="text-[11px] font-bold text-slate-400 mb-1">동종업종</div>
                 <div className="text-[20px] font-black text-indigo-600">24개</div>
               </div>
               <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 flex-1 min-w-[140px]">
                 <div className="text-[11px] font-bold text-slate-400 mb-1">평균 생존율</div>
                 <div className="text-[20px] font-black text-rose-500">38%</div>
               </div>
            </div>
          </div>

          {/* Bento Item 2 */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white p-8 group hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)] transition-all relative overflow-hidden">
             <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-2xl -z-10" />
             <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6 border border-rose-200 shadow-inner">
               <Activity className="w-6 h-6" />
             </div>
             <h3 className="text-[20px] font-black text-slate-800 mb-2 tracking-tight">폐업 타임라인</h3>
             <p className="text-sm text-slate-500 font-medium leading-relaxed">
               계약하려는 바로 그 자리에서, 이전 사장님들이 얼마나 버티고 폐업했는지를 타임라인으로 투명하게 공개합니다.
             </p>
          </div>

          {/* Bento Item 3 */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white p-8 group hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)] transition-all relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-2xl -z-10" />
             <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 border border-amber-200 shadow-inner">
               <Clock className="w-6 h-6" />
             </div>
             <h3 className="text-[20px] font-black text-slate-800 mb-2 tracking-tight">피크타임 밀집도</h3>
             <p className="text-sm text-slate-500 font-medium leading-relaxed">
               어느 시간대에 가장 유동인구와 카드 결제가 몰리는지 점수화하여, 영업시간 최적화를 돕습니다.
             </p>
          </div>

          {/* Bento Item 4: Long Bar */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-700 p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group">
            <div className="absolute top-[-50%] right-[-10%] w-60 h-60 bg-blue-500/20 rounded-full blur-[60px]" />
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 border border-white/20 shadow-xl relative z-10 group-hover:scale-110 transition-transform">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="relative z-10 text-center sm:text-left">
              <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 text-[10px] font-black rounded-lg mb-2 border border-blue-500/30 uppercase tracking-widest">Premium Algorithm</div>
              <h3 className="text-[22px] font-black text-white mb-1.5 tracking-tight">AI 통합 리스크 의견서</h3>
              <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-lg">
                단순 수치 제공을 넘어, 상권 데이터를 종합하여 입지의 안전 여부를 AI가 프로파일링하여 직접 서술해 드립니다.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ===== 리포트 미리보기 (Glassmorphism & Charts) ===== */}
      <section className="px-5 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[40px] font-black text-slate-800 tracking-tight leading-tight mb-4">
            직관적이고 타격감 있는<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-500">데이터 시각화 리포트</span>
          </h2>
          <p className="text-slate-500 font-medium text-lg">모바일에서 가장 보기 편하도록 설계되었습니다.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="relative">
            {/* 데코레이션 블러 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-200/50 rounded-full blur-[80px] -z-10" />
            
            <div className="bg-white/80 backdrop-blur-2xl rounded-[36px] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-white/80 p-8 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 mx-auto max-w-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest text-indigo-500 mb-2 uppercase">Verified Report</div>
                  <div className="font-black text-[18px] text-slate-800 tracking-tight">대전 서구 둔산동 123-1</div>
                  <div className="text-[13px] text-slate-400 font-bold mt-1">프랜차이즈 카페</div>
                </div>
              </div>

              <div className="scale-90 origin-top -mb-4 flex justify-center">
                <ScoreGauge score={78} trend="up" label="상위 15%" size={180} />
              </div>

              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 mt-2 space-y-3">
                <div className="flex justify-between items-center bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100/50">
                  <span className="text-[13px] font-bold text-slate-500 flex items-center gap-2"><Store className="w-4 h-4 text-indigo-400" /> 반경 내 동종업종</span>
                  <span className="font-black text-slate-800 text-[16px]">12<span className="text-[10px] ml-0.5 text-slate-400">개</span></span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100/50">
                  <span className="text-[13px] font-bold text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> 3년 생존율 비교</span>
                  <span className="font-black text-rose-500 text-[16px]">38<span className="text-[10px] ml-0.5 text-rose-300">%</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[24px] font-black text-slate-800 tracking-tight">숫자에 압도되지 마세요.<br/>결론만 보여드립니다.</h3>
            <ul className="space-y-4">
              {[
                { title: '상권 온도 게이지', desc: '현재 상권이 뜨고 있는지, 지고 있는지 한눈에 P50(중위값) 대비 백분위로 제공합니다.' },
                { title: '실시간 위험도 판독', desc: '경쟁 포화도, 폐업 이력을 융합하여 적신호/청신호 형태의 트래픽 라이트로 직관성을 높였습니다.' },
                { title: '모바일 원클릭 공유', desc: '도출된 리포트는 지저분한 로그인 없이, PDF나 카카오톡으로 파트너에게 즉각 공유할 수 있습니다.' },
              ].map((f, i) => (
                <li key={i} className="flex gap-4 p-5 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-black text-sm">{i + 1}</span>
                  </div>
                  <div>
                    <strong className="block text-[15px] text-slate-800 mb-1">{f.title}</strong>
                    <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== 신뢰 지표 & 데이터 베이스 ===== */}
      <section className="px-5 py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-center md:text-left z-10">
            <h2 className="text-[28px] font-black tracking-tight mb-2">당신의 감보다 정확한<br/>빅데이터 베이스</h2>
            <p className="text-slate-400 font-medium text-sm">국토교통부, 공공데이터포털 기반의<br/>실제 행정·영업 인허가 데이터를 정제했습니다.</p>
          </div>
          <div className="flex gap-8 sm:gap-14 z-10 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
            <div className="text-center">
              <div className="text-[44px] font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-cyan-300 drop-shadow-sm tabular-nums">142<span className="text-xl ml-1 font-bold">만</span></div>
              <div className="text-[11px] text-slate-400 mt-2 font-bold tracking-widest uppercase">분석 가능 점포 수</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <div className="text-[44px] font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-teal-300 drop-shadow-sm">3<span className="text-xl ml-1 font-bold">초</span></div>
              <div className="text-[11px] text-slate-400 mt-2 font-bold tracking-widest uppercase">실시간 분석 속도</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 리뷰 ===== */}
      <section className="px-5 py-24 max-w-5xl mx-auto relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-slate-100 rounded-[100px] -z-10 skew-y-[-3deg]" />
        
        <div className="text-center mb-16">
          <h2 className="text-[32px] font-black text-slate-800 tracking-tight">수백만 원의 컨설팅을 뛰어넘다</h2>
          <p className="text-slate-500 font-medium mt-3">명당노트를 먼저 알아본 사장님들의 실제 후기입니다.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative group hover:border-indigo-100 transition-colors">
            <div className="absolute top-6 right-6 text-indigo-50 text-[60px] font-serif leading-none opacity-50 select-none group-hover:text-indigo-100 transition-colors">&ldquo;</div>
            <div className="flex gap-1 text-amber-400 mb-5">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="font-extrabold text-[16px] text-slate-700 leading-relaxed mb-6 relative z-10">
              &quot;계약 직전까지 갔던 자리, 명당노트에 돌려봤다가 같은 업종이 1년도 못 버티고 3번 바뀐 걸 알았습니다. 등골이 서늘하더군요. 5천만 원 날릴 뻔한 걸 커피 한잔 값으로 살렸습니다.&quot;
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10"><AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-black">박</AvatarFallback></Avatar>
              <div className="flex flex-col">
                 <span className="text-[13px] font-black text-slate-800">박결단 사장님</span>
                 <span className="text-[11px] font-bold text-slate-400">대전 서구 · 카페 준비중</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative group hover:border-indigo-100 transition-colors">
            <div className="absolute top-6 right-6 text-indigo-50 text-[60px] font-serif leading-none opacity-50 select-none group-hover:text-indigo-100 transition-colors">&ldquo;</div>
            <div className="flex gap-1 text-amber-400 mb-5">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="font-extrabold text-[16px] text-slate-700 leading-relaxed mb-6 relative z-10">
              &quot;기존 상권 분석 사이트들은 복잡한 표만 줘서 무슨 말인지 몰랐는데, 명당노트는 딱 &apos;위험하다, 안전하다&apos;를 찍어주고 임대료 감당 시뮬레이션까지 돌아가서 정말 직관적입니다.&quot;
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10"><AvatarFallback className="bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 font-black">최</AvatarFallback></Avatar>
              <div className="flex flex-col">
                 <span className="text-[13px] font-black text-slate-800">최대표 님</span>
                 <span className="text-[11px] font-bold text-slate-400">천안 서북구 · 다점포 운영</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 마지막 CTA ===== */}
      <section className="px-5 py-24">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[40px] p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden isolate">
           <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[80px]" />
           <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-900/40 rounded-full blur-[60px]" />
           
           <h2 className="text-[32px] md:text-[44px] font-black mb-5 tracking-tight leading-[1.2] drop-shadow-md">
             수천만 원을 베팅하기 전,<br />
             단 3초만 투자하세요.
           </h2>
           <p className="text-indigo-100 font-medium mb-10 text-lg">
             보증금과 권리금을 지키는 가장 확실하고 저렴한 안전장치입니다.
           </p>
           
           <Button
             onClick={() => router.push('/search')}
             className="w-full sm:w-auto px-10 h-16 text-[18px] font-black bg-white text-indigo-700 hover:bg-slate-50 rounded-[24px] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0"
           >
             상권 분석 시작하기
             <ChevronRight className="w-5 h-5 ml-1" />
           </Button>
           <p className="text-[11px] font-bold text-indigo-300 mt-6 tracking-widest uppercase">No Sign Up Required</p>
        </div>
      </section>

      {/* ===== Sticky CTA (Mobile) ===== */}
      <div className="fixed bottom-[80px] left-0 right-0 px-5 z-40 md:hidden pb-safe">
        <div className="max-w-lg mx-auto bg-white/80 backdrop-blur-xl border border-white/50 p-2 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          <Button
            onClick={() => router.push('/search')}
            className="w-full h-14 text-[16px] font-black bg-slate-900 hover:bg-slate-800 text-white rounded-[18px] shadow-md flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            무료로 분석해보기
          </Button>
        </div>
      </div>
    </main>
  );
}
