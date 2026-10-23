# ZULU — entrega do workspace de 23/10/2026

Escopo aprovado: [plano](zulu-workspace-plan.md). Autoridade visual atual: [DESIGN.md](../DESIGN.md), seção Workspace de 23/10/2026, e `workspace20261023` em `.impeccable/design.json`. Web publicada em https://hub-one-azure.vercel.app, deployment `GFTFByvUfTCC5VLKavRfXpLV4Mbq` / `hub-f2mghnvm0-yemorgxs-projects.vercel.app`, com código do commit `f9bfa1a`.

## Implementação

- Shell L contínuo com rail compacta, seis áreas, abas por área, canto interno invertido e drawer HeroUI mobile; tokens claros/escuros.
- Header/titlebar simplificado, seletor de time, perfil e configurações; troca de time retorna a Hoje e limpa contexto anterior.
- Hoje sem Sua jornada, mantendo Bento, Prism/Lava e foto de home office; Signature no primeiro nome uma vez por sessão da aba; atividade/projeto e DMs não lidas por pessoa.
- Mini compacto 244×64 e expandido 392×88; protocolo nativo de redimensionamento. Corrigido o recorte vertical da atividade/projeto apontado pela revisão, com altura automática e linhas sem compressão.
- PDF detalhado sem dinheiro, com identificação, gráficos, detalhes por pessoa e paginação; exportação coletiva somente por administrador de workspace, com MFA e acesso ao time impostos no servidor. Líder/membro ficam restritos aos próprios registros.
- Avatar em Storage privado com URLs assinadas renováveis. Imagens de chat privadas, com visualização/download por membros do canal/DM; sem promessa de revogação de cópias baixadas.

## Verificação e evidências

Resultados informados pelo agente principal: **47 testes unitários, 32 cenários públicos e 99 cenários SQL aprovados**. QA final servido localmente em produção na porta 3002: Chromium em 1440px/390px, Hoje, configurações, relatório/PDF, permissões, movimento reduzido e saudação por sessão; regressão de calendário desktop/toque; mini com IPC simulado nos dois tamanhos e ações de pausar/retomar/encerrar. Esta atualização de documentação não reexecutou essas verificações.

A migração `supabase/migrations/20261023120000_workspace_reports_avatars.sql` foi aplicada, conforme confirmação do agente principal. Ela estabelece autorização dos relatórios e políticas do bucket privado de avatares. Os testes SQL exercitam o contrato de permissões; não equivalem a um fluxo completo de usuário autenticado no browser.

Revisão independente em `/tmp/zulu-workspace-review.md`: inspeção das 13 capturas em `/tmp/zulu-workspace-qa/`, PDF `/tmp/zulu-report-final-1.png` e `-2.png` e leitura dos contratos de código/SQL. O parecer inicial foi **fix**, por recorte vertical do mini expandido, já corrigido no CSS. A revisão também pediu recaptura estável do drawer e do tema escuro mobile: capturas durante animação/scroll não demonstram defeito de produto. A revisão final delimitada foi **ship**, após confirmar as linhas legíveis do mini e as capturas estáveis do drawer e tema escuro mobile; nenhum achado material permaneceu aberto. A aprovação nativa continua dependendo do CI Windows.

## Limites e distribuição

Fixtures públicas e IPC simulado não comprovam login/MFA reais, persistência autenticada, entrega de email, upload/download privado real em Storage, nem instalação/atualização Windows. A revisão é delimitada ao pacote e não constitui auditoria completa de acessibilidade ou matriz de navegadores.

**Windows 0.1.6 validado no CI `39902662882`**: instalação, janela, titlebar, instância única, atalho, bandeja, autostart opt-in, mini transparente/topmost e redimensionamento, startup oculto, saída e desinstalação passaram. A assinatura criptográfica do atualizador foi validada e um pacote adulterado rejeitado. SHA256: `a23468d417cd56a27fd4138638808a42352e071a996f57dde5927fcc1b98ebb2`, 11.226.985 bytes. Sem certificado Authenticode; isso é independente da assinatura criptográfica do atualizador.

Produção conferida: 32 testes públicos e QA Chromium em 1440px/390px passaram no endereço público, sem erros JavaScript ou gravações de negócio nas fixtures. Build original `39901877060` compilou e passou os testes Rust, mas o smoke falhou ao focar o menu depois do mini; o teste foi corrigido em `2ce3a52`. O reteste `39902662882` aprovou o mesmo instalador, com árvore nativa idêntica verificada. Assets publicados pelo workflow `39902894179`, aprovado. Release pública: https://github.com/yeMorGx/Hub/releases/tag/desktop-v0.1.6.

## Confirmação final

Vercel `Sp5RQfYJRMTKPrji83G7Eo3oHUam` (`hub-6p3x99i5k-yemorgxs-projects.vercel.app`) está READY e associada a https://hub-one-azure.vercel.app. Download público e manifesto assinado conferidos em versão 0.1.6. Os 32 testes públicos passaram novamente após esse deploy. Código de distribuição: `f6aa71f`.
