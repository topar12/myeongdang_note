import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

interface SearchResult {
  addressName: string;
  roadAddressName: string | null;
  jibunAddressName: string | null;
  placeName: string | null;
  lat: number;
  lng: number;
}

interface AddressSearchProps {
  onSelect: (result: { address: string; lat: number; lng: number }) => void;
}

export function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search/address?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        const data = json.data?.results || json.results || [];
        setResults(data.slice(0, 5));
        setIsDropdownOpen(true);
      } catch (error) {
        console.error("Address search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    const address = item.placeName || item.roadAddressName || item.addressName;
    setQuery(address);
    setIsDropdownOpen(false);
    onSelect({ address, lat: item.lat, lng: item.lng });
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("현재 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`/api/search/address?q=${latitude},${longitude}`);
          if (!res.ok) throw new Error('API Error');
          const json = await res.json();
          const data = json.data?.results || json.results || [];
          
          if (data.length > 0) {
            const item = data[0];
            const address = item.roadAddressName || item.addressName;
            setQuery(address);
            onSelect({ address, lat: item.lat, lng: item.lng });
          } else {
            alert("현재 위치의 주소를 찾을 수 없습니다.");
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          alert("위치 정보를 주소로 변환하는 데 실패했습니다.");
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLoading(false);
        alert("위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full relative" ref={dropdownRef}>
      <div className="relative flex items-center w-full">
        <Search className="absolute left-4 h-6 w-6 text-muted-foreground" />
        <Input 
          className="pl-12 pr-12 h-[56px] text-lg rounded-xl shadow-sm border-2 border-border focus-visible:ring-trust-blue focus-visible:border-trust-blue"
          placeholder="분석할 상가 주소를 입력하세요"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsDropdownOpen(true);
          }}
        />
        {isLoading && <Loader2 className="absolute right-4 h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {isDropdownOpen && results.length > 0 && (
        <div className="absolute top-[64px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100">
          {results.map((item, idx) => (
            <button
              key={idx}
              className="w-full text-left px-5 py-3.5 hover:bg-blue-50/50 flex flex-col gap-1 transition-colors"
              onClick={() => handleSelect(item)}
            >
              <div className="font-bold text-slate-800 text-base">
                {item.placeName || item.roadAddressName || item.addressName}
              </div>
              {item.placeName && (
                <div className="text-sm text-slate-500 font-medium">
                  {item.roadAddressName || item.addressName}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 w-full">
        <Button 
          variant="outline" 
          className="flex-1 h-[48px] text-base font-bold border-trust-blue/30 text-trust-blue hover:bg-trust-blue/5 rounded-xl transition-all shadow-sm"
          onClick={handleCurrentLocation}
          disabled={isLoading}
        >
          <MapPin className="h-5 w-5 mr-2" />
          현재 위치로 찾기
        </Button>
      </div>
    </div>
  );
}
