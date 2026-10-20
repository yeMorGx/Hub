# App do Time — Visão e Escopo

Documento de planejamento (nome provisório: "App do Time"). Serve como base para implementação e para briefar ferramentas de código.

## 1. Visão geral

Um app **instalável** para o time reunir, em um só lugar, a comunicação, a agenda e o controle de horas. A ideia é substituir a mistura de ferramentas soltas (chat, calendário, planilha de horas) por um produto único, rápido e com a cara do time.

O núcleo pedido inicialmente:

- Conversa em tempo real
- Status de online
- Calendário compartilhado (agenda e reuniões)
- Registro de hora

Sobre esse núcleo entram os módulos de colaboração, gestão, segurança e integrações descritos abaixo, entregues em fases.

## 2. Objetivos

- Dar ao time um lugar único para falar, se organizar e registrar o trabalho.
- Mostrar em tempo real quem está disponível e no que cada pessoa está trabalhando.
- Registrar horas com o mínimo de atrito, ligadas a tarefas e projetos.
- Oferecer relatórios confiáveis para gestão e fechamento.
- Manter segurança forte desde o início (MFA, SSO, permissões, auditoria).

## 3. Plataformas e instalação

- **PWA (Next.js)**: primeira entrega. Instala no Windows, Mac, Android e iOS direto do navegador, com notificações push.
- **Desktop (Tauri)**: empacotamento em .exe/.dmg, com atalho global para o timer e badge de não lidas.
- **Mobile (Expo)**: opcional, só se a PWA não bastar no celular.

Observação: push no iOS só funciona com a PWA instalada na tela inicial.

## 4. Stack e arquitetura

- **Front-end**: Next.js, React, TypeScript, Tailwind.
- **Back-end e dados**: Supabase (Postgres, Auth, Realtime, Storage, Edge Functions).
- **Tempo real**: Supabase Realtime (Postgres Changes para mensagens e eventos; Presence para status online).
- **Segurança de dados**: Row Level Security (RLS) em todas as tabelas, desde o primeiro dia.
- **Voz e vídeo (fase final)**: serviço pronto como LiveKit, em vez de WebRTC manual.
- **Automação e webhooks**: n8n ou Edge Functions.
- **Desktop**: Tauri reaproveitando o front-end.

Princípios:

- Horários sempre em UTC; a duração é calculada no banco, não no cliente.
- Toda regra de acesso mora no banco (RLS), nunca só na interface.
- Cada módulo é independente o suficiente para ser ligado ou desligado.

## 5. Módulos e funcionalidades

### 5.1 Status de online e presença

- Presence do Supabase Realtime: cada cliente publica seu estado (online, ausente, em reunião).
- Ao fechar a aba, a pessoa sai da presença automaticamente.
- "Visto por último" guardado em `profiles`.
- "Em que estou trabalhando agora": status curto por pessoa, visível para o time.
- Quem está com timer ativo aparece destacado.

### 5.2 Chat em tempo real

- Canais públicos, canais privados e mensagens diretas.
- Canais por projeto.
- Mensagens novas via Realtime, com contador de não lidas e "digitando...".
- Threads (responder dentro de uma mensagem) e reações com emoji.
- Menções (@pessoa, @canal) com notificação push.
- Mensagens fixadas e busca no histórico.
- Envio de imagens, arquivos e mensagens de voz (Supabase Storage).
- Chamada de voz e vídeo rápida e compartilhamento de tela (fase final).

### 5.3 Registro de hora

- Timer de iniciar e parar; uma entrada sem `ended_at` representa o timer rodando.
- Entradas manuais e edição do histórico.
- Vínculo com projeto e tarefa: iniciar o timer direto de um card do kanban.
- Relatórios por pessoa, projeto, cliente e semana.
- Metas de horas e alertas (por exemplo, timer esquecido ligado).
- Fechamento semanal ou mensal com exportação em CSV e PDF.

### 5.4 Calendário compartilhado

- Eventos do tipo agenda e reunião, com título, início, fim, descrição e link de chamada.
- Participantes com confirmação de presença.
- Visões de dia, semana e mês (FullCalendar ou react-big-calendar).
- Atualização em tempo real quando alguém cria ou altera um evento.
- Lembretes automáticos, com pauta e ata anexadas ao evento.
- Sincronização com Google Calendar e Outlook (fase própria, por exigir OAuth e webhooks).

### 5.5 Produtividade

- **Kanban** estilo Trello, ligado ao registro de hora.
- **Standup assíncrono**: cada pessoa responde o que fez, o que vai fazer e se há bloqueios.
- **Check-ins e metas semanais**.
- **Notas e documentos** compartilhados em markdown.

### 5.6 Pessoas e escalas

- **Escala e plantão** (útil para SOC e suporte), com troca de turno.
- **Férias, folgas e ausências** com fluxo de aprovação.
- Aniversários e datas do time no calendário.

### 5.7 Gestão e relatórios

