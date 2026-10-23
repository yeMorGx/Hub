// Local Windows CI only. No accounts, remote writes or production report data.
import { writeFile } from "node:fs/promises";
const output = process.argv[2];
let socket;
try {
  const targets = await (await fetch("http://127.0.0.1:9527/json/list")).json();
  const target = targets.find(t => t.type === "page" && t.url.startsWith("https://hub-one-azure.vercel.app/") && !t.url.includes("/desktop/timer"));
  if (!target) throw Error("Main WebView not found");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const result = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error("Native save timed out")), 60_000);
    socket.onmessage = ({ data }) => {
      const response = JSON.parse(data);
      if (response.id !== 1) return;
      clearTimeout(timeout);
      if (response.error || response.result.exceptionDetails) reject(Error("Native save failed: "+JSON.stringify(response.error||response.result.exceptionDetails)));
      else resolve(response.result.result.value);
    };
  });
  socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: {
    expression: `window.__TAURI_INTERNALS__.invoke('save_report_export', {filename:'zulu-horas-smoke.csv',bytes:Array.from(new TextEncoder().encode('Pessoa;Horas\\r\\nJoão;8\\r\\n'))})`,
    awaitPromise: true, returnByValue: true,
  } }));
  await writeFile(output, JSON.stringify(await result));
} catch (error) {
  await writeFile(output, JSON.stringify({ error: String(error?.message||error) }));
  process.exitCode = 1;
} finally { socket?.close(); }
