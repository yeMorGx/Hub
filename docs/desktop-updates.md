# Aviso de atualização do Hub Windows

Solicitação: avisar dentro do aplicativo quando houver uma nova versão do instalador. A assinatura comercial de código permanece adiada pelo usuário.

## Atualizador nativo 0.1.3 — implementação de 21/10/2026

A versão 0.1.3 acrescenta o Tauri Updater para Windows x64. Depois que essa versão for compilada, publicada e instalada uma vez, o botão **Instalar e reiniciar** baixa o próximo pacote, verifica sua assinatura e inicia o NSIS em modo passivo. O instalador reabre o Hub ao concluir. O botão **Depois** fica desabilitado durante a operação; falhas permitem tentar novamente. Antes de confirmar, a interface pede para salvar o que estiver sendo editado.

As versões anteriores continuam com o download manual para permitir essa migração. Publicações apenas da interface continuam com **Aplicar melhorias**, que recarrega a janela; elas não substituem o executável. A aplicação ainda carrega a interface hospedada na Vercel.

O plugin é usado somente pelo Rust. A página recebe três comandos específicos, sem permissão genérica para configurar endpoints, trocar chaves, executar processos ou gravar arquivos. A origem do manifesto é fixa e o Rust aceita somente o instalador Windows x64 no repositório oficial, correspondente à versão anunciada. Instalações concorrentes e mudança de versão entre aviso e confirmação são recusadas. O pacote precisa passar pela verificação da chave pública embutida antes de ser executado. `requireSignedVersion=true` também exige que a versão anunciada corresponda à versão coberta pela assinatura.

### Preparação da assinatura

