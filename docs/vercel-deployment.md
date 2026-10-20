# Publicação na Vercel

## Entrega publicada

- URL estável: **https://hub-one-azure.vercel.app**
- Projeto: `yemorgxs-projects/hub`, plano Hobby existente.
- Deploy: `dpl_Fm4cZFeJNGjHZaPs4Ffdc13uiHkX`, alvo `production`, estado `READY`.
- URL imutável: https://hub-7j5hi4h4t-yemorgxs-projects.vercel.app
- Painel: https://vercel.com/yemorgxs-projects/hub

O usuário autorizou a publicação e concluiu o login oficial da Vercel. Foi criado um projeto separado chamado `hub`; nenhum dos outros projetos da conta foi alterado. O deploy foi feito pela CLI 64.7.0, a partir da branch da aplicação. Não houve merge em `main`, compra de domínio ou ativação de plano pago.

## Configuração e pacote

`vercel.json` fixa o preset `nextjs`, instalação `npm ci` e build `npm run build`. `.vercelignore` exclui apenas os diretórios de suporte na raiz: docs, capturas, skills, scripts e SQL. `lib/supabase` permanece incluído. Arquivos `.env*`, `.git`, `.vercel` e caches não são enviados.

O dry run conferiu 52 arquivos, aproximadamente 480 KiB, com todos os utilitários Supabase necessários e sem os caminhos excluídos. `.vercel` também foi incluído no `.gitignore`.

Foram cadastradas em Production e Preview somente as duas variáveis exigidas pelo app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

São configuração pública da aplicação. Nenhuma chave administrativa do Supabase foi configurada no frontend. O arquivo local de ambiente não foi enviado. A sessão da CLI e seus artefatos de autenticação não estão versionados.

## Evidência

O build remoto instalou as dependências pelo lockfile, compilou Next.js 16.4.2, passou no TypeScript e gerou todas as rotas. O deploy terminou em `READY` e recebeu o alias público acima.

`NODE_USE_ENV_PROXY=1 HUB_APP_URL=https://hub-one-azure.vercel.app npm run test:public` passou com **16 testes, zero falhas/skips**. [Log HTTP da publicação](validation/vercel/http.log).

Os checks usam consultas anônimas: redirecionamento para login, cabeçalhos sem cache, callbacks inválidos, manifest, dimensões PNG dos ícones, service worker, página offline e HTML das demonstrações. Não criaram contas nem enviaram e-mails. Os 59 cenários SQL e os cinco cenários Chromium anteriores continuam sendo evidência local, conforme o [relatório de validação](validation-2026-10-20.md).

## Primeiro acesso: configuração ainda necessária

A interface MCP disponível não oferece edição das configurações de Auth/Realtime. Elas não foram alteradas por esta publicação.

Abra [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/mjaidgzqsztwygdyzkeq/auth/url-configuration) e configure:

| Campo | Valor |
| --- | --- |
| Site URL | `https://hub-one-azure.vercel.app` |
| Redirect URL | `https://hub-one-azure.vercel.app/auth/callback` |
| Redirect URL para recuperação | `https://hub-one-azure.vercel.app/auth/callback?next=/reset-password` |

Salve antes do cadastro. Os templates padrão usam o fluxo PKCE de `/auth/callback`; templates por token devem seguir as instruções de `supabase-app-integration.md`. O cadastro por e-mail está habilitado, com confirmação obrigatória.

Em Realtime → Settings, confira/desative **Allow public access** antes do piloto. A aplicação já usa rooms privados. Ainda precisam ser exercitados com pessoas reais: confirmação de e-mail, TOTP/AAL2, gravações na interface e entrega Realtime entre duas contas.

Após configurar as URLs, abra [o login](https://hub-one-azure.vercel.app/login), crie a conta, confirme o e-mail e configure o autenticador. [Guia completo de primeiro acesso](first-access.md).

## Atualizações futuras

A hospedagem foi feita por upload da CLI, sem conectar deploy automático ao GitHub. `main` ainda contém o commit inicial; conectar Git sem escolher a branch correta pode tentar publicar essa base incompleta. Revise o PR da aplicação e defina a estratégia de branch antes de ativar deploys automáticos.
