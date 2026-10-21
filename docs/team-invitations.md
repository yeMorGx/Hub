# Convites por link e gestão de membros

Implementação de 20/10/2026. O usuário adiou o envio automático de e-mails. O administrador informa o e-mail, cria um link em **Pessoas → Convidar pessoa** e compartilha com a pessoa. Não é necessário copiar UUIDs.

## Fluxo e permissões

- Convite válido por sete dias; papel de membro ou líder no time. Administração da organização é concedida separadamente pela aba Membros.
- O link abre `/invite#token=…`. O navegador guarda o token em cookie HttpOnly, Secure e SameSite=Lax e remove o fragmento. O banco guarda apenas SHA-256 do token aleatório de 32 bytes.
- Cadastro e MFA preservam a intenção de aceite no mesmo navegador. Ao usar outro navegador, reabrir o convite original após entrar. O aceite exige a conta do e-mail convidado, confirmado no Supabase Auth, e AAL2.
- Nenhum acesso é concedido ao abrir o link ou visualizar o convite. O botão **Aceitar convite** executa POST autenticado com verificação de origem. O aceite insere associações e ingressa no canal público `geral`, quando existir. Não ingressa em canais privados.
- Repetir aceite não duplica nem reativa associações suspensas. Papéis ativos existentes são preservados. Convites deixam de valer se revogados, expirados ou se o emissor perder a administração.
- A aba Convites mostra status e permite revogar/gerar novo link. A reemissão invalida o anterior; intervalo mínimo de um minuto por e-mail/time e limite de 50 convites por organização/hora.
- A aba Membros edita os dois papéis em transação única e suspende/reativa participação no time. Suspensão encerra timer ativo nesse time. O último admin ativo é preservado. Administradores mantêm gestão da organização mesmo sem participação ativa no time.

## Banco e publicação

Migração `20261020150000_team_invitations.sql` aplicada no Supabase e registrada em `supabase_migrations`. Leitura posterior confirmou RLS, tabela privada sem SELECT para authenticated, seis RPCs SECURITY DEFINER autorizadas para authenticated e negadas para anon. Nenhum convite real foi criado por essa verificação.

A tabela privada não armazena token bruto. A auditoria registra as mudanças sem os valores de e-mail/hash. As rotas reutilizam a origem oficial configurada em `NEXT_PUBLIC_APP_URL` e recusam origem externa. Respostas e a página de convite não permitem cache compartilhado; referrer é desabilitado.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm test --prefix supabase/tests` | 94 cenários, todos passaram, incluindo oito novos de convites/gestão. |
| `npm run test:unit` | 11 testes passaram; geração/formato/hash de tokens incluídos. |
| `HUB_APP_ORIGIN=http://127.0.0.1:3000 npm run test:public` | 28 testes passaram no build local com a mesma origem configurada no servidor. |
| `npm run build` | Next.js e TypeScript passaram. |
| Chromium local, 1440×900 e 390×844 | Fragmento removido; cookie HttpOnly/Secure; cadastro preserva cookie; descarte limpa cookie; origens externas e POSTs sem sessão recusados; sem erros JS ou overflow horizontal. |
| Componente Pessoas em fixture, mesmos tamanhos | Formulários de criação/compartilhamento, alteração de membro e revogação exercitados com RPCs/respostas fictícias. |

[Logs](validation/team-invitations/) e [captura mobile](validation/team-invitations/invitation-mobile.png). As fixtures de componentes não comprovam uma sessão real autenticada. Os cenários SQL usam PostgreSQL local/PGlite com contratos mínimos de Auth/Realtime; não reproduzem concorrência entre duas conexões. O aceite completo por uma segunda conta real permanece para validação manual. Não foram criadas contas nem enviados e-mails de teste.

## Correção da conversa entregue junto

Commit `5b93b60`: painel de chat limita sua altura; histórico recebe a rolagem e a caixa de mensagem permanece dentro do painel. O scroll automático agora altera somente o histórico. Uma fixture CSS com 103 mensagens em desktop e mobile confirmou deslocamento zero da caixa ao adicionar mensagens. Essa fixture não é uma captura da sessão autenticada do usuário.

## Resultado da publicação

Código `e4a9ec7`, deployment `dpl_6NxwxGBd28w3YXMHKPWzk464hGVo`, **READY** no [endereço de produção](https://hub-one-azure.vercel.app). Os 28 testes HTTP públicos passaram após a publicação, incluindo os endpoints de convites. No ambiente cloud, Node precisa de `NODE_USE_ENV_PROXY=1` para usar a rede configurada; a primeira tentativa sem essa opção falhou por timeout de rede e foi repetida com o proxy. [Log de produção](validation/team-invitations/production-http.log) e [metadados](validation/team-invitations/deployment.json).
