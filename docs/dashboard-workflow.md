# Hoje — ações do dia

Modo **Operate**. Refinamento pedido pelo usuário sobre a composição Bento existente: marfim, Inter, azul profundo, foto da escala e Prism/Lava preservados.

## Componentes e referências

- HeroUI v3 Form, Input, Select/ListBox, Button, Spinner, Card, Chip e ProgressBar, compostos pelos adaptadores já instalados. Formulário inline, sem redirecionamento ou modal.
- [Animate UI Hugeicons](https://animate-ui.com/docs/icons/hugeicons), [get started](https://animate-ui.com/docs/icons/get-started) e registry público `https://animate-ui.com/r/icons-hugeicons-<nome>.json`. Arquivos oficiais incorporados com licença, sem redesenhar os ícones. `@animate-ui/react` 2.0.0 e `motion` 14.5.0. `DashboardNavIcon` conecta hover e foco do controle inteiro, sem loop; movimento reduzido mantém a representação estática.

## Contratos

- **Jornada:** não altera o cálculo de horas do servidor. O saldo mostra duração absoluta e “a mais”/“a compensar”, além de horas feitas e previstas até hoje. A explicação informa que a meta inclui o dia em andamento. A demonstração deixou de usar saldos arbitrários inconsistentes com seus totais.
- **Sidebar:** flutuante apenas na superfície clara de Hoje; 12px de margem, 22px de raio. Celular usa dock com 20px de raio e respeita a área segura. Ícones novos também aparecem na sidebar das demais telas. Sem bordas decorativas ou sombras. Rodapé promocional/MFA removido; a prévia mantém a identificação de dados fictícios no cabeçalho, com controle de cenário na barra superior.
- **Timer:** a ação idle abre um formulário no card, com foco na descrição. Pode escolher tarefa, atividade recente ou escrever texto e projeto. Tarefa usa `start_task_timer`, preservando vínculo e permissões; atividade manual usa `start_timer`. Alterar descrição/projeto transforma a seleção em atividade manual. Início só fecha após sucesso; erro mantém o rascunho. Bloqueio durante envio, validação obrigatória, Escape e botão de fechar com restauração de foco. Trocar de time recria o seletor para não manter tarefa/projeto do anterior. Almoço e encerramento mantêm as RPCs existentes.
- **Pessoas:** usuário atual aparece primeiro. Atividade própria usa o timer confirmado; almoço exibe pausa. Colegas compartilham no máximo 200 caracteres da atividade atual pela Presence privada autorizada do time. Não consulta registros de horas de outras pessoas, não persiste o texto de Presence e não usa esse payload como prova de identidade/frequência. Sem Presence disponível, mantém status público e indicador de timer existente.
- **Mensagens:** consulta no máximo oito DMs próprias não lidas, com associação de canal confirmada, RLS e filtro de time. Por canal, busca só a última mensagem recebida não apagada acima do ordinal lido. Exibe até três prévias, com 160 caracteres e texto simples; anexos sem corpo têm fallback. Não marca leitura ao mostrar a prévia; o clique abre a conversa pelo canal existente. Falha da prévia não bloqueia o restante do time. Realtime, foco e polling existentes atualizam os dados; sem cache novo de mensagens.

## Verificação

`npm run build`, `npm run test:unit`, scripts `dashboard-workflow-browser.py`, `dashboard-browser.py`, `bento-browser.py`, `prism-browser.py` e `test:public`.

Os testes de navegador usam a prévia pública em memória e a fixture isolada HeroUI: não criam conta, enviam e-mail, iniciam timer real nem escrevem dados de negócio. Confirmam layout/controle em larguras de 320 a 1440px, teclado, movimento reduzido e a ligação local entre timer e pessoas. Os testes unitários conferem seleção de DMs próprias e texto dos saldos. Não substituem uma validação com duas sessões autenticadas de pessoas reais nem validam RLS ponta a ponta. Evidências e identificação da publicação em `.impeccable/review/dashboard-workflow/`.

## Publicação

Publicado em https://hub-one-azure.vercel.app, deployment `dpl_Hhmmh6gUhrAMSAKm3uksNozmEEZW` READY, fonte `e348d09`. Verificação pública: 32 checks HTTP e fluxo de atividade, pessoas, mensagem fictícia e navegação nas larguras 1440/390/320px. Ícones também conferidos com hover, teclado e redução de movimento. Identificação e evidências em `.impeccable/review/dashboard-workflow/`.

## Projetos no timer e duração do almoço

O Select/ListBox HeroUI v3 do projeto inclui a ação de rodapé “Adicionar novo projeto” (referências oficiais: https://heroui.com/en/docs/react/components/select e https://heroui.com/en/docs/react/components/text-field). Ela fecha o dropdown e abre um campo inline no próprio seletor de atividade. Criar seleciona o projeto retornado pela RPC `save_project`; cancelar/Escape devolve o foco ao seletor. Nome vazio, envio duplicado, carregamento e falha recebem tratamento. A ação segue `canManage`, preservando as permissões existentes do servidor. A prévia cria somente em memória.

Durante o almoço, o card mostra um cronômetro secundário, o horário de início e a indicação de que a pausa não conta como trabalho. A duração parte de `paused_timers.paused_at` e continua correta após recarregar uma sessão autenticada. O cronômetro principal permanece parado; retomar remove o indicador de almoço e continua o trabalho. Sem alterações no banco ou no instalador nativo.

Verificação: `scripts/dashboard-project-lunch-browser.py` exercita criação/seleção, início da atividade, pausa, avanço independente do almoço, retomada, erros de página e overflow em 1440px e 390px. A prévia não comprova uma gravação real autenticada no Supabase.

## Sidebar recolhida

Por decisão do usuário, a navegação flutuante de Hoje fica compacta, com 80px de largura, ícones centralizados e 104px reservados no conteúdo. Os nomes ficam em tooltips oficiais HeroUI por hover ou foco, com `aria-label` preservado. O dock móvel mantém o comportamento existente.
