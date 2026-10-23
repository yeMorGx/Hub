# ZULU — Sistema visual

## Autoridade

Referência escolhida pelo usuário: [Team Management Calendar UI Dashboard — Shakuro](https://dribbble.com/shots/24177180-Team-Management-Calendar-UI-Dashboard). Captura: `docs/design-references/calendar-shakuro.png`. O ZULU adapta a composição; não reproduz o dispositivo, fotografia de fundo, dados, logo ou funcionalidades futuras da referência. Em Hoje, o usuário escolheu marfim, texto escuro, azul profundo, Inter e superfície plana. Em 22/10/2026, estendeu essa identidade a todas as páginas do aplicativo e aos fluxos de acesso; Shakuro passa a ser somente referência histórica. `/site` e `/download` mantêm a identidade pública independente.

Modo da superfície: **Operate**. Clareza das tarefas diárias, densidade útil, legibilidade e estados reconhecíveis orientam a interface.

### Marca oficial ZULU

O nome atual do produto é **ZULU**. O SVG oficial fornecido pelo usuário foi preservado integralmente em `public/brand/zulu-source.svg`. O símbolo em `public/brand/zulu-mark.svg` foi extraído desse arquivo, sem redesenhar os caminhos: retângulo preto arredondado com o desenho branco de ULU/sorriso. `public/brand/zulu-wordmark.svg` preserva o lettering como asset disponível.

A preferência explícita do usuário é priorizar o símbolo e reduzir texto nas marcas. Os espaços principais de marca não mostram nome nem tagline adjacentes: sidebar (44px), barra de título (24px), marketing e acesso (40px) e privacidade (30px). O nome acessível continua ZULU. Ícones de PWA e desktop usam o mesmo símbolo oficial; Animate UI Hugeicons aparece na navegação do app e Phosphor continua no conteúdo. A paleta do app usa marfim, texto escuro, azul profundo e Inter em todos os módulos.

Identificadores técnicos de compatibilidade como `app.hub.team`, `Hub` no produto/arquivo de instalação nativo, repositório e chaves de registro/cache/cofre permanecem existentes. A marca visível ZULU não representa uma migração desses identificadores.

### Referência obrigatória de componentes

Por decisão do usuário, novos componentes e componentes retrabalhados devem partir dos componentes e exemplos oficiais **HeroUI v3**, conforme [a skill local obrigatória](.agents/skills/zulu-heroui/SKILL.md) e `AGENTS.md`. Adaptar os tokens à identidade comum do app, preservando teclado, foco e acessibilidade. O catálogo e o guia React v3 oficiais foram consultados. HeroUI React e Styles 3.2.6 estão instalados; Hoje, seus diálogos e os tooltips da navegação usam os componentes oficiais. Os adaptadores dos módulos existentes ainda migram progressivamente. O efeito Prism escolhido pelo usuário continua sendo a referência especializada do fundo do timer.

### Microinterações e movimento

Por decisão explícita do usuário, microinterações fazem parte de toda interface nova ou retrabalhada: feedback ao pressionar, passar o cursor, selecionar, abrir/fechar e concluir ações, conforme o contexto. Usar interações oficiais HeroUI e movimento breve e consistente, preservando a identidade de cada superfície. Quando faltar uma solução, pesquisar referências reais em HeroUI, Refero, Unlume e outros sites de UI e registrar a origem.

Priorizar transform e opacity, sem deslocar layout ou atrasar ações. Garantir equivalência por teclado e toque e preservar o foco. `prefers-reduced-motion` troca movimento não essencial por feedback estático; animações contínuas não essenciais pausam fora da tela ou com a página oculta. A política detalhada está na skill local `zulu-heroui`. Aplicação progressiva no escopo de cada tarefa.

### Hoje — Bento Grid com HeroUI

A decisão posterior do usuário adota **Bento Grid** em Hoje e `/demo/dashboard`, com HeroUI v3 real e fotografia doméstica no fundo do card de home office. Esta seção e [o contrato Bento](docs/dashboard-bento.md) substituem a composição anterior de timer/jornada unidos e escala em faixa. Marfim, azul profundo, Inter e ausência de bordas/sombras permanecem. Em desktop, timer e jornada ocupam oito colunas e os blocos de escala/encontros/time ocupam quatro; agenda grande à esquerda e contexto segmentado à direita. Até 1200px são oito colunas reorganizadas; até 760px, uma coluna. Gap de 18px/14px, cards de 14px e agenda com até 460px de rolagem. A imagem local `public/dashboard/home-office.webp` tem overlay para legibilidade e hover discreto, sem movimento com redução habilitada.

`app/dashboard-bento.css` complementa `app/dashboard.css` e define os tokens claros dos portais HeroUI. `components/dashboard-ui.tsx` mantém os contratos de formulário e limita a migração à tela Hoje e seus diálogos. O seletor de visualização é um radiogroup oficial, o filtro usa Dropdown e o seletor de data usa Calendar. A grade de eventos continua específica do produto. Os vereditos e medidas da composição anterior abaixo são históricos; a evidência desta entrega está em `.impeccable/review/zulu-bento/`.

### Navegação do aplicativo

A sidebar flutuante compacta aparece em todas as páginas do app: 80px de largura, 12px das bordas, raio de 22px, sem borda ou sombra. Rótulos aparecem em tooltips HeroUI por hover e foco. A partir de 760px, a navegação vira dock inferior flutuante de 62px com raio de 20px. Barra de título nativa preserva a área superior do Windows. Os ícones da sidebar usam source oficial **Animate UI Hugeicons** com hover/foco e redução de movimento; Phosphor permanece no conteúdo. O rodapé promocional/MFA da sidebar foi removido.

Escolher atividade abre formulário HeroUI no próprio card do timer, com descrição, projeto e sugestões reais de tarefas/atividades recentes. A jornada apresenta duração e legenda explícita (a mais/a compensar), horas feitas e previstas, e informa que a meta inclui hoje. Em Por aqui agora, o próprio usuário aparece primeiro, com atividade/pausa atual; colegas compartilham atividade pela Presence privada do time. Prévias de DMs próprias não lidas abrem a conversa e não marcam leitura por exibição. Contrato: [fluxo diário](docs/dashboard-workflow.md).

### Desktop — title bar e cápsula

A title bar no Windows passa a 48px e recebe o mesmo cabeçalho de workspace/time, ações e perfil por portal. O avatar sai da sidebar e o status de conexão redundante é removido; no navegador, o cabeçalho continua acessível. A atividade das pessoas é apenas texto, sem play, e a presença desconhecida não mostra rótulo indisponível.

O seletor de atividade recebe **liquid glass** por escolha explícita do usuário: translucidez e blur sobre Prism/Lava, texto claro, campos escuros e foco legível. Essa escolha substitui o branco sólido somente nesse seletor. O mini timer nativo usa cápsula totalmente arredondada (raio 999px), sem borda/sombra, com o mesmo fundo original e controles HeroUI compactos. Detalhes funcionais em [desktop runtime](docs/desktop-runtime.md).

## Workspace de 23/10/2026 — autoridade atual

O pacote aprovado em [zulu-workspace-plan.md](docs/zulu-workspace-plan.md) é a autoridade mais recente para o shell autenticado e sua demonstração. Esta seção substitui as descrições históricas abaixo quando conflitarem: sidebar flutuante com inset, dock inferior mobile, logo na titlebar, card Sua jornada em Hoje e mini timer de tamanho único. Os registros anteriores de revisão e release continuam como histórico, sem validar automaticamente este pacote. A identidade pública de `/site` e `/download` mantém sua autoridade independente.

### Estrutura e navegação

A rail fixa de 80px permanece compacta, com ícones e tooltips HeroUI no hover/foco. Ela e o header formam uma moldura L contínua, sem divisória, borda ou sombra decorativa. O conteúdo encaixa na moldura: canto interno superior esquerdo invertido por pseudo-elemento de 26px, outros cantos de 24px. Header web de 64px e titlebar nativa de 48px. Até 760px, um drawer oficial HeroUI substitui a rail; o header tem 60px, o canto invertido desaparece e o conteúdo usa raio de 16px.

| Área | Destinos |
| --- | --- |
| Hoje | Visão diária |
| Trabalho | Tarefas, Horas, Relatórios, Documentos, Metas, Clientes |
| Conversas | Mensagens (canais e DMs), Chamadas, Notificações |
| Agenda | Calendário e home office, Plantões, Ausências, Datas do time, Pautas e atas |
| Equipe | Pessoas, Check-ins |
| Configurações | Preferências e Integrações; Conta, Preferências, Desktop e Organização conforme permissões |

O header/titlebar contém seletor de time, busca, notificações e perfil, além dos controles nativos no desktop. Não inclui logo, breadcrumb ou ações redundantes. Atualização aparece somente quando disponível. O seletor HeroUI mostra check da seleção, nome de time e organização hierarquizados e criação separada. Trocar time volta a Hoje e limpa busca, canal, evento, rascunho, projeto e seleção anterior. Sair fica no perfil/conta. Configurações reúne conta e segurança, tema claro/escuro, notificações/offline/PWA, opções desktop e organização para administrador.

### Hoje e mini timer

Hoje preserva Bento Grid, timer original Prism/Lava e fotografia de home office. **Sua jornada foi removida de Hoje**; saldos e metas de horas ficam em Trabalho > Horas. A saudação aplica Signature original da Spell somente ao primeiro nome, uma vez por usuário na sessão da aba/abertura: navegação e reload não repetem a animação; movimento reduzido mantém apresentação estática. Pessoas ativas mostram atividade e projeto como texto; badge numérico de DMs não lidas abre a conversa da pessoa.

O mini é uma cápsula arredondada sobre janela transparente, sem retângulo externo. Modo compacto de 244×64: tempo e almoço, com ação de expandir. Modo expandido de 392×88: atividade, projeto e encerrar, além dos controles de recolher/ocultar. O protocolo redimensiona a janela nativa; o recorte vertical encontrado na revisão foi corrigido permitindo altura automática e impedindo compressão das linhas. A prova de transparência e redimensionamento reais no Windows depende do CI/smoke nativo da versão 0.1.6.

### Tokens e dados privados

A identidade Inter/marfim/azul permanece. Neste shell, os overrides atuais são `--frame: #eeede8` e `--workspace-content: #f8f9fc`; no escuro, frame `#171b24`, conteúdo/fundo `#10151e`, superfície `#1c2431`, campos `#273245`, texto `#e9edf7`, secundário `#aab8d0` e destaque `#9dbaff`. Foco visível, teclado/toque e movimento reduzido continuam obrigatórios. Fonte de implementação: `app/workspace-inset.css`.

Relatórios PDF não incluem valores monetários. Incluem período, identificação, pessoas, horas por projeto/atividade, gráficos, detalhes e paginação. Administrador do workspace pode exportar o time separado por pessoa; líder e membro consultam somente registros próprios. MFA, acesso ao time e autorização são impostos pelas RPCs SQL, além da interface.

Avatares usam bucket privado `zulu-avatars`, recorte central WebP e URLs assinadas de cinco minutos, renovadas em foco/visibilidade e periodicamente. Leitura exige MFA e vínculo ativo com o workspace do perfil (ou o próprio perfil); upload e exclusão pertencem ao dono. Imagens de chat usam Storage privado, visualização e download limitados a membros do canal/DM. Cópias baixadas não têm revogação prometida.

Evidência e limites desta entrega: [zulu-workspace-delivery.md](docs/zulu-workspace-delivery.md). Contagens anteriores de testes e revisões abaixo são históricas.

## Tokens implementados

| Token CSS | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#f6f5f1` | Fundo do aplicativo |
| `--rail` | `#fdfcf9` | Navegação flutuante |
| `--surface` | `#ffffff` | Superfícies de conteúdo |
| `--surface-raised` | `#eef1f7` | Campos e camadas secundárias |
| `--border` | `#e0e3ea` | Valor sem uso decorativo; manter foco funcional |
| `--text` | `#202b40` | Texto principal |
| `--muted` | `#59667c` | Texto secundário |
| `--accent` | `#294d94` | Ação principal e seleção |
| `--accent-hover` | `#1f3e7b` | Hover da ação |
| `--radius` | `14px` | Painéis principais |

Fonte: Inter Variable, instalada por npm e servida localmente. Ícones: Animate UI Hugeicons na navegação e Phosphor React no conteúdo. Na demonstração, avatares são identidades por iniciais dos personagens fictícios, com cor fixa por pessoa; não dependem de fotos externas.

## Composição

Os módulos seguem a identidade clara, a barra superior de 72px e os tokens comuns. A navegação compacta reserva 104px no desktop. Calendário, conversas, horas, pessoas, tarefas, colaboração, gestão, chamadas, integrações e acesso preservam informação e fluxos. Ver [sistema visual das páginas do app](docs/app-design-system.md).

### Identidade clara do aplicativo

A identidade clara substitui Shakuro, Manrope, grafite e laranja em todas as páginas do aplicativo e nos fluxos de acesso. A autoridade é a escolha explícita do usuário por marfim, texto escuro e azul profundo, seguida pela remoção das bordas decorativas. `.live-app:not(.dashboard-redesign)` aplica o acabamento compartilhado às telas secundárias; `.dashboard-redesign` mantém a composição Bento aprovada de Hoje e a sidebar permanece compacta conforme pedido anterior. O site público mantém sua paleta própria.

#### Overview

Modo **Operate**. Campos claros organizam a leitura; o bloco do timer com Prism concentra a atenção no trabalho atual. Navegação compacta, jornada branca e agenda compacta oferecem uma composição própria para Hoje. Contrato: [Dashboard Hoje](docs/dashboard-redesign.md).

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

Inter Variable, instalada por npm e servida localmente, rege todas as páginas do app. Título de página usa peso 650 e 32px (28px no celular); atividade usa peso 550 e 21px; timer usa peso 400, números tabulares e escala de 40–57px no desktop. Horas e saldos também usam números tabulares. Ícones da navegação usam Animate UI Hugeicons; o conteúdo usa Phosphor React.

#### Layout

Sidebar compacta de 80px, topo de 72px e conteúdo com 30px de margem interna, limitado a 1660px. O timer com Prism é horizontal, com atividade à esquerda e dígitos à direita; a jornada branca vem abaixo com horas do dia e saldos da semana e do mês em três colunas. Uma faixa fotográfica mostra home office de hoje e próximo. A agenda branca usa 60px por hora, com rolagem interna de até 376px. Contexto lateral de 248px reúne encontros, presença, retomada e conversas.

Até 1200px o contexto segue abaixo em duas colunas. Até 760px a sidebar dá lugar ao dock inferior flutuante de 62px, o contexto passa a uma coluna, atividade e timer se empilham e a jornada coloca horas do dia acima de dois saldos paralelos. A agenda inicial abre no dia em telas até 520px; a semana continua disponível com rolagem interna.

#### Elevation & Depth

Campos brancos, fundos azulados, espaçamento e tipografia estruturam as camadas sem bordas decorativas. Painéis, navegação, controles, agenda, contexto, popovers e diálogos do dashboard não usam traços de contorno ou divisórias; campos de formulário usam fundo azulado. A seleção da agenda usa preenchimento, sem sombra decorativa; o timer usa o fundo Prism descrito abaixo. Contornos de foco continuam visíveis e funcionais.

#### Shapes

Contêiner principal com cantos de 14px; agenda com 10px; faixa de home office e conversa com 9px; ações com 6–7px. Espaçamento e alinhamento separam os saldos, sem divisórias.

#### Components

Timer com ação branca sobre Prism escurecido e encerramento secundário; jornada com progresso e configuração opcional; resumo de home office com erro, ausência e nova tentativa; calendário compacto com cabeçalho fixo; navegação por ícones com rótulos em tooltips e estado ativo azul claro. O foco visível recebe contorno azul de 2px, afastado 4px; dentro do timer escuro, o contorno é branco, com as mesmas dimensões. A legenda Eventos usa verde, acompanhando os blocos de evento desta superfície. No Windows compatível, a barra de título de 48px acompanha o marfim e o azul, com símbolo oficial ZULU de 24px, sem nome ou tagline adjacentes, indicador de mensagens não lidas e controles nativos de minimizar, maximizar/restaurar e fechar. A área da marca permite arrastar e o duplo clique alterna maximização; foco permanece visível. Contrato de compatibilidade e entrega: [barra desktop](docs/desktop-updates.md#barra-de-título-windows--014-publicada).

O fundo de `.today-focus` usa o **AnimatedGradient original da Spell UI**, por escolha explícita do usuário: **Prism** quando parado ou em pausa de almoço e **Lava** enquanto o timer está em andamento. [Source fixado](https://github.com/xxtomm/spell-ui/blob/659b5c2ae405ea9e1c363e09cca7380a0d98e271/registry/spell-ui/animated-gradient.tsx), componente local `components/animated-gradient.tsx`, licença MIT em `docs/licenses/spell-ui-MIT.txt` e `public/licenses/spell-ui-MIT.txt`. Shader e presets foram preservados; a fase inicial de Prism avança 3 unidades de tempo do shader para evitar o primeiro quadro preto. Os canvases decorativos ficam atrás do conteúdo, sem receber interação. O overlay preto limita o fundo mais claro a `#5c5c5c`; o texto secundário `#ccd9f1` mantém contraste superior a 4,5:1. Renderização limitada a 30fps e DPR 1,5, pausada fora da tela ou com documento oculto; movimento reduzido usa quadro estático com redesenho no resize. Sem WebGL2, usa gradiente CSS nas cores do respectivo preset. Este efeito pertence somente ao timer; a superfície marfim e a regra sem bordas decorativas permanecem.

A mudança de estado real do timer dissolve Lava sobre Prism em **650 ms**, com `cubic-bezier(0.16, 1, 0.3, 1)`, sem atrasar a ação nem remontar os canvases. São dois contextos WebGL estáveis; apenas o preset visível mantém seu loop de animação, e o outro conserva um quadro estático durante a transição. Trocas rápidas revertem a opacidade a partir do ponto atual. Em `prefers-reduced-motion`, os presets mudam sem transição e permanecem estáticos. A pausa e o encerramento retornam a Prism; a retomada retorna a Lava.

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

Login, cadastro, recuperação, MFA e convite compartilham os tons claros e azuis do app. Desktop divide contexto do produto e formulário; celular prioriza a tarefa. Formulários usam nomes acessíveis, campos confortáveis e estados de erro/sucesso. MFA usa QR/chave vindos do Auth, sem ilustração ou segredo fictício.

O app integrado mantém a composição da demonstração e substitui dados de exemplo por estados vazios e conteúdo autorizado pelo RLS. Eventos reais usam azul para reunião e laranja para evento; colisões de horário usam faixas separadas. PWA usa ícones PNG derivados do símbolo oficial ZULU fornecido pelo usuário.

Capturas anônimas de acesso estão em `.impeccable/review/auth/`. Telas autenticadas/MFA dependem de uma conta real para inspeção; não foram simuladas para produzir evidência de integração.

A revisão visual final de acesso teve veredito `ship` restrito ao login desktop/celular, cadastro desktop, pedido de recuperação desktop e ícone de 512px. Não inclui redefinição de senha por link, MFA, onboarding ou telas privadas; também não comprova autenticação ponta a ponta ou instalação PWA em dispositivos.

## Site público — autoridade independente

Esta seção rege exclusivamente `/site`, `/download` e seus assets em `public/marketing/`. O usuário delegou a escolha de uma identidade própria para o site. A autoridade clara compartilhada pelo aplicativo não substitui a identidade pública. Implementação: `app/marketing.css`, `components/marketing.tsx`; contexto e referências: [pesquisa do site](docs/marketing-research.md). Os tokens desta superfície ficam no objeto `marketing` de `.impeccable/design.json`, separado dos tokens do app.

### Overview

Modo **Persuade**. **Creative North Star: "Trabalho em sintonia".** Títulos amplos, alinhamento editorial e campos de cor apresentam o trabalho compartilhado com energia e clareza. Capturas reais da demonstração fazem a ponte entre a identidade pública e a interface do produto.

Características: hierarquia tipográfica expressiva, espaços generosos, contraste entre azul e verde vivo e demonstrações identificadas como fictícias. A composição inicial da landing é uma expressão desta superfície, separada da interface clara do aplicativo.

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