- Dashboard de horas por pessoa, projeto e cliente.
- Exportação de relatórios (CSV e PDF).
- Papéis e permissões: **admin**, **líder** e **membro**.

### 5.8 Segurança

- **MFA obrigatório** no login.
- **SSO** com Microsoft/Azure AD.
- **Log de auditoria**: quem fez o quê e quando.
- Acesso restrito por canal e por arquivo, via RLS.

### 5.9 Integrações e automação

- Google Calendar e Outlook.
- **Webhooks** para alertas automáticos no chat (n8n, monitoramento, tickets).
- **Bot de comandos** no chat, como `/hora iniciar` e `/reunião amanhã 14h`.

### 5.10 Recursos de app instalável

- Notificações push e badge de não lidas no ícone.
- Modo offline com cache de mensagens antigas.
- Atalho global no desktop para iniciar ou parar o timer.

## 6. Papéis e permissões

| Ação | Membro | Líder | Admin |
| --- | --- | --- | --- |
| Usar chat, calendário e timer | Sim | Sim | Sim |
| Criar canais e projetos | Não | Sim | Sim |
| Ver horas do time | Só as próprias | Do seu time | De todos |
| Aprovar férias e ausências | Não | Sim | Sim |
| Gerenciar usuários e papéis | Não | Não | Sim |
| Ver log de auditoria | Não | Não | Sim |

## 7. Modelo de dados (visão inicial)

Tabelas principais, já pensando nas fases seguintes:

- **Identidade**: `profiles`, `teams`, `team_members` (com papel).
- **Chat**: `channels`, `channel_members`, `messages`, `message_reactions`, `attachments`.
- **Horas**: `projects`, `tasks`, `time_entries`.
- **Calendário**: `events`, `event_attendees`.
- **Produtividade**: `boards`, `columns`, `cards`, `standups`, `notes`.
- **Pessoas**: `shifts`, `absences`.
- **Sistema**: `notifications`, `push_subscriptions`, `audit_logs`, `webhooks`.

Regras de RLS:

- Cada pessoa só lê os canais dos quais participa.
- Horas: membro vê as próprias; líder vê as do seu time; admin vê todas.
- Eventos: visíveis aos participantes e ao time do evento.
- Log de auditoria: somente leitura, apenas para admin.

## 8. Fases de entrega

### Fase 0: Fundação

- Projeto Next.js + TypeScript + Tailwind + Supabase.
- Login com MFA, perfis, times e papéis.
- RLS em todas as tabelas.
- Layout base (sidebar, tema) e PWA instalável.

### Fase 1: MVP

- Status de online e "em que estou trabalhando agora".
- Chat: canais, DMs, não lidas e "digitando...".
- Registro de hora: timer, entradas manuais e histórico.
- Calendário: eventos, reuniões e confirmação de presença.

### Fase 2: Colaboração e produtividade

- Chat avançado: threads, reações, menções com push, fixadas, busca, imagens, arquivos e áudio.
- Kanban ligado ao timer.
- Standup assíncrono e check-ins semanais.
- Notas e documentos em markdown.
- Lembretes de reunião com pauta e ata.

### Fase 3: Gestão e pessoas

- Dashboard de horas e exportação em CSV e PDF.
- Metas de horas e alertas.
- Escala e plantão com troca de turno.
- Férias e ausências com aprovação.
- Aniversários e datas do time.

### Fase 4: Segurança e integrações

- SSO com Microsoft/Azure AD.
- Log de auditoria e acesso restrito por canal e arquivo.
- Sincronização com Google Calendar e Outlook.
- Webhooks e bot de comandos.

### Fase 5: Polimento e extras

- Chamada de voz e vídeo e compartilhamento de tela.
- Modo offline.
- Empacotamento em Tauri com atalho global e badge.
- Opcional: app Expo.

## 9. Riscos e pontos de atenção

- **Voz e vídeo** é a parte mais cara e complexa; deixar por último ou usar serviço pronto.
- **Sincronização com Google e Outlook** exige OAuth, webhooks e lida com limites de cada provedor.
- **Push no iOS** depende da PWA instalada na tela inicial.
- **Volume de tabelas e políticas RLS** cresce rápido; desenhar o esquema completo antes de codar evita retrabalho.
- **Escopo grande**: manter as fases rígidas e só começar a seguinte quando a atual estiver em uso pelo time.
- Avaliar se parte de agenda e reunião já não é coberta por Microsoft Teams ou Google Workspace, para decidir o que realmente precisa ser próprio.

## 10. Próximos passos

1. Fechar o nome do produto e a identidade visual.
2. Desenhar o esquema completo do banco e as políticas RLS das Fases 0 e 1.
3. Definir o plano de telas (login, chat, calendário, horas, perfil).
4. Implementar a Fase 0 e liberar para um grupo pequeno do time.
5. Coletar feedback e ajustar a prioridade das Fases 2 em diante.
