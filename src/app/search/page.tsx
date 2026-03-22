'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, Navigation, ChevronDown, Sparkles } from 'lucide-react';
import { LoadingProgress } from '@/components/search/LoadingProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FIXED_RADIUS = 500;

const CATEGORIES = [
  { group: '음식', items: [
    { value: '카페', label: '☕ 카페' },
    { value: '일반음식점', label: '🍽 음식점' },
    { value: '제과점', label: '🍰 베이커리' },
    { value: '휴게음식점', label: '🧁 디저트' },
    { value: '단란주점', label: '🍺 주점' },
  ]},
  { group: '생활', items: [
    { value: '미용업', label: '💇 미용실' },
    { value: '세탁업', label: '👔 세탁소' },
    { value: '체력단련장', label: '💪 헬스장' },
    { value: '목욕장', label: '🧖 사우나' },
  ]},
  { group: '건강', items: [
    { value: '약국', label: '💊 약국' },
    { value: '의원', label: '🏥 의원' },
    { value: '병원', label: '🏨 병원' },
    { value: '안경업', label: '👓 안경원' },
  ]},
  { group: '기타', items: [
    { value: 'PC방', label: '🖥 PC방' },
    { value: '숙박업', label: '🏨 숙박' },
    { value: '동물병원', label: '🐕 동물병원' },
    { value: '편의점', label: '🏪 편의점' },
  ]},
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ addressName: string; lat: number; lng: number; placeName?: string; roadAddressName?: string }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const circleRef = useRef<unknown>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearbyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 카카오맵 초기화
  useEffect(() => {
    const kakao = (window as Record<string, unknown>).kakao as Record<string, unknown> | undefined;
    if (!kakao?.maps) return;
    const maps = kakao.maps as Record<string, unknown>;
    (maps.load as (cb: () => void) => void)(() => {
      if (!mapRef.current) return;
      const defaultLat = 36.3525, defaultLng = 127.3858;
      const Maps = maps.Map as new (el: HTMLElement, opts: unknown) => unknown;
      const LatLng = maps.LatLng as new (lat: number, lng: number) => unknown;
      const map = new Maps(mapRef.current, { center: new LatLng(defaultLat, defaultLng), level: 5 });
      mapInstanceRef.current = map;
      setMapReady(true);

      const event = maps.event as Record<string, unknown>;
      (event.addListener as (target: unknown, type: string, cb: (e: Record<string, unknown>) => void) => void)(map, 'click', (mouseEvent) => {
        const latlng = mouseEvent.latLng as Record<string, () => number>;
        placeMarker(latlng.getLat(), latlng.getLng());
        reverseGeocode(latlng.getLat(), latlng.getLng());
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { const {latitude: lat, longitude: lng} = pos.coords; (map as Record<string, unknown>).setCenter = ((map as Record<string, (arg: unknown) => void>).setCenter); (map as Record<string, (arg: unknown) => void>).setCenter(new LatLng(lat, lng)); (map as Record<string, (arg: unknown) => void>).setLevel(4 as unknown); placeMarker(lat, lng); reverseGeocode(lat, lng); },
          () => { placeMarker(defaultLat, defaultLng); reverseGeocode(defaultLat, defaultLng); },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeMarker = useCallback((lat: number, lng: number) => {
    const kakao = (window as Record<string, unknown>).kakao as Record<string, unknown>;
    const maps = kakao.maps as Record<string, unknown>;
    if (!mapInstanceRef.current) return;
    setCoordinates({ lat, lng });
    if (markerRef.current) ((markerRef.current as Record<string, (arg: unknown) => void>).setMap)(null);
    const LatLng = maps.LatLng as new (lat: number, lng: number) => unknown;
    const Marker = maps.Marker as new (opts: unknown) => unknown;
    const marker = new Marker({ position: new LatLng(lat, lng), map: mapInstanceRef.current, draggable: true });
    const event = maps.event as Record<string, unknown>;
    (event.addListener as (target: unknown, type: string, cb: () => void) => void)(marker, 'dragend', () => {
      const pos = (marker as Record<string, () => Record<string, () => number>>).getPosition();
      const newLat = pos.getLat(), newLng = pos.getLng();
      setCoordinates({ lat: newLat, lng: newLng });
      updateCircle(newLat, newLng);
      reverseGeocode(newLat, newLng);
    });
    markerRef.current = marker;
    updateCircle(lat, lng);
    fetchNearbyCount(lat, lng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCircle = useCallback((lat: number, lng: number) => {
    const kakao = (window as Record<string, unknown>).kakao as Record<string, unknown>;
    const maps = kakao.maps as Record<string, unknown>;
    if (!mapInstanceRef.current) return;
    if (circleRef.current) ((circleRef.current as Record<string, (arg: unknown) => void>).setMap)(null);
    const LatLng = maps.LatLng as new (lat: number, lng: number) => unknown;
    const Circle = maps.Circle as new (opts: unknown) => unknown;
    circleRef.current = new Circle({
      center: new LatLng(lat, lng), radius: FIXED_RADIUS,
      strokeWeight: 2, strokeColor: '#2563EB', strokeOpacity: 0.8,
      fillColor: '#2563EB', fillOpacity: 0.12, map: mapInstanceRef.current,
    });
  }, []);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const kakao = (window as Record<string, unknown>).kakao as Record<string, unknown>;
    const maps = kakao.maps as Record<string, unknown>;
    const services = maps.services as Record<string, unknown>;
    const Geocoder = services.Geocoder as new () => Record<string, (lng: number, lat: number, cb: (result: Array<Record<string, Record<string, string> | null>>, status: string) => void) => void>;
    const geocoder = new Geocoder();
    const Status = services.Status as Record<string, string>;
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === Status.OK && result[0]) {
        setAddress(result[0].road_address?.address_name || result[0].address?.address_name || '');
      }
    });
    fetchNearbyCount(lat, lng);
  }, []);

  const fetchNearbyCount = useCallback((lat: number, lng: number) => {
    if (nearbyTimerRef.current) clearTimeout(nearbyTimerRef.current);
    nearbyTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/nearby?lat=${lat}&lng=${lng}&radius=${FIXED_RADIUS}`);
        const json = await res.json();
        const data = json.data || json;
        setNearbyCount(data.count ?? data.stores?.length ?? 0);
      } catch { setNearbyCount(null); }
    }, 500);
  }, []);

  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.length < 2) { setSearchResults([]); setShowResults(false); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/address?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setSearchResults((json.data || json).results || []);
        setShowResults(true);
      } catch { setSearchResults([]); }
    }, 300);
  }, []);

  const handleResultSelect = useCallback((result: { addressName: string; lat: number; lng: number }) => {
    setAddress(result.addressName);
    setSearchQuery(result.addressName);
    setCoordinates({ lat: result.lat, lng: result.lng });
    setShowResults(false);
    if (mapInstanceRef.current) {
      const kakao = (window as Record<string, unknown>).kakao as Record<string, unknown>;
      const maps = kakao.maps as Record<string, unknown>;
      const LatLng = maps.LatLng as new (lat: number, lng: number) => unknown;
      ((mapInstanceRef.current as Record<string, (arg: unknown) => void>).setCenter)(new LatLng(result.lat, result.lng));
      ((mapInstanceRef.current as Record<string, (arg: unknown) => void>).setLevel)(4 as unknown);
      placeMarker(result.lat, result.lng);
    }
  }, [placeMarker]);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) { alert('위치 서비스를 지원하지 않습니다.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocating(false);
        if (mapInstanceRef.current) {
          const kakao = (window as Record<string, unknown>).kakao as Record<string, unknown>;
          const maps = kakao.maps as Record<string, unknown>;
          const LatLng = maps.LatLng as new (lat: number, lng: number) => unknown;
          ((mapInstanceRef.current as Record<string, (arg: unknown) => void>).setCenter)(new LatLng(lat, lng));
          ((mapInstanceRef.current as Record<string, (arg: unknown) => void>).setLevel)(4 as unknown);
          placeMarker(lat, lng);
          reverseGeocode(lat, lng);
        }
      },
      (err) => { setLocating(false); alert(err.code === 1 ? '위치 권한을 허용해주세요.' : '위치를 찾을 수 없습니다.'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [placeMarker, reverseGeocode]);

  // 분석 시작
  const handleAnalyze = useCallback(async () => {
    if (!coordinates || !selectedCategory) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address || '분석 주소', lat: coordinates.lat, lng: coordinates.lng, businessCategory: selectedCategory }),
      });
      const json = await res.json();
      const reportData = json.data || json;
      const reportId = reportData.reportId || `temp-${Date.now()}`;
      localStorage.setItem('lastReport', JSON.stringify({
        reportId, address, businessCategory: selectedCategory,
        lat: coordinates.lat, lng: coordinates.lng,
        freeData: reportData.freeData || null,
      }));
      setTimeout(() => router.push(`/report/${reportId}`), 3500);
    } catch {
      localStorage.setItem('lastReport', JSON.stringify({
        reportId: 'demo', address, businessCategory: selectedCategory,
        lat: coordinates.lat, lng: coordinates.lng, freeData: null,
      }));
      setTimeout(() => router.push('/report/demo'), 3500);
    }
  }, [coordinates, selectedCategory, address, router]);

  // 로딩 화면
  if (isGenerating) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <LoadingProgress />
      </main>
    );
  }

  const canAnalyze = coordinates && selectedCategory;

  return (
    <main className="flex flex-col min-h-screen bg-white">

      {/* 지도 — 고정 높이, 스크롤과 분리 */}
      <div className="relative h-[45vh] min-h-[280px] max-h-[400px]">
        <div ref={mapRef} className="w-full h-full" />

        {/* 검색바 오버레이 */}
        <div className="absolute top-3 left-3 right-3 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              className="pl-10 pr-4 h-12 text-base bg-white/95 backdrop-blur rounded-xl shadow-lg border-0"
              placeholder="주소 또는 장소 검색"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-14 left-0 right-0 bg-white rounded-xl shadow-xl border max-h-60 overflow-y-auto z-20">
                {searchResults.map((r, i) => (
                  <button key={i} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 flex items-start gap-3" onClick={() => handleResultSelect(r)}>
                    <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{r.placeName || r.addressName}</div>
                      {r.roadAddressName && <div className="text-xs text-slate-400 mt-0.5">{r.roadAddressName}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 현재 위치 버튼 */}
        <button onClick={handleMyLocation} disabled={locating}
          className="absolute bottom-3 right-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition disabled:opacity-50">
          {locating ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Navigation className="h-4 w-4 text-blue-600" />}
        </button>
      </div>

      {/* 하단 패널 — 스크롤 가능한 영역 */}
      <div className="flex-1 bg-white rounded-t-[24px] -mt-4 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 space-y-5">

          {/* 선택된 위치 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-bold text-[15px] text-slate-800 truncate">
                {address || '지도를 터치하여 위치를 선택하세요'}
              </span>
            </div>
            {nearbyCount !== null && (
              <p className="text-xs text-slate-400 ml-6">반경 500m · 상가 {nearbyCount.toLocaleString()}개</p>
            )}
          </div>

          {/* 업종 선택 */}
          <div>
            <label className="text-sm font-bold text-slate-600 mb-2 block">분석 업종</label>
            <div className="relative">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full h-13 px-4 pr-10 rounded-xl border-2 border-slate-200 bg-white text-[15px] font-bold text-slate-800 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer transition-colors"
              >
                <option value="">업종을 선택하세요</option>
                {CATEGORIES.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 분석 시작 버튼 */}
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="w-full h-14 text-[16px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
          >
            {canAnalyze ? (
              <><Sparkles className="w-5 h-5 mr-2" /> AI 상권 분석 시작</>
            ) : (
              '위치와 업종을 선택하세요'
            )}
          </Button>

          {/* 안내 텍스트 */}
          <p className="text-[11px] text-slate-400 text-center">
            반경 500m · 142만개 점포 DB · Gemini AI 분석
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SearchContent />
    </Suspense>
  );
}
