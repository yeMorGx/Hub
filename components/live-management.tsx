"use client";
import { ZuluForm } from "./dashboard-ui";
import { ZuluButton, ZuluLabel, ZuluInput, ZuluSelect, ZuluCheckboxField } from "./dashboard-ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowClockwise,
  CalendarBlank,
  ChartBar,
  Check,
  Clock,
  DownloadSimple,
  Flag,
  Plus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { Row } from "@/lib/hub/types";
import { useManagement, type ReportRow } from "@/lib/hub/use-management";
import { dayKey, mondayOf, toLocalInput } from "@/lib/hub/dates";
import { downloadCsv, downloadPdf } from "@/lib/hub/exports";
import { errorMessage } from "@/lib/supabase/errors";
import { EmptyState } from "./hub-ui";
const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceita, aguardando aprovação",
  approved: "Aprovada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};
const absenceLabels: Record<string, string> = {
  vacation: "Férias",
  leave: "Ausência",
  medical: "Saúde",
};
function nextDay(value: string) {
  const date = new Date(value + "T00:00:00");
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}
function hours(seconds: number) {
  return (
    (seconds / 3600).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }) + " h"
  );
}
export type ManagementTab = "reports" | "goals" | "shifts" | "absences" | "dates" | "clients";
export function LiveManagement({ hub, initialTab = "reports", embedded = false }: { hub: HubController; initialTab?: ManagementTab; embedded?: boolean }) {
  const today = dayKey(new Date()),
    month = today.slice(0, 7) + "-01";
  const [tab, setTab] = useState<
      "reports" | "goals" | "shifts" | "absences" | "dates" | "clients"
    >(initialTab),
    [from, setFrom] = useState(month),
    [to, setTo] = useState(today),
    [userId, setUserId] = useState(""),
    [projectId, setProjectId] = useState(""),
    [clientId, setClientId] = useState(""),
    [report, setReport] = useState<ReportRow[] | null>(null),
    [reportBusy, setReportBusy] = useState(false),
    [error, setError] = useState(""),
    [weekly, setWeekly] = useState<Record<string, number>>({}),
    [editingShift, setEditingShift] = useState<Row<"shifts"> | null>(null),
    [swapShift, setSwapShift] = useState("");
  const store = useManagement(hub, from, to),
    data = store.data,
    request = useRef(0),
    canManage = hub.canManage;
  const signature = JSON.stringify([
    hub.teamId,
    from,
    to,
    userId,
    projectId,
    clientId,
  ]);
  useEffect(() => {
    request.current++;
    setReport(null);
    setReportBusy(false);
    setError("");
  }, [signature]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const person = (id: string) =>
    hub.snapshot.people.find((p) => p.id === id)?.display_name || "Membro";
  async function readReport(
    start: string,
    end: string,
    user?: string,
    project?: string,
    client?: string,
  ) {
    const all: ReportRow[] = [];
    let after: string | undefined;
    while (true) {
      const { data, error } = await hub.client.rpc("report_time_entries", {
        p_team_id: hub.teamId,
        p_from: new Date(start + "T00:00:00").toISOString(),
        p_to: nextDay(end),
        p_user_id: user || undefined,
        p_project_id: project || undefined,
        p_client_id: client || undefined,
        p_after: after,
      });
      if (error) throw error;
      all.push(...data);
      if (data.length < 500) break;
      after = data[data.length - 1].entry_id;
    }
    return all;
  }
  async function loadReport() {
    const generation = ++request.current;
    setReportBusy(true);
    setError("");
    try {
      const rows = await readReport(from, to, userId, projectId, clientId);
      if (generation === request.current) setReport(rows);
    } catch (e) {
      if (generation === request.current) setError(errorMessage(e));
    } finally {
      if (generation === request.current) setReportBusy(false);
    }
  }
  useEffect(() => {
    if (tab !== "goals") return;
    let active = true;
    const start = mondayOf(new Date()),
      end = new Date(start);
    end.setDate(end.getDate() + 6);
    void readReport(
      dayKey(start),
      dayKey(end),
      canManage ? undefined : hub.userId,
    )
      .then((rows) => {
        if (active)
          setWeekly(
            rows.reduce<Record<string, number>>(
              (map, r) => ({
                ...map,
                [r.user_id]: (map[r.user_id] || 0) + r.duration_seconds,
              }),
              {},
            ),
          );
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [tab, hub.teamId, hub.snapshot.entries]);
  async function act(action: () => Promise<unknown>, message: string) {
    const result = await hub.mutate(action, message);
    if (result.ok) {
      await store.refresh();
      setError("");
    } else setError(result.error || "Não foi possível concluir.");
    return result.ok;
  }
  const reportRows = (report || []).map((r) => [
    r.display_name,
    r.project_name || "Sem projeto",
    r.client_name || "Sem cliente",
    r.description,
    new Date(r.started_at).toLocaleString("pt-BR"),
    new Date(r.ended_at).toLocaleString("pt-BR"),
    (r.duration_seconds / 3600).toFixed(2),
  ]);
  const columns = [
    "Pessoa",
    "Projeto",
    "Cliente",
    "Descrição",
    "Início",
    "Fim",
    "Horas",
  ];
  const grouped = (report || []).reduce<
    Record<string, { name: string; seconds: number }>
  >((m, r) => {
    const key = `${r.user_id}:${r.project_id}:${r.client_id}`;
    m[key] = {
      name: `${r.display_name} · ${r.project_name || "Sem projeto"} · ${r.client_name || "Sem cliente"}`,
      seconds: (m[key]?.seconds || 0) + r.duration_seconds,
    };
    return m;
  }, {});
  return (
    <section className="management-workspace">
      <nav className="workspace-tabs" aria-label="Gestão" hidden={embedded}>
        {(
          [
            { id: "reports", label: "Relatórios", icon: ChartBar },
            { id: "goals", label: "Metas", icon: Flag },
            { id: "shifts", label: "Escala", icon: Clock },
            { id: "absences", label: "Ausências", icon: UsersThree },
            { id: "dates", label: "Datas do time", icon: CalendarBlank },
            { id: "clients", label: "Clientes", icon: UsersThree },
          ] as const
        ).map((t) => (
          <ZuluButton
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => {
              setTab(t.id);
              setError("");
            }}
          >
            <t.icon size={18} />
            {t.label}
          </ZuluButton>
        ))}
        <ZuluButton
          className="icon-button"
          aria-label="Atualizar gestão"
          onClick={() => void store.refresh()}
        >
          <ArrowClockwise size={18} />
        </ZuluButton>
      </nav>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {tab === "reports" ? (
        <>
          <div className="workspace-section-heading">
            <div>
              <h2>Horas que contam a história do trabalho</h2>
              <p>
                {canManage
                  ? "Visão autorizada das pessoas deste time."
                  : "Somente seus registros são incluídos."}{" "}
                Registros encerrados, com corte no período selecionado.
              </p>
            </div>
          </div>
          <ZuluForm
            className="report-filters"
            onSubmit={(e) => {
              e.preventDefault();
              void loadReport();
            }}
          >
            <ZuluLabel>
              De
              <ZuluInput
                type="date"
                value={from}
                onValueChange={(e) => setFrom(e)}
                required
              />
            </ZuluLabel>
            <ZuluLabel>
              Até
              <ZuluInput
                type="date"
                value={to}
                min={from}
                onValueChange={(e) => setTo(e)}
                required
              />
            </ZuluLabel>
            {canManage && (
              <ZuluLabel>
                Pessoa
                <ZuluSelect
                  value={userId}
                  onValueChange={(e) => setUserId(e)}
                >
                  <option value="">Todas</option>
                  {hub.snapshot.people.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </ZuluSelect>
              </ZuluLabel>
            )}
            <ZuluLabel>
              Projeto
              <ZuluSelect
                value={projectId}
                onValueChange={(e) => setProjectId(e)}
              >
                <option value="">Todos</option>
                {hub.snapshot.projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </ZuluSelect>
            </ZuluLabel>
            <ZuluLabel>
              Cliente
              <ZuluSelect
                value={clientId}
                onValueChange={(e) => setClientId(e)}
              >
                <option value="">Todos</option>
                {data?.clients.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </ZuluSelect>
            </ZuluLabel>
            <ZuluButton className="primary-button" disabled={reportBusy}>
              {reportBusy ? "Consultando…" : "Gerar relatório"}
            </ZuluButton>
          </ZuluForm>
          {report !== null ? (
            <>
              <div className="report-summary">
                <div>
                  <span>Horas registradas</span>
                  <strong>
                    {hours(report.reduce((s, r) => s + r.duration_seconds, 0))}
                  </strong>
                  <small>{report.length} registros no período</small>
                </div>
                <div className="report-export">
                  <ZuluButton
                    className="outline-button"
                    disabled={!report.length}
                    onClick={() =>
                      downloadCsv(
                        `hub-horas-${from}-${to}.csv`,
                        columns,
                        reportRows,
                      )
                    }
                  >
                    <DownloadSimple size={16} />
                    CSV
                  </ZuluButton>
                  <ZuluButton
                    className="outline-button"
                    disabled={!report.length}
                    onClick={() =>
                      void downloadPdf(
                        `hub-horas-${from}-${to}.pdf`,
                        "ZULU · Relatório de horas",
                        `${hub.currentTeam?.name || "Time"} · ${from} a ${to}`,
                        columns,
                        reportRows,
                      ).catch((e) => setError(errorMessage(e)))
                    }
                  >
                    <DownloadSimple size={16} />
                    PDF
                  </ZuluButton>
                </div>
              </div>
              {report.length ? (
                <>
                  <div className="report-groups">
                    {Object.entries(grouped).map(([key, g]) => (
                      <div key={key}>
                        <span>{g.name}</span>
                        <strong>{hours(g.seconds)}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="table-scroll-hint">
                    Deslize a tabela para ver todas as colunas.
                  </p>
                  <div className="table-scroll" data-lenis-prevent>
                    <table className="workspace-table">
                      <thead>
                        <tr>
                          {columns.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.slice(0, 500).map((r) => (
                          <tr key={r.entry_id}>
                            <td>{r.display_name}</td>
                            <td>{r.project_name || "Sem projeto"}</td>
                            <td>{r.client_name || "Sem cliente"}</td>
                            <td>{r.description || "Sem descrição"}</td>
                            <td>
                              {new Date(r.started_at).toLocaleString("pt-BR")}
                            </td>
                            <td>
                              {new Date(r.ended_at).toLocaleString("pt-BR")}
                            </td>
                            <td>{hours(r.duration_seconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {report.length > 500 && (
                    <p className="muted">
                      A tabela mostra os primeiros 500 registros; total e
                      exportações incluem todos os {report.length} registros
                      consultados.
                    </p>
                  )}
                </>
              ) : (
                <EmptyState
                  title="Nenhum registro neste período"
                  description="Ajuste os filtros ou registre suas horas para começar."
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={<ChartBar size={36} />}
              title="Escolha o período e gere o relatório"
              description="A consulta respeita o papel da sua conta e inclui todos os registros encerrados do intervalo, sem o limite do histórico recente."
            />
          )}
        </>
      ) : store.error ? (
        <EmptyState
          title="Não foi possível carregar a gestão"
          description={store.error}
          action="Tentar novamente"
          onAction={() => void store.refresh()}
        />
      ) : !data ? (
        <p role="status">Carregando gestão…</p>
      ) : (
        <>
          {tab === "goals" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Ritmo sustentável, metas claras</h2>
                  <p>
                    Progresso considera horas encerradas na semana atual. O
                    alerta do timer usa o limite escolhido.
                  </p>
                </div>
              </div>
              {hub.canParticipate && (
                <ZuluForm
                  className="inline-work-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await act(
                      () =>
                        hub.rpc("set_time_goal", {
                          p_team_id: hub.teamId,
                          p_user_id: String(f.get("user")),
                          p_weekly_minutes: Math.round(
                            Number(f.get("hours")) * 60,
                          ),
                          p_forgotten_after_minutes: Math.round(
                            Number(f.get("alert")) * 60,
                          ),
                        }),
                      "Meta atualizada.",
                    );
                  }}
                >
                  <ZuluLabel>
                    Pessoa
                    <ZuluSelect name="user" defaultValue={hub.userId}>
                      {hub.snapshot.people
                        .filter((p) => canManage || p.id === hub.userId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.display_name}
                          </option>
                        ))}
                    </ZuluSelect>
                  </ZuluLabel>
                  <ZuluLabel>
                    Meta semanal (horas)
                    <ZuluInput
                      name="hours"
                      type="number"
                      min="0"
                      max="168"
                      step="0.25"
                      defaultValue={
                        (data.goals.find((g) => g.user_id === hub.userId)
                          ?.weekly_minutes || 2400) / 60
                      }
                      required
                    />
                  </ZuluLabel>
                  <ZuluLabel>
                    Alertar timer após (horas)
                    <ZuluInput
                      name="alert"
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      defaultValue={
                        (data.goals.find((g) => g.user_id === hub.userId)
                          ?.forgotten_after_minutes || 480) / 60
                      }
                      required
                    />
                  </ZuluLabel>
                  <ZuluButton className="primary-button" disabled={hub.busy}>
                    Salvar meta
                  </ZuluButton>
                </ZuluForm>
              )}
              <div className="goal-list">
                {data.goals.map((goal) => (
                  <article key={goal.user_id}>
                    <div>
                      <strong>{person(goal.user_id)}</strong>
                      <span>
                        {hours(weekly[goal.user_id] || 0)} de{" "}
                        {hours(goal.weekly_minutes * 60)}
                      </span>
                    </div>
                    <progress
                      value={Math.min(
                        weekly[goal.user_id] || 0,
                        goal.weekly_minutes * 60,
                      )}
                      max={Math.max(1, goal.weekly_minutes * 60)}
                      aria-label={`Progresso semanal de ${person(goal.user_id)}`}
                    />
                    <small>
                      Alerta de timer após {goal.forgotten_after_minutes / 60} h
                    </small>
                  </article>
                ))}
              </div>
              {!data.goals.length && (
                <EmptyState
                  title="Nenhuma meta definida"
                  description="Defina um objetivo semanal e acompanhe o progresso com registros encerrados."
                />
              )}
            </>
          )}
          {tab === "shifts" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Escala e plantão</h2>
                  <p>
                    Distribua os turnos e confirme trocas com aceite da pessoa e
                    aprovação da liderança.
                  </p>
                </div>
                <div className="workspace-filters">
                  <ZuluInput
                    aria-label="Início da escala"
                    type="date"
                    value={from}
                    onValueChange={(e) => setFrom(e)}
                  />
                  <ZuluInput
                    aria-label="Fim da escala"
                    type="date"
                    value={to}
                    min={from}
                    onValueChange={(e) => setTo(e)}
                  />
                </div>
              </div>
              {canManage && (
                <ZuluForm
                  key={editingShift?.id || "new"}
                  className="inline-work-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const ok = await act(
                      () =>
                        hub.rpc("save_shift", {
                          p_team_id: hub.teamId,
                          p_user_id: String(f.get("user")),
                          p_label: String(f.get("label")),
                          p_starts_at: new Date(
                            String(f.get("start")),
                          ).toISOString(),
                          p_ends_at: new Date(
                            String(f.get("end")),
                          ).toISOString(),
                          p_shift_id: editingShift?.id,
                          p_expected_version: editingShift?.version,
                        }),
                      "Turno salvo.",
                    );
                    if (ok) setEditingShift(null);
                  }}
                >
                  <ZuluLabel>
                    Nome do turno
                    <ZuluInput
                      name="label"
                      required
                      maxLength={120}
                      defaultValue={editingShift?.label || "Plantão"}
                    />
                  </ZuluLabel>
                  <ZuluLabel>
                    Pessoa
                    <ZuluSelect
                      name="user"
                      defaultValue={editingShift?.user_id || hub.userId}
                    >
                      {hub.snapshot.people.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.display_name}
                        </option>
                      ))}
                    </ZuluSelect>
                  </ZuluLabel>
                  <ZuluLabel>
                    Início
                    <ZuluInput
                      type="datetime-local"
                      name="start"
                      required
                      defaultValue={
                        editingShift
                          ? toLocalInput(editingShift.starts_at)
                          : undefined
                      }
                    />
                  </ZuluLabel>
                  <ZuluLabel>
                    Fim
                    <ZuluInput
                      type="datetime-local"
                      name="end"
                      required
                      defaultValue={
                        editingShift
                          ? toLocalInput(editingShift.ends_at)
                          : undefined
                      }
                    />
                  </ZuluLabel>
                  <ZuluButton className="primary-button" disabled={hub.busy}>
                    {editingShift ? "Salvar alteração" : "Criar turno"}
                  </ZuluButton>
                  {editingShift && (
                    <ZuluButton
                      type="button"
                      className="outline-button"
                      onClick={() => setEditingShift(null)}
                    >
                      Cancelar edição
                    </ZuluButton>
                  )}
                </ZuluForm>
              )}
              <div className="schedule-list">
                {data.shifts
                  .filter((s) => !s.cancelled_at)
                  .map((s) => (
                    <article key={s.id}>
                      <div>
                        <strong>
                          {s.label} · {person(s.user_id)}
                        </strong>
                        <small>
                          {new Date(s.starts_at).toLocaleString("pt-BR")} —{" "}
                          {new Date(s.ends_at).toLocaleString("pt-BR")}
                        </small>
                      </div>
                      {canManage && (
                        <>
                          <ZuluButton
                            className="text-button"
                            onClick={() => setEditingShift(s)}
                          >
                            Editar
                          </ZuluButton>
                          <ZuluButton
                            className="text-button"
                            disabled={hub.busy}
                            onClick={() => {
                              if (window.confirm("Cancelar este turno?"))
                                void act(
                                  () =>
                                    hub.rpc("save_shift", {
                                      p_team_id: hub.teamId,
                                      p_user_id: s.user_id,
                                      p_label: s.label,
                                      p_starts_at: s.starts_at,
                                      p_ends_at: s.ends_at,
                                      p_shift_id: s.id,
                                      p_expected_version: s.version,
                                      p_cancelled: true,
                                    }),
                                  "Turno cancelado.",
                                );
                            }}
                          >
                            Cancelar turno
                          </ZuluButton>
                        </>
                      )}
                      {s.user_id === hub.userId &&
                        new Date(s.starts_at).getTime() > Date.now() && (
                          <ZuluButton
                            className="outline-button"
                            onClick={() => setSwapShift(s.id)}
                          >
                            Pedir troca
                          </ZuluButton>
                        )}
                    </article>
                  ))}
              </div>
              {swapShift && (
                <ZuluForm
                  className="inline-work-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    if (
                      await act(
                        () =>
                          hub.rpc("request_shift_swap", {
                            p_shift_id: swapShift,
                            p_target_user_id: String(f.get("target")),
                          }),
                        "Pedido de troca enviado.",
                      )
                    )
                      setSwapShift("");
                  }}
                >
                  <ZuluLabel>
                    Quem pode assumir?
                    <ZuluSelect name="target" required>
                      {hub.snapshot.people
                        .filter((p) => p.id !== hub.userId)
                        .map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.display_name}
                          </option>
                        ))}
                    </ZuluSelect>
                  </ZuluLabel>
                  <ZuluButton className="primary-button" disabled={hub.busy}>
                    Solicitar troca
                  </ZuluButton>
                  <ZuluButton
                    type="button"
                    className="outline-button"
                    onClick={() => setSwapShift("")}
                  >
                    Cancelar
                  </ZuluButton>
                </ZuluForm>
              )}
              {!data.shifts.some((s) => !s.cancelled_at) && (
                <EmptyState
                  title="Nenhum turno no período"
                  description="A liderança pode organizar a próxima escala."
                />
              )}
              {data.swaps.length > 0 && (
                <>
                  <h3 className="workspace-subheading">Trocas em andamento</h3>
                  <div className="schedule-list">
                    {data.swaps.map((r) => (
                      <article key={r.id}>
                        <div>
                          <strong>
                            {person(r.requested_by)} →{" "}
                            {person(r.target_user_id)}
                          </strong>
                          <small>{statusLabels[r.status]}</small>
                        </div>
                        {r.target_user_id === hub.userId &&
                          r.status === "pending" && (
                            <ZuluButton
                              className="outline-button"
                              onClick={() =>
                                void act(
                                  () =>
                                    hub.rpc("decide_shift_swap", {
                                      p_request_id: r.id,
                                      p_action: "accepted",
                                    }),
                                  "Troca aceita. Aguardando liderança.",
                                )
                              }
                            >
                              Aceitar
                            </ZuluButton>
                          )}
                        {canManage && r.status === "accepted" && (
                          <ZuluButton
                            className="primary-button"
                            disabled={hub.busy}
                            onClick={() =>
                              void act(
                                () =>
                                  hub.rpc("decide_shift_swap", {
                                    p_request_id: r.id,
                                    p_action: "approved",
                                  }),
                                "Troca aprovada.",
                              )
                            }
                          >
                            Aprovar
                          </ZuluButton>
                        )}
                        {(r.target_user_id === hub.userId || canManage) && (
                          <ZuluButton
                            className="text-button"
                            onClick={() =>
                              void act(
                                () =>
                                  hub.rpc("decide_shift_swap", {
                                    p_request_id: r.id,
                                    p_action: "rejected",
                                  }),
                                "Troca recusada.",
                              )
                            }
                          >
                            Recusar
                          </ZuluButton>
                        )}
                        {r.requested_by === hub.userId && (
                          <ZuluButton
                            className="text-button"
                            onClick={() =>
                              void act(
                                () =>
                                  hub.rpc("decide_shift_swap", {
                                    p_request_id: r.id,
                                    p_action: "cancelled",
                                  }),
                                "Pedido cancelado.",
                              )
                            }
                          >
                            Cancelar pedido
                          </ZuluButton>
                        )}
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {tab === "absences" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Tempo para descansar e se cuidar</h2>
                  <p>
                    Detalhes são visíveis somente para a pessoa e a liderança. O
                    time consulta apenas as datas aprovadas.
                  </p>
                </div>
              </div>
              {hub.canParticipate && (
                <ZuluForm
                  className="inline-work-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    if (
                      await act(
                        () =>
                          hub.rpc("request_absence", {
                            p_team_id: hub.teamId,
                            p_kind: String(f.get("kind")),
                            p_starts_on: String(f.get("start")),
                            p_ends_on: String(f.get("end")),
                            p_note: String(f.get("note")),
                          }),
                        "Solicitação enviada para aprovação.",
                      )
                    )
                      form.reset();
                  }}
                >
                  <ZuluLabel>
                    Tipo
                    <ZuluSelect name="kind">
                      {Object.entries(absenceLabels).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </ZuluSelect>
                  </ZuluLabel>
                  <ZuluLabel>
                    De
                    <ZuluInput type="date" name="start" required />
                  </ZuluLabel>
                  <ZuluLabel>
                    Até
                    <ZuluInput type="date" name="end" required />
                  </ZuluLabel>
                  <ZuluLabel>
                    Observação privada
                    <ZuluInput name="note" maxLength={4000} />
                  </ZuluLabel>
                  <ZuluButton className="primary-button" disabled={hub.busy}>
                    Solicitar ausência
                  </ZuluButton>
                </ZuluForm>
              )}
              <div className="schedule-list">
                {data.absences.map((a) => (
                  <article key={a.id}>
                    <div>
                      <strong>
                        {person(a.user_id)} · {absenceLabels[a.kind]}
                      </strong>
                      <small>
                        {a.starts_on} — {a.ends_on} · {statusLabels[a.status]}
                      </small>
                      {a.note && <p>{a.note}</p>}
                      {a.decision_note && <p>Decisão: {a.decision_note}</p>}
                    </div>
                    {a.status === "pending" &&
                      canManage &&
                      a.user_id !== hub.userId && (
                        <>
                          <ZuluButton
                            className="outline-button"
                            disabled={hub.busy}
                            onClick={() =>
                              void act(
                                () =>
                                  hub.rpc("decide_absence", {
                                    p_absence_id: a.id,
                                    p_status: "approved",
                                  }),
                                "Ausência aprovada.",
                              )
                            }
                          >
                            <Check size={15} />
                            Aprovar
                          </ZuluButton>
                          <ZuluButton
                            className="text-button"
                            disabled={hub.busy}
                            onClick={() =>
                              void act(
                                () =>
                                  hub.rpc("decide_absence", {
                                    p_absence_id: a.id,
                                    p_status: "rejected",
                                  }),
                                "Ausência recusada.",
                              )
                            }
                          >
                            Recusar
                          </ZuluButton>
                        </>
                      )}
                    {["pending", "approved"].includes(a.status) &&
                      (a.user_id === hub.userId || canManage) && (
                        <ZuluButton
                          className="text-button"
                          disabled={hub.busy}
                          onClick={() => {
                            if (window.confirm("Cancelar esta ausência?"))
                              void act(
                                () =>
                                  hub.rpc("cancel_absence", {
                                    p_absence_id: a.id,
                                  }),
                                "Ausência cancelada.",
                              );
                          }}
                        >
                          Cancelar
                        </ZuluButton>
                      )}
                  </article>
                ))}
              </div>
              {!data.absences.length && (
                <EmptyState
                  title="Nenhuma solicitação"
                  description="Suas solicitações e as decisões aparecem aqui."
                />
              )}
              <h3 className="workspace-subheading">
                Ausências aprovadas no período
              </h3>
              <p className="muted">
                {from} a {to}. O motivo não é compartilhado.
              </p>
              <div className="schedule-list">
                {data.schedule.map((a, i) => (
                  <article key={`${a.user_id}:${i}`}>
                    <div>
                      <strong>{person(a.user_id)}</strong>
                      <small>
                        {a.starts_on} — {a.ends_on}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "dates" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Datas que aproximam o time</h2>
                  <p>Compartilhe aniversários e marcos somente se desejar.</p>
                </div>
              </div>
              {hub.canParticipate && (
                <ZuluForm
                  className="inline-work-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    if (
                      await act(
                        () =>
                          hub.rpc("save_team_date", {
                            p_team_id: hub.teamId,
                            p_label: String(f.get("label")),
                            p_happens_on: String(f.get("date")),
                            p_recurs_yearly: f.get("yearly") === "on",
                          }),
                        "Data adicionada ao time.",
                      )
                    )
                      form.reset();
                  }}
                >
                  <ZuluLabel>
                    Nome da data
                    <ZuluInput
                      name="label"
                      required
                      maxLength={160}
                      placeholder="Aniversário ou marco do time"
                    />
                  </ZuluLabel>
                  <ZuluLabel>
                    Data
                    <ZuluInput type="date" name="date" required />
                  </ZuluLabel>
                  <ZuluLabel className="checkbox-label">
                    <ZuluCheckboxField  name="yearly" defaultChecked />
                    Repetir todo ano
                  </ZuluLabel>
                  <ZuluButton className="primary-button" disabled={hub.busy}>
                    Adicionar data
                  </ZuluButton>
                </ZuluForm>
              )}
              <div className="schedule-list">
                {data.dates.map((d) => (
                  <article key={d.id}>
                    <CalendarBlank size={21} />
                    <div>
                      <strong>{d.label}</strong>
                      <small>
                        {new Date(
                          d.happens_on + "T12:00:00",
                        ).toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "long",
                          ...(!d.recurs_yearly ? { year: "numeric" } : {}),
                        })}
                        {d.recurs_yearly ? " · Todo ano" : ""}
                      </small>
                    </div>
                    {hub.canParticipate &&
                      (d.created_by === hub.userId || canManage) && (
                        <ZuluButton
                          className="text-button"
                          onClick={() => {
                            if (window.confirm("Remover esta data do time?"))
                              void act(
                                () =>
                                  hub.rpc("save_team_date", {
                                    p_team_id: hub.teamId,
                                    p_date_id: d.id,
                                    p_label: d.label,
                                    p_happens_on: d.happens_on,
                                    p_delete: true,
                                  }),
                                "Data removida.",
                              );
                          }}
                        >
                          Remover
                        </ZuluButton>
                      )}
                  </article>
                ))}
              </div>
              {!data.dates.length && (
                <EmptyState
                  title="Um calendário com a cara do time"
                  description="Adicione datas que vocês querem lembrar juntos."
                />
              )}
            </>
          )}
          {tab === "clients" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Clientes e projetos</h2>
                  <p>
                    Organize as horas por cliente usando o vínculo do projeto.
                  </p>
                </div>
              </div>
              {canManage && (
                <>
                  <ZuluForm
                    className="inline-work-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget,
                        f = new FormData(form);
                      if (
                        await act(
                          () =>
                            hub.rpc("save_client", {
                              p_team_id: hub.teamId,
                              p_name: String(f.get("name")),
                            }),
                          "Cliente criado.",
                        )
                      )
                        form.reset();
                    }}
                  >
                    <ZuluLabel>
                      Nome do cliente
                      <ZuluInput name="name" required maxLength={160} />
                    </ZuluLabel>
                    <ZuluButton className="primary-button" disabled={hub.busy}>
                      <Plus size={16} />
                      Criar cliente
                    </ZuluButton>
                  </ZuluForm>
                  <ZuluForm
                    className="inline-work-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      await act(
                        () =>
                          hub.rpc("set_project_client", {
                            p_project_id: String(f.get("project")),
                            p_client_id: String(f.get("client")) || undefined,
                          }),
                        "Projeto vinculado ao cliente.",
                      );
                    }}
                  >
                    <ZuluLabel>
                      Projeto
                      <ZuluSelect name="project" required>
                        <option value="">Selecione</option>
                        {hub.snapshot.projects.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </ZuluSelect>
                    </ZuluLabel>
                    <ZuluLabel>
                      Cliente
                      <ZuluSelect name="client">
                        <option value="">Sem cliente</option>
                        {data.clients
                          .filter((c) => !c.archived_at)
                          .map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </ZuluSelect>
                    </ZuluLabel>
                    <ZuluButton className="outline-button" disabled={hub.busy}>
                      Salvar vínculo
                    </ZuluButton>
                  </ZuluForm>
                </>
              )}
              <div className="schedule-list">
                {data.clients.map((c) => (
                  <article key={c.id}>
                    <div>
                      <strong>
                        {c.name}
                        {c.archived_at ? " · Arquivado" : ""}
                      </strong>
                      <small>
                        {hub.snapshot.projects
                          .filter((p) => p.client_id === c.id)
                          .map((p) => p.name)
                          .join(", ") || "Sem projetos vinculados"}
                      </small>
                    </div>
                    {canManage && !c.archived_at && (
                      <ZuluButton
                        className="text-button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Arquivar este cliente? O histórico será preservado.",
                            )
                          )
                            void act(
                              () =>
                                hub.rpc("save_client", {
                                  p_team_id: hub.teamId,
                                  p_name: c.name,
                                  p_client_id: c.id,
                                  p_archived: true,
                                }),
                              "Cliente arquivado.",
                            );
                        }}
                      >
                        Arquivar
                      </ZuluButton>
                    )}
                  </article>
                ))}
              </div>
              {!data.clients.length && (
                <EmptyState
                  title="Nenhum cliente cadastrado"
                  description="A liderança pode cadastrar clientes e vincular os projetos existentes."
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
