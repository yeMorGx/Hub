# Hoje — HeroUI v3 e Bento Grid

Decisão explícita do usuário: migrar o dashboard para HeroUI, usar Bento Grid e colocar uma imagem de home office no fundo da escala. Esta entrega substitui a composição anterior de Hoje; mantém marfim, azul profundo, Inter, símbolo ZULU, ausência de bordas decorativas e fundo Prism/Lava do timer.

## Referências consultadas

- [Bento Grids](https://bentogrids.com): galeria consultada e capturada. Proporções diferentes, alinhamentos comuns e alternância entre blocos visuais e blocos operacionais. Referência de composição, sem copiar dados, textos ou assets dos projetos da galeria.
- [HeroUI React v3](https://heroui.com/en/docs/react/components): documentação e source oficiais de Button, Card, Avatar/AvatarGroup, Chip, ProgressBar, Input, TextArea, Form, Label, Fieldset, Checkbox, Select/ListBox, ToggleButtonGroup, Dropdown, Popover, Calendar, Modal, Tooltip, Toast, Spinner e Skeleton. APIs v3; não usa HeroUIProvider nem Framer Motion.
- Foto: [Unsplash, asset photo-1518455027359-f3f8164ba6bd](https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd). Espaço doméstico com mesa, luz natural, planta e poltrona. Servida localmente como `public/dashboard/home-office.webp`, sem requisições de imagem a terceiros em execução. Uso decorativo; não representa o escritório nem a casa de um membro.

## Composição

Modo **Operate**. Grid de 12 colunas acima de 1200px, com gap de 18px: timer 8 colunas e foto da escala 4; jornada 8 e encontros 4 na segunda linha; agenda 8 e blocos de presença/atividades/conversas 4 abaixo. Cards com 14px de raio, sem bordas e sem sombras. Até 1200px, oito colunas reorganizam os blocos; até 760px, uma coluna com gap de 14px. Barra lateral e navegação inferior preservam o contrato existente.

Foto com overlay escuro e fallback verde; nomes e datas reais continuam vindo do resumo autorizado. Sem atribuição, feriado e erro mantêm seus estados e ações. O fundo dá contexto ao conteúdo, sem esconder os dados. O zoom de 3,5% no hover é sutil e fica desativado com movimento reduzido.

## Componentes reais e escopo

`@heroui/react` e `@heroui/styles` 3.2.6, Tailwind v4, React 19. `components/dashboard-ui.tsx` compõe os componentes oficiais; `DashboardUIProvider` ativa-os em Hoje e nos diálogos abertos a partir dessa tela. Fora desse escopo os adaptadores mantêm os elementos nativos anteriores. `TodayOverview`, `TodayContext` e o modo compacto de `LiveCalendar` são compartilhados pela prévia e pelo aplicativo autenticado.

- Card/Header/Title nos blocos; Avatar/Fallback e AvatarGroup para pessoas; Chip no estado do timer e ProgressBar/Track/Fill na jornada.
- Button nos controles, menus e navegação; Link nas opções da navegação da prévia. Tooltips nos controles de ícone, com nome acessível preservado.
- ToggleButtonGroup representa mês/semana/dia com seleção única (semântica de radiogroup). Dropdown seleciona o filtro. Popover + Calendar escolhem a data, em português.
- A grade horária de eventos é específica do produto: usa as primitivas de interação oficiais, mantendo posições, conflitos, horários, home office e callbacks existentes. O Calendar HeroUI é o seletor de datas, não um substituto dessa grade de eventos.
- Form, Label, Input, TextArea, Fieldset, Checkbox e Select/ListBox nos formulários abertos a partir de Hoje. Os nomes/campos, FormData, valores vazios, campos desativados, validação e handlers de negócio são preservados. Labels de selects e checkboxes são compostos sem aninhar labels.
- Modal cuida de foco, Escape, clique fora e restauração de foco. Tokens claros próprios acompanham os portais; eles não dependem de herdar o tema do DOM da página.
- Toast para feedback, Alert para erros de formulário, Spinner e Skeleton para carregamento. Nada disso muda a autorização de dados.

## Movimento e integração

Botões respondem ao pressionamento e hover, setas acompanham ações e os componentes oficiais preservam a navegação por teclado. `prefers-reduced-motion` desliga os movimentos não essenciais e mantém estados legíveis. O timer continua Prism parado/pausado e Lava trabalhando, com crossfade de 650ms, dois contextos estáveis, apenas um loop ativo, 30fps/DPR 1,5, suspensão fora da tela e fallback CSS.

Não altera RPCs, RLS, assinatura desktop, migrações ou credenciais. O runtime do dashboard é publicado pela Vercel; esta entrega não exige novo instalador nativo.

## Verificação

Evidências em `.impeccable/review/zulu-bento/`. Os testes de navegador usam a demonstração em memória, mais uma fixture interceptada pelo Playwright para validar os componentes reais de formulário. Essa fixture nunca vira uma rota pública e não grava no Supabase. Verificar também os logs de publicação antes de afirmar que o deployment está pronto.

A prévia comprova componentes, responsividade e interações locais; não comprova uma sessão autenticada, políticas RLS ponta a ponta nem desempenho em hardware desktop real.

## Publicação

Publicado na Vercel, deployment `dpl_HNoaPp92QB5ZZedXMTxJzfEx3LJN`, origem `8e726ca`, status READY. No endereço público passaram 32 checks HTTP, cinco larguras Bento e a fixture isolada de formulário. Detalhes e limites em `.impeccable/review/zulu-bento/deployment.json` e `review.md`.
