# Disposition

**fix**, then **recapture** the 390px layout and keyboard focus state. The 1440px and 870px captures are visually acceptable. A rebuild is unnecessary for the design direction.

# Material findings

1. **Mobile primary action hidden on opening.** In `share-picker-390.png`, the visible modal ends after the capture note; neither Share nor Cancel is visible. `components/live-call-room.tsx:326` places actions after all picker content; `app/calls-design.css:114` stacks three quality choices and the picker while leaving actions in normal flow. The action is reachable by scrolling (the supplied browser script clicks it successfully), but the task requires users to discover a second scroll area beneath an independently scrolling source list. Keep actions visible outside the scrolling body, or compact the mobile layout sufficiently, and confirm no focus target is obscured. This is material under AGENTS.md’s explicit requirement to inspect visible actions on mobile.
2. **Unchecked radio control boundary lacks contrast.** `app/calls-design.css:102` uses #d8d3e1 for unchecked controls against #f1f0f5 cards, approximately 1.3:1. Supply a boundary or fill with at least 3:1 contrast. Selected purple controls and text are clear. Recheck both selected and unselected quality states.

# Brief fidelity

The replacement follows the established light collaboration family: flat white modal, restrained lilac selection, blue primary action, compact legible source rows, no ornamental borders or shadows. The rejected dark text on dark source cards, stretched radio bars, and orange outlines are absent in all three captures. Desktop source/preview proportions and the scan hierarchy are coherent. Native listing and selection remain represented in the component; no transport redesign is introduced by this styling.

# Craft and accessibility

Source cards provide generous hit areas and readable titles; truncation is intentional. Quality controls now remain circular at 16px while the full cards are interactive. Official HeroUI Radio.Content renders the React Aria RadioButton, so the data-focus-visible selector is correctly targeted; a replacement 2px outline is defined after the legacy outline reset. Actual keyboard focus was not captured, so visible runtime focus remains unconfirmed. Source buttons preserve aria-pressed, previews have source-specific alt text, groups have labels, and reduced-motion overrides are present. The scrollable six-source fixture shows only a subset at once; screenshot inspection does not establish wheel/touch/keyboard behavior. Compact secondary 10px metadata is readable in supplied captures but should not shrink further.

# Limits

Reviewed current AGENTS.md, installed skill catalog, DESIGN.md, ZULU HeroUI and relevant review guidance, the named CSS/component source, official installed Radio.Content source, browser QA script, and required screenshots at 1440/870/390. No browser was run and no source was edited. Preview is explicitly a labeled synthetic image; these captures cannot validate real Windows preview quality, capture permissions, native transport, authenticated calls, all accessibility behavior, or production deployment. Build and automated routing success are supplied by the implementing agent rather than independently rerun here. Impeccable launcher/detector absence was already established by the parent workflow.
