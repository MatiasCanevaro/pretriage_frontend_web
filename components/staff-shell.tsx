import { Brand } from "@/components/brand";
import Link from "next/link";
import type { HospitalRole } from "@/lib/staff-context";

type StaffShellProps = {
  role: "Recepción" | "Médico" | "Administración";
  userName: string;
  section: string;
  sessionLabel?: string;
  hospitalId: number;
  hospitalName: string;
  roles: HospitalRole[];
  children: React.ReactNode;
};

const itemsByRole = {
  Recepción: ["Inicio", "Pacientes", "Admisiones", "Cola"],
  Médico: ["Inicio", "Cola de pacientes", "Atenciones", "Pacientes"],
  Administración: ["Inicio", "Personal", "Invitaciones", "Auditoría"],
};

const modules: Array<{ role: HospitalRole; label: string; href: (hospitalId: number) => string }> = [
  { role: "RECEPCIONISTA", label: "Recepción", href: (id) => `/recepcion?hospitalId=${id}` },
  { role: "MEDICO", label: "Atención médica", href: (id) => `/medico?hospitalId=${id}` },
  { role: "ADMIN_HOSPITAL", label: "Administración", href: (id) => `/admin/hospital?hospitalId=${id}` },
];

export function StaffShell({ role, userName, section, sessionLabel, hospitalId, hospitalName, roles, children }: StaffShellProps) {
  const availableModules = modules.filter((module) => roles.includes(module.role));
  const activeModuleRole: HospitalRole = role === "Recepción"
    ? "RECEPCIONISTA"
    : role === "Médico" ? "MEDICO" : "ADMIN_HOSPITAL";
  return (
    <div className="staff-app">
      <header className="topbar">
        <Brand />
        <div className="topbar-account">
          {sessionLabel ? <span className="session-pill">{sessionLabel}</span> : null}
          <div className="avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</div>
          <div><strong>{userName}</strong><span>{hospitalName} · {role}</span></div>
          <Link className="logout-link" href="/" aria-label="Cambiar hospital">Hospitales</Link>
          <form action="/api/auth/logout" method="post"><button className="logout-link" type="submit">Salir</button></form>
        </div>
      </header>
      <aside className="sidebar" aria-label="Navegación principal">
        <nav>
          {availableModules.map((module) => (
            <Link className={module.role === activeModuleRole ? "nav-item nav-item-active" : "nav-item"} href={module.href(hospitalId)} key={module.role}>
              <span className="nav-dot" aria-hidden="true" />{module.label}
            </Link>
          ))}
          <span className="nav-divider" />
          {itemsByRole[role].map((item) => <span className={item === section ? "nav-item nav-item-active nav-subitem" : "nav-item nav-subitem"} key={item}><span className="nav-dot" aria-hidden="true" />{item}</span>)}
        </nav>
        <div className="sidebar-foot"><span>¿Necesitás ayuda?</span><small>Consultá el protocolo operativo del hospital.</small></div>
      </aside>
      <main className="staff-content">{children}</main>
    </div>
  );
}
