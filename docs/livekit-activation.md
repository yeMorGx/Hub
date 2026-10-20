# Ativação de voz, vídeo e tela compartilhada

## Estado em 20/10/2026

O usuário escolheu avançar para chamadas e informou que ainda não criou um projeto LiveKit Cloud. A consulta aos nomes das variáveis Vercel Production confirmou ausência de `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`. Nenhuma conta, projeto pago ou assinatura externa foi criado pelo agente.

## Preparação entregue

- A sala usa `VideoConference`, que já inclui `RoomAudioRenderer` no SDK instalado. Removido o segundo renderer da aplicação para evitar reprodução duplicada de áudio remoto.
- O lobby diferencia falha ao consultar status, sessão expirada e serviço não configurado, com opção de repetir a consulta.
- A seleção lista apenas canais não arquivados com associação da própria pessoa. O servidor continua exigindo MFA, participação ativa e roster autorizado antes de emitir token.
- A verificação periódica de acesso cancela requisições ao sair da sala, evitando que uma resposta antiga encerre uma entrada posterior.
- A prévia pública exibe mensagem de demonstração e não consulta status autenticado nem tenta conectar a um provedor real.

## Próximo passo do usuário

1. Acessar https://cloud.livekit.io e criar sua conta.
2. Criar um projeto chamado **Hub**.
3. Avisar quando estiver no painel. A etapa seguinte será configurar as credenciais exclusivamente como variáveis de servidor na Vercel Production: `LIVEKIT_URL` (WebSocket URL), `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`. Não enviar segredos pelo chat ou colocá-los em variáveis `NEXT_PUBLIC_*`.

Após configurar, publicar novamente, conferir comunicação com a API de salas e validar entre duas contas reais do Hub: áudio, vídeo, compartilhamento de tela, recusa de permissões, saída/reentrada e perda de acesso. A configuração e uma chamada real ainda não foram concluídas.

## Verificações da preparação

- Build Next.js e TypeScript passou.
- 16 testes unitários passaram, incluindo remoção de participantes fora do roster e propagação de falhas do serviço.
- Lobby real exercitado em Chromium 1440×900 e 390×844, com respostas HTTP fictícias e componente de sala substituído: erros 503/401, configuração ausente, repetição, filtro de associação, erro ao entrar e encerramento por perda de acesso. Sem erros JavaScript ou uso de dispositivos reais.
- Scripts `scripts/fixtures/calls-lobby.tsx`, `scripts/fixtures/calls-room.tsx` e `scripts/calls-browser.py` só participam dessa fixture. Para reproduzir: compilar com esbuild, alias `next/dynamic` para `./scripts/fixtures/calls-room.tsx` e saída `/tmp/hub-calls-lobby-fixture.js`; depois executar o script Python com Playwright/Chromium. Não são parte da aplicação publicada.

[Logs](validation/livekit-preparation/). Os testes não comprovam qualidade de áudio, vídeo, compartilhamento ou conexão ao LiveKit real.

## Publicação da preparação

Código `f264930`, deployment `dpl_BQdHgMyoxdQsn9XgW5JuZNa8JK71` READY em https://hub-one-azure.vercel.app. 29 HTTP locais e 29 de produção passaram; `npx tsc --noEmit` passou com as fixtures incluídas. A prévia pública foi conferida no navegador: zero erros JS, zero consultas de status autenticado e zero escritas. Não há configuração LiveKit nem chamada real concluída.

## Tentativa de ativação com credenciais · 20/10/2026

O usuário criou projeto e cadastrou as três variáveis em Production. A presença dos nomes foi conferida sem retirar o segredo da Vercel. Uma verificação opt-in (`--build-env HUB_VERIFY_LIVEKIT=1`) autentica somente uma consulta de leitura à API de salas durante o build. Não cria salas, remove participantes ou publica informações das salas. O verificador é inativo em deploys sem essa flag.

A primeira consulta não autenticou; a repetição com diagnóstico explícito confirmou resposta **HTTP 401/403**. Dois deploys falharam antes do build Next.js e não substituíram o alias de produção. A configuração ainda não está ativada. 18 testes unitários e TypeScript passaram, incluindo distinção de falhas de autenticação/rede e ausência de dados sensíveis nos erros. [Evidência](validation/livekit-activation/).

**Dependência do usuário:** conferir a URL do projeto e substituir `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` na Vercel Production por um novo par obtido na página de API Keys desse mesmo projeto. Não usar token de participante, chave de outra integração ou credenciais de outro projeto. Depois de salvar, repetir o deploy com a verificação. Nenhuma chave deve ser enviada pelo chat.
