# ZULU Night Shift

Mode: Operate. Selected by user: option 3, third displayed image, `docs/design-references/2026-10-24/night-shift.png` (1487×1058; target composition normalized to1440×1024). This replaces the earlier ivory identity across authenticated workspace, access and previews. Marketing is independent.

The primary mechanism is choosing a real task and recording work excluding lunch, in the team's agenda/presence context. Audience: teams working daily on desktop, including Windows Tauri. Preserve native OS controls/APIs, official symbol, icon rail, MFA, RLS, permissions and all22 destinations.

First viewport: graphite canvas #101217,72–80px continuous icon rail/titlebar, expansive task list (about70%) and contextual agenda/team column(30%), lavender expanded task, mint primary action. Fixed bottom timer dock spans the workspace and remains reachable. Inter14–16px body, Manrope heading, warm white text, muted lavender neutrals, no decorative borders/shadows. HeroUIv3 primitives and functional focus remain.

Tasks expand inline with actual description/project/assignee/due/status, completion uses versioned RPC. Mock subtask counts/attachments are not shipped as invented data: current task schema has no such fields. Dates, names, timer values come from real data; demo is explicitly illustrative. Idle/empty/error/loading and lunch keep equivalent actions.

Signature interaction: selecting a task softly expands its detail; timer state changes use Prism/Lava only as a tiny active signal, preserving reduced motion. No entrance replay on navigation.

One shared workspace renderer for production and demo, separate controllers. Demo mutations stay memory-only; unsupported/external actions explain the limitation rather than pretending success. No demo data enters production.

Image asset inventory: supplied official SVG symbol and data-driven initials/avatars; no new raster illustration needed. Do not recreate the entire reference as an image.
