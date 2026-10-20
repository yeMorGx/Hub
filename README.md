# Hub

App instalável para comunicação, agenda e controle de horas do time.

**Publicado:** https://hub-one-azure.vercel.app · [Estado do deploy e primeiro acesso](docs/vercel-deployment.md).

O banco das Fases 0 e 1 e o incremento Kanban da Fase 2 estão aplicados no Supabase. O frontend segue a
referência escura da Shakuro escolhida pelo usuário. A rota principal agora
implementa login/MFA, onboarding e integração de horas, eventos, canais e
mensagens com o esquema existente. Tarefas agora inclui um quadro Kanban integrado.
As demonstrações fictícias ficam em `/demo` e `/demo/kanban`.

A integração passou na compilação; os fluxos autenticados ainda aguardam
validação com uma conta real. Configuração e limites estão no relatório abaixo.

- [Validação atual e correções](docs/validation-2026-10-20.md)
- [Publicação e primeiro acesso](docs/first-access.md)
- [Kanban da Fase 2: escopo, permissões e evidências](docs/phase-2-kanban.md)
- [Integração Supabase, Auth/MFA e PWA](docs/supabase-app-integration.md)
- [Entrega e execução do frontend](docs/frontend-delivery.md)
- [Pesquisa de referências](docs/frontend-research.md)
- [Sistema visual](DESIGN.md)
- [Visão e escopo fornecidos para o projeto](docs/project-vision.md)
- [Modelo de dados, permissões e evolução por fase](docs/database-design.md)
- [Aplicação no Supabase e resultados da validação](docs/supabase-validation.md)
- [Migração das Fases 0 e 1](supabase/migrations/20261019231555_phase_0_1.sql)
- [Testes do banco](supabase/tests/phase01.test.mjs)

## Rodar o frontend

Com Node.js 20.9 ou superior:

```sh
npm ci
cp .env.example .env.local
# Preencha URL e chave publishable do projeto.
npm run dev
```

Para compilar e executar a versão de produção: `npm run build` e
`npm run start`. As demonstrações não exigem conta nem credenciais; `/demo/kanban` usa somente memória.
A configuração pública deste workspace já está em `.env.local` (ignorado).

## Validar o banco localmente

Com Node.js 20 ou superior:

```sh
npm ci --prefix supabase/tests
npm test --prefix supabase/tests
```

Os 59 cenários atuais usam PostgreSQL via PGlite, sem Docker, serviço remoto ou
credenciais. Incluem as três migrações e as permissões/fluxos SQL do Kanban. O [script de validação SQL](supabase/tests/phase01.live.sql) também
foi executado no Supabase real: 28 verificações passaram e todas as fixtures
foram revertidas. Login/TOTP e entrega WebSocket estão implementados no app,
mas ainda precisam de validação ponta a ponta com contas reais.

## Aplicar ao Supabase

A migração destina-se a um projeto Supabase novo. Após configurar a CLI e
vincular o projeto escolhido, revise o SQL antes de executar `supabase db push`.
Ela usa os schemas `auth` e `realtime`, os papéis gerenciados pelo Supabase e a
publicação `supabase_realtime`. O schema `private` deve permanecer fora dos
schemas expostos pela API.

As três migrações locais, incluindo
[`20261020002608_phase_2_kanban.sql`](supabase/migrations/20261020002608_phase_2_kanban.sql),
já estão aplicadas no projeto
`mjaidgzqsztwygdyzkeq`, com os mesmos identificadores do histórico remoto.
O [relatório](docs/supabase-validation.md) registra os checks, os avisos dos
advisors e as validações que dependem da interface do app.

O Kanban passou na compilação e recebeu revisão visual da demonstração.
Permissões, concorrência, timer e Realtime ainda aguardam validação autenticada
ponta a ponta. A Fase 2 permanece parcial: chat avançado, standups, documentos
Markdown e lembretes ainda são futuros.
