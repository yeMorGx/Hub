# Pesquisa — site público e downloads Hub

Pesquisa em 2026-10-20. O usuário delegou a escolha visual e pediu que o site tivesse identidade própria, independente do aplicativo em evolução. A landing fica em `/site`; o CTA leva a outra página, `/download`. A entrada existente do app permanece em `/`.

## Referências consultadas

| Fonte | O que foi observado | Aplicação no Hub |
| --- | --- | --- |
| [Dribbble: SaaS/productivity landing pages](https://dribbble.com/search/saas-productivity-landing-page) | Busca visual de várias composições: produto como prova, títulos grandes e contraste entre site e UI. Captura da grade acessível; detalhes de shots tiveram carregamento incompleto. | Vitrine baseada em telas do produto, sem copiar composições ou assets. |
| [Linear Download](https://linear.app/download) | Página própria de downloads, separação explícita por plataforma e alternativa web. | Destino separado com Windows disponível e alternativas web para outros sistemas. |
| [Notion Desktop](https://www.notion.com/desktop) | CTA direto, compatibilidade visível e produto mostrado junto à proposta. | Versão, arquitetura, arquivo, tamanho e requisitos próximos do download. |
| [Screen Studio](https://screen.studio) | Hierarquia forte, texto enxuto e demonstração do produto como centro da página. | Hero expressivo e demonstração navegável, sem vídeo falso. |
| [shadcn/ui Accordion](https://ui.shadcn.com/docs/components/accordion), [Tabs](https://ui.shadcn.com/docs/components/tabs), [Navigation Menu](https://ui.shadcn.com/docs/components/navigation-menu), [Button](https://ui.shadcn.com/docs/components/button) | Padrões de componentes, estados e hierarquia das ações. | FAQ nativa com details/summary, abas com teclado, menu móvel e CTAs consistentes. Componentes próprios; não foram importados snippets ou dependências. |

**Limitações de acesso:** Behance e Mobbin retornaram 403; não são apresentados como inspecionados. Linear principal retornou texto mas a captura inicial ocultava conteúdo animado; a referência visual usada foi a página de downloads, renderizada corretamente. Raycast `/download` iniciou download em vez de apresentar uma página; não é uma referência visual validada. Não houve contorno de login/paywall.

## Direção escolhida

Modo: **Persuade**. Azul elétrico #2449e8, verde vivo #d5fa71, tinta #172238 e papel #f5f6f1. Tipografia Manrope local, títulos grandes com alinhamento editorial, áreas amplas de cor e telas reais capturadas da demonstração. A UI interna não foi redesenhada. Sem logos de clientes, depoimentos, métricas de produtividade ou promessas comerciais inventadas.

Primeiro viewport: navegação compacta; à esquerda, “Seu time. Um lugar. Mais fluxo.” e CTA para a central; à direita, captura ampla do aplicativo em uma moldura azul. A página continua com exploração por abas, contexto de conversas/tarefas, timer demonstrativo acionável, versão web, FAQ e CTA final.

Interação principal: trocar as quatro telas pela vitrine com teclado ou clique; a demonstração do timer corre apenas localmente e informa que não registra horas. Navegação de downloads é uma troca real de página. Não há movimento contínuo decorativo; hovers são breves e respeitam movimento reduzido.

Capturas do produto vieram de `/demo`, `/demo/kanban` e `/demo/calendar`, usando dados fictícios. Foram convertidas em WebP e servidas localmente. Não foram usadas imagens dos sites de referência no produto final.
