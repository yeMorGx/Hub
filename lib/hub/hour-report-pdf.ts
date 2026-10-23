import { reportDays, reportDuration, reportGroups, reportPeople, type HoursReportData } from "./hour-report";
export async function createHoursPdf(data: HoursReportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", putOnlyUsedFonts: true });
  let font = "helvetica";
  if (typeof window !== "undefined") {
    const load = async (path: string) => {
      const response = await fetch(path); if (!response.ok) throw Error("Fonte indisponível");
      const bytes = new Uint8Array(await response.arrayBuffer()); let binary = "";
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return btoa(binary);
    };
    const [regular, bold] = await Promise.all([load("/fonts/report/Lato-Regular.ttf"), load("/fonts/report/Lato-Bold.ttf")]);
    doc.addFileToVFS("ZuluReport-Regular.ttf", regular); doc.addFont("ZuluReport-Regular.ttf", "ZuluReport", "normal");
    doc.addFileToVFS("ZuluReport-Bold.ttf", bold); doc.addFont("ZuluReport-Bold.ttf", "ZuluReport", "bold"); font = "ZuluReport";
  }
  doc.setFont(font, "normal");
  doc.setProperties({ title: `Relatório de horas - ${data.team}`, subject: `${data.from} a ${data.to}`, author: data.organization, creator: "ZULU" });
  const ink = [32, 43, 64] as const, blue = [41, 77, 148] as const;
  const dateLabel = (value: string) => new Date(value + "T12:00:00").toLocaleDateString("pt-BR");
  const number = (text: string, x: number, y: number, size = 10) => { doc.setTextColor(...ink); doc.setFontSize(size); doc.text(text, x, y); };
  const header = (title: string) => {
    doc.setFillColor(...blue); doc.rect(0, 0, 210, 6, "F");
    doc.setFont(font, "bold"); number(title, 14, 23, 19);
    doc.setFont(font, "normal"); number(`${data.organization} / ${data.team}`.slice(0, 100), 14, 31, 9);
    number(`${dateLabel(data.from)} a ${dateLabel(data.to)} | ${data.timezone}`, 14, 37, 8);
  };
  const bars = (title: string, items: { label: string; seconds: number }[], top: number, limit = 8) => {
    doc.setFont(font, "bold"); number(title, 14, top, 11); doc.setFont(font, "normal");
    const selected = items.slice(0, limit), max = Math.max(1, ...selected.map(item => item.seconds));
    selected.forEach((item, i) => {
      const y = top + 9 + i * 10;
      number(doc.splitTextToSize(item.label, 51)[0], 14, y, 8);
      doc.setFillColor(236, 240, 247); doc.roundedRect(68, y - 3.2, 91, 4, 1, 1, "F");
      doc.setFillColor(...blue); if (item.seconds > 0) doc.roundedRect(68, y - 3.2, Math.max(1, 91 * item.seconds / max), 4, 1, 1, "F");
      number(reportDuration(item.seconds), 163, y, 8);
    });
    if (items.length > limit) number(`+ ${items.length - limit} grupos detalhados nas páginas seguintes.`, 14, top + 10 + limit * 10, 8);
    return top + 17 + selected.length * 10;
  };
  const total = data.rows.reduce((sum, row) => sum + Number(row.duration_seconds), 0);
  const expected = data.balances.reduce((sum, row) => sum + Number(row.expected_minutes) * 60, 0);
  const actual = data.balances.reduce((sum, row) => sum + Number(row.actual_seconds), 0);
  header("Relatório de horas");
  doc.setFont(font, "bold"); number(reportDuration(total), 14, 56, 25); doc.setFont(font, "normal");
  number(`${data.rows.length} registros encerrados | ${reportPeople(data).length} pessoas`, 14, 65, 9);
  number(`Pessoa: ${data.person || "Time inteiro"} | Projeto: ${data.project || "Todos"}`.slice(0, 110), 14, 73, 8);
  number("Almoço e timers em andamento não entram nas horas deste relatório.", 14, 80, 8);
  let top = 94;
  if (!data.project && data.balances.length && data.balances.every(day => day.configured)) {
    number(`Jornada prevista: ${reportDuration(expected)} | Realizada: ${reportDuration(actual)}`, 14, top, 10);
    number(`Saldo: ${reportDuration(actual - expected)} ${actual >= expected ? "a mais" : "a compensar"}`, 14, top + 7, 9); top += 22;
  }
  top = bars("Distribuição por projeto", reportGroups(data.rows, "project_id"), top, 7);
  const days = reportDays(data.rows);
  if (top + 65 > 275) { doc.addPage(); header("Distribuição das horas"); top = 54; }
  number(days.length > 31 ? "Evolução por semana" : "Evolução por dia", 14, top, 11);
  const daily = days.length <= 31 ? days : (() => {
    const weeks = new Map<string, number>();
    for (const day of days) { const monday = new Date(day.label + "T12:00:00"); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7); const key = monday.toISOString().slice(0, 10); weeks.set(key, (weeks.get(key) ?? 0) + day.seconds); }
    return [...weeks].map(([label, seconds]) => ({ label, seconds }));
  })();
  const maxDay = Math.max(1, ...daily.map(day => day.seconds)), width = Math.min(18, 182 / Math.max(1, daily.length));
  daily.forEach((day, index) => {
    const height = day.seconds / maxDay * 35;
    doc.setFillColor(...blue); doc.rect(14 + index * width, top + 45 - height, Math.max(.8, width - 1), height, "F");
    if (index % Math.max(1, Math.ceil(daily.length / 8)) === 0) number(day.label.slice(8) + "/" + day.label.slice(5, 7), 14 + index * width, top + 51, 7);
  });
  for (const person of reportPeople(data)) {
    doc.addPage(); header(person.label);
    const rows = data.rows.filter(row => row.user_id === person.id).sort((a, b) => a.started_at.localeCompare(b.started_at) || a.entry_id.localeCompare(b.entry_id));
    const balances = data.balances.filter(row => row.user_id === person.id);
    number(`Horas registradas: ${reportDuration(person.seconds)} | ${rows.length} atividades`, 14, 50, 11);
    if (!data.project && balances.length && balances.every(day => day.configured)) {
      const expected = balances.reduce((s, r) => s + Number(r.expected_minutes) * 60, 0), actual = balances.reduce((s, r) => s + Number(r.actual_seconds), 0);
      number(`Previstas: ${reportDuration(expected)} | Saldo: ${reportDuration(actual - expected)} ${actual >= expected ? "a mais" : "a compensar"}`, 14, 58, 9);
    }
    const end = bars("Projetos de " + person.label.split(" ")[0], reportGroups(rows, "project_id"), 72, 4);
    const time = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: data.timezone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    autoTable(doc, {
      head: [["Início", "Término", "Projeto / Cliente", "Atividade", "Tempo"]],
      body: rows.map(row => [time(row.started_at), time(row.ended_at), `${row.project_name || "Sem projeto"}${row.client_name ? " / " + row.client_name : ""}`, row.description || "Sem descrição", reportDuration(Number(row.duration_seconds))]),
      startY: end, margin: { top: 45, left: 14, right: 14, bottom: 20 },
      styles: { font, fontSize: 8, cellPadding: 3, overflow: "linebreak", textColor: [...ink], lineWidth: 0 },
      headStyles: { fillColor: [...blue], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [246, 247, 250] },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 35 }, 3: { cellWidth: 66 }, 4: { cellWidth: 25 } },
      didDrawPage: () => header(person.label),
    });
  }
  const pages = doc.getNumberOfPages(), issued = new Date().toLocaleString("pt-BR", { timeZone: data.timezone });
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont(font, "normal");
    number(`ZULU | Emitido em ${issued}`, 14, 288, 7);
    doc.text(`${page} / ${pages}`, 196, 288, { align: "right" });
  }
  return doc;
}
export async function downloadHoursPdf(data: HoursReportData) {
  const pdf = await createHoursPdf(data);
  pdf.save(`zulu-horas-${data.from}-${data.to}.pdf`);
}
