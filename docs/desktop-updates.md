# Aviso de atualização do Hub Windows

Solicitação: avisar dentro do aplicativo quando houver uma nova versão do instalador. A assinatura comercial de código permanece adiada pelo usuário.

## Comportamento

- Disponível a partir do instalador Windows **0.1.2**. O instalador anterior precisa ser substituído manualmente uma vez, pois não permite consultar sua versão nativa nem abrir o download pelo comando novo.
- Verifica na abertura, a cada hora e no retorno ao foco/visibilidade, respeitando intervalo mínimo de cinco minutos entre tentativas.
- Exibe um aviso sem bloquear o trabalho: versão disponível, **Baixar atualização** e **Depois**. Depois dispensa aquela versão pela sessão da janela; uma versão diferente pode ser anunciada.
- Baixar atualização abre o navegador padrão no instalador oficial. O usuário executa/confirma a instalação; não há download ou reinício automático. Se o navegador não abrir, aparece erro com possibilidade de tentar novamente.
- O site hospedado continua recebendo alterações diretamente; o aviso compara versões nativas do instalador.
- Falhas de rede, indisponibilidade do GitHub e instaladores antigos não interrompem a aplicação. Nenhum aviso é mostrado no navegador web comum.

## Publicar uma versão que apareça no app

1. Incrementar conjuntamente `src-tauri/tauri.conf.json`, `Cargo.toml` e a entrada `hub-desktop` no `Cargo.lock`.
2. Compilar e passar a verificação Windows via `.github/workflows/desktop.yml`.
3. Criar um rascunho `desktop-vX.Y.Z`, vinculado ao commit testado, e anexar o instalador aprovado e SHA256SUMS pelo job `publish-draft`.
4. Após revisar a entrega, publicar a release estável no GitHub (desmarcar pre-release). Rascunhos e prévias não geram avisos.
5. A release deve ser a release estável mais recente do repositório e conter `Hub_X.Y.Z_x64-setup.exe`. A consulta usa `/releases/latest`; uma release mais recente de outra finalidade não será anunciada como atualização desktop.

O endpoint público `/api/desktop/update` consulta somente o repositório fixo `yeMorGx/Hub`, com cache de cinco minutos e timeout. Não usa credenciais. Só retorna a versão se a release estiver publicada, estável, com tag e arquivo estritamente correspondentes e URL no repositório oficial. O comando nativo aceita apenas três componentes numéricos; constrói a URL fixa e não aceita URLs arbitrárias. Não foram adicionadas permissões de shell/arquivos ao frontend.

Isto **não é o Tauri Updater**: não instala pacotes automaticamente e não substitui uma assinatura Authenticode. O instalador segue sem assinatura e poderá gerar avisos de editor desconhecido. O download usa HTTPS/GitHub; não há verificação criptográfica independente de pacote pelo cliente.

## Validação

- 21 testes unitários passaram, incluindo comparação numérica, rejeição de prévias/URLs externas/arquivo ausente e falhas do endpoint sem exposição de detalhes internos.
- Build Next.js passou.
- `scripts/desktop-update-browser.py`: Chromium com API/IPC simulados, larguras 1360 e 390, ausência de overflow, download, erro/nova tentativa, dispensa após recarregar, versão atual, navegador comum, legado e indisponibilidade. Não instala nada nem entra em conta.
- Capturas em `validation/desktop-updates/`. Revisão independente: **ship** restrito ao aviso e estados inspecionados. Documentação visual revisada: extensão da identidade existente, sem mudança no DESIGN.md.
- Abertura real do navegador/download pelo botão ainda depende de teste em computador Windows com 0.1.2 e uma release estável futura. O smoke nativo testa instalação, renderização do login, instância única, restauração por atalho e desinstalação, não o fluxo de atualização completo.

## Entrega 0.1.2 concluída

- [Baixar prévia no rascunho GitHub](https://github.com/yeMorGx/Hub/releases/tag/untagged-86eda426e3b99f0e4f12), exige acesso ao repositório. Escolher `Hub_0.1.2_x64-setup.exe` em Assets. Não foi publicada como release estável, portanto não gera aviso.
- [Build nativo e smoke aprovados](https://github.com/yeMorGx/Hub/actions/runs/39495085346), commit `a2d66eda75ea43e4c8492aad77c017cb0e5db2ea`. Instalador com 2.313.817 bytes, `NotSigned`; instalação, login renderizado, instância única, restauração e desinstalação passaram. Relatório e captura em `validation/desktop-updates/`.
- [Promoção ao rascunho aprovada](https://github.com/yeMorGx/Hub/actions/runs/39495970727). Download do asset conferido contra SHA-256 `454cd533dc657f2d61fa3d9c6454d783ef35bb955288d4c0430fc27647fbed93`.
- Site publicado, deployment `dpl_JBCDMs73S3p3jvu33YaKJucxBaYR` READY. 29 checks HTTP públicos passaram. `/api/desktop/update` retornou 200 com `release: null`, conforme a ausência de uma release desktop estável publicada. Nenhum rascunho/pre-release é anunciado.
- Permanece pendente o teste real do botão de download entre duas versões publicadas. Não houve instalação automática nem validação de Authenticode reconhecido.
