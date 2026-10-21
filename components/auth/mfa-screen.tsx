"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  ShieldCheck,
  ArrowRight,
  CircleNotch,
  SignOut,
  Key,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/errors";
import { AuthShell } from "./auth-shell";
type Factor = { id: string; friendly_name?: string };
export function MfaScreen() {
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [factors, setFactors] = useState<Factor[]>([]),
    [factorId, setFactorId] = useState(""),
    [qr, setQr] = useState(""),
    [secret, setSecret] = useState(""),
    [code, setCode] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const client = createClient();
        const { data, error } = await client.auth.mfa.listFactors();
        if (error) throw error;
        if (active) {
          setFactors(data.totp);
          setFactorId(data.totp[0]?.id ?? "");
        }
      } catch (e) {
        if (active) setError(errorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);
  async function enroll() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      const { data: list, error: listError } =
        await client.auth.mfa.listFactors();
      if (listError) throw listError;
      if (list.totp.length) {
        setFactors(list.totp);
        setFactorId(list.totp[0].id);
        return;
      }
      for (const f of list.all.filter(
        (f) => f.factor_type === "totp" && f.status === "unverified",
      )) {
        const { error } = await client.auth.mfa.unenroll({ factorId: f.id });
        if (error) throw error;
      }
      const { data, error } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "ZULU",
        issuer: "ZULU",
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(
        data.totp.qr_code.startsWith("data:")
          ? data.totp.qr_code
          : `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(data.totp.qr_code)}`,
      );
      setSecret(data.totp.secret);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    if (busy || !factorId || !/^[0-9]{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      const { error } = await client.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) throw error;
      setQr("");
      setSecret("");
      setCode("");
      window.location.replace("/");
    } catch (e) {
      setError(errorMessage(e));
      setCode("");
      setBusy(false);
    }
  }
  async function signOut() {
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) {
      setError(errorMessage(error));
      return;
    }
    window.location.replace("/login");
  }
  return (
    <AuthShell>
      <span className="auth-step-icon">
        <ShieldCheck size={29} />
      </span>
      <div className="auth-title">
        <h2>{factors.length ? "Só mais uma etapa." : "Proteja seu espaço."}</h2>
        <p>
          {factors.length
            ? "Abra seu aplicativo autenticador e digite o código atual."
            : "Configure a autenticação em duas etapas para acessar os dados do seu time."}
        </p>
      </div>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="auth-loading">
          <CircleNotch className="spinning" size={22} />
          Conferindo seu acesso…
        </div>
      ) : !factorId ? (
        <div className="mfa-intro">
          <p>
            Use um aplicativo como Microsoft Authenticator, Google Authenticator
            ou 1Password para gerar seus códigos.
          </p>
          <button
            className="primary-button auth-submit"
            onClick={enroll}
            disabled={busy}
          >
            {busy ? (
              <CircleNotch className="spinning" size={19} />
            ) : (
              <Key size={19} />
            )}
            Configurar aplicativo
          </button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={verify}>
          {qr && (
            <>
              <div className="qr-frame">
                <img
                  src={qr}
                  width={196}
                  height={196}
                  alt="QR code para configurar o autenticador da sua conta"
                />
              </div>
              <p className="mfa-instructions">
                Leia o QR code no autenticador. Em seguida, informe o código de
                6 dígitos gerado pelo aplicativo.
              </p>
              <details className="mfa-secret">
                <summary>Não consigo ler o QR code</summary>
                <p>
                  Adicione uma conta TOTP manualmente usando esta chave.
                  Guarde-a com segurança.
                </p>
                <code>{secret}</code>
              </details>
            </>
          )}
          {factors.length > 1 && (
            <label>
              Autenticador
              <select
                value={factorId}
                onChange={(e) => setFactorId(e.target.value)}
              >
                {factors.map((factor, i) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.friendly_name || `Autenticador ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label htmlFor="totp-code">
            Código do autenticador
            <input
              id="totp-code"
              className="totp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              required
              autoFocus
            />
          </label>
          <button
            className="primary-button auth-submit"
            disabled={busy || code.length !== 6}
          >
            {busy ? (
              <CircleNotch className="spinning" size={19} />
            ) : (
              <ShieldCheck size={19} />
            )}
            Confirmar e entrar
            <ArrowRight size={18} />
          </button>
        </form>
      )}
      <div className="auth-switch">
        <button onClick={signOut} disabled={busy}>
          <SignOut size={15} />
          Sair desta conta
        </button>
      </div>
      <p className="auth-security-note">
        Os códigos mudam a cada poucos segundos. Se você perdeu o autenticador,
        procure o responsável pelo acesso da sua organização.
      </p>
    </AuthShell>
  );
}
