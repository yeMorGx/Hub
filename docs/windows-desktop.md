# Hub para Windows

## Escopo desta entrega

Prévia **0.1.1**, Windows x64, instalador NSIS em português do Brasil, por usuário. O aplicativo abre o Hub em https://hub-one-azure.vercel.app no WebView2. A instalação precisa de conexão, inclusive para obter WebView2 se ele ainda não estiver disponível. Alterações do site chegam pelo mesmo endereço; alterações nativas exigem novo instalador. Não há atualizador nativo automático nesta versão.

O usuário escolheu Windows e informou não possuir certificado de assinatura. Esta é uma entrega **sem assinatura de código**. HTTPS do site e assinatura Authenticode do executável são mecanismos distintos. Não foi comprado certificado, contratado serviço nem gerada identidade de editor confiável.

## Funcionalidades nativas

- Janela única: abrir novamente o executável traz a janela existente.
- **Ctrl+Shift+H** restaura a janela e alterna o timer quando há sessão autenticada, MFA e participação ativa no time. Na tela de login, apenas restaura a janela. Um conflito do atalho no sistema não impede a abertura do app.
- Indicador de não lidas na barra de tarefas Windows usa **overlay icon**; a API `setBadgeCount` não é suportada no Windows. O indicador é limpo ao zerar as não lidas/sair e os recursos de imagem são liberados. Em outras plataformas, o caminho de badge anterior foi preservado, sem nova validação nativa delas nesta etapa.
- Compartilhamento de tela no Windows usa a API **Windows Graphics Capture** com seletor de janelas/monitores e prévia no Hub. A imagem é convertida para vídeo e publicada por um participante LiveKit nativo, separado do participante de áudio/vídeo. O token nativo só pode publicar a faixa de tela; a checagem de roster trata essa identidade como a pessoa autenticada, então a revogação de acesso remove os dois participantes. Câmera e microfone continuam na chamada principal.
- As permissões Tauri se limitam ao domínio oficial e a eventos, badge/overlay, criação e descarte de imagens. Não foi adicionada permissão de leitura de arquivos ou execução de comandos pelo frontend.

## Instalar e usar

1. Baixar a prévia do instalador pelo artefato indicado no resultado desta entrega.
2. Conferir o SHA-256 contra o registro do build. No PowerShell: `Get-FileHash .\Hub_0.1.1_x64-setup.exe -Algorithm SHA256`.
3. Executar o instalador e abrir Hub pelo menu Iniciar.
4. Entrar com a conta já existente e confirmar MFA. Os dados são os mesmos do Hub web, mas o armazenamento de sessão é separado do navegador.
5. Validar timer pelo atalho e o indicador de não lidas com duas contas. Essas ações usam dados reais.

A prévia sem assinatura pode aparecer como **Editor desconhecido** e gerar aviso de reputação. Uma assinatura reconhecida depende de certificado/serviço de assinatura de código apropriado. Arquivos PFX, chaves e senhas não devem ir ao repositório nem ao chat. Não foi implementada assinatura fictícia/autossinada como substituto de uma identidade reconhecida.

Para remover: **Configurações do Windows → Aplicativos → Hub → Desinstalar**. A remoção do executável não exclui a conta nem os dados do time no Supabase. O teste automatizado verifica remoção do binário, sem afirmar eliminação de todo dado local.

## Compilação e verificações

Workflow `.github/workflows/desktop.yml`: pushes relevantes compilam Windows; execução manual aceita `windows` ou `all` para as três plataformas. Usa `npm ci` e Rust estável; os artefatos incluem o instalador, Cargo.lock gerado e evidências. Os artefatos do Actions expiram após 14 dias.

`./scripts/windows-smoke.ps1` roda no runner Windows com uma pasta temporária: instala em silêncio, abre o app, procura o título da tela de login pela automação de acessibilidade, verifica segunda instância e restauração pelo atalho e desinstala. Não entra em conta, não cria usuários e não tenta iniciar timer autenticado. SHA-256 e estado Authenticode são registrados.

