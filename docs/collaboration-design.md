# Conversas, notificações, navegação e calendário

## Referências de 23/10/2026

Modo Operate. Aplicar a identidade Inter/marfim/azul, superfícies planas, HeroUI v3 e os contratos de privacidade existentes.

- [Web Chat UI — Ronas IT](https://dribbble.com/shots/23280048-Web-Chat-UI): índice lateral de conversas, bolhas próprias à direita, recebidas à esquerda, agrupamento por dia e compositor ancorado.
- [Notifications for Brainwave 2.0](https://dribbble.com/shots/26419555-Notifications-for-Brainwave-2-0): inbox no sino, filtros Todas/Não lidas, sinal de leitura e ação contextual.
- [Sidebar Navigation](https://dribbble.com/shots/17511216-Sidebar-Navigation): agrupamento, estados claros de seleção e versão compacta. Preservar rail de 80px, união com titlebar e perfil somente no header.
- [Calendar Dashboard](https://dribbble.com/shots/27596042-Calendar-Dashboard): mês em destaque, bloco de data, navegação e eventos pastel com título antes do horário. Linhas da grade indicam horários; não são bordas decorativas de cards.

As quatro páginas e suas imagens foram consultadas. A leitura HTTP inicial recebeu desafio do Dribbble; Chromium e as prévias públicas permitiram inspeção visual. Assets dos autores não são incorporados ao produto.

## Implementação

`app/collaboration-design.css` contém os ajustes destas superfícies. `AdvancedConversation` preserva threads, reações, busca, arquivos, gravação e envio. Busca lateral filtra apenas canais já autorizados e carregados. Os controles existentes continuam HeroUI.

`NotificationFeed` serve a lista completa e o popover HeroUI no sino. ToggleButtonGroup oficial controla o filtro; Skeleton oficial sinaliza a carga inicial. O sino consulta contagem total e até 100 avisos recentes, atualiza em foco/a cada minuto e não zera o badge ao abrir. Somente a RPC existente marca um aviso como lido. Erros mantêm ação de tentar novamente. Trocar time invalida respostas pendentes e limpa o estado. A lista exibe tipo/data; não inventa remetentes nem lê mensagens para criar prévias. A lista completa também mantém o limite existente de 100 itens.

Calendário completo usa Dropdown oficial para filtros e ToggleButtonGroup para mês/semana/dia. A grade e seus cálculos continuam específicos do produto. Hoje mantém Bento, Prism/Lava, imagem de home office e layout próprios.

`/demo/workspace?page=chat|notifications|calendar` compartilha os componentes de produção com dados fictícios. Leitura de avisos na demonstração altera somente memória local.

Movimento: seleção/hover/press em 150–180ms, overlays oficiais HeroUI e deslocamento de 2px do evento em hover. `prefers-reduced-motion` desliga deslocamentos e transições personalizadas. Celular preserva navegação entre lista/conversa, calendário horizontal e sino acessível.

## Verificação

- `npm run build`: build de produção e TypeScript aprovados.
- `npm run test:unit`: 61 testes aprovados.
- `node scripts/collaboration-design-browser.mjs`: Chromium, 1440×1000 e 390×1000; filtros e mês/semana/dia, título do evento sem recorte, abertura de detalhe, busca lateral, autoria e fixadas do chat, filtros de avisos, marcação de leitura, atualização do badge, Escape/retorno de foco. Tema escuro do inbox e movimento reduzido aprovados, sem erros de página ou avisos de console.
- Capturas locais em `/tmp/zulu-design-qa`. A consulta de referência e QA não acessaram dados reais do time.

Limites: QA usa a demonstração pública em memória e emulação de viewport. Não comprova envio autenticado, persistência real, entrega de push, dispositivo físico ou execução nativa do Windows. Nenhuma migração, permissão ou binário nativo foi alterado.
