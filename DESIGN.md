# Hub — Sistema visual

## Autoridade

Referência escolhida pelo usuário: [Team Management Calendar UI Dashboard — Shakuro](https://dribbble.com/shots/24177180-Team-Management-Calendar-UI-Dashboard). Captura: `docs/design-references/calendar-shakuro.png`. O Hub adapta a composição; não reproduz o dispositivo, fotografia de fundo, dados, logo ou funcionalidades futuras da referência.

Modo da superfície: **Operate**. Clareza das tarefas diárias, densidade útil, legibilidade e estados reconhecíveis orientam a interface.

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

Desktop: trilho fixo de 76px, barra superior de 72px, conteúdo com margem de 36px. Hoje reúne foco, retomada de trabalho e reuniões; abaixo vem a semana. O painel lateral de 246px mostra pessoas, horas próprias e conversa. Grades de horário usam 84px por hora e eventos por início/duração.

Acentos de eventos: laranja para criação; violeta para pesquisa/revisão; azul para alinhamentos; verde para colaboração. Cor tem rótulos acompanhantes. Superfícies levemente quentes distinguem o foco e a data atual.

Celular até 520px: navegação inferior com rótulos, foco horizontal, próximos encontros e calendário aberto no dia atual. A visão semanal continua disponível com rolagem apenas dentro da grade. O painel de contexto segue em sequência no documento. Rótulos da navegação inferior usam 10px; com timer ativo fora de Hoje, um indicador flutuante acima da navegação leva a Minhas horas. Telas intermediárias reduzem o número de painéis em paralelo.

## Interações e limites

- Timer mostra números tabulares e permanece ativo ao trocar de módulo. Em **Minhas horas**, a pausa de almoço encerra o trecho atual, mantém a atividade para retomada e não inclui a pausa no saldo.
- A jornada aparece como saldo de horas de hoje, da semana e do mês. A configuração de dias/horas é opcional durante a entrada no time e pode ser editada em **Minhas horas**.
- Diálogos nativos oferecem foco modal e Escape; foco de teclado recebe contorno pêssego.
- Busca acessível por botão e Ctrl/Cmd+K.
- Campos, filtros, estados selecionados, mensagens, confirmações e avisos seguem a mesma linguagem.
- Calendário apresenta atribuições e pausas de home office junto aos eventos; a escala, os feriados e as trocas ficam no diálogo **Escala**. [Comportamento e papéis](docs/home-office-schedule.md).
- Redução de movimento desliga transições e animação de carregamento.
- A demonstração `/demo` declara seus dados fictícios. A rota principal usa dados do Supabase e Presence privado; esses sinais continuam sendo informativos, sem efeito sobre permissões.

## Evidência

Capturas desktop e celular em `.impeccable/review/`. Compilação de produção registrada em `docs/frontend-delivery.md`. A inspeção visual não constitui auditoria completa de acessibilidade nem validação de integração com Supabase.

## Acesso e integração

Login, cadastro e recuperação herdam o grafite e o acento quente. Desktop divide contexto do produto e formulário; celular prioriza marca e tarefa. Formulários usam nomes acessíveis, campos confortáveis e estados de erro/sucesso. MFA usa QR/chave vindos do Auth, sem ilustração ou segredo fictício.

O app integrado mantém a composição da demonstração e substitui dados de exemplo por estados vazios e conteúdo autorizado pelo RLS. Eventos reais usam azul para reunião e laranja para evento; colisões de horário usam faixas separadas. PWA mantém o símbolo SquaresFour da biblioteca Phosphor em ícones PNG, sem novos assets de marca externos.

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
- **Navegação:** marca com símbolo SquaresFour, links de seção, entrada no Hub e download. O menu móvel revela os mesmos destinos; o link de pular conteúdo aparece ao receber foco.
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
