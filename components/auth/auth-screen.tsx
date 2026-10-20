"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CircleNotch,
  CheckCircle,
  ArrowLeft,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { AuthShell } from "./auth-shell";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/errors";
export function AuthScreen({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup")
      setMode("signup");
    if (
      new URLSearchParams(window.location.search).get("notice") ===
      "link-expired"
    )
      setError(
        "Este link expirou ou já foi usado. Peça um novo e-mail e tente novamente.",
      );
  }, []);
  function changeMode(next: typeof mode) {
    setMode(next);
    setError("");
    setNotice("");
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !configured) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const client = createClient(),
        email = String(data.get("email")).trim();
      if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setNotice(
          "Se este e-mail tiver uma conta, você receberá as instruções para redefinir sua senha.",
        );
      } else if (mode === "signup") {
        const password = String(data.get("password"));
        const { data: result, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: String(data.get("name")).trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (result.session) {
          window.location.assign("/mfa");
          return;
        }
        setNotice(
          "Confira sua caixa de entrada para confirmar o e-mail. Depois, entre para configurar a segunda etapa.",
        );
        form.reset();
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password: String(data.get("password")),
        });
        if (error) throw error;
        window.location.assign("/");
        return;
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <div className="auth-title">
        <h2>
          {mode === "signup"
            ? "Seu time começa aqui."
            : mode === "reset"
              ? "Vamos recuperar seu acesso."
              : "Bom ter você por aqui."}
        </h2>
        <p>
          {mode === "signup"
            ? "Crie sua conta e prepare seu espaço de trabalho."
            : mode === "reset"
              ? "Enviaremos um link para você criar uma nova senha."
              : "Entre para encontrar seu time e continuar de onde parou."}
        </p>
      </div>
      {!configured && (
        <div className="form-alert" role="alert">
          Configure a URL e a chave pública do Supabase no ambiente para
          habilitar o acesso. A demonstração continua disponível.
        </div>
      )}
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="form-success" role="status">
          <CheckCircle size={21} />
          <span>{notice}</span>
        </div>
      )}
      {mode === "login" &&
        process.env.NEXT_PUBLIC_AZURE_SSO_ENABLED === "true" && (
          <button
            type="button"
            className="secondary-button azure-signin"
            disabled={busy || !configured}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const { error } = await createClient().auth.signInWithOAuth({
                  provider: "azure",
                  options: {
                    scopes: "email",
                    redirectTo: `${location.origin}/auth/callback`,
                  },
                });
                if (error) throw error;
              } catch (e) {
                setError(errorMessage(e));
                setBusy(false);
              }
            }}
          >
            Entrar com Microsoft
          </button>
        )}
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Seu nome
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={80}
              placeholder="Como podemos chamar você?"
            />
          </label>
        )}
        <label>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="voce@empresa.com"
          />
        </label>
        {mode !== "reset" && (
          <div className="auth-password-field">
            <div className="password-label">
              <label htmlFor="auth-password">Senha</label>
              {mode === "login" && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => changeMode("reset")}
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <span className="password-input">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={mode === "signup" ? 12 : undefined}
                maxLength={128}
                required
                placeholder={
                  mode === "signup" ? "Pelo menos 12 caracteres" : "Sua senha"
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlash size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </div>
        )}
        <button
          type="submit"
          className="primary-button auth-submit"
          disabled={busy || !configured}
        >
          {busy ? (
            <>
              <CircleNotch className="spinning" size={19} />
              Aguarde…
            </>
          ) : (
            <>
              {mode === "signup"
                ? "Criar minha conta"
                : mode === "reset"
                  ? "Enviar link"
                  : "Entrar no Hub"}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
      <div className="auth-switch">
        {mode === "login" ? (
          <>
            Ainda não tem uma conta?{" "}
            <button onClick={() => changeMode("signup")}>Criar conta</button>
          </>
        ) : (
          <button onClick={() => changeMode("login")}>
            <ArrowLeft size={13} />
            Voltar para entrar
          </button>
        )}
      </div>
      <p className="auth-security-note">
        Após entrar, você confirma sua identidade com o aplicativo autenticador.
        Seus dados colaborativos exigem essa segunda etapa.
      </p>
    </AuthShell>
  );
}
