# Publicação na Vercel

## Entrega publicada

- URL estável: **https://hub-one-azure.vercel.app**
- Projeto: `yemorgxs-projects/hub`, plano Hobby existente.
- Deploy: `dpl_Fm4cZFeJNGjHZaPs4Ffdc13uiHkX`, alvo `production`, estado `READY`.
- URL imutável: https://hub-7j5hi4h4t-yemorgxs-projects.vercel.app
- Painel: https://vercel.com/yemorgxs-projects/hub

O usuário autorizou a publicação e concluiu o login oficial da Vercel. Foi criado um projeto separado chamado `hub`; nenhum dos outros projetos da conta foi alterado. O deploy foi feito pela CLI 64.7.0, a partir da branch da aplicação. Não houve merge em `main`, compra de domínio ou ativação de plano pago.

## Configuração e pacote

`vercel.json` fixa o preset `nextjs`, instalação `npm ci` e build `npm run build`. `.vercelignore` exclui apenas os diretórios de suporte na raiz: docs, capturas, skills, scripts e SQL. `lib/supabase` permanece incluído. Arquivos `.env*`, `.git`, `.vercel` e caches não são enviados.

O dry run conferiu 52 arquivos, aproximadamente 480 KiB, com todos os utilitários Supabase necessários e sem os caminhos excluídos. `.vercel` também foi incluído no `.gitignore`.

Foram cadastradas em Production e Preview somente as duas variáveis exigidas pelo app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

São configuração pública da aplicação. Nenhuma chave administrativa do Supabase foi configurada no frontend. O arquivo local de ambiente não foi enviado. A sessão da CLI e seus artefatos de autenticação não estão versionados.

## Evidência

O build remoto instalou as dependências pelo lockfile, compilou Next.js 16.4.2, passou no TypeScript e gerou todas as rotas. O deploy terminou em `READY` e recebeu o alias público acima.

`NODE_USE_ENV_PROXY=1 HUB_APP_URL=https://hub-one-azure.vercel.app npm run test:public` passou com **16 testes, zero falhas/skips**. [Log HTTP da publicação](validation/vercel/http.log).

Os checks usam consultas anônimas: redirecionamento para login, cabeçalhos sem cache, callbacks inválidos, manifest, dimensões PNG dos ícones, service worker, página offline e HTML das demonstrações. Não criaram contas nem enviaram e-mails. Os 59 cenários SQL e os cinco cenários Chromium anteriores continuam sendo evidência local, conforme o [relatório de validação](validation-2026-10-20.md).

## Primeiro acesso: configuração conferida em 20/10/2026

Site URL e redirects de callback/recuperação foram conferidos pela API oficial do Supabase; Realtime `private_only=true` foi aplicado e relido. O usuário informou que concluiu cadastro, confirmação e MFA. A sessão real e o Realtime entre duas contas ainda precisam de validação na interface. [Guia de primeiro acesso](first-access.md).

## Atualizações futuras

A hospedagem foi feita por upload da CLI, sem conectar deploy automático ao GitHub. `main` ainda contém o commit inicial; conectar Git sem escolher a branch correta pode tentar publicar essa base incompleta. Revise o PR da aplicação e defina a estratégia de branch antes de ativar deploys automáticos.


## Atualização das Fases 2–5 · 2026-10-20 UTC

