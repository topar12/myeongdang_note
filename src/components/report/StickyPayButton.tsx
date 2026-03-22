import { Button } from "@/components/ui/button";

interface StickyPayButtonProps {
  onClick: () => void;
  label?: string;
}

export function StickyPayButton({ onClick, label = "☕ 커피 한 잔 값으로 분석하기" }: StickyPayButtonProps) {
  return (
    <div className="sticky bottom-[60px] left-0 w-full p-4 bg-background/80 backdrop-blur-md border-t z-40">
      <Button 
        className="w-full h-[56px] text-lg font-bold bg-trust-blue hover:bg-trust-blue/90 text-white shadow-lg rounded-xl"
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  );
}
