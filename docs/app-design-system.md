# Sistema visual do aplicativo ZULU

Em 22/10/2026, o usuário estendeu a identidade clara aprovada de Hoje para todas as páginas do aplicativo e para os fluxos de acesso. A composição principal de Hoje continua sob seu sistema Bento próprio; as telas secundárias seguem os mesmos tokens sem alterar esse layout. O site público (`/site` e `/download`) mantém o sistema independente definido em `DESIGN.md`.

## Fundamentos

- Fundo marfim `#f6f5f1`, superfícies brancas `#ffffff`, navegação `#fdfcf9` e campos em azul acinzentado `#eef1f7`.
- Texto principal `#202b40`, texto auxiliar `#59667c`, ação/seleção azul profundo `#294d94` e hover `#1f3e7b`.
- Inter Variable em todas as páginas do app.
- Layout plano: sem bordas decorativas em shell, navegação e cartões. Preservar indicadores necessários para leitura, como foco visível, separações semânticas de tabelas e estrutura da grade de calendário.
- Marca com o símbolo ZULU sem nome ou tagline ao lado. Hugeicons animados da Animate UI na navegação; Phosphor permanece nos módulos.
- Microinterações curtas para foco, hover, pressão e seleção. Redução de movimento preserva o estado sem animação essencial.

## Navegação e estrutura

Em larguras acima de 760px, a sidebar flutuante mede 80px, fica a 12px das bordas e usa raio de 22px. Os ícones permanecem centralizados e seus nomes aparecem em tooltips HeroUI por mouse e teclado. O conteúdo reserva 104px à esquerda. A partir de 760px, a sidebar vira dock inferior flutuante de 62px e raio de 20px.

O cabeçalho preserva workspace, página, busca, notificações, perfil e ações existentes. A barra nativa do Windows acompanha marfim e azul. A área de trabalho mantém seu próprio layout conforme a função de cada página; a mudança de identidade não altera fluxos, dados, permissões ou integrações.

## Módulos

- **Hoje:** composição Bento, timer Prism/Lava, jornada e escala fotografada; ver [contrato Bento](dashboard-bento.md).
- **Calendário:** agenda em grade clara, seletor de datas, filtros, eventos, escala de home office e feriados.
- **Tarefas:** quadro em três colunas, cartões sem contorno decorativo, filtros, responsáveis e início de timer.
- **Conversas:** lista lateral e mensagens em superfícies claras, reações, anexos, threads e composer.
- **Minhas horas:** timer, pausa de almoço, metas/saldos e histórico tabular.
- **Pessoas:** busca, presença e diretório com ações de conversa.
- **Colaboração, gestão, chamadas e integrações:** abas, filtros, tabelas e formulários usam os mesmos tokens e vocabulário de ações.
- **Acesso e convite:** login, cadastro, recuperação, MFA, convite e onboarding usam campos, foco, estados de erro e sucesso na mesma paleta.

## Componentes e acessibilidade

HeroUI v3 é obrigatório para componentes novos e os que forem retrabalhados. Os componentes do dashboard e os tooltips da sidebar usam a biblioteca oficial; a migração dos demais controles existentes continua progressiva. Controles preservam estados disabled/loading/error, rótulos acessíveis, foco de teclado, toque e comportamento responsivo.

## Implementação

`app/zulu-workspace.css` aplica o tema compartilhado às telas secundárias e ao acesso. `.live-app:not(.dashboard-redesign)` limita esses ajustes; `.dashboard-redesign` mantém seu layout Bento e seus componentes de Hoje. A sidebar compacta permanece conforme o pedido anterior. `DESIGN.md` e `.impeccable/design.json` registram as decisões de marca e os tokens.
