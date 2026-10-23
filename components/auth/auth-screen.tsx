"use client";
import { ZuluForm } from "../dashboard-ui";
import { ZuluButton, ZuluLabel, ZuluInput } from "../dashboard-ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
    [showPassword, setShowPassword] = useState(false),
    [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup")
      setMode("signup");
    if (
      new URLSearchParams(window.location.search).get("notice") ===
      "link-expired"
    ) {
      setError(
        "Este link expirou ou já foi usado. Peça um novo e-mail e tente novamente.",
      );
      setShowResendConfirmation(true);
    }
  }, []);
  function changeMode(next: typeof mode) {
    setMode(next);
    setError("");
    setNotice("");
    setShowResendConfirmation(false);
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
      const message = errorMessage(err);
      setError(message);
      setShowResendConfirmation(
        message === "Confirme seu e-mail antes de entrar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function resendConfirmation() {
    if (busy || !configured) return;
    const email = emailRef.current?.value.trim() ?? "";
    if (!email) {
      setError("Informe o e-mail acima para reenviar a confirmação.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error } = await createClient().auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setNotice(
        "Se a conta estiver pendente de confirmação, enviaremos um novo link para esse endereço.",
      );
      setShowResendConfirmation(false);
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
          {showResendConfirmation && (
            <ZuluButton
              type="button"
              className="text-button"
              disabled={busy || !configured}
              onClick={() => void resendConfirmation()}
            >
              {busy ? "Enviando…" : "Reenviar link de confirmação"}
            </ZuluButton>
          )}
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
          <ZuluButton
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
          </ZuluButton>
        )}
      <ZuluForm className="auth-form" onSubmit={submit}>
        {mode === "signup" && (
          <ZuluLabel>
            Seu nome
            <ZuluInput
              name="name"
              autoComplete="name"
              required
              maxLength={80}
              placeholder="Como podemos chamar você?"
            />
          </ZuluLabel>
        )}
        <ZuluLabel>
          E-mail
          <ZuluInput
            ref={emailRef}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="voce@empresa.com"
          />
        </ZuluLabel>
        {mode !== "reset" && (
          <div className="auth-password-field">
            <div className="password-label">
              <ZuluLabel htmlFor="auth-password">Senha</ZuluLabel>
              {mode === "login" && (
                <ZuluButton
                  type="button"
                  className="text-button"
                  onClick={() => changeMode("reset")}
                >
                  Esqueceu a senha?
                </ZuluButton>
              )}
            </div>
            <span className="password-input">
              <ZuluInput
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
              <ZuluButton
                type="button"
                className="icon-button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlash size={19} /> : <Eye size={19} />}
              </ZuluButton>
            </span>
          </div>
        )}
        <ZuluButton
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
                  : "Entrar no ZULU"}
              <ArrowRight size={18} />
            </>
          )}
        </ZuluButton>
      </ZuluForm>
      <div className="auth-switch">
        {mode === "login" ? (
          <>
            Ainda não tem uma conta?{" "}
            <ZuluButton onClick={() => changeMode("signup")}>Criar conta</ZuluButton>
          </>
        ) : (
          <ZuluButton onClick={() => changeMode("login")}>
            <ArrowLeft size={13} />
            Voltar para entrar
          </ZuluButton>
        )}
      </div>
      <p className="auth-security-note">
        Após entrar, você confirma sua identidade com o aplicativo autenticador.
        Seus dados colaborativos exigem essa segunda etapa.
      </p>
    </AuthShell>
  );
}
