# Dashboard Hoje

Modo: **Operate**. O usuário aprovou explicitamente uma nova identidade clara para Hoje: marfim, superfícies brancas, tinta escura, azul profundo e Inter Variable. A escolha substitui a identidade Shakuro/Manrope/grafite/laranja somente em Hoje e `/demo/dashboard`, no escopo `.dashboard-redesign`. Os demais módulos, `/demo` original e o site público mantêm suas autoridades. A decisão posterior remove todas as bordas decorativas do dashboard, preservando marfim, azul profundo e Inter. Os valores normativos desta superfície estão em [DESIGN.md](../DESIGN.md#hoje--identidade-clara-aprovada).

## Composição aprovada

Sidebar expandida de 224px com rótulos, reduzida a 196px até 1200px. O timer ocupa um campo azul horizontal no topo, com atividade à esquerda e dígitos à direita. A jornada branca vem abaixo, com horas do dia e saldos da semana e do mês em colunas. Tempo da atividade e total do dia têm rótulos próprios; almoço pausa somente por ação da pessoa, com retomada manual. Os saldos usam o previsto até hoje, com configuração disponível quando falta uma jornada.

Uma faixa azul clara mostra home office de hoje e a próxima data com atribuições. A agenda branca usa 60px por hora e rolagem interna de até 376px; o calendário completo mantém 84px por hora. Compromissos restantes de hoje, presença, retomada de atividades e conversas ocupam a lateral de 248px. Até 1200px, o contexto segue abaixo em duas colunas. Até 760px, a navegação vira barra inferior, o contexto passa a uma coluna, o timer se empilha e os dois saldos ficam lado a lado abaixo das horas do dia. Até 520px, a agenda inicial abre no dia; a semana continua disponível.

## Superfície plana e barra desktop

A separação visual usa campos brancos e azulados, espaço e hierarquia tipográfica. Painéis, navegação, ações, saldos, agenda e suas grades/eventos, contexto, popovers e diálogos de Hoje ficam sem bordas decorativas ou divisórias. Campos de formulário usam preenchimento azulado; a seleção da agenda não usa sombra decorativa. Os raios existentes permanecem. O token local `--border` continua declarado, mas não autoriza traços nesta superfície. Esta decisão está restrita a `.dashboard-redesign`.

Contornos de foco são funcionais: azul de 2px com afastamento de 4px; dentro do timer, branco nas mesmas dimensões. A captura `focus-1440.png` registra o foco após a remoção das bordas.

No Windows compatível, a barra de título de 36px mostra Hub, a legenda “Seu espaço de trabalho” e o contador de mensagens não lidas derivado do título. Usa marfim e azul em Hoje. Botões acessíveis invocam minimizar, maximizar/restaurar e fechar; a área da marca arrasta a janela e o duplo clique alterna a maximização. A barra usa o comando Rust restrito `desktop_titlebar`, com ações fixas somente na própria janela principal. Web, plataformas não Windows e instaladores antigos mantêm a moldura nativa; erros tentam restaurá-la e a navegação começa com as decorações nativas. [Contrato e estado da entrega](desktop-updates.md#barra-de-título-windows--implementação-014-pendente-de-publicação).

## Referências pesquisadas

- [Shakuro · Team Management Calendar UI Dashboard](https://dribbble.com/shots/24177180-Team-Management-Calendar-UI-Dashboard): referência anterior, preservada nos demais módulos; substituída pela escolha clara em Hoje.
- [Gradienta · Task Management App UI](https://dribbble.com/shots/27324770-Task-Management-App-UI-Productivity-Dashboard): hierarquia diária móvel.
- [WorkWise](https://dribbble.com/shots/23764759-WorkWise-Productivity-Dashboard): organização de projetos e responsáveis.
- [Ductivity](https://dribbble.com/shots/19052149-Ductivity-Productivity-Dashboard): agrupamento e navegação por contexto.
- [Datality](https://dribbble.com/shots/26343537-Datality-Productivity-Dashboard-for-Agile-Teams): organização de informações secundárias.
- [Xenity · Dark Mode Productivity Dashboard](https://dribbble.com/shots/26483779-Dark-Mode-Productivity-Dashboard-Smart-Focus-Analytics-UI): relação entre foco e agenda.

A pesquisa abaixo pertence à exploração inicial; a escolha clara posterior rege a identidade atual de Hoje. As referências são conceitos visuais; não comprovam usabilidade ou integrações. Conteúdo do app vem de dados autorizados, sem métricas ou recomendações inventadas.

## Dados e comportamento

`TodayOverview` e `TodayContext` são compartilhados pelo app autenticado e pela prévia pública em `/demo/dashboard`. O app usa os timers, balanços e permissões já existentes. Pausa, retomada e encerramento mantêm as RPCs atuais. Nenhuma migração ou credencial adicional é necessária para este redesenho.

O resumo de home office consulta a RPC existente desde o domingo da semana atual até 42 dias após hoje, independentemente da seleção da agenda. Semanas com marcador de feriado suprimem atribuições e a busca da próxima pessoa pula essas semanas. Uma falha nessa consulta mostra tentativa novamente, preservando as outras seções carregadas. Ausência de atribuições nesse intervalo é informada explicitamente.

A prévia usa dados fictícios e interações locais, sem uma conta e sem gravar registros de negócio. A demonstração anterior `/demo` permanece disponível. Seus testes e capturas verificam os componentes compartilhados; não comprovam autenticação, MFA, RLS, Presence ou persistência das RPCs com uma conta real.

## Verificação da superfície plana atual

- Build Next.js e TypeScript passaram; 29 testes unitários passaram.
- `scripts/dashboard-browser.py` passou sobre a versão de produção em `http://127.0.0.1:3005`, nas larguras 1440px, 1280px e 390px, sem overflow da página, erros JavaScript ou gravações de negócio. Cobertura: pausa/retomada, encerramento, reinício de atividade, jornada ausente, feriado, resumo da escala independente da seleção da agenda, dados vazios e recuperação de erro.
- `scripts/desktop-titlebar-browser.py` passou nos cenários web, instalador legado e Windows com API/IPC simulados. Exercitou controles, arraste e contador de não lidas; a inspeção computada não encontrou bordas visíveis nos elementos renderizados do dashboard.
- Capturas atuais em `.impeccable/review/dashboard-flat/`: `1440.png`, `390.png`, `desktop-titlebar.png` e `focus-1440.png`. A captura desktop da barra usa Windows simulado.
- A rodada anterior da identidade clara em `http://127.0.0.1:3002` e suas oito capturas em `.impeccable/review/dashboard/` são históricas. A verificação anterior do calendário completo (`scripts/calendar-browser.py`, 1440px/390px) cobriu mês, fim de semana, evento à meia-noite e filtro; não constitui nova verificação dessa superfície nesta entrega.

O carregador e detector Impeccable não estão instalados nesta cópia do projeto. A análise usa os arquivos de contexto existentes, as orientações da skill e capturas dos componentes compartilhados; nenhum resultado de detector é alegado.

## Revisão visual e limites

A revisão final independente da superfície plana recebeu veredito **`ship`**, sem achados materiais, restrito às capturas desktop/celular, foco de teclado e barra Windows simulada. O foco funcional permanece visível após remover as bordas decorativas; o contorno branco no timer continua sendo a regra documentada. As interações locais verificadas em produção estão descritas acima.

A correção funcional anterior da fixture de feriado permanece: semanas pausadas não mostram atribuições, e o resumo mantém a próxima data válida.

A versão nativa foi incrementada para **0.1.4**, mas ainda não foi publicada. CI Windows e comprovação dos controles reais, arraste e restauração da moldura no executável permanecem gates de release. O navegador com IPC simulado não comprova esses comportamentos nativos.

A evidência não constitui aprovação integral do produto, auditoria completa de acessibilidade ou validação de autenticação, autorização e integração real. Os fluxos autenticados continuam dependendo de uma conta real.
