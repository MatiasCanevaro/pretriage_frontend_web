"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import locations from "@/lib/geo/argentina-locations.json";

type Role = "ADMIN_HOSPITAL" | "COORDINADOR_MEDICO" | "MEDICO" | "RECEPCIONISTA";
type Person = { membresiaId: number; nombre: string; apellido: string; email: string; estado: string; roles: Role[] };
type Invitation = { id: number; email: string; estado: string; roles: Role[]; venceEn: string; matricula?: string | null; tipoMatricula?: string | null; jurisdiccionMatricula?: string | null; tokenEntregaUnica?: string | null };
type Audit = { id: number; fecha: string; actor: string; accion: string; resultado: string };
type Bootstrap = { personal: Person[]; invitaciones: Invitation[]; auditoria: Audit[] };

async function adminCall<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/staff/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message ?? "No pudimos completar la operación.");
  return payload as T;
}

export function HospitalAdminWorkspace({ hospitalId, hospitalName, userName }: { hospitalId: number; hospitalName: string; userName: string }) {
  const queryClient = useQueryClient();
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [credentialType, setCredentialType] = useState("NACIONAL");
  const queryKey = ["hospital-admin", hospitalId];
  const query = useQuery({ queryKey, queryFn: () => adminCall<Bootstrap>({ operation: "bootstrap", hospitalId }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const invite = useMutation({
    mutationFn: (invitation: Record<string, unknown>) => adminCall<Invitation>({ operation: "invite", hospitalId, invitation }),
    onSuccess: (result) => { setCreatedToken(result.tokenEntregaUnica ?? null); void refresh(); },
  });
  const changeStatus = useMutation({ mutationFn: ({ membershipId, status }: { membershipId: number; status: string }) => adminCall({ operation: "changeStatus", hospitalId, membershipId, status }), onSuccess: refresh });
  const revoke = useMutation({ mutationFn: (invitationId: number) => adminCall({ operation: "revokeInvitation", hospitalId, invitationId }), onSuccess: refresh });

  function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreatedToken(null);
    const form = new FormData(event.currentTarget);
    const specialtyIds = String(form.get("specialtyIds") ?? "").split(",").map((value) => Number(value.trim())).filter(Number.isSafeInteger);
    invite.mutate({
      email: form.get("email"), roles: form.getAll("roles"),
      matricula: form.get("matricula") || null,
      tipoMatricula: form.get("tipoMatricula") || null,
      jurisdiccionMatricula: form.get("jurisdiccionMatricula") || null,
      especialidadIds: specialtyIds,
    });
  }

  return (
    <StaffShell role="Administración" userName={userName} section="Personal">
      <div className="page-stack">
        <header className="page-heading heading-row"><div><p className="eyebrow">Administración hospitalaria</p><h1>{hospitalName}</h1><p>Gestioná accesos e invitaciones de este hospital.</p></div><Link className="button button-secondary" href="/">Cambiar espacio</Link></header>
        {query.isLoading ? <div className="loading-card">Cargando personal…</div> : null}
        {query.error ? <div className="notice notice-error" role="alert">{query.error.message}</div> : null}
        <section className="panel">
          <div className="panel-heading"><div><h2>Invitar personal</h2><p>El acceso sólo se activa cuando la persona acepta.</p></div></div>
          <form className="form-panel" onSubmit={submitInvitation}>
            <div className="form-grid">
              <label className="field">Correo<input name="email" type="email" required disabled={invite.isPending} /></label>
              <label className="field">Número de matrícula<input name="matricula" disabled={invite.isPending} /></label>
              <label className="field">Tipo de matrícula<select name="tipoMatricula" value={credentialType} onChange={(event) => setCredentialType(event.target.value)} disabled={invite.isPending}><option value="NACIONAL">Nacional</option><option value="PROVINCIAL">Provincial</option></select></label>
              {credentialType === "PROVINCIAL" ? <label className="field">Jurisdicción<select name="jurisdiccionMatricula" required disabled={invite.isPending}><option value="">Seleccionar provincia</option>{locations.provinces.map((province) => <option value={province.name} key={province.name}>{province.name}</option>)}</select></label> : <input name="jurisdiccionMatricula" type="hidden" value="NACION" />}
              <label className="field field-wide">IDs de especialidad (sólo médicos, separados por coma)<input name="specialtyIds" disabled={invite.isPending} /></label>
            </div>
            <div className="role-options">{(["RECEPCIONISTA", "MEDICO", "COORDINADOR_MEDICO", "ADMIN_HOSPITAL"] as Role[]).map((role) => <label className="check-field" key={role}><input name="roles" type="checkbox" value={role} />{role.replaceAll("_", " ")}</label>)}</div>
            {invite.error ? <div className="notice notice-error" role="alert">{invite.error.message}</div> : null}
            {createdToken ? <div className="notice notice-success"><strong>Invitación creada.</strong><br />Copiá este secreto una sola vez después de <code>/invitaciones/aceptar#</code>:<br /><code className="secret-code">{createdToken}</code></div> : null}
            <button className="button button-primary" disabled={invite.isPending} type="submit">{invite.isPending ? "Creando…" : "Crear invitación"}</button>
          </form>
        </section>
        <section className="panel"><div className="panel-heading"><div><h2>Personal</h2><p>Membresías y roles vigentes.</p></div></div><div className="record-list">{query.data?.personal.map((person) => <div className="record-row" key={person.membresiaId}><div><strong>{person.nombre} {person.apellido}</strong><span>{person.email} · {person.roles.join(", ")}</span></div><button className="button button-secondary" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate({ membershipId: person.membresiaId, status: person.estado === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA" })}>{person.estado === "ACTIVA" ? "Suspender" : "Reactivar"}</button></div>)}</div></section>
        <section className="panel"><div className="panel-heading"><div><h2>Invitaciones</h2><p>Pendientes, aceptadas, vencidas y revocadas.</p></div></div><div className="record-list">{query.data?.invitaciones.map((item) => <div className="record-row" key={item.id}><div><strong>{item.email}</strong><span>{item.roles.join(", ")} · {item.estado}{item.matricula ? ` · Matrícula ${item.tipoMatricula?.toLocaleLowerCase("es")} ${item.matricula} (${item.jurisdiccionMatricula})` : ""}</span></div>{item.estado === "PENDIENTE" ? <button className="button button-danger-ghost" disabled={revoke.isPending} onClick={() => revoke.mutate(item.id)}>Revocar</button> : null}</div>)}</div></section>
        <section className="panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Cambios privilegiados auditados.</p></div></div><div className="record-list">{query.data?.auditoria.map((item) => <div className="record-row" key={item.id}><div><strong>{item.accion}</strong><span>{item.actor} · {new Date(item.fecha).toLocaleString("es-AR")}</span></div><span>{item.resultado}</span></div>)}</div></section>
      </div>
    </StaffShell>
  );
}
