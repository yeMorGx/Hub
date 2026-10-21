# Aplicação e validação do banco

> Resultado atual de 20/10/2026: [59 cenários locais, 16 checks HTTP e 5 checks no Chromium](validation-2026-10-20.md). O relatório abaixo preserva a evidência histórica da primeira implantação; as contagens de 13 tabelas/26 RPCs pertencem àquela etapa.

Validação realizada em 19/10/2026 no projeto `mjaidgzqsztwygdyzkeq`, PostgreSQL
17.11. O projeto estava sem tabelas em `public`, sem usuários Auth e sem
migrações. A autenticação usou o OAuth do MCP Supabase já configurado.

## Migrações aplicadas

| Versão | Conteúdo |
| --- | --- |
| [`20261019231555_phase_0_1`](../supabase/migrations/20261019231555_phase_0_1.sql) | Identidade, organizações/times, projetos, chat, horas, calendário, RLS e RPCs. |
| [`20261019232146_restrict_internal_rls_helper`](../supabase/migrations/20261019232146_restrict_internal_rls_helper.sql) | Remove EXECUTE de clientes no helper interno `rls_auto_enable`, preservando sua implementação e o event trigger `ensure_rls`. |

Ambas foram aplicadas pelo `apply_migration` do MCP e confirmadas com
`list_migrations`. Os nomes locais foram alinhados aos identificadores gerados
pelo serviço. A primeira migração foi enviada sem seus delimitadores externos
BEGIN/COMMIT, pois o serviço controla a transação da migração. Seu SQL enviado
tem SHA-256 `51f6f495aa58f5a4c21ca5203f5aecb09e0508b6dde9b4a724f74fb5e4b0cda5`.

A revisão anterior à aplicação substituiu o ALTER TABLE redundante na tabela
gerenciada `realtime.messages` por uma verificação no catálogo e completou os
índices das FKs. A [documentação oficial de autorização Realtime](https://supabase.com/docs/guides/realtime/authorization)
explica que o papel `postgres` pode gerenciar suas políticas, mas não deve
alterar o RLS/owner da tabela gerenciada.

## Resultados

| Verificação | Resultado |
| --- | --- |
| Testes locais `npm test --prefix supabase/tests` | 38 passaram; zero falhas ou skips. |
| [Script SQL no Supabase](../supabase/tests/phase01.live.sql) | 28 verificações passaram; zero falhas. |
| Tabelas do app | 13, todas com RLS. |
| RPCs do app | 26, nenhuma executável por `anon`. |
| Funções privilegiadas sem search_path fixo | Zero. Helpers do app usam caminho vazio; o helper da plataforma usa `pg_catalog`. |
| FKs sem índice de suporte | Zero. |
| View de não lidas | `security_invoker=true`. |
| Realtime | Duas políticas de autorização e nove tabelas do app na publicação. |
| Helper interno de RLS | Não executável por `anon`/`authenticated`; event trigger continua habilitado. |
| Dados de teste retidos | Zero usuários, organizações, mensagens, horas ou eventos. |

As verificações reais criam quatro identidades dentro de uma subtransação,
alternam o papel SQL `authenticated` e as claims AAL1/AAL2, executam os fluxos e
revertem todas as fixtures ao final. Foram conferidos:

- Bootstrap de organização/time e proteção do último admin.
- Papéis armazenados no banco, sem promoção por metadados ou escrita direta.
- Horas próprias, visão de líder por time e visão de admin por organização.
- Bloqueio de leitura entre organizações e de chat privado para não participantes.
- Retry de mensagens, DMs de duas pessoas e cursor de não lidas.
- RSVP próprio e bloqueio de edição de evento alheio por membro.
- MFA exigido para dados colaborativos e autorização dos tópicos Realtime.
- Timer único, parada idempotente, duração gerada e rejeição de sobreposição.
- Encerramento do timer e bloqueio dos dados após revogar associação.
- FK composta impedindo associar horas a projeto de outro time.

## Advisors

Os advisors de segurança e desempenho foram executados após as duas migrações.

### Segurança

O aviso de execução anônima do helper `rls_auto_enable` foi corrigido pela
segunda migração. Ele retorna `event_trigger` e não integra a API do app.
Sua definição, owner e ligação ao evento de DDL foram preservados.
[Referência do aviso corrigido](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

Restam **26 avisos WARN de execução autenticada de SECURITY DEFINER**, um para
cada RPC do aplicativo.
[Referência e alternativas de remediação](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Essas funções são as APIs de escrita documentadas do MVP: a permissão EXECUTE
para `authenticated` é intencional. Cada função valida `auth.uid()`, AAL2 e o
escopo/papel exigido para a operação. O cliente não recebe INSERT/UPDATE/DELETE
diretos nas tabelas colaborativas. Os testes exercitaram permissões concedidas
e negadas e tentativas de acesso a outros usuários/times/organizações.

O advisor **não está sem avisos**. Os avisos acima foram mantidos em razão dessa
arquitetura; o resultado não equivale a uma auditoria completa de segurança.

### Desempenho

Restam **14 avisos INFO de índice ainda não utilizado** na última consulta.
[Referência do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
O banco está sem carga de uso do aplicativo. Os índices foram mantidos por
cobrirem FKs e acessos previstos; não há aviso de FK sem índice de suporte.

## Validação que depende da próxima etapa

O banco está aplicado e os contratos SQL foram testados. Ainda precisam de
integração com o frontend:

1. Cadastro/login, enrollment TOTP, challenge/verify e emissão/refresh de JWT
   AAL2 pelo serviço Auth. As claims da suíte SQL são simuladas.
2. Entrega real de Presence, typing e Postgres Changes via WebSocket, incluindo
   reconexão e revogação durante uma conexão ativa. Desabilitar **Allow public
   access** nas configurações de Realtime e usar `private: true` no cliente.
3. Concorrência real entre duas conexões iniciando timer ou enviando mensagens
   ao mesmo canal. A suíte atual verifica as restrições e operações, sem
   reproduzir essa disputa simultânea.
4. Fluxos de usuário na interface, instalação PWA e deploy do frontend.

Nenhum usuário final, time ou canal foi cadastrado permanentemente. O primeiro
usuário deverá criar sua organização pelo fluxo autenticado do app.

## Integração posterior do aplicativo

Em 20/10/2026, foram implementados os fluxos de interface Auth/MFA e o adaptador dos RPCs. A [integração do app](supabase-app-integration.md) distingue o código implementado dos fluxos autenticados ainda não validados. Os testes deste relatório pertencem à etapa do banco.
