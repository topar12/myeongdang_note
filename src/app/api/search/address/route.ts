import { NextRequest } from "next/server";
import { z } from "zod";

import {
  ApiError,
  handleApiError,
  jsonOk,
  parseSearchParams,
  requireAuthenticatedUser,
} from "../../_lib/api-utils";

const addressSearchSchema = z.object({
  q: z.string().trim().min(2).max(120),
  size: z.coerce.number().int().min(1).max(15).default(8),
});

export async function GET(request: NextRequest) {
  try {
    // 주소 검색은 비로그인에서도 허용 (Free Tier 핵심 기능)
    const { q, size } = parseSearchParams(request, addressSearchSchema);
    const apiKey =
      process.env.KAKAO_REST_API_KEY ??
      process.env.KAKAO_LOCAL_REST_API_KEY ??
      process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

    if (!apiKey) {
      throw new ApiError(
        500,
        "카카오 로컬 API 키가 설정되지 않았습니다.",
        "missing_kakao_api_key",
      );
    }

    const addressResponse = await fetchKakaoAddressSearch(apiKey, q, size);
    const documents =
      addressResponse.documents.length > 0
        ? addressResponse.documents
        : (await fetchKakaoKeywordSearch(apiKey, q, size)).documents;

    return jsonOk({
      query: q,
      count: documents.length,
      results: documents.map((document) => ({
        addressName: document.address_name,
        roadAddressName: document.road_address?.address_name ?? null,
        jibunAddressName: document.address?.address_name ?? null,
        lat: Number(document.y),
        lng: Number(document.x),
        placeName: document.place_name ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function fetchKakaoAddressSearch(
  apiKey: string,
  query: string,
  size: number,
): Promise<KakaoSearchResponse> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");

  url.searchParams.set("query", query);
  url.searchParams.set("size", String(size));
  url.searchParams.set("analyze_type", "similar");

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "카카오 주소 검색 요청에 실패했습니다.",
      "kakao_address_search_failed",
      await safeReadErrorBody(response),
    );
  }

  return (await response.json()) as KakaoSearchResponse;
}

async function fetchKakaoKeywordSearch(
  apiKey: string,
  query: string,
  size: number,
): Promise<KakaoSearchResponse> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");

  url.searchParams.set("query", query);
  url.searchParams.set("size", String(size));

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "카카오 키워드 검색 요청에 실패했습니다.",
      "kakao_keyword_search_failed",
      await safeReadErrorBody(response),
    );
  }

  return (await response.json()) as KakaoSearchResponse;
}

async function safeReadErrorBody(response: Response): Promise<string | null> {
  try {
    return await response.text();
  } catch {
    return null;
  }
}

interface KakaoSearchResponse {
  documents: Array<{
    address_name: string;
    x: string;
    y: string;
    place_name?: string;
    road_address?: {
      address_name: string;
    } | null;
    address?: {
      address_name: string;
    } | null;
  }>;
}
