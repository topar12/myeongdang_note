import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

/**
 * POST /api/payment/confirm
 * 토스페이먼츠 결제 승인 요청
 * 프론트에서 결제 완료 후 paymentKey, orderId, amount를 전달
 */
export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount, reportId, paymentType } =
      await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: "paymentKey, orderId, amount는 필수입니다." },
        { status: 400 }
      );
    }

    // 토스페이먼츠 결제 승인 API 호출
    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY!;
    const encryptedSecretKey =
      "Basic " + Buffer.from(secretKey + ":").toString("base64");

    const tossResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: encryptedSecretKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      }
    );

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      return NextResponse.json(
        { error: tossData.message || "결제 승인 실패" },
        { status: tossResponse.status }
      );
    }

    // Supabase에 결제 기록 저장
    const supabase = createServerSupabase();

    // 인증 확인
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "유효하지 않은 인증입니다." },
        { status: 401 }
      );
    }

    // payments 테이블에 기록
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      report_id: reportId || null,
      payment_type: paymentType || "single",
      amount,
      payment_key: paymentKey,
      status: "completed",
    });

    if (insertError) {
      console.error("결제 기록 저장 실패:", insertError);
      // 결제는 이미 승인됨 - 기록 실패는 로그만
    }

    // 단건 결제인 경우 리포트 is_paid 업데이트
    if (paymentType === "single" && reportId) {
      await supabase
        .from("reports")
        .update({ is_paid: true })
        .eq("id", reportId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      payment: {
        paymentKey: tossData.paymentKey,
        orderId: tossData.orderId,
        status: tossData.status,
        approvedAt: tossData.approvedAt,
      },
    });
  } catch (error) {
    console.error("결제 승인 처리 에러:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
