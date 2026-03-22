import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError, type ZodTypeAny } from "zod";

import { createAdminSupabase, createServerSupabase } from "@/lib/supabase";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    code = "api_error",
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface AuthContext {
  user: User;
  accessToken: string;
  adminSupabase: ReturnType<typeof createAdminSupabase>;
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    throw new ApiError(400, "유효한 JSON 본문이 필요합니다.", "invalid_json", error);
  }

  return schema.parse(payload);
}

export function parseSearchParams<TSchema extends ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): z.output<TSchema> {
  const payload: Record<string, string> = {};

  request.nextUrl.searchParams.forEach((value, key) => {
    payload[key] = value;
  });

  return schema.parse(payload);
}

export async function requireAuthenticatedUser(
  request: NextRequest,
): Promise<AuthContext> {
  const accessToken = extractAccessToken(request);

  if (!accessToken) {
    throw new ApiError(401, "로그인이 필요합니다.", "unauthorized");
  }

  const serverSupabase = createServerSupabase();
  const { data, error } = await serverSupabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new ApiError(
      401,
      "유효하지 않은 인증 토큰입니다.",
      "unauthorized",
      error,
    );
  }

  return {
    user: data.user,
    accessToken,
    adminSupabase: createAdminSupabase(),
  };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "입력값 검증에 실패했습니다.",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
      { status: error.status },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "internal_server_error",
        message: "서버 내부 오류가 발생했습니다.",
      },
    },
    { status: 500 },
  );
}

export function jsonOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

function extractAccessToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();

    if (isJwt(token)) {
      return token;
    }
  }

  const directCookieNames = [
    "sb-access-token",
    "supabase-access-token",
    "access-token",
  ];

  for (const cookieName of directCookieNames) {
    const cookieValue = request.cookies.get(cookieName)?.value;
    const token = cookieValue ? extractTokenFromSerializedValue(cookieValue) : null;

    if (token) {
      return token;
    }
  }

  const groupedCookieChunks = new Map<
    string,
    Array<{ index: number; value: string }>
  >();

  for (const cookie of request.cookies.getAll()) {
    if (!/auth-token|access-token/i.test(cookie.name)) {
      continue;
    }

    const match = cookie.name.match(/^(.*?)(?:\.(\d+))?$/);

    if (!match) {
      continue;
    }

    const baseName = match[1] ?? cookie.name;
    const chunkIndex = Number(match[2] ?? 0);
    const bucket = groupedCookieChunks.get(baseName) ?? [];

    bucket.push({
      index: chunkIndex,
      value: cookie.value,
    });
    groupedCookieChunks.set(baseName, bucket);
  }

  for (const chunks of groupedCookieChunks.values()) {
    const serialized = chunks
      .sort((left, right) => left.index - right.index)
      .map((chunk) => chunk.value)
      .join("");
    const token = extractTokenFromSerializedValue(serialized);

    if (token) {
      return token;
    }
  }

  return null;
}

function extractTokenFromSerializedValue(value: string): string | null {
  const decodedCandidates = [value];

  try {
    decodedCandidates.push(decodeURIComponent(value));
  } catch {
    // Ignore malformed URI sequences and continue with raw value.
  }

  for (const candidate of decodedCandidates) {
    const trimmed = candidate.trim().replace(/^"|"$/g, "");

    if (isJwt(trimmed)) {
      return trimmed;
    }

    const regexToken =
      /"access_token"\s*:\s*"([^"]+)"|"currentSession"\s*:\s*\{[^}]*"access_token"\s*:\s*"([^"]+)"/.exec(
        trimmed,
      );

    if (regexToken?.[1] && isJwt(regexToken[1])) {
      return regexToken[1];
    }

    if (regexToken?.[2] && isJwt(regexToken[2])) {
      return regexToken[2];
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const token = extractTokenFromUnknown(parsed);

      if (token) {
        return token;
      }
    } catch {
      // Ignore JSON parsing failures.
    }
  }

  return null;
}

function extractTokenFromUnknown(value: unknown): string | null {
  if (typeof value === "string") {
    return isJwt(value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = extractTokenFromUnknown(item);

      if (token) {
        return token;
      }
    }

    return null;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const directToken = record.access_token;

    if (typeof directToken === "string" && isJwt(directToken)) {
      return directToken;
    }

    const nestedTargets = [
      record.currentSession,
      record.session,
      record.user,
      record.data,
    ];

    for (const nested of nestedTargets) {
      const token = extractTokenFromUnknown(nested);

      if (token) {
        return token;
      }
    }
  }

  return null;
}

function isJwt(value: string): boolean {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value);
}
