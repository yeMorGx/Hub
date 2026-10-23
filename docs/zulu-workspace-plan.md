# ZULU — pacote aprovado em 23/10/2026

Modo Operate. Evoluir a identidade atual marfim/azul e HeroUI v3. Usar grill-me para fechar decisões; não reabrir escolhas já confirmadas.

## Escopo aprovado

- Sidebar sempre compacta, somente ícones com tooltip; seis áreas: Hoje, Trabalho, Conversas, Agenda, Equipe e Configurações. Mobile drawer.
- Moldura L contínua unindo sidebar e header/titlebar com mesma cor, sem linha divisória. Canto interno invertido com máscara/pseudo-elemento; conteúdo encaixado e cantos normais nos outros extremos. Suportar tokens claro/escuro; no mobile retirar canto.
- Trabalho: tarefas, horas, relatórios, documentos, metas/clientes. Conversas: canais/DMs, chamadas e notificações. Agenda: calendário, home office, turnos, ausências, datas e pautas. Equipe: pessoas e check-ins. Configurações: conta, preferências, desktop e organização/integrações conforme permissões.
- Titlebar apenas time, busca, notificações, perfil e controles nativos; remover logo/breadcrumb/atalho e ações redundantes marcadas no PDF. Atualizações apenas quando disponíveis.
- Seletor de times HeroUI refinado: seleção com check, nome/organização hierarquizados, criação separada. Sair no perfil. Troca de time volta a Hoje e limpa seleção anterior.
- Saudação: Signature original da Spell apenas no primeiro nome; uma vez por abertura/aba, sem repetir na navegação ou reload. Respeitar movimento reduzido.
- Remover Sua jornada de Hoje: saldos/metas continuam em Trabalho > Horas. Preservar timer Prism/Lava, imagem home office e Bento Grid.
- Pessoas ativas: texto de atividade + projeto; badge numérico de DMs não lidas por pessoa, clique abre conversa.
- Mini timer em cápsula sem retângulo de fundo; modos compacto (tempo e almoço) e expandido (atividade/projeto/encerrar); ajustar janela e responsividade.
- Imagens do chat e avatar em Supabase Storage. Arquivos do chat privados, apenas membros do canal/DM, visualizar e baixar. Não prometer revogação de cópias baixadas.
- Relatório PDF detalhado e bonito, sem valores monetários: período, pessoas, horas/projetos/atividades, gráficos, detalhes, identificação e paginação. Admin pode exportar o time separado por pessoa; líder e membro somente próprios registros. Impor no servidor.
- Clique/arraste e linhas do calendário já publicados em 6612d68.

## Entrega

Implementar, testar, QA visual e funcional, aplicar migrações necessárias, publicar Vercel e release desktop assinada se houver alterações nativas. Não declarar integração real validada por fixtures. Preservar demais arquivos locais não rastreados.