Código `ab5452f` publicado por CLI após build, 82 SQL, 10 unitários, 24 HTTP e 7 Chromium locais passando. Deployment `dpl_8S2nBXaXuomeNFFyLr217ia1Rhsw` terminou **READY** e recebeu o mesmo alias de produção. [URL imutável](https://hub-7q1xp4in5-yemorgxs-projects.vercel.app).

Depois da publicação, os **24 testes HTTP de produção** passaram, sem contas/e-mails/gravações de negócio. [Relatório atualizado](validation-phases-2-5.md). Nova prévia: [demonstração operacional](https://hub-one-azure.vercel.app/demo/operations), com fixtures em memória.

`.vercelignore` também exclui `/src-tauri/` e `/.github/`. Arquivos de ambiente e chaves continuam fora do upload. Naquela publicação não foram configuradas credenciais de Google/Microsoft/LiveKit nem ativado push; a ativação posterior está registrada abaixo. O cron diário de `/api/integrations/jobs` só aceita o `CRON_SECRET` quando configurado; a cadência Hobby é limitada para uso contínuo. [Ativação e limites](service-activation.md).

Auth URLs e Realtime privado foram conferidos posteriormente; fluxos com contas reais continuam com os limites descritos acima. Os instaladores Tauri foram gerados separadamente no GitHub Actions e não fazem parte do deploy Vercel.

## Ativação push · 2026-10-20

Código `ec558a5`, deployment `dpl_BCunKVSmBHPR8J3hGtcXZ2weRLqY`, **READY**, no mesmo alias público. [URL imutável](https://hub-80tzg1tky-yemorgxs-projects.vercel.app). Production recebeu a chave VAPID pública e `NEXT_PUBLIC_PUSH_ENABLED=true`; Preview permanece sem push. Chave privada e segredo de agendamento ficam no Supabase, fora da Vercel.

83 SQL e 10 unitários locais passaram; 24/24 HTTP de produção passaram após este deploy. Função e cron reais responderam HTTP 200. Entrega no aparelho ainda exige permissão do usuário. [Registro completo](push-activation.md).


## Google Calendar · 2026-10-20

O usuário configurou Google Calendar API e OAuth Web em modo Externo/Teste, adicionou conta de teste e escopo `calendar.app.created`. Vercel Production recebeu `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `HUB_INTEGRATION_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` como segredos de servidor. Deployment `dpl_CywxL4RVkrXpniYq7DPGjJjeHjMM` terminou READY e o alias público permaneceu ativo. Os 24 checks HTTP anônimos passaram; o usuário confirmou que conectou a conta Google; a sincronização e eventos de ida e volta continuam aguardando validação manual. [Metadados](validation/google-calendar/deployment.json).


## Correção do status Google · 2026-10-20

A tela agora atualiza o estado Google independentemente de falhas ao consultar conexões/webhooks e mostra erro de autenticação do endpoint de status. Código `db79aae`, deployment `dpl_3qFqt3YDgA34cQridiwT6wpipUSf` READY no alias estável. Build, 10 unitários e 24 checks HTTP públicos passaram. O usuário confirmou a conexão OAuth Google; falta validar a sincronização real dos eventos. [Relatório](validation/google-calendar/ui-status-fix.json).


## Chat e convites de equipe · 2026-10-20

Correção do compositor de chat `5b93b60` publicada no deployment `dpl_3sBsmf4f3tSqmW8JLqeXzsPUfBLv`. Convites por link e gestão de membros `e4a9ec7` publicados em `dpl_6NxwxGBd28w3YXMHKPWzk464hGVo`, **READY**, com o mesmo alias de produção. Migração `20261020150000` aplicada; 94 SQL, 11 unitários e 28 HTTP locais passaram. Após o deploy, 28 HTTP públicos de produção passaram. Envio automático de convites por e-mail adiado pelo usuário; aceite real com segunda conta ainda requer validação manual. [Fluxos, verificações e capturas](team-invitations.md).


## Agenda mensal e fins de semana · 2026-10-20

Código `8c71025`, deployment `dpl_GV1JJtczg93jhZDx7mYpn3FC2qEM`, **READY**, no alias estável. Mês/semana/dia, sete dias na semana, eventos que atravessam dias e paginação de eventos. Sem novas migrações ou credenciais. Build, 94 SQL, 16 unitários em dois fusos, 29 HTTP locais e Chromium em duas larguras passaram. Em produção, 29 HTTP passaram na repetição completa após dois HTTP 503 transitórios na primeira execução. [Evidências e limites](calendar-completion.md).


## Preparação LiveKit · 2026-10-20

`f264930`, deployment `dpl_BQdHgMyoxdQsn9XgW5JuZNa8JK71` READY. Corrigida duplicação do renderer de áudio e melhorados lobby/status/cancelamento de verificações antigas. Build, TypeScript, 16 unitários, lobby com sala fictícia em duas larguras e 29 HTTP locais/produção passaram. Usuário ainda precisa criar projeto LiveKit Cloud e configurar as três variáveis de servidor. Chamadas reais permanecem desativadas. [Roteiro](livekit-activation.md).


## LiveKit configurado · 2026-10-20

Após o cadastro/correção das credenciais pelo usuário, o novo deploy executou `HUB_VERIFY_LIVEKIT=1` e confirmou autenticação na consulta de leitura à API de salas. Código de origem `97ce9f1`, deployment `dpl_4vBFWx39U1PeisxEhZR8sJMr6gRP` READY no alias estável. 29 HTTP de produção passaram. Nenhuma sala ou conta foi criada pelo check e nenhum segredo foi impresso ou retirado da Vercel. Áudio, vídeo e tela com usuários reais ainda precisam de validação. [Evidência](validation/livekit-activation/success.json).


## Ponte desktop Windows · 2026-10-20

Frontend `1727770`, deployment `dpl_75Pdia5EWHUvh2dwpsKaqcmY7xHP` READY e 29 HTTP de produção passando. Ajusta overlay de não lidas no Windows e libera recursos de imagem, preservando o comportamento web. A ponte requer as permissões do novo instalador 0.1.1; clientes anteriores mantêm o título de não lidas como alternativa. [Teste nativo e instalador](windows-desktop.md).
