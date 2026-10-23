# ZULU — entrega do workspace de 23/10/2026

Escopo aprovado: [plano](zulu-workspace-plan.md). Autoridade visual atual: [DESIGN.md](../DESIGN.md), seção Workspace de 23/10/2026, e `workspace20261023` em `.impeccable/design.json`. Este registro descreve o estado da entrega; publicação web segue em andamento e não é declarada concluída sem confirmação da Vercel.

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

Revisão independente em `/tmp/zulu-workspace-review.md`: inspeção das 13 capturas em `/tmp/zulu-workspace-qa/`, PDF `/tmp/zulu-report-final-1.png` e `-2.png` e leitura dos contratos de código/SQL. O parecer inicial foi **fix**, por recorte vertical do mini expandido, já corrigido no CSS. A revisão também pediu recaptura estável do drawer e do tema escuro mobile: capturas durante animação/scroll não demonstram defeito de produto. A confirmação final do revisor está em andamento após a correção e novas evidências; o parecer inicial não deve ser descrito como aprovação final irrestrita.

## Limites e distribuição

Fixtures públicas e IPC simulado não comprovam login/MFA reais, persistência autenticada, entrega de email, upload/download privado real em Storage, nem instalação/atualização Windows. A revisão é delimitada ao pacote e não constitui auditoria completa de acessibilidade ou matriz de navegadores.

**Windows 0.1.6 aguarda CI**, compilação, smoke nativo, assinatura e confirmação do release. Transparência real da janela, redimensionamento, bandeja, autostart e atualização assinada dependem dessa evidência. Não há aprovação nativa deste pacote com base somente nas fixtures.

A publicação web está em andamento sob responsabilidade do agente principal. Atualizar este registro com os identificadores e resultados confirmados dos serviços quando disponíveis; releases anteriores não comprovam a publicação deste pacote.
