# Validação do Hub — 19/10/2026, horário de São Paulo

Os nomes deste relatório e do diretório de logs usam a data UTC da execução: 20/10/2026.

## Resultado

Após autorização explícita do usuário para criar e executar testes automáticos:

| Camada | Execução | Resultado |
| --- | --- | --- |
| PostgreSQL local via PGlite | `npm test --prefix supabase/tests` | 59 cenários passaram; zero falhas, cancelamentos ou skips. |
| Rotas HTTP do build de produção local | `npm run test:public` | 16 testes passaram; zero falhas, cancelamentos ou skips. |
| Chromium, sem sessão | `python3 scripts/browser-smoke.py` | 5 testes passaram. |
| Build Next.js e TypeScript | `npm run build` | Passou após as correções. |

Logs finais: [banco](validation/2026-10-20/database.log), [HTTP](validation/2026-10-20/http.log) e [navegador](validation/2026-10-20/browser.log).

As execuções usam o banco local e o servidor local. Não houve teste funcional remoto, novas migrações, criação de contas reais, envio de e-mails ou gravação de dados de negócio no Supabase nesta etapa.

## Banco e Kanban

A suíte agora aplica todas as migrações numeradas antes das fixtures. Os checks estruturais foram atualizados para 14 tabelas com RLS, 30 RPCs e 10 tabelas na publicação Realtime. As 38 verificações anteriores continuam cobertas; foram adicionados 21 cenários de Kanban.

Cobertura nova: isolamento entre times/organizações, bloqueio de AAL1, ausência de escrita direta, permissões de criador/responsável/liderança, administrador sem participação, campos inválidos, projeto/responsável de outro time, versão desatualizada, arquivamento, vínculo entre tarefa e horas, timer único global, repetição idempotente, snapshot de título/projeto e revogação de associação.

A suíte também executa localmente o script histórico `phase01.live.sql`, com seus 28 checks e rollback de fixtures. Esses 28 checks estão dentro de um dos 59 cenários; não são uma nova execução no serviço remoto.

Claims Auth e contratos Realtime são simulados no PostgreSQL local. A rejeição de versões antigas foi verificada sequencialmente; disputas simultâneas entre duas conexões ainda não foram reproduzidas.

## Falhas encontradas e resolvidas

1. **Origem dos callbacks:** `request.url` podia conter o endereço de bind interno do Next (`0.0.0.0`). Os handlers agora retornam `Location` relativo, restrito a destinos literais do app. HTTP e Chromium confirmaram que um callback inválido volta ao login na origem aberta pelo navegador.
2. **Referrer dos callbacks:** o proxy sobrescrevia o `no-referrer` definido pelos handlers. Agora ambos os callbacks recebem `no-referrer`, inclusive no caminho de erro. Os quatro checks HTTP correspondentes passaram.
3. **Expectativas dos testes:** a demonstração antiga só mostra sua declaração após hidratação; o check HTTP agora verifica o HTML inicial e o Chromium confirma a declaração renderizada. Os seletores de alertas foram delimitados para não incluir o anunciador de rotas interno do Next.

O helper de redirecionamento também é usado nos caminhos de sucesso, mas troca de código PKCE e confirmação de token válido não foram exercitadas sem uma conta real.

## Navegador e PWA

Os cinco cenários verificam restrições do cadastro e visibilidade da senha, callback inválido, bloqueio da redefinição de senha sem sessão, demonstração após hidratação e fallback offline da PWA.

O teste de PWA aguarda o service worker ativo, desliga a rede do contexto, abre `/`, confere a página offline, inspeciona CacheStorage e restabelece a rede. Somente `offline.html`, ícones públicos e caminhos `/_next/static/` foram aceitos no cache observado. Isso não comprova instalação nativa em iOS/Android nem comportamento com uma sessão real.

Os testes de navegador abortam qualquer tentativa de escrita em `/auth/v1/` e falham caso haja uma. Formulários válidos não são enviados.

## Repetir

Com as dependências instaladas, execute a suíte SQL separadamente. Para HTTP/navegador, primeiro inicie um build de produção:

```sh
npm test --prefix supabase/tests
npm run build
npm run start -- --port 3000
```

Em outro terminal:

```sh
npm run test:public
python3 scripts/browser-smoke.py
```

O script de navegador exige Playwright para Python e Chromium. O ambiente desta execução já os possuía; o setup npm não os instala. `CHROMIUM_PATH` pode selecionar um binário instalado. `HUB_APP_URL` altera a origem dos checks HTTP/navegador; o padrão é o servidor local na porta 3000. Não aponte para outro serviço sem autorização.

## Pendências reais

A reinstalação com `bash scripts/setup.sh` também concluiu, e o build foi repetido com sucesso depois dela. Foram salvos `install_script` e `start_skill` no rascunho de configuração do ambiente. Esse salvamento não publica o ambiente nem hospeda o aplicativo; as instruções precisam ser revisadas/salvas e o ambiente republicado pelo usuário para ativação em tarefas futuras.

O usuário informou não ter conta nem URL pública do app. Continuam pendentes: hospedagem, Site URL e redirects do Auth, primeiro cadastro e e-mail, enrolamento/desafio TOTP, acesso AAL2, gravações pela interface, dois usuários em Realtime, revogação durante WebSocket e concorrência real. A configuração pública do Auth confirmou cadastro e provedor e-mail habilitados, com confirmação de e-mail obrigatória.

Consulte [publicação e primeiro acesso](first-access.md). Os resultados acima não aprovam produção ou a integração autenticada completa.
