import type { AnalysisInput } from "@/lib/ai/gemini-analyst";
import type { GenerateReportRequest } from "@/types";

import { generateAIAnalysis } from "@/lib/ai/gemini-analyst";
import { createAdminSupabase } from "@/lib/supabase";

import { handleApiError, jsonOk } from "../../_lib/api-utils";
import { buildReportAnalysis } from "../../_lib/report-analysis";

const DEMO_REQUEST: GenerateReportRequest = {
  lat: 36.3525,
  lng: 127.3858,
  address: "대전 서구 둔산동",
  businessCategory: "카페",
};

const DEMO_REPORT_ID = "demo-daejeon-dunsan-cafe";
const DEMO_CACHE_TTL_MS = 30 * 60 * 1000;

interface DemoCacheEntry {
  expiresAt: number;
  payload: ReturnType<typeof buildDemoPayload>;
}

let demoCache: DemoCacheEntry | null = null;

export async function GET() {
  try {
    if (demoCache && demoCache.expiresAt > Date.now()) {
      return jsonOk({
        ...demoCache.payload,
        cache: {
          hit: true,
          expiresAt: new Date(demoCache.expiresAt).toISOString(),
        },
      });
    }

    const adminSupabase = createAdminSupabase();
    const analysis = await buildReportAnalysis(
      adminSupabase,
      DEMO_REQUEST,
      "anonymous",
    );
    const aiAnalysis = await generateAIAnalysis(buildAIInput(analysis));
    const payload = buildDemoPayload(analysis, aiAnalysis);

    demoCache = {
      expiresAt: Date.now() + DEMO_CACHE_TTL_MS,
      payload,
    };

    return jsonOk({
      ...payload,
      cache: {
        hit: false,
        expiresAt: new Date(demoCache.expiresAt).toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function buildDemoPayload(
  analysis: Awaited<ReturnType<typeof buildReportAnalysis>>,
  aiAnalysis?: string,
) {
  return {
    reportId: DEMO_REPORT_ID,
    lat: DEMO_REQUEST.lat,
    lng: DEMO_REQUEST.lng,
    address: DEMO_REQUEST.address,
    businessCategory: DEMO_REQUEST.businessCategory,
    freeData: analysis.freeData,
    paidData: analysis.paidData,
    aiAnalysis: aiAnalysis ?? null,
    isPaid: false as const,
    generatedAt: new Date().toISOString(),
  };
}

function buildAIInput(
  analysis: Awaited<ReturnType<typeof buildReportAnalysis>>,
): AnalysisInput {
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const recentEvents = analysis.paidData.openCloseTimeline.filter((event) => {
    const timestamp = Date.parse(event.date);
    return Number.isFinite(timestamp) && timestamp >= oneYearAgo;
  });
  const recentOpenings = recentEvents.filter((event) => event.type === "open").length;
  const recentClosures = recentEvents.filter((event) => event.type === "close").length;

  return {
    address: DEMO_REQUEST.address,
    businessCategory: DEMO_REQUEST.businessCategory,
    radius: 500,
    totalStores: analysis.nearbyStores.length,
    sameCategory: analysis.freeData.competition.sameCategory,
    franchiseCount: analysis.paidData.franchiseAnalysis.count,
    franchiseRatio: Math.round(analysis.paidData.franchiseAnalysis.ratio * 100),
    recentOpenings,
    recentClosures,
    avgBusinessMonths: Math.round(analysis.freeData.survivalStats.avgMonths),
    survivalRate3y: Math.round(analysis.freeData.survivalStats.rate3y * 100),
    estimatedRevenue: analysis.paidData.revenue,
    competitors: analysis.paidData.competitorList.slice(0, 10).map((competitor) => ({
      name: competitor.name,
      category: DEMO_REQUEST.businessCategory,
      area: competitor.area,
      openedAt: competitor.openedAt,
      isFranchise: competitor.isFranchise,
      distance: competitor.distance,
    })),
    population: analysis.districtStats?.population,
    userArea: analysis.paidData.areaSurvival.userArea,
  };
}
