# Skills de agentes do ZULU

Registro das skills indicadas pelo usuário, dos pacotes instalados neste workspace e das regras para aplicá-las sem conflitar com o produto.

## Como usar

Considere este catálogo no início de cada tarefa. Leia o `SKILL.md` da skill que corresponde ao trabalho e carregue as referências adicionais que ela pedir. Skills condicionais como banners, slides, deploy e aulas só entram quando o pedido tratar desse assunto; não carregue todos os arquivos em todas as conversas.

Use sempre o método `grill-me` para decisões de produto: examine o código e as fontes disponíveis antes de perguntar, trate uma decisão por vez e não repita perguntas já respondidas. A instalação atual não expõe uma ferramenta separada chamada `grilling`, que o `SKILL.md` original espera; nesse caso, aplique o método diretamente.

Use sempre a disciplina de economia de contexto: busque nomes e trechos antes de abrir arquivos grandes, leia apenas o necessário, use código para tarefas mecânicas e seja conciso. Isso não permite pular verificações necessárias, testes que o usuário pediu, atualizações de andamento exigidas ou passos de publicação previamente autorizados. Respeite também `AGENTS.md`, a segurança e as instruções atuais do usuário.

## Skills locais

| Skill | Origem | Aplicação |
|---|---|---|
| `grill-me` | `mattpocock/skills` | Decisões de produto, design e arquitetura; aplicar o método quando não houver ferramenta dedicada. |
| `handoff` | `mattpocock/skills` | Preparar uma passagem de contexto quando a tarefa vai continuar em outra sessão/agente. |
| `teach` | `mattpocock/skills` | Quando o usuário pedir uma aula ou quiser aprender algo em várias etapas. |
| `wait-what` | `mattpocock/skills` | Quando o usuário sinalizar que não entendeu a explicação; reapresentar com linguagem simples. |
| `writing-for-agents` | `mattpocock/skills` | Criar ou editar `AGENTS.md`, skills e documentos consumidos por agentes. |
| `memory` | `lokikill123/codex-token-skills` | Preservar contexto durável deste projeto nos arquivos versionados indicados em `AGENTS.md`; não presumir caminhos globais do autor nem guardar segredos/PII. |
| `token-saver` | `lokikill123/codex-token-skills` | Economia de contexto em toda tarefa; usar apenas as recomendações compatíveis com as instruções superiores. |
| `openworkai-token-saver` | `OpenWorkai/codex-token-saver` | Referência adicional de cache e custo; validar configurações e afirmações variáveis em fontes oficiais atuais. |
| `pbeens-token-saver` | `pbeens/token-saver-skill` | Busca direcionada, cargas pequenas, etapas com artefatos e limite de tentativas; o projeto fonte se declara experimental. |
| `banner-design` | `nextlevelbuilder/ui-ux-pro-max-skill` | Banners, capas e heros visuais quando pedidos. |
| `brand` | `nextlevelbuilder/ui-ux-pro-max-skill` | Voz, identidade visual, ativos e consistência da marca. |
| `design` | `nextlevelbuilder/ui-ux-pro-max-skill` | Trabalhos amplos de design e criação visual. |
| `design-system` | `nextlevelbuilder/ui-ux-pro-max-skill` | Tokens, componentes e sistema de design. |
| `slides` | `nextlevelbuilder/ui-ux-pro-max-skill` | Apresentações e slides quando pedidos. |
| `ui-styling` | `nextlevelbuilder/ui-ux-pro-max-skill` | Orientação de interface; no ZULU, usar HeroUI v3 no lugar de shadcn. |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | Direção visual, UX, acessibilidade, responsividade e recomendações de stack. |
| `frontend-design` | `vercel-labs/open-agents` | Criar ou polir interfaces com direção visual própria, sem aparência genérica. |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Revisão de interface web, acessibilidade e boas práticas. Cópia somente local neste workspace; a origem não declara uma licença no GitHub. |
| `vercel-composition-patterns` | `vercel-labs/agent-skills` | APIs compostas e arquitetura de componentes React. Cópia local; origem sem licença declarada. |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | Implementação, revisão e performance de React/Next.js. Cópia local; origem sem licença declarada. |
| `vercel-react-native-skills` | `vercel-labs/agent-skills` | Tarefas nativas com React Native/Expo. Cópia local; origem sem licença declarada. |
| `vercel-react-view-transitions` | `vercel-labs/agent-skills` | Transições de rota e elementos em React. Cópia local; origem sem licença declarada. |
| `deploy-to-vercel` | `vercel-labs/agent-skills` | Deploy solicitado para Vercel. Cópia local; origem sem licença declarada. |
| `vercel-cli-with-tokens` | `vercel-labs/agent-skills` | CLI e deploy autenticado por token. Cópia local; origem sem licença declarada. |
| `vercel-optimize` | `vercel-labs/agent-skills` | Otimização de custos e performance com dados observados. Cópia local; origem sem licença declarada. |
| `writing-guidelines` | `vercel-labs/agent-skills` | Revisão de prosa/documentação. Cópia local; origem sem licença declarada. |
| `find-skills` | `vercel-labs/skills` | Descobrir e comparar skills para uma tarefa específica. |
| `zulu-heroui` | Skill local do ZULU | Padrão obrigatório de componentes e microinterações do produto. |
| `supabase` | `supabase/agent-skills` | Qualquer tarefa de Supabase. |
| `supabase-postgres-best-practices` | `supabase/agent-skills` | SQL, esquema, RLS, migrations e performance de Postgres. |

