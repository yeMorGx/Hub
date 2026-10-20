# Hub — revisão visual da primeira entrega

final result: passed

Escopo do resultado: adaptação visual da referência Shakuro e resolução dos dois achados materiais da revisão. Não é aprovação de funcionalidade multiusuário, conformidade WCAG ou integração com Supabase.

## Referência e capturas

- Referência escolhida pelo usuário: `docs/design-references/calendar-shakuro.png`.
- Hoje desktop: `.impeccable/review/desktop.png`, viewport 1440 × 1100, captura completa.
- Hoje celular: `.impeccable/review/mobile.png`, viewport 390 × 844, captura completa.
- Outras telas: `chat.png`, `hours.png`, `people.png`, `calendar.png`, no mesmo diretório.
- Estado do timer no celular: `.impeccable/review/mobile-timer.png`, viewport 390 × 844.
- Observações de renderização: `.impeccable/review/render-observations.jsonl`.

As capturas finais foram abertas e inspecionadas. Capturas intermediárias com o destaque de navegação em transição e tooltip sob o mouse foram substituídas por capturas estáveis, com redução de movimento e mouse afastado dos controles.

## Comparação com a direção escolhida

A implementação preserva grafite, trilho compacto, destaque quente do timer, grade semanal ampla e contexto lateral da referência. A adaptação substitui tarefas futuras por trabalho atual, agenda e contexto de pessoas do Hub. No celular, reorganiza foco e reuniões e abre a agenda no dia atual.

O produto foi pedido como frontend inspirado nas referências; não como réplica literal da prancha de apresentação do Dribbble. Dispositivo, fotografia, dados e identidade do autor não são assets do aplicativo.

## Achados e correções

| Achado da revisão independente | Correção | Veredito |
| --- | --- | --- |
| Rótulos inferiores de 7px prejudicavam a identificação dos módulos no celular. | Rótulos de 10px e botões flexíveis, acomodando Minhas horas. | resolved |
| Indicador de timer era ocultado em outros módulos no celular. | Indicador flutuante acima da navegação, com acesso a Minhas horas. | resolved |

A revisão inicial indicou `fix`. O veredito após correções foi `ship`, restrito aos dois ajustes e à validade das capturas secundárias. Nenhum dos dois achados ficou aberto.

## Evidência técnica e limites

- `npm run build` concluiu e o TypeScript passou na versão final.
- As cinco telas renderizaram sem `pageerror` observado no Chromium.
- Nas capturas de Hoje, o documento manteve a largura de 1440px e 390px, respectivamente.
- O estado de timer ativo para captura foi preparado no storage de um contexto descartável. Isso não comprova início/parada, persistência ou contagem corretos.
- Nenhum teste funcional ou suíte de testes foi adicionado/executado nesta entrega.
- Diálogos, estados de erro, teclado virtual e outros navegadores não receberam validação funcional completa.
- Launcher e detector Impeccable não estavam disponíveis; revisão visual independente foi feita manualmente.
- Na primeira entrega, Auth/MFA, Realtime, PWA e integração com RPCs estavam pendentes. Os dados dessas capturas são fictícios e locais; essa demonstração está preservada em `/demo`.

## Continuação: acesso e integração — 20/10/2026

O aplicativo principal agora implementa Auth/MFA, onboarding, consultas e gravações no Supabase, assinaturas privadas Realtime e a base da PWA. Os detalhes e limites estão em `docs/supabase-app-integration.md`.

A revisão visual independente teve veredito `ship` restrito a estas capturas em `.impeccable/review/auth/`:

- `login-desktop.png`, viewport 1440 × 1000.
- `login-mobile.png`, viewport 390 × 844.
- `signup-desktop.png` e `recovery-desktop.png`.
- `icon-512.png`.

As capturas foram abertas e inspecionadas. A inspeção anônima observou redirecionamento de `/` para `/login`, ausência de `pageerror` e largura do documento igual à viewport nos dois tamanhos. Manifest e ícones retornaram HTTP 200. Os rótulos dos campos de senha foram corrigidos para usar associação explícita, com botões fora do rótulo.

Esse veredito não abrange telas privadas, MFA, resultados de formulários, navegação por teclado, leitor de tela, instalação da PWA ou funcionamento multiusuário. Não foram criadas contas, enviados e-mails ou executados testes funcionais/suítes nesta etapa. A validação autenticada ponta a ponta permanece pendente.

## Continuação: Kanban da Fase 2 — 20/10/2026

Resultado visual do incremento: `ship`, restrito à demonstração `/demo/kanban` e ao editor capturados. A revisão independente `kanban_finish_review` não encontrou defeito material; sugeriu opcionalmente um nome curto do responsável. Esse resultado não altera o alcance das revisões históricas acima.

Capturas em `.impeccable/review/kanban/`:

- `desktop.png`, viewport 1440 × 1000, e `mobile.png`, viewport 390 × 844.
- `editor-desktop.png` e `editor-mobile.png`, nos mesmos tamanhos.
- `render-observations.jsonl`: quadro com HTTP 200 nos dois tamanhos; quadro e editor sem `pageerror` observado e sem overflow horizontal do documento.

O quadro desktop e celular foi aberto e comparado com `DESIGN.md`: mantém modo Operate, grafite, laranja, Manrope e Phosphor. Três colunas desktop tornam-se colunas empilhadas no celular. Filtros, cards, seletor de etapa e ação principal seguem a linguagem existente. `DESIGN.md` e `.impeccable/design.json` foram preservados; este incremento não define novos fundamentos visuais.

O componente é compartilhado com o módulo Tarefas autenticado, mas estas capturas usam somente dados fictícios e estado em memória, sem backend. A compilação Next.js/TypeScript passou. Não houve testes funcionais/suítes, criação de contas, envio de e-mails ou dados reais de negócio. Permissões, concorrência, timer e Realtime permanecem sem validação autenticada real; este veredito não aprova produção, integração ponta a ponta ou acessibilidade completa.

A Fase 2 continua parcial. [Escopo, contratos e limites do Kanban](docs/phase-2-kanban.md).
