# Revisão do fluxo diário

Revisão manual da comparação anterior/atual e das capturas de desktop/celular: composição Bento preservada, navegação flutuante sem bordas, rodapé removido, jornada explícita, atividade escolhida no card e indicação de DM/atividade em Por aqui agora. A identificação de dados fictícios continua visível na prévia.

37 testes unitários e 32 HTTP locais passaram. Bento passou em 1440, 1280, 1024, 390 e 320px, incluindo fixture HeroUI de formulários. O novo fluxo passou em 1440, 390 e 320px: tarefa vinculada na seleção, texto livre, campos obrigatórios, Escape/foco, atividade/pausa/encerramento no card de pessoas, prévia de DM e estado vazio. Ícones oficiais animam por hover e teclado; ficam estáticos com movimento reduzido. A regressão do dashboard passou em três larguras; a barra de título passou nos cinco modos simulados.

A checagem do shader identificou ausência de redesenho estático ao redimensionar durante mudança de visibilidade. Agora o buffer limpo pelo resize recebe um frame; isso não ativa loop com movimento reduzido. O teste espera o redesenho observável, em vez de depender de 250ms fixos. O teste da barra de título foi atualizado para a margem flutuante solicitada (48px = título 36px + respiro 12px).

As capturas e ações são de dados fictícios em memória. Não comprovam entrega de mensagem, persistência do timer ou Presence entre duas sessões autenticadas reais; não foram feitas escritas de negócio. O filtro de DMs próprias e não lidas tem cobertura unitária, mas a política RLS existente não foi revalidada ponta a ponta nesta tarefa. Nenhuma migração de banco ou release nativo foi necessário. Publicação e checagens públicas registradas separadamente após o deploy.