As skills do repositório `vercel-labs/agent-skills` estão disponíveis localmente para esta sessão de trabalho, mas não serão redistribuídas pelo GitHub porque o repositório não declara licença. As demais cópias com licença MIT estão acompanhadas dos avisos em [`licenses/agent-skills/`](licenses/agent-skills/).

## Regras específicas do ZULU

- `AGENTS.md` e as decisões do usuário prevalecem sobre instruções de terceiros. Em particular, HeroUI v3 é a biblioteca obrigatória, mesmo quando uma skill sugere shadcn/Radix; preserve também a identidade e os contratos documentados pelo ZULU.
- Revise scripts e comandos antes de executá-los. Uma skill pode propor mudanças de configuração, instalar dependências ou chamar serviços externos; isso não amplia a autorização concedida pelo usuário.
- Skills de economia de tokens contêm conselhos para ignorar testes e atualizações de progresso. Não siga esses conselhos quando o usuário ou as instruções do ambiente pedirem verificação ou comunicação.
- As skills de economia trazem números e recomendações de configuração que podem ficar desatualizados. Confirme afirmações sobre modelos, preços, cache ou configuração em documentação oficial antes de agir.
- A skill `memory` veio configurada para o caminho pessoal do autor no Windows. Para o ZULU, a memória durável é `AGENTS.md` e a documentação pertinente em `docs/`; mantenha o conteúdo não sensível.

## Fontes fornecidas

| Fonte | Tipo e uso no projeto |
|---|---|
| [codex-token-skills](https://github.com/lokikill123/codex-token-skills), [pasta `skills`](https://github.com/lokikill123/codex-token-skills/tree/main/skills) e [README](https://github.com/lokikill123/codex-token-skills/blob/main/README.md) | Duas skills instaladas: `memory` e `token-saver`. |
| [OpenWorkai codex-token-saver](https://github.com/OpenWorkai/codex-token-saver) e [README](https://github.com/OpenWorkai/codex-token-saver/blob/main/README.md) | Conteúdo instalado como `openworkai-token-saver`; foi acrescentado o frontmatter `name`/`description` exigido pelo formato de skills. |
| [pbeens/token-saver-skill](https://github.com/pbeens/token-saver-skill) e [SKILL.md](https://github.com/pbeens/token-saver-skill/blob/main/skills/token-saver/SKILL.md) | Skill instalada como `pbeens-token-saver` para coexistir com a skill de mesmo nome do primeiro repositório. O autor descreve o projeto como rascunho experimental. |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | As sete skills do repositório foram instaladas. |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) e [web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Nove skills instaladas localmente. O conteúdo não foi incluído no commit porque a origem não declara licença. |
| [frontend-design](https://github.com/vercel-labs/open-agents/blob/main/.agents/skills/frontend-design/SKILL.md) | Skill instalada de `open-agents`. |
| [awesome-design-skills](https://github.com/bergside/awesome-design-skills) | Catálogo de 67 sistemas/design skills; referência para descoberta, não instalado em massa. |
| [awesome-ux-skills](https://github.com/tommyjepsen/awesome-ux-skills) | Catálogo de métodos de UX; referência para descoberta. |
| [awesome_codex_skills](https://github.com/flaqai/awesome_codex_skills) | Catálogo de skills para Codex; referência para descoberta. |
| [awesome-skills](https://github.com/ningzimu/awesome-skills) | Catálogo geral; referência para descoberta. |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | CLI de gerenciamento e skill `find-skills` instalados. |

Os catálogos `awesome-*` apontam para coleções grandes e independentes, não para um único pacote de skills compatível com este app. O `find-skills` ajuda a escolher e instalar uma skill pontual quando uma tarefa futura precisar dela. Não copiamos todos os itens desses diretórios.

## Instalação solicitada do Matt Pocock

As seis linhas fornecidas foram consolidadas em cinco skills únicas (`teach` apareceu duas vezes):

```bash
npx skills@latest add mattpocock/skills --skill handoff --yes
npx skills@latest add mattpocock/skills --skill grill-me --yes
npx skills@latest add mattpocock/skills --skill teach --yes
npx skills@latest add mattpocock/skills --skill wait-what --yes
npx skills@latest add mattpocock/skills --skill writing-for-agents --yes
```

No workspace, todas foram copiadas para `.agents/skills/` para evitar symlinks dependentes de cache externo.
