# ZULU desktop: bandeja, início automático e mini timer

## Uso

Windows 0.1.5 ou posterior. O X recolhe a janela para a bandeja, mantendo o processo aberto. Duplo clique no ícone ou “Abrir ZULU” restaura a janela. “Sair do ZULU” encerra o processo. O atalho Ctrl+Shift+H continua disponível; se o timer estiver no almoço, o atalho retoma a sessão existente.

Na title bar, o relógio abre o mini timer. O menu de três pontos permite mostrar/ocultar o mini timer, sair e marcar **Abrir ao ligar o PC**. Essa preferência vem desativada e grava apenas a entrada de início automático do próprio ZULU no Windows. Quando habilitada, inicia com `--background`, sem abrir a janela principal. Uma instalação normal abre a janela. Se a bandeja não puder ser criada, a janela fica acessível e fechar encerra o app normalmente.

O mini timer tem janela própria transparente de 328×80px, conteúdo em cápsula, sempre por cima das outras janelas, fora da barra de tarefas. Pode ser arrastado, recolhido e abrir o app. Mostra tempo, pausa para almoço/retomada e encerramento. Presets originais Prism/Lava, transição de estado e movimento reduzido preservados. Não inicia outra atividade e não recebe credenciais ou a descrição privada do trabalho.

O processo fica aberto durante a sessão do Windows; não é um serviço do sistema. Sair da conta limpa o estado do mini timer. Fechar a janela não encerra uma atividade no servidor. A suspensão/saída do Windows segue o comportamento normal do sistema e o registro de tempo do servidor.

## Contratos

- Tauri `tray-icon`, plugin oficial `tauri-plugin-autostart` e comandos fixos. IPC novo exige rótulo da janela e origem HTTPS exata de produção. A janela mini só navega para `/desktop/timer`.
- O snapshot contém fase, segundos, possibilidade de controle e busy; o Rust extrapola o tempo em execução usando Instant. Almoço fica estático. Sem acesso a tokens, registros de colegas ou configuração de URLs.
- Ações rápidas são encaminhadas à janela principal. Ela consulta novamente o timer/pausa do próprio usuário e usa as RPCs existentes, com MFA, titularidade, participação e time validados. Erros chegam ao mini timer e ao feedback principal; não se considera uma ação concluída só pelo clique.
- O clique de push ignora o cliente do mini timer, navega a janela principal e a restaura da bandeja por marcador de navegação do mesmo domínio; o marcador é removido depois de abrir. Uma segunda execução com `--background` não revela uma instância já aberta.
- Retornar à tela de login ou navegar/recarregar limpa o estado nativo. Sem sessão ou atividade, os controles ficam desativados. A janela mini não mostra title bar, atualização ou widgets do app completo.
- Cabeçalho autenticado é movido por portal para a title bar; o mesmo conteúdo fica no cabeçalho quando o frame customizado não está disponível. Avatar da sidebar e status de conexão redundante foram removidos. A atividade das pessoas é texto, sem play; presença desconhecida não ganha rótulo “indisponível”.
- Seletor inline de atividade usa liquid glass sobre Prism/Lava, com campos escuros legíveis em foco e fallback sem backdrop-filter. HeroUI continua sendo a base de controles.
- Início automático é mantido em atualização e removido na desinstalação normal pelo hook NSIS. Identificadores e nome técnico do instalador Hub são mantidos para compatibilidade.

## Referências

Source/documentação oficiais de [autostart](https://v2.tauri.app/plugin/autostart/), [bandeja](https://v2.tauri.app/learn/system-tray/) e WebviewWindowBuilder Tauri v2. HeroUI v3 Popover, Checkbox, Button e Spinner usam os exemplos compostos oficiais já adotados pelo projeto. Liquid glass é uma escolha explícita do usuário para este seletor, não uma mudança global de material.

## Verificação e publicação

Build web e 41 testes unitários; checagens em Chromium com IPC simulado verificam portal, início automático, vidro, remoção de duplicatas, mini timer transparente e pausa/retomada/encerramento. Testes de ação rápida validam estado, time e RPC; não gravam dados reais. A compilação local Rust depende de bibliotecas GTK ausentes nesta máquina, portanto a compilação e os controles reais do Windows são verificados pelo workflow desktop.

A validação Windows estende instalação/abertura/atalho/desinstalação: alterna a entrada de autostart, fecha para bandeja sem encerrar, reabre instância, abre mini timer topmost e inicia com `--background` sem janela. A assinatura do updater é verificada e adulteração rejeitada. A versão só será anunciada como publicada após esse fluxo terminar e o release estar disponível. Os testes nativos permanecem sem login e sem escritas de negócio; interações autenticadas do mini timer usam as mesmas RPCs de produção, mas não são executadas pelo smoke.
