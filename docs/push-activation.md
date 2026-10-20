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

## Validação pendente no aparelho

Nenhum dispositivo estava inscrito durante os checks; `processed=0` e `sent=0`. Isso demonstra a configuração/execução do serviço, não a entrega por FCM/Mozilla/Apple nem o comportamento do sistema operacional.

O usuário precisa atualizar o Hub, entrar com MFA, abrir o perfil e clicar em **Ativar notificações**, concedendo permissão. Depois, validar uma menção recebida e um lembrete; testar desativação e saída/troca de conta. iOS/iPadOS exige PWA instalada. As notificações contêm avisos genéricos, e a cópia local de mensagens é uma configuração separada.
