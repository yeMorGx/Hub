---
name: zulu-heroui
description: Mandatory ZULU frontend component standard. Read before creating or changing React UI components, controls, forms, calendars, feedback, navigation, layout or overlays. Use official HeroUI v3 components and examples.
---

# ZULU — HeroUI v3 como referência obrigatória

Decisão explícita do usuário em 21/10/2026: **HeroUI é a referência total de componentes do ZULU.** Nos próximos trabalhos de interface, partir dos componentes oficiais e de seus exemplos reais, em vez de criar uma aproximação visual própria.

## Autoridade

- Catálogo: https://heroui.com/en/docs/react/components
- Código oficial: https://github.com/heroui-inc/heroui/tree/v3
- Índice MDX: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/index.mdx
- Guia oficial React v3: https://github.com/heroui-inc/heroui/blob/v3/skills/heroui-react/SKILL.md
- Identidade, cores, hierarquia e escopo de cada superfície: `DESIGN.md` e `.impeccable/design.json`.

## Regra de implementação

1. Antes de implementar, consultar a documentação v3 atual do componente específico e os exemplos/source oficiais. Não usar APIs lembradas da v2.
2. Usar o componente oficial de `@heroui/react`, compondo o exemplo oficial. Quando for necessário incorporar código local, copiar a implementação oficial completa, incluindo os hooks, dependências, estilos e licença aplicáveis. Não copiar apenas a aparência e perder o comportamento.
3. Isso vale para **todos os novos componentes e os que forem retrabalhados**: botões, calendário, seletor de datas, toast, alertas, progress, skeleton, spinner, checkbox, fieldset, inputs, labels, OTP, layouts, coleções, menus, modais, popovers, navegação e demais categorias do catálogo.
4. Manter contratos oficiais de teclado, foco, acessibilidade, estados controlados, validação, loading, disabled, seleção e composição. Componentes só de ícone precisam de nome acessível.
5. Aplicar o tema do ZULU pelos pontos de extensão/tokens/variantes documentados. O dashboard é flat: sem bordas decorativas nem sombras; preservar os contornos funcionais de foco. Não alterar as outras superfícies fora do escopo da tarefa.
6. HeroUI v3 usa React Aria e Tailwind v4; seguir a API composta atual e `@heroui/styles`. Não acrescentar `HeroUIProvider` ou padrões da v2. Instalar dependências pelo gerenciador já usado pelo projeto quando a tarefa exigir componentes reais; ler o guia específico antes de mudar a configuração CSS.
7. Não misturar outra biblioteca de componentes por preferência do agente. Código específico de produto integra as primitivas HeroUI; efeitos especializados já escolhidos explicitamente pelo usuário, como o fundo **Prism da Spell UI**, mantêm essa escolha, sem substituir a biblioteca padrão de controles.
8. Todos os formulários usam os adaptadores compartilhados. Antes de alterá-los, ler `docs/form-controls.md`; preservar os contratos de FormData, valores ISO, locale pt-BR, validação e desabilitação. Em Checkbox, Control e o texto ficam dentro de Checkbox.Content, que fornece a área interativa.

## Microinterações obrigatórias

Decisão explícita do usuário: toda interface nova ou retrabalhada deve ter microinterações e microanimações modernas, agradáveis e coerentes com a ação. Planejar esse feedback como parte do componente.

- Usar, conforme o contexto, hover, pressionamento, seleção, transições de estado, abertura/fechamento, carregamento e confirmação de ações. Priorizar respostas visuais claras e pequenos detalhes satisfatórios.
- Partir das interações oficiais HeroUI, preservando seus contratos. Quando faltar uma boa ideia, pesquisar exemplos reais em **HeroUI, Refero, Unlume** e outros sites de UI; registrar a fonte e o comportamento aproveitado. Essas referências complementam a biblioteca obrigatória, sem substituir as primitivas HeroUI por outra biblioteca.
- Manter movimento curto e consistente; como ponto de partida, 120–200 ms em controles e 180–300 ms em overlays. Ajustar ao comportamento e à superfície. Preferir transform e opacity, sem deslocar o layout nem atrasar a execução da ação.
- Garantir respostas equivalentes por teclado e toque; não esconder informações essenciais apenas no hover. Preservar foco, nomes acessíveis e estados disabled/loading.
- Respeitar `prefers-reduced-motion`: substituir movimento não essencial por feedback estático, preservando a informação de estado. Pausar animações contínuas não essenciais fora da tela ou com a página oculta. Não adicionar loops decorativos a cada componente.
- Conferir os estados de interação, movimento reduzido e responsividade ao trabalhar na interface. Esta regra vale progressivamente no escopo de cada tarefa; não exige uma migração global imediata.

## Preferências da marca

Usar principalmente o símbolo oficial `public/brand/zulu-mark.svg` por meio de `BrandMark`. Pouco texto; sem nome ou tagline ao lado da marca na sidebar, barra de título e cabeçalhos principais. O wordmark fica reservado a usos pontuais. Manter nomes acessíveis mesmo quando o texto visual for removido.

## Fechamento

Registrar qual componente/exemplo oficial foi usado. Conferir a versão instalada, os estados relevantes e o layout responsivo; executar testes quando autorizado pelo usuário e pelas instruções da sessão. Preservar avisos de licença ao incorporar source oficial.

## Dashboard implementado

Hoje e `/demo/dashboard` usam a direção **Night Shift**, opção 3 escolhida em 24/10/2026. Ler `docs/night-shift.md`, `DESIGN.md` e `.impeccable/design.json` antes de alterar a tela. `HubWorkspace` compartilha a apresentação entre produção e demo, com controladores separados; fixtures ficam fora do caminho autenticado. `components/dashboard-ui.tsx` compõe as primitivas oficiais HeroUI React/Styles 3.2.6; campos usam `components/form-controls.tsx`. Preservar FormData, portais nos dois temas, radiogroup de mês/semana/dia e Calendar para a escolha de data. O padrão é grafite, seleção lavanda e ação verde; a variante clara usa a preferência local v2. A lista de tarefas e o dock persistente substituem o Bento/foto; Prism/Lava permanece apenas como pequeno sinal de estado. Conteúdo e conclusão refletem o esquema/RPC reais; almoço mantém uma única pausa com retomada manual.

## Sidebar: exceção de ícones escolhida pelo usuário

Usar os **Hugeicons oficiais animados da Animate UI** na sidebar do app e na prévia de Hoje. Os arquivos do registry são preservados em `components/animate-ui/icons/hugeicons/`, com licença; `DashboardNavIcon` liga hover e foco do controle inteiro e respeita movimento reduzido. Dependências: `@animate-ui/react` e `motion`. Isso não substitui HeroUI nos controles nem exige trocar os ícones do conteúdo das outras telas. A rail fixa de 80px integra a moldura do header; até 760px, a navegação usa drawer HeroUI. Não restaurar o rodapé promocional/linha de MFA removido por pedido do usuário.

## Desktop e seletor de atividade

A title bar de 48px recebe o cabeçalho autenticado por `DesktopChrome`; manter o cabeçalho de fallback no navegador e no frame antigo. O avatar não deve voltar à sidebar. O seletor de atividade usa liquid glass por escolha explícita do usuário, com campos escuros legíveis em foco. O mini timer é uma janela nativa transparente, em cápsula totalmente arredondada com Prism/Lava e controles HeroUI; ler `docs/desktop-runtime.md` antes de alterar seus contratos. A atividade das pessoas é apenas texto e presença desconhecida não recebe rótulo indisponível.
