# ZULU — Sistema visual

## Autoridade

Referência escolhida pelo usuário: [Team Management Calendar UI Dashboard — Shakuro](https://dribbble.com/shots/24177180-Team-Management-Calendar-UI-Dashboard). Captura: `docs/design-references/calendar-shakuro.png`. O ZULU adapta a composição; não reproduz o dispositivo, fotografia de fundo, dados, logo ou funcionalidades futuras da referência. Esta autoridade permanece nos demais módulos, acesso e demonstração original. Em Hoje e `/demo/dashboard`, a decisão posterior do usuário substitui essa identidade pela superfície clara documentada abaixo.

Modo da superfície: **Operate**. Clareza das tarefas diárias, densidade útil, legibilidade e estados reconhecíveis orientam a interface.

### Marca oficial ZULU

O nome atual do produto é **ZULU**. O SVG oficial fornecido pelo usuário foi preservado integralmente em `public/brand/zulu-source.svg`. O símbolo em `public/brand/zulu-mark.svg` foi extraído desse arquivo, sem redesenhar os caminhos: retângulo preto arredondado com o desenho branco de ULU/sorriso. `public/brand/zulu-wordmark.svg` preserva o lettering como asset disponível.

A preferência explícita do usuário é priorizar o símbolo e reduzir texto nas marcas. Os espaços principais de marca não mostram nome nem tagline adjacentes: sidebar (44px), barra de título (24px), marketing e acesso (40px) e privacidade (30px). O nome acessível continua ZULU. Ícones de PWA e desktop usam o mesmo símbolo oficial; Phosphor continua sendo a biblioteca de ícones funcionais. Essa mudança de marca preserva as paletas e autoridades de cada superfície, incluindo marfim, azul profundo e Inter em Hoje.

Identificadores técnicos de compatibilidade como `app.hub.team`, `Hub` no produto/arquivo de instalação nativo, repositório e chaves de registro/cache/cofre permanecem existentes. A marca visível ZULU não representa uma migração desses identificadores.

### Referência obrigatória de componentes

Por decisão do usuário, novos componentes e componentes retrabalhados devem partir dos componentes e exemplos oficiais **HeroUI v3**, conforme [a skill local obrigatória](.agents/skills/zulu-heroui/SKILL.md) e `AGENTS.md`. Adaptar os tokens à autoridade de cada superfície, preservando teclado, foco e acessibilidade. O catálogo e o guia React v3 oficiais foram consultados; esta orientação não significa migração das telas existentes nem instalação de dependências HeroUI. O efeito Prism escolhido pelo usuário continua sendo a referência especializada do fundo do timer.

### Microinterações e movimento

Por decisão explícita do usuário, microinterações fazem parte de toda interface nova ou retrabalhada: feedback ao pressionar, passar o cursor, selecionar, abrir/fechar e concluir ações, conforme o contexto. Usar interações oficiais HeroUI e movimento breve e consistente, preservando a identidade de cada superfície. Quando faltar uma solução, pesquisar referências reais em HeroUI, Refero, Unlume e outros sites de UI e registrar a origem.

Priorizar transform e opacity, sem deslocar layout ou atrasar ações. Garantir equivalência por teclado e toque e preservar o foco. `prefers-reduced-motion` troca movimento não essencial por feedback estático; animações contínuas não essenciais pausam fora da tela ou com a página oculta. A política detalhada está na skill local `zulu-heroui`. Aplicação progressiva no escopo de cada tarefa.

## Tokens implementados

| Token CSS | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#101112` | Fundo geral |
| `--rail` | `#0c0d0e` | Navegação |
| `--surface` | `#191b1d` | Painéis |
| `--surface-raised` | `#202224` | Elementos internos |
| `--border` | `#2b2d30` | Divisões |
| `--text` | `#f0f0f1` | Texto principal |
| `--muted` | `#a0a2a6` | Texto secundário |
| `--accent` | `#e26540` | Ação principal e timer |
| `--accent-hover` | `#f17a54` | Hover da ação |
| `--radius` | `14px` | Painéis principais |

Fonte: Manrope Variable, instalada por npm e servida localmente. Ícones: Phosphor React, traço regular e preenchimento no módulo ativo. Na demonstração, avatares são identidades por iniciais dos personagens fictícios, com cor fixa por pessoa; não dependem de fotos externas.

## Composição

Os demais módulos mantêm trilho fixo de 76px, barra superior de 72px, conteúdo com margem de 36px e calendário completo com 84px por hora. Acentos de eventos e comportamento móvel da identidade anterior permanecem nessas superfícies.

### Hoje — identidade clara aprovada

A identidade clara substitui Shakuro, Manrope, grafite e laranja exclusivamente em Hoje e `/demo/dashboard`. A autoridade é a escolha explícita do usuário por marfim, texto escuro e azul profundo, seguida pela remoção de todas as bordas decorativas do dashboard. A implementação está escopada a `.dashboard-redesign`; os tokens globais acima continuam normativos para as outras superfícies.

#### Overview

Modo **Operate**. Campos claros organizam a leitura; o bloco do timer com Prism concentra a atenção no trabalho atual. Navegação com rótulos, jornada branca e agenda compacta oferecem uma composição própria para Hoje. Contrato: [Dashboard Hoje](docs/dashboard-redesign.md).

#### Colors

Valores normativos desta superfície, extraídos de `app/dashboard.css`:

| Token local / papel | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#f6f5f1` | Marfim do fundo |
| `--rail` | `#fdfcf9` | Navegação clara |
| `--surface` | `#ffffff` | Jornada, calendário e diálogos |
| `--surface-raised` | `#eef1f7` | Camadas secundárias |
| `--border` | `#e0e3ea` | Token retido; não autoriza bordas decorativas nesta superfície |
| `--text` | `#202b40` | Tinta do texto |
| `--muted`, `--quiet` | `#59667c` | Texto auxiliar |
| `--accent` | `#294d94` | Ações e seleção |
| `--accent-hover` | `#1f3e7b` | Ação em hover |
| Base do timer | `#050505` | Fundo escuro do Prism |
| Cores do Prism | `#050505`, `#66b3ff`, `#ffffff` | Preset original da Spell UI, somente no timer |
| Overlay do timer | `#000000a3` | Mantém contraste do conteúdo sobre a animação |
| Fundo de home office | `#edf0f6` | Faixa de escala |
| `--green` | `#39714f` | Estado positivo |

#### Typography

Inter Variable, instalada por npm e servida localmente, rege a superfície clara. Título de página usa peso 650 e 32px (28px no celular); atividade usa peso 550 e 21px; timer usa peso 400, números tabulares e escala de 40–57px no desktop. Horas e saldos também usam números tabulares. Ícones continuam Phosphor React.

#### Layout

Sidebar expandida com rótulos (224px; 196px até 1200px), topo de 72px e conteúdo com 30px de margem interna, limitado a 1660px. O timer com Prism é horizontal, com atividade à esquerda e dígitos à direita; a jornada branca vem abaixo com horas do dia e saldos da semana e do mês em três colunas. Uma faixa azul clara mostra home office de hoje e próximo. A agenda branca usa 60px por hora, com rolagem interna de até 376px. Contexto lateral de 248px reúne encontros, presença, retomada e conversas.

Até 1200px o contexto segue abaixo em duas colunas. Até 760px a sidebar dá lugar à barra inferior de 68px, o contexto passa a uma coluna, atividade e timer se empilham e a jornada coloca horas do dia acima de dois saldos paralelos. A agenda inicial abre no dia em telas até 520px; a semana continua disponível com rolagem interna.

#### Elevation & Depth

Campos brancos, fundos azulados, espaçamento e tipografia estruturam as camadas sem bordas decorativas. Painéis, navegação, controles, agenda, contexto, popovers e diálogos do dashboard não usam traços de contorno ou divisórias; campos de formulário usam fundo azulado. A seleção da agenda usa preenchimento, sem sombra decorativa; o timer usa o fundo Prism descrito abaixo. Contornos de foco continuam visíveis e funcionais.

#### Shapes

Contêiner principal com cantos de 14px; agenda com 10px; faixa de home office e conversa com 9px; ações com 6–7px. Espaçamento e alinhamento separam os saldos, sem divisórias.

#### Components

Timer com ação branca sobre Prism escurecido e encerramento secundário; jornada com progresso e configuração opcional; resumo de home office com erro, ausência e nova tentativa; calendário compacto com cabeçalho fixo; navegação com rótulos permanentes e estado ativo azul claro. O foco visível recebe contorno azul de 2px, afastado 4px; dentro do timer escuro, o contorno é branco, com as mesmas dimensões. A legenda Eventos usa verde, acompanhando os blocos de evento desta superfície. No Windows compatível, uma barra de título de 36px acompanha o marfim e o azul de Hoje, com símbolo oficial ZULU de 24px, sem nome ou tagline adjacentes, indicador de mensagens não lidas e controles nativos de minimizar, maximizar/restaurar e fechar. A área da marca permite arrastar e o duplo clique alterna maximização; foco permanece visível. Contrato de compatibilidade e entrega: [barra desktop](docs/desktop-updates.md#barra-de-título-windows--014-publicada).

O fundo de `.today-focus` usa o **AnimatedGradient, preset Prism original da Spell UI**, por escolha explícita do usuário. [Source fixado](https://github.com/xxtomm/spell-ui/blob/659b5c2ae405ea9e1c363e09cca7380a0d98e271/registry/spell-ui/animated-gradient.tsx), componente local `components/animated-gradient.tsx`, licença MIT em `docs/licenses/spell-ui-MIT.txt` e `public/licenses/spell-ui-MIT.txt`. Shader e preset foram preservados; a fase inicial avança 3 unidades de tempo do shader para evitar o primeiro quadro preto. O canvas decorativo fica atrás do conteúdo, sem receber interação. O overlay preto limita o fundo mais claro a `#5c5c5c`; o texto secundário `#ccd9f1` mantém contraste superior a 4,5:1. Renderização limitada a 30fps e DPR 1,5, pausada fora da tela ou com documento oculto; movimento reduzido usa quadro estático com redesenho no resize. Sem WebGL2, usa gradiente CSS. Este efeito pertence somente ao timer; a superfície marfim e a regra sem bordas decorativas permanecem.

#### Do's and Don'ts

- **Do** aplicar esta identidade somente ao escopo de Hoje e sua prévia compartilhada.
- **Do** separar grupos por preenchimento, espaço e hierarquia, preservando os contornos de foco.
- **Do** manter rótulos separados para tempo da atividade, total do dia e saldos sobre o previsto até hoje.
- **Don't** herdar o veredito visual da versão escura para esta composição clara.

A revisão independente anterior da superfície plana recebeu **`ship`**, sem achados materiais, nas capturas em `.impeccable/review/dashboard-flat/`. A marca atual e o Prism têm novas capturas em `.impeccable/review/zulu-prism/`, com barra desktop em `.impeccable/review/zulu-final/desktop-titlebar.png`; a revisão visual final do Prism recebeu **`ship`**, sem achados materiais. `scripts/prism-browser.py` passou com WebGL2 real em 1440px/390px, animação, movimento reduzido, fallback, contexto único estável e controles funcionais, sem overflow ou erros de página. Cenários de dashboard e barra simulada também passaram. A versão Windows 0.1.4 foi publicada com assinatura de atualização verificada e smoke nativo aprovado; arraste, fechar, recuperação e atualização real 0.1.3 → 0.1.4 têm limites descritos no contrato desktop. A evidência não comprova acessibilidade completa nem integração autenticada.

## Interações e limites

- Timer mostra números tabulares e permanece ativo ao trocar de módulo. Em **Minhas horas**, a pausa de almoço encerra o trecho atual, mantém a atividade para retomada e não inclui a pausa no saldo.
- Em Hoje, tempo da atividade e total registrado no dia têm rótulos próprios; pausa para almoço e retomada exigem ação manual. A jornada compara os saldos da semana e do mês com o previsto até hoje, mantendo a meta completa do mês em uma ação secundária. Sem configuração, mostra horas registradas e acesso a **Configurar minha jornada**. A configuração de dias/horas é opcional durante a entrada no time e pode ser editada em **Minhas horas**.
- O resumo de home office em Hoje mostra hoje e a próxima data com atribuições. A consulta permanece ancorada na semana atual até 42 dias após hoje, independente da seleção da agenda; semanas pausadas por feriado não apresentam atribuições. Erro e ausência de atribuições têm mensagens próprias e opção de tentar novamente quando a consulta falha.
- Diálogos nativos oferecem foco modal e Escape; foco de teclado recebe contorno pêssego.
- Busca acessível por botão e Ctrl/Cmd+K.
- Campos, filtros, estados selecionados, mensagens, confirmações e avisos seguem a mesma linguagem.
- Calendário apresenta atribuições e pausas de home office junto aos eventos; a escala, os feriados e as trocas ficam no diálogo **Escala**. [Comportamento e papéis](docs/home-office-schedule.md).
- Redução de movimento desliga transições e animação de carregamento.
- A demonstração `/demo` declara seus dados fictícios. A rota principal usa dados do Supabase e Presence privado; esses sinais continuam sendo informativos, sem efeito sobre permissões.

## Evidência

Capturas desktop e celular em `.impeccable/review/`. Compilação da entrega anterior registrada em `docs/frontend-delivery.md`. A identidade clara de Hoje recebeu veredito próprio `ship`, restrito à revisão visual da prévia pública e ao fechamento do achado de foco. O contorno branco foi confirmado na captura final `focus-1440.png` e no CSS, com contraste de 10,15:1. Oito capturas finais em `.impeccable/review/dashboard/`, sem indicador de desenvolvimento, preservam a composição e a legenda corrigida. A compilação e os cenários de navegador passaram na versão de produção em `http://127.0.0.1:3002`. Estado dos testes e capturas da versão atual: [Dashboard Hoje](docs/dashboard-redesign.md). A inspeção visual não constitui auditoria completa de acessibilidade nem validação de autenticação ou integração real com Supabase.

## Acesso e integração

Login, cadastro e recuperação herdam o grafite e o acento quente. Desktop divide contexto do produto e formulário; celular prioriza marca e tarefa. Formulários usam nomes acessíveis, campos confortáveis e estados de erro/sucesso. MFA usa QR/chave vindos do Auth, sem ilustração ou segredo fictício.

O app integrado mantém a composição da demonstração e substitui dados de exemplo por estados vazios e conteúdo autorizado pelo RLS. Eventos reais usam azul para reunião e laranja para evento; colisões de horário usam faixas separadas. PWA usa ícones PNG derivados do símbolo oficial ZULU fornecido pelo usuário.

Capturas anônimas de acesso estão em `.impeccable/review/auth/`. Telas autenticadas/MFA dependem de uma conta real para inspeção; não foram simuladas para produzir evidência de integração.

A revisão visual final de acesso teve veredito `ship` restrito ao login desktop/celular, cadastro desktop, pedido de recuperação desktop e ícone de 512px. Não inclui redefinição de senha por link, MFA, onboarding ou telas privadas; também não comprova autenticação ponta a ponta ou instalação PWA em dispositivos.

## Site público — autoridade independente

Esta seção rege exclusivamente `/site`, `/download` e seus assets em `public/marketing/`. O usuário delegou a escolha de uma identidade própria para o site. A autoridade do aplicativo descrita acima continua restrita ao app, à demonstração e ao acesso. Implementação: `app/marketing.css`, `components/marketing.tsx`; contexto e referências: [pesquisa do site](docs/marketing-research.md). Os tokens desta superfície ficam no objeto `marketing` de `.impeccable/design.json`, separado dos tokens do app.

### Overview

Modo **Persuade**. **Creative North Star: "Trabalho em sintonia".** Títulos amplos, alinhamento editorial e campos de cor apresentam o trabalho compartilhado com energia e clareza. Capturas reais da demonstração fazem a ponte entre a identidade pública e a interface escura do produto.

Características: hierarquia tipográfica expressiva, espaços generosos, contraste entre azul e verde vivo e demonstrações identificadas como fictícias. A composição inicial da landing é uma expressão desta superfície, não uma regra para futuras telas do aplicativo.

### Colors

Azul elétrico é a cor principal dos grandes campos e dos estados selecionados. Verde vivo destaca ações dentro desses campos e a seção de colaboração. Tinta sustenta textos e botões sobre superfícies claras; papel acolhe capturas, alternativas de plataforma e a faixa web. Branco é o fundo base; cinza secundário e linha suave organizam texto auxiliar e divisões.

**A regra do escopo.** Use as variáveis prefixadas de marketing dentro da superfície pública; não substitua as variáveis globais do aplicativo por esta paleta.

### Typography

Manrope Variable, servida localmente, é usada em toda a superfície; os ícones são Phosphor React. O hero usa peso 650, entrelinha 1,03 e espaçamento de letras −0,04em. No desktop, sua escala vai de 64 a 96px; no celular, de 58 a 84px. Títulos de seção usam peso 650 e entrelinha 1,12, com 36 a 55px. O texto base usa 15px e entrelinha 1,6; textos de apoio variam conforme o contexto. O timer usa números tabulares.

### Layout

Container central de até 1280px, com espaço lateral total de 96px no desktop, 64px até 1100px e 40px até 760px. A navegação mede 96px de altura no desktop e 78px no celular. Blocos de conteúdo alternam fundo branco e grandes áreas de cor; a vitrine combina uma coluna de navegação com a captura do produto. Até 760px, o conteúdo se organiza em sequência, as abas formam duas colunas e a navegação oferece menu móvel. A página de downloads apresenta Windows em destaque e alternativas de plataforma ao lado no desktop, empilhadas no celular.

### Elevation & Depth

Não há sombras. A profundidade vem de fundos contrastantes, molduras e capturas do produto. A moldura do hero tem leve rotação no desktop; a vitrine de recursos mantém suas telas retas e legíveis. Hovers de botão duram 180ms e sobem 2px. Movimento reduzido remove transições, animações e essa translação.

### Shapes

Botões têm cantos discretos (7px); molduras e painéis principais usam cantos de 12 ou 14px. Telas internas usam 6px. Círculos ficam reservados a controles de reprodução, marca de estado e pequenos símbolos. Divisões finas estruturam abas, perguntas e informações de versão.

### Components

- **Ações:** botão de tinta sobre claro, verde vivo sobre azul e variante com contorno para acesso web. Base de 52px de altura mínima, preenchimento de 14px por 23px e peso 750; o CTA da navegação fica mais compacto no celular. Foco visível usa contorno de 3px, afastado 5px; nos grandes campos escuros ou azuis, recebe verde vivo.
- **Navegação:** símbolo oficial ZULU sem nome ou tagline adjacentes, links de seção, entrada no ZULU e download. O menu móvel revela os mesmos destinos; o link de pular conteúdo aparece ao receber foco.
- **Vitrine por abas:** quatro telas da demonstração, com título, descrição e link de exploração. Seleção azul com seta; teclado usa setas para cima/baixo, Home e End. Capturas WebP locais mantêm legenda de dados fictícios.
- **Timer demonstrativo:** painel claro, números tabulares e controle circular azul para iniciar/encerrar. Funciona somente na página e avisa que nenhuma hora é registrada.
- **FAQ e integridade:** elementos nativos `details`/`summary`, linhas divisórias e ícone de expansão. O bloco de integridade permite copiar SHA-256 e apresenta retorno de sucesso ou falha.
- **Downloads:** painel Windows azul com ação verde vivo; alternativas em papel. Informações de versão, compatibilidade, arquivo e limitações ficam próximas da ação. Esses dados pertencem à distribuição, não aos tokens visuais.

### Do's and Don'ts

- **Do** manter a identidade pública independente e apresentar capturas do produto como evidência visual do app.
- **Do** identificar os dados de demonstração e preservar os retornos de teclado, foco e movimento reduzido.
- **Do** sustentar a persuasão com recursos e distribuição comprovados na implementação.
- **Don't** transportar a paleta pública para telas do app sem uma decisão própria sobre aquela superfície.
- **Don't** adicionar logos de clientes, depoimentos ou métricas de produtividade sem evidência fornecida.

Revisão visual final: `ship` restrito às quatro capturas de `/site` e `/download`, em 1440px e 390px, em `.impeccable/review/marketing/`. A revisão visual não comprova fluxos autenticados, instalação desktop, acessibilidade completa ou integrações reais.
