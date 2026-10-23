# Exportação de horas no Windows — 0.1.7

## Problema e correção

O relatório usava download por Blob/âncora do navegador também dentro do aplicativo Windows. Não havia integração de salvamento nem confirmação do resultado no runtime desktop. O navegador passou na reprodução de download; o usuário confirmou que a falha silenciosa acontecia no aplicativo instalado.

PDF e CSV do relatório agora passam os bytes gerados para `save_report_export`. O comando nativo abre **Salvar relatório**, permite escolher destino/sobrescrita, grava somente após a escolha e informa sucesso ou cancelamento. A página não fornece um caminho de disco. O comando aceita somente a janela principal no domínio HTTPS de produção, arquivos `zulu-*` PDF/CSV de até 32 MB, cabeçalho PDF ou CSV UTF-8. Não envia dados do relatório para outro serviço.

O navegador continua baixando o arquivo e informa que o download foi solicitado. Aplicativos antigos que não possuem o comando recebem orientação de atualização. Cancelamento não é apresentado como sucesso; falhas de gravação deixam o botão disponível para tentar novamente.

## QA

- Build Next.js e 51 testes unitários aprovados, incluindo bytes entregues à ponte, cancelamento, falha de escrita, versão antiga e integridade CSV.
- Validador Rust: PDF/CSV aceitos, nomes/caminhos/tipos/tamanhos inválidos rejeitados.
- Chromium em 1440/390: download real do PDF no navegador e ponte nativa simulada para sucesso, cancelamento CSV, falha e versão antiga. Sem erros JavaScript.
- Regressão em 1440/390: dashboard, relatório, PDF, permissões de membro, configurações e temas.
- Workflow Windows inclui compilação/assinatura, testes Rust e integração do diálogo real por automação Windows na página pública de demonstração: gerar e salvar PDF fictício, conferir bytes e cancelar uma exportação CSV. O modo de teste requer duas variáveis explícitas e navega somente para essa página fixa; não habilita depuração remota. Nenhuma conta criada ou dado real utilizado.

Resultado Windows: workflow [39947349625](https://github.com/yeMorGx/Hub/actions/runs/39947349625) concluído com sucesso. `nativeExportSaved` e `nativeExportCancelled` verdadeiros no instalador real, ciclo de instalação/desinstalação aprovado e assinatura do updater validada, incluindo rejeição de adulteração. As tentativas anteriores de automação por depuração remota falharam antes da exportação e foram substituídas pela interação real com a interface.

Publicada a release [desktop-v0.1.7](https://github.com/yeMorGx/Hub/releases/tag/desktop-v0.1.7), com instalador e assinatura. Endpoints públicos `/api/desktop/update` e `/api/desktop/manifest` conferidos: versão 0.1.7, assinatura presente e URL do instalador correspondente. Instalador: 11.249.380 bytes; SHA-256 `cf1b91832f5477c15c493c64a9ff84b3215ad8d635bf161be14dc4d072a03938`.
