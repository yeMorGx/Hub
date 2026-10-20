# Validação das Fases 2–5

Data: 2026-10-20 UTC. Autorização explícita do usuário para criar/executar testes já registrada na conversa. Os testes não criam contas reais, não enviam e-mails e não alteram registros de negócio na produção.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| `npm run build` | Passou: Next 16.4.2, TypeScript e rotas | [Build](validation/phases-2-5/build.log) |
| `npm test --prefix supabase/tests` | 82 testes SQL; zero falhas/skips | [SQL](validation/phases-2-5/sql.log) |
| `node --import tsx --test --test-reporter=tap scripts/unit.test.ts` | 10 casos; zero falhas/skips | [TAP](validation/phases-2-5/unit.tap) |
| `HUB_APP_URL=http://127.0.0.1:3001 npm run test:public` | 24 testes HTTP; zero falhas/skips | [HTTP local](validation/phases-2-5/http-local.log) |
| `HUB_APP_URL=http://127.0.0.1:3001 python3 scripts/browser-smoke.py` | 7 testes Chromium; zero falhas | [Navegador](validation/phases-2-5/chromium.log) |
| Capturas em 1440×1000 e 390×844 | 16 capturas abertas; zero erros JS; sem overflow da raiz na tela de chamadas em ambos os tamanhos | [Checks](validation/phases-2-5/capture-checks.json), [.impeccable/review/phases-2-5](../.impeccable/review/phases-2-5/) |
| Revisão visual independente | `ship` somente para demo/offline capturados | [Parecer](../.impeccable/review/phases-2-5/finish-review.md) |
| Tauri Windows x64, macOS ARM64, Linux amd64 | Três jobs concluídos; instaladores baixados e hashes registrados; não executados | [Workflow](https://github.com/yeMorGx/Hub/actions/runs/39365001709), [Hashes](validation/phases-2-5/desktop-artifacts.json) |
| Supabase remoto | 32 tabelas públicas, 32 com RLS habilitado | Consulta somente de metadados; nenhum conteúdo de usuário lido |
| `hub-webhook` publicado | ACTIVE v1; POST sem token retornou 403 | Solicitação sem credenciais a UUID inexistente; nenhuma mensagem criada |

## O que as verificações demonstram

SQL cobre isolamento por workspace/time/canal, MFA, papéis, timer e sobreposição, eventos/RSVP, Kanban, threads/menções/anexos, edição por versão, relatórios, metas, aprovação de ausências e trocas, auditoria, webhook idempotente, credencial cifrada, leases, workers de serviço, roster de chamadas e restauração de evento cancelado. PGlite executa PostgreSQL com contratos mínimos simulados de Auth/Realtime/Storage; não é a stack Supabase completa.

Os dez unitários cobrem parser de comandos/datas, AES-GCM e adulteração, state/PKCE, URLs OAuth, exportação Google sem convites/ETag, cancelamento Outlook, paginação restrita ao Graph, renovação de token e remoção de identidades não autorizadas na sala. Provedores e LiveKit são mocks, sem tráfego autenticado real.

Chromium cobre os fluxos públicos existentes, leitor offline (cifra sem texto claro no IndexedDB, senha e conta erradas, desbloqueio sem conexão) e geração/download CSV/PDF das fixtures. Nenhum teste contorna o gate de `/`.

## Regressões encontradas e corrigidas

- Teste antigo do fallback offline esperava o texto anterior: atualizado para validar o leitor e os assets públicos permitidos.
- Estilo da navegação da demo atingia as abas internas; escopo corrigido e confirmada a composição horizontal.
- Grid móvel da demo expandia a raiz em quatro pixels: corrigido com `minmax(0, 1fr)` e largura mínima do aside.
- Seletores iniciais do script de captura foram alinhados aos nomes acessíveis dos botões. A rodada final concluiu as 16 capturas.
- Uma execução unitária sob restrição resumiu apenas o arquivo: não foi usada como comprovação dos dez casos. A execução final em TAP confirma explicitamente os dez casos e suas contagens.

## Fora do escopo validado

Cadastro/confirmação por e-mail, TOTP/AAL2 real, colaboração entre duas contas, Realtime autenticado, upload/áudio reais na stack Storage, OAuth/calendários externos, login Microsoft, push, chamadas reais, instalação PWA em iOS e execução dos instaladores. Credenciais externas e autorização específica de push continuam pendentes conforme [ativação](service-activation.md). Não afirmar que todas as fases estão operacionalmente concluídas.
