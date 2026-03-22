import { NextRequest } from "next/server";
import { z } from "zod";

import type { GenerateReportRequest } from "@/types";

import {
  handleApiError,
  jsonOk,
  parseJsonBody,
  requireAuthenticatedUser,
} from "../../_lib/api-utils";
import {
  buildReportAnalysis,
  createReportRecord,
} from "../../_lib/report-analysis";

const generateReportSchema = z
  .object({
    lat: z.number().min(33).max(39.5),
    lng: z.number().min(124).max(132),
    address: z.string().trim().min(5).max(500),
    businessCategory: z.string().trim().min(1).max(100),
    businessSubCategory: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    // Free Tier: 비로그인에서도 리포트 생성 허용 (Paid 기능만 인증 필요)
    let userId = "anonymous";
    let adminSupabase;
    try {
      const auth = await requireAuthenticatedUser(request);
      userId = auth.user.id;
      adminSupabase = auth.adminSupabase;
    } catch {
      // 비로그인 — admin client 직접 생성
      const { createAdminSupabase } = await import("@/lib/supabase");
      adminSupabase = createAdminSupabase();
    }
    const payload = (await parseJsonBody(
      request,
      generateReportSchema,
    )) as GenerateReportRequest;
    const analysis = await buildReportAnalysis(adminSupabase, payload, userId);

    // 비로그인 시 DB 저장 건너뛰고 분석 결과만 반환
    if (userId === "anonymous") {
      return jsonOk(
        {
          reportId: `temp-${Date.now()}`,
          freeData: analysis.freeData,
          paidData: analysis.paidData,
          isPaid: false,
        },
        201,
      );
    }

    const report = await createReportRecord(adminSupabase, userId, payload, analysis);

    return jsonOk(
      {
        reportId: report.id,
        freeData: analysis.freeData,
        paidData: analysis.paidData,
        isPaid: report.isPaid,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
