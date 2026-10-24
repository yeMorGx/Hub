# ZULU — Sistema visual

## Autoridade vigente — Night Shift, 24/10/2026

O usuário escolheu a **opção 3, terceira imagem**, [Night Shift](docs/design-references/2026-10-24/night-shift.png). Essa escolha substitui a identidade marfim/azul e a composição Bento no workspace autenticado, acesso e demonstração. Modo **Operate**: escolher uma tarefa real e registrar trabalho, excluindo o almoço, no contexto da agenda e da presença do time. [Contrato de implementação](docs/night-shift.md), [brief](.impeccable/briefs/night-shift.md) e [tokens estruturados](.impeccable/design.json). `/site` e `/download` mantêm a autoridade pública independente abaixo.

Shakuro, o dashboard marfim, Bento, a fotografia de home office e o grande fundo Prism/Lava são referências históricas. Seus contratos e reviews anteriores não aprovam esta composição. A arquitetura funcional de [workspace](docs/zulu-workspace-plan.md), [formulários](docs/form-controls.md), [desktop](docs/desktop-runtime.md) e [movimento](docs/motion-design.md) continua aplicável conforme o escopo de cada contrato.

## Marca, componentes e tipografia

Usar o símbolo oficial `public/brand/zulu-mark.svg` por `BrandMark`, extraído sem redesenho de `public/brand/zulu-source.svg`; o wordmark permanece disponível para usos pontuais. Priorizar símbolo, pouco texto e nome acessível ZULU. Ícones de PWA/desktop derivam do símbolo. Identificadores técnicos existentes como `app.hub.team`, Hub, arquivos de instalação e chaves de cache/cofre preservam seus contratos de compatibilidade.

**HeroUI v3 é obrigatório** para componentes novos ou retrabalhados. React/Styles 3.2.6 e os adaptadores `components/dashboard-ui.tsx` e `components/form-controls.tsx` preservam teclado, foco, validação, FormData, locale pt-BR e composição oficial. Ler a [skill local](.agents/skills/zulu-heroui/SKILL.md) antes de alterar controles. Calendar seleciona a data; a grade horária continua específica do produto. A sidebar mantém os Hugeicons oficiais animados da Animate UI; Phosphor permanece no conteúdo.

Inter Variable local em texto/controles, corpo de 14–16px. Manrope Variable local nos títulos; títulos de módulo de 30px, peso 750 e espaçamento −0,03em. Números de tempo são tabulares. A hierarquia usa peso, espaço e preenchimentos, com foco visível e sem bordas ou sombras decorativas de cards. O dock tem sombra funcional discreta de separação da área rolável.

## Tokens semânticos

Fonte implementada: `app/night-shift.css`, aplicada após as camadas legadas. A mesma família de tokens alcança `.night-shift`, acesso, carregamento e portais `.zulu-overlay`; cores fixas conflitantes nos módulos foram migradas para superfície, texto, campo, seleção e foco. CSS legado ainda existe: ao alterar um módulo, conferir também seus overlays nos dois temas.

| Papel / CSS | Escuro padrão | Variante clara |
| --- | --- | --- |
| Fundo `--bg`, `--background` | `#101217` | `#f5f5f8` |
| Moldura `--frame`, rail | `#0c0e12` | `#0c0e12` |
| Superfície `--surface` | `#15171e` | `#ffffff` |
| Camada/campo `--surface-raised`, `--field-background` | `#232630` | `#ececf3` |
| Terciária `--surface-tertiary` | `#2c2f3a` | `#e3e3ed` |
| Overlay `--overlay` | `#1a1c25` | `#ffffff` |
| Texto `--text`, `--foreground`, `--field-foreground` | `#f1f0f7` | `#20212d` |
| Auxiliar `--muted`, placeholder | `#b4b4c4` | `#5e6072` |
| Ação `--accent` | `#a5ddc6` | `#27634d` |
| Texto da ação `--accent-foreground` | `#10251d` | `#ffffff` |
| Ação hover `--accent-hover` | `#bce9d7` | `#20523f` |
| Seleção expandida `--night-selection` | `#29273d` | `#e8e2f4` |
| Foco/lavanda `--focus`, `--purple` | `#c2b0fb` | `#7655c1` |
| Borda funcional `--border` | `#30333f` | `#d5d5e2` |
| Perigo `--danger` | `#ffb1bc` | `#a33349` |

Raio base 14px, campo 10px e dock 16px. O tema inicia **escuro** e usa a preferência local `zulu:appearance:v2` com `data-zulu-theme="dark|light"`; Claro/Escuro são escolhas explícitas nas Preferências. A chave v2 estabelece o novo padrão; não é sincronização de conta nem escolha automática pelo sistema. A moldura e seu texto claro permanecem escuros na variante clara.

