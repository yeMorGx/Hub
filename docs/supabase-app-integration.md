# Hub — integração do aplicativo com Supabase

## Estado em 20/10/2026

O frontend agora tem uma implementação integrada, separada da demonstração visual. A configuração local aponta para `mjaidgzqsztwygdyzkeq`, usando **somente a chave publishable**. Nenhuma chave administrativa foi adicionada ao navegador, ao repositório ou à configuração de servidor.

As migrações das fases 0/1 foram preservadas. A migração incremental
`20261020002608_phase_2_kanban.sql` foi aplicada pelo MCP, com versão confirmada
por `list_migrations`; o esquema agora tem 14 tabelas públicas. Os tipos TypeScript foram gerados do esquema remoto pelo MCP. As gravações usam os RPCs já implantados; a edição de nome usa o UPDATE de perfil próprio permitido pelas políticas existentes.

## Rotas

| Rota | Comportamento |
| --- | --- |
| `/` | Verifica a assinatura da sessão no servidor. Sem sessão, redireciona a login; sem AAL2, redireciona a MFA. |
| `/login` | E-mail/senha, cadastro com confirmação de e-mail e pedido de recuperação. |
| `/mfa` | Sessão obrigatória. Enrolamento TOTP ou confirmação do autenticador existente. |
| `/auth/callback` | Troca código PKCE por sessão. Destino limitado ao app ou redefinição de senha. |
| `/auth/confirm` | Verifica token de e-mail; aceita apenas tipos conhecidos. |
| `/reset-password` | Confere a conta e permite nova senha; pede TOTP quando a conta já exige AAL2. |
| `/demo/kanban` | Quadro fictício, sem backend, somente em memória. |
| `/demo` | Demonstração fictícia anterior, com armazenamento local separado. Não acessa dados do time. |
| `/manifest.webmanifest` | Manifest da PWA. |
| `/pwa/icon/180`, `/192`, `/512` | Ícones PNG gerados a partir do símbolo Phosphor usado na interface. |

## Configuração

No ambiente local, `.env.local` está configurado e ignorado pelo Git. Em outro ambiente, copie `.env.example` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Não use `service_role`, secret key ou token de gerenciamento nessas variáveis. Os SDKs estão fixados: `@supabase/supabase-js` 2.118.0 e `@supabase/ssr` 0.12.7. O lockfile registra a instalação.

A consulta às configurações públicas do Auth confirmou cadastro habilitado, provedor e-mail habilitado e confirmação de e-mail obrigatória. Provedores sociais e Azure não estão habilitados; SSO continua na fase 4.

### Configuração de hospedagem necessária

Quando houver uma URL pública do app:

