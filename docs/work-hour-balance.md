# Jornada e saldo de horas

## Configuração

Ao entrar em um time, a pessoa vê um aviso opcional para definir os dias de trabalho e a carga diária. O padrão sugerido é 8 horas, de segunda a sexta. A configuração pode ser ignorada e preenchida depois em **Minhas horas**; ela também pode ser alterada pela própria pessoa.

O Hub calcula a meta semanal a partir da carga diária multiplicada pelos dias selecionados. A meta do mês soma os dias previstos no calendário daquele mês. A cada alteração, uma nova versão começa na data local atual para manter saldos anteriores estáveis.

## Saldo

Em **Minhas horas**, o saldo compara o tempo registrado com o tempo previsto até hoje no dia, na semana e no mês. O cartão mensal também mostra a meta total prevista para o mês.

O cálculo usa os intervalos salvos no servidor, incluindo o timer ativo. Dias de feriado cadastrados para o time e dias de ausência aprovada reduzem a meta prevista. Trabalhar em um desses dias ainda conta como tempo registrado. Um feriado afeta a meta da própria data; a pausa da rotação de home office pela semana inteira não remove horas dos outros dias daquela semana.

O banco de horas é a diferença entre minutos trabalhados e minutos previstos. Um saldo positivo representa horas a mais; um saldo negativo, horas pendentes. O Hub informa o saldo, sem determinar sozinho quando alguém pode sair mais cedo ou precisa compensar.

## Pausa para almoço

O botão **Pausa para almoço** encerra e salva o trecho de tempo atual e guarda a atividade para retomá-la depois. **Retomar** abre um novo trecho com a mesma descrição, projeto e tarefa. O tempo entre pausar e retomar não entra no total trabalhado. **Encerrar** descarta a continuação pausada e mantém os trechos já registrados.

A pausa é manual e só acontece quando a pessoa clica no botão. Não há pausa automática por horário. Os trechos separados preservam a precisão do histórico e do saldo diário.

## Dados e permissões

As jornadas são versionadas por pessoa e time. A pessoa lê e altera sua própria jornada; lideranças autorizadas podem administrar metas do time. O saldo é retornado para a pessoa autenticada, sem permitir que ela consulte as horas privadas de colegas. As gravações passam por funções do banco com MFA e RLS.

Aplicar `20261021190000_work_hour_balance.sql` no Supabase é necessário antes de publicar o cliente que usa esses recursos.
