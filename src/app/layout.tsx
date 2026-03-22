import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "명당노트 - 1페이지 상권 분석",
  description: "데이터로 검증하는 내 가게 자리. 상권 분석 리포트 자동 생성 서비스",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`}
          strategy="beforeInteractive"
        />
        <MobileHeader />
        <div className="pb-[60px] min-h-screen">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
