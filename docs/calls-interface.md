# Interface de chamadas ZULU

Registro da extensão de chamadas de 24/10/2026. A direção segue a família de colaboração já documentada em [collaboration-design.md](collaboration-design.md): moldura preta compacta, superfícies claras, tinta escura, lilás e tons pastel, tipografia Inter e controles HeroUI v3. A decisão do usuário exige composição própria do produto; a apresentação pronta `VideoConference` do LiveKit foi removida.

## Composição e contratos

- `components/call-surface.tsx` fornece cabeçalho, estado, contagem, alerta, palco, conversa e barra de ações. `CallAvatar` representa câmera desligada com iniciais, nome e indicação de microfone.
- `components/live-call-room.tsx` mantém a conexão LiveKit e adapta `VideoTrack`, `RoomAudioRenderer` e hooks de faixas, participantes, dispositivos, conexão e chat à composição ZULU. O SDK continua responsável pela mídia; nenhuma grade ou barra de controles pronta do provedor é renderizada.
- `app/calls-design.css` contém o acabamento e a responsividade. O desktop mantém conversa e participantes lado a lado; no celular, abrir a conversa ocupa a área central e preserva os controles. As ações de destaque ficam visíveis no toque. Hover, pressão e foco têm feedback breve; `prefers-reduced-motion` desliga animações e transições personalizadas.

Os controles em português permitem alternar microfone/câmera, escolher seus dispositivos, compartilhar e sair. A composição usa os adaptadores compartilhados `ZuluButton` e `ZuluInput`, `HubDialog` e Dropdown/RadioGroup oficiais. Os tipos e a implementação da versão instalada do HeroUI foram consultados: `Dropdown.Trigger` já renderiza um Button. O menu de dispositivos usa o `ZuluButton` diretamente como gatilho do Dropdown, sem aninhar botões. Esta entrega não afirma nova consulta remota à documentação HeroUI.

O estado textual do cabeçalho vem de `useConnectionState`: **Na sala**, **Conectando…**, **Reconectando…** ou **Desconectado**. Falhas de dispositivo, ação, captura e envio aparecem em alerta legível com fechamento explícito; fechar o aviso não altera o estado real da conexão. Microfone/câmera e envio ficam desabilitados enquanto a conexão não está pronta; sair permanece disponível.

A grade inclui placeholders de câmera e permite destacar uma faixa ou voltar à grade. Compartilhamento recebe destaque inicial automático e usa vídeo contido para preservar o enquadramento. O publicador auxiliar nativo com identidade `hub-share:` continua visível como faixa de tela, mas é excluído dos placeholders de câmera e da contagem de pessoas; seu sufixo de nome ` · tela` é removido na legenda.

A conversa usa `useChat` do LiveKit, mostra autor e mensagens, acompanha novas mensagens e indica não lidas enquanto fechada. O compositor aceita até 2.000 caracteres e apresenta falhas de envio. É uma conversa efêmera da sessão, sem novo armazenamento ou histórico persistente no banco.

## Captura preservada

`ScreenShareControl` preserva o fluxo existente. No navegador, o usuário escolhe janela/tela e qualidade antes do seletor de captura do sistema. No desktop Windows, mantém listagem e prévia nativas, autorização por `/api/livekit/token`, comandos Tauri e evento de encerramento. Perfis e opções de publicação permanecem em `lib/calls/screen-share.ts`.

Não houve alteração de implementação nativa, provedor, banco, migrações ou permissões nesta extensão visual. A interface não comprova qualidade de vídeo, FPS, latência ou estabilidade de rede.

## Evidência e reprodução

O registro `/tmp/zulu-call-qa/browser-final.log` declara aprovação em Chromium a **1440×1000** e **390×1000** para composição própria, alternância de mídia, seleção de dispositivo, envio de chat, abertura do seletor de compartilhamento, destaque/grade, reconexão simulada, fechamento de erro, saída, contenção horizontal e movimento reduzido. Não houve erro de página. O fixture substitui o adaptador LiveKit por mídia e estado determinísticos; `realMedia` é explicitamente `false`.

As oito capturas são `/tmp/zulu-call-qa/{call,chat,share,error}-{1440,390}.png`. A revisão visual registrada em `/tmp/zulu-call-qa/finish-review.md` recebeu **ship** para essas capturas e o código consultado, sem achado visual material. O launcher/detector Impeccable estava indisponível; o resultado é revisão manual.

`npm run test:unit` aprovou 62 testes, conforme `/tmp/zulu-call-qa/unit.log`. `npm run build` aprovou o build de produção e TypeScript, conforme `/tmp/zulu-calls-build.log` e o registro final `/tmp/zulu-call-qa/build-final.log`. Esses resultados não são testes de mídia real.

