# Hub

Aplicativo do time para reunir comunicação, presença, calendário e registro de horas em um espaço de trabalho compartilhado.

## Pessoas e tarefas

Membros precisam saber quem está disponível, conversar, coordenar reuniões e registrar o trabalho com pouco atrito. Líderes e administradores têm acesso adicional definido pelo banco. Presença não revela registros privados de horas e administração não dá acesso automático a conversas privadas.

## Entrega atual

Next.js + TypeScript + Tailwind, em português. A rota `/` verifica sessão/AAL2 e usa o cliente Supabase integrado. `/login`, `/mfa`, recuperação e callbacks implementam os fluxos de acesso. O primeiro usuário pode criar workspace/time ou compartilhar seu UUID para receber associação de um administrador.

Telas do app: Hoje, Calendário, Tarefas, Conversas, Minhas horas e Pessoas. Timer e horas usam RPCs; eventos, RSVP, canais, DMs e mensagens estão conectados ao esquema existente. Presence e digitação usam rooms privados. Manifest, ícones e service worker preparam instalação PWA com cache restrito a assets públicos.

Tarefas inclui Kanban com criação, edição, filtros, mudança de etapa, arquivamento e timer ligado ao card. Colunas: A fazer, Em andamento e Concluído. Detalhes em [Kanban da Fase 2](docs/phase-2-kanban.md).

A demonstração fictícia continua em `/demo`, com armazenamento local separado. `/demo/kanban` demonstra o quadro somente em memória, sem backend. Seus dados nunca são usados como dados reais do time.

As migrações das fases 0/1 e do Kanban da Fase 2 já estão aplicadas. A integração compilou, mas os fluxos autenticados ainda aguardam validação com uma conta real e seu autenticador. Não tratar implementação como comprovação de MFA, RLS ou Realtime ponta a ponta. Detalhes em docs/supabase-app-integration.md.

## Direção confirmada

O usuário escolheu o dashboard escuro da Shakuro: timer em destaque, navegação compacta, semana ampla e contexto lateral. Referência e pesquisa: docs/frontend-research.md. A identidade deve permanecer cuidada e consistente ao expandir as telas.

## Limites

A Fase 2 está parcialmente implementada: chat avançado, standups, documentos Markdown e lembretes ainda são futuros. Relatórios avançados, chamadas integradas, pausa de timer e SSO continuam nas fases previstas. Login com Azure ainda não está configurado. Horas têm duração oficial calculada no servidor; indicadores de Presence não são prova de identidade ou frequência. Não colocar credenciais administrativas no cliente, nem dados protegidos no cache do service worker.
