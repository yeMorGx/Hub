import Link from "next/link";
import {
  SquaresFour,
  ArrowUpRight,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link href="/login" className="auth-brand">
          <SquaresFour weight="fill" size={29} />
          <span>hub</span>
        </Link>
        <div className="auth-story-main">
          <span className="auth-orbit-icon">
            <SquaresFour weight="fill" size={58} />
          </span>
          <h1>
            O mesmo time.
            <br />
            Um novo ritmo<span>.</span>
          </h1>
          <p>Boas conversas, planos em comum e tempo para fazer acontecer.</p>
          <div className="auth-story-details">
            <span>
              <i className="legend-dot orange" />
              Seu foco
            </span>
            <span>
              <i className="legend-dot blue" />
              Sua agenda
            </span>
            <span>
              <i className="legend-dot green" />
              Seu time
            </span>
          </div>
        </div>
        <div className="auth-story-footer">
          <ShieldCheck size={19} />
          <span>Seu espaço protegido com autenticação em duas etapas.</span>
        </div>
      </section>
      <section className="auth-content">
        <div className="auth-form-wrap">{children}</div>
        <div className="auth-bottom">
          <span>Um espaço. Seu time.</span>
          <Link href="/demo">
            Explorar demonstração <ArrowUpRight size={13} />
          </Link>
        </div>
      </section>
    </main>
  );
}
