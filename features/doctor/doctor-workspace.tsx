"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StaffShell } from "@/components/staff-shell";
import { apiClient } from "@/lib/api/client";
import type {
  ConsultationPretriage,
  DoctorBootstrap,
  MedicalRoom,
  MedicalSession,
  QueueConsultation,
} from "@/lib/api/types";
import type { HospitalRole } from "@/lib/staff-context";

const doctorApi = "/api/staff/doctor";

function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <div className="notice notice-error" role="alert">
      {error instanceof Error ? error.message : "No pudimos completar la operación."}
    </div>
  ) : null;
}

function stateLabel(value?: string) {
  return ({
    EN_COLA: "En cola",
    LLAMADO: "Llamado",
    EN_ESPERA: "En espera",
    ATRASADO: "Atrasado",
    EN_ATENCION: "En atención",
    FINALIZADA: "Finalizada",
    CANCELADA: "Cancelada",
  }[value ?? ""] ?? value ?? "Sin estado");
}

function patientName(consultation: QueueConsultation) {
  return [consultation.nombrePaciente, consultation.apellidoPaciente]
    .filter(Boolean)
    .join(" ") || "Nombre no disponible";
}

const priorities = [
  "RIESGO_VITAL_INMEDIATO",
  "MUY_URGENTE",
  "URGENTE",
  "NORMAL",
  "NO_URGENTE",
] as const;

function priorityLabel(value?: string) {
  return ({
    RIESGO_VITAL_INMEDIATO: "Riesgo vital inmediato",
    MUY_URGENTE: "Muy urgente",
    URGENTE: "Urgente",
    NORMAL: "Normal",
    NO_URGENTE: "No urgente",
  }[value ?? ""] ?? value ?? "Sin definir");
}

function priorityClass(value?: string) {
  return ({
    RIESGO_VITAL_INMEDIATO: "priority-critical",
    MUY_URGENTE: "priority-critical",
    URGENTE: "priority-urgent",
    NORMAL: "priority-normal",
    NO_URGENTE: "priority-low",
  }[value ?? ""] ?? "priority-unknown");
}

function listText(value?: string[]) {
  return value?.length ? value.join(", ") : "No informado";
}

