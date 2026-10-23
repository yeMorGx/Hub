# Kanban: arraste e ordem compartilhada

O quadro usa dnd-kit em vez de HTML Drag and Drop. Assim, o arraste não depende do transporte nativo de arquivos da janela Tauri. PointerSensor atende mouse/caneta; TouchSensor aceita pressão de 150ms com tolerância de 5px; KeyboardSensor usa Espaço, setas e Escape. O pegador tem nome acessível. Botões de detalhes, selects e ações do timer continuam operáveis sem iniciar arraste.

`components/kanban-dnd.tsx` concentra `KANBAN_PHYSICS`: mola, massa, inclinação máxima, limiar de parada e duração/easing de soltura. PhysicsCard usa MotionValues para inclinar o overlay segundo a velocidade horizontal e retorna a zero após 60ms sem movimento. O overlay recebe escala/sombra; a origem fica em opacidade 0,3. Vizinhos usam transform com transição de 280ms. Em movimento reduzido, rotação, escala e quique são removidos; feedback de destino e a ordenação permanecem.

`LiveBoard` mantém uma prévia durante o arraste entre colunas e salva somente ao soltar. Escape, destino inválido e falha de gravação restauram o snapshot. Cards são memoizados; a inclinação não atualiza estado React da lista em cada frame. Os filtros não excluem da ordem as tarefas ocultas.

`position_task` persiste status e `sort_order` usando os vizinhos finais e a versão da tarefa. A função delega a autorização à RPC `move_task` existente, incluindo MFA, módulo liberado, participação, titularidade/gestão e concorrência. Vizinhos precisam estar ativos na mesma coluna/time. Um lock por time serializa as posições; lacunas fracionárias evitam atualizar a coluna inteira a cada movimento, com rebalanceamento apenas quando necessário. A ordenação automática de prioridade/prazo serve como desempate.

Referências: [dnd-kit sortable](https://docs.dndkit.com/presets/sortable), [DragOverlay](https://docs.dndkit.com/api-documentation/draggable/drag-overlay), [sensores](https://docs.dndkit.com/api-documentation/sensors) e [Motion useSpring](https://motion.dev/docs/react-use-spring). A distribuição `motion/react` já instalada atende as molas, sem duplicar framer-motion.

As fixtures públicas demonstram a interação com dados fictícios. O teste SQL de posição roda em transação revertida e cobre ordem, troca de coluna, versão, escopo dos vizinhos, MFA e permissão. Navegador com IPC simulado não substitui uma validação manual no Windows instalado nem um celular físico.
