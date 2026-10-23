# ZULU — plano do painel administrativo da organização

Status: decisões de produto consolidadas no grill com o usuário. Este documento não representa implementação, migração aplicada, validação jurídica ou auditoria de segurança. Escopo exclusivo da organização cliente, não da administração da plataforma ZULU.

## 1. Identidade e autoridade

- O criador da organização começa como único dono. Propriedade não depende do nome do cargo exibido.
- Cargo visível é texto personalizado pela organização, por exemplo SOC Júnior ou Cofundador. Não concede permissões automaticamente.
- Autoridades internas distintas: dono, administração geral, administração de um ou mais times e autorização para aprovar ações críticas. Não são etiquetas públicas obrigatórias no perfil/chat/lista de pessoas.
- Podem existir vários administradores gerais e vários administradores por time, mediante atribuição autorizada. Ser braço direito não transforma alguém em dono.
- Admins não podem remover, suspender ou rebaixar o dono, transferir sua coroa ou excluir a organização. A propriedade é protegida no servidor.
- O dono pode executar ações diretamente, sem aprovação de terceiros, com confirmação/MFA nas ações críticas e auditoria. Isso não dá acesso às DMs privadas.
- Só o dono concede/revoga autoridade de aprovador e define a política de aprovação.

## 2. Permissões individuais

- As permissões são configuradas por pessoa e por time, sem cargos com conjuntos fixos de permissões e sem herança automática pelo nome Júnior/Pleno.
- Alterar a configuração de uma pessoa não altera nenhuma outra com o mesmo cargo.
- Separar alcance (organização/time/recurso) de ação (visualizar/criar/editar/excluir/aprovar/administrar), conforme o recurso suportar.
- Administradores de time ajustam permissões comuns dos membros dentro do próprio time e dos limites autorizados pelo dono. Não podem ampliar seus próprios poderes nem contornar aprovação de ações críticas.
- Conceder administração, incluir em outros times ou alterar políticas da organização segue aprovação.
- Restrições da organização prevalecem sobre liberações individuais. Recurso desativado deve sumir da interface e ser bloqueado nos serviços/RLS, não apenas na navegação.

## 3. Times e colaboração

- Times possuem espaços separados. Participar de um não libera tarefas, documentos, canais ou relatórios de outro.
- Pessoas da mesma organização podem colaborar por conversas, chamadas e compartilhamento explícito de documentos, sem abrir o restante do time.
- Uma pessoa pode pertencer a vários times. Inclusão em time adicional exige aprovação, com time de destino e permissões propostas apresentados no pedido.
- Permissões em cada time são independentes.
- Desativar funções para toda a organização é ação crítica que exige aprovação para admins. Dados anteriores são preservados.

## 4. Convites

- Admin define previamente cargo, time(s) e permissões individuais no convite.
- Convite comum a um único time, sem autoridade administrativa, pode ser enviado diretamente pelo admin.
- Poderes administrativos e inclusão em times adicionais respeitam aprovação antes de enviar o convite, para o convite refletir o acesso autorizado.
- A pessoa só recebe acessos concedidos após aceitar o convite.

## 5. Ações críticas e aprovação

Exemplos acordados: banir/expulsar/suspender pessoas, nomear/rebaixar/remover administradores, incluir pessoas em outro time, conceder poderes administrativos, excluir times ou dados em massa e desativar funcionalidades para toda a organização.

- O dono configura a política por tipo de ação, incluindo aprovadores elegíveis, quantidade necessária e eventual obrigatoriedade de determinadas pessoas.
- Pode haver aprovação única, múltipla, de todos os escolhidos ou quórum entre pessoas autorizadas.
- Um braço direito explicitamente autorizado pode aprovar. Administradores não aprovam suas próprias solicitações; cada pessoa conta uma vez.
- O dono mantém autonomia para executar diretamente. Pode optar por submeter sua própria proposta ao grupo, como mudança de plano. Nesse caso ela fica pendente; eventual execução direta pelo dono é explícita e auditada, preservando decisões anteriores.
- Solicitação apresenta alteração exata, pessoas/recursos afetados, motivo e impacto. Em mudança de plano, apresentar preço atual/proposto e vigência antes da decisão. Integração de cobrança não está implementada por este plano.
- Até concluir as aprovações exigidas, não executar a alteração.
- Uma rejeição encerra o pedido, com justificativa registrada, mesmo que já existam votos favoráveis. Novo pedido começa sem reaproveitar votos.
- Prazo padrão de 7 dias, configurável pelo dono. Expiração não executa a ação; exige nova solicitação.
- Solicitante pode cancelar enquanto pendente. Preservar histórico e notificar quem já aprovou.
- Alterar o conteúdo do pedido invalida aprovações anteriores. Alterações de política não liberam silenciosamente pedidos antigos.
- Confirmar novamente autorização e condições antes da execução. Aplicar a operação de forma atômica/idempotente para não duplicar efeitos nem executar após rejeição/cancelamento/expiração.
- Registrar solicitações, decisões e execução na auditoria. Central proposta: pendentes, aprovadas, rejeitadas, canceladas e expiradas.