- Chave pública de atualização incluída em `src-tauri/tauri.conf.json`; a chave privada não é versionada nem enviada à Vercel.
- GitHub Actions precisa do secret **TAURI_SIGNING_PRIVATE_KEY**, contendo a chave privada correspondente. A chave gerada nesta implementação não tem senha; o secret opcional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` deve permanecer ausente/vazio.
- O GitHub recusou a configuração desse secret pela sessão atual com HTTP 403. O proprietário concluiu a configuração manual com o arquivo privado separado para backup. O build seguinte reconheceu o segredo; o valor privado não foi exibido nem incluído no repositório.
- A assinatura de atualização não é Authenticode: o certificado comercial do Windows continua sendo uma etapa distinta.
- Preserve a mesma chave privada nas próximas versões; não gere outra chave a cada publicação. Clientes existentes verificam os pacotes com a chave pública já instalada.
- O workflow valida a chave antes de compilar, assinando um arquivo de teste e verificando-o contra a chave pública do aplicativo. Isso detecta chave incorreta/formato inválido antes do build nativo. O valor corrigido passou nessa etapa no run `39636490719`.
- Builds novos geram `.exe` e `.exe.sig`; o fluxo de promoção só aceita artefatos com ambos, smoke aprovado e SHA-256 correspondente. O segredo fica restrito ao passo de build.
- `/api/desktop/manifest` fornece apenas a release estável mais recente com instalador e assinatura oficiais. Sem um par válido responde 204; falhas do provedor/assinatura respondem 503. O cliente verifica a assinatura independentemente da resposta HTTPS.

### Publicar as próximas versões com instalação pelo app

1. Incrementar a versão em `tauri.conf.json`, `Cargo.toml` e na entrada `hub-desktop` do `Cargo.lock`.
2. Executar o workflow desktop com a mesma chave de atualização. A validação da chave, o build, o smoke Windows e a verificação da assinatura do instalador precisam passar.
3. Criar o rascunho `desktop-vX.Y.Z` apontando para o SHA completo do run aprovado.
4. Executar o workflow com `publishRun` igual ao ID desse run. O promotor anexa o `.exe`, `.exe.sig` e `SHA256SUMS.txt`; ele não publica a release.
5. Conferir os artefatos e publicar a release estável mais recente. Atualizar `lib/desktop/public-release.ts` com versão, tamanho e hash reais, e publicar o frontend.
6. Conferir `/api/desktop/update` e `/api/desktop/manifest` em produção. Metadados do GitHub podem levar até cinco minutos para renovar no cache.

### Verificações e estado de entrega

- 29 testes unitários passaram, incluindo quatro novos casos de release assinada, manifesto, ausência de assinatura e limites/erros de leitura.
- Build Next.js e TypeScript passaram.
- `scripts/desktop-update-browser.py` passou em 1360px e 390px: modo automático, progresso, falha/nova tentativa, instalação, bloqueio de dispensa e compatibilidade com o instalador anterior. API/IPC simulados; não instala software.
- Verificação criptográfica local passou com um arquivo de teste assinado pela chave gerada: chave pública correspondente, rejeição de conteúdo adulterado e rejeição de versão divergente. O workflow repete a verificação com o instalador real antes de aprovar sua publicação.
- Servidor publicado no deployment `dpl_AeKU6PTGXj94NVZgXG9mPNQ6B5UW`, READY, no alias estável. 32 testes HTTP de produção passaram. `/api/desktop/manifest` respondeu 204, corretamente, enquanto a última release estável continua sendo a 0.1.2 sem assinatura de atualização.
- O ambiente Linux não contém `lib.exe`/MSVC para validar o executável Windows localmente. A verificação nativa no runner Windows passou no run `39632866622`, após adicionar a dependência direta `serde_json` necessária à configuração do plugin. Esse run foi interrompido pela ausência do segredo no momento em que foi iniciado; o build assinado foi iniciado separadamente após sua configuração.
- Build e smoke Windows **aprovados** no [run 39636490719](https://github.com/yeMorGx/Hub/actions/runs/39636490719), commit `424d90c0dddb33cb6aaa2bccdafc4fa2e1cba965`. Instalação, login renderizado, instância única, restauração por atalho, remoção e assinatura do pacote passaram, sem criar contas ou gravar dados de negócio.
- Promoção ao rascunho aprovada no [run 39638814285](https://github.com/yeMorGx/Hub/actions/runs/39638814285). Arquivos baixados após o upload conferidos novamente contra SHA-256 e chave pública; a release `desktop-v0.1.3` foi publicada como estável.
- [Baixar Hub 0.1.3 para Windows x64](https://github.com/yeMorGx/Hub/releases/download/desktop-v0.1.3/Hub_0.1.3_x64-setup.exe): 11.016.404 bytes, SHA-256 `a48fb048b5fff83f9c403ba5b15dcd1bcc2260a811fc899cd132b7cda46370f6`. A assinatura de atualização foi validada; Authenticode continua `NotSigned`. [Metadados e smoke](validation/desktop-updater/release.json).
- Central de downloads e FAQ atualizadas para 0.1.3 no deployment `dpl_D7PVrkXJ84xmc8yDceSuVgu8SBk1`, READY. 32 checks HTTP de produção passaram. `/api/desktop/update` e `/api/desktop/manifest` anunciaram 0.1.3; a assinatura do manifesto e o SHA-256 do download público foram conferidos contra o artefato aprovado.
- A atualização real entre dois instaladores assinados continua pendente de uma versão seguinte. A 0.1.3 é a primeira versão com o atualizador e exige instalação manual única a partir da 0.1.2. Os registros abaixo descrevem a entrega anterior 0.1.2.

## Comportamento anterior — 0.1.2

- Disponível a partir do instalador Windows **0.1.2**. O instalador anterior precisa ser substituído manualmente uma vez, pois não permite consultar sua versão nativa nem abrir o download pelo comando novo.
- Verifica releases do instalador na abertura, a cada hora e ao voltar ao foco. Builds do site são conferidos na abertura, a cada cinco minutos e ao voltar ao foco.
- Exibe um aviso sem bloquear o trabalho: versão disponível, **Baixar atualização** e **Depois**. Depois dispensa aquela versão pela sessão da janela; uma versão diferente pode ser anunciada.
- Baixar atualização abre o navegador padrão no instalador oficial. O usuário executa/confirma a instalação; não há download ou reinício automático. Se o navegador não abrir, aparece erro com possibilidade de tentar novamente.
- Também detecta uma publicação nova do site na abertura, a cada cinco minutos e ao voltar ao foco. O aviso **Atualizar agora** recarrega a janela do app; não baixa nem reinstala o executável.
- O site hospedado recebe alterações diretamente. O aviso de recarga compara builds web; o aviso de download compara versões nativas do instalador.
- Falhas de rede, indisponibilidade do GitHub e instaladores antigos não interrompem a aplicação. Nenhum aviso é mostrado no navegador web comum.

## Publicar uma versão — fluxo anterior 0.1.2

1. Incrementar conjuntamente `src-tauri/tauri.conf.json`, `Cargo.toml` e a entrada `hub-desktop` no `Cargo.lock`.
2. Compilar e passar a verificação Windows via `.github/workflows/desktop.yml`.
3. Criar um rascunho `desktop-vX.Y.Z`, vinculado ao commit testado, e anexar o instalador aprovado e SHA256SUMS pelo job `publish-draft`.
4. Após revisar a entrega, publicar a release estável no GitHub (desmarcar pre-release). Rascunhos e prévias não geram avisos.
5. A release deve ser a release estável mais recente do repositório e conter `Hub_X.Y.Z_x64-setup.exe`. A consulta usa `/releases/latest`; uma release mais recente de outra finalidade não será anunciada como atualização desktop.

O endpoint público `/api/desktop/update` consulta somente o repositório fixo `yeMorGx/Hub`, com cache de cinco minutos e timeout. Não usa credenciais. Só retorna a versão se a release estiver publicada, estável, com tag e arquivo estritamente correspondentes e URL no repositório oficial. O comando nativo aceita apenas três componentes numéricos; constrói a URL fixa e não aceita URLs arbitrárias. Não foram adicionadas permissões de shell/arquivos ao frontend.

O identificador público de build é gerado por `next.config.ts` para cada deployment, incluído no frontend e servido sem cache por `/api/app-version`. O app compara os dois identificadores a cada cinco minutos e ao voltar ao foco. Para começar a usar este aviso, o Hub aberto precisa carregar a versão do site que contém o verificador; basta fechar e abrir a janela uma vez, sem reinstalar.

Isto **não é o Tauri Updater**: não instala pacotes automaticamente e não substitui uma assinatura Authenticode. O instalador segue sem assinatura e poderá gerar avisos de editor desconhecido. O download usa HTTPS/GitHub; não há verificação criptográfica independente de pacote pelo cliente.

## Validação

- 21 testes unitários passaram, incluindo comparação numérica, rejeição de prévias/URLs externas/arquivo ausente e falhas do endpoint sem exposição de detalhes internos.
- Build Next.js passou.
- `scripts/desktop-update-browser.py`: Chromium com API/IPC simulados, larguras 1360 e 390, ausência de overflow, download, erro/nova tentativa, dispensa após recarregar, versão atual, navegador comum, legado e indisponibilidade. Não instala nada nem entra em conta.
- Capturas em `validation/desktop-updates/`. Revisão independente: **ship** restrito ao aviso e estados inspecionados. Documentação visual revisada: extensão da identidade existente, sem mudança no DESIGN.md.
- Abertura real do navegador/download pelo botão ainda depende de teste em computador Windows com 0.1.2 e uma release estável futura. O smoke nativo testa instalação, renderização do login, instância única, restauração por atalho e desinstalação, não o fluxo de atualização completo.

## Entrega 0.1.2 concluída

- [Baixar prévia no rascunho GitHub](https://github.com/yeMorGx/Hub/releases/tag/desktop-v0.1.2), exige acesso ao repositório. Escolher `Hub_0.1.2_x64-setup.exe` em Assets. Não foi publicada como release estável, portanto não gera aviso.
- [Build nativo e smoke aprovados](https://github.com/yeMorGx/Hub/actions/runs/39495085346), commit `a2d66eda75ea43e4c8492aad77c017cb0e5db2ea`. Instalador com 2.313.817 bytes, `NotSigned`; instalação, login renderizado, instância única, restauração e desinstalação passaram. Relatório e captura em `validation/desktop-updates/`.
- [Promoção ao rascunho aprovada](https://github.com/yeMorGx/Hub/actions/runs/39495970727). Download do asset conferido contra SHA-256 `454cd533dc657f2d61fa3d9c6454d783ef35bb955288d4c0430fc27647fbed93`.
- Site publicado, deployment `dpl_JBCDMs73S3p3jvu33YaKJucxBaYR` READY. 29 checks HTTP públicos passaram. `/api/desktop/update` retornou 200 com `release: null`, conforme a ausência de uma release desktop estável publicada. Nenhum rascunho/pre-release é anunciado.
- Permanece pendente o teste real do botão de download entre duas versões publicadas. Não houve instalação automática nem validação de Authenticode reconhecido.

## Publicação para o site de downloads

A release `desktop-v0.1.2` foi publicada como release estável pública para atender ao pedido de uma landing page com download sem login. O instalador e seu SHA-256 permanecem os mesmos da prévia testada. As referências a rascunho acima descrevem a entrega anterior. A partir desta publicação, ela pode ser anunciada pelo endpoint de atualizações para clientes compatíveis com versão menor. [Site e validação](marketing-research.md).

## Barra de título Windows — implementação 0.1.4 pendente de publicação

A versão nativa preparada é **0.1.4**. Ainda não há publicação desta versão: CI e verificação real dos controles no Windows permanecem gates da release. Os registros de publicação da 0.1.3 acima continuam sendo o estado da distribuição estável.

A nova barra de 36px integra marca Hub, legenda “Seu espaço de trabalho” e contador de mensagens não lidas extraído do título da página. Em Hoje, acompanha o marfim, azul profundo e Inter da superfície plana. A remoção de bordas decorativas pertence somente ao dashboard; outras autoridades visuais permanecem próprias.

- **Controles:** minimizar, maximizar/restaurar e fechar acionam a janela real. A área da marca inicia arraste; duplo clique alterna maximização. Os botões têm nomes acessíveis e foco visível, e o estado maximizado atualiza ícone e rótulo.
- **Contrato Rust:** `desktop_titlebar` aceita apenas `state`, `enable`, `restore`, `minimize`, `toggle_maximize`, `close` e `drag`, na própria janela `main`. Não aceita rótulos de janelas nem operações arbitrárias. Somente Windows informa suporte.
- **Ativação:** a moldura nativa permanece até a interface confirmar suporte e montar os controles substitutos; então `enable` remove as decorações. Navegador comum, plataformas não Windows e instaladores antigos sem o comando mantêm seus controles nativos.
- **Recuperação:** falha ao ativar oculta a barra; erro em uma ação tenta restaurar as decorações nativas antes de ocultá-la. A desmontagem também tenta restaurá-las. O início de cada navegação restaura a moldura pelo Rust, inclusive quando a página seguinte falha ou fica offline.

Build Next.js, TypeScript e 29 testes unitários passaram. `scripts/dashboard-browser.py` passou em produção local (`http://127.0.0.1:3005`) a 1440px, 1280px e 390px, sem overflow, erros JavaScript ou gravações de negócio. `scripts/desktop-titlebar-browser.py` passou com web, legado e Windows simulado, cobrindo controles, arraste, não lidas e ausência de bordas visíveis no dashboard renderizado. Capturas: `.impeccable/review/dashboard-flat/1440.png`, `390.png`, `desktop-titlebar.png` e `focus-1440.png`. Revisão visual independente: **`ship`**, sem achados materiais; detector Impeccable indisponível.

Essas verificações usam API/IPC simulados e não executam controles reais do Windows, instalação ou atualização entre executáveis. O CI nativo e a comprovação de minimizar, maximizar/restaurar, fechar, arrastar e recuperar a moldura no Windows precisam passar antes da publicação da 0.1.4. Não constituem validação de autenticação, persistência ou acessibilidade completa.
