import { NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, handleApiError, jsonOk, requireAuthenticatedUser } from "../../../_lib/api-utils";
import {
  fetchOwnedReport,
  mapReportRowToResponse,
  resolveReportAccess,
} from "../../../_lib/report-analysis";

const reportIdSchema = z.object({
  id: z.uuid(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, adminSupabase } = await requireAuthenticatedUser(request);
    const rawParams = await context.params;
    const { id } = reportIdSchema.parse(rawParams);
    const reportRow = await fetchOwnedReport(adminSupabase, id, user.id);
    const hasPaidAccess = await resolveReportAccess(
      adminSupabase,
      reportRow,
      user.id,
    );

    if (!hasPaidAccess) {
      throw new ApiError(
        402,
        "PDF 다운로드는 결제 또는 구독 후 이용할 수 있습니다.",
        "payment_required",
      );
    }

    const report = mapReportRowToResponse(reportRow, true);

    return jsonOk({
      reportId: report.id,
      status: "placeholder",
      generatedAt: new Date().toISOString(),
      message: "PDF 생성 기능은 추후 Puppeteer 연동으로 대체될 예정입니다.",
      report,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
