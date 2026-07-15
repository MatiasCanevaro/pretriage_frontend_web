"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";
import type { HospitalRole, StaffMembership } from "@/lib/staff-context";

const roleDetails: Partial<Record<HospitalRole, { label: string; description: string; short: string }>> = {
  RECEPCIONISTA: {
    label: "Recepción",
    description: "Registrar pacientes y completar el pretriaje presencial.",
    short: "R",
  },
  MEDICO: {
    label: "Atención médica",
    description: "Gestionar la cola, llamar pacientes y finalizar atenciones.",
    short: "M",
  },
  ADMIN_HOSPITAL: {
    label: "Administración",
    description: "Gestionar personal, invitaciones y configuración hospitalaria.",
    short: "A",
  },
};

function routeFor(role: HospitalRole, hospitalId: number) {
  if (role === "RECEPCIONISTA") return "/recepcion";
  if (role === "MEDICO") return "/medico";
  if (role === "ADMIN_HOSPITAL") return `/admin/hospital?hospitalId=${hospitalId}`;
  return null;
}

export function WorkspaceSelector({ memberships, accountLabel }: {
  memberships: StaffMembership[];
  accountLabel: string;
}) {
  const availableMemberships = memberships.filter(
    (membership) =>
      membership.estado === "ACTIVA" &&
      membership.roles.some((role) => Boolean(routeFor(role, membership.hospitalId))),
  );
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const selected = availableMemberships.find((membership) => membership.hospitalId === selectedHospitalId) ?? null;
  const roles = selected?.roles.flatMap((role) => {
    const route = routeFor(role, selected.hospitalId);
    const details = roleDetails[role];
    return route && details ? [{ role, route, details }] : [];
  }) ?? [];

  return (
    <main className="public-shell workspace-shell">
      <section className="workspace-selector-card">
        <header className="workspace-header">
          <Brand size="large" />
          <div>
            <p className="eyebrow">Espacio de trabajo</p>
            <h1>
              {!availableMemberships.length
                ? "Sin acceso hospitalario"
                : selected
                  ? "Elegí tu función"
                  : "Elegí un hospital"}
            </h1>
            <p className="muted">
              {!availableMemberships.length
                ? "Tu cuenta todavía no tiene una membresía activa."
                : selected
                  ? `Vas a trabajar en ${selected.hospitalNombre}.`
                  : "Primero seleccioná la institución en la que vas a trabajar."}
            </p>
          </div>
        </header>

        <ol className="workspace-steps" aria-label="Progreso">
          <li
            aria-current={!selected ? "step" : undefined}
            className="workspace-step workspace-step-active"
          >
            <span>1</span> Hospital
          </li>
          <li
            aria-current={selected ? "step" : undefined}
            className={selected ? "workspace-step workspace-step-active" : "workspace-step"}
          >
            <span>2</span> Función
          </li>
        </ol>

        <div className="workspace-options" aria-live="polite">
          {!availableMemberships.length ? (
            <div className="workspace-empty">
              <span aria-hidden="true">!</span>
              <h2>No tenés accesos activos</h2>
              <p>Un administrador del hospital debe asignarte un rol antes de que puedas ingresar.</p>
            </div>
          ) : selected ? (
            <>
              <button className="workspace-back" type="button" onClick={() => setSelectedHospitalId(null)}>
                <span aria-hidden="true">←</span> Cambiar hospital
              </button>
              <div className="workspace-option-list">
                {roles.map(({ role, route, details }) => (
                  <Link className="workspace-choice" href={route} key={role}>
                    <span className="workspace-choice-icon workspace-role-icon" aria-hidden="true">{details.short}</span>
                    <span className="workspace-choice-copy">
                      <strong>{details.label}</strong>
                      <small>{details.description}</small>
                    </span>
                    <span className="workspace-choice-arrow" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="workspace-option-list">
              {availableMemberships.map((membership) => {
                const roleCount = membership.roles.filter((role) => roleDetails[role]).length;
                return (
                  <button
                    className="workspace-choice"
                    type="button"
                    key={membership.id}
                    onClick={() => setSelectedHospitalId(membership.hospitalId)}
                  >
                    <span className="workspace-choice-icon" aria-hidden="true">H</span>
                    <span className="workspace-choice-copy">
                      <strong>{membership.hospitalNombre}</strong>
                      <small>{roleCount} {roleCount === 1 ? "función disponible" : "funciones disponibles"}</small>
                    </span>
                    <span className="workspace-choice-arrow" aria-hidden="true">→</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="workspace-footer">
          <span>Sesión iniciada como <strong>{accountLabel}</strong></span>
          <form action="/api/auth/logout" method="post">
            <button className="workspace-logout" type="submit">Cerrar sesión</button>
          </form>
        </footer>
      </section>
    </main>
  );
}
