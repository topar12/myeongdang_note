import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlurOverlayProps {
  children: ReactNode;
  onUnlock?: () => void;
  priceText?: string;
  title?: string;
}

export function BlurOverlay({ children, onUnlock, priceText = "₩4,900", title = "이 매장의 예상 월 매출이 궁금하신가요?" }: BlurOverlayProps) {
  return (
    <div className="relative overflow-hidden w-full">
      <div className="pointer-events-none filter blur-[8px] select-none opacity-50 transition-all duration-300">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-t from-background/90 via-background/60 to-transparent p-6 text-center">
        <div className="flex flex-col items-center gap-4 bg-background/95 p-6 rounded-card shadow-card w-full max-w-sm border mt-auto mb-10">
          <Lock className="h-10 w-10 text-trust-blue" />
          <h3 className="text-[20px] font-bold">{title}</h3>
          <Button 
            className="w-full h-[56px] bg-trust-blue hover:bg-trust-blue/90 text-white font-bold text-base" 
            onClick={onUnlock}
            size="lg"
          >
            ☕ 커피 한 잔 값으로 전체 분석 보기 ({priceText})
          </Button>
        </div>
      </div>
    </div>
  );
}
