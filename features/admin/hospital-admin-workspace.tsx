"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import locations from "@/lib/geo/argentina-locations.json";
import type { HospitalRole } from "@/lib/staff-context";

type Role = "ADMIN_HOSPITAL" | "MEDICO" | "RECEPCIONISTA";
type Person = { membresiaId: number; nombre: string; apellido: string; email: string; estado: string; roles: Role[] };
type Invitation = { id: number; email: string; estado: string; roles: Role[]; venceEn: string; matricula?: string | null; tipoMatricula?: string | null; jurisdiccionMatricula?: string | null; emailEnviado?: boolean; ultimoIntentoEnvio?: string | null; cantidadIntentosEnvio?: number; tokenEntregaUnica?: string | null };
type Audit = { id: number; fecha: string; actor: string; accion: string; resultado: string };
type Specialty = { id: number; codigo: string; nombre: string; habilitada: boolean };
type Room = { id: number; nombre: string; activa: boolean; especialidadId: number; especialidadCodigo: string; especialidadNombre: string };
type HospitalConfiguration = { especialidades: Specialty[]; salas: Room[] };
type Bootstrap = { personal: Person[]; invitaciones: Invitation[]; auditoria: Audit[]; configuracion: HospitalConfiguration };

async function adminCall<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/staff/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message ?? "No pudimos completar la operación.");
  return payload as T;
}

