# Conversas, notificações, navegação e calendário

## Autoridade e referências — 23/10/2026

Extensão das superfícies existentes, em modo Operate. Mantém a autoridade atual de `DESIGN.md`: Inter, azul profundo, conteúdo claro, moldura preta compacta, superfícies planas e controles HeroUI v3. As descrições anteriores conflitantes no documento raiz são históricas. Hoje conserva Bento, Prism/Lava e fotografia de home office.

| Referência | Aplicação nesta entrega |
| --- | --- |
| [Web Chat UI — Ronas IT](https://dribbble.com/shots/23280048-Web-Chat-UI) | Índice lateral, bolhas próprias em azul profundo e recebidas em lilás, hierarquia de autor/horário, compositor ancorado e coluna contextual no desktop. |
| [Notifications for Brainwave 2.0 — UI8](https://dribbble.com/shots/26419555-Notifications-for-Brainwave-2-0) | Inbox branco flutuante, filtros Todas/Não lidas, símbolos circulares, ponto de não lido e hierarquia de tipo, horário e ação. |
| [Sidebar Navigation — Widelab](https://dribbble.com/shots/17511216-Sidebar-Navigation) | Rail compacta com seleção evidente, adaptada à moldura preta contínua e à marca oficial ZULU; perfil no header. |
| [Calendar Dashboard — Tenso](https://dribbble.com/shots/27596042-Calendar-Dashboard) | Mês destacado, bloco de data e intervalo, navegação separada e eventos pastel com título antes do horário. |

As páginas foram inspecionadas em Chromium e os artworks originais públicos de `og:image` foram baixados e vistos. URLs, autoria e hashes estão em [collaboration-2026-10-23.json](design-references/collaboration-2026-10-23.json). Nenhum artwork de terceiros foi incorporado ao produto. A composição e os tipos instalados do HeroUI 3.2.6 orientaram o Accordion e os primitives oficiais de Dropdown; este registro não afirma consulta remota adicional à documentação.

## Contratos de implementação

`app/collaboration-design.css` concentra o acabamento; `AdvancedConversation`, `LiveCalendar`, `NotificationFeed` e `WorkspaceDemo` mantêm os fluxos existentes. Header e rail permanecem pretos e compactos, com cursor padrão, sem novas bordas ou sombras decorativas. Foco funcional e linhas de horário continuam visíveis.

**Conversas.** A autoria recebe contraste mais forte nas bolhas. Reações usam Dropdown HeroUI compacto com cinco opções; os contadores existentes continuam visíveis. Busca lateral filtra somente canais autorizados já carregados. Threads, fixadas, busca, gravação e envio preservam seus contratos.

A partir de 1280px, a terceira coluna reúne arquivos em Accordion HeroUI e autores sob o título **Neste histórico**. Os autores vêm apenas das mensagens carregadas: não representam o quadro de membros e não há nova consulta de associação. Os arquivos usam somente metadados de anexos autorizados já carregados e o download existente exige ação do usuário. A coluna é omitida abaixo de 1280px; mensagens e arquivos continuam no fluxo da conversa. No celular, o histórico rola independentemente e o compositor permanece ancorado e contido na largura disponível; ações também ficam acessíveis por toque.

**Notificações.** A lista completa e o popover do sino compartilham `NotificationFeed`. O título comunica o tipo real do evento; horário e ação aparecem sem inventar atores ou prévias de mensagens. ToggleButtonGroup oficial controla os filtros e Skeleton oficial indica a carga inicial. O sino consulta a contagem total e até 100 avisos recentes, atualiza em foco/a cada minuto e mantém o badge ao abrir. Somente a RPC existente marca leitura; no celular a ação explícita fica visível. Erros permitem tentar novamente. Trocar time invalida respostas pendentes e limpa o estado. A lista completa mantém o limite de 100 itens.

**Calendário.** Dropdown oficial filtra tipos; ToggleButtonGroup alterna mês/semana/dia. Reuniões e eventos recebem cores pastel, com títulos que podem quebrar linha. A grade completa tem rolagem limitada, cabeçalhos de dia e home office fixos e posição inicial às 09:00 nas visões horárias. Horários anteriores e noturnos continuam acessíveis por rolagem. A grade e os cálculos permanecem específicos do produto; no celular, a semana usa rolagem horizontal interna.

**Demonstração e movimento.** `/demo/workspace?page=chat|notifications|calendar` usa os componentes de produção com dados explicitamente fictícios. Os exemplos adicionais de calendário e notificações não introduzem dados reais; leitura na demonstração altera apenas memória local. Hover, seleção e pressão usam feedback breve e overlays oficiais. `prefers-reduced-motion` remove transições e deslocamentos personalizados.

## Evidência e limites

- `npm run build`: produção e TypeScript aprovados; `npm run test:unit`: 62 testes aprovados.
- `node scripts/collaboration-design-browser.mjs`: aprovado em Chromium a 1440×1000 e 390×1000. Cobriu filtros e visões do calendário, detalhe de evento, busca/fixadas do chat, cinco opções de reação, alternância da coluna contextual, compositor sem overflow, leitura/filtros/badge, Escape/retorno de foco, inbox escuro e movimento reduzido. Nenhum erro de página ou aviso de console.
- Oito capturas em `.impeccable/review/zulu-collaboration-refs/`: `{chat,calendar,inbox,notifications}-{1440,390}.png`.
- Revisão independente: **ship**, limitada aos quatro artworks, oito capturas e evidência de código/demonstração. Sem achados materiais; o revisor não repetiu os testes. O detector Impeccable não foi executado porque seu launcher estava indisponível.

A evidência usa demonstração pública em memória e emulação de viewport. Não comprova envio autenticado, autorização em execução, persistência, transferência real de anexos, push, dispositivos físicos, titlebar nativa ou acessibilidade completa. Bento/Prism/Lava não integram este conjunto de capturas. Nenhuma migração, permissão ou binário nativo foi alterado.

Checagem adicional: `scripts/calendar-selection-browser.py` parou na primeira comparação de valor oculto, que espera `2026-10-19T10:00` e recebeu `2026-10-19T10:00:00`. O dia/horário está correto; o script pressupõe uma serialização sem segundos. Os adaptadores de formulário e `calendarDraft` não foram alterados nesta entrega. Esse script adicional não é declarado aprovado.
