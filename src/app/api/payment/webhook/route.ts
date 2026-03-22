import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

/**
 * POST /api/payment/webhook
 * 토스페이먼츠 웹훅 수신 (결제 상태 변경 알림)
 * 환불, 취소 등 비동기 이벤트 처리
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, data } = body;

    const supabase = createAdminSupabase();

    switch (eventType) {
      case "PAYMENT_STATUS_CHANGED": {
        const { paymentKey, status } = data;

        if (status === "CANCELED" || status === "PARTIAL_CANCELED") {
          // 환불 처리
          await supabase
            .from("payments")
            .update({ status: "refunded" })
            .eq("payment_key", paymentKey);

          // 리포트 is_paid 복구
          const { data: payment } = await supabase
            .from("payments")
            .select("report_id")
            .eq("payment_key", paymentKey)
            .single();

          if (payment?.report_id) {
            await supabase
              .from("reports")
              .update({ is_paid: false })
              .eq("id", payment.report_id);
          }
        }
        break;
      }

      default:
        // 처리하지 않는 이벤트는 무시
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("웹훅 처리 에러:", error);
    return NextResponse.json(
      { error: "웹훅 처리 실패" },
      { status: 500 }
    );
  }
}
