# Hub — Sistema visual

## Autoridade

Referência escolhida pelo usuário: [Team Management Calendar UI Dashboard — Shakuro](https://dribbble.com/shots/24177180-Team-Management-Calendar-UI-Dashboard). Captura: `docs/design-references/calendar-shakuro.png`. O Hub adapta a composição; não reproduz o dispositivo, fotografia de fundo, dados, logo ou funcionalidades futuras da referência.

Modo da superfície: **Operate**. Clareza das tarefas diárias, densidade útil, legibilidade e estados reconhecíveis orientam a interface.

## Tokens implementados

| Token CSS | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#101112` | Fundo geral |
| `--rail` | `#0c0d0e` | Navegação |
| `--surface` | `#191b1d` | Painéis |
| `--surface-raised` | `#202224` | Elementos internos |
| `--border` | `#2b2d30` | Divisões |
| `--text` | `#f0f0f1` | Texto principal |
| `--muted` | `#a0a2a6` | Texto secundário |
| `--accent` | `#e26540` | Ação principal e timer |
| `--accent-hover` | `#f17a54` | Hover da ação |
| `--radius` | `14px` | Painéis principais |

Fonte: Manrope Variable, instalada por npm e servida localmente. Ícones: Phosphor React, traço regular e preenchimento no módulo ativo. Na demonstração, avatares são identidades por iniciais dos personagens fictícios, com cor fixa por pessoa; não dependem de fotos externas.

## Composição

Desktop: trilho fixo de 76px, barra superior de 72px, conteúdo com margem de 36px. Hoje reúne foco, retomada de trabalho e reuniões; abaixo vem a semana. O painel lateral de 246px mostra pessoas, horas próprias e conversa. Grades de horário usam 84px por hora e eventos por início/duração.

Acentos de eventos: laranja para criação; violeta para pesquisa/revisão; azul para alinhamentos; verde para colaboração. Cor tem rótulos acompanhantes. Superfícies levemente quentes distinguem o foco e a data atual.

Celular até 520px: navegação inferior com rótulos, foco horizontal, próximos encontros e calendário aberto no dia atual. A visão semanal continua disponível com rolagem apenas dentro da grade. O painel de contexto segue em sequência no documento. Rótulos da navegação inferior usam 10px; com timer ativo fora de Hoje, um indicador flutuante acima da navegação leva a Minhas horas. Telas intermediárias reduzem o número de painéis em paralelo.

## Interações e limites

- Timer mostra números tabulares e permanece ativo ao trocar de módulo; não há pausa.
- Diálogos nativos oferecem foco modal e Escape; foco de teclado recebe contorno pêssego.
- Busca acessível por botão e Ctrl/Cmd+K.
- Campos, filtros, estados selecionados, mensagens, confirmações e avisos seguem a mesma linguagem.
- Redução de movimento desliga transições e animação de carregamento.
- A demonstração `/demo` declara seus dados fictícios. A rota principal usa dados do Supabase e Presence privado; esses sinais continuam sendo informativos, sem efeito sobre permissões.

## Evidência

Capturas desktop e celular em `.impeccable/review/`. Compilação de produção registrada em `docs/frontend-delivery.md`. A inspeção visual não constitui auditoria completa de acessibilidade nem validação de integração com Supabase.

## Acesso e integração

Login, cadastro e recuperação herdam o grafite e o acento quente. Desktop divide contexto do produto e formulário; celular prioriza marca e tarefa. Formulários usam nomes acessíveis, campos confortáveis e estados de erro/sucesso. MFA usa QR/chave vindos do Auth, sem ilustração ou segredo fictício.

O app integrado mantém a composição da demonstração e substitui dados de exemplo por estados vazios e conteúdo autorizado pelo RLS. Eventos reais usam azul para reunião e laranja para evento; colisões de horário usam faixas separadas. PWA mantém o símbolo SquaresFour da biblioteca Phosphor em ícones PNG, sem novos assets de marca externos.

Capturas anônimas de acesso estão em `.impeccable/review/auth/`. Telas autenticadas/MFA dependem de uma conta real para inspeção; não foram simuladas para produzir evidência de integração.

A revisão visual final de acesso teve veredito `ship` restrito ao login desktop/celular, cadastro desktop, pedido de recuperação desktop e ícone de 512px. Não inclui redefinição de senha por link, MFA, onboarding ou telas privadas; também não comprova autenticação ponta a ponta ou instalação PWA em dispositivos.
