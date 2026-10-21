# Hub — Pesquisa de referências para o frontend

Pesquisa em 19/10/2026. Brief: ferramenta diária para equipe reunir presença, conversas, agenda e horas; visual próprio, bonito e adequado a uso prolongado. Produto e funcionalidades: [visão do projeto](project-vision.md).

## Método e limites

Buscas internas no Dribbble por `team dashboard`, `team chat`, `time tracking dashboard` e `team calendar dashboard`. Oito páginas de projetos abertas em Chromium, com capturas e inspeção visual das interfaces apresentadas. A análise abaixo distingue o que aparece nos conceitos das propostas para o Hub. Não constitui teste das interações ou prova de usabilidade dos produtos apresentados.

O Mobbin retornou **HTTP 403 — This request was blocked** tanto em [Discover Sites](https://mobbin.com/discover/sites/latest) quanto em [Discover Web Apps](https://mobbin.com/discover/apps/web/latest). Nenhum fluxo interno do Mobbin foi acessado. Referências de lá permanecem pendentes; nenhum conteúdo foi inferido por nome de aplicativo.

As [capturas e suas fontes](design-references/sources.json) são material de pesquisa com autoria dos respectivos criadores. Não são assets destinados ao aplicativo. Algumas capturas incluem o aviso de cookies do Dribbble sobre parte da composição.

## Referências inspecionadas

| Projeto e autoria | Observação visual | Aplicação proposta no Hub | Cuidado |
| --- | --- | --- | --- |
| [Hiver — Team Chat](https://dribbble.com/shots/25446536-Hiver-Team-Chat), Filip Legierski · [captura](design-references/hiver-chat.png) | Trilho de módulos, lista de canais/pessoas, conversa larga, mensagens agrupadas por autor, compositor na base. Superfícies claras, destaque discreto da conversa selecionada e contadores pontuais. | Principal referência estrutural para conversas: módulos e contexto local separados; nomes, horários e texto com hierarquia clara. | Aumentar legibilidade para uso real; ícones precisam de nomes acessíveis. Recursos de threads/arquivos só entram na fase prevista. |
| [Team Chat App — Visual Exploration](https://dribbble.com/shots/13944513-Team-Chat-App-VisualExploration), Alzea Arafat / Orenji Studio · [captura](design-references/orenji-chat.png) | Chat escuro com lista lateral, conversa central e painel contextual à direita; participantes no cabeçalho. | Estudar a separação entre conversa e informação complementar. Painel de participantes aberto sob demanda. | Quatro colunas comprimem a conversa. Tipografia miúda, decoração e tarefas pessoais no painel não devem ser reproduzidas. |
| [HighPerform — Team Dashboard](https://dribbble.com/shots/26592640-HighPerform-Team-Dashboard), Dipa Product / Dipa Inhouse · [captura](design-references/highperform.png) | Prancha com organograma, registros de presença, ausências e calendário; abas e tabelas compactas, superfícies neutras. | Hierarquia de time e agrupamento de informações relacionadas. Listas de pessoas com contexto legível. | Organograma, férias e controle de frequência não são o foco do MVP. A miniatura de muitas telas não resolve a composição de uma tela real. |
| [Worksy Clock-In](https://dribbble.com/shots/27258367-Worksy-Clock-In-SaaS-Time-Tracking-Dashboard), Ryt Brothers · [captura](design-references/worksy.png) | Navegação escura, conteúdo branco, sessão ativa destacada com relógio, controles próximos e histórico em faixas temporais. Timer compacto também no topo. | Timer persistente entre módulos; projeto, descrição e parar ao alcance; histórico diário fácil de conferir. | Pausa e relógio de ponto não equivalem ao nosso registro de horas: o banco tem iniciar/parar e entradas manuais. Não adicionar pausa sem definir sua semântica. |
| [Time Tracking Dashboard](https://dribbble.com/shots/22096862-Time-Tracking-Dashboard), Sandro Tavartkiladze · [captura](design-references/sandro-time.png) | Tipografia numérica grande, edição do projeto, tabela de horas e gráfico; tons claros quentes e hierarquia forte entre rótulos e valores. | Números tabulares, títulos objetivos, filtros e resumos com prioridade clara na tela de horas. | Custos, faturamento, orçamento e relatórios gerenciais não existem no MVP; não preencher a home com métricas inventadas. |
| [Team Management Calendar UI Dashboard](https://dribbble.com/shots/24177180-Team-Management-Calendar-UI-Dashboard), Shakuro · [captura](design-references/calendar-shakuro.png) | Composição escura com timer, tarefas, reuniões, grade semanal e painel de atividade. Cor relaciona itens e horários. | Semana como visão útil para coordenar reuniões; linha do horário atual e ligação visual entre agenda e trabalho. | Densidade alta, múltiplos gráficos e tons escuros próximos exigem cuidado de contraste. Tarefas/kanban ficam para a fase 2. |
| [TaskFlow — Team Calendar & Event Management](https://dribbble.com/shots/27112768-TaskFlow-Team-Calendar-Event-Management-Dashboard-SaaS-Web), Ilias Miah / Confidency · [captura](design-references/calendar-taskflow.png) | Grade mensal, ação de adicionar evento, agenda do dia à direita, horários e avatares dos participantes. | Navegar datas e consultar eventos selecionados sem perder o calendário; painel com confirmação de presença. | Evitar excesso de contornos, chips truncados e gradientes nos botões. Gerar link de reunião não é uma capacidade atual do Hub. |
| [Productivity App UI — Task Management & Team Dashboard](https://dribbble.com/shots/27258621-Productivity-App-UI-Task-Management-Team-Dashboard), Sk Nahid Hasan · [captura](design-references/productivity.png) | Conceito mobile com preto/amarelo, navegação inferior, seleção horizontal de dias e agenda diária. | Referência de priorização mobile: poucas ações principais e agenda diária como alternativa à grade desktop. | Cartões inclinados, objetos 3D e chamadas enormes consomem espaço de trabalho. Não adotar esses elementos como linguagem do Hub. |

## Direção: Shakuro como referência principal

Após a pesquisa, o usuário indicou preferência pelo projeto da **Shakuro** ("o do shakuro eu gostei bastante"). Esta escolha orienta o frontend: tema escuro, navegação compacta, timer em destaque, grade semanal ampla e painel contextual. A primeira adaptação já foi implementada e está disponível para avaliação; a preferência pela referência não aprova detalhes que ela não mostra.

**Uma mesa de trabalho compartilhada, organizada em torno do dia e das pessoas.** A primeira tela deve responder: quem está disponível, no que está trabalhando, qual é o próximo compromisso e qual trabalho estou registrando.

### Linguagem visual

- Base escura em preto e grafite, com superfícies em níveis distinguíveis e texto claro. Acento quente no controle do timer, inspirado na Shakuro; cores de eventos e presença acompanhadas de texto/ícone. Preservar contraste e legibilidade ao adaptar a referência.
- Tipografia de interface com boa distinção entre caracteres. Source Sans 3 foi uma sugestão inicial; a implementação usa Manrope Variable, servida localmente. Pesos moderados, alinhamento cuidadoso e algarismos tabulares no timer.
- Navegação compacta, divisórias discretas e cantos moderados. Cada agrupamento precisa ter motivo funcional; variar a composição conforme a tarefa.
- Personalidade nos detalhes: indicação de atividade com contexto, estados de disponibilidade, cursor de leitura do chat e sessão ativa persistente.
- Movimento curto para transições e feedback; respeitar redução de movimento. Timer não deve anunciar cada segundo ao leitor de tela.

### Composição proposta na pesquisa

A tabela e as regras abaixo registram a intenção de produto, incluindo etapas futuras. Não são uma lista de capacidades entregues. A demonstração em `/demo` tem calendário semanal/diário, canais e DMs em uma única tela com seleção horizontal no celular, e um único workspace/time fictício. A rota principal recebeu Auth/MFA, onboarding e troca de time, além de envio de mensagens com tentativa idempotente; esses fluxos aguardam validação autenticada real. Visão mensal e rotas distintas de conversa no celular continuam como propostas. O escopo entregue está em [frontend-delivery.md](frontend-delivery.md); os tokens e a composição implementados estão em [DESIGN.md](../DESIGN.md).

| Tela | Hierarquia e ação principal | Adaptação mobile |
| --- | --- | --- |
| Hoje | Composição inspirada na Shakuro: timer e próximos compromissos no topo, agenda semanal ampla abaixo e painel lateral com presença e contexto do time. Atalhos para conversa e resumo das próprias horas conforme espaço disponível. | Próximo compromisso, timer e lista do time em sequência; informação secundária recolhida. |
| Conversas | Navegação global, canais/DMs, conversa; painel de participantes opcional. Separador de não lidas, envio pendente/erro e compositor estável. | Lista e conversa em rotas distintas com voltar; teclado não cobre o compositor. |
| Horas | Projeto/descrição e iniciar/parar; sessões por dia; entrada manual; total próprio com período explícito. | Formulário e sessões em lista; ações de edição com alvos confortáveis. |
| Calendário | Semana para coordenação; mês disponível; detalhes do evento e RSVP sem perder a data selecionada. | Agenda do dia com seletor de datas, evitando comprimir sete colunas. |
| Pessoas e perfil | Nome, avatar, disponibilidade e trabalho atual; seleção explícita de workspace/time. | Lista pesquisável e detalhes individuais. |
| Acesso/MFA | Login, configuração/verificação do segundo fator e recuperação com instruções claras. | Fluxo de uma tarefa por etapa; compatível com preenchimento automático e colagem. |

### Regras específicas do produto

- Timer ativo continua visível ao trocar de módulo e de time; o banco permite somente uma sessão ativa por pessoa.
- Horas de outras pessoas só aparecem quando o papel permite. Presença não revela descrições privadas de entradas de hora.
- Canais privados/DMs respeitam participação; administradores não recebem uma interface que sugira acesso geral às conversas.
- Menus mostram somente os módulos disponíveis. Kanban, relatórios avançados e chamadas não entram como controles inativos no MVP.
- Formulários preservam valores em falhas; ações mostram progresso e confirmação. Envio de mensagem admite retry sem duplicação.
- Estados previstos: time vazio, nenhum canal, nenhum evento, sem entradas, carregando, desconectado, sessão expirada, MFA pendente e acesso revogado.
- Contraste WCAG AA, foco visível, navegação por teclado, labels, status além da cor e horários com fuso explícito onde houver ambiguidade.

## Próxima entrega visual

A direção Shakuro foi implementada em Next.js, com Hoje, Calendário, Conversas, Minhas horas e Pessoas. A demonstração original está em `/demo`; a rota principal recebeu integração Supabase Auth/MFA e Realtime, ainda pendente de validação com conta real. Veja a [entrega do frontend](frontend-delivery.md). A composição implementada está disponível para avaliação do usuário.