export function DoctorWorkspace({
  userName,
  hospitalId,
  hospitalName,
  roles,
}: {
  userName: string;
  hospitalId: number;
  hospitalName: string;
  roles: HospitalRole[];
}) {
  const queryClient = useQueryClient();
  const [assignmentKey, setAssignmentKey] = useState("");
  const [roomId, setRoomId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState(false);
  const [correctedPriority, setCorrectedPriority] = useState("");
  const [priorityReason, setPriorityReason] = useState("");

  const bootstrap = useQuery({
    queryKey: ["doctor", "bootstrap"],
    queryFn: () => apiClient<DoctorBootstrap>(doctorApi, "bootstrap"),
  });
  const session = bootstrap.data?.session ?? null;
  const current = bootstrap.data?.currentConsultation ?? null;
  const assignments = useMemo(
    () => bootstrap.data?.assignments.filter((item) => item.hospitalId === hospitalId) ?? [],
    [bootstrap.data?.assignments, hospitalId],
  );
  const selectedAssignment = useMemo(() => {
    const targetHospitalId = session?.hospitalId ?? hospitalId;
    const targetSpecialty = session?.codigoEspecialidad ?? assignmentKey;
    return bootstrap.data?.assignments.find(
      (item) =>
        item.hospitalId === targetHospitalId &&
        item.codigoEspecialidad === targetSpecialty,
    );
  }, [assignmentKey, bootstrap.data?.assignments, hospitalId, session]);
  const activeHospitalName = session
    ? selectedAssignment?.nombreHospital ?? hospitalName
    : hospitalName;
  const rooms = useQuery({
    queryKey: [
      "doctor",
      "rooms",
      selectedAssignment?.hospitalId,
      selectedAssignment?.codigoEspecialidad,
    ],
    queryFn: () =>
      apiClient<MedicalRoom[]>(doctorApi, "rooms", {
        hospitalId: selectedAssignment!.hospitalId,
        specialty: selectedAssignment!.codigoEspecialidad,
      }),
    enabled: Boolean(
      selectedAssignment?.hospitalId && selectedAssignment.codigoEspecialidad,
    ),
  });
  const queue = useQuery({
    queryKey: ["doctor", "queue", session?.id],
    queryFn: () =>
      apiClient<QueueConsultation[]>(doctorApi, "queue", {
        sessionId: session!.id,
      }),
    enabled: Boolean(session?.id && session.estado === "ACTIVA"),
    refetchInterval: 5_000,
  });
  const pretriage = useQuery({
    queryKey: ["doctor", "pretriage", session?.id, current?.consultaId],
    queryFn: () =>
      apiClient<ConsultationPretriage>(doctorApi, "pretriage", {
        sessionId: session!.id,
        consultationId: current!.consultaId,
      }),
    enabled: Boolean(
      session?.id && current?.consultaId && current.estadoConsulta === "EN_ATENCION",
    ),
  });

  const updateRemoteState = (
    patch: Pick<DoctorBootstrap, "session" | "currentConsultation">,
  ) => {
    queryClient.setQueryData<DoctorBootstrap>(["doctor", "bootstrap"], (data) =>
      data ? { ...data, ...patch } : data,
    );
  };

  const startSession = useMutation({
    mutationFn: () =>
      apiClient<MedicalSession>(doctorApi, "startSession", {
        hospitalId: selectedAssignment?.hospitalId,
        specialty: selectedAssignment?.codigoEspecialidad,
        roomId: Number(roomId),
    }),
    onSuccess: (created) => {
      updateRemoteState({ session: created, currentConsultation: null });
      setFeedback(null);
    },
  });
  const sessionAction = useMutation({
    mutationFn: (action: "pausar" | "reanudar" | "cerrar") =>
      apiClient<MedicalSession>(doctorApi, "sessionAction", {
        sessionId: session?.id,
        action,
    }),
    onSuccess: (updated) => {
      if (updated.estado === "FINALIZADA") {
        updateRemoteState({ session: null, currentConsultation: null });
        setAssignmentKey("");
        setRoomId("");
      } else {
        updateRemoteState({ session: updated, currentConsultation: null });
      }
      void queryClient.invalidateQueries({ queryKey: ["doctor"] });
    },
  });
  const callNext = useMutation({
    mutationFn: () =>
      apiClient<QueueConsultation>(doctorApi, "callNext", {
        sessionId: session?.id,
    }),
    onSuccess: (called) => {
      updateRemoteState({ session, currentConsultation: called });
      setFeedback(null);
      void queue.refetch();
    },
  });
  const consultationAction = useMutation({
    mutationFn: (action: "presente" | "ausente" | "finalizar") =>
      apiClient<QueueConsultation>(doctorApi, "consultationAction", {
        sessionId: session?.id,
        consultationId: current?.consultaId,
        action,
      }),
    onSuccess: (updated, action) => {
      if (action === "presente") {
        updateRemoteState({ session, currentConsultation: updated });
        setFeedback("Presencia confirmada. La atención quedó iniciada.");
      } else {
        updateRemoteState({ session, currentConsultation: null });
        setFeedback(
          action === "ausente"
            ? "Paciente marcado como ausente y devuelto a la cola según el flujo configurado."
            : "Atención finalizada correctamente.",
        );
      }
      void queue.refetch();
      void queryClient.invalidateQueries({ queryKey: ["doctor", "bootstrap"] });
    },
  });
  const priorityReview = useMutation({
    mutationFn: (review: {
      decision: "CONFIRMAR" | "CORREGIR";
      priority?: string;
      reason?: string;
    }) =>
      apiClient<ConsultationPretriage>(doctorApi, "reviewPriority", {
        sessionId: session?.id,
        consultationId: current?.consultaId,
        ...review,
      }),
    onSuccess: (reviewed) => {
      queryClient.setQueryData(
        ["doctor", "pretriage", session?.id, current?.consultaId],
        reviewed,
      );
      setEditingPriority(false);
      setCorrectedPriority("");
      setPriorityReason("");
      setFeedback(
        reviewed.estadoRevision === "CONFIRMADA"
          ? "Prioridad confirmada."
          : "Prioridad corregida y registrada.",
      );
    },
  });

  const section = current ? "Atenciones" : session ? "Cola de pacientes" : "Inicio";
  const shell = (content: React.ReactNode) => (
    <StaffShell
      role="Médico"
      userName={userName}
      section={section}
      sessionLabel={
        session
          ? `${activeHospitalName} · ${session.estado}`
          : activeHospitalName
      }
      hospitalId={hospitalId}
      hospitalName={hospitalName}
      roles={roles}
    >
      {content}
    </StaffShell>
  );

  if (bootstrap.isPending) {
    return shell(<div className="page-center"><div className="loading-card">Preparando tu espacio médico…</div></div>);
  }
  if (bootstrap.isError || !bootstrap.data) {
    return shell(
      <div className="page-center"><section className="panel compact-panel">
        <h1>No pudimos abrir el módulo médico</h1>
        <ErrorNotice error={bootstrap.error} />
        <button className="button button-primary" onClick={() => bootstrap.refetch()}>Reintentar</button>
      </section></div>,
    );
  }
  if (!session) {
    return shell(
      <div className="page-stack narrow-stack">
        <header className="page-heading">
          <p className="eyebrow">Inicio de jornada</p>
          <h1>Iniciar sesión médica</h1>
          <p>Vas a atender en <strong>{activeHospitalName}</strong>. Seleccioná tu especialidad y consultorio.</p>
        </header>
        <section className="panel form-panel">
          <label className="field">
            <span>Especialidad</span>
            <select value={assignmentKey} onChange={(event) => { setAssignmentKey(event.target.value); setRoomId(""); }}>
              <option value="">Seleccionar</option>
              {assignments.map((item) => (
                <option key={item.codigoEspecialidad} value={item.codigoEspecialidad}>
                  {item.nombreEspecialidad}
                </option>
              ))}
            </select>
          </label>
          {!assignments.length ? (
            <div className="notice notice-warning">
              No tenés especialidades médicas asignadas en {activeHospitalName}.
            </div>
          ) : null}
          <label className="field">
            <span>Consultorio</span>
            <select disabled={!selectedAssignment || rooms.isPending} value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <option value="">{rooms.isPending ? "Cargando…" : "Seleccionar"}</option>
              {(rooms.data ?? []).map((room) => <option key={room.id} value={room.id}>{room.nombre}</option>)}
            </select>
          </label>
          <div className="notice notice-info">
            Sólo se mostrarán pacientes de {activeHospitalName}, para la especialidad y el consultorio seleccionados.
          </div>
          <button className="button button-primary button-wide" disabled={!selectedAssignment || !roomId || startSession.isPending} onClick={() => startSession.mutate()}>
            {startSession.isPending ? "Iniciando…" : "Iniciar sesión"}
          </button>
          <ErrorNotice error={rooms.error ?? startSession.error} />
        </section>
      </div>,
    );
  }
  if (current) {
    const inAttention = current.estadoConsulta === "EN_ATENCION";
    const reviewPending = pretriage.data?.estadoRevision === "PENDIENTE";
    const summary = pretriage.data?.resumenClinico;
    return shell(
      <div className="page-stack narrow-stack">
        <header className="page-heading">
          <p className="eyebrow">{inAttention ? "Atención en curso" : "Paciente llamado"}</p>
          <h1>{patientName(current)}</h1>
          <p>Código {current.codigoLlamado ?? "no disponible"} · Sala {current.nombreSala ?? session.salaId} · {stateLabel(current.estadoConsulta)}</p>
        </header>
        <section className="panel call-panel">
          <div className="call-visual"><span>Estado</span><strong>{stateLabel(current.estadoConsulta)}</strong><small>Código {current.codigoLlamado}</small></div>
          {!inAttention ? (
            <div className="call-actions">
              <button className="button button-primary" disabled={consultationAction.isPending} onClick={() => consultationAction.mutate("presente")}>Paciente presente</button>
              <button className="button button-danger-ghost" disabled={consultationAction.isPending} onClick={() => consultationAction.mutate("ausente")}>Marcar ausente</button>
            </div>
          ) : (
            <>
              {pretriage.isPending ? (
                <div className="loading-card">Cargando resumen de pretriaje…</div>
              ) : pretriage.data ? (
                <section className="priority-review" aria-labelledby="priority-review-title">
                  <div className="priority-review-heading">
                    <div>
                      <span className="eyebrow">Preclasificación</span>
                      <h2 id="priority-review-title">Resumen para la atención</h2>
                    </div>
                    <span className="priority-badge">{priorityLabel(pretriage.data.prioridadPreliminar)}</span>
                  </div>
                  {summary ? (
                    <dl className="clinical-summary">
                      <div><dt>Motivo</dt><dd>{summary.motivoConsulta ?? "No informado"}</dd></div>
                      <div><dt>Síntomas</dt><dd>{listText(summary.sintomas)}</dd></div>
                      <div><dt>Inicio y evolución</dt><dd>{[summary.inicio, summary.evolucion].filter(Boolean).join(" · ") || "No informado"}</dd></div>
                      {summary.intensidadDolor != null ? <div><dt>Dolor</dt><dd>{summary.intensidadDolor}/10</dd></div> : null}
                      {summary.signosAlarma?.length ? <div><dt>Signos de alarma</dt><dd>{listText(summary.signosAlarma)}</dd></div> : null}
                      {summary.observaciones ? <div><dt>Observaciones</dt><dd>{summary.observaciones}</dd></div> : null}
                    </dl>
                  ) : (
                    <div className="notice notice-warning">No hay un resumen clínico estructurado disponible para esta consulta.</div>
                  )}

                  {!reviewPending && !editingPriority ? (
                    <div className="priority-reviewed">
                      <div>
                        <strong>{pretriage.data.estadoRevision === "CONFIRMADA" ? "Prioridad confirmada" : "Prioridad corregida"}</strong>
                        <span>{priorityLabel(pretriage.data.prioridadEfectiva)}</span>
                      </div>
                      <button className="button button-secondary" onClick={() => setEditingPriority(true)}>Cambiar</button>
                    </div>
                  ) : editingPriority ? (
                    <div className="priority-correction">
                      <label className="field">
                        <span>Nueva prioridad</span>
                        <select value={correctedPriority} onChange={(event) => setCorrectedPriority(event.target.value)}>
                          <option value="">Seleccionar</option>
                          {priorities.map((priority) => (
                            <option key={priority} value={priority} disabled={priority === pretriage.data.prioridadPreliminar}>
                              {priorityLabel(priority)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Motivo breve <small>(opcional)</small></span>
                        <textarea rows={2} maxLength={500} value={priorityReason} onChange={(event) => setPriorityReason(event.target.value)} placeholder="Ej.: la evaluación clínica no muestra signos de alarma" />
                      </label>
                      <div className="priority-actions">
                        <button className="button button-secondary" disabled={priorityReview.isPending} onClick={() => setEditingPriority(false)}>Cancelar</button>
                        <button className="button button-primary" disabled={!correctedPriority || priorityReview.isPending} onClick={() => priorityReview.mutate({ decision: "CORREGIR", priority: correctedPriority, reason: priorityReason })}>
                          {priorityReview.isPending ? "Guardando…" : "Guardar corrección"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="priority-decision">
                      <p>Antes de finalizar, confirmá si la prioridad preliminar fue correcta.</p>
                      <div className="priority-actions">
                        <button className="button button-secondary" disabled={priorityReview.isPending} onClick={() => setEditingPriority(true)}>Modificar prioridad</button>
                        <button className="button button-primary" disabled={priorityReview.isPending} onClick={() => priorityReview.mutate({ decision: "CONFIRMAR" })}>
                          {priorityReview.isPending ? "Confirmando…" : "La prioridad es correcta"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}
              <ErrorNotice error={pretriage.error ?? priorityReview.error} />
              <button className="button button-primary" disabled={consultationAction.isPending || pretriage.isPending || reviewPending || !pretriage.data} onClick={() => consultationAction.mutate("finalizar")}>
                {consultationAction.isPending ? "Finalizando…" : "Finalizar atención"}
              </button>
            </>
          )}
          {feedback ? <div className="notice notice-success">{feedback}</div> : null}
          <ErrorNotice error={consultationAction.error} />
        </section>
      </div>,
    );
  }

  return shell(
    <div className="page-stack">
      <header className="page-heading heading-row">
        <div><p className="eyebrow">Sesión {session.estado?.toLowerCase()}</p><h1>Cola de pacientes</h1><p>El orden se actualiza automáticamente cada 5 segundos.</p></div>
        <button className="button button-primary" disabled={session.estado !== "ACTIVA" || callNext.isPending} onClick={() => callNext.mutate()}>
          {callNext.isPending ? "Llamando…" : "Llamar próximo"}
        </button>
      </header>
      <div className="stat-grid">
        <article className="stat-card"><span>Pacientes disponibles</span><strong>{queue.data?.length ?? 0}</strong></article>
        <article className="stat-card"><span>Especialidad</span><strong className="stat-text">{selectedAssignment?.nombreEspecialidad}</strong></article>
        <article className="stat-card"><span>Sesión</span><strong className={session.estado === "ACTIVA" ? "status-ok" : "status-paused"}>{session.estado}</strong></article>
      </div>
      <section className="panel">
        <div className="panel-heading"><div><h2>Próximos llamados</h2><p>Se muestra sólo la información disponible y autorizada por el contrato actual.</p></div></div>
        {queue.isPending ? <div className="loading-card">Actualizando cola…</div> : null}
        {queue.data?.length ? (
          <div className="queue-table" role="table" aria-label="Cola médica">
            <div className="queue-row queue-head" role="row"><span>Orden</span><span>Paciente</span><span>Prioridad</span><span>Estado</span></div>
            {queue.data.map((item, index) => (
              <div className="queue-row" role="row" key={item.consultaId}>
                <strong>{index + 1}</strong><strong>{patientName(item)}</strong><span className={`priority-chip ${priorityClass(item.prioridad)}`} data-priority={item.prioridad}>{priorityLabel(item.prioridad)}</span><span className="status-chip">{stateLabel(item.estadoConsulta)}</span>
              </div>
            ))}
          </div>
        ) : !queue.isPending ? <div className="empty-state"><span aria-hidden="true">✓</span><h3>No hay pacientes disponibles</h3><p>La cola se actualizará automáticamente.</p></div> : null}
        <ErrorNotice error={queue.error ?? callNext.error} />
      </section>
      {feedback ? <div className="notice notice-success">{feedback}</div> : null}
      <div className="session-controls">
        {session.estado === "ACTIVA" ? (
          <button className="button button-secondary" disabled={sessionAction.isPending} onClick={() => sessionAction.mutate("pausar")}>Pausar sesión</button>
        ) : (
          <button className="button button-secondary" disabled={sessionAction.isPending} onClick={() => sessionAction.mutate("reanudar")}>Reanudar sesión</button>
        )}
        <button className="button button-danger-ghost" disabled={sessionAction.isPending} onClick={() => sessionAction.mutate("cerrar")}>Cerrar sesión</button>
        <ErrorNotice error={sessionAction.error} />
      </div>
    </div>,
  );
}
