import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

type TokenClaims = {
  exp?: number;
  email?: string;
  name?: string;
  nickname?: string;
  sub?: string;
};

export type StaffSession = {
  token: string;
  user: {
    email?: string;
    name?: string;
    subject?: string;
  };
};

function decodeClaims(token: string): TokenClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as TokenClaims;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<StaffSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const claims = decodeClaims(token);
  if (!claims || (claims.exp && claims.exp * 1000 <= Date.now())) return null;

  return {
    token,
    user: {
      email: claims.email,
      name: claims.name ?? claims.nickname ?? claims.email,
      subject: claims.sub,
    },
  };
}
