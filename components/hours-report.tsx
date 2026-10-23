"use client";
import { useEffect, useRef, useState } from "react";
import { Card, Spinner } from "@heroui/react";
import { DownloadSimple, ChartBar } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { ReportRow } from "@/lib/hub/use-management";
import { dayKey } from "@/lib/hub/dates";
import { reportDuration, reportGroups, reportPeople, type HoursReportData, type ReportBalance } from "@/lib/hub/hour-report";
import { downloadHoursPdf } from "@/lib/hub/hour-report-pdf";
import { csvBlob } from "@/lib/hub/exports";
import { saveReportFile, type ExportOutcome } from "@/lib/desktop/report-export";
import { ZuluButton, ZuluForm, ZuluInput, ZuluLabel, ZuluSelect } from "./dashboard-ui";
export function HoursReport({ hub }: { hub: HubController }) {
  const today = dayKey(new Date());
  const [from, setFrom] = useState(today.slice(0, 7) + "-01"), [to, setTo] = useState(today);
  const [user, setUser] = useState(hub.isAdmin ? "" : hub.userId), [project, setProject] = useState("");
  const [report, setReport] = useState<HoursReportData | null>(null), [busy, setBusy] = useState(false), [exporting, setExporting] = useState(false), [error, setError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const serial = useRef(0);
  async function exportFile(save: () => Promise<ExportOutcome>) {
    if (exporting) return;
    setExporting(true); setError(""); setExportNotice("");
    try { const outcome = await save(); setExportNotice(outcome === "saved" ? "Relatório salvo." : outcome === "downloaded" ? "Download solicitado. Confira os downloads." : "Exportação cancelada."); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar o relatório."); }
    finally { setExporting(false); }
  }
  useEffect(() => { serial.current++; setReport(null); setBusy(false); setError(""); setExportNotice(""); }, [from, to, user, project, hub.teamId, hub.isAdmin]);
  useEffect(() => () => { serial.current++; }, []);
  async function generate() {
    const generation = ++serial.current;
    setBusy(true); setReport(null); setError(""); setExportNotice("");
    try {
      const start = new Date(from + "T00:00:00"), end = new Date(to + "T00:00:00"); end.setDate(end.getDate() + 1);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 367 * 86400000) throw Error("Selecione um período de até um ano.");
      const rows: ReportRow[] = [], balances: ReportBalance[] = [];
      let after: string | undefined;
      while (true) {
        const result = await hub.client.rpc("report_time_entries", { p_team_id: hub.teamId, p_from: start.toISOString(), p_to: end.toISOString(), p_user_id: hub.isAdmin ? user || undefined : hub.userId, p_project_id: project || undefined, p_after: after });
        if (result.error) throw Error("Não foi possível consultar as horas. Tente novamente.");
        if (generation !== serial.current) return;
        rows.push(...result.data);
        if (result.data.length < 500) break;
        after = result.data.at(-1)!.entry_id;
      }
      for (let offset = 0;; offset += 1000) {
        const result = await hub.client.rpc("report_work_balances", { p_team_id: hub.teamId, p_from: from, p_to: to, p_user_id: hub.isAdmin ? user || undefined : hub.userId }).range(offset, offset + 999);
        if (result.error) throw Error("Não foi possível consultar a jornada. Tente novamente.");
        if (generation !== serial.current) return;
        balances.push(...result.data);
        if (result.data.length < 1000) break;
      }
      setReport({ organization: hub.workspace?.name ?? "Organização", team: hub.currentTeam?.name ?? "Time", from, to, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, rows, balances, project: hub.snapshot.projects.find(p => p.id === project)?.name ?? "", person: hub.snapshot.people.find(p => p.id === user)?.display_name ?? (!hub.isAdmin ? hub.bootstrap?.profile.display_name || "Meus registros" : "") });
    } catch (error) { if (generation === serial.current) setError(error instanceof Error ? error.message : "Não foi possível gerar o relatório."); }
    finally { if (generation === serial.current) setBusy(false); }
  }
  const groups = report ? reportGroups(report.rows, "project_id") : [];
  const total = report?.rows.reduce((sum, row) => sum + Number(row.duration_seconds), 0) ?? 0;
  return <section className="hours-report" aria-label="Relatório de horas">
    <div className="workspace-section-heading"><div><h2>O trabalho em detalhes</h2><p>{hub.isAdmin ? "Exporte seu time, com uma seção para cada pessoa." : "Seu relatório inclui apenas suas horas e atividades."} Sem valores financeiros.</p></div><ChartBar size={26} /></div>
    <ZuluForm className="report-filters" onSubmit={event => { event.preventDefault(); void generate(); }}>
      <ZuluLabel>De<ZuluInput type="date" required value={from} onChange={event => setFrom(event.target.value)} /></ZuluLabel>
      <ZuluLabel>Até<ZuluInput type="date" required min={from} value={to} onChange={event => setTo(event.target.value)} /></ZuluLabel>
      {hub.isAdmin && <ZuluLabel>Pessoa<ZuluSelect value={user} onValueChange={setUser} aria-label="Pessoa do relatório"><option value="">Time inteiro</option>{hub.snapshot.people.map(person => <option key={person.id} value={person.id}>{person.display_name}</option>)}</ZuluSelect></ZuluLabel>}
      <ZuluLabel>Projeto<ZuluSelect value={project} onValueChange={setProject} aria-label="Projeto do relatório"><option value="">Todos os projetos</option>{hub.snapshot.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</ZuluSelect></ZuluLabel>
      <ZuluButton type="submit" className="primary-button" disabled={busy}>{busy ? <><Spinner size="sm" />Consultando…</> : "Gerar relatório"}</ZuluButton>
    </ZuluForm>
    {error && <p role="alert" className="form-error">{error}</p>}
    {exportNotice && <p role="status">{exportNotice}</p>}
    {!report && !busy && !error && <div className="report-empty"><ChartBar size={34} /><h3>Escolha um período</h3><p>Veja os projetos e atividades antes de baixar o relatório.</p></div>}
    {report && <>
      <div className="report-summary"><div><span>Horas registradas</span><strong>{reportDuration(total)}</strong><small>{report.rows.length} registros encerrados · almoço e timer ativo excluídos</small></div>
        <div className="report-export"><ZuluButton className="primary-button" disabled={(!report.rows.length && !report.balances.length) || exporting} onClick={() => void exportFile(() => downloadHoursPdf(report))}><DownloadSimple size={17} />{exporting ? "Preparando PDF…" : "Baixar PDF"}</ZuluButton>
          <ZuluButton className="outline-button" disabled={!report.rows.length || exporting} onClick={() => void exportFile(() => saveReportFile(`zulu-horas-${from}-${to}.csv`, csvBlob(["Pessoa", "Projeto", "Cliente", "Atividade", "Início", "Término", "Segundos"], report.rows.map(row => [row.display_name, row.project_name, row.client_name, row.description, row.started_at, row.ended_at, row.duration_seconds]))))}>CSV</ZuluButton></div>
      </div>
      <Card className="report-chart"><Card.Header><Card.Title>Horas por projeto</Card.Title></Card.Header><Card.Content>
        {groups.length ? groups.map(group => <div className="report-bar-row" key={group.id}><span>{group.label}</span><div className="report-bar-track"><span style={{ width: `${Math.max(1, group.seconds / Math.max(1, total) * 100)}%` }} /></div><strong>{reportDuration(group.seconds)}</strong></div>) : <p>Nenhum registro encerrado nesse período.</p>}
      </Card.Content></Card>
      <div className="report-person-list">{reportPeople(report).map(person => <details key={person.id}><summary><strong>{person.label}</strong><span>{reportDuration(person.seconds)}</span></summary><div className="table-scroll" data-lenis-prevent><table className="workspace-table"><thead><tr><th>Data</th><th>Projeto</th><th>Atividade</th><th>Tempo</th></tr></thead><tbody>{report.rows.filter(row => row.user_id === person.id).map(row => <tr key={row.entry_id}><td>{new Date(row.started_at).toLocaleDateString("pt-BR")}</td><td>{row.project_name || "Sem projeto"}</td><td>{row.description || "Sem descrição"}</td><td>{reportDuration(Number(row.duration_seconds))}</td></tr>)}</tbody></table></div></details>)}</div>
    </>}
  </section>;
}
