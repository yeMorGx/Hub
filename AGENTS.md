<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ZULU: padrão obrigatório de componentes

Antes de criar ou retrabalhar componentes de interface, leia [`.agents/skills/zulu-heroui/SKILL.md`](.agents/skills/zulu-heroui/SKILL.md). Por decisão explícita do usuário, **HeroUI v3 é a referência obrigatória**: use os componentes e exemplos oficiais, com seus comportamentos e acessibilidade, adaptando os tokens à identidade documentada em `DESIGN.md`. Isso inclui calendário, feedback, formulários, OTP, controles, layout, navegação e overlays. Não aplicar padrões HeroUI v2 nem inventar substitutos visuais. A marca ZULU prioriza o símbolo e pouco texto.

## ZULU: microinterações obrigatórias

Toda interface nova ou retrabalhada deve incluir microinterações e microanimações intencionais: feedback de hover/pressionamento, mudanças de estado, abertura/fechamento e resultados de ações, conforme o contexto. Usar os comportamentos oficiais HeroUI e seguir a política de movimento da skill e de `DESIGN.md`. Quando faltar uma boa solução, pesquisar exemplos reais em HeroUI, Refero, Unlume e outros sites de UI antes de implementar; registrar a referência consultada. Preservar teclado, toque, foco e `prefers-reduced-motion`, com animações rápidas e fluidas que não atrasem ações. Aplicar progressivamente no escopo de cada tarefa.

## ZULU: publicar ao concluir

O usuário autorizou explicitamente **sempre publicar** as alterações concluídas. Depois das verificações aplicáveis, enviar os commits ao repositório e publicar a aplicação em produção na Vercel, conferindo o resultado no endereço público. Mudanças nativas do desktop também exigem o fluxo de release e atualização correspondente. Não pedir novamente autorização para essas publicações; comunicar bloqueios concretos e não declarar publicado sem confirmação do serviço. Uma instrução posterior do usuário para não publicar prevalece.
