"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brand } from "@/components/brand";

type Hospital = { id: number; nombre: string; administradoresActivos: number };
type Invitation = { emailEnviado?: boolean; tokenEntregaUnica?: string | null };

async function platformCall<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/staff/platform-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message ?? "No pudimos completar la operación.");
  return payload as T;
}

export function PlatformAdminWorkspace({ userName }: { userName: string }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["platform-admin", "hospitals"], queryFn: () => platformCall<Hospital[]>({ operation: "bootstrap" }) });
  const invite = useMutation({
    mutationFn: ({ hospitalId, email }: { hospitalId: number; email: string }) => platformCall<Invitation>({
      operation: "inviteFirstAdmin",
      hospitalId,
      invitation: { email, roles: ["ADMIN_HOSPITAL"], especialidadIds: [] },
    }),
    onSuccess: (result) => {
      setToken(result.tokenEntregaUnica ?? null);
      setMessage(result.emailEnviado ? "Invitación enviada por correo." : "Invitación creada para entrega local.");
      void queryClient.invalidateQueries({ queryKey: ["platform-admin", "hospitals"] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>, hospitalId: number) {
    event.preventDefault();
    setToken(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    invite.mutate({ hospitalId, email: String(form.get("email") ?? "") });
  }

  return <main className="public-shell platform-admin-shell"><section className="workspace-card platform-admin-card">
    <header className="platform-admin-header"><Brand /><div><p className="eyebrow">Administración de plataforma</p><h1>Hospitales</h1><p className="muted">Sesión iniciada como {userName}. Invitá al primer administrador de cada institución.</p></div><Link className="button button-secondary" href="/">Hospitales y módulos</Link></header>
    {query.isLoading ? <div className="loading-card">Cargando hospitales…</div> : null}
    {query.error ? <div className="notice notice-error" role="alert">{query.error.message}</div> : null}
    {message ? <div className="notice notice-success"><strong>{message}</strong>{token ? <><br />En desarrollo, copiá una sola vez:<br /><code className="secret-code">{token}</code></> : null}</div> : null}
    <div className="record-list">{query.data?.map((hospital) => <article className="record-row platform-hospital-row" key={hospital.id}><div><strong>{hospital.nombre}</strong><span>{hospital.administradoresActivos} administradores activos</span></div><form className="inline-invite-form" onSubmit={(event) => submit(event, hospital.id)}><input aria-label={`Correo del administrador de ${hospital.nombre}`} name="email" type="email" placeholder="admin@hospital.com" required disabled={invite.isPending} /><button className="button button-primary" type="submit" disabled={invite.isPending}>{invite.isPending ? "Enviando…" : "Invitar administrador"}</button></form></article>)}</div>
    {invite.error ? <div className="notice notice-error" role="alert">{invite.error.message}</div> : null}
  </section></main>;
}
