# Motion design do ZULU

Este contrato guia animações no aplicativo, na demonstração e no site público. Preserve as identidades visuais já aprovadas em `DESIGN.md`; movimento melhora a leitura e o feedback, sem transformar o app de trabalho em uma apresentação.

## Direção e escopo

- **App (Operate):** movimento comunica estado, navegação ou resultado. Priorize feedback curto em controles, mudança entre páginas internas, abas e cartões importantes. Não encene a entrada de todos os dados quando o app abre.
- **Site público (Persuade):** revele o título e os blocos de conteúdo conforme entram na tela, com parallax discreto nas imagens. Na seção de recursos, mantenha a imagem em pin enquanto a lista ao lado rola e acompanhe a rolagem com um deslocamento curto da imagem; só em telas largas.
- Tilt e spotlight ficam limitados aos cartões destacados. O botão principal pode responder levemente ao ponteiro. Um cursor visual auxiliar pode aparecer apenas em dispositivos com mouse; não substitui estados de foco, cursor de texto nem feedback de toque.
- Cada movimento deve responder a uma causa. Evite animação decorativa repetida, loops fora de conteúdo ativo ou entrada que atrase tarefas.

## Stack e integração

- React usa `motion` (API `motion/react`, distribuição atual do Framer Motion) para presença, feedback de estado e layout. Não instalar também `framer-motion` em paralelo.
- GSAP com `ScrollTrigger` cuida de reveal, parallax e pin ligado à rolagem. Registrar o plugin uma vez no módulo de motion e criar/reverter cada cena em um contexto; não deixar listeners, tweens ou triggers após unmount.
- Lenis usa o ticker do GSAP e chama `ScrollTrigger.update` no evento de scroll. A página pública usa a janela; o app usa seu contêiner de rolagem `.main-content`. Rolagens internas, como a agenda, permanecem nativas e excluídas do Lenis.
- Next App Router usa um crossfade curto com Motion. A API `<ViewTransition>` do React requer a versão 19.3, enquanto este app usa React 19.2; não importar essa API até a versão mudar.
- Efeitos de ponteiro atualizam refs/estilos, sem estado React em cada movimento. Carregue a cena de rolagem junto da página que a usa e mantenha conteúdo visível sem JavaScript.

## Movimento e acessibilidade

- A origem de verdade para duração, distância e easing é a família `--motion-*` em `app/globals.css`; o adaptador TS lê esses tokens para Motion e GSAP.
- Microfeedback costuma ficar entre 150 e 250 ms; entrada de seção entre 500 e 900 ms. Prefira deceleração; linear só representa progresso contínuo real. Use stagger curto, sem coreografias longas.
- Anime transform e opacity. Não anime width, height, top ou left, não mova o layout e não dependa de `animationend` para concluir ações.
- Em `prefers-reduced-motion: reduce`, desligue rolagem suave, parallax, pin, tilt, magnetismo, cursor e movimento de layout. Preserve conteúdo e feedback com mudança imediata ou fade simples.
- Desative efeitos de mouse em touch/coarse pointer. Mantenha controles acessíveis por teclado, foco funcional e nomes acessíveis; a informação nunca depende de hover.
- Use `will-change` apenas durante efeitos ativos, encerre animações fora da tela e pause trabalho visual quando a aba estiver oculta.

## Aplicação atual

- Landing `/site`: título principal, imagens do produto, seção de recursos com pin/parallax e exploração de telas por abas.
- App autenticado `/`: microfeedback global, transição breve entre módulos, tilt/spotlight nos cartões de foco e home office. O timer conserva os presets Prism/Lava e sua própria regra de movimento reduzido.
- Outras rotas recebem apenas a transição de entrada e interações compartilhadas; não aplicar reveal a cada bloco de formulários, relatórios ou conversa.

O Kanban usa dnd-kit e MotionValues para o arraste com física; ler [kanban-interactions.md](kanban-interactions.md) antes de alterar o quadro.

## Referências

- [HeroUI React v3](https://heroui.com/en/docs/react/components): controles, foco e estados.
- [Motion para React](https://motion.dev/docs/react): presença e layout.
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): reveal, pin e scrub.
- [Lenis](https://github.com/darkroomengineering/lenis): rolagem suave e ticker GSAP.
- [Next.js 16 — transições de rota](https://nextjs.org/docs/app/guides/view-transitions): verificação de compatibilidade do App Router; a API React mostrada exige React 19.3.
- Skill `ui-ux-pro-max`, busca de animação/reduced motion, e skill `impeccable`, modos Operate e craft floor. Movimento reduzido, foco visível e press feedback foram tratados como critérios de aceite.
