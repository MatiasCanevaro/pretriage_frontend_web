"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const secciones = [
  { id: "metricas-summary", label: "Resumen" },
  { id: "metricas-distribucion", label: "Distribuciones" },
  { id: "metricas-serie", label: "Serie diaria" },
];

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Navegación de la página de métricas: vuelta a Administración + anclas in-page. */
export function HospitalMetricsNavigation({ hospitalId }: { hospitalId: number }) {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const activeId = secciones.find((item) => `#${item.id}` === hash)?.id ?? secciones[0].id;

  return (
    <>
      <Link className="nav-item nav-subitem" href={`/admin/hospital?hospitalId=${hospitalId}`}>
        <span className="nav-dot" aria-hidden="true" />Administración
      </Link>
      {secciones.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={`nav-item nav-subitem${activeId === id ? " nav-item-active" : ""}`}
          aria-current={activeId === id ? "location" : undefined}
          onClick={() => document.getElementById(id)?.focus({ preventScroll: true })}
        >
          <span className="nav-dot" aria-hidden="true" />{label}
        </a>
      ))}
    </>
  );
}
