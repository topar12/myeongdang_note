import { NextRequest } from "next/server";
import { z } from "zod";

import {
  handleApiError,
  jsonOk,
  requireAuthenticatedUser,
} from "../../_lib/api-utils";
import {
  fetchOwnedReport,
  mapReportRowToResponse,
  resolveReportAccess,
} from "../../_lib/report-analysis";

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
    const report = mapReportRowToResponse(reportRow, hasPaidAccess);

    return jsonOk({
      report,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
