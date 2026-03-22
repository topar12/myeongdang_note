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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-trust-blue text-xs font-bold rounded-full mb-4">
          <span className="w-1.5 h-1.5 bg-trust-blue rounded-full animate-pulse" />
          142만개 점포 실시간 분석 중
        </div>
        <h1 className="text-[32px] font-bold leading-tight mb-4 tracking-tight">
          이 자리에서<br />
          <span className="text-trust-blue">살아남을 수 있을까?</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          142만개 점포의 생사 기록으로<br />당신의 자리를 검증합니다
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
                  <div className="font-bold text-[19px] text-slate-900">상권이 궁금해요</div>
                  <div className="text-[15px] text-slate-500 mt-1">이 골목에서 몇 곳이 살아남았을까?</div>
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
                {userType === 'founder' ? '🔍 상권 분석' : '💼 공인중개사용'}
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
        <h2 className="text-2xl font-bold mb-2 text-center">중개사도 안 알려주는 진짜 데이터</h2>
        <p className="text-slate-400 text-center mb-10">이 자리에서 카페가 3번 망한 사실,<br />계약 전에 알았다면요?</p>
        
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
            <div className="text-sm font-bold text-trust-blue mb-1">3년 생존율</div>
            <div className="text-2xl font-extrabold tracking-tight">38<span className="text-lg">%</span></div>
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
              <div className="text-slate-500 font-medium">궁금한 업종을 선택합니다</div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-5 rounded-2xl border bg-white shadow-sm">
            <div className="bg-trust-blue text-white w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md shadow-trust-blue/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-[19px] text-slate-900 mb-1">3. AI가 분석합니다</div>
              <div className="text-slate-500 font-medium">생존율, 경쟁 현황, AI 종합 의견까지</div>
            </div>
          </div>
        </div>
      </section>

      {/* 소셜 프루프 섹션 */}
      <section className="px-4 py-16 text-center bg-slate-50 border-t">
        <div className="flex justify-center gap-10 mb-12">
          <div>
            <div className="text-4xl font-extrabold text-trust-blue tracking-tight">142만</div>
            <div className="text-sm font-bold text-slate-600 mt-2">분석 가능 점포</div>
          </div>
          <div className="w-px bg-slate-200"></div>
          <div>
            <div className="text-4xl font-extrabold text-trust-blue tracking-tight">서울경기충청</div>
            <div className="text-sm font-bold text-slate-600 mt-2">전 지역 커버</div>
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
              &quot;계약하려던 자리에서 같은 업종이 3번 연속 망한 사실을 알려줬어요. 덕분에 다른 자리를 찾아 지금 2년째 잘 운영 중입니다.&quot;
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-slate-100">
                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">김</AvatarFallback>
              </Avatar>
              <div className="text-[15px] font-medium text-slate-500">박OO 사장님 (대전 둔산동)</div>
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
