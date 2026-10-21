# Agenda do time — visão mensal e intervalos

Entrega de 20/10/2026, após convites e gestão de membros. Complementa as Fases 0–1 do escopo. Não requer migração ou novas credenciais. Envio automático de convites e importação do calendário pessoal permanecem adiados pelo usuário.

## Funcionalidades

- **Mês / Semana / Dia** no calendário autenticado. A semana inclui sábado e domingo; rolagem horizontal fica contida no calendário quando necessária.
- Grade mensal começa na segunda e inclui dias dos meses vizinhos para completar as semanas. Navegação mensal preserva o dia quando possível e ajusta para o último dia em meses menores. O botão Hoje retorna à data atual.
- Desktop mostra três eventos por dia e um botão para abrir os restantes na visão diária. Mobile mostra contagem de eventos por dia; tocar na contagem abre esse dia. Tocar no número de qualquer dia também abre a agenda diária.
- Eventos que atravessam a meia-noite aparecem em cada dia ocupado. O término exatamente à meia-noite não gera presença no dia seguinte. Continuação é indicada nos cartões mensais.
- Criar evento pelo botão geral utiliza a data em navegação; botões de cada dia usam a data daquela célula. Selecionar um evento preserva o fluxo existente de detalhes/edição/RSVP.
- O carregamento agora usa paginação por ID, em lotes de 500, em vez de truncar o resultado. Mantém filtros de time, cancelamento e sobreposição do intervalo e interrompe paginações tornadas obsoletas por navegação. O resumo do dia atual continua sendo carregado quando estiver fora da agenda aberta.

## Prévia e verificações

`/demo/calendar` reutiliza o componente real com eventos fictícios em memória. Não acessa a agenda da organização nem grava eventos; criação mostra uma mensagem de demonstração. A prévia só monta a agenda após obter o relógio/fuso do navegador, evitando diferença de hidratação entre UTC do servidor e o horário local.

| Verificação | Resultado |
| --- | --- |
| Build Next.js/TypeScript | Passou. |
| `npm run test:unit` com `TZ=America/Sao_Paulo` e `TZ=America/New_York` | 16 testes passaram em cada execução, incluindo cinco novos sobre calendário e paginação. |
| `npm test --prefix supabase/tests` | 94 cenários passaram; esquema e permissões não foram alterados. |
| `HUB_APP_URL=http://127.0.0.1:3001 npm run test:public` | 29 testes passaram. |
| `python scripts/calendar-browser.py` | Desktop 1440×1000 e mobile 390×844 passaram: mês/dia/semana, Hoje, fim de semana, filtros, detalhe e criação fictícia; sem erro JS, overflow horizontal da página ou requisições de escrita. |

A verificação no navegador usa a prévia pública e um relógio fixado em 20/10/2026. A paginação usa respostas HTTP simuladas nos testes unitários. A suíte SQL é local/PGlite com contratos mínimos de Auth/Realtime; não substitui sessões reais. O fluxo autenticado completo com agenda real ainda deve ser exercitado pelo time. As duas configurações de fuso não demonstram todos os casos de horas repetidas durante mudança de horário de verão.

[Logs e capturas](validation/calendar-completion/).

## Publicação

Código `8c71025`, deployment `dpl_GV1JJtczg93jhZDx7mYpn3FC2qEM`, **READY** no [Hub](https://hub-one-azure.vercel.app). Prévia: [calendário com dados fictícios](https://hub-one-azure.vercel.app/demo/calendar).

Após a publicação, 29 testes HTTP passaram. A primeira execução recebeu HTTP 503 em duas consultas; as requisições independentes imediatas retornaram os status esperados (200 e 401), e a suíte completa foi repetida com zero falhas. Os dois logs foram preservados. Comando no ambiente cloud: `NODE_USE_ENV_PROXY=1 HUB_APP_URL=https://hub-one-azure.vercel.app npm run test:public`.
