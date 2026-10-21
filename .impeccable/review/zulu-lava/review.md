# Timer Prism → Lava

Implementação local, 21/10/2026. Sem deploy nesta etapa.

- Autoridade: presets originais Prism e Lava, Spell UI, commit `659b5c2ae405ea9e1c363e09cca7380a0d98e271`. Ambos comparados ao source oficial sem diferenças.
- Prism quando idle/lunch; Lava quando running. Crossfade de 650 ms reversível, sem atrasar ações. Dois canvases estáveis; apenas o preset visível anima continuamente.
- `npm run build`: passou. `npm run test:unit`: 29/29.
- `HUB_APP_URL=http://127.0.0.1:3015 python scripts/prism-browser.py`: seis cenários passaram, em 1440 e 390 px, WebGL2 real, movimento reduzido e fallback sem WebGL2.
- Verificados: pausa/retomada/encerramento, opacidade intermediária, inversão durante a transição, camada oculta sem loop, contextos estáveis, resize em movimento reduzido, sem overflow e sem erros de página.
- Inspeção visual das capturas desktop/mobile: texto legível sobre Lava e composição preservada. Sem alteração de dados ou integrações de negócio.
- Escopo: prévia local usa o mesmo TodayOverview do app. Não comprova sessão autenticada, desempenho em hardware Windows real ou publicação em produção.
