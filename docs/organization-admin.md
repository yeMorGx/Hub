# Administração da organização e biblioteca

Implementação do [plano aprovado](organization-admin-plan.md), em 23/10/2026. A autoridade vale somente para a organização cliente. Cargo público é texto livre; não concede acesso.

## Onde encontrar

- Configurações → Organização: pessoas, convites, aprovações, funcionalidades, políticas e histórico. Administração geral vê a organização; administração de time recebe escopo limitado. Aprovadores têm a central de decisões.
- Trabalho → Biblioteca: bibliotecas, pastas, documentos Markdown e anexos privados.
- Conversas → Contatos: DM entre pessoas da organização, sem abrir os dados de outro time.
- Notificações: decisões, responsabilidade por documentos e aceite da transferência de propriedade.

## Matriz de autorização

| Camada | Regra |
| --- | --- |
| Organização | Usuário ativo e MFA; desativação de módulo prevalece sobre concessões individuais. |
| Time | Participação ativa e time não arquivado; acesso a outro time exige inclusão autorizada. |
| Pessoa | Permissões explícitas por módulo/time; visualizar, usar/editar e gerenciar somente onde há operação correspondente. |
| Autoridade | Dono, administração geral/time e aprovador são independentes do cargo exibido. |
| Documento | ACL específica de leitura, edição, download e compartilhamento; administração não libera conteúdo privado. |
| DM | Apenas participantes; nenhuma exceção de leitura para dono/admin. |

Membros existentes mantêm padrões compatíveis. Gerenciamento fica com administradores; relatório coletivo, por padrão, somente administração geral. Novos convites começam sem permissões e o administrador escolhe o acesso. Conceder gerenciamento, administração ou novo time segue governança. Ocultar uma página não substitui a autorização: RLS, RPCs e endpoints também verificam o acesso.

## Aprovações e propriedade

- Pedidos guardam alteração, motivo, política, aprovadores e quórum imutáveis. Alterações de política não liberam pedidos antigos.
- Administradores não votam no próprio pedido. Dono pode executar diretamente ou enviar ao grupo; nesse caso pode votar quando faz parte da política, sem ignorar quórum ou votos obrigatórios.
- Rejeição encerra imediatamente com motivo; cancelamento preserva histórico; expiração padrão de sete dias, configurável de um a noventa.
- Execução revalida autoridade e condições sob bloqueio transacional; pedido concluído não executa novamente.
- Transferência exige aceite do sucessor. Transferência com saída acontece em conjunto; dono atual permanece até o aceite. Admin não remove/rebaixa o dono.
- Suspensão/remoção revoga participação. Reativação da organização não restaura times automaticamente. Arquivamento de time preserva dados.
- Permissões e política em edição sobrevivem à consulta automática de quinze segundos. Autorizações são conferidas novamente no servidor a cada operação; conexões Realtime já abertas podem manter autorização em cache do provedor.

## Convites

Configuração captura cargo, times, permissões e autoridade antes da emissão. Convite comum de um time pode ser autorizado diretamente; poderes elevados e vários times exigem aprovação. O link só é gerado depois da autorização e seu token fica armazenado como hash. A aceitação aplica a configuração autorizada. Envio de e-mail automático não faz parte deste fluxo: administrador copia e entrega o link.

## Biblioteca

Biblioteca raiz começa privada; filhos podem herdar acesso do espaço. Concessão explícita no item define seu acesso e não abre pais/irmãos. Classificar como sensível interrompe herança futura, preserva os destinatários existentes e exige autorização do responsável para novos compartilhamentos. Compartilhar direitos que o solicitante não possui também cria pedido, sem conceder acesso antecipado.

Anexos de até 50 MB ficam no bucket privado `organization-library`. Download confere ACL e emite URL de curta duração para o anexo atual. Salvar conteúdo/anexo exige a versão esperada, evitando sobrescrita silenciosa. Cancelar edição descarta o rascunho. A interface oculta recursos não autorizados e fecha documentos que perderam leitura na atualização de acesso.

Ao sair o responsável, autoria histórica permanece. Responsabilidade é atribuída ao primeiro administrador de time elegível; administração geral/dono servem de fallback e recebem notificação. Responsabilidade permite administrar o documento; cargo administrativo sozinho não permite isso.

## QA e limites

- 131 cenários SQL em PostgreSQL WASM/PGlite: isolamento, MFA, proteção do dono, aprovação, quórum, revogação, convites, ACL, anexos e contatos entre times.
- 47 testes unitários existentes + 7 do modelo de permissões; build de produção aprovado.
- 35 verificações HTTP públicas: incluindo bloqueio de emissão de convite/download sem sessão.
- Chromium em 1440 e 390 px: painel, confirmação, convites, decisões, políticas, biblioteca e compartilhamento; sem erros JavaScript ou escritas de negócio. Regressão de dashboard, PDF, tema, configurações e seleção de calendário.
- Revisão final delimitada: `ship`, após corrigir rascunhos sobrescritos pelo polling, feedback de compartilhamento pendente e cancelamento de edição.

Capturas/testes de navegador usam fixtures fictícias e não comprovam aceite real de convites, MFA ou transferência autenticada em produção. Testes SQL não substituem auditoria independente. Nenhum envio de e-mail, acesso a documentos reais ou alteração de membros reais foi feito no QA.

Cobrança/mudança de plano, E2EE, análise jurídica LGPD/ANPD, retenção e compartilhamento externo permanecem fora desta entrega. Não há promessa de revogar cópias baixadas ou impedir captura de conteúdo já entregue. O desktop continua usando o aplicativo publicado; esta entrega não altera código nativo nem gera novo instalador.

## Referências consultadas

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): autorização no banco.
- [GitHub — Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): referência para invalidar aprovação diante de alterações; implementação ZULU usa payload imutável e novo pedido.
- [HeroUI v3 — guia oficial](https://github.com/heroui-inc/heroui/blob/v3/skills/heroui-react/SKILL.md), [Checkbox](https://heroui.com/en/docs/react/checkbox), [Tabs](https://heroui.com/en/docs/react/tabs), [Modal](https://heroui.com/en/docs/react/modal): primitivas oficiais, composição e comportamento acessível.
