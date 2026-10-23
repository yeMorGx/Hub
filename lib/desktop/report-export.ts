import { isDesktopRuntime } from "./runtime";

export type ExportOutcome = "saved" | "downloaded" | "cancelled";
type NativeSave = (filename: string, bytes: number[]) => Promise<{ saved: boolean }>;

export async function saveReportFile(
  filename: string,
  blob: Blob,
  nativeSave?: NativeSave,
): Promise<ExportOutcome> {
  if (nativeSave || isDesktopRuntime()) {
    try {
      const save: NativeSave = nativeSave ?? (async (name, bytes) => {
        const { invoke } = await import("@tauri-apps/api/core");
        return invoke("save_report_export", { filename: name, bytes });
      });
      const result = await save(filename, Array.from(new Uint8Array(await blob.arrayBuffer())));
      return result.saved ? "saved" : "cancelled";
    } catch (error) {
      if (/command.*not found|unknown command/i.test(String(error))) {
        throw Error("Atualize o aplicativo para salvar relatórios no Windows.");
      }
      throw Error("Não foi possível salvar o arquivo. Confira a pasta e tente novamente.");
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Leave enough time for the browser to start reading the generated file.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}
