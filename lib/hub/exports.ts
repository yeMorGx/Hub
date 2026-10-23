export function csvBlob(
  columns: string[],
  rows: (string | number | null | undefined)[][],
) {
  const cell = (value: string | number | null | undefined) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const content =
    "\uFEFF" +
    [columns, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
  return new Blob([content], { type: "text/csv;charset=utf-8" });
}
export function downloadCsv(filename: string, columns: string[], rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(csvBlob(columns, rows));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadPdf(
  filename: string,
  title: string,
  subtitle: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(18);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(subtitle, 14, 26);
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 33,
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [40, 43, 46] },
    margin: { bottom: 18 },
    didDrawPage: () => {
      doc.setFontSize(9);
      doc.text(
        `ZULU · ${doc.getNumberOfPages()}`,
        14,
        doc.internal.pageSize.height - 8,
      );
    },
  });
  doc.save(filename);
}
