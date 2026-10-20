# Ativação dos serviços externos

O código pode ser publicado com as integrações desabilitadas. As telas mostram “aguardando configuração” até as variáveis necessárias estarem disponíveis. Presença das variáveis não prova que a autorização do provedor funciona; concluir o fluxo com uma conta real antes de liberar ao time.

## Configuração existente

Vercel Production/Preview já têm `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A URL oficial é `https://hub-one-azure.vercel.app`. Auth Site URL e os dois callbacks foram conferidos. O Realtime foi configurado com `private_only=true`. O usuário informou ter concluído cadastro, confirmação e MFA. [Primeiro acesso](first-access.md).

## Google Calendar

**Configuração em andamento concluída em 20/10/2026:** API habilitada; OAuth Web client criado; público Externo em modo Teste, conta de teste e escopo `calendar.app.created` configurados. Client ID/secret, chave AES-256 e credenciais do worker estão na Vercel Production. Callback registrado: `https://hub-one-azure.vercel.app/api/integrations/google/callback`. Deploy `dpl_dpl_CywxL4RVkrXpniYq7DPGjJjeHjMM` READY. O endpoint de status autenticado retornou `google: true` no navegador do usuário. Uma falha paralela ao listar conexões fazia a interface esconder esse estado; a correção foi publicada no deployment `dpl_3qFqt3YDgA34cQridiwT6wpipUSf`. O usuário conectou a conta Google em modo Teste e iniciou a sincronização manual; o Hub recebeu resposta válida de zero alterações. O cartão antes não registrava esse resultado quando não havia eventos; a migração `20261020120000_calendar_sync_completion.sql` passa a gravar toda sincronização concluída. A aba Calendários também deixa de carregar webhooks sem uso e exibir seu erro como falha nas conexões do time. Ainda falta validar o fluxo de eventos com um evento de teste; apenas as contas adicionadas como testers podem autorizar enquanto o app permanecer nesse modo. [Deploy e checks](validation/google-calendar/deployment.json) e [correção da tela](validation/google-calendar/ui-status-fix.json).

1. Crie um cliente OAuth Web no Google Cloud, configure a tela de consentimento e habilite Calendar API.
2. Cadastre o callback `https://hub-one-azure.vercel.app/api/integrations/google/callback`.
3. Na Vercel, cadastre `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` e `HUB_INTEGRATION_ENCRYPTION_KEY` (32 bytes aleatórios em hexadecimal, 64 caracteres). Preserve a chave de cifra: trocá-la exige reconectar os calendários.
4. Publique novamente e use Integrações → Google Calendar → Conectar. O código pede `calendar.app.created`, cria um calendário “Hub — time” e mantém PKCE/state no servidor.
5. Teste criação/edição/cancelamento nas duas direções e a resolução de um conflito. Em modo de teste do Google, inclua previamente as contas autorizadas na tela de consentimento.

## Outlook Calendar

1. Registre um aplicativo Web no Microsoft Entra; configure o tenant adequado e o callback `https://hub-one-azure.vercel.app/api/integrations/outlook/callback`.
2. Conceda as permissões delegadas `Calendars.ReadWrite` e `offline_access`, conforme a política da organização.
3. Cadastre na Vercel `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_SECRET`, `MICROSOFT_CALENDAR_TENANT` e a mesma `HUB_INTEGRATION_ENCRYPTION_KEY`.
4. Conecte pela tela do Hub e valide eventos e conflitos. A sincronização lê/escreve somente o calendário dedicado. A assinatura Graph de `/me/events` recebe sinais de alteração da conta; o payload não é importado como evento pessoal.

## Fila, webhooks de calendário e renovação

Somente no servidor Vercel: cadastre `SUPABASE_SERVICE_ROLE_KEY` e um `CRON_SECRET` aleatório, além das configurações OAuth/cifra. Esses valores nunca podem usar prefixo `NEXT_PUBLIC_`.

A conexão tenta registrar notificações em `/api/integrations/webhooks/google` ou `/api/integrations/webhooks/outlook`. IDs de assinatura, hash do token de validação e fila ficam em tabelas privadas; credenciais OAuth são cifradas por AES-GCM. Workers revalidam a associação ativa e utilizam lease para impedir sincronizações concorrentes.

`GET /api/integrations/jobs` exige `Authorization: Bearer <CRON_SECRET>`. O `vercel.json` agenda diariamente às 05:00 UTC, compatível com Hobby. Isso limita a velocidade de saída das mudanças do Hub e a recuperação de falhas. Para uso contínuo por vários usuários, configurar agendamento mais frequente em um plano compatível ou em serviço externo autorizado; esta entrega não compra planos nem cria uma automação externa. O worker processa um job por execução e as notificações externas também acionam processamento. Conflitos continuam pendentes de revisão manual.

Para conexões feitas antes de habilitar o worker, reconecte ou execute o job para iniciar a assinatura. Ao desconectar, credenciais/vínculos são removidos no Hub; o calendário externo é preservado. Notificações de assinaturas antigas passam a ser ignoradas e expiram no provedor.

## Microsoft/Azure para login

