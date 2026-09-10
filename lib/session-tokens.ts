import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAMES,
  SESSION_REFRESH_COOKIE_NAME,
  SESSION_RENEW_AT_COOKIE_NAME,
} from "@/lib/session-cookie";

export const authTokenResponseSchema = z.object({
  token: z.string().min(20),
  refreshToken: z.string().min(20),
  renovarTokenEn: z.coerce.number().int().positive(),
});

export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  priority: "high" as const,
};

export function renewalEpochSeconds(
  expiresInSeconds: number,
  now = Date.now(),
) {
  return Math.floor(now / 1000) + expiresInSeconds;
}

export function setSessionCookies(
  response: NextResponse,
  tokens: AuthTokenResponse,
  renewAt = renewalEpochSeconds(tokens.renovarTokenEn),
) {
  response.cookies.set({
    ...cookieOptions,
    name: SESSION_COOKIE_NAME,
    value: tokens.token,
  });
  response.cookies.set({
    ...cookieOptions,
    name: SESSION_REFRESH_COOKIE_NAME,
    value: tokens.refreshToken,
  });
  response.cookies.set({
    ...cookieOptions,
    name: SESSION_RENEW_AT_COOKIE_NAME,
    value: String(renewAt),
  });
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.set({
      ...cookieOptions,
      name,
      value: "",
      maxAge: 0,
    });
  }
}
