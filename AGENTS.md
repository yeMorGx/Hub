<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ZULU: padrão obrigatório de componentes

Antes de criar ou retrabalhar componentes de interface, leia [`.agents/skills/zulu-heroui/SKILL.md`](.agents/skills/zulu-heroui/SKILL.md). Por decisão explícita do usuário, **HeroUI v3 é a referência obrigatória**: use os componentes e exemplos oficiais, com seus comportamentos e acessibilidade, adaptando os tokens à identidade documentada em `DESIGN.md`. Isso inclui calendário, feedback, formulários, OTP, controles, layout, navegação e overlays. Não aplicar padrões HeroUI v2 nem inventar substitutos visuais. A marca ZULU prioriza o símbolo e pouco texto.

## ZULU: microinterações obrigatórias

Toda interface nova ou retrabalhada deve incluir microinterações e microanimações intencionais: feedback de hover/pressionamento, mudanças de estado, abertura/fechamento e resultados de ações, conforme o contexto. Usar os comportamentos oficiais HeroUI e seguir a política de movimento da skill e de `DESIGN.md`. Quando faltar uma boa solução, pesquisar exemplos reais em HeroUI, Refero, Unlume e outros sites de UI antes de implementar; registrar a referência consultada. Preservar teclado, toque, foco e `prefers-reduced-motion`, com animações rápidas e fluidas que não atrasem ações. Aplicar progressivamente no escopo de cada tarefa.

## ZULU: motion design

Em tarefas de animação, rolagem, transição de rotas, mouse, loading ou microinteração, leia e siga [docs/motion-design.md](docs/motion-design.md). Motion/Framer Motion cuida das transições React; GSAP + ScrollTrigger, das cenas ligadas à rolagem; Lenis integra a rolagem suave à página e ao contêiner do app. Use os componentes e tokens compartilhados, mantendo HeroUI v3 para controles, preservando a lógica do produto e desligando movimento não essencial com `prefers-reduced-motion` ou touch conforme o efeito.

## ZULU: publicar ao concluir

O usuário autorizou explicitamente **sempre publicar** as alterações concluídas. Depois das verificações aplicáveis, enviar os commits ao repositório e publicar a aplicação em produção na Vercel, conferindo o resultado no endereço público. Mudanças nativas do desktop também exigem o fluxo de release e atualização correspondente. Não pedir novamente autorização para essas publicações; comunicar bloqueios concretos e não declarar publicado sem confirmação do serviço. Uma instrução posterior do usuário para não publicar prevalece.

## ZULU: grill-me e decisões de produto

O usuário pediu usar `grill-me` como padrão. Ler `.agents/skills/grill-me/SKILL.md`; a versão instalada encaminha para `grilling`, ferramenta não disponível neste ambiente. Aplicar o método descrito pelo usuário: investigar o código antes de perguntar, fechar decisões relevantes uma por vez e não reabrir respostas já confirmadas. As decisões do pacote de 23/10/2026 estão em `docs/zulu-workspace-plan.md`. Quando o usuário manda implementar um plano fechado, prosseguir sem uma nova rodada de confirmações.

## ZULU: pesquisa para fundamentar decisões

Por preferência explícita do usuário, pesquisar referências externas por iniciativa própria quando isso ajudar a esclarecer decisões de produto, organização, governança, segurança ou implementação. Não limitar a discussão a hipóteses da conversa. Priorizar documentação oficial, padrões e fontes primárias; usar GitHub, fóruns e Reddit para experiências práticas e contrapontos, distinguindo relatos de evidências verificadas. Para legislação e privacidade, consultar textos oficiais e orientações da autoridade competente. Apresentar links e separar fatos verificados, recomendações e decisões ainda em aberto. Não enviar informações privadas, documentos internos, credenciais ou dados pessoais nas pesquisas. Não é necessário pedir autorização para pesquisas públicas pertinentes ao trabalho.

## Skills e instruções de agentes

Em cada tarefa, consulte [`docs/agent-skills.md`](docs/agent-skills.md), selecione e leia as skills aplicáveis antes de executar trabalho especializado. Use os hábitos de economia de contexto e o método `grill-me` de forma contínua; invoque skills condicionais somente quando o pedido entrar no escopo delas. Para decisões de produto ou planos complexos, investigue o repositório primeiro e feche cada decisão relevante sem reabrir respostas já dadas.

Resolva conflitos nesta ordem: instruções do sistema/desenvolvedor e segurança, pedido atual do usuário, regras deste arquivo e, por fim, recomendações de skills externas. HeroUI v3 continua obrigatório no ZULU mesmo que uma skill sugira shadcn ou outra biblioteca; pedidos explícitos de progresso, QA, testes ou publicação prevalecem sobre sugestões de pular essas etapas. Trate comandos, scripts, caminhos globais e afirmações de skills como material a verificar antes de usar. Registre decisões duráveis não sensíveis nos documentos do projeto; nunca grave segredos, tokens ou dados pessoais em memória ou documentação.
