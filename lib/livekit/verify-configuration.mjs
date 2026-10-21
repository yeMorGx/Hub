import { pathToFileURL } from "node:url";
import { RoomServiceClient } from "livekit-server-sdk";

// Opt-in build check. Only credentials supplied by the deployment environment
// are used; room details and provider errors are never printed.
/**
 * @param {Record<string, string | undefined>} env
 * @param {(url: string, key: string, secret: string) => { listRooms: () => Promise<unknown> }} [createService]
 */
export async function verifyLivekitConfiguration(
  env = process.env,
  createService = (url, key, secret) =>
    new RoomServiceClient(url, key, secret, {
      requestTimeout: 10,
      failover: false,
    }),
) {
  if (env.HUB_VERIFY_LIVEKIT !== "1") return { checked: false };
  const {
    LIVEKIT_URL: url,
    LIVEKIT_API_KEY: key,
    LIVEKIT_API_SECRET: secret,
  } = env;
  if (!url?.trim() || !key?.trim() || !secret?.trim())
    throw new Error("LiveKit: faltam variáveis de servidor.");
  let endpoint;
  try {
    endpoint = new URL(url);
  } catch {
    throw new Error("LiveKit: confira a URL WebSocket do projeto.");
  }
  if (
    endpoint.protocol !== "wss:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !["", "/"].includes(endpoint.pathname)
  )
    throw new Error(
      "LiveKit: use a URL WebSocket wss:// do projeto, sem caminho ou parâmetros.",
    );
  endpoint.protocol = "https:";
  try {
    await createService(endpoint.origin, key, secret).listRooms();
  } catch (error) {
    if (error?.status === 401 || error?.status === 403)
      throw new Error(
        "LiveKit: a API rejeitou as credenciais (HTTP 401/403). Confira API Key e API Secret do mesmo projeto da URL.",
      );
    if (error?.status === 404)
      throw new Error(
        "LiveKit: API de salas não encontrada (HTTP 404). Confira a URL WebSocket do projeto.",
      );
    if (error?.status >= 500)
      throw new Error(
        "LiveKit: o serviço respondeu com erro HTTP 5xx. Tente novamente.",
      );
    if (
      error?.name === "TimeoutError" ||
      error?.name === "AbortError" ||
      error instanceof TypeError
    )
      throw new Error(
        "LiveKit: falha de conexão ou tempo limite ao consultar a API de salas.",
      );
    throw new Error(
      "LiveKit: não foi possível autenticar na API de salas. Confira URL, API Key e API Secret do mesmo projeto.",
    );
  }
  return { checked: true };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = await verifyLivekitConfiguration();
    if (result.checked)
      console.log(
        "LiveKit configuration check: PASS (authenticated room API; read-only).",
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
