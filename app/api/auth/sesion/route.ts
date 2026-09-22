import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Sonda liviana de sesión para la guardia anti-atrás del navegador.
// No expone tokens ni datos clínicos, solo si hay sesión válida.
export const dynamic = "force-dynamic";

function conCabecerasSinCache(respuesta: NextResponse) {
  respuesta.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  respuesta.headers.set("Pragma", "no-cache");
  respuesta.headers.set("Expires", "0");
  return respuesta;
}

export async function GET() {
  const sesion = await getSession();
  if (!sesion) {
    return conCabecerasSinCache(
      NextResponse.json({ autenticado: false }, { status: 401 }),
    );
  }
  return conCabecerasSinCache(
    NextResponse.json({ autenticado: true }),
  );
}
