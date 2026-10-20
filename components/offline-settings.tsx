"use client";
import { useEffect, useState } from "react";
import {
  clearVault,
  enableVault,
  hasVault,
  unlockVault,
  vaultUnlocked,
} from "@/public/offline-vault.js";
export function OfflineSettings({ userId }: { userId: string }) {
  const [exists, setExists] = useState(false),
    [unlocked, setUnlocked] = useState(false),
    [pass, setPass] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    hasVault()
      .then(setExists)
      .catch(() => {});
    setUnlocked(vaultUnlocked(userId));
  }, [userId]);
  async function enable() {
    setBusy(true);
    setError("");
    try {
      if (exists) await unlockVault(pass, userId);
      else await enableVault(userId, pass);
      setExists(true);
      setUnlocked(true);
      setPass("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="offline-settings">
      <h3>Conversas offline neste dispositivo</h3>
      <p>
        Guarde uma cópia cifrada das últimas conversas abertas: até 10 canais,
        sem anexos. Ela expira em 7 dias. Quem conhecer a senha offline poderá
        ler essa cópia sem conexão, inclusive após uma mudança de acesso no
        servidor. Sair da conta apaga a cópia.
      </p>
      {error && <p role="alert">{error}</p>}
      {unlocked ? (
        <p role="status">
          Cópia offline desbloqueada. Os canais abertos serão atualizados neste
          navegador.
        </p>
      ) : (
        <>
          <label>
            Senha exclusiva para a cópia offline
            <input
              type="password"
              minLength={12}
              autoComplete="new-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Pelo menos 12 caracteres"
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            disabled={busy || pass.length < 12}
            onClick={enable}
          >
            {exists ? "Desbloquear cópia" : "Ativar cópia offline"}
          </button>
        </>
      )}
      {exists && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={async () => {
            await clearVault();
            setExists(false);
            setUnlocked(false);
          }}
        >
          Apagar cópia deste dispositivo
        </button>
      )}
      <a className="text-button" href="/offline.html">
        Abrir leitor offline
      </a>
    </section>
  );
}
