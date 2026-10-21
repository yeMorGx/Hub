# Aviso de atualização do Hub Windows

Solicitação: avisar dentro do aplicativo quando houver uma nova versão do instalador. A assinatura comercial de código permanece adiada pelo usuário.

## Atualizador nativo 0.1.3 — implementação de 21/10/2026

A versão 0.1.3 acrescenta o Tauri Updater para Windows x64. Depois que essa versão for compilada, publicada e instalada uma vez, o botão **Instalar e reiniciar** baixa o próximo pacote, verifica sua assinatura e inicia o NSIS em modo passivo. O instalador reabre o Hub ao concluir. O botão **Depois** fica desabilitado durante a operação; falhas permitem tentar novamente. Antes de confirmar, a interface pede para salvar o que estiver sendo editado.

As versões anteriores continuam com o download manual para permitir essa migração. Publicações apenas da interface continuam com **Aplicar melhorias**, que recarrega a janela; elas não substituem o executável. A aplicação ainda carrega a interface hospedada na Vercel.

O plugin é usado somente pelo Rust. A página recebe três comandos específicos, sem permissão genérica para configurar endpoints, trocar chaves, executar processos ou gravar arquivos. A origem do manifesto é fixa e o Rust aceita somente o instalador Windows x64 no repositório oficial, correspondente à versão anunciada. Instalações concorrentes e mudança de versão entre aviso e confirmação são recusadas. O pacote precisa passar pela verificação da chave pública embutida antes de ser executado. `requireSignedVersion=true` também exige que a versão anunciada corresponda à versão coberta pela assinatura.

### Preparação da assinatura

- Chave pública de atualização incluída em `src-tauri/tauri.conf.json`; a chave privada não é versionada nem enviada à Vercel.
- GitHub Actions precisa do secret **TAURI_SIGNING_PRIVATE_KEY**, contendo a chave privada correspondente. A chave gerada nesta implementação não tem senha; o secret opcional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` deve permanecer ausente/vazio.
- O GitHub recusou a configuração desse secret pela sessão atual com HTTP 403. Foi solicitada configuração manual ao proprietário, com arquivo privado separado para backup. Sem esse passo, não se pode concluir a geração dos pacotes assinados.
- A assinatura de atualização não é Authenticode: o certificado comercial do Windows continua sendo uma etapa distinta.
- Builds novos geram `.exe` e `.exe.sig`; o fluxo de promoção só aceita artefatos com ambos, smoke aprovado e SHA-256 correspondente. O segredo fica restrito ao passo de build.
- `/api/desktop/manifest` fornece apenas a release estável mais recente com instalador e assinatura oficiais. Sem um par válido responde 204; falhas do provedor/assinatura respondem 503. O cliente verifica a assinatura independentemente da resposta HTTPS.

### Verificações e estado de entrega

- 29 testes unitários passaram, incluindo quatro novos casos de release assinada, manifesto, ausência de assinatura e limites/erros de leitura.
- Build Next.js e TypeScript passaram.
- `scripts/desktop-update-browser.py` passou em 1360px e 390px: modo automático, progresso, falha/nova tentativa, instalação, bloqueio de dispensa e compatibilidade com o instalador anterior. API/IPC simulados; não instala software.
- Verificação criptográfica local passou com um arquivo de teste assinado pela chave gerada: chave pública correspondente, rejeição de conteúdo adulterado e rejeição de versão divergente. O workflow repete a verificação com o instalador real antes de aprovar sua publicação.
- Servidor publicado no deployment `dpl_AeKU6PTGXj94NVZgXG9mPNQ6B5UW`, READY, no alias estável. 32 testes HTTP de produção passaram. `/api/desktop/manifest` respondeu 204, corretamente, enquanto a última release estável continua sendo a 0.1.2 sem assinatura de atualização.
- O ambiente Linux não contém `lib.exe`/MSVC para validar o executável Windows localmente. Compilação e smoke nativos devem ocorrer no runner Windows do workflow.
- Nesta etapa a versão 0.1.3 ainda precisa de build nativo e publicação; a atualização real entre dois instaladores assinados continua pendente. Os registros abaixo descrevem a entrega anterior 0.1.2.

## Comportamento anterior — 0.1.2

- Disponível a partir do instalador Windows **0.1.2**. O instalador anterior precisa ser substituído manualmente uma vez, pois não permite consultar sua versão nativa nem abrir o download pelo comando novo.
- Verifica releases do instalador na abertura, a cada hora e ao voltar ao foco. Builds do site são conferidos na abertura, a cada cinco minutos e ao voltar ao foco.
- Exibe um aviso sem bloquear o trabalho: versão disponível, **Baixar atualização** e **Depois**. Depois dispensa aquela versão pela sessão da janela; uma versão diferente pode ser anunciada.
- Baixar atualização abre o navegador padrão no instalador oficial. O usuário executa/confirma a instalação; não há download ou reinício automático. Se o navegador não abrir, aparece erro com possibilidade de tentar novamente.
- Também detecta uma publicação nova do site na abertura, a cada cinco minutos e ao voltar ao foco. O aviso **Atualizar agora** recarrega a janela do app; não baixa nem reinstala o executável.
- O site hospedado recebe alterações diretamente. O aviso de recarga compara builds web; o aviso de download compara versões nativas do instalador.
- Falhas de rede, indisponibilidade do GitHub e instaladores antigos não interrompem a aplicação. Nenhum aviso é mostrado no navegador web comum.

## Publicar uma versão que apareça no app

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
