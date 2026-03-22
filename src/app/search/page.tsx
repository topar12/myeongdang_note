'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StepWizard } from '@/components/search/StepWizard';
import { AddressSearch } from '@/components/search/AddressSearch';
import { CategorySwiper } from '@/components/search/CategorySwiper';
import { LoadingProgress } from '@/components/search/LoadingProgress';
import { Button } from '@/components/ui/button';

const STEPS = [
  { id: 1, label: '주소' },
  { id: 2, label: '업종' },
  { id: 3, label: '리포트 생성' }
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialLat = searchParams.get('lat');
  const initialLng = searchParams.get('lng');

  const [currentStep, setCurrentStep] = useState(1);
  const [address, setAddress] = useState(initialQuery);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(
    initialLat && initialLng ? { lat: Number(initialLat), lng: Number(initialLng) } : null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleNextToCategory = () => {
    if (coordinates) {
      setCurrentStep(2);
    }
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
  };

  const handleNextToLoading = () => {
    if (selectedCategory) {
      setCurrentStep(3);
    }
  };

  useEffect(() => {
    if (currentStep === 3) {
      const generateReport = async () => {
        try {
          const lat = coordinates?.lat || 36.3525;
          const lng = coordinates?.lng || 127.3858;
          const finalAddress = address || '대전 서구 둔산동';
          const finalCategory = selectedCategory || '카페';

          const res = await fetch('/api/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: finalAddress,
              lat,
              lng,
              businessCategory: finalCategory,
            }),
          });

          const json = await res.json();
          if (!res.ok) throw new Error(json?.error?.message || 'API Error');
          
          const reportData = json.data || json;
          const reportId = reportData.reportId || reportData.id || `temp-${Date.now()}`;

          localStorage.setItem('lastReport', JSON.stringify({
            reportId,
            address: finalAddress,
            businessCategory: finalCategory,
            freeData: reportData.freeData || null,
          }));

          setTimeout(() => {
            router.push(`/report/${reportId}`);
          }, 4000);
        } catch (error) {
          console.error("Report generation failed:", error);
          localStorage.setItem('lastReport', JSON.stringify({
            reportId: 'demo-report-123',
            address: address || '분석 주소',
            businessCategory: selectedCategory || '카페',
            freeData: null,
          }));
          setTimeout(() => {
            router.push('/report/demo-report-123');
          }, 4000);
        }
      };

      generateReport();
    }
  }, [currentStep, address, coordinates, selectedCategory, router]);

  return (
    <main className="flex flex-col min-h-screen bg-slate-50/50 pb-[60px]">
      <StepWizard currentStep={currentStep} steps={STEPS}>
        {currentStep === 1 && (
          <div className="flex flex-col h-[calc(100vh-200px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mt-4 mb-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-900">분석할 상가 주소를<br />입력해주세요</h2>
              <p className="text-muted-foreground text-sm font-medium">정확한 지번이나 도로명 주소를 입력하면 더 정확해요.</p>
            </div>
            
            <AddressSearch 
              onSelect={({ address, lat, lng }) => {
                setAddress(address);
                setCoordinates({ lat, lng });
              }}
            />

            <div className="mt-auto pt-8 pb-4">
              <Button 
                className="w-full h-[56px] text-lg font-bold bg-trust-blue hover:bg-trust-blue/90 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
                onClick={handleNextToCategory}
                disabled={!coordinates}
              >
                다음
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col h-[calc(100vh-200px)] animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="mt-4 mb-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-900">어떤 업종으로<br />창업하실 계획인가요?</h2>
              <p className="text-muted-foreground text-sm font-medium">해당 상권의 경쟁 포화도와 예상 매출을 분석해드려요.</p>
            </div>
            
            <div className="-mx-4">
              <CategorySwiper onSelect={handleCategorySelect} />
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <span className="text-sm font-bold text-slate-600 px-1">기타 업종 직접 입력</span>
              <input 
                type="text" 
                placeholder="예: 필라테스, 무인 아이스크림" 
                className="w-full h-[56px] px-4 rounded-xl border-2 border-border focus:border-trust-blue focus:outline-none shadow-sm transition-colors text-base"
                onClick={() => setSelectedCategory('custom')}
                onChange={() => setSelectedCategory('custom')}
              />
            </div>

            <div className="mt-auto pt-8 pb-4 flex gap-3">
              <Button 
                variant="outline"
                className="w-1/3 h-[56px] text-lg font-bold rounded-xl border-2 hover:bg-slate-50 shadow-sm"
                onClick={() => setCurrentStep(1)}
              >
                이전
              </Button>
              <Button 
                className="w-2/3 h-[56px] text-lg font-bold bg-trust-blue hover:bg-trust-blue/90 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
                onClick={handleNextToLoading}
                disabled={!selectedCategory}
              >
                분석 시작하기
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] animate-in fade-in zoom-in-95 duration-500">
            <LoadingProgress />
          </div>
        )}
      </StepWizard>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50/50" />}>
      <SearchContent />
    </Suspense>
  );
}
