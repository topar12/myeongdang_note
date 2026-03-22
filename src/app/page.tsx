'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AddressSearch } from '@/components/search/AddressSearch';
import { ScoreGauge } from '@/components/report/ScoreGauge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, MapPin, Search, FileText, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<{address: string, lat: number, lng: number} | null>(null);
  const [userType, setUserType] = useState<'founder' | 'agent' | null>(null);

  const handleSearch = () => {
    if (selectedLocation) {
      router.push(`/search?q=${encodeURIComponent(selectedLocation.address)}&lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&type=${userType || 'founder'}`);
    } else {
      alert("주소를 검색하고 목록에서 선택해주세요.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pb-[100px]">
      {/* 히어로 섹션 */}
      <section className="px-4 pt-10 pb-8 flex flex-col items-center text-center min-h-[480px]">
        <h1 className="text-[32px] font-bold leading-tight mb-4 tracking-tight">
          내 가게 자리,<br />
          <span className="text-trust-blue">데이터로 검증</span>하세요
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          공인중개사와 예비 창업자를 위한<br />10초 완성 프리미엄 상권 분석
        </p>

        {/* 온보딩 분기 */}
        {!userType ? (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-4 text-slate-800">어떤 목적으로 오셨나요?</h2>
            <div className="flex flex-col gap-3">
              <button 
                className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-trust-blue hover:bg-blue-50/30 transition-all text-left shadow-sm hover:shadow-md"
                onClick={() => setUserType('founder')}
              >
                <div className="w-14 h-14 bg-blue-100 text-trust-blue rounded-full flex items-center justify-center shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-bold text-[19px] text-slate-900">창업 준비 중이에요</div>
                  <div className="text-[15px] text-slate-500 mt-1">이 자리, 월세 감당 가능할까요?</div>
                </div>
              </button>

              <button 
                className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-trust-blue hover:bg-blue-50/30 transition-all text-left shadow-sm hover:shadow-md"
                onClick={() => setUserType('agent')}
              >
                <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-bold text-[19px] text-slate-900">중개사입니다</div>
                  <div className="text-[15px] text-slate-500 mt-1">10초 만에 프리미엄 브리핑 자료 완성</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 text-left">
              <span className="inline-block px-3 py-1 bg-trust-blue/10 text-trust-blue text-sm font-bold rounded-full mb-3">
                {userType === 'founder' ? '👩‍🍳 예비 창업자용' : '💼 공인중개사용'}
              </span>
              <h3 className="font-bold text-xl leading-tight text-slate-900">
                {userType === 'founder' ? '궁금한 상가 주소를 입력하세요' : '분석할 매물 주소를 입력하세요'}
              </h3>
            </div>
            <AddressSearch 
              onSelect={(result) => setSelectedLocation(result)} 
            />
            <Button 
              className="w-full h-[56px] mt-6 text-[19px] font-bold bg-trust-blue hover:bg-trust-blue/90 text-white rounded-xl shadow-lg shadow-trust-blue/20"
              onClick={handleSearch}
            >
              무료로 상권 확인하기
            </Button>
            <button 
              className="mt-5 text-sm font-medium text-slate-400 underline underline-offset-4 hover:text-slate-600 transition-colors"
              onClick={() => setUserType(null)}
            >
              처음으로 돌아가기
            </button>
          </div>
        )}
      </section>

      {/* 리포트 미리보기 섹션 */}
      <section className="px-4 py-16 flex flex-col items-center overflow-hidden bg-slate-900 text-white mt-10">
        <h2 className="text-2xl font-bold mb-2 text-center">대시보드 NO, 처방전 YES</h2>
        <p className="text-slate-400 text-center mb-10">어려운 데이터 대신, 직관적인 결론만 드립니다</p>
        
        <div className="w-full max-w-sm relative transform perspective-1000">
          <div className="rotate-y-12 rotate-x-12 rotate-z-[-5deg] scale-105 transition-transform duration-700 hover:rotate-0 hover:scale-100">
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="font-bold text-lg">상권 분석 리포트</div>
                <div className="text-sm text-slate-500">강남구 역삼동</div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="text-center font-bold mb-2">상권 온도 스코어</div>
                <div className="scale-75 origin-top -mb-10">
                  <ScoreGauge score={85} trend="up" />
                </div>
                <div className="text-center mt-2 font-bold text-warning-red text-xl">
                  뜨거워지는 중 🌡
                </div>
              </div>

              <div className="space-y-3 p-2">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
              </div>
            </div>
          </div>
          
          {/* 하이라이트 배지 */}
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 bg-white text-slate-900 rounded-2xl shadow-xl p-4 border border-trust-blue/20 animate-bounce">
            <div className="text-sm font-bold text-trust-blue mb-1">예상 월매출</div>
            <div className="text-2xl font-extrabold tracking-tight">2,400<span className="text-lg">만원</span></div>
          </div>
        </div>
      </section>

      {/* 사용 방법 섹션 */}
      <section className="px-4 py-16 bg-white">
        <h2 className="text-[26px] font-bold text-center mb-10">단 3단계면 충분합니다</h2>
        <div className="flex flex-col gap-5 max-w-md mx-auto">
          <div className="flex items-center gap-5 p-5 rounded-2xl border bg-white shadow-sm">
            <div className="bg-trust-blue text-white w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md shadow-trust-blue/20">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-[19px] text-slate-900 mb-1">1. 주소만 입력하세요</div>
              <div className="text-slate-500 font-medium">궁금한 상가 주소를 검색합니다</div>
            </div>
          </div>
          
          <div className="flex items-center gap-5 p-5 rounded-2xl border bg-white shadow-sm">
            <div className="bg-trust-blue text-white w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md shadow-trust-blue/20">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-[19px] text-slate-900 mb-1">2. 업종을 고르세요</div>
              <div className="text-slate-500 font-medium">창업할 업종을 선택합니다</div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-5 rounded-2xl border bg-white shadow-sm">
            <div className="bg-trust-blue text-white w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md shadow-trust-blue/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-[19px] text-slate-900 mb-1">3. 명당노트가 완성됩니다</div>
              <div className="text-slate-500 font-medium">1페이지 PDF로 즉시 확인하세요</div>
            </div>
          </div>
        </div>
      </section>

      {/* 소셜 프루프 섹션 */}
      <section className="px-4 py-16 text-center bg-slate-50 border-t">
        <div className="flex justify-center gap-10 mb-12">
          <div>
            <div className="text-4xl font-extrabold text-trust-blue tracking-tight">1,240+</div>
            <div className="text-sm font-bold text-slate-600 mt-2">사용 중인 중개사</div>
          </div>
          <div className="w-px bg-slate-200"></div>
          <div>
            <div className="text-4xl font-extrabold text-trust-blue tracking-tight">15,000+</div>
            <div className="text-sm font-bold text-slate-600 mt-2">누적 생성 리포트</div>
          </div>
        </div>

        <div className="flex flex-col gap-5 max-w-md mx-auto text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex gap-1 text-caution-yellow mb-3">
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
            </div>
            <p className="font-bold text-[17px] text-slate-800 leading-relaxed mb-4">
              &quot;손님 브리핑할 때 이거 하나면 신뢰도가 확 올라갑니다. 말로 설명하던 걸 데이터로 보여주니 계약율이 2배는 뛰었어요.&quot;
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-slate-100">
                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">김</AvatarFallback>
              </Avatar>
              <div className="text-[15px] font-medium text-slate-500">김OO 소장 (강남구)</div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex gap-1 text-caution-yellow mb-3">
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
            </div>
            <p className="font-bold text-[17px] text-slate-800 leading-relaxed mb-4">
              &quot;복잡한 사이트 들어갈 필요 없이 폰으로 바로 뽑을 수 있어서 임장 갈 때 필수입니다. 카톡으로 공유하기도 너무 편해요.&quot;
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-slate-100">
                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">이</AvatarFallback>
              </Avatar>
              <div className="text-[15px] font-medium text-slate-500">이OO 소장 (마포구)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA (하단 네비게이션과 겹치지 않게 bottom 값 조정) */}
      <div className="fixed bottom-[60px] left-0 w-full p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Button 
          className="w-full h-[56px] text-[19px] font-bold bg-trust-blue hover:bg-trust-blue/90 text-white shadow-lg shadow-trust-blue/20 rounded-xl"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (!userType) setUserType('founder');
          }}
        >
          무료로 상권 분석 시작하기
        </Button>
      </div>
    </main>
  );
}
