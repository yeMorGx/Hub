# Ajustes do PDF — 23/10/2026

## Entrega

- Formulários do app, acesso e demonstrações migrados aos adaptadores HeroUI. DatePicker/DateField, TimeField e NumberField exibem pt-BR; o envio preserva ISO e número com ponto. Fieldset desabilita os controles compostos; reset restaura valores iniciais.
- Checkbox.Content corrigido nos controles diretos, incluindo matriz de permissões, convites e políticas. Clique e teclado alternam a seleção. As regras de aprovação e servidor permanecem responsáveis pela concessão efetiva.
- Avatares e fotos circulares, alinhamento à esquerda de DMs/pessoas, assinatura com stroke menor e viewBox medido pelos glifos.
- Removida a soma dupla da altura da title bar no desktop. Navegação de configurações usa superfície com raio de 14px; linhas de funcionalidades têm o mesmo recuo e ações alinhadas.
- Kanban usa dnd-kit com sensores de mouse/caneta, toque e teclado, overlay com física, prévia entre colunas, ordenação persistida e restauração ao cancelar/falhar. Parâmetros ficam em KANBAN_PHYSICS. A demonstração original foi preservada e também é utilizada no workspace público.

## Verificação

- Build Next/TypeScript e 61 testes unitários passaram.
- Teste SQL com rollback passou antes e depois da migração: reordenar, trocar de coluna, versões obsoletas, vizinhos de outro time/coluna, acesso somente leitura, MFA e bloqueio de execução anônima. Migration registrada no Supabase: `20261023153819_kanban_task_positions`.
- Advisor de segurança: a nova RPC recebeu o aviso genérico de função SECURITY DEFINER executável por authenticated, esperado para uma mutação autenticada. EXECUTE anônimo foi revogado; MFA, autorização do módulo, titularidade/gestão, escopo dos vizinhos e versão foram verificados nos testes negativos.
- Browser QA em Chromium: mouse, ordenação na mesma coluna, cancelamento, erro de persistência, teclado e toque emulado. Campos enviaram `2026-10-23`, `12:30`, `2026-10-23T09:15` e `8.5`; reset restaurou `7.5` e campo desabilitado não foi enviado. Calendário em português. Nenhum erro/warning de aplicação no conjunto final.
- Conferência final após o ajuste CSS: configurações com raio computado de 14px em 1440px/390px; criação e abertura de tarefa pela demonstração original passaram sem erros.
- Layout em 1440px/390px: matriz acionável, linhas de funcionalidades alinhadas, sem overflow de página. IPC simulado confirmou title bar de 48px, conteúdo em y=48 e padding superior do body em zero; paths da assinatura ficaram dentro do viewBox.
- Instrumentação rAF + CDP Performance com 60 cards durante arraste ativo, sem screenshots: 171 frames, mediana/p95 de aproximadamente 16,7ms. O levantamento geral que incluía capturas de tela teve outliers maiores e não foi usado para descrever o custo da animação.

Capturas locais: `/tmp/zulu-pdf-qa/`. Fixtures são isoladas e públicas, sem login ou dados do time. Toque/IPC emulados não comprovam execução em um Windows instalado ou celular físico de entrada; esses dois testes manuais ainda dependem dos dispositivos. A correção não altera o binário Tauri: os sensores de DOM substituem o drag HTML, e o frame é corrigido pelo CSS hospedado.

Contratos e fontes: [formulários](form-controls.md), [Kanban](kanban-interactions.md), [motion](motion-design.md).
