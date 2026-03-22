import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { generateAIAnalysis } from "@/lib/ai/gemini-analyst";
import type { AnalysisInput } from "@/lib/ai/gemini-analyst";

/**
 * POST /api/report/ai-analysis
 * Gemini AI 기반 상권 종합 분석 생성
 * 비로그인 허용 (유료 기능이지만 데모 목적)
 */
export async function POST(req: NextRequest) {
  try {
    const { lat, lng, address, businessCategory, radius = 500, userArea, userRent } = await req.json();

    if (!lat || !lng || !address || !businessCategory) {
      return NextResponse.json({ error: "lat, lng, address, businessCategory 필수" }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // 1. nearby_stores RPC로 주변 점포 조회
    const { data: allStores } = await supabase.rpc("nearby_stores", {
      target_lat: lat,
      target_lng: lng,
      radius_meters: radius,
    });

    const stores = allStores || [];
    const totalStores = stores.length;

    // 2. 동종업종 필터
    const sameCategoryStores = stores.filter((s: any) => {
      const cats = [s.business_category_large, s.business_category_medium, s.business_category_small].join(" ").toLowerCase();
      return cats.includes(businessCategory.toLowerCase()) || cats.includes(businessCategory);
    });

    const sameCategory = sameCategoryStores.length;
    const franchiseCount = sameCategoryStores.filter((s: any) => s.is_franchise).length;
    const franchiseRatio = sameCategory > 0 ? Math.round((franchiseCount / sameCategory) * 100) : 0;

    // 3. 생존 분석 (업력 기반)
    const now = new Date();
    let totalMonths = 0;
    let storesWithDate = 0;
    let recentOpenings = 0;
    let recentClosures = 0;

    for (const s of sameCategoryStores) {
      if (s.opened_at) {
        const opened = new Date(s.opened_at);
        const months = Math.max(0, (now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24 * 30));
        totalMonths += months;
        storesWithDate++;
        if (months <= 12) recentOpenings++;
      }
    }

    // 폐업 점포 조회 (같은 반경, 폐업 상태)
    const { data: closedStores } = await supabase
      .from("stores")
      .select("closed_at, opened_at, business_category_medium")
      .eq("status", "폐업")
      .not("closed_at", "is", null);

    // 간이 폐업 카운트 (전체 폐업 중 최근 1년)
    if (closedStores) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      recentClosures = closedStores.filter((s: any) => {
        if (!s.closed_at) return false;
        return new Date(s.closed_at) >= oneYearAgo;
      }).length;
      // 반경 제한 없이 전체라서 비율로 보정
      recentClosures = Math.min(recentClosures, Math.max(sameCategory, 5));
    }

    const avgBusinessMonths = storesWithDate > 0 ? Math.round(totalMonths / storesWithDate) : 24;

    // 3년 생존율 추정 (업력 36개월 이상 비율)
    const survived3y = sameCategoryStores.filter((s: any) => {
      if (!s.opened_at) return false;
      const months = (now.getTime() - new Date(s.opened_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return months >= 36;
    }).length;
    const survivalRate3y = sameCategory > 0 ? Math.round((survived3y / sameCategory) * 100) : 42;

    // 4. 경쟁 매장 리스트
    const competitors = sameCategoryStores.slice(0, 10).map((s: any) => ({
      name: s.store_name,
      category: s.business_category_small || s.business_category_medium || "",
      area: s.floor_area,
      openedAt: s.opened_at,
      isFranchise: s.is_franchise,
    }));

    // 5. 매출 추정 (간이)
    const baseRevenue = sameCategory > 0 ? Math.round(24000000 / Math.sqrt(sameCategory)) : 24000000;
    const estimatedRevenue = {
      min: Math.round(baseRevenue * 0.72),
      median: baseRevenue,
      max: Math.round(baseRevenue * 1.35),
    };

    // 6. Gemini AI 분석 요청
    const analysisInput: AnalysisInput = {
      address,
      businessCategory,
      radius,
      totalStores,
      sameCategory,
      franchiseCount,
      franchiseRatio,
      recentOpenings,
      recentClosures: Math.min(recentClosures, recentOpenings + 5), // 합리적 범위
      avgBusinessMonths,
      survivalRate3y,
      estimatedRevenue,
      competitors,
      userArea,
      userRent,
    };

    const aiAnalysis = await generateAIAnalysis(analysisInput);

    return NextResponse.json({
      data: {
        aiAnalysis,
        stats: {
          totalStores,
          sameCategory,
          franchiseCount,
          franchiseRatio,
          recentOpenings,
          recentClosures: analysisInput.recentClosures,
          avgBusinessMonths,
          survivalRate3y,
          estimatedRevenue,
        },
        competitors,
      },
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
