## Disposition

**ship**, limited to the product-owned call surface shown in the supplied fixture captures and the reviewed source. No rebuild needed. This is a bounded finish review, not a full automated accessibility or live-media assessment.

## Material findings

No remaining material visual finding in the eight inspected captures: call, chat, share and error at 1440×1000 and 390×1000. The mobile chat composer and call controls are visible inside the supplied viewport. The previously missing accessible name for the icon-only mobile leave control is fixed in current source with `aria-label="Sair da chamada"`.

## Brief fidelity

The stock LiveKit presentation has been replaced by `CallSurface` and the product-owned `CallConference`; LiveKit supplies media/state primitives. The hierarchy, flat pale surfaces, dark ink, compact icon controls and black surround fit the existing collaboration family. `docs/collaboration-design.md` establishes the lilac/pastel collaboration treatment, so its use here is an acceptable extension of the existing identity. The layout does not introduce decorative borders or shadows; focus and speaking-state outlines serve an interaction purpose. PT-BR labels remain concise.

## Craft/accessibility

Desktop chat preserves participant context beside the conversation; mobile gives the conversation the main area while retaining call controls. Screen sharing gains the main stage with smaller participant tiles. The reconnection/error state communicates status through text, icon and color, retains the exit action, and provides an explicitly labeled dismiss control. Source preserves HeroUI-based buttons/dropdowns, microphone/camera toggle names and pressed states, the chat input/send labels, focus feedback, touch-visible tile actions, an alert role, chat log semantics and reduced-motion overrides. Current source explicitly labels the mobile leave action. No additional finish change is justified by these captures.

## Limits

Inspected all eight required PNGs and `components/call-surface.tsx`, `components/live-call-room.tsx`, `app/calls-design.css`, relevant design authority and the fixture capture script. No source edited. The fixture simulates participants, media, connection state and chat; it cannot establish real camera/audio, screen capture, publishing/subscription, remote delivery, device permissions, native Windows sharing, or actual connection recovery. The capture script overrides the room height and omits the authenticated app shell, so these images establish containment at their two captured viewport sizes rather than integrated-shell behavior, shorter screens or virtual keyboard behavior. No browser or tests were run by this reviewer. The Impeccable launcher/detector was reported absent by the coordinating review; this is a manual source-and-capture review without a deterministic detector result. Full keyboard navigation, focus restoration and screen reader behavior remain outside the screenshot evidence. Questions skipped: the brief and review scope are already closed.
