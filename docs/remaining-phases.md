# Fases 2–5 — implementação, ativação e limites

Continuação solicitada: avançar por todas as fases, mantendo o trabalho independente durante dependências externas. Estado registrado em **2026-10-20 UTC**. Implementação e compilação não substituem ativação dos serviços nem validação com contas reais.

## Entregas

| Fase | Código entregue | Situação operacional |
| --- | --- | --- |
| 0–1 | Auth, MFA, times/papéis, RLS, Presence, canais/DMs, timer, agenda/RSVP e PWA | Usuário informou cadastro/MFA concluídos. URLs Auth conferidas e Realtime privado configurado. Validação entre duas contas ainda pendente. |
| 2 | Threads, reações, menções, fixadas, busca, arquivos/imagens/áudio privados; Kanban; check-ins diários/semanais; Markdown; pautas/atas; notificações e lembretes internos | Migrações e RPCs aplicadas. Push autorizado e serviço ativado; entrega em aparelho aguarda inscrição/teste. |
| 3 | Relatórios por pessoa/projeto/cliente com CSV/PDF; metas e timer esquecido; escalas/trocas; ausências com aprovação; datas opcionais | Migração aplicada; UI e testes locais concluídos. Sem gravações de negócio feitas em contas de produção para validar a interface. |
| 4 | Microsoft/Azure OAuth SSO; auditoria; canais e arquivos restritos; OAuth/sincronização Google/Outlook; webhooks de entrada; comandos no chat | Auditoria e `hub-webhook` publicados. Google OAuth/API e variáveis Production configuradas; conexão Google confirmada pelo usuário; falta validar sincronização manual e eventos. Outlook e Azure SSO aguardam configuração de provedor. |
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

**Push aplicado:** autorização específica recebida; `20261020110148_notification_delivery.sql` substitui o nome local provisório anterior. `hub-notifications` ACTIVE v1 e cron por minuto conferidos. Apenas chave VAPID pública/flag ficam na Vercel; chave privada e segredo permanecem em tabela privada. [Ativação e limites](push-activation.md).

## Evidência e limitações

Validação final local: **83 SQL + 10 unitários + 24 HTTP + 7 Chromium**, todos passando; três builds desktop concluídos. [Relatório e logs](validation-phases-2-5.md).

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

### Google Calendar · 2026-10-20

Cliente OAuth, audiência de teste, conta permitida e escopo `calendar.app.created` configurados. Segredos de produção instalados na Vercel e deployment `dpl_CywxL4RVkrXpniYq7DPGjJjeHjMM` READY. **24/24 checks HTTP anônimos de produção passaram**; isso não executa consentimento OAuth nem sincronização. Próximo passo: abrir Integrações no Hub, conectar a conta autorizada e validar um evento. [Evidência](validation/google-calendar/deployment.json).

### Correção do status de integrações · 2026-10-20

O endpoint autenticado confirmou `google: true`; a tela escondia o estado quando consultas de calendário/webhook falhavam. Agora busca e exibe o status dos provedores separadamente. Deployment `dpl_3qFqt3YDgA34cQridiwT6wpipUSf` READY; 10 unitários e 24 checks HTTP públicos passaram. A conexão OAuth Google foi confirmada pelo usuário; a sincronização e os eventos de ida e volta continuam pendentes de validação. [Evidência](validation/google-calendar/ui-status-fix.json).
