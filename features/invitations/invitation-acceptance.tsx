"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Brand } from "@/components/brand";

type Summary = { hospitalNombre: string; email: string; estado: string; roles: string[]; matricula?: string | null; venceEn: string; cuentaExistente: boolean };

async function invitationCall<T>(operation: string, token: string, extra: Record<string, unknown> = {}) {
  const response = await fetch("/api/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation, token, ...extra }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message ?? "No pudimos procesar la invitación.");
  return payload as T;
}

export function InvitationAcceptance({ loggedIn }: { loggedIn: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    const secret = window.location.hash.slice(1);
    if (secret) {
      window.history.replaceState(null, "", window.location.pathname);
      const timer = window.setTimeout(() => setToken(secret), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const summary = useQuery({ queryKey: ["invitation-summary", token], queryFn: () => invitationCall<Summary>("summary", token!), enabled: Boolean(token), retry: false });
  const accept = useMutation({ mutationFn: () => invitationCall("accept", token!), onSuccess: () => { window.location.assign("/"); } });
  const register = useMutation({ mutationFn: (registration: Record<string, unknown>) => invitationCall("register", token!, { registration }), onSuccess: () => setRegistered(true) });

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    register.mutate({ nombre: form.get("nombre"), apellido: form.get("apellido"), numeroDocumento: form.get("numeroDocumento"), tipoDocumento: "DNI", password: form.get("password") });
  }

  return <main className="public-shell"><section className="workspace-card"><Brand size="large" />
    <p className="eyebrow">Invitación hospitalaria</p>
    {!token ? <div className="notice notice-error">El enlace no contiene una invitación válida.</div> : null}
    {summary.isLoading ? <div className="loading-card">Verificando invitación…</div> : null}
    {summary.error ? <div className="notice notice-error" role="alert">{summary.error.message}</div> : null}
    {summary.data ? <>
      <h1>{summary.data.hospitalNombre}</h1><p className="muted">Invitación para <strong>{summary.data.email}</strong></p>
      <div className="summary-list"><div><dt>Roles</dt><dd>{summary.data.roles.join(", ")}</dd></div><div><dt>Vence</dt><dd>{new Date(summary.data.venceEn).toLocaleString("es-AR")}</dd></div>{summary.data.matricula ? <div><dt>Matrícula</dt><dd>{summary.data.matricula}</dd></div> : null}</div>
      {summary.data.cuentaExistente ? loggedIn ? <button className="button button-primary button-wide" disabled={accept.isPending} onClick={() => accept.mutate()}>{accept.isPending ? "Aceptando…" : "Aceptar invitación"}</button> : <div className="notice notice-info">Iniciá sesión en otra pestaña, volvé a abrir el enlace y aceptá con tu cuenta existente. <a href="/login" target="_blank" rel="noreferrer">Iniciar sesión</a></div> : registered ? <div className="notice notice-success">La cuenta y la membresía quedaron creadas. Ya podés iniciar sesión.</div> : <form className="login-form" onSubmit={submitRegistration}><label className="field">Nombre<input name="nombre" required /></label><label className="field">Apellido<input name="apellido" required /></label><label className="field">DNI<input name="numeroDocumento" inputMode="numeric" required pattern="[0-9]{7,8}" /></label><label className="field">Elegí una contraseña<input name="password" type="password" autoComplete="new-password" required minLength={8} /></label><button className="button button-primary" disabled={register.isPending} type="submit">{register.isPending ? "Creando cuenta…" : "Crear cuenta y aceptar"}</button></form>}
      {accept.error || register.error ? <div className="notice notice-error" role="alert">{(accept.error ?? register.error)?.message}</div> : null}
    </> : null}
  </section></main>;
}
