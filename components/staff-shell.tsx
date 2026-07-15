import { Brand } from "@/components/brand";

type StaffShellProps = {
  role: "Recepción" | "Médico";
  userName: string;
  section: string;
  sessionLabel?: string;
  children: React.ReactNode;
};

const receptionItems = ["Inicio", "Pacientes", "Admisiones", "Cola"];
const doctorItems = ["Inicio", "Cola de pacientes", "Atenciones", "Pacientes"];

export function StaffShell({
  role,
  userName,
  section,
  sessionLabel,
  children,
}: StaffShellProps) {
  const items = role === "Recepción" ? receptionItems : doctorItems;
  return (
    <div className="staff-app">
      <header className="topbar">
        <Brand />
        <div className="topbar-account">
          {sessionLabel ? <span className="session-pill">{sessionLabel}</span> : null}
          <div className="avatar" aria-hidden="true">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{userName}</strong>
            <span>{role}</span>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="logout-link" type="submit">
              Salir
            </button>
          </form>
        </div>
      </header>
      <aside className="sidebar" aria-label="Navegación principal">
        <nav>
          {items.map((item) => (
            <span
              className={item === section ? "nav-item nav-item-active" : "nav-item"}
              key={item}
            >
              <span className="nav-dot" aria-hidden="true" />
              {item}
            </span>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>¿Necesitás ayuda?</span>
          <small>Consultá el protocolo operativo del hospital.</small>
        </div>
      </aside>
      <main className="staff-content">{children}</main>
    </div>
  );
}
