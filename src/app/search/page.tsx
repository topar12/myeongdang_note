'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, Navigation, Minus, Plus } from 'lucide-react';
import { StepWizard } from '@/components/search/StepWizard';
import { CategorySwiper } from '@/components/search/CategorySwiper';
import { LoadingProgress } from '@/components/search/LoadingProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STEPS = [
  { id: 1, label: '위치' },
  { id: 2, label: '업종' },
  { id: 3, label: '리포트 생성' },
];

const RADIUS_OPTIONS = [300, 500, 1000];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(500);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nearbyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // 카카오맵 초기화
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;

    kakao.maps.load(() => {
      if (!mapRef.current) return;

      const defaultLat = 36.3525;
      const defaultLng = 127.3858;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(defaultLat, defaultLng),
        level: 5,
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      // 지도 클릭 이벤트
      kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        const lat = latlng.getLat();
        const lng = latlng.getLng();
        placeMarker(lat, lng);
        reverseGeocode(lat, lng);
      });

      // 현재 위치 시도
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setCenter(new kakao.maps.LatLng(lat, lng));
            map.setLevel(4);
            placeMarker(lat, lng);
            reverseGeocode(lat, lng);
          },
          () => {
            // 위치 권한 거부 또는 실패 시 기본 위치 사용
            placeMarker(defaultLat, defaultLng);
            reverseGeocode(defaultLat, defaultLng);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      } else {
        placeMarker(defaultLat, defaultLng);
        reverseGeocode(defaultLat, defaultLng);
      }
    });
  }, []);

  // 반경 변경 시 원 업데이트
  useEffect(() => {
    if (coordinates && mapReady) {
      updateCircle(coordinates.lat, coordinates.lng);
      fetchNearbyCount(coordinates.lat, coordinates.lng, radius);
    }
  }, [radius, coordinates, mapReady]);

  const placeMarker = useCallback((lat: number, lng: number) => {
    const kakao = (window as any).kakao;
    if (!mapInstanceRef.current) return;

    setCoordinates({ lat, lng });

    // 기존 마커 제거
    if (markerRef.current) markerRef.current.setMap(null);

    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(lat, lng),
      map: mapInstanceRef.current,
      draggable: true,
    });

    // 마커 드래그 이벤트
    kakao.maps.event.addListener(marker, 'dragend', () => {
      const pos = marker.getPosition();
      const newLat = pos.getLat();
      const newLng = pos.getLng();
      setCoordinates({ lat: newLat, lng: newLng });
      updateCircle(newLat, newLng);
      reverseGeocode(newLat, newLng);
    });

    markerRef.current = marker;
    updateCircle(lat, lng);
  }, []);

  const updateCircle = useCallback((lat: number, lng: number) => {
    const kakao = (window as any).kakao;
    if (!mapInstanceRef.current) return;

    if (circleRef.current) circleRef.current.setMap(null);

    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(lat, lng),
      radius,
      strokeWeight: 2,
      strokeColor: '#2563EB',
      strokeOpacity: 0.8,
      fillColor: '#2563EB',
      fillOpacity: 0.12,
      map: mapInstanceRef.current,
    });

    circleRef.current = circle;
  }, [radius]);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const kakao = (window as any).kakao;
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        const addr = result[0].road_address?.address_name || result[0].address.address_name;
        setAddress(addr);
      }
    });
    fetchNearbyCount(lat, lng, radius);
  }, [radius]);

  const fetchNearbyCount = useCallback((lat: number, lng: number, r: number) => {
    if (nearbyTimerRef.current) clearTimeout(nearbyTimerRef.current);
    nearbyTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/nearby?lat=${lat}&lng=${lng}&radius=${r}`);
        const json = await res.json();
        const data = json.data || json;
        setNearbyCount(data.count ?? data.stores?.length ?? 0);
      } catch {
        setNearbyCount(null);
      }
    }, 500);
  }, []);

  // 주소 검색 (자동완성)
  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.length < 2) { setSearchResults([]); setShowResults(false); return; }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/address?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        const data = json.data || json;
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }, []);

  const handleResultSelect = useCallback((result: any) => {
    const lat = result.lat;
    const lng = result.lng;
    const addr = result.addressName || result.placeName || '';
    setAddress(addr);
    setSearchQuery(addr);
    setCoordinates({ lat, lng });
    setShowResults(false);

    if (mapInstanceRef.current) {
      const kakao = (window as any).kakao;
      mapInstanceRef.current.setCenter(new kakao.maps.LatLng(lat, lng));
      mapInstanceRef.current.setLevel(4);
      placeMarker(lat, lng);
    }
  }, [placeMarker]);

  const [locating, setLocating] = useState(false);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocating(false);
        if (mapInstanceRef.current) {
          const kakao = (window as any).kakao;
          mapInstanceRef.current.setCenter(new kakao.maps.LatLng(lat, lng));
          mapInstanceRef.current.setLevel(4);
          placeMarker(lat, lng);
          reverseGeocode(lat, lng);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          alert('위치 권한이 차단되어 있습니다.\n브라우저 설정에서 위치 권한을 허용해주세요.');
        } else if (err.code === 2) {
          alert('위치 정보를 가져올 수 없습니다.\nGPS 신호가 약하거나 네트워크를 확인해주세요.');
        } else {
          alert('위치 찾기가 시간 초과되었습니다.\n주소 검색을 이용해주세요.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [placeMarker, reverseGeocode]);

  // Step 3: 리포트 생성
  useEffect(() => {
    if (currentStep !== 3) return;
    const generateReport = async () => {
      try {
        const lat = coordinates?.lat || 36.3525;
        const lng = coordinates?.lng || 127.3858;
        const finalAddress = address || '분석 주소';
        const finalCategory = selectedCategory || '카페';

        const res = await fetch('/api/report/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: finalAddress, lat, lng, businessCategory: finalCategory }),
        });
        const json = await res.json();
        const reportData = json.data || json;
        const reportId = reportData.reportId || `temp-${Date.now()}`;

        localStorage.setItem('lastReport', JSON.stringify({
          reportId, address: finalAddress, businessCategory: finalCategory,
          freeData: reportData.freeData || null,
        }));
        setTimeout(() => router.push(`/report/${reportId}`), 4000);
      } catch {
        localStorage.setItem('lastReport', JSON.stringify({
          reportId: 'demo', address: address || '분석 주소',
          businessCategory: selectedCategory || '카페', freeData: null,
        }));
        setTimeout(() => router.push('/report/demo'), 4000);
      }
    };
    generateReport();
  }, [currentStep, address, coordinates, selectedCategory, router]);

  return (
    <main className="flex flex-col min-h-screen bg-slate-50/50">
      <StepWizard currentStep={currentStep} steps={STEPS}>
        {/* ===== STEP 1: 지도 기반 위치 선택 ===== */}
        {currentStep === 1 && (
          <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-300">
            {/* 지도 영역 */}
            <div className="relative flex-1 min-h-[40vh]">
              <div ref={mapRef} className="w-full h-full rounded-b-2xl" />

              {/* 지도 위 검색바 오버레이 */}
              <div className="absolute top-3 left-3 right-3 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    className="pl-10 pr-4 h-12 text-base bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border-0"
                    placeholder="주소 또는 장소 검색"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  />
                  {/* 자동완성 드롭다운 */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-14 left-0 right-0 bg-white rounded-xl shadow-xl border max-h-60 overflow-y-auto z-20">
                      {searchResults.map((r: any, i: number) => (
                        <button
                          key={i}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 flex items-start gap-3"
                          onClick={() => handleResultSelect(r)}
                        >
                          <MapPin className="h-5 w-5 text-trust-blue mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium text-sm">{r.placeName || r.addressName}</div>
                            {r.roadAddressName && (
                              <div className="text-xs text-slate-400 mt-0.5">{r.roadAddressName}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 현재 위치 버튼 */}
              <button
                onClick={handleMyLocation}
                disabled={locating}
                className="absolute bottom-4 right-4 z-10 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
              >
                {locating ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation className="h-5 w-5 text-trust-blue" />
                )}
              </button>
            </div>

            {/* 하단 정보 패널 */}
            <div className="bg-white px-4 pt-4 pb-3 space-y-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
              {/* 선택된 주소 */}
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-trust-blue shrink-0" />
                <span className="font-bold text-base text-slate-800 truncate">
                  {address || '지도를 터치하여 위치를 선택하세요'}
                </span>
              </div>

              {/* 반경 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 shrink-0">반경</span>
                <div className="flex gap-2 flex-1">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                        radius === r
                          ? 'bg-trust-blue text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                    </button>
                  ))}
                </div>
                {nearbyCount !== null && (
                  <span className="text-sm font-bold text-trust-blue shrink-0">
                    {nearbyCount.toLocaleString()}개
                  </span>
                )}
              </div>

              {/* 다음 버튼 */}
              <Button
                className="w-full h-14 text-lg font-bold bg-trust-blue hover:bg-trust-blue/90 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 shadow-sm"
                onClick={() => coordinates && setCurrentStep(2)}
                disabled={!coordinates}
              >
                이 위치로 분석하기
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: 업종 선택 ===== */}
        {currentStep === 2 && (
          <div className="flex flex-col h-[calc(100vh-200px)] px-4 animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="mt-4 mb-6">
              <h2 className="text-2xl font-bold mb-1 text-slate-900">어떤 업종이<br />궁금하세요?</h2>
              <p className="text-muted-foreground text-sm">{address} 상권을 분석합니다.</p>
            </div>
            <div className="-mx-4">
              <CategorySwiper onSelect={(id) => setSelectedCategory(id)} />
            </div>
            <div className="mt-6">
              <span className="text-sm font-bold text-slate-600 px-1">기타 업종 직접 입력</span>
              <input
                type="text"
                placeholder="예: 필라테스, 무인 아이스크림"
                className="w-full h-14 px-4 mt-2 rounded-xl border-2 border-border focus:border-trust-blue focus:outline-none text-base"
                onChange={(e) => e.target.value && setSelectedCategory(e.target.value)}
              />
            </div>
            <div className="mt-auto pt-6 pb-4 flex gap-3">
              <Button variant="outline" className="w-1/3 h-14 text-lg font-bold rounded-xl" onClick={() => setCurrentStep(1)}>이전</Button>
              <Button
                className="w-2/3 h-14 text-lg font-bold bg-trust-blue hover:bg-trust-blue/90 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 shadow-sm"
                onClick={() => selectedCategory && setCurrentStep(3)}
                disabled={!selectedCategory}
              >
                분석 시작하기
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: 로딩 ===== */}
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
