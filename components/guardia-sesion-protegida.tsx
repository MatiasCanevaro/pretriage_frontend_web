"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Guardia anti-atrás para pantallas con datos sensibles.
// Si el navegador restaura la página desde bfcache sin sesión válida,
// limpia el estado local y redirige al login sin mostrar nada previo.
export function GuardiaSesionProtegida() {
  const clienteConsultas = useQueryClient();

  useEffect(() => {
    let cancelado = false;

    async function verificarSesion() {
      let respuesta: Response | null = null;
      try {
        respuesta = await fetch("/api/auth/sesion", {
          cache: "no-store",
          credentials: "same-origin",
        });
      } catch {
        // Sin red no redirigimos: el servidor lo hará al navegar.
        return;
      }
      if (respuesta.status === 401 && !cancelado) {
        clienteConsultas.clear();
        try {
          sessionStorage.clear();
        } catch {
          // Ignorar si el almacenamiento no está disponible.
        }
        window.location.replace("/login");
      }
    }

    function alMostrarPagina(evento: PageTransitionEvent) {
      // persisted=true indica restauración desde bfcache (flecha atrás/adelante).
      if (evento.persisted) void verificarSesion();
    }

    window.addEventListener("pageshow", alMostrarPagina);
    return () => {
      cancelado = true;
      window.removeEventListener("pageshow", alMostrarPagina);
    };
  }, [clienteConsultas]);

  return null;
}