## 6. Biblioteca/intranet

- Bibliotecas da organização, bibliotecas de times e acesso explícito a pastas/documentos.
- Materiais podem ser gerais ou restritos a pessoas escolhidas, inclusive somente dono e determinados admins. Ser admin não concede automaticamente leitura de todo documento restrito nem permite liberar acesso para si mesmo.
- Biblioteca define acesso inicial; pastas/arquivos podem restringir o acesso herdado. Detalhar precedência de regras na matriz técnica antes de implementar.
- Visualizar, editar, baixar e compartilhar são permissões distintas. Não prometer impedir captura/cópia de conteúdo já entregue ou revogar cópias baixadas.
- Priorizar compartilhamento de acesso ao original, controlável/revogável, em vez de criar cópias independentes. Anexos enviados em chat têm semântica de cópia separada a explicar ao usuário.
- Sem acesso: ocultar recurso da navegação e busca; link direto informa falta de acesso sem expor conteúdo/prévia.
- Autor de documento comum pode compartilhá-lo com pessoas/times da organização sem aprovação do dono. Acesso de leitura/edição de documento alheio não implica permissão de compartilhar.
- Autor pode conceder permissão de compartilhamento; sem ela, outra pessoa precisa pedir sua autorização.
- Documento sensível exige aprovação do responsável a cada novo compartilhamento, mesmo se o solicitante puder compartilhar documentos comuns.
- Autor ou responsável podem marcar como sensível. Só o responsável atual pode retirar a classificação.

## 7. Saída, autoria e responsabilidade

- Dono que deseja sair precisa escolher sucessor para a coroa. Sucessor deve aceitar; até lá o dono atual continua responsável. Recusa permite escolher outro.
- Após aceite e confirmações de segurança, transferência e saída são concluídas juntas; organização nunca fica sem dono.
- Documento permanece com autoria original após a saída/remoção do criador. Autoria não é reescrita como se o admin tivesse criado o material.
- Administradores do time recebem notificação e assumem a responsabilidade pelos documentos do autor que saiu, incluindo decisões sobre compartilhamentos. Se não houver admin de time, usar administração geral como fallback.
- Manter acessos/restrições existentes e revogar acesso da pessoa que saiu. A responsabilidade substitui o autor para solicitações futuras, sem se confundir com a autoria histórica.

## 8. Privacidade e plano futuro

- Dono/admin não recebem acesso às DMs de outras pessoas por autoridade administrativa.
- Consulta à LGPD e orientações oficiais da ANPD, política de retenção/exclusão e arquitetura de criptografia/E2EE constituem plano futuro no backlog, não bug nem garantia já implementada.
- Alcance da E2EE, gestão de chaves, anexos, recuperação e múltiplos dispositivos continuam em aberto. Não afirmar conformidade apenas por usar criptografia.

## 9. Próximo detalhamento antes da implementação

- Inventariar ações reais de cada módulo e elaborar matriz de permissões, explicitando conflitos entre organização, time, pessoa e documento; sem inventar controles que os serviços não consigam impor.
- Definir distribuição de responsabilidade quando existem vários admins no mesmo time ou documento apenas organizacional, sem ampliar leitura confidencial por acidente.
- Fechar restrições de documentos sensíveis (destinatários, download, prazo) e tratamento de compartilhamento externo; o acordo atual cobre compartilhamento interno.
- Projetar esquema/RLS, autorização central de serviços e aprovação, auditoria, invalidação de sessões/acessos e notificações. Avaliar migração compatível do admin/member e leader/member atuais.
- Detalhar telas/estados com HeroUI e identidade vigente, somente após estabilizar os contratos.
- Fundamentar decisões técnicas/organizacionais com documentação oficial e referências externas pertinentes; registrar links e separar relatos de fatos verificados.
- Planejar testes de isolamento entre organizações/times, aprovações concorrentes, revogações, convites alterados/expirados e biblioteca antes do rollout.
