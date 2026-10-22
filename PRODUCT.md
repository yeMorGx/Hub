# ZULU

ZULU é o aplicativo do time para reunir comunicação, presença, calendário e registro de horas em um espaço de trabalho compartilhado.

## Pessoas e tarefas

Membros precisam saber quem está disponível, conversar, coordenar reuniões e registrar o trabalho com pouco atrito. Líderes e administradores têm acesso adicional definido pelo banco. Presença não revela registros privados de horas e administração não dá acesso automático a conversas privadas.

## Entrega atual

Next.js + TypeScript + Tailwind, em português. A rota `/` verifica sessão/AAL2 e usa o cliente Supabase integrado. `/login`, `/mfa`, recuperação e callbacks implementam os fluxos de acesso. O primeiro usuário pode criar workspace/time ou compartilhar seu UUID para receber associação de um administrador.

Telas do app: Hoje, Calendário, Tarefas, Conversas, Minhas horas e Pessoas. Timer e horas usam RPCs; eventos, RSVP, canais, DMs e mensagens estão conectados ao esquema existente. Em Minhas horas, cada pessoa pode configurar a jornada depois de entrar no time, acompanhar saldo diário/semanal/mensal e pausar o timer para o almoço. A configuração é opcional e pode ser ajustada depois; ver [cálculo de jornada e pausa](docs/work-hour-balance.md). Calendário inclui escala de home office em rotação semanal, pausas por feriado e pedidos de troca ([guia e requisitos de publicação](docs/home-office-schedule.md)). Presence e digitação usam rooms privados. Manifest, ícones e service worker preparam instalação PWA com cache restrito a assets públicos.

Tarefas inclui Kanban com criação, edição, filtros, mudança de etapa, arquivamento e timer ligado ao card. Colunas: A fazer, Em andamento e Concluído. Detalhes em [Kanban da Fase 2](docs/phase-2-kanban.md).

Hoje usa HeroUI v3 real e Bento Grid, com fotografia doméstica na escala de home office, timer Prism/Lava e componentes oficiais nos diálogos abertos da tela. [Contrato atual](docs/dashboard-bento.md). Em 22/10/2026, o usuário estendeu a identidade clara de Hoje a todas as páginas do aplicativo e aos fluxos de acesso: marfim, superfícies brancas, texto escuro, azul profundo e Inter Variable, com navegação compacta por ícones. O site público mantém sua identidade própria. Timer, jornada com saldos sobre o previsto até hoje, home office e agenda compacta continuam sendo as prioridades. A prévia compartilha componentes com o app, usa dados fictícios e interações locais e não grava registros de negócio. O novo sistema visual está descrito em [páginas do app](docs/app-design-system.md); a revisão de implementação ainda é necessária.

A demonstração fictícia continua em `/demo`, com armazenamento local separado. `/demo/kanban` demonstra o quadro somente em memória, sem backend. `/demo/operations` reúne exemplos de colaboração, gestão, conversas, integrações e preparação de chamadas, também em memória; recarregar restaura os exemplos. Seus dados nunca são usados como dados reais do time.

As migrações das fases 0/1, do Kanban da Fase 2 e do home office estão no repositório. A migração de jornada e pausa de almoço também está pronta, mas ainda precisa ser aplicada no Supabase antes de publicar essa atualização. Os fluxos autenticados aguardam validação com uma conta real e seu autenticador. Não tratar implementação como comprovação de MFA, RLS ou Realtime ponta a ponta. Detalhes em docs/supabase-app-integration.md.

## Direção confirmada

Shakuro permanece como referência histórica da composição anterior. A identidade clara aprovada e agora estendida a todo o aplicativo rege sua evolução; `/site` e `/download` seguem independentes. Referência e pesquisa anterior: docs/frontend-research.md.

## Limites

As superfícies implementadas ampliam o produto, mas não comprovam todas as fases ativas. Colaboração inclui documentos Markdown, check-ins, pautas/atas e notificações; conversas incluem respostas, reações, mensagens fixadas, busca, menções e anexos. Gestão reúne relatórios com exportação CSV/PDF, metas, escalas e trocas, ausências, datas do time e clientes/projetos. A RPC de lembretes no app está aplicada; a função de push está publicada após autorização explícita, com chave privada restrita ao servidor e adesão por dispositivo. A entrega real ainda precisa ser confirmada em um navegador inscrito.

Integrações apresentam calendários Google/Outlook, conflitos de sincronização, webhooks e auditoria conforme o papel do usuário. OAuth Google/Outlook, SSO Azure e salas LiveKit dependem de configuração externa e não estão ativos. Preparar uma chamada na interface não comprova áudio/vídeo real. As durações de trabalho e a pausa de almoço são calculadas e registradas no servidor; indicadores de Presence não são prova de identidade ou frequência. Não colocar credenciais administrativas no cliente, nem dados protegidos no cache do service worker.

Conversas offline são opcionais por dispositivo, em IndexedDB cifrado, com senha local exclusiva de pelo menos 12 caracteres: até 10 canais e 200 mensagens por canal, sem anexos, com expiração em 7 dias e exclusão ao sair da conta. A interface avisa que uma cópia pode continuar legível após mudança de acesso no servidor; ela não representa autorização atual. O leitor em `/offline.html` não comprova sincronização ou criptografia validada em execução.

O cliente desktop Tauri usa a aplicação hospedada em um webview remoto. Instaladores sem assinatura para Windows, macOS e Linux foram compilados no [GitHub Actions](https://github.com/yeMorGx/Hub/actions/runs/39365001709). Há atalho Ctrl/Cmd+Shift+H para iniciar/encerrar timer e indicação de não lidas por badge no macOS, com título como alternativa nos demais sistemas. Instalação e execução desktop ainda não foram testadas.

A revisão visual final das novas superfícies recebeu `ship` somente para 16 capturas desktop/celular da demonstração fictícia e entrada offline. Não valida interações, acessibilidade completa, rotas autenticadas, autorização, persistência, cálculos/exportações, provedores, sincronização offline ou chamadas reais. [Entrega e evidências](docs/frontend-delivery.md).
