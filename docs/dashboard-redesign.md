# Dashboard Hoje

Modo: **Operate**. O usuário aprovou explicitamente uma nova identidade clara para Hoje: marfim, superfícies brancas, tinta escura, azul profundo e Inter Variable. A escolha substitui a identidade Shakuro/Manrope/grafite/laranja somente em Hoje e `/demo/dashboard`, no escopo `.dashboard-redesign`. Os demais módulos, `/demo` original e o site público mantêm suas autoridades. Os valores normativos desta superfície estão em [DESIGN.md](../DESIGN.md#hoje--identidade-clara-aprovada).

## Composição aprovada

Sidebar expandida de 224px com rótulos, reduzida a 196px até 1200px. O timer ocupa um campo azul horizontal no topo, com atividade à esquerda e dígitos à direita. A jornada branca vem abaixo, com horas do dia e saldos da semana e do mês em colunas. Tempo da atividade e total do dia têm rótulos próprios; almoço pausa somente por ação da pessoa, com retomada manual. Os saldos usam o previsto até hoje, com configuração disponível quando falta uma jornada.

Uma faixa azul clara mostra home office de hoje e a próxima data com atribuições. A agenda branca usa 60px por hora e rolagem interna de até 376px; o calendário completo mantém 84px por hora. Compromissos restantes de hoje, presença, retomada de atividades e conversas ocupam a lateral de 248px. Até 1200px, o contexto segue abaixo em duas colunas. Até 760px, a navegação vira barra inferior, o contexto passa a uma coluna, o timer se empilha e os dois saldos ficam lado a lado abaixo das horas do dia. Até 520px, a agenda inicial abre no dia; a semana continua disponível.

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

## Verificação da identidade clara

- `npm run test:unit`: 25 testes passaram; as regras de negócio não foram alteradas pela troca de identidade.
- TypeScript passou antes do último ajuste de CSS.
- Rodada final de `HUB_APP_URL=http://127.0.0.1:3002 python scripts/dashboard-browser.py`, sobre a versão de produção, passou em 1440px, 1280px e 390px, sem overflow da página, erros JavaScript ou gravações de negócio. Cobertura: pausa/retomada, encerramento, reinício de atividade, jornada ausente, feriado, resumo da escala independente da seleção da agenda, dados vazios e recuperação de erro.
- `npm run build`: compilação final da versão clara passou; a versão de produção foi servida em `http://127.0.0.1:3002` para a verificação final.
- Inspeção adicional em 320px, 760px, 900px e 1100px: sem overflow; fonte Inter e fundo marfim confirmados por estilo computado. Diálogo da prévia com superfície branca e texto escuro; Escape fecha corretamente. Navegação móvel: Hoje, Calendário, Tarefas, Conversas e Mais.
- Oito capturas finais de produção em `.impeccable/review/dashboard/`, sem indicador de desenvolvimento: `1440.png`, `1280.png`, `390.png`, `lunch-1440.png`, `unconfigured-390.png`, `holiday-1440.png`, `empty-390.png` e `focus-1440.png`.
- A verificação anterior do calendário completo (`scripts/calendar-browser.py`, 1440px/390px) cobriu mês, fim de semana, evento à meia-noite e filtro; esse resultado não substitui a revisão visual da identidade clara.

O carregador e detector Impeccable não estão instalados nesta cópia do projeto. A análise usa os arquivos de contexto existentes, as orientações da skill e capturas dos componentes compartilhados.

## Revisão visual e limites

A identidade clara recebeu veredito próprio **`ship`**, restrito à revisão visual da prévia pública e ao fechamento do achado de foco. O único achado material foi resolvido: o foco dentro do timer usa contorno branco de 2px, afastado 4px, confirmado em `focus-1440.png` e em `app/dashboard.css:352`, com contraste de 10,15:1. As telas finais de 1440px e 390px preservam a composição, apresentam legenda Eventos verde coerente com os blocos e não exibem indicador de desenvolvimento. As interações locais verificadas em produção estão descritas acima.

Este veredito pertence à identidade clara. A correção funcional anterior da fixture de feriado permanece: semanas pausadas não mostram atribuições, e o resumo mantém a próxima data válida.

A evidência não constitui aprovação integral do produto, auditoria completa de acessibilidade ou validação de autenticação, autorização e integração real. Os fluxos autenticados continuam dependendo de uma conta real.
