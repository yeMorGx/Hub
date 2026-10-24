# Night Shift — contrato de interface

Escolha explícita do usuário em 24/10/2026: **opção 3, terceira imagem**, [referência original](design-references/2026-10-24/night-shift.png), 1487×1058, comparada em 1440×1024. [DESIGN.md](../DESIGN.md) e [.impeccable/design.json](../.impeccable/design.json) são as autoridades de tokens. O [brief](../.impeccable/briefs/night-shift.md) registra o mecanismo e a intenção. Modo Operate: escolher tarefa, registrar trabalho e acompanhar agenda/time.

## Composição implementada

Grafite por padrão, texto claro, seleção lavanda e ação verde. Inter no corpo/controles e Manrope nos títulos. Rail contínua com header, tarefas dominando a coluna esquerda, contexto à direita e dock persistente inferior. Em telas menores, contexto e tarefas empilham e o drawer HeroUI mantém os destinos. Dock de 102px no desktop e 132px no celular; o conteúdo reserva espaço e a última ação da rail continua alcançável. O seletor de atividade abre sobre o dock sem ser recortado.

O símbolo SVG oficial, Hugeicons animados na navegação, Phosphor no conteúdo, HeroUI v3 e os controles nativos permanecem. O antigo Bento, a fotografia doméstica e o grande card gradiente pertencem à composição histórica. Prism/Lava original permanece como sinal pequeno do timer; foco, teclado, toque e redução de movimento preservam a operação.

## Arquitetura e verdade dos dados

`components/live-hub-app.tsx` exporta `HubWorkspace`, apresentação usada pelo app autenticado e pelas prévias. Produção usa `useHub`; a demo usa `lib/hub/use-demo-workspace.ts`, com bootstrap e perfil próprios. Mutações da demo ficam em memória; recarregar restaura os exemplos. Perfil demonstrativo filtra a identidade ilustrativa e não persiste alterações de contas reais. Ações dependentes de e-mail, provedor ou sistema explicam seu limite; não simulam sucesso externo. Fixtures não são importadas pela montagem autenticada.

`components/night-dashboard.tsx` apresenta tarefas reais, projeto, responsável, vencimento, descrição e status, respeitando filtros e permissões. Concluir/desfazer mantém a atualização versionada existente. O conceito contém subtarefas e anexos que o esquema atual de tarefas não possui: a entrega omite esses conteúdos em vez de fabricar contagens ou arquivos.

O timer continua ao mudar de módulo. Almoço encerra o trecho de trabalho, conserva a atividade e mede a pausa separadamente; retomar exige ação manual e o almoço não entra nas horas trabalhadas. Encerrar salva pelo controlador correspondente. O resumo de jornada distingue registrado, previsto e restante e encaminha a Horas. Presença é contexto informativo; não comprova identidade ou frequência.

## Tema e migração CSS

`app/night-shift.css` aplica a autoridade após os estilos legados e compartilha tokens semânticos de fundo, superfície, texto, campo, seleção, ação e foco entre workspace, acesso, loading e portais HeroUI. A migração também converte cores fixas conflitantes dos módulos; o CSS legado continua existente e requer conferência de overlays ao ser alterado.

`WorkspaceTheme` e Preferências usam `zulu:appearance:v2`: padrão `dark`, opções explícitas `dark`/`light` e atributo `data-zulu-theme`. A preferência é local ao dispositivo. A variante clara preserva a moldura escura com texto claro. Valores completos estão em DESIGN e no sidecar; não reutilizar os tokens históricos marfim/azul como autoridade atual.

## Evidência e limites

Comparação completa e recortes de tarefas, contexto e timer em `.impeccable/review/night-shift/`, com 35 imagens no manifesto `assets.json`. A revisão independente final recebeu **SHIP** após resolver contraste do quadro ativo, campo numérico da escala, header na variante clara, isolamento do perfil/bootstrap demonstrativo e destaque do calendário.

No candidato local: build, 63 testes unitários, 35 testes públicos e 26 cenários da demo passaram. Sessão real com MFA e organização isolada exercitou criar tarefa/projeto, iniciar, almoçar, retomar, encerrar e concluir. As 22 páginas foram observadas em 1440×1000 e 390×1000; administrador e membro tiveram amostra de três telas. Ver [QA da entrega](../design-qa.md) e [metadados de entrega](night-shift-delivery.json) para o fechamento e a confirmação da publicação. As contagens medem conjuntos diferentes, não cobertura universal.

Esta mudança não altera Rust. Windows nativo, mídia física, captura, bandeja, autostart e instalador não foram validados nesta rodada. As APIs nativas Tauri/Rust continuam obrigatórias no aplicativo instalado. A apresentação compartilhada não comprova persistência de cada ação nem entrega de provedores externos. `/site` e `/download` conservam sua identidade pública independente.
