# Escala de home office

A escala aparece em **Calendário**. Com uma pessoa associada a cada dia útil, o Hub registra quem está em home office e pausa a rodada em semanas com feriado cadastrado.

## Configurar pela primeira vez

1. Abra **Calendário** no time e clique em **Escala**.
2. Um líder do time ou administrador do workspace escolhe cinco pessoas diferentes para as posições A a E, define um domingo como semana de referência e confere o horário do lembrete.
3. Revise a lista de feriados e clique em **Salvar escala**. São necessárias cinco pessoas ativas no time.

O preenchimento inicial usa a ordem do PDF se os cinco nomes forem encontrados: **A — segunda, David; B — terça, Gabriel; C — quarta, Guilherme; D — quinta, Rhuan; E — sexta, Christian**. A comparação de nomes ignora acentos e maiúsculas. Se não encontrar todos, o formulário sugere as cinco primeiras pessoas em ordem alfabética; confira e ajuste as posições antes de salvar. A ordem A–E é a base da rotação.

## Semana de referência e rotação

O domingo **04/10/2026** é a referência do PDF. Na primeira semana ativa, de 04 a 10 de outubro, A fica na segunda-feira, 05/10, B na terça, C na quarta, D na quinta e E na sexta. Em cada semana ativa seguinte, as posições avançam um dia útil, em ciclo: E passa à segunda-feira e A à terça, por exemplo. Uma semana pausada não consome uma posição da rodada.

O campo aceita apenas domingos. Alterar o domingo de referência ou a composição/ordem das cinco pessoas cancela trocas futuras pendentes ou aceitas; salvar novamente apenas os feriados não cancela essas trocas.

## Feriados

Uma escala nova vem preenchida com a lista fixa de 2026 abaixo, cobrindo feriados nacionais, datas de Santos (SP), o feriado estadual de São Paulo e a véspera de Natal do calendário do time. As datas locais seguem o [Decreto Municipal nº 11.111/2025, que estabelece o calendário de Santos para 2026](https://egov.santos.sp.gov.br/legis/documents/11769/view); a véspera de Natal também foi mantida conforme o PDF do time.

- 01/01/2026 — Confraternização Universal · nacional
- 26/01/2026 — Aniversário de Santos · municipal (Santos)
- 03/04/2026 — Paixão de Cristo · feriado local (Santos)
- 21/04/2026 — Tiradentes · nacional
- 01/05/2026 — Dia do Trabalho · nacional
- 04/06/2026 — Corpus Christi · Santos
- 09/07/2026 — Revolução Constitucionalista · estadual (SP)
- 07/09/2026 — Independência do Brasil · nacional
- 08/09/2026 — Nossa Senhora do Monte Serrat · Santos
- 12/10/2026 — Nossa Senhora Aparecida · nacional
- 02/11/2026 — Finados · nacional
- 15/11/2026 — Proclamação da República · nacional
- 20/11/2026 — Consciência Negra · nacional
- 24/12/2026 — Véspera de Natal · calendário do time / ponto facultativo municipal
- 25/12/2026 — Natal · nacional

Essa lista inicial é fixa para 2026 e não atualiza automaticamente. Pontos facultativos do decreto municipal, como Carnaval, não foram tratados como feriados da equipe; o líder pode adicioná-los se o time também não trabalhar nessas datas. Um líder ou administrador pode adicionar ou remover datas e nomes. Qualquer data cadastrada entre domingo e sábado pausa **a semana inteira**: não há atribuições de home office nessa semana, mesmo que o feriado caia no fim de semana. Na semana ativa seguinte, a rotação continua da posição em que parou. Com a referência padrão de 04/10, as datas anteriores a outubro permanecem na lista, mas não alteram a rotação iniciada em outubro.

## Lembrete

O horário inicial é **08:30 no fuso de Brasília** (`America/Sao_Paulo`); um líder ou administrador pode alterá-lo. No dia atribuído, o banco coloca um lembrete na fila de notificações. A entrega por push depende da configuração de entrega no servidor, do processamento ativo da função de notificações e de uma inscrição push válida em cada navegador/dispositivo que deve receber o aviso. Sem esses requisitos, não conte com push.

## Pedir e responder a uma troca

Uma pessoa escalada pode pedir a outra pessoa escalada na mesma semana para trocar de dia. A solicitação precisa ser feita antes de passar o primeiro dos dois dias envolvidos. Quem recebeu pode **Aceitar** ou **Recusar**; quem pediu pode cancelar enquanto estiver pendente. A atribuição do calendário só muda depois que a outra pessoa aceita. Não é possível trocar uma semana passada, e uma pessoa não pode participar de duas trocas abertas ou aceitas na mesma semana.

## Acesso

Membros do time podem consultar a escala; trocas envolvem apenas as pessoas atribuídas naquela semana. Somente um líder daquele time ou administrador do workspace pode configurar o elenco, o domingo de referência, o horário e os feriados. Para configurar, o usuário também precisa estar autenticado com MFA, conforme as RPCs do banco.

## Publicação do recurso

O recurso depende da publicação desta versão do app, da migração `supabase/migrations/20261021180000_home_office_schedule.sql` e da versão atualizada de `supabase/functions/hub-notifications/index.ts`. Para habilitá-lo em um ambiente, publique o app, aplique a migração e publique a função atualizada; confirme também que o agendamento de notificações e a configuração privada de entrega no servidor estão ativos. Esta documentação descreve os requisitos do código e não confirma aplicação da migração ou publicação da função em produção. Push continua condicionado à inscrição por dispositivo.
