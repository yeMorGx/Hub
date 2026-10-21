"use client";
import { BrandMark } from "./brand";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AppleLogo,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarBlank,
  ChatCircleText,
  Check,
  DownloadSimple,
  Globe,
  List,
  Play,
  Plus,
  ShieldCheck,
  SquaresFour,
  Stop,
  Timer,
  WindowsLogo,
  X,
} from "@phosphor-icons/react";
import { WINDOWS_RELEASE } from "@/lib/desktop/public-release";

export function MarketingNav({ download = false }: { download?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="m-nav-wrap">
      <nav className="m-nav m-shell" aria-label="Navegação do site">
        <Link
          href="/site"
          className="m-brand"
          aria-label="ZULU — página inicial"
        >
          <BrandMark size={40} />
        </Link>
        <div className="m-nav-links">
          <Link href="/site#produto">O produto</Link>
          <Link href="/site#recursos">Recursos</Link>
          <Link href="/site#duvidas">Dúvidas</Link>
        </div>
        <div className="m-nav-actions">
          <Link href="/login" className="m-login">
            Entrar no ZULU <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link
            href={download ? "#sistemas" : "/download"}
            className="m-button m-button-ink"
          >
            Download <ArrowDown aria-hidden="true" />
          </Link>
        </div>
        <button
          className="m-menu-button"
          aria-expanded={open}
          aria-controls="marketing-menu"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <List />}
        </button>
      </nav>
      {open && (
        <div id="marketing-menu" className="m-mobile-menu">
          <Link onClick={() => setOpen(false)} href="/site#produto">
            O produto
          </Link>
          <Link onClick={() => setOpen(false)} href="/site#recursos">
            Recursos
          </Link>
          <Link onClick={() => setOpen(false)} href="/site#duvidas">
            Dúvidas
          </Link>
          <Link href="/login">Entrar no ZULU</Link>
          <Link href="/download">
            Ir para downloads <ArrowRight />
          </Link>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="m-footer">
      <div className="m-shell">
        <div className="m-footer-top">
          <Link href="/site" className="m-brand" aria-label="ZULU — início">
            <BrandMark size={40} />
          </Link>
          <p>
            Um lugar para o trabalho.
            <br />
            Mais espaço para o time.
          </p>
          <div>
            <Link href="/download">
              Downloads <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link href="/privacy">
              Privacidade <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link href="/login">
              Entrar no ZULU <ArrowUpRight aria-hidden="true" />
            </Link>
            <a
              href="https://github.com/yeMorGx/Hub"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="m-footer-bottom">
          <span>ZULU · Feito para trabalhar juntos.</span>
          <span>Menos distância. Mais conexão.</span>
          <a href="#topo">
            Voltar ao topo <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}

const views = [
  {
    id: "today",
    title: "Tudo começa com clareza.",
    label: "Visão do dia",
    text: "O próximo foco, as reuniões e quem está por perto. Abra o ZULU e encontre o seu ponto de partida.",
    alt: "Visão geral do ZULU com timer, agenda semanal e pessoas do time",
  },
  {
    id: "chat",
    title: "A conversa continua aqui.",
    label: "Conversas",
    text: "Canais para os assuntos do time. Mensagens diretas para resolver o que precisa de uma conversa. Sem perder o contexto.",
    alt: "Canais e mensagens na tela de conversas do ZULU",
  },
  {
    id: "tasks",
    title: "Da ideia ao que está feito.",
    label: "Tarefas",
    text: "Organize as entregas no Kanban, acompanhe as etapas e comece a registrar o tempo direto de uma tarefa.",
    alt: "Quadro Kanban do ZULU com tarefas organizadas por etapa",
  },
  {
    id: "calendar",
    title: "Encontre espaço na semana.",
    label: "Calendário",
    text: "Veja a agenda compartilhada por mês, semana ou dia. Planeje encontros e confirme sua presença.",
    alt: "Calendário compartilhado do ZULU com eventos de demonstração",
  },
];
export function ProductExplorer() {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const view = views[selected];
  return (
    <section
      className="m-product m-shell"
      id="produto"
      aria-labelledby="product-heading"
    >
      <div className="m-section-heading">
        <h2 id="product-heading">
          Encontre o ritmo.
          <br />
          <span>O resto se conecta.</span>
        </h2>
        <p>
          Uma visão do dia. Uma conversa que resolve. Uma entrega que avança.
          Veja como as peças se encontram.
        </p>
      </div>
      <div className="m-explorer">
        <div className="m-explorer-copy">
          <div
            className="m-tabs"
            role="tablist"
            aria-label="Conheça as telas do ZULU"
            aria-orientation="vertical"
          >
            {views.map((item, index) => (
              <button
                key={item.id}
                ref={(el) => {
                  buttons.current[index] = el;
                }}
                role="tab"
                id={`tab-${item.id}`}
                aria-controls={`panel-${view.id}`}
                aria-selected={selected === index}
                tabIndex={selected === index ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  let next = selected;
                  if (event.key === "ArrowDown")
                    next = (selected + 1) % views.length;
                  else if (event.key === "ArrowUp")
                    next = (selected + views.length - 1) % views.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = views.length - 1;
                  else return;
                  event.preventDefault();
                  setSelected(next);
                  buttons.current[next]?.focus();
                }}
              >
                <span>{item.label}</span>
                <ArrowUpRight aria-hidden="true" />
              </button>
            ))}
          </div>
          <h3>{view.title}</h3>
          <p>{view.text}</p>
          <Link href="/demo" className="m-text-link">
            Explorar demonstração <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div
          className="m-explorer-visual"
          role="tabpanel"
          id={`panel-${view.id}`}
          aria-labelledby={`tab-${view.id}`}
          tabIndex={0}
        >
          <Image
            key={view.id}
            src={view.id === "today" ? "/marketing/today-zulu-prism.webp" : `/marketing/${view.id}-zulu.webp`}
            alt={view.alt}
            width={1440}
            height={1000}
            sizes="(max-width: 760px) 100vw, 70vw"
          />
          <span className="m-demo-caption">
            Telas do aplicativo · dados fictícios de demonstração
          </span>
        </div>
      </div>
    </section>
  );
}

export function FocusDemo() {
  const [started, setStarted] = useState<number | null>(null),
    [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (started === null) return;
    const tick = () => setSeconds(Math.floor((Date.now() - started) / 1000));
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [started]);
  const display = `${Math.floor(seconds / 3600)
    .toString()
    .padStart(
      2,
      "0",
    )}:${(Math.floor(seconds / 60) % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return (
    <div className="m-focus-demo">
      <div className="m-focus-top">
        <span>
          <span
            className={`m-status-dot ${started !== null ? "is-running" : ""}`}
          />{" "}
          {started !== null
            ? "Seu foco está em movimento"
            : "Um espaço para o seu foco"}
        </span>
        <Timer size={22} aria-hidden="true" />
      </div>
      <p className="m-focus-project">Próxima grande ideia</p>
      <div className="m-focus-clock">{display}</div>
      <div className="m-focus-bottom">
        <span>
          Experimente por aqui.
          <br />
          Nenhuma hora será registrada.
        </span>
        <button
          aria-label={
            started === null
              ? "Experimentar timer"
              : "Parar demonstração do timer"
          }
          onClick={() => {
            if (started === null) {
              setSeconds(0);
              setStarted(Date.now());
            } else setStarted(null);
          }}
        >
          {started === null ? <Play weight="fill" /> : <Stop weight="fill" />}
        </button>
      </div>
    </div>
  );
}

export const questions = [
  [
    "Preciso instalar para usar o ZULU?",
    "Não. Você pode acessar o ZULU pelo navegador com a mesma conta. O aplicativo Windows adiciona uma janela dedicada, o atalho do timer e o indicador de mensagens não lidas na barra de tarefas.",
  ],
  [
    "O ZULU funciona no Mac, Linux e celular?",
    "A versão Windows x64 está disponível nesta página. No macOS, Linux e celular, use a versão web. Em navegadores compatíveis, o ZULU também pode ser instalado como PWA. Os instaladores de Mac e Linux ainda não fazem parte desta distribuição.",
  ],
  [
    "O que acontece com meus dados ao atualizar?",
    "O aplicativo Windows abre o mesmo ZULU da web. Atualizar o instalador não exclui sua conta nem os dados do time. A partir da versão 0.1.3, você pode instalar as próximas versões pelo botão Instalar e reiniciar dentro do ZULU. Melhorias apenas da interface são aplicadas por recarga.",
  ],
  [
    "Por que o Windows pode mostrar um aviso ao instalar?",
    "Esta distribuição ainda não tem assinatura de código. Por isso, o Windows pode mostrar um aviso de editor desconhecido. O arquivo é distribuído pelo repositório oficial do ZULU e seu SHA-256 está disponível na página de downloads.",
  ],
  [
    "Preciso de uma conta para começar?",
    "Sim. Crie sua conta, confirme seu e-mail e configure a autenticação em duas etapas. Depois, crie seu time ou entre pelo convite de um administrador. A demonstração pode ser explorada sem conta e usa dados fictícios.",
  ],
  [
    "Posso usar tudo sem internet?",
    "O ZULU precisa de conexão para sincronizar conversas, tarefas e agenda. Há um leitor offline opcional para conversas selecionadas, protegido por uma senha local. Ele não inclui anexos e não substitui a sincronização online.",
  ],
];
export function MarketingFAQ({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`m-faq m-shell ${compact ? "m-faq-compact" : ""}`}
      id="duvidas"
      aria-labelledby="faq-heading"
    >
      <div>
        <h2 id="faq-heading">
          Antes do
          <br />
          primeiro olá.
        </h2>
        <p>
          Respostas para começar
          <br />
          com o pé direito.
        </p>
        <a
          className="m-text-link"
          href="https://github.com/yeMorGx/Hub/issues"
          target="_blank"
          rel="noreferrer"
        >
          Ainda tem uma dúvida? <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
      <div className="m-faq-list">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <Plus aria-hidden="true" />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="m-page" id="topo">
      <a className="m-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <MarketingNav />
      <main id="conteudo">
        <section className="m-hero">
          <div className="m-shell m-hero-grid">
            <div className="m-hero-copy">
              <h1>
                Seu time.
                <br />
                Um lugar.
                <br />
                <span>Mais fluxo.</span>
              </h1>
              <p>
                Conversas, tarefas, agenda e horas.
                <br />O trabalho se encontra no ZULU.
              </p>
              <div className="m-hero-actions">
                <Link href="/download" className="m-button m-button-lime">
                  Conheça os downloads <ArrowDown aria-hidden="true" />
                </Link>
                <Link href="/demo" className="m-hero-demo">
                  Ver o ZULU por dentro <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
              <span className="m-hero-note">
                No Windows. No navegador. Com seu time.
              </span>
            </div>
            <Link
              href="/demo"
              className="m-hero-stage"
              aria-label="Abrir demonstração do ZULU"
            >
              <div className="m-window-label">
                <span>
                  <BrandMark size={18} /> Um dia no ZULU
                </span>
                <span>
                  Trabalho em sintonia <span className="m-status-dot" />
                </span>
              </div>
              <div className="m-hero-screen">
                <Image
                  src="/marketing/today-zulu-prism.webp"
                  alt="Aplicativo ZULU: foco do dia, timer, reuniões e agenda do time. Dados de demonstração."
                  width={1440}
                  height={1000}
                  sizes="(max-width: 760px) 900px, 1000px"
                  preload
                />
              </div>
              <div className="m-stage-bottom">
                <span>
                  Uma visão compartilhada.
                  <br />
                  <strong>Cada pessoa no seu melhor ritmo.</strong>
                </span>
                <span className="m-stage-mark">
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </div>
            </Link>
          </div>
          <div
            className="m-hero-words m-shell"
            aria-label="Converse, planeje, foque e entregue"
          >
            <span>Converse.</span>
            <span>Planeje.</span>
            <span>Foque.</span>
            <span>
              Entregue.
              <ArrowDown aria-hidden="true" />
            </span>
          </div>
        </section>
        <ProductExplorer />
        <section className="m-connection" id="recursos">
          <div className="m-shell">
            <div className="m-connection-heading">
              <h2>
                Menos troca de abas.
                <br />
                Mais troca de ideias.
              </h2>
              <p>
                O contexto acompanha o trabalho.
                <br />E o time acompanha você.
              </p>
            </div>
            <div className="m-connection-grid">
              <div className="m-connection-image">
                <Image
                  src="/marketing/chat-zulu.webp"
                  alt="Conversas do ZULU, com canais e mensagens de exemplo"
                  width={1440}
                  height={1000}
                  sizes="(max-width: 760px) 100vw, 65vw"
                />
                <span>Demonstração · conteúdo fictício</span>
              </div>
              <div className="m-connection-list">
                <article>
                  <ChatCircleText aria-hidden="true" />
                  <h3>Conversa com contexto.</h3>
                  <p>
                    Canais, mensagens diretas, respostas e arquivos. Um lugar
                    para retomar o assunto.
                  </p>
                </article>
                <article>
                  <CalendarBlank aria-hidden="true" />
                  <h3>Uma agenda em comum.</h3>
                  <p>
                    Reuniões, eventos e confirmações. Saiba onde o time se
                    encontra.
                  </p>
                </article>
                <article>
                  <SquaresFour aria-hidden="true" />
                  <h3>Da tarefa para a ação.</h3>
                  <p>
                    Kanban e timer conectados para acompanhar o que está em
                    andamento.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>
        <section className="m-details-section m-shell">
          <div className="m-details-copy">
            <h2>
              Espaço para focar.
              <br />
              Liberdade para fluir.
            </h2>
            <p>O ZULU cuida do contexto para você cuidar do que está fazendo.</p>
            <ul>
              <li>
                <Check aria-hidden="true" />
                <span>
                  <strong>Um atalho, e você está no foco.</strong>
                  <br />
                  Ctrl + Shift + H alterna o timer no Windows.
                </span>
              </li>
              <li>
                <Bell aria-hidden="true" />
                <span>
                  <strong>Fique por perto, sem ficar preso.</strong>
                  <br />
                  Ative notificações para mensagens e lembretes.
                </span>
              </li>
              <li>
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>Seu time, com acesso definido.</strong>
                  <br />
                  Autenticação em duas etapas e papéis por pessoa.
                </span>
              </li>
            </ul>
            <Link href="/download" className="m-text-link">
              Levar o ZULU para o desktop <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <FocusDemo />
        </section>
        <section className="m-browser-band">
          <div className="m-shell">
            <Globe size={40} aria-hidden="true" />
            <div>
              <h2>Seu espaço não cabe em um só dispositivo.</h2>
              <p>
                Comece no computador. Continue no navegador. A mesma conta, o
                mesmo time.
              </p>
            </div>
            <Link href="/login" className="m-button m-button-outline">
              Abrir versão web <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </section>
        <MarketingFAQ />
        <section className="m-final">
          <div className="m-shell">
            <span className="m-final-symbol" aria-hidden="true">
              <BrandMark size={54} />
            </span>
            <h2>
              Bom trabalho
              <br />
              começa com
              <br />
              <span>um bom lugar.</span>
            </h2>
            <div>
              <p>
                O seu time já tem o que fazer.
                <br />
                Agora tem onde se encontrar.
              </p>
              <Link href="/download" className="m-button m-button-lime">
                Encontre sua versão do ZULU <ArrowDown aria-hidden="true" />
              </Link>
              <Link href="/demo" className="m-final-demo">
                Ou explore a demonstração <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function DownloadPage() {
  const [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  return (
    <div className="m-page m-download-page" id="topo">
      <a className="m-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <MarketingNav download />
      <main id="conteudo">
        <section className="m-download-intro m-shell">
          <Link href="/site" className="m-back-link">
            Conheça o ZULU <ArrowUpRight aria-hidden="true" />
          </Link>
          <h1>
            O ZULU.
            <br />
            <span>Do seu jeito.</span>
          </h1>
          <p>
            Escolha onde o trabalho acontece.
            <br />O seu time vai junto.
          </p>
        </section>
        <section
          className="m-download-systems m-shell"
          id="sistemas"
          aria-label="Escolha seu sistema operacional"
        >
          <article className="m-windows-download">
            <div className="m-download-card-top">
              <WindowsLogo weight="fill" size={48} aria-hidden="true" />
              <span className="m-release-tag">
                Versão {WINDOWS_RELEASE.version}
              </span>
            </div>
            <h2>
              Feito para
              <br />o seu Windows.
            </h2>
            <p>
              Uma janela para o time. Um atalho para o foco.
              <br />
              Seu ZULU, sempre por perto.
            </p>
            <a
              className="m-button m-button-lime"
              href={WINDOWS_RELEASE.download}
            >
              <DownloadSimple aria-hidden="true" />
              Baixar para Windows
            </a>
            <span className="m-download-file">
              Windows 10 / 11 · x64 · .exe · {(WINDOWS_RELEASE.bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MiB
            </span>
            <div className="m-windows-features">
              <span>
                <Check aria-hidden="true" />
                Atalho global do timer
              </span>
              <span>
                <Check aria-hidden="true" />
                Indicador de não lidas
              </span>
              <span>
                <Check aria-hidden="true" />
                Avisos de novas versões
              </span>
            </div>
          </article>
          <div className="m-other-systems">
            <article>
              <AppleLogo weight="fill" size={35} aria-hidden="true" />
              <div>
                <h2>macOS</h2>
                <p>
                  Use o ZULU pelo navegador.
                  <br />
                  Instalador ainda não disponível nesta distribuição.
                </p>
              </div>
              <Link href="/login">
                Abrir versão web <ArrowUpRight aria-hidden="true" />
              </Link>
            </article>
            <article>
              <Globe size={35} aria-hidden="true" />
              <div>
                <h2>Linux</h2>
                <p>
                  Seu time também está na web.
                  <br />
                  Instalador ainda não disponível nesta distribuição.
                </p>
              </div>
              <Link href="/login">
                Abrir versão web <ArrowUpRight aria-hidden="true" />
              </Link>
            </article>
            <div className="m-mobile-note">
              <span>NO CELULAR TAMBÉM.</span>
              <p>
                Abra o ZULU no navegador e instale como PWA quando seu
                dispositivo oferecer essa opção.
              </p>
              <Link href="/login" className="m-text-link">
                Continuar na web <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
        <section className="m-install-info m-shell">
          <div>
            <h2>
              Da instalação
              <br />
              ao primeiro olá.
            </h2>
            <p>São poucos passos para trazer o time para perto.</p>
          </div>
          <ol>
            <li>
              <span>Baixe o instalador.</span>
              <p>
                Escolha a versão Windows x64 acima. A instalação requer conexão
                e pode obter o Microsoft WebView2, se necessário.
              </p>
            </li>
            <li>
              <span>Instale e entre na sua conta.</span>
              <p>
                Abra o arquivo .exe. Depois, confirme seu e-mail e a
                autenticação em duas etapas no ZULU.
              </p>
            </li>
            <li>
              <span>Encontre seu time.</span>
              <p>
                Crie um time ou aceite um convite. As conversas e os dados são
                os mesmos da versão web.
              </p>
            </li>
          </ol>
        </section>
        <section
          className="m-release-info m-shell"
          aria-labelledby="release-heading"
        >
          <div>
            <h2 id="release-heading">Sobre este download.</h2>
            <p>Versão {WINDOWS_RELEASE.version} · Windows x64</p>
            <a
              href={WINDOWS_RELEASE.notes}
              target="_blank"
              rel="noreferrer"
              className="m-text-link"
            >
              Notas da versão <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
          <div>
            <h3>Um detalhe antes de instalar.</h3>
            <p>
              O instalador ainda não tem assinatura de código. O Windows pode
              mostrar um aviso de editor desconhecido. Baixe apenas pelo link
              oficial desta página.
            </p>
            <details className="m-checksum">
              <summary>
                Conferir integridade do arquivo <Plus aria-hidden="true" />
              </summary>
              <p>
                Compare o SHA-256 abaixo com o resultado de{" "}
                <code>
                  Get-FileHash .\{WINDOWS_RELEASE.filename} -Algorithm SHA256
                </code>{" "}
                no PowerShell.
              </p>
              <code>{WINDOWS_RELEASE.sha256}</code>
              <button
                className="m-text-link"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(WINDOWS_RELEASE.sha256);
                    setCopied(true);
                    setCopyError(false);
                  } catch {
                    setCopyError(true);
                  }
                }}
              >
                {copied ? "Hash copiado" : "Copiar SHA-256"}{" "}
                {copied ? (
                  <Check aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
              </button>
              <span role="status">
                {copied
                  ? "SHA-256 copiado para a área de transferência."
                  : copyError
                    ? "Não foi possível copiar. Selecione o código acima para copiar manualmente."
                    : ""}
              </span>
            </details>
          </div>
        </section>
        <MarketingFAQ compact />
        <section className="m-download-web">
          <div className="m-shell">
            <div>
              <h2>
                Sem instalar.
                <br />
                Sem ficar de fora.
              </h2>
              <p>Prefere o navegador? O ZULU está lá também.</p>
            </div>
            <Link href="/login" className="m-button m-button-lime">
              Entrar no ZULU web <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
