export function errorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  const messages: Record<string, string> = {
    "Invalid login credentials":
      "E-mail ou senha incorretos. Confira e tente novamente.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "User already registered":
      "Confira seu e-mail ou entre com a conta existente.",
    "Auth session missing!": "Sua sessão expirou. Entre novamente.",
    "Invalid TOTP code":
      "Código inválido ou expirado. Use o código atual do aplicativo autenticador.",
    "New password should be different from the old password.":
      "Escolha uma senha diferente da anterior.",
    "Failed to fetch":
      "Não foi possível conectar. Confira sua conexão e tente novamente.",
    "Load failed":
      "Não foi possível conectar. Confira sua conexão e tente novamente.",
    "Acesso negado":
      "Você não tem acesso a esta ação. Atualize a página ou fale com o administrador.",
  };
  if (messages[message]) return messages[message];
  if (
    /^(Convite |Esta pessoa já participa|Aguarde um minuto antes de reenviar|Limite de convites atingido|Seu acesso está suspenso|Reative o acesso à organização)/.test(
      message,
    )
  )
    return message;
  if (/rate limit|too many|security purposes/i.test(message))
    return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
  if (/password.*(least|characters|weak)/i.test(message))
    return "Use uma senha mais forte, com pelo menos 12 caracteres.";
  if (/TOTP|verification.*code|challenge.*expired/i.test(message))
    return "Não foi possível confirmar o código. Use o código atual e tente novamente.";
  if (/JWT|token.*expired|refresh.*token|session.*expired/i.test(message))
    return "Sua sessão expirou. Entre novamente.";
  if (/fetch|network|timeout/i.test(message))
    return "A conexão falhou. Tente novamente quando estiver online.";
  // RPCs expose reviewed business errors in Portuguese, never raw SQL/debug details.
  if (
    /^(Já existe um timer|O período|Intervalo|Registro indisponível|Evento indisponível|Canal indisponível|Usuário não cadastrado|Participante fora do time|A organização precisa|O usuário precisa|A duração|Projeto não encontrado|Projeto indisponível|Tarefa indisponível|Tarefa inválida|A tarefa mudou|O canal precisa|MFA obrigatório)/.test(
      message,
    )
  )
    return message;
  return "Não foi possível concluir. Confira os dados e tente novamente.";
}
