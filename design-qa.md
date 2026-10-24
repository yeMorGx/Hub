# Night Shift — QA do redesign

final result: passed

Revisão independente: **ship no escopo do frontend**. Os cinco achados materiais da revisão foram corrigidos e confirmados em uma rodada delimitada. A publicação é conferida separadamente em `docs/night-shift-delivery.json`.

## Fonte e normalização

- Referência escolhida: `docs/design-references/2026-10-24/night-shift.png`, opção3,1487×1058.
- Composição normalizada para1440×1024, densidade1. A captura é recortada à primeira dobra para comparar a mesma região; a captura completa fica preservada.
- Estado: modo escuro, tarefa em andamento expandida, timer ativo. Dados reais dependem da organização; a demonstração é identificada e usa dados em memória.
- Evidência conjunta e recortes: `.impeccable/review/night-shift/comparison-full.jpg`, `comparison-tasks.jpg`, `comparison-timer.jpg`, `comparison-context.jpg`.

## Superfícies de fidelidade

- Tipografia: Inter para controles/texto, Manrope para título; corpo14–16px, timer tabular.
- Layout: rail e titlebar contínuos; tarefas dominam a esquerda; agenda/equipe à direita; dock inferior fixo. Celular empilha contexto e preserva controles do timer.
- Cores: grafite, texto claro, lavanda na tarefa expandida, ação principal verde. Tokens compartilhados em controles e portais; variante clara preservada nas preferências.
- Assets: símbolo SVG oficial preservado. Avatares são dados reais/assinados ou iniciais, não imagens inventadas. Nenhuma ilustração raster adicional é necessária.
- Conteúdo: nomes/datas/atividades reais no app; mocks identificados na demo. Subtarefas e anexos do conceito não viram contagens ou arquivos fictícios no app, pois não fazem parte do esquema atual de tarefas. A ação de almoço preserva a regra de pausa existente; não são criadas duas ações equivalentes de pausa.

## Histórico de correções

- P1: CSS antigo deixava dock com318px. Corrigido para102pxdesktop/132pxmobile, com espaço reservado nas páginas.
- P1: seletor de atividade recortado por overflow do antigo card. Corrigido no wrapper; abrir/fechar exercitado com sessão real.
- P2: tema claro residual em textarea/portais. Cores fixas convertidas a tokens e portais alinhados ao novo tema.
- P2: cabeçalhos/equipe herdavam alinhamento centralizado de Card/Header e Button. Composição horizontal e listas alinhadas à esquerda.
- P2: a agenda pode mostrar eventos de outros dias; datas explicitadas nos itens.
- P1: a atualização do time desmontava o seletor ao criar projeto. Dock preservado enquanto o mesmo snapshot continua válido.
- P1: dock cobria Configurações. Rail ganhou respiro inferior e o teste verifica o alvo real de clique.

## Verificação funcional

-63 testes unitários e35 testes públicos passaram no candidato local.
-26 cenários públicos de demonstração: criação de tarefa em memória, almoço/retomada/encerramento/seletor, busca, edição isolada do próprio perfil e22 páginas em1440/390px. Sem erros de JavaScript/overflow horizontal.
-Sessão real autenticada com MFA e organização isolada: criar tarefa, iniciar timer, almoço com contador separado, retomar, encerrar, concluir tarefa, abrir/fechar seletor e busca exercitados.
-22 páginas reais do candidato local verificadas em1440×1000/390×1000. Isso comprova o renderer com backend real; a confirmação no deploy publicado ainda é necessária.

## Limites

Sem teste físico de áudio/vídeo/captura nativa Windows, bandeja ou instalador. Identidade web/React e titlebar são atualizadas sem alteração de Rust. Fluxos externos da demo explicam os limites e não enviam convites; produção preserva seus serviços.

## Confirmação da revisão independente

| Achado | Resultado | Evidência após correção |
|---|---|---|
| Card em execução/hover ilegível | Resolvido | `confirmed-board-{1440,390}.png`, `confirmed-board-hover-1440.png` |
| Valor numérico da jornada | Resolvido | `confirmed-schedule-{1440,390}.png`, sessão real com MFA |
| Nome do time no tema claro | Resolvido | `confirmed-light-{1440,390}.png`, sessão real com MFA |
| Edição do perfil da demo afetava outras pessoas e mantinha nome antigo | Resolvido | Regressão do próprio perfil e preservação de Pedro/Lia;26 cenários passaram |
| Destaque claro residual do calendário | Resolvido | `confirmed-calendar-{1440,390}.png` |

As evidências estão em `.impeccable/review/night-shift/`. O carregador/detector executável do Impeccable não estava disponível; comparação manual com capturas e revisão independente substituíram essas ferramentas. Os controles de janela da referência aparecem no Windows via titlebar nativa existente; não são imitados no navegador.
