# Organizações: criação e exclusão

Decisão confirmada em 23/10/2026: excluir a organização apaga permanentemente seu conteúdo. Somente o dono pode executar a ação, com MFA e confirmação do nome.

## Interface

- Seletor de times na barra superior → **Criar organização**. Qualquer membro autenticado pode criar um espaço independente. Organização, dono, primeiro time e canal `#geral` são criados juntos, sem estado parcial.
- **Configurações → Organização → Excluir organização**. O dono digita o nome exato e confirma a perda dos dados para todos os participantes.
- Após excluir, o aplicativo seleciona outro time disponível. Sem organizações restantes, volta ao preparo de um novo espaço.
- Conta, perfil, avatar e inscrições push pessoais continuam. O cache offline deste dispositivo é limpo.

## Processamento

`begin_organization_deletion` confere dono ativo, MFA e nome. Um marcador privado bloqueia escritas na organização e novos uploads. Bloqueios no registro da organização serializam essa preparação com escritas e uploads em andamento. Leituras continuam disponíveis durante o processo.

A Edge Function `delete-organization` valida a sessão e chama as RPCs com o JWT do usuário. Somente a remoção física de arquivos usa a credencial de serviço no servidor. Busca lotes de 100 objetos nos prefixos dos times em `hub-files` e dos documentos em `organization-library`, incluindo anexos antigos e uploads pendentes. Usa a API de Storage, sem apagar seus metadados diretamente por SQL.

`finalize_organization_deletion` revalida dono, MFA, nome, marcador e ausência de arquivos. Remove os registros em uma transação: times, membros, convites, canais/DMs, mensagens/threads/reações, documentos/ACLs, projetos/clientes/tarefas, horas/timers, calendário/conexões/credenciais, escalas, ausências, notificações e auditoria. Um marcador de transação privado permite remover o dono e evita recriar auditoria durante a limpeza. Clientes não podem ler nem alterar esse marcador.

Falha de rede ou Storage deixa o processo pendente e bloqueia novas escritas. O dono usa **Continuar exclusão** para remover os arquivos restantes. Arquivos já apagados não são recuperados; não há cancelamento depois de iniciar.

O escopo é o conteúdo operacional armazenado pelo ZULU. Cópias baixadas, eventos em provedores externos e a retenção dos backups do provedor não são alterados por esse fluxo.

## Interface e verificação

Dropdown, Modal, Form, Input, Button, Spinner e Tabs do HeroUI v3, com os adaptadores compartilhados, foco por teclado, loading, erro e movimento reduzido.

Testes SQL locais cobrem criação atômica, MFA, confirmação, proteção contra administradores, marcador privado, bloqueio de escritas/uploads, retomada, anexos antigos, múltiplos times, DMs/threads, tarefas, cliente/projeto, timer pausado, credenciais de calendário e preservação de outro tenant e dos perfis. Nenhuma organização real foi excluída no QA.

Validação da entrega: 137 cenários SQL, 61 testes unitários e build de produção aprovados. Chromium em 1440 e 390 px conferiu confirmação, bloqueio de botão, mensagens de erro, criação pelo seletor e ausência da exclusão para admin/membro. Migração `20261023170740` aplicada e registrada; função de exclusão publicada. Conferência remota confirmou RLS, ausência de acesso anônimo e nenhum processo de exclusão iniciado no QA.

## Referências

- [Supabase — Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects): remover arquivos pela API, e não por SQL.
- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions): autorização em funções privilegiadas e `search_path` fixo.
- [HeroUI — Dropdown](https://heroui.com/en/docs/react/components/dropdown), [Modal](https://heroui.com/en/docs/react/components/modal) e [Form](https://heroui.com/en/docs/react/components/form).
