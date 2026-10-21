import { BrandMark, BrandWordmark } from "@/components/brand";
import type { Metadata } from "next";
import Link from "next/link";
import "../marketing.css";

const policyUrl = "https://hub-one-azure.vercel.app/privacy";
const contactEmail = "auth@mindapp.icu";

export const metadata: Metadata = {
  title: "Política de privacidade — ZULU",
  description:
    "Saiba quais dados o ZULU trata, por que os utiliza e como solicitar acesso, correção ou exclusão.",
  alternates: { canonical: policyUrl },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="m-page m-policy">
      <a className="m-policy-skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="m-policy-header">
        <div className="m-policy-shell m-policy-nav">
          <Link className="m-policy-brand" href="/site" aria-label="ZULU, início">
            <BrandMark size={30} /><BrandWordmark />
          </Link>
          <nav aria-label="Navegação principal">
            <Link href="/site">Início</Link>
            <Link href="/download">Downloads</Link>
            <Link href="/login">Entrar</Link>
          </nav>
        </div>
      </header>

      <article className="m-policy-shell m-policy-content" id="conteudo">
        <div className="m-policy-kicker">ZULU · PRIVACIDADE</div>
        <h1>Política de privacidade</h1>
        <p className="m-policy-intro">
          Esta política explica como o ZULU trata informações pessoais quando
          você usa o aplicativo, o site e os recursos opcionais de colaboração.
        </p>
        <p className="m-policy-updated">Atualizada em 20 de outubro de 2026</p>

        <section>
          <h2>1. Quem é responsável e como falar conosco</h2>
          <p>
            O ZULU é um aplicativo de trabalho em equipe. O publicador do ZULU é
            responsável pelo tratamento descrito nesta política. Para pedidos
            de privacidade, dúvidas ou reclamações, escreva para{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Informe o
            endereço de e-mail da sua conta e o nome do time para localizarmos
            os dados. Nunca envie sua senha ou códigos de autenticação.
          </p>
        </section>

        <section>
          <h2>2. Dados que o ZULU trata</h2>
          <ul>
            <li>
              <strong>Conta e perfil:</strong> nome, endereço de e-mail,
              identificador da conta, foto ou imagem de perfil se você a
              fornecer e informações de autenticação e segurança, como o estado
              da verificação em duas etapas.
            </li>
            <li>
              <strong>Informações do time:</strong> organização, times,
              participação, papel, canais, presença e estado de disponibilidade.
            </li>
            <li>
              <strong>Conteúdo criado no ZULU:</strong> mensagens e respostas,
              reações, arquivos e anexos, notas, check-ins, tarefas, eventos,
              pautas, atas, confirmações de presença, projetos, clientes,
              metas, escalas, solicitações de ausência e registros de horas.
              Esse conteúdo pode incluir dados pessoais que você ou outras
              pessoas escrevam ou anexem.
            </li>
            <li>
              <strong>Preferências e notificações:</strong> configurações do
              aplicativo, inscrição de notificações push por dispositivo e
              notificações internas. As notificações push enviadas pelo ZULU
              usam texto genérico e não incluem o conteúdo da mensagem.
            </li>
            <li>
              <strong>Integrações opcionais:</strong> identificadores de
              conexão e dados de eventos necessários para sincronizar um
              calendário do ZULU que você conectou. Tokens de acesso e renovação
              da conexão são guardados em formato cifrado. O ZULU cria e usa um
              calendário separado para a equipe; a agenda pessoal não é
              sincronizada por padrão.
            </li>
            <li>
              <strong>Dados técnicos e de segurança:</strong> registros de
              autenticação, alterações administrativas e de segurança, além de
              informações técnicas necessárias para manter a sessão, proteger
              o serviço e diagnosticar falhas.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Para que usamos os dados</h2>
          <p>Usamos essas informações para:</p>
          <ul>
            <li>criar e proteger contas, sessões e acesso com MFA;</li>
            <li>entregar conversas, agenda, tarefas, documentos e controle de horas;</li>
            <li>mostrar presença e permissões de acesso dentro de cada time;</li>
            <li>enviar mensagens de confirmação e recuperação de conta;</li>
            <li>enviar notificações que você ativar e processar integrações que conectar;</li>
            <li>prevenir abuso, investigar incidentes e manter a segurança e a disponibilidade;</li>
            <li>atender solicitações e cumprir obrigações legais aplicáveis.</li>
          </ul>
          <p>
            No Brasil, o tratamento pode se apoiar na execução do serviço
            solicitado, no cumprimento de obrigações legais, no exercício
            regular de direitos, no legítimo interesse relacionado à segurança
            e ao funcionamento do ZULU ou no consentimento, quando aplicável.
            Você pode desativar notificações e desconectar integrações opcionais
            nas configurações do aplicativo.
          </p>
        </section>

        <section>
          <h2>4. Quem pode ver os dados</h2>
          <p>
            O conteúdo de um time fica disponível às pessoas autorizadas naquele
            time e canal, de acordo com os papéis e as permissões configurados.
            Administradores podem acessar informações necessárias para
            administrar o time. Considere isso antes de publicar dados pessoais
            ou confidenciais em espaços compartilhados.
          </p>
          <p>
            O ZULU não vende dados pessoais nem os utiliza para publicidade
            comportamental. Também não compartilhe dados de terceiros sem ter
            autorização ou outra base legal adequada.
          </p>
        </section>

        <section>
          <h2>5. Prestadores e integrações</h2>
          <p>
            Para operar o serviço, o ZULU utiliza prestadores que tratam dados
            conforme necessário para suas funções:
          </p>
          <ul>
            <li>
              <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
                Supabase
              </a>{" "}
              para autenticação, banco de dados, sincronização em tempo real e
              armazenamento de arquivos;
            </li>
            <li>
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                Vercel
              </a>{" "}
              para hospedagem do site e das funções do aplicativo;
            </li>
            <li>
              <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                Resend
              </a>{" "}
              para o envio de e-mails transacionais da conta;
            </li>
            <li>
              Google Calendar ou Microsoft Outlook, somente quando você
              conectar uma conta e autorizar a integração;
            </li>
            <li>
              LiveKit e o serviço push do navegador ou dispositivo, somente
              quando você usar chamadas ou ativar notificações compatíveis.
            </li>
          </ul>
          <p>
            Esses prestadores podem processar dados em outros países, conforme
            sua infraestrutura e os serviços habilitados. Cada integração
            também está sujeita às políticas do respectivo provedor. Você pode
            desconectar o calendário ou desativar push no ZULU; isso interrompe
            o uso futuro da integração pelo aplicativo.
          </p>
        </section>

        <section>
          <h2>6. Armazenamento, segurança e cópias locais</h2>
          <p>
            O ZULU usa controles de acesso por time e canal, autenticação com
            MFA, políticas de acesso ao banco e medidas técnicas destinadas a
            proteger contas e conteúdo. Credenciais de integrações de calendário
            são cifradas antes de serem armazenadas. Nenhuma transmissão ou
            armazenamento eletrônico pode ser garantido como totalmente livre
            de riscos.
          </p>
          <p>
            Se você ativar o leitor offline, uma cópia limitada de conversas
            escolhidas fica cifrada neste dispositivo, protegida por uma senha
            criada por você, sem anexos e com validade local de até sete dias.
            Ela é removida quando você sai da conta no dispositivo.
          </p>
        </section>

        <section>
          <h2>7. Retenção e solicitações sobre seus dados</h2>
          <p>
            Mantemos os dados enquanto forem necessários para fornecer o ZULU,
            administrar os times, proteger o serviço e cumprir obrigações
            aplicáveis. Períodos técnicos de cópia de segurança e retenção dos
            prestadores podem fazer com que algumas cópias levem tempo para
            desaparecer após uma solicitação.
          </p>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção,
            portabilidade, informação sobre compartilhamento, anonimização ou
            exclusão quando a lei permitir, além de revogar consentimentos
            aplicáveis. Escreva para{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Podemos pedir
            informações razoáveis para confirmar sua identidade e poderemos
            precisar manter determinados dados para cumprir a lei ou proteger
            direitos. Como o conteúdo de equipe pode envolver outras pessoas,
            alguns pedidos podem exigir análise do administrador do time.
          </p>
        </section>

        <section>
          <h2>8. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta política quando o ZULU ou as regras aplicáveis
            mudarem. A versão vigente ficará disponível neste endereço e exibirá
            a data da última atualização.
          </p>
        </section>

        <aside className="m-policy-contact">
          <strong>Solicitações de privacidade</strong>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </aside>
      </article>

      <footer className="m-policy-footer">
        <div className="m-policy-shell">
          <Link href="/site">ZULU</Link>
          <span>Uma política clara para um espaço de trabalho compartilhado.</span>
          <Link href="/download">Downloads</Link>
        </div>
      </footer>
    </main>
  );
}
