import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/session-tokens";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const respuesta = NextResponse.redirect(new URL("/login", request.url), 303);
  clearSessionCookies(respuesta);
  // Impide que el navegador restaure la pantalla anterior con la flecha atrás.
  respuesta.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  respuesta.headers.set("Pragma", "no-cache");
  respuesta.headers.set("Expires", "0");
  return respuesta;
}
