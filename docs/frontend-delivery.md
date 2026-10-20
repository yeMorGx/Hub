# Frontend — execução e entregas

## Executar

Node.js 20.9+:

```sh
npm ci
cp .env.example .env.local
# Preencha URL e chave publishable do projeto em .env.local.
npm run dev
```

A configuração pública deste workspace já está presente em `.env.local`, ignorado pelo Git. `scripts/setup.sh` instala dependências do app e do pacote isolado do banco; não executa testes.

Para produção local:

```sh
npm run build
npm run start
```

## Experiências separadas

- `/`: aplicativo integrado ao Supabase, com login e MFA exigidos antes do workspace.
- `/demo/kanban`: quadro fictício sem Supabase, somente em memória; recarregar restaura os exemplos.
- `/demo/operations`: exemplos de colaboração, gestão, conversas, integrações e preparação de chamadas com fixtures em memória; recarregar restaura os exemplos.
- `/demo`: primeira entrega visual com dados fictícios e armazenamento local na chave `hub.frontend.demo.v1`. Pode ser explorada sem conta e sem credenciais de projeto.
- `/offline.html`: entrada do leitor de conversas previamente salvas neste dispositivo; exige uma cópia e sua senha local.

## Frontend implementado

Direção escura inspirada na Shakuro, com Hoje, Calendário, Tarefas, Conversas, Minhas horas e Pessoas. Layout responsivo, fonte Manrope local, ícones Phosphor, navegação de teclado, diálogos nativos e redução de movimento.

A [integração Supabase](supabase-app-integration.md) documenta Auth/MFA, onboarding, RPCs, Presence/digitação, PWA, configuração de hospedagem e limites de validação.

## Evidências

- A primeira entrega visual foi inspecionada em desktop/celular; seus dois achados mobile foram corrigidos.
- A integração atual passou na compilação de produção e TypeScript.
- A inspeção de acesso anônimo confirmou a tela de login e a separação da demonstração.
- A revisão visual final de acesso teve veredito `ship`, restrito a login desktop/celular, cadastro desktop, pedido de recuperação desktop e ícone PWA de 512px. Capturas não incluem MFA, onboarding ou telas privadas.
- Ainda não houve validação autenticada de e-mail/TOTP ou sincronização entre pessoas. Nenhuma suíte de testes foi adicionada ou executada nesta etapa de frontend.

Capturas em `.impeccable/review/` e `.impeccable/review/auth/`. A [revisão visual da primeira entrega](../design-qa.md) é histórica e cobre a demonstração anterior à integração. Os resultados visuais não constituem auditoria WCAG nem aprovação de integração ponta a ponta. Instalação PWA em dispositivos ainda não foi validada.

## Incremento Kanban — 20/10/2026

`components/live-board.tsx` é compartilhado pelo módulo Tarefas integrado e pela demonstração `/demo/kanban`. Busca por título/descrição, filtro de projeto e atribuição, editor, mudança de etapa por seletor ou arraste, arquivamento com confirmação e ações do timer estão implementados. O carregamento percorre páginas de 500 tarefas por cursor UUID até terminar; não há corte em 500 tarefas.

O quadro segue o modo Operate existente: três colunas no desktop e colunas empilhadas no celular, mantendo grafite, laranja, Manrope e Phosphor. Não houve mudança durável no sistema visual.

A compilação Next.js/TypeScript passou. Capturas da demonstração e editor em `.impeccable/review/kanban/` receberam veredito independente `ship`, restrito à superfície capturada. Não houve testes funcionais/suítes, contas, e-mails ou dados reais de negócio. A integração autenticada e o comportamento multiusuário permanecem sem validação real. [Escopo e evidências](phase-2-kanban.md).

## Incremento de colaboração, gestão e clientes — 20/10/2026

`live-collaboration.tsx` apresenta documentos Markdown com prévia, check-ins, pautas/atas e notificações. `advanced-conversation.tsx` acrescenta respostas, reações, mensagens fixadas, busca, menções e anexos. `live-management.tsx` reúne relatórios de horas com CSV/PDF, metas, escalas/trocas, ausências, datas do time e clientes/projetos. A implementação dessas interfaces e seus caminhos de dados não equivale a validação autenticada dos fluxos.

`live-integrations.tsx` apresenta calendários Google/Outlook e conflitos, webhooks e auditoria conforme permissões; `live-calls.tsx` apresenta preparação de sala. OAuth Google/Outlook, SSO Azure e LiveKit exigem configuração externa e não estão ativos. A RPC de lembretes no app está aplicada. A função de push não foi implantada e aguarda aprovação explícita.

`offline-settings.tsx` oferece ativação, desbloqueio e exclusão de uma cópia cifrada no IndexedDB. A senha é local, exclusiva e tem no mínimo 12 caracteres. Limites: 10 canais, 200 mensagens por canal, sem anexos e expiração em 7 dias; sair da conta apaga a cópia. O aviso de acesso desatualizado explica que a cópia pode ser lida após mudança de permissão no servidor. O service worker não deve armazenar respostas autenticadas; essa cópia opcional tem seu próprio armazenamento cifrado.

O desktop Tauri foi compilado no CI como webview remoto da aplicação de produção. Os instaladores de Windows, macOS e Linux são **sem assinatura**, disponíveis no [run de build](https://github.com/yeMorGx/Hub/actions/runs/39365001709). `desktop-bridge.tsx` liga Ctrl/Cmd+Shift+H ao timer e indica não lidas com badge no macOS e título como alternativa nos demais sistemas. Instalação, execução e comportamento desses recursos em dispositivos desktop não foram testados.

As novas superfícies mantêm a autoridade visual Shakuro e os tokens existentes em [DESIGN.md](../DESIGN.md): grafite, laranja quente, Manrope, Phosphor, bordas discretas e hierarquia em português. Formulários se empilham no celular; a tabela de relatórios mantém rolagem horizontal contida com orientação visível. Não houve mudança no sistema visual.

A [revisão final independente](../.impeccable/review/phases-2-5/finish-review.md) abriu as 16 capturas desktop/celular e deu `ship` **somente às superfícies capturadas da demonstração fictícia e à entrada offline**, sem bloqueios visuais materiais identificados. A captura mobile do chat mostra a parte inferior da conversa rolável e não comprova posição inicial ou comportamento da rolagem. Não foram validados por essa revisão interações, teclado/leitor de tela, autenticação, autorização, persistência, cálculos/exportações, conexão com provedores, criptografia/sincronização offline, instalação ou áudio/vídeo real. As verificações anteriores de ausência de erros JavaScript e overflow raiz foram relatadas no handoff, sem repetição independente pelo revisor. Este parecer não ativa nem aprova integralmente as fases 2–5.