`python scripts/desktop-badge-browser.py` usa IPC Tauri simulado no Chromium e verifica os caminhos Windows/macOS e descarte das imagens; não demonstra o indicador em um Windows real com conta autenticada. Para reproduzir, compilar `scripts/fixtures/desktop-badge.ts` com esbuild em `/tmp/hub-desktop-badge-fixture.js` antes de executar o script.

Ainda exigem validação manual no computador do usuário: login/MFA real, timer com horas reais, indicador alimentado por mensagens reais, microfone/câmera/tela no WebView2 e políticas do Windows instalado. O teste de conta Microsoft foi adiado pelo usuário. Este empacotamento não implementa OAuth nativo por navegador externo/deep link.

## Resultado da entrega

- [Rascunho com instalador e SHA256SUMS](https://github.com/yeMorGx/Hub/releases/tag/untagged-fdbab96ffab6178ad2f2). Assets: `Hub_0.1.1_x64-setup.exe` e `SHA256SUMS.txt`. O rascunho exige acesso ao repositório; não foi publicado como release público.
- [Workflow nativo aprovado](https://github.com/yeMorGx/Hub/actions/runs/39451467705), fonte `1727770`: instalação, janela, login renderizado via UI Automation, instância única, restauração pelo atalho e remoção do binário passaram.
- Instalador com **2.315.527 bytes**, assinatura Windows **NotSigned**. [Hash](validation/windows-desktop/SHA256SUMS.txt), [relatório](validation/windows-desktop/native-smoke.json) e [captura real](validation/windows-desktop/windows-login.png).
- Os assets foram anexados pelo [workflow de rascunho](https://github.com/yeMorGx/Hub/actions/runs/39452866615), que só aceita um run de instalação concluído neste repositório/branch, relatório nativo aprovado, hash correspondente e rascunho vinculado ao mesmo commit. O job possui escrita em conteúdo só para essa operação e não publica a release. O upload inicial pela CLI local foi recusado no host de uploads; o workflow autenticado concluiu o envio.
- O Cargo.lock foi copiado do mesmo build aprovado para preservar as versões resolvidas. A compilação usou exatamente esse conjunto de dependências; a fixação posterior não altera a fonte nativa empacotada.
- Build web, 18 unitários e mocks IPC Windows/macOS passaram. O frontend atualizado foi publicado em `dpl_75Pdia5EWHUvh2dwpsKaqcmY7xHP` READY e os 29 HTTP de produção passaram.

Assinatura reconhecida e teste autenticado no computador do usuário permanecem pendentes. O certificado foi explicitamente informado como indisponível; esta entrega não afirma assinatura ou eliminação de avisos do Windows.

## Compartilhamento nativo de tela

O app lista monitores e janelas visíveis, exclui janelas do próprio Hub, captura uma imagem de prévia ao selecionar uma fonte e publica vídeo com os perfis equilibrado (1080p/30), fluido (1080p/60) ou nítido (até 1440p/60). O Windows Graphics Capture fornece os quadros; LiveKit Rust publica apenas `SCREEN_SHARE`, sem assinatura de outras faixas nem dados. O contorno de captura do Windows permanece no padrão do sistema como indicador visível.

O token de curta duração é emitido após a validação de sessão MFA, associação ativa e participação no canal. A rotina de remoção de participantes autorizados também reconhece `hub-share:<user-id>` e encerra a transmissão quando a pessoa perde acesso. Em navegadores, permanece o seletor de captura web. A validação de uma chamada Windows real e a qualidade medida em hardware do usuário ainda estão pendentes.

## Avisos de novas versões

O instalador 0.1.2 adiciona consulta de versão e abertura controlada do download para [avisos de atualização dentro do app](desktop-updates.md). A migração de 0.1.1 para 0.1.2 precisa ser feita manualmente uma vez. A consulta só anuncia releases estáveis publicadas; rascunhos não disparam o aviso. A instalação permanece manual, sem assinatura e sem reinício automático.


## Correção de vídeo 0.1.8

A captura nativa Windows entregava bytes R,G,B,A, mas usava `RGBAToI420` do libyuv, cujo nome descreve a ordem em um registrador (A,B,G,R na memória little-endian). Isso fazia o alfa ser interpretado como vermelho. A conversão agora usa `ABGRToI420`, respeita o `row_pitch` do Windows e mantém o alfa fora das cores transmitidas. Referência: [formatos oficiais do libyuv](https://chromium.googlesource.com/libyuv/libyuv/+/HEAD/docs/formats.md#the-argb-fourcc).

Para reduzir custo por quadro, a transmissão converte diretamente o buffer mapeado para I420, sem copiar/desempacotar RGBA. Quando necessário, redimensiona os planos YUV com o caminho nativo WebRTC/libyuv em vez de `image::resize` sobre quatro canais. Prévia PNG mantém o caminho de imagem existente. Os timestamps representam a captura antes do processamento; o intervalo de captura usa precisão de nanossegundos para 30/60 FPS. Os perfis e limites de bitrate permanecem existentes.

Três testes Windows cobrem preto/branco/cores primárias, independência do alfa, padding de linha, dimensões ímpares e redução de resolução. O [workflow Windows 40035833197](https://github.com/yeMorGx/Hub/actions/runs/40035833197), fonte `1024e70`, passou: 5 testes nativos (3 de vídeo e 2 de timer), instalação/abertura/controles/remoção e verificação criptográfica do atualizador. A [promoção 40036436854](https://github.com/yeMorGx/Hub/actions/runs/40036436854) conferiu proveniência e checksum antes do upload. A primeira execução compilou o instalador, mas parou por falta de import do trait no teste; o import foi corrigido antes da execução aprovada. A [release estável 0.1.8](https://github.com/yeMorGx/Hub/releases/tag/desktop-v0.1.8) contém instalador de 11.254.143 bytes, SHA-256 `b23c9c4248175a9d1b3264a04c255c9bd0fe25e4909749e7b62f5ad70cf5ec28`. A assinatura do atualizador foi verificada; Authenticode permanece `NotSigned`. Os 61 testes unitários da aplicação e o build Next.js também passaram. Fluidez e latência de uma chamada real ainda dependem de CPU, rede e validação no computador do usuário; os testes de pixels não medem FPS de ponta a ponta.


## Qualidade e FPS do compartilhamento — 0.1.9

A publicação nativa herdava `simulcast: true`. No SDK Rust 0.9.6, [`compute_default_simulcast_preset`](https://docs.rs/livekit/0.9.6/livekit/options/screenshare/fn.compute_default_simulcast_preset.html) cria uma segunda camada de tela com metade da largura/altura e apenas **3 FPS**. No perfil 1440p/60 e 12 Mbps, essa camada fica em 720p/3 e 150 kbps. Com assinaturas adaptativas, um vídeo exibido menor pode receber essa camada mesmo com o perfil alto selecionado. Isso é um caminho confirmado no código do SDK; não é uma medição da chamada do usuário.

A versão 0.1.9 publica **uma única camada** de tela, tanto no Windows quanto no navegador, impedindo a seleção daquela camada reduzida e removendo o custo de um segundo encoder no compartilhamento nativo. Os tetos de bitrate passam a 6 Mbps (1080p/30), 12 Mbps (1080p/60) e 20 Mbps (1440p/60). O perfil fluido prioriza FPS, o nítido prioriza resolução e o equilibrado permite ambos. Não há ampliação artificial de uma fonte menor que o perfil.

O custo é maior tráfego para espectadores com janelas pequenas; o controle de congestionamento do WebRTC continua ativo e pode reduzir qualidade/FPS. O número 60 é uma meta máxima, não garantia de FPS recebido. Continuam necessárias medições reais de captura, encoding, rede e decodificação no PC caso o problema persista. Testes de regressão exercitam a geração real de camadas RTP do SDK em todos os perfis e as opções publicadas pelo cliente web.
