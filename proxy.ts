import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_REFRESH_COOKIE_NAME,
  SESSION_RENEW_AT_COOKIE_NAME,
} from "@/lib/session-cookie";
import {
  type AuthTokenResponse,
  authTokenResponseSchema,
  clearSessionCookies,
  renewalEpochSeconds,
  setSessionCookies,
} from "@/lib/session-tokens";

const backendBaseUrl =
  process.env.BACKEND_API_URL?.trim() || "http://localhost:8080";
const renewalMarginSeconds = 60;

function jwtExpiration(token: string | undefined) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

function sessionExpiration(request: NextRequest, accessToken?: string) {
  const jwtExpiresAt = jwtExpiration(accessToken);
  const storedValue = Number(
    request.cookies.get(SESSION_RENEW_AT_COOKIE_NAME)?.value,
  );
  const storedExpiresAt = Number.isSafeInteger(storedValue) && storedValue > 0
    ? storedValue
    : null;
  if (jwtExpiresAt && storedExpiresAt) {
    return Math.min(jwtExpiresAt, storedExpiresAt);
  }
  return jwtExpiresAt ?? storedExpiresAt;
}

function unauthenticated(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { message: "La sesión expiró.", status: 401 },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

function refreshUnavailable(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { message: "No pudimos renovar la sesión. Intentá nuevamente.", status: 503 },
      { status: 503 },
    );
  }
  return new NextResponse("No pudimos renovar la sesión. Intentá nuevamente.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function continueWithRotatedSession(
  request: NextRequest,
  tokens: AuthTokenResponse,
) {
  const renewAt = renewalEpochSeconds(tokens.renovarTokenEn);
  request.cookies.set(SESSION_COOKIE_NAME, tokens.token);
  request.cookies.set(SESSION_REFRESH_COOKIE_NAME, tokens.refreshToken);
  request.cookies.set(SESSION_RENEW_AT_COOKIE_NAME, String(renewAt));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", request.cookies.toString());
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  setSessionCookies(response, tokens, renewAt);
  return response;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(SESSION_REFRESH_COOKIE_NAME)?.value;
  const expiresAt = sessionExpiration(request, accessToken);
  const now = Math.floor(Date.now() / 1000);
  const accessTokenUsable = Boolean(accessToken && expiresAt && expiresAt > now);
  const renewalDue = !expiresAt || expiresAt <= now + renewalMarginSeconds;

  if (accessTokenUsable && !renewalDue) return NextResponse.next();
  if (!refreshToken) return unauthenticated(request);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(new URL("/api/renovar", backendBaseUrl), {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return accessTokenUsable
      ? NextResponse.next()
      : refreshUnavailable(request);
  }

  if (!backendResponse.ok) {
    if (backendResponse.status === 401) {
      const response = unauthenticated(request);
      clearSessionCookies(response);
      return response;
    }
    return accessTokenUsable
      ? NextResponse.next()
      : refreshUnavailable(request);
  }

  const parsed = authTokenResponseSchema.safeParse(
    await backendResponse.json().catch(() => null),
  );
  if (!parsed.success) {
    return accessTokenUsable
      ? NextResponse.next()
      : refreshUnavailable(request);
  }

  return continueWithRotatedSession(request, parsed.data);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/recepcion/:path*",
    "/medico/:path*",
    "/api/staff/:path*",
  ],
};
