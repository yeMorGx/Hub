# Dashboard Hoje

> A composição atual usa HeroUI v3 e Bento Grid: ver [contrato atual](dashboard-bento.md). As medidas e revisões da composição anterior neste documento são históricas.

Produto atual: **ZULU**. Modo: **Operate**. O usuário aprovou explicitamente uma nova identidade clara para Hoje: marfim, superfícies brancas, tinta escura, azul profundo e Inter Variable. A escolha substitui a identidade Shakuro/Manrope/grafite/laranja somente em Hoje e `/demo/dashboard`, no escopo `.dashboard-redesign`. Os demais módulos, `/demo` original e o site público mantêm suas autoridades. A decisão posterior remove todas as bordas decorativas do dashboard, preservando marfim, azul profundo e Inter. Os valores normativos desta superfície estão em [DESIGN.md](../DESIGN.md#hoje--identidade-clara-aprovada).

## Composição aprovada

Sidebar expandida de 224px com rótulos, reduzida a 196px até 1200px. O timer ocupa um campo horizontal com o preset Prism no topo, com atividade à esquerda e dígitos à direita. A jornada branca vem abaixo, com horas do dia e saldos da semana e do mês em colunas. Tempo da atividade e total do dia têm rótulos próprios; almoço pausa somente por ação da pessoa, com retomada manual. Os saldos usam o previsto até hoje, com configuração disponível quando falta uma jornada.

Uma faixa azul clara mostra home office de hoje e a próxima data com atribuições. A agenda branca usa 60px por hora e rolagem interna de até 376px; o calendário completo mantém 84px por hora. Compromissos restantes de hoje, presença, retomada de atividades e conversas ocupam a lateral de 248px. Até 1200px, o contexto segue abaixo em duas colunas. Até 760px, a navegação vira barra inferior, o contexto passa a uma coluna, o timer se empilha e os dois saldos ficam lado a lado abaixo das horas do dia. Até 520px, a agenda inicial abre no dia; a semana continua disponível.

## Superfície plana e barra desktop

A separação visual usa campos brancos e azulados, espaço e hierarquia tipográfica. Painéis, navegação, ações, saldos, agenda e suas grades/eventos, contexto, popovers e diálogos de Hoje ficam sem bordas decorativas ou divisórias. Campos de formulário usam preenchimento azulado; a seleção da agenda não usa sombra decorativa. Os raios existentes permanecem. O token local `--border` continua declarado, mas não autoriza traços nesta superfície. Esta decisão está restrita a `.dashboard-redesign`.

Contornos de foco são funcionais: azul de 2px com afastamento de 4px; dentro do timer, branco nas mesmas dimensões. A captura `focus-1440.png` registra o foco após a remoção das bordas.

A marca principal da sidebar usa o símbolo oficial ZULU de 44px, sem nome ou tagline adjacentes, conforme a preferência do usuário por ícones. O SVG original está preservado em `public/brand/zulu-source.svg`; `public/brand/zulu-mark.svg` reutiliza o símbolo extraído sem redesenho. O lettering permanece disponível como asset, sem aparecer nesses espaços principais.

No Windows compatível, a barra de título de 36px mostra o símbolo ZULU de 24px, sem nome ou tagline adjacentes, e o contador de mensagens não lidas derivado do título. Usa marfim e azul em Hoje. Botões acessíveis invocam minimizar, maximizar/restaurar e fechar; a área da marca arrasta a janela e o duplo clique alterna a maximização. A barra usa o comando Rust restrito `desktop_titlebar`, com ações fixas somente na própria janela principal. Web, plataformas não Windows e instaladores antigos mantêm a moldura nativa; erros tentam restaurá-la e a navegação começa com as decorações nativas. [Contrato e estado da entrega](desktop-updates.md#barra-de-título-windows--014-publicada).

## Prism e referência de componentes

Por escolha explícita do usuário, somente o timer `.today-focus` usa o **AnimatedGradient original da Spell UI, preset Prism**. [Source fixado](https://github.com/xxtomm/spell-ui/blob/659b5c2ae405ea9e1c363e09cca7380a0d98e271/registry/spell-ui/animated-gradient.tsx); componente local `components/animated-gradient.tsx`; licença MIT preservada em [docs/licenses/spell-ui-MIT.txt](licenses/spell-ui-MIT.txt) e `public/licenses/spell-ui-MIT.txt`. O shader e os parâmetros do preset permanecem originais, com preto `#050505`, azul `#66b3ff` e branco. A fase inicial avança 3 unidades de tempo do shader para evitar o quadro inicial preto.

Um overlay `#000000a3` mantém o fundo mais claro em `#5c5c5c`, com texto branco e secundário `#ccd9f1` acima de 4,5:1. O efeito decorativo fica atrás dos controles e não intercepta interações. Limites de 30fps/DPR 1,5, pausa fora da tela ou com documento oculto, quadro estático com movimento reduzido e redesenho ao redimensionar reduzem trabalho desnecessário. Sem WebGL2, permanece um gradiente CSS. Marfim, azul profundo, Inter, símbolo prioritário e ausência de bordas decorativas continuam regendo o restante do dashboard.

HeroUI v3 passa a ser referência obrigatória para novos componentes e componentes retrabalhados, conforme [skill local](../.agents/skills/zulu-heroui/SKILL.md) e `AGENTS.md`. O catálogo oficial e o guia React v3 foram consultados. Isso não declara migração das telas existentes nem instalação de dependências HeroUI; o Prism especializado escolhido pelo usuário permanece.

Nenhuma imagem foi acrescentada à faixa de home office; a escolha do usuário continua pendente. Área medida: 880×90px em viewport de 1440px; 800×90px em 1360px; 354×175px em 390px.

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
- Capturas históricas da superfície plana em `.impeccable/review/dashboard-flat/`: `1440.png`, `390.png`, `desktop-titlebar.png` e `focus-1440.png`. A captura desktop da barra usa Windows simulado.
- A rodada anterior da identidade clara em `http://127.0.0.1:3002` e suas oito capturas em `.impeccable/review/dashboard/` são históricas. A verificação anterior do calendário completo (`scripts/calendar-browser.py`, 1440px/390px) cobriu mês, fim de semana, evento à meia-noite e filtro; não constitui nova verificação dessa superfície nesta entrega.

- `scripts/prism-browser.py` passou em 1440px/390px com WebGL2 real: animação, movimento reduzido e fallback sem WebGL2; um contexto estável, controles funcionais, sem overflow ou erros de página. Dashboard e barra com IPC simulado também passaram. Capturas atuais em `.impeccable/review/zulu-prism/`; barra em `.impeccable/review/zulu-final/desktop-titlebar.png`.

O carregador e detector Impeccable não estão instalados nesta cópia do projeto. A análise usa os arquivos de contexto existentes, as orientações da skill e capturas dos componentes compartilhados; nenhum resultado de detector é alegado.

## Revisão visual e limites

A revisão independente anterior da superfície plana recebeu veredito **`ship`**, sem achados materiais, restrito às capturas desktop/celular, foco de teclado e barra Windows simulada. O foco funcional permanece visível após remover as bordas decorativas; o contorno branco no timer continua sendo a regra documentada. As interações locais verificadas em produção estão descritas acima.

A revisão visual independente final do Prism recebeu **`ship`**, sem achados materiais, nas oito capturas atuais. O achado anterior sobre a imagem antiga da landing foi fechado com as capturas do dashboard ZULU atual.

A correção funcional anterior da fixture de feriado permanece: semanas pausadas não mostram atribuições, e o resumo mantém a próxima data válida.

A versão Windows **0.1.4 foi publicada**, com assinatura de atualização verificada. O build `39645508848` compilou/assinou e falhou em um teste de UI por corrida; o reteste `39648289490` passou todos os checks nativos e criptográficos sobre o mesmo conteúdo nativo, árvore `54aa364ba68e354496fdfe5d056adcc100486154`. Promoção `39648700277` concluída. O smoke valida a barra personalizada, minimizar e maximizar/restaurar. Arraste, fechar e recuperação têm evidência de navegador/código; atualização real 0.1.3 → 0.1.4 permanece sem validação. Authenticode continua `NotSigned`. Metadados web publicados no deployment `dpl_6mikFxBKWd3Q7eAnL6T3wJBz5i4R`, READY; 32 checks HTTP de produção passaram. Os dois endpoints anunciaram 0.1.4, com assinatura e hash públicos conferidos. [Release e proveniência](desktop-updates.md#barra-de-título-windows--014-publicada).

A evidência não constitui aprovação integral do produto, auditoria completa de acessibilidade ou validação de autenticação, autorização e integração real. Os fluxos autenticados continuam dependendo de uma conta real.
