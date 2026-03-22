import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Check, Info } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pb-20">
      <div className="px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-2">명당노트 요금제</h1>
        <p className="text-center text-muted-foreground mb-8">
          합리적인 가격으로 상권의 진짜 가치를 확인하세요
        </p>

        {/* 앵커링 효과: 고가 플랜 최상단 배치 */}
        <div className="mb-10 w-full max-w-md mx-auto">
          <Card className="border-border shadow-sm bg-white overflow-hidden opacity-90">
            <div className="bg-slate-800 text-white text-center py-2 text-sm font-bold">
              중개법인 / 프랜차이즈 전용
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">B2B 프로 플랜</CardTitle>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold">₩150,000</span>
                <span className="text-muted-foreground ml-1">/월</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-5 w-5 text-trust-blue shrink-0" />
                  <span>자체 브랜드 로고/색상 커스텀 리포트</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-5 w-5 text-trust-blue shrink-0" />
                  <span>커스텀 도메인 (CNAME) 지원</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full text-base h-12">도입 문의하기</Button>
            </CardFooter>
          </Card>
        </div>

        {/* 핵심 3종 요금제 (세로 스택) */}
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
          
          {/* 카드 1: 베이직 */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">베이직</CardTitle>
              <CardDescription>동네 상권의 기초적인 흐름 파악</CardDescription>
              <div className="flex items-baseline mt-4">
                <span className="text-3xl font-extrabold">₩0</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-slate-400" />
                  <span>상권 온도 스코어</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-slate-400" />
                  <span>피크타임 Top-3</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-slate-400" />
                  <span>경쟁 포화도 요약</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-slate-400" />
                  <span>카카오톡 공유 (워터마크 포함)</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/search" className="w-full">
                <Button variant="outline" className="w-full text-base h-12 font-bold">
                  무료로 시작하기
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* 카드 2: 싱글 리포트 (디코이 효과/추천 강조) */}
          <Card className="border-2 border-trust-blue shadow-lg relative transform scale-[1.02] bg-white z-10">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2">
              <Badge className="bg-trust-blue text-white px-3 py-1 text-sm font-bold border-none shadow-sm">
                BEST / 런칭 기념 50% 할인
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <CardTitle className="text-2xl text-trust-blue">싱글 리포트</CardTitle>
              <CardDescription>단 하나의 완벽한 1페이지 처방전</CardDescription>
              <div className="flex items-baseline mt-4 gap-2">
                <span className="text-xl text-muted-foreground line-through decoration-warning-red decoration-2">₩9,900</span>
                <span className="text-4xl font-extrabold text-foreground">₩4,900</span>
                <span className="text-muted-foreground">/건</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-trust-blue mb-3">Free 플랜의 모든 기능 포함 +</div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-trust-blue shrink-0" />
                  <span className="font-medium">상세 예상 월매출 범위 (P25~P75)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-trust-blue shrink-0" />
                  <span className="font-medium">임대료 감당력 시뮬레이션 (손익분기점)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-trust-blue shrink-0" />
                  <span className="font-medium">폐업 리스크 점수 및 원인 분석</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-trust-blue shrink-0" />
                  <span className="font-medium">고화질 PDF 다운로드</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full text-lg h-14 font-bold bg-trust-blue hover:bg-trust-blue/90 text-white shadow-md">
                ☕ 커피 한 잔 값으로 분석하기
              </Button>
            </CardFooter>
          </Card>

          {/* 카드 3: 로컬 패스 */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">로컬 패스 (구독)</CardTitle>
              <CardDescription>내 영업 구역을 완벽하게 장악하세요</CardDescription>
              <div className="flex items-baseline mt-4">
                <span className="text-3xl font-extrabold">₩29,000</span>
                <span className="text-muted-foreground ml-1">/월</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-slate-600 mb-3">싱글 리포트의 모든 기능 포함 +</div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-5 w-5 text-slate-400 shrink-0" />
                  <span>특정 행정동 1개 무제한 분석</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-5 w-5 text-slate-400 shrink-0" />
                  <span>매주 상권 변화 알림 메일</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full text-base h-12 font-bold border-2">한 달 무료 체험</Button>
            </CardFooter>
          </Card>

        </div>

        {/* 손실회피 메시지 */}
        <div className="mt-12 mb-8 w-full max-w-md mx-auto bg-warning-red/5 border border-warning-red/20 rounded-xl p-5 flex items-start gap-4">
          <Info className="h-8 w-8 text-warning-red shrink-0" />
          <p className="text-base text-slate-800 leading-relaxed">
            정확한 데이터 없이 직감으로 창업했다가 날리는 비용 평균 <strong className="text-warning-red font-extrabold">5,000만원.</strong><br/>
            단돈 ₩4,900으로 그 막대한 위험을 사전에 방어하세요.
          </p>
        </div>

        {/* FAQ 섹션 */}
        <div className="mt-12 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-6 px-2">자주 묻는 질문</h2>
          <Accordion className="w-full bg-white rounded-xl border px-4 shadow-sm">
            <AccordionItem value="item-1" className="border-b-slate-100">
              <AccordionTrigger className="text-lg font-bold py-4 hover:no-underline">환불은 가능한가요?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                결제 후 상세 리포트 데이터(블러 해제)를 열람하거나 PDF를 다운로드한 경우에는 디지털 콘텐츠 특성상 환불이 불가능합니다. 결제만 하고 열람하지 않으신 경우 7일 이내 전액 환불해 드립니다.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-b-slate-100">
              <AccordionTrigger className="text-lg font-bold py-4 hover:no-underline">어떤 데이터를 사용하나요?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                소상공인시장진흥공단, 지방행정인허가데이터, 통계청 등 공공데이터를 기반으로 자체 구축한 허프 확률 모델 알고리즘을 통해 예상 매출 및 상권 분석 결과를 제공합니다.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-none">
              <AccordionTrigger className="text-lg font-bold py-4 hover:no-underline">정확도는 어느 정도인가요?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                공공데이터의 시차와 추정 모델의 특성상 100%의 정확도를 보장할 수는 없습니다. 다만, 주변 상권의 거시적인 흐름, 위험도, 손익분기점의 <strong>최소 달성 기준</strong>을 파악하여 리스크를 줄이는 데 가장 효과적인 참고 자료가 됩니다.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </main>
  );
}
