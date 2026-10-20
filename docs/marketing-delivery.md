# Site público e central de downloads

## Escopo

Pedido: pesquisar sites de design e componentes; escolher a direção sem perguntar ao usuário; criar landing completa e uma página separada com opções de sistema, versão e download. O usuário pediu que o site tivesse identidade própria, pois a UI do app será alterada depois.

- `/site`: apresentação do produto, captura do aplicativo, vitrine interativa de quatro telas, recursos, timer de demonstração sem gravação, acesso web, FAQ e CTAs.
- `/download`: Windows 0.1.2 x64 disponível, versão/tamanho/formato, requisitos, instalação, notas de versão e SHA-256 com cópia; Mac/Linux/celular encaminham para web. Não há downloads inexistentes apresentados como disponíveis.
- `/` e fluxos autenticados continuam no aplicativo existente. O site está em rota pública própria.
- SEO: metadados, URLs canônicas, imagem social original, favicon próprio do site, sitemap restrito às páginas públicas e robots.
- As páginas de marketing não precisam consultar Supabase/Auth para serem servidas. A regra de autenticação das rotas do app foi preservada.

## Direção e pesquisa

[Pesquisa, referências, componentes e limites de acesso](marketing-research.md). Azul elétrico, verde vivo, tinta e superfícies claras, com Manrope local. Capturas WebP próprias da demonstração, identificadas como dados fictícios; nenhuma imagem de referência foi usada no produto final. [Proveniência](validation/marketing/assets.json).

Impeccable foi usado para orientação e revisão. O launcher/detector não está instalado nesta sessão; documentos existentes e referências da skill foram lidos diretamente. O usuário delegou a escolha e dispensou perguntas. Implementação em código com capturas reais, sem comp gerado. A revisão independente retornou **ship** para as duas páginas nas larguras capturadas, sem correções materiais exigidas. Não constitui auditoria completa de acessibilidade nem validação das integrações privadas.

## Download público

A release `desktop-v0.1.2`, anteriormente rascunho, foi publicada para atender ao download público solicitado. O instalador é o mesmo artefato Windows testado anteriormente, sem alterações nativas nesta entrega.

URL: https://github.com/yeMorGx/Hub/releases/download/desktop-v0.1.2/Hub_0.1.2_x64-setup.exe

2.313.817 bytes. SHA-256: `454cd533dc657f2d61fa3d9c6454d783ef35bb955288d4c0430fc27647fbed93`.

GET anônimo retornou 200 e hash correspondente; clique no botão pelo Chromium iniciou download com nome e hash esperados. O instalador não foi executado nesta validação do site. [Evidência HTTP](validation/marketing/download.json). O smoke Windows da entrega nativa permanece em [Avisos de atualização](desktop-updates.md).

A ausência de assinatura de código é informada na central e no FAQ. Publicar a release não assina o executável. A versão/macOS/Linux da central não muda automaticamente: manter `lib/desktop/public-release.ts` atualizado após futuras releases testadas.

## Verificações

- Build Next.js: passou, incluindo rotas públicas, sitemap, robots e imagem social.
- 21 unitários passaram.
- 32 verificações HTTP locais passaram, incluindo proteção das rotas privadas existentes e os três novos checks públicos.
- Chromium 1440/390: navegação entre páginas, quatro abas, seleção por teclado, timer demonstrativo, FAQ, menu móvel, cópia SHA-256, imagens carregadas, ausência de erros e overflow. 1280/320: ausência de overflow do documento.
- Quatro capturas em `validation/marketing/`. Imagens foram carregadas antes das capturas; uma captura inicial com imagem lazy fora da viewport foi descartada.

Publicação e checks em produção são registrados ao concluir o deployment.
