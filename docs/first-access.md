# Publicação e primeiro acesso

## Estado atual

O usuário ainda não tem conta e o aplicativo não tem URL pública. O build está disponível no ambiente de desenvolvimento. Publicar esse ambiente não cria uma hospedagem pública do Hub.

O código da aplicação está preparado na branch `codex/hub-foundation-kanban`, para revisão em PR rascunho. O commit inicial de `main` contém apenas a base anterior. Use a branch da aplicação ao configurar uma hospedagem de revisão; a publicação de produção deve usar a versão revisada. Não houve merge nem deploy nesta etapa.

## Publicar o frontend

O caminho sugerido é Vercel com o preset Next.js. Não há integração ou credencial de hospedagem disponível nesta sessão; a publicação não foi executada.

1. Revise a branch `codex/hub-foundation-kanban` do repositório `yeMorGx/Hub`, preservando o `.env.local` ignorado e sem chaves administrativas. O PR rascunho está identificado na entrega da conversa.
2. Importe esse repositório na Vercel. A raiz do projeto é a raiz do repositório, e o comando de build é `npm run build`.
3. Configure no ambiente de build da hospedagem:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave **publishable**, obtida no painel do projeto. Nunca use `service_role` ou secret key.
4. Publique e obtenha a URL HTTPS efetiva. Mudanças nessas variáveis públicas exigem novo build.

Não é necessário aplicar novamente as migrações: as três existentes já estão no projeto Supabase.

## Supabase após obter a URL

Em **Authentication → URL Configuration**:

- Defina **Site URL** como a origem HTTPS efetiva do app.
- Autorize a URL exata `ORIGEM/auth/callback`.
- Autorize também `ORIGEM/auth/callback?next=/reset-password` para o fluxo de recuperação implementado.
- Se usar templates por `token_hash`, ajuste-os para o handler `/auth/confirm`, conforme `supabase-app-integration.md`.

Substitua `ORIGEM` pelo domínio real. Não use o endereço interno do servidor nem mantenha curingas amplos para domínios de terceiros.

Em **Realtime → Settings**, desative **Allow public access** antes do piloto. Os clientes usam rooms privados e as políticas já estão no banco. Essa configuração ainda não foi inspecionada/alterada nesta sessão.

## Criar a primeira conta

1. Abra `/login` na URL publicada e selecione **Criar conta**.
2. Informe nome, e-mail e uma senha com pelo menos 12 caracteres.
3. Abra o e-mail de confirmação. O app informa se o link expirou; ainda não há botão dedicado de reenvio de confirmação nesta entrega.
4. Entre com e-mail e senha. Na tela MFA, prepare o autenticador, escaneie o QR code ou use a chave manual e confirme o código atual de seis dígitos.
5. Crie seu workspace e time no onboarding. A criação do workspace concede a administração inicial conforme o RPC existente.

Senha, QR/chave TOTP e códigos devem permanecer com o usuário; não são necessários no chat. Nenhuma conta real ou autenticador foi criado pelos testes.

## Validar com uma segunda pessoa

A segunda pessoa cria/confirma sua própria conta e configura o MFA. Compartilha apenas o UUID do perfil. O administrador a adiciona ao workspace/time pelo app.

Verifique troca de mensagens, presença, digitação, não lidas, RSVP e mudanças do Kanban entre duas sessões. Cada pessoa deve acessar somente os dados permitidos pelo seu papel. Confirme início/parada de horas no card e bloqueio de um segundo timer; revogue uma associação e confira corte de acesso e encerramento do timer.

Esses passos produzem dados reais e ainda não foram executados. Os [resultados automáticos](validation-2026-10-20.md) cobrem SQL local e navegação anônima.