1. Em Auth → URL Configuration, ajuste **Site URL** e inclua as URLs autorizadas de callback/recuperação da hospedagem. Em desenvolvimento, autorize também a origem/porta efetivamente usadas.
2. O fluxo padrão de e-mail usa PKCE e `/auth/callback`. Para confirmação por token no servidor, os handlers também aceitam templates apontando para `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; recuperação usa `type=recovery`.
3. Em Realtime → Settings, desative **Allow public access** antes do piloto. Todas as assinaturas implementadas são privadas e usam os tópicos previstos nas políticas.
4. Sirva por HTTPS para instalação PWA e funcionamento normal das APIs do navegador fora de localhost.

Estas configurações de hospedagem/Realtime não foram alteradas automaticamente nesta etapa. O app foi publicado posteriormente em https://hub-one-azure.vercel.app. As configurações Auth/Realtime acima continuam pendentes; veja `vercel-deployment.md`.

## Fluxos implementados

### Conta e segundo fator

- Sessão em cookies com utilitários oficiais de navegador/servidor e `proxy.ts` do Next.js 16 para refresh.
- Verificação com `getClaims` no servidor; o app não usa `getSession` como prova de identidade.
- MFA TOTP: preparação do fator, QR code, chave manual e verificação de seis dígitos.
- QR, segredo TOTP e senhas não são registrados em logs nem no armazenamento da demonstração.
- Troca de identidade ou saída limpa o estado em memória e recarrega a rota apropriada.
- Sair da conta encerra a sessão neste navegador.

### Workspace, time e papéis

- Primeiro acesso sem time: criar workspace/time e um canal inicial #geral, ou compartilhar o próprio UUID com um administrador.
- Troca de time entre os acessíveis pela conta.
- Administrador pode criar time e adicionar/atualizar a associação de contas já cadastradas, com papel no workspace e no time.
- Líder/admin pode criar projetos. Participação no time é exigida para timer, mensagens e eventos, conforme os RPCs.
- Administradores sem participação podem consultar os dados autorizados pelo RLS; não recebem acesso automático a canais privados ou DMs.
- Não há envio de convites por e-mail pelo aplicativo nesta etapa. A inclusão por UUID requer uma conta já criada.

### Horas, calendário e conversa

- Timer usa `start_timer`/`stop_timer`: início/fim e duração oficial vêm do servidor. Há uma consulta específica para encontrar timer ativo mesmo fora dos 500 registros recentes.
- Entradas manuais e edição usam início/fim completos e os validadores de sobreposição do banco.
- Histórico e totais da interface usam até 500 registros próprios recentes. Relatórios completos e agregações históricas ficam para a fase 3.
- Calendário usa semana/dia, períodos em UTC no banco e exibição no fuso do navegador. Eventos simultâneos recebem faixas separadas.
- A consulta cobre a semana selecionada e, quando necessário, busca a agenda de hoje separadamente. Cada intervalo retorna até 500 eventos; participantes e perfis são consultados em lotes de até 100 identificadores.
- Criação, edição, cancelamento, participantes, link de chamada e RSVP usam os RPCs de eventos.
- Canais públicos exigem participação antes de abrir mensagens; canais privados e DMs dependem do RLS.
- Mensagens são carregadas em páginas de 50. Envio usa `client_id` preservado ao repetir a mesma tentativa, evitando duplicação no RPC.
- Edição/remoção usa os RPCs; remoção apresenta tombstone.
- Não lidas vêm da view com `security_invoker`. O cursor avança ao alcançar as mensagens recentes com a página visível.

### Kanban da Fase 2

- `tasks` tem projeto, responsável, prazo, prioridade, três estados, versão e arquivamento lógico. `time_entries.task_id` usa chave estrangeira composta para exigir o mesmo time.
- Leitura usa RLS com `can_access_team`; não há INSERT/UPDATE/DELETE direto pelo cliente. As quatro novas RPCs `save_task`, `move_task`, `archive_task` e `start_task_timer` exigem MFA e participação ativa no time.
- Membros editam tarefas criadas por si, atribuídas a si ou sem responsável. Liderança participante edita todas; arquivamento exige criador ou liderança. Admin fora do time pode consultar conforme RLS.
- Salvar edição, mover e arquivar recebem `expected_version`; divergência rejeita a alteração e pede atualização do quadro.
- Iniciar timer usa o lock de perfil existente e mantém um único timer global por usuário. Repetir a chamada para o mesmo card retorna o timer ativo. Título e projeto são copiados ao registro de horas; `todo` só muda para `in_progress` se o usuário pode editar o card.
- Mover, concluir ou arquivar não encerra o timer. Arquivamento preserva registros de horas; parada usa a RPC existente `stop_timer`.
- `use-hub.ts` percorre páginas de 500 tarefas ativas por cursor UUID até terminar. Alterações de `tasks` entram na assinatura Postgres do room privado existente do time.
- Tipos TypeScript foram regenerados do esquema remoto. A compilação passou; permissões, concorrência, timer e entrega Realtime ainda não foram validados com usuários reais. [Relatório completo](phase-2-kanban.md).

### Tempo real

- `team:<uuid>:presence`: room privado com Presence e assinaturas Postgres do time.
- `channel:<uuid>:typing`: room privado com indicador de digitação e alterações das mensagens.
- Corpos de mensagens vêm de consultas/Postgres Changes, nunca de Broadcast.
- Reconsultas periódicas e retorno de foco recuperam dados e associações; revogação elimina o conteúdo atualmente exposto pelo controlador.
- Presence/digitação são sinais efêmeros do cliente, não prova de identidade, frequência ou registro de horas. Nenhuma permissão é concedida com base nesses sinais.
- Admin fora do time usa consultas periódicas, sem entrar no room de presença do qual não participa.

### PWA

- Manifest, ícones, registro de service worker e ação de instalar quando oferecida pelo navegador.
- O service worker guarda somente shell público, ícones e assets estáticos versionados.
- HTML autenticado, respostas RSC, requests Supabase, mensagens e dados do time **não são colocados no cache**.
- Sem rede, uma página informa que é necessário reconectar para abrir dados protegidos. Cache offline de mensagens e push permanecem nas fases previstas.

## Evidência e limites

Atualização de validação: [relatório de 20/10/2026](validation-2026-10-20.md). Após a entrega inicial descrita abaixo, passaram 59 cenários SQL locais, 16 testes HTTP e 5 cenários anônimos de navegador. Foram corrigidos origem e cabeçalho dos callbacks. Login/MFA reais continuam pendentes; [publicação e primeiro acesso](first-access.md).

A compilação Next.js/TypeScript passou. A inspeção anônima confirmou a abertura da tela de login a partir de `/`; capturas de login, cadastro e recuperação ficam em `.impeccable/review/auth/`.

A revisão visual final teve veredito `ship` somente para login desktop/celular, cadastro desktop, pedido de recuperação desktop e ícone de 512px. Não há capturas de telas privadas ou MFA. O resultado visual não aprova piloto/produção nem comprova autenticação ponta a ponta.

Não foram criadas contas, enviados e-mails, gerados autenticadores de usuários ou executados testes funcionais/suítes nesta etapa. Ainda precisam de validação com uma conta real: confirmação de e-mail, enrolamento e desafio TOTP, consultas autenticadas, gravações pelos formulários, revogação e entrega Realtime entre dois clientes. Instalação em dispositivos e push não foram validados.

Os testes SQL/PGlite anteriores continuam documentados em `supabase-validation.md`; esses resultados pertencem à etapa do banco e não comprovam os fluxos Auth/UI desta integração.


## Evidência adicional: Kanban

As capturas `.impeccable/review/kanban/` mostram exclusivamente a demonstração fictícia e seu editor. A revisão independente teve veredito `ship` limitado a essa superfície. Não substituem captura autenticada, teste de RLS/RPC ou sincronização entre clientes. Nenhuma suíte funcional foi executada no incremento; os resultados SQL/PGlite anteriores continuam sendo evidência histórica das fases 0/1.

A Fase 2 permanece parcial: chat avançado, standups, documentos Markdown e lembretes ainda não estão entregues. O resultado não aprova produção.
