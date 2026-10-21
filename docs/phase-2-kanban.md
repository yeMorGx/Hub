# Fase 2 — incremento Kanban

## Estado em 20/10/2026

O módulo Tarefas integra um quadro Kanban ao aplicativo autenticado. A migração `supabase/migrations/20261020002608_phase_2_kanban.sql` foi aplicada pelo MCP; `list_migrations` confirmou a versão `20261020002608`. O esquema tem 14 tabelas públicas e os tipos TypeScript foram regenerados do remoto.

Esta entrega cobre o Kanban. Chat avançado, standups, documentos Markdown e lembretes permanecem futuros; a Fase 2 não está inteiramente pronta. A compilação passou e a demonstração recebeu revisão visual, mas não há aprovação de produção ou validação autenticada ponta a ponta.

## Interface e extensão do sistema existente

`components/live-board.tsx` é integrado por `components/live-hub-app.tsx`, recebendo dados e operações de `lib/hub/use-hub.ts`. O quadro tem A fazer (`todo`), Em andamento (`in_progress`) e Concluído (`done`).

- Busca por título/descrição, filtro por projeto ou sem projeto e opção Atribuídas a mim.
- Ordenação por prioridade, prazo, criação mais recente e UUID como desempate; não há ordenação manual de cards.
- Criação e edição de título, descrição, projeto, responsável, prazo e prioridade; limites de 180 caracteres no título e 10.000 na descrição.
- Mudança de etapa por seletor, com arraste como alternativa; detalhes consultáveis mesmo sem permissão de edição.
- Estados vazios, erros, indicação de atraso, arquivamento com confirmação e início/parada do timer no card.

A comparação entre código, `DESIGN.md` e capturas confirma a extensão do modo **Operate** existente: grafite, acento laranja, Manrope e Phosphor, três colunas no desktop e colunas empilhadas no celular. A ação Nova tarefa ganha largura total no celular. `DESIGN.md` e `.impeccable/design.json` foram preservados, sem mudança durável de sistema.

## Dados, acesso e concorrência

A tabela `tasks` guarda time, projeto opcional, responsável opcional, conteúdo, prioridade, estado, prazo, autor, versão e datas. Projeto e responsável pertencem ao mesmo time por chaves compostas. O vínculo `time_entries.task_id` também exige o mesmo time.

| Operação | Contrato implementado |
| --- | --- |
| Consultar | RLS usa `private.can_access_team`; administrador fora do time consulta conforme essa política. |
| Criar | `save_task`, com MFA e participação ativa. Autor vem da identidade autenticada. |
| Editar/mover | Criador, responsável, tarefa sem responsável ou liderança participante; MFA e participação ativa obrigatórios. |
| Arquivar | Criador ou liderança participante, com MFA. Arquivamento lógico preserva o histórico de horas. |
| Iniciar horas | `start_task_timer`, com MFA e participação ativa; tarefa não concluída nem arquivada e projeto válido. |

O cliente tem somente SELECT em `tasks`; gravações passam por `save_task`, `move_task`, `archive_task` e `start_task_timer`. Edição, movimento e arquivamento recebem `expected_version` e rejeitam versões divergentes. O arquivamento já efetuado admite repetição sem novo efeito.

O carregamento de tarefas ativas percorre páginas de 500 registros ordenados por UUID, usando cursor `gt(id)` até terminar; não existe limite total de 500 tarefas. `tasks` foi adicionada à publicação Realtime e à assinatura Postgres do room privado existente do time. Isso descreve o código e a migração; entrega e revogação em clientes reais ainda não foram verificadas.

## Relação com o timer

O início usa o mesmo lock de perfil das operações de horas existentes e preserva um timer global por usuário. Repetir o início para o mesmo card retorna o registro ativo; outro timer ativo é rejeitado. Título e projeto são copiados para o registro de horas como snapshot.

Iniciar uma tarefa A fazer pode movê-la para Em andamento apenas se o usuário tiver permissão de editar o card. Poder registrar horas não concede edição. Mover, concluir e arquivar não param o timer; a interface informa essa regra. Parar usa a RPC existente `stop_timer`.

## Demonstração e evidências

`/demo/kanban`, implementada por `components/board-demo.tsx`, reutiliza o quadro e declara explicitamente dados fictícios sem Supabase. Tarefas e estado do timer ficam somente na memória React; recarregar restaura os exemplos. Essa rota não comprova persistência, RPCs, permissões ou duração oficial de horas.

| Evidência | Resultado e alcance |
| --- | --- |
| Compilação Next.js/TypeScript | Passou na implementação final, conforme registro da entrega. |
| `.impeccable/review/kanban/desktop.png` | Quadro fictício, viewport 1440 × 1000. |
| `.impeccable/review/kanban/mobile.png` | Quadro fictício, viewport 390 × 844, captura completa. |
| `editor-desktop.png` e `editor-mobile.png` no mesmo diretório | Editor da demonstração nos dois tamanhos. |
| `render-observations.jsonl` no mesmo diretório | Rotas do quadro retornaram HTTP 200; quadro e editor sem `pageerror` observado e com largura de documento igual à viewport. |
| Revisão independente `kanban_finish_review` | `ship`, estritamente para a superfície visual capturada; nenhum defeito material. Nome curto do responsável foi uma sugestão opcional. |

As capturas do quadro foram abertas e comparadas com a direção existente durante a documentação. Nenhuma inspeção visual equivale a auditoria WCAG ou comprovação funcional. As evidências históricas das fases 0/1 permanecem nos relatórios existentes.

## Limites de validação

Validação posterior autorizada: os 21 cenários de Kanban passaram na suíte SQL local de 59 cenários. O [relatório de 20/10/2026](validation-2026-10-20.md) distingue esses resultados dos limites históricos da entrega abaixo. Concorrência real, gravações pela interface autenticada e entrega Realtime continuam pendentes.

Não foram executados testes funcionais ou suítes neste incremento, criadas contas, enviados e-mails ou inseridos dados reais de negócio. E2E autenticado, regras de permissão, concorrência entre editores, timer no banco e entrega Realtime entre pessoas ainda dependem de validação real. A demonstração e a compilação não eliminam essas pendências.
