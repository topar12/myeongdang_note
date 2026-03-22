'use client';

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

const MESSAGES = [
  "인근 점포 데이터를 수집하고 있어요...",
  "경쟁 매장을 파악하는 중입니다...",
  "예상 매출을 계산하고 있어요...",
  "리포트를 예쁘게 꾸미는 중..."
];

export function LoadingProgress() {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    const msgTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 1500);

    return () => {
      clearInterval(timer);
      clearInterval(msgTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full h-64 gap-8">
      <div className="text-[22px] font-bold text-trust-blue animate-pulse text-center">
        {MESSAGES[messageIndex]}
      </div>
      <Progress value={progress} className="w-full max-w-sm h-4 bg-muted" />
      <div className="text-lg font-bold text-muted-foreground">
        {Math.round(progress)}%
      </div>
    </div>
  );
}
