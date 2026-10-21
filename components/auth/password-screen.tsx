"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CircleNotch, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { AuthShell } from "./auth-shell";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/errors";
export function PasswordScreen() {
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [factorId, setFactorId] = useState(""),
    [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const client = createClient();
        const { data, error } = await client.auth.getUser();
        if (error || !data.user) throw new Error("Auth session missing!");
        const { data: aal, error: aalError } =
          await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError) throw aalError;
        if (aal.currentLevel !== "aal2" && aal.nextLevel === "aal2") {
          const { data: factor, error } = await client.auth.mfa.listFactors();
          if (error) throw error;
          if (active) setFactorId(factor.totp[0]?.id ?? "");
        }
        if (active) setAllowed(true);
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
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!allowed || busy) return;
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirmation"))) {
      setError("As senhas não coincidem. Confira os dois campos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      if (factorId) {
        const { error } = await client.auth.mfa.challengeAndVerify({
          factorId,
          code: String(data.get("code")),
        });
        if (error) throw error;
      }
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <div className="auth-title">
        <h2>
          {done
            ? "Sua senha foi atualizada."
            : "Uma nova senha, um novo começo."}
        </h2>
        <p>
          {done
            ? "Você já pode continuar para seu espaço."
            : "Escolha uma senha forte e exclusiva para o ZULU."}
        </p>
      </div>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="auth-loading">
          <CircleNotch className="spinning" size={20} />
          Conferindo o link…
        </div>
      ) : done ? (
        <>
          <div className="form-success">
            <CheckCircle size={22} />
            Senha atualizada com sucesso.
          </div>
          <Link className="primary-button auth-submit" href="/">
            Continuar
            <ArrowRight size={17} />
          </Link>
        </>
      ) : allowed ? (
        <form className="auth-form" onSubmit={submit}>
          <label>
            Nova senha
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          {factorId && (
            <label>
              Código do autenticador
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                placeholder="000000"
              />
            </label>
          )}
          <button className="primary-button auth-submit" disabled={busy}>
            {busy ? (
              <CircleNotch className="spinning" size={19} />
            ) : (
              <CheckCircle size={19} />
            )}
            Salvar nova senha
          </button>
        </form>
      ) : (
        <Link className="outline-button" href="/login">
          Voltar para entrar
        </Link>
      )}
    </AuthShell>
  );
}
