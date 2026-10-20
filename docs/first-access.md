# Publicação e primeiro acesso

## Estado atual

O aplicativo está publicado em **https://hub-one-azure.vercel.app**, no projeto Vercel `yemorgxs-projects/hub`. Em 20/10/2026, o usuário informou ter concluído cadastro, confirmação de e-mail e MFA. A URL principal e os dois callbacks de Auth foram conferidos; Realtime está com `private_only=true`. O fluxo com duas contas ainda não foi exercitado nesta sessão. Publicar o ambiente de desenvolvimento é uma etapa separada da hospedagem do app.

O código da aplicação está preparado na branch `codex/hub-foundation-kanban`, para revisão em PR rascunho. O commit inicial de `main` contém apenas a base anterior. Use a branch da aplicação ao configurar uma hospedagem de revisão; a publicação de produção deve usar a versão revisada. Não houve merge. O deploy foi feito pela CLI a partir do checkout da aplicação; a integração automática com o GitHub não foi configurada.

## Publicar o frontend

A publicação na Vercel já foi executada com autorização do usuário, após login oficial. O preset Next.js e os comandos de instalação/build estão em `vercel.json`. As instruções abaixo servem para reproduzir a hospedagem ou conectar a integração Git futuramente. Veja o [registro do deploy](vercel-deployment.md).

1. Revise a branch `codex/hub-foundation-kanban` do repositório `yeMorGx/Hub`, preservando o `.env.local` ignorado e sem chaves administrativas. O PR rascunho está identificado na entrega da conversa.
2. Importe esse repositório na Vercel. A raiz do projeto é a raiz do repositório, e o comando de build é `npm run build`.
3. Configure no ambiente de build da hospedagem:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave **publishable**, obtida no painel do projeto. Nunca use `service_role` ou secret key.
4. Publique e obtenha a URL HTTPS efetiva. Mudanças nessas variáveis públicas exigem novo build.

Não aplique novamente as migrações já registradas. O [estado por fase](remaining-phases.md) registra as migrações e configurações atuais.

## Supabase após obter a URL

Em **Authentication → URL Configuration**:

- Defina **Site URL** como a origem HTTPS efetiva do app.
- Autorize a URL exata `ORIGEM/auth/callback`.
- Autorize também `ORIGEM/auth/callback?next=/reset-password` para o fluxo de recuperação implementado.
- Se usar templates por `token_hash`, ajuste-os para o handler `/auth/confirm`, conforme `supabase-app-integration.md`.

Nesta publicação, `ORIGEM` é `https://hub-one-azure.vercel.app`. Não use o endereço interno do servidor nem mantenha curingas amplos para domínios de terceiros.

Em **Realtime → Settings**, desative **Allow public access** antes do piloto. Os clientes usam rooms privados e as políticas já estão no banco. Essa configuração foi aplicada e lida novamente como `private_only=true` em 20/10/2026.

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