export function HospitalAdminWorkspace({ hospitalId, hospitalName, userName, roles }: { hospitalId: number; hospitalName: string; userName: string; roles: HospitalRole[] }) {
  const queryClient = useQueryClient();
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [credentialType, setCredentialType] = useState("NACIONAL");
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const isMedicalInvitation = selectedRoles.includes("MEDICO");
  const queryKey = ["hospital-admin", hospitalId];
  const query = useQuery({ queryKey, queryFn: () => adminCall<Bootstrap>({ operation: "bootstrap", hospitalId }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const invite = useMutation({
    mutationFn: (invitation: Record<string, unknown>) => adminCall<Invitation>({ operation: "invite", hospitalId, invitation }),
    onSuccess: (result) => {
      setCreatedToken(result.tokenEntregaUnica ?? null);
      setDeliveryMessage(result.emailEnviado ? "Invitación enviada por correo." : "Invitación creada para entrega local.");
      void refresh();
    },
  });
  const revoke = useMutation({ mutationFn: (invitationId: number) => adminCall({ operation: "revokeInvitation", hospitalId, invitationId }), onSuccess: refresh });
  const resend = useMutation({
    mutationFn: (invitationId: number) => adminCall<Invitation>({ operation: "resendInvitation", hospitalId, invitationId }),
    onSuccess: (result) => {
      setCreatedToken(result.tokenEntregaUnica ?? null);
      setDeliveryMessage(result.emailEnviado ? "Invitación reenviada por correo." : "Se generó un enlace local nuevo; el anterior dejó de funcionar.");
      void refresh();
    },
  });
  const configure = useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminCall({ hospitalId, ...payload }),
    onSuccess: refresh,
  });

  function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreatedToken(null); setDeliveryMessage(null);
    if (!selectedRoles.length) return;
    const form = new FormData(event.currentTarget);
    const specialtyIds = isMedicalInvitation
      ? String(form.get("specialtyIds") ?? "").split(",").map((value) => Number(value.trim())).filter(Number.isSafeInteger)
      : [];
    invite.mutate({
      email: form.get("email"), roles: selectedRoles,
      matricula: isMedicalInvitation ? form.get("matricula") || null : null,
      tipoMatricula: isMedicalInvitation ? form.get("tipoMatricula") || null : null,
      jurisdiccionMatricula: isMedicalInvitation ? form.get("jurisdiccionMatricula") || null : null,
      especialidadIds: specialtyIds,
    });
  }

  function toggleRole(role: Role) {
    setSelectedRoles((current) => current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role]);
  }

  function submitRoom(event: FormEvent<HTMLFormElement>, roomId?: number) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const room = { nombre: form.get("roomName"), especialidadId: Number(form.get("roomSpecialtyId")) };
    configure.mutate(roomId ? { operation: "updateRoom", roomId, room } : { operation: "createRoom", room }, {
      onSuccess: () => { if (!roomId) formElement.reset(); },
    });
  }

  return (
    <StaffShell role="Administración" userName={userName} section="Personal" hospitalId={hospitalId} hospitalName={hospitalName} roles={roles}>
      <div className="page-stack">
        <header className="page-heading heading-row"><div><p className="eyebrow">Administración hospitalaria</p><h1>{hospitalName}</h1><p>Gestioná accesos e invitaciones de este hospital.</p></div><Link className="button button-secondary" href="/">Cambiar espacio</Link></header>
        {query.isLoading ? <div className="loading-card">Cargando personal…</div> : null}
        {query.error ? <div className="notice notice-error" role="alert">{query.error.message}</div> : null}
        <section className="panel">
          <div className="panel-heading"><div><h2>Invitar personal</h2><p>El acceso sólo se activa cuando la persona acepta.</p></div></div>
          <form className="form-panel" onSubmit={submitInvitation}>
            <div className="form-grid">
              <label className="field">Correo<input name="email" type="email" required disabled={invite.isPending} /></label>
              {isMedicalInvitation ? <>
                <label className="field">Número de matrícula<input name="matricula" required disabled={invite.isPending} /></label>
                <label className="field">Tipo de matrícula<select name="tipoMatricula" value={credentialType} onChange={(event) => setCredentialType(event.target.value)} disabled={invite.isPending}><option value="NACIONAL">Nacional</option><option value="PROVINCIAL">Provincial</option></select></label>
                {credentialType === "PROVINCIAL" ? <label className="field">Jurisdicción<select name="jurisdiccionMatricula" required disabled={invite.isPending}><option value="">Seleccionar provincia</option>{locations.provinces.map((province) => <option value={province.name} key={province.name}>{province.name}</option>)}</select></label> : <input name="jurisdiccionMatricula" type="hidden" value="NACION" />}
                <label className="field field-wide">IDs de especialidad (separados por coma)<input name="specialtyIds" required disabled={invite.isPending} /></label>
              </> : null}
            </div>
            <div className="role-options">{(["RECEPCIONISTA", "MEDICO", "ADMIN_HOSPITAL"] as Role[]).map((role) => <label className="check-field" key={role}><input name="roles" type="checkbox" value={role} checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} disabled={invite.isPending} />{role.replaceAll("_", " ")}</label>)}</div>
            {!selectedRoles.length ? <div className="notice notice-info">Seleccioná al menos un rol para crear la invitación.</div> : null}
            {invite.error ? <div className="notice notice-error" role="alert">{invite.error.message}</div> : null}
            {deliveryMessage ? <div className="notice notice-success"><strong>{deliveryMessage}</strong>{createdToken ? <><br />Copiá este secreto una sola vez después de <code>/invitaciones/aceptar#</code>:<br /><code className="secret-code">{createdToken}</code></> : null}</div> : null}
            <button className="button button-primary" disabled={invite.isPending || !selectedRoles.length} type="submit">{invite.isPending ? "Creando…" : "Crear invitación"}</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Especialidades y salas</h2><p>Configurá la atención disponible y sus espacios físicos.</p></div></div>
          {configure.error ? <div className="notice notice-error" role="alert">{configure.error.message}</div> : null}
          <div className="form-panel">
            <h3>Especialidades del hospital</h3>
            <div className="role-options">{query.data?.configuracion.especialidades.map((specialty) => <button className="button button-secondary" disabled={configure.isPending} key={specialty.id} onClick={() => configure.mutate({ operation: specialty.habilitada ? "disableSpecialty" : "enableSpecialty", specialtyId: specialty.id })}>{specialty.habilitada ? `✓ ${specialty.nombre}` : `+ ${specialty.nombre}`}</button>)}</div>
          </div>
          <form className="form-panel" onSubmit={(event) => submitRoom(event)}>
            <h3>Agregar sala</h3>
            <div className="form-grid"><label className="field">Nombre<input name="roomName" required maxLength={100} disabled={configure.isPending} /></label><label className="field">Especialidad<select name="roomSpecialtyId" required disabled={configure.isPending}><option value="">Seleccionar</option>{query.data?.configuracion.especialidades.filter((item) => item.habilitada).map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></label></div>
            <button className="button button-primary" type="submit" disabled={configure.isPending}>Crear sala</button>
          </form>
          <div className="record-list">{query.data?.configuracion.salas.map((room) => <form className="record-row" key={room.id} onSubmit={(event) => submitRoom(event, room.id)}><div className="form-grid"><label className="field">Sala<input name="roomName" defaultValue={room.nombre} required maxLength={100} disabled={configure.isPending} /></label><label className="field">Especialidad<select name="roomSpecialtyId" defaultValue={room.especialidadId} required disabled={configure.isPending}>{query.data?.configuracion.especialidades.filter((item) => item.habilitada).map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></label></div><div className="record-actions"><span className="status-chip">{room.activa ? "Activa" : "Inactiva"}</span><button className="button button-secondary" type="submit" disabled={configure.isPending}>Guardar</button><button className={room.activa ? "button button-danger-ghost" : "button button-secondary"} type="button" disabled={configure.isPending} onClick={() => configure.mutate({ operation: "setRoomActive", roomId: room.id, active: !room.activa })}>{room.activa ? "Desactivar" : "Activar"}</button></div></form>)}</div>
        </section>
        <section className="panel"><div className="panel-heading"><div><h2>Personal</h2><p>Membresías y roles vigentes.</p></div></div><div className="record-list">{query.data?.personal.map((person) => <div className="record-row" key={person.membresiaId}><div><strong>{person.nombre} {person.apellido}</strong><span>{person.email} · {person.roles.join(", ")} · {person.estado}</span></div></div>)}</div></section>
        <section className="panel"><div className="panel-heading"><div><h2>Invitaciones</h2><p>Pendientes, aceptadas, vencidas y revocadas.</p></div></div><div className="record-list">{query.data?.invitaciones.map((item) => <div className="record-row" key={item.id}><div><strong>{item.email}</strong><span>{item.roles.join(", ")} · {item.estado}{item.emailEnviado ? " · correo enviado" : " · entrega pendiente"}{item.matricula ? ` · Matrícula ${item.tipoMatricula?.toLocaleLowerCase("es")} ${item.matricula} (${item.jurisdiccionMatricula})` : ""}</span></div>{item.estado === "PENDIENTE" || item.estado === "EXPIRADA" ? <div className="record-actions"><button className="button button-secondary" disabled={resend.isPending || revoke.isPending} onClick={() => resend.mutate(item.id)}>Reenviar</button>{item.estado === "PENDIENTE" ? <button className="button button-danger-ghost" disabled={revoke.isPending || resend.isPending} onClick={() => revoke.mutate(item.id)}>Revocar</button> : null}</div> : null}</div>)}</div></section>
        <section className="panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Cambios privilegiados auditados.</p></div></div><div className="record-list">{query.data?.auditoria.map((item) => <div className="record-row" key={item.id}><div><strong>{item.accion}</strong><span>{item.actor} · {new Date(item.fecha).toLocaleString("es-AR")}</span></div><span>{item.resultado}</span></div>)}</div></section>
      </div>
    </StaffShell>
  );
}