A configuração de login é separada do calendário. Habilite o provider Azure no Supabase Auth, com app/secret/tenant Microsoft e callback `https://mjaidgzqsztwygdyzkeq.supabase.co/auth/v1/callback`. Inclua o callback do Hub na allowlist Auth. Depois de validar o provider, configure `NEXT_PUBLIC_AZURE_SSO_ENABLED=true` na Vercel e publique.

O botão “Entrar com Microsoft” usa o OAuth Azure do Supabase; MFA/AAL2 continua obrigatório no Hub. Não é implementação de um novo provedor SAML. Políticas de identidade/tenant e associação a times permanecem sob administração do workspace.

## Chamadas LiveKit

Cadastre somente no servidor: `LIVEKIT_URL` (wss/https do projeto), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. O navegador recebe apenas token temporário e URL, nunca o segredo. Tokens são emitidos para o canal autorizado e a identidade vem da sessão verificada.

Teste com duas contas: áudio, vídeo, compartilhamento de tela, reconexão, recusa de microfone/câmera, saída e perda de acesso ao canal. A verificação de participantes chama a API de salas; mantenha essa API alcançável. Clientes que deixam de confirmar acesso encerram a chamada. Teste a revogação com o provedor real antes de usar canais sensíveis. Não há gravação de chamadas nesta entrega.

## Webhooks de entrada no chat

O receptor `hub-webhook` já está publicado no Supabase. Um moderador cria a conexão em Integrações → Webhooks e copia o token uma única vez para o n8n/monitoramento/tickets:

- POST `https://mjaidgzqsztwygdyzkeq.supabase.co/functions/v1/hub-webhook/<id>`
- Cabeçalho `Authorization: Bearer <token>`
- JSON `{ "event_id": "identificador-estavel-do-evento", "text": "Mensagem" }`

Reutilizar `event_id` torna o retry idempotente. Limite de uma nova mensagem por segundo por webhook; texto de até 10.000 caracteres. Revogue pela tela se o token for exposto. Não cole o token em URLs ou registros públicos.

## Push — serviço ativado

Autorização explícita recebida em 20/10/2026. Migrações `20261020110148_notification_delivery.sql` e `20261020133000_direct_message_notifications.sql` aplicadas; `hub-notifications` publicada como ACTIVE v2, com `verify_jwt:false` no gateway e validação própria de JWT/AAL2/autoria ou segredo de agendamento. Mensagens diretas, menções e lembretes entram na fila de push. VAPID privada e job secret ficam na tabela privada `private.delivery_settings`, inacessível a usuários anônimos/autenticados. Somente a chave VAPID pública e a flag foram cadastradas na Vercel Production.

O job `hub-notifications` executa a cada minuto no Supabase; já houve execução bem-sucedida com retorno HTTP 200. Chamadas sem sessão ou com segredo incorreto retornaram 401, e origem não permitida retornou 403. Esses checks não demonstram entrega a um aparelho.

Para aderir no navegador:

1. Atualize o Hub e entre com MFA.
2. Abra o avatar → Meu perfil e role até **Notificações neste dispositivo**.
3. Clique em **Ativar notificações** e aceite a permissão do navegador.
4. Valide uma menção recebida de outra pessoa e um lembrete; confirme também desativação e troca de conta. No iPhone/iPad, instale a PWA na tela inicial antes de habilitar.

Cada navegador/dispositivo precisa aderir. Os avisos usam texto genérico, sem conteúdo de mensagens no payload; destinos de clique ficam na origem do Hub. Leitura da notificação exclui sua entrega pendente, e retries usam lease/limite de tentativas. Sair da conta remove a inscrição desse navegador quando possível. Uma chave VAPID nova exige reinscrição; não rotacionar sem planejar essa troca.

[Validação da ativação](push-activation.md). A entrega real no dispositivo ainda está pendente de inscrição/teste pelo usuário.

## Desktop

[Workflow com os três instaladores](https://github.com/yeMorGx/Hub/actions/runs/39365001709). Arquivos temporários de CI, disponíveis por 14 dias; não foram publicados como release:

- [Windows x64 · NSIS](https://github.com/yeMorGx/Hub/actions/runs/39365001709/artifacts/12239316504)
- [macOS Apple Silicon · DMG](https://github.com/yeMorGx/Hub/actions/runs/39365001709/artifacts/12238333999)
- [Linux amd64 · DEB](https://github.com/yeMorGx/Hub/actions/runs/39365001709/artifacts/12239103191)

São previews sem assinatura/notarização e não foram instalados nos sistemas alvo nesta sessão. Não desabilite proteções do sistema para instalá-los. Distribuição normal requer assinatura e notarização com credenciais do proprietário. macOS Intel não foi compilado por esse workflow.

O app usa o site de produção em WebView. `Ctrl/Cmd+Shift+H` alterna o timer para a conta/time ativos; requer sessão/MFA e conectividade. Badge nativo está disponível onde o Tauri suporta `setBadgeCount` (macOS); os demais ambientes recebem contagem no título e na interface. Não há auto-update de binário configurado. O leitor offline é uma função opt-in do app; primeiro lançamento do WebView ainda exige conexão.
