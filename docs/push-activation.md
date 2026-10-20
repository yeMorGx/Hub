# Ativação de notificações push

20/10/2026, America/Sao_Paulo. O usuário autorizou explicitamente o armazenamento de chaves/segredo em tabela privada e a publicação da função com autenticação própria. A restrição de autorização anterior foi atendida.

## Configuração

- Migração `20261020110148_notification_delivery.sql` aplicada e registrada no histórico; substitui o arquivo provisório `20261020030000_notification_delivery.sql`.
- VAPID gerada com `web-push`; chave privada e segredo de agendamento armazenados somente em `private.delivery_settings` (RLS e ACL restrita a serviço).
- `hub-notifications` publicada como ACTIVE v1; `verify_jwt:false` no gateway, com autenticação na própria função por JWT/AAL2/autoria ou segredo do agendamento.
- Cron `hub-notifications`: `* * * * *`, ativo. Durante a preparação ficou pausado; só foi habilitado após a função responder corretamente.
- Vercel Production: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `NEXT_PUBLIC_PUSH_ENABLED=true`. Nenhuma chave privada foi configurada no frontend ou na Vercel.
- Tipos do banco regenerados. Nenhuma conta ou inscrição fictícia foi criada em produção.

## Verificações

- [83 testes SQL locais](validation/push/sql.log): todos passaram. Novo caso cobre notificação lida, claim exclusivo durante lease e limite de quatro tentativas. PGlite não valida cron/pg_net reais.
- [10 unitários](validation/push/unit.tap): todos passaram.
- [Build de produção](validation/push/build.log): passou com a flag habilitada.
- [Checks reais da função](validation/push/edge-checks.json): segredo inválido → 401; mensagem sem sessão → 401; origem não permitida → 403; job autorizado → 200.
- [Estado do serviço](validation/push/service-state.json) e [execução real do cron](validation/push/cron-verification.json): job bem-sucedido e resposta pg_net HTTP 200. Consulta de ACL confirmou que usuários não podem obter a configuração privada.
- Busca pelos valores de chave privada, job secret e token administrativo encontrou zero ocorrências nos arquivos versionados e nos assets JS/CSS do browser gerados localmente. Os valores não foram gravados nos relatórios.

## Publicação

Código `ec558a5` publicado em produção: deployment `dpl_BCunKVSmBHPR8J3hGtcXZ2weRLqY`, estado **READY**. [URL imutável](https://hub-80tzg1tky-yemorgxs-projects.vercel.app); alias https://hub-one-azure.vercel.app. [Metadados](validation/push/deployment.json).

Os [24 checks HTTP públicos](validation/push/production-http.log) passaram após o deploy, sem falhas/skips e sem criar contas ou enviar e-mails.

## Validação pendente no aparelho

Nenhum dispositivo estava inscrito durante os checks; `processed=0` e `sent=0`. Isso demonstra a configuração/execução do serviço, não a entrega por FCM/Mozilla/Apple nem o comportamento do sistema operacional.

O usuário precisa atualizar o Hub, entrar com MFA, abrir o perfil e clicar em **Ativar notificações**, concedendo permissão. Depois, validar uma menção recebida e um lembrete; testar desativação e saída/troca de conta. iOS/iPadOS exige PWA instalada. As notificações contêm avisos genéricos, e a cópia local de mensagens é uma configuração separada.

## Ativação no Brave

Se a permissão de notificações estiver concedida mas a inscrição push falhar, abra `brave://settings/privacy` e confira **Usar serviços do Google para mensagens push**. Ative a opção se quiser receber push pelo Brave, recarregue o Hub e tente novamente. A permissão de notificações do site também precisa estar habilitada. Uma rede que bloqueia o serviço push pode causar a mesma falha.

No diagnóstico de 20/10/2026, a chave pública de produção era um ponto P-256 válido de 65 bytes e correspondia à configuração do serviço. Nenhum dispositivo estava inscrito naquele momento; a configuração do Brave e a entrega no aparelho ainda dependem de validação pelo usuário.

O fluxo solicita permissão diretamente no clique, antes de aguardar o service worker, e diferencia falhas de permissão, inicialização, inscrição no navegador e registro no Hub. A espera pelo service worker tem limite de 15 segundos. A interface só restaura o estado ativo de uma inscrição local quando ela pertence à conta atual.