Para reproduzir o fixture a partir da raiz do repositório, com dependências instaladas, esbuild/Playwright disponíveis e Chromium em `/usr/bin/chromium`:

```bash
npm run build
mkdir -p /tmp/zulu-call-qa
npx esbuild scripts/fixtures/call-stage.tsx --bundle --platform=browser --format=iife --jsx=automatic --alias:@livekit/components-react=./scripts/fixtures/call-sdk.tsx --loader:.css=empty --outfile=/tmp/zulu-call-qa/fixture.js
node scripts/call-stage-browser.mjs
```

O script lê exatamente `/tmp/zulu-call-qa/fixture.js` e os arquivos CSS de `.next/static/chunks`; portanto requer um build anterior. O adaptador `scripts/fixtures/call-sdk.tsx` é exclusivo do fixture e não é importado pela aplicação. O script também ajusta a altura da sala e omite o shell autenticado: a contenção observada vale para os dois viewports capturados. Telas menores, teclado virtual, navegação completa por teclado, retorno de foco e leitores de tela não foram integralmente avaliados.

Não foram medidos câmera/áudio físicos, seleção real de hardware, entrega remota de chat, publicação/assinatura de mídia, recuperação real de conexão, captura Windows ou FPS/rede. Não houve novo release nativo. A publicação web e a conferência do endereço público são etapas da entrega coordenada e não estão comprovadas por este registro local.

## Divergência documental observada

`PRODUCT.md` ainda contém a descrição anterior de salas LiveKit dependentes de configuração externa e inativas. Este trabalho registra uma interface implementada e validada com fixture; não estabelece o estado atual do provedor em produção. A descrição deve ser conciliada em uma revisão documental própria com evidência operacional. `DESIGN.md`, `PRODUCT.md` e os registros `.impeccable` não foram reescritos nesta extensão.

## Política desktop nativa

O aplicativo instalado escolhe captura nativa pela presença do runtime Tauri, independentemente do user-agent. Uma falha de listagem, autorização ou captura nativa termina com erro explícito; não abre a captura do navegador. Builds sem suporte nativo retornam o erro da implementação Rust. A versão no navegador mantém seu seletor do navegador. Esta regra se aplica ao recurso de captura; não representa migração da interface Tauri para outro toolkit.

## QA do design do seletor de compartilhamento

A captura reportada em **870×921** expunha fontes ilegíveis sobre fundo escuro e radios esticados pela regra legada `label > span` com `flex: 1`. O acabamento em `app/calls-design.css`, limitado a `.screen-share-dialog`, define superfícies claras e texto contrastante, fixa os controles HeroUI v3 em **16×16 px** e organiza a qualidade em três colunas no desktop e uma no celular. O radio desmarcado usa borda de 1,5 px `#82768e` para contraste mínimo de 3:1; o contorno lilás indica foco por teclado. As referências consultadas foram as implementações instaladas de Radio/Modal do HeroUI v3 e a busca UX do UI/UX Pro Max por `radio control contrast modal`.

`HubDialog` e `DashboardDialog` aceitam um `footer` opcional, composto com `Modal.Footer` fora do `Modal.Body` rolável. O seletor usa esse rodapé para manter a ação de compartilhar visível no celular. A escolha de fonte, qualidade e os comandos nativos mantêm seus contratos.

O registro `/tmp/zulu-share-picker-verdict-browser.log` aprovou seis casos em Chromium: **1440×921**, **870×921** e **390×921**, cada um com sucesso e falha nativos simulados. `scripts/native-capture-routing-browser.mjs` verifica seis fontes, dimensões reais dos três radios, troca de qualidade, ação visível, foco por teclado, início/encerramento nativos e erro explícito sem captura do navegador. As capturas são `/tmp/zulu-call-qa/share-picker-{1440,870,390}.png` e `/tmp/zulu-call-qa/share-picker-focus-{1440,870,390}.png`. A prévia é sintética e identificada como **Prévia simulada**; esses casos não medem captura em um dispositivo Windows real nem comprovam aprovação visual final.

O build passou em `/tmp/zulu-share-picker-fix-build.log`; os 62 testes unitários passaram em `/tmp/zulu-share-picker-unit.log`. Para reproduzir, execute o build e o empacotamento do fixture descritos acima, depois:

```bash
npm run test:unit
node scripts/native-capture-routing-browser.mjs
```

A publicação e a conferência em produção pertencem à entrega coordenada; estes artefatos registram a validação local do seletor.

A revisão visual final pontuou as duas correções materiais como **resolvidas**: ações visíveis no celular e contraste de 3,76:1 na borda do radio desmarcado. O veredito limitado a essas correções está em [validation/share-picker/verdict.md](validation/share-picker/verdict.md). A regressão dos diálogos de calendário e das interações de chat/notificações também passou em 1440 e 390 px, sem erros de página ou avisos no console.