## Composição e estados

Rail fixa de 80px e header web de 64px formam uma moldura contínua; a titlebar Windows mantém 48px e seus controles nativos. Header reúne time, busca, notificações e perfil. Tooltips e drawer móvel usam HeroUI. Permanecem 22 destinos, navegação por papel, permissões e reset de contexto ao trocar time. Em até 760px, header de 60px e drawer substituem a rail.

Hoje usa uma lista ampla de tarefas à esquerda e agenda/equipe/home office à direita, aproximadamente 72/28 acima de 1200px. Até 1200px a coluna contextual tem 290px; até 960px passa abaixo; até 760px o conteúdo empilha. A seleção expande a tarefa em lavanda com descrição, projeto, responsável, vencimento e status reais. Filtros mostram tarefas abertas, próximos dias, concluídas e projeto. A conclusão preserva a RPC versionada e as permissões existentes. Subtarefas e anexos ilustrados no conceito não pertencem ao esquema atual de tarefas e não são apresentados como dados existentes.

Dock fixo inferior com timer persistente em todos os módulos: base de 102px no desktop e 132px no celular, com espaço reservado e acesso às últimas ações da rail. Atividade, projeto, relógio e ações mantêm os estados parado, ativo, almoço e retomada. O seletor abre acima do dock sem recorte. Uma única ação de almoço encerra o trecho, conserva a atividade e exclui a pausa do trabalho; a retomada é manual. O resumo de jornada leva a Horas e distingue registrado/previsto/restante.

## Movimento e contratos de execução

Expansão de tarefa e feedback de ação são breves e causais; HeroUI mantém teclado, toque e foco. Prism/Lava original da Spell UI permanece como sinal pequeno do estado do timer, sem dominar o fundo. Preservar source/licenças, pausa fora da tela/documento oculto, fallback e `prefers-reduced-motion`. Movimento não essencial torna-se estático; navegação não repete entradas de sessão.

Produção e demonstração compartilham `HubWorkspace` em `components/live-hub-app.tsx`, com controladores separados. `useHub` mantém Auth/MFA, RLS, RPCs e serviços reais; `lib/hub/use-demo-workspace.ts` usa dados ilustrativos e mutações em memória. A demo tem perfil/bootstrap próprios e limita ações externas explicitamente. Fixtures não entram no caminho autenticado. Componente compartilhado comprova apresentação comum; persistência requer evidência autenticada própria.

Captura de tela, arquivos, notificações, segundo plano e integração do aplicativo instalado continuam nas APIs Tauri/Rust. A interface preserva controles nativos e não muda o contrato pelo user-agent. Esta entrega não altera Rust nem certifica Windows, mídia física, bandeja ou instalador.

## Evidência desta direção

Revisão independente final: **SHIP**, com os cinco achados materiais resolvidos (contraste do quadro ativo, número na escala, header claro, perfil/bootstrap isolados da demo e destaque do calendário). Evidências em `.impeccable/review/night-shift/`, com 35 imagens no manifesto `assets.json`; fluxo autenticado local em `/tmp/zulu-night-qa/final-real` é artefato temporário, não documentação permanente.

Build, 63 testes unitários, 35 públicos locais e 26 cenários de demonstração passaram no candidato. Organização isolada com MFA exercitou criar tarefa/projeto, iniciar timer, almoço, retomar, encerrar e concluir tarefa. As 22 páginas foram observadas em 1440×1000 e 390×1000; administrador/membro tiveram amostra de três telas. Esses resultados têm escopos distintos e não certificam todas as mutações, acessibilidade completa, autorização ou provedores. A confirmação da publicação é registrada separadamente em [design-qa.md](design-qa.md); este documento não declara deploy concluído.

## Site público — autoridade independente

Esta seção rege exclusivamente `/site`, `/download` e seus assets em `public/marketing/`. O usuário delegou a escolha de uma identidade própria para o site. A autoridade Night Shift do aplicativo preserva a identidade pública independente. Implementação: `app/marketing.css`, `components/marketing.tsx`; contexto e referências: [pesquisa do site](docs/marketing-research.md). Os tokens desta superfície ficam no objeto `marketing` de `.impeccable/design.json`, separado dos tokens do app.

### Overview

Modo **Persuade**. **Creative North Star: "Trabalho em sintonia".** Títulos amplos, alinhamento editorial e campos de cor apresentam o trabalho compartilhado com energia e clareza. Capturas reais da demonstração fazem a ponte entre a identidade pública e a interface do produto.

Características: hierarquia tipográfica expressiva, espaços generosos, contraste entre azul e verde vivo e demonstrações identificadas como fictícias. A composição inicial da landing é uma expressão desta superfície, separada da interface de trabalho do aplicativo.

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
