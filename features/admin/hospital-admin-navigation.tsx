"use client";

import { useSyncExternalStore } from "react";

const sections = [
  { id: "admin-invite", label: "Invitar personal" },
  { id: "hospital-configuration-heading", label: "Especialidades y salas" },
  { id: "admin-personnel", label: "Personal" },
  { id: "admin-invitations", label: "Invitaciones" },
  { id: "admin-audit", label: "Auditoría" },
];

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function HospitalAdminNavigation() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const activeId = sections.find((item) => `#${item.id}` === hash)?.id ?? sections[0].id;

  return sections.map(({ id, label }) => (
    <a
      key={id}
      href={`#${id}`}
      className={`nav-item nav-subitem${activeId === id ? " nav-item-active" : ""}`}
      aria-current={activeId === id ? "location" : undefined}
      onClick={() => document.getElementById(id)?.focus({ preventScroll: true })}
    >
      <span className="nav-dot" aria-hidden="true" />{label}
    </a>
  ));
}
