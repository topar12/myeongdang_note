import { NextRequest } from "next/server";
import { z } from "zod";

import {
  handleApiError,
  jsonOk,
  parseSearchParams,
  requireAuthenticatedUser,
} from "../../_lib/api-utils";
import { fetchNearbyStores } from "../../_lib/report-analysis";

const nearbySearchSchema = z.object({
  lat: z.coerce.number().min(33).max(39.5),
  lng: z.coerce.number().min(124).max(132),
  radius: z.coerce.number().int().positive().max(3000).default(500),
  category: z.string().trim().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // 비로그인에서도 nearby 검색 허용 (Free Tier 핵심)
    let adminSupabase;
    try {
      const auth = await requireAuthenticatedUser(request);
      adminSupabase = auth.adminSupabase;
    } catch {
      const { createAdminSupabase } = await import("@/lib/supabase");
      adminSupabase = createAdminSupabase();
    }
    const { lat, lng, radius, category } = parseSearchParams(
      request,
      nearbySearchSchema,
    );
    const stores = await fetchNearbyStores(adminSupabase, {
      lat,
      lng,
      radiusMeters: radius,
      category,
    });

    return jsonOk({
      center: { lat, lng },
      radius,
      count: stores.length,
      stores,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
