# Fases 2–5 — implementação, ativação e limites

Continuação solicitada: avançar por todas as fases, mantendo o trabalho independente durante dependências externas. Estado registrado em **2026-10-20 UTC**. Implementação e compilação não substituem ativação dos serviços nem validação com contas reais.

## Entregas

| Fase | Código entregue | Situação operacional |
| --- | --- | --- |
| 0–1 | Auth, MFA, times/papéis, RLS, Presence, canais/DMs, timer, agenda/RSVP e PWA | Base já publicada; primeiro cadastro/MFA e duas contas ainda precisam ser exercitados. Configuração Auth/Realtime no painel continua pendente de confirmação. |
| 2 | Threads, reações, menções, fixadas, busca, arquivos/imagens/áudio privados; Kanban; check-ins diários/semanais; Markdown; pautas/atas; notificações e lembretes internos | Migração e RPCs aplicadas. Push implementado, **não ativado**: falta autorização específica para gravar configuração privada e publicar a função. |
| 3 | Relatórios por pessoa/projeto/cliente com CSV/PDF; metas e timer esquecido; escalas/trocas; ausências com aprovação; datas opcionais | Migração aplicada; UI e testes locais concluídos. Sem gravações de negócio feitas em contas de produção para validar a interface. |
| 4 | Microsoft/Azure OAuth SSO; auditoria; canais e arquivos restritos; OAuth/sincronização Google/Outlook; webhooks de entrada; comandos no chat | Auditoria e receptor `hub-webhook` aplicados/publicados. SSO e calendários aguardam configuração de provedores/variáveis. |
| 5 | LiveKit voz/vídeo/tela; leitor offline cifrado; Tauri com atalho do timer e não lidas | Leitor e código de chamada entregues. LiveKit aguarda credenciais. Instaladores **sem assinatura** gerados em Windows/macOS/Linux; instalação e execução nativas ainda não exercitadas. |
| Opcional | Expo | Não implementado: o escopo o condiciona à insuficiência da PWA, ainda não demonstrada. |

Prévia pública das novas superfícies: `/demo/operations`, com dados fictícios em memória e sem acesso ao banco do time. A rota `/` mantém sessão/AAL2. A prévia não é evidência de integração autenticada.

## Banco e funções

Além das três migrações anteriores, foram aplicadas:

- `20261020024311_phase_2_collaboration.sql`
- `20261020025532_management.sql`
- `20261020030915_integrations_and_audit.sql`
- `20261020031756_calendar_sync_safety.sql`
- `20261020032539_in_app_reminders.sql`
- `20261020032921_calendar_background.sql`
- `20261020033305_calendar_outbound_queue.sql`
- `20261020034000_call_roster.sql`
- `20261020034604_reminder_and_calendar_consistency.sql`

Consulta remota confirmou **32/32 tabelas públicas com RLS**. Políticas privadas sem acesso de usuário são intencionais. O advisor informa RPCs `SECURITY DEFINER` executáveis por usuários: fazem parte do modelo de escrita controlada com MFA e autorização em cada função; esse aviso não equivale a uma auditoria independente concluída.

`hub-webhook` está ACTIVE, versão 1. Usa token exclusivo no cabeçalho, autorização de canal, limite de payload/frequência e `event_id` idempotente. Não há token de webhook de produção criado nesta entrega.

**Somente local, não aplicada:** `20261020030000_notification_delivery.sql`. A revisão automática rejeitou a gravação de VAPID/job secret em tabela privada e publicação de `hub-notifications` com `verify_jwt:false`; a pergunta de autorização específica permanece pendente. O código valida JWT/AAL2/autoria para usuários e segredo para cron. Não contornar esse bloqueio com outro método. O frontend mantém push desabilitado.

## Evidência e limitações

Validação final local: **82 SQL + 10 unitários + 24 HTTP + 7 Chromium**, todos passando; três builds desktop concluídos. [Relatório e logs](validation-phases-2-5.md).

- Testes SQL locais usam PostgreSQL WASM/PGlite com contratos mínimos de Auth/Realtime/Storage. Não são testes contra usuários reais do Supabase.
- Testes unitários usam mocks HTTP para os provedores. Não houve OAuth real, sincronização real nem chamada LiveKit real.
- Testes HTTP/Chromium são anônimos e usam fixtures públicas. Não criam contas nem enviam e-mails.
- As 16 capturas desktop/celular em `.impeccable/review/phases-2-5` receberam `ship` independente somente para as superfícies capturadas. Não aprovam o fluxo privado nem toda a acessibilidade do produto.
- Offline é opt-in, com senha própria de 12 caracteres, AES-GCM/PBKDF2 e chave em memória. Máximo de dez conversas/200 mensagens por conversa, sem anexos, expiração de sete dias pelo relógio local e remoção no logout. Mudanças de acesso feitas enquanto o dispositivo está offline não podem revogar a cópia; a UI informa isso antes da ativação.
- Sincronização troca eventos do calendário dedicado ao Hub. Não envia convites a participantes. Conflitos entre versões exigem escolha explícita; consultas próximas de mil eventos/vínculos são recusadas para evitar truncamento silencioso. O intervalo padrão é de 30 dias anteriores a seis meses futuros.
- Webhooks externos disparam a fila; mudanças do Hub também entram na fila. A recuperação/renovação diária na Vercel Hobby é uma base limitada. Uso contínuo por vários usuários requer agendamento mais frequente no provedor ou serviço externo autorizado.
- Chamadas verificam canal/MFA na entrada e revalidam/removem participantes pelo servidor a cada 20 segundos enquanto clientes estão conectados. Não afirmar revogação instantânea nem validar esse comportamento sem o serviço real.

## Ativação externa

Consulte [Configuração dos serviços](service-activation.md), [Primeiro acesso](first-access.md) e [Publicação Vercel](vercel-deployment.md). Nunca coloque segredos no chat, no código público ou em variáveis `NEXT_PUBLIC_*`.
