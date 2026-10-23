# Criação de eventos pela grade

Em 23/10/2026, o usuário aprovou testar criação por clique e arraste no calendário. O escopo desta entrega é o calendário; os demais pontos do PDF continuam no planejamento.

- A ação textual “Novo evento” saiu do cabeçalho de Hoje e Calendário, inclusive na prévia de Hoje.
- Na semana/dia, clicar escolhe um início em passos de 15 minutos e sugere uma hora, limitada ao fim visível da grade. Arrastar em qualquer direção seleciona os blocos de 15 minutos entre os extremos e mostra o intervalo antes de abrir o formulário. A seleção é do mesmo dia.
- Esc, perda de foco da janela e cancelamento do ponteiro descartam o gesto. Eventos existentes mantêm o clique de detalhes e não iniciam seleção.
- No celular, o arraste mantém a rolagem nativa. Tocar em um horário sugere uma hora; início e término podem ser ajustados no formulário. Por teclado, Tab e Enter/Espaço ativam os horários. A criação permanece restrita a quem já pode participar, e fica desabilitada durante uma operação em curso.
- No mês, clicar no espaço vazio abre o formulário naquela data; clicar no número do dia continua abrindo sua agenda diária. Ações de adicionar por ícone permanecem disponíveis.
- Linhas horizontais identificam as horas; divisórias verticais identificam os dias. A seleção e os estados usam os tokens existentes, com foco visível e movimento reduzido.
- O formulário autenticado recebe início e término selecionados e continua usando o mesmo fluxo de gravação/RLS. Não há migração, nova permissão ou mudança de integração.

## Componentes e referências

`CalendarTimeColumn` compõe o [Button oficial HeroUI v3](https://heroui.com/en/docs/react/components/button), consultado nesta entrega. `onPress` preserva teclado, toque, foco e estado desabilitado; Pointer Events implementam a seleção específica do produto. O formulário da prévia usa Form, Input, Label e Button de `@heroui/react` 3.2.6. A identidade existente foi preservada.

## Teste público e limites

`/demo/calendar` permite preencher o formulário e criar um encontro fictício, abrir seus detalhes e continuar navegando. Tudo fica em memória; recarregar restaura os exemplos. Não utiliza uma conta autenticada nem grava dados de negócio.

Verificações locais: build Next.js/TypeScript; 44 testes unitários, incluindo seleção bidirecional, limite da grade, minutos e passagem de meia-noite; Chromium em 1440×1000 e 390×844. Os scripts `calendar-selection-browser.py` e `calendar-browser.py` verificam clique, arraste, Esc, teclado, toque, validação de intervalo, criação local, detalhes, navegação, filtros, meia-noite e ausência de overflow, erros JS e requisições de escrita. O script de seleção também confere os estilos computados das linhas. O fluxo com eventos reais ainda precisa ser experimentado pelo usuário autenticado.

## Publicação e conferência

Código de aplicação `6612d68` enviado à branch `codex/hub-foundation-kanban`. Deployment `dpl_27iDvW1cPsPU1hPYKEzTieKvinSc`, estado **READY**, com alias https://hub-one-azure.vercel.app. URL imutável: https://hub-gussthkag-yemorgxs-projects.vercel.app. Não houve alteração nativa; esta entrega não requer um novo instalador.

O script de seleção passou também no alias público, em desktop e celular, sem erros JS ou requisições de escrita. As 32 verificações HTTP públicas passaram após corrigir uma expectativa desatualizada no teste de download: ele esperava a versão 0.1.4 e seu hash, enquanto a configuração vigente já é 0.1.5. O teste agora confere nome e SHA-256 contra `lib/desktop/public-release.ts`. Essa correção é somente de teste; não modifica o instalador ou o conteúdo publicado.
