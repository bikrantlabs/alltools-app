# AllTools Visual Direction

## Design read

Reading this as: an **Operate** surface for people processing real files, with a **quiet instrument / print-room utility** language, leaning toward **asymmetrical editorial layout and tactile soft-structuralism** rather than SaaS dashboard conventions.

## Chosen world

AllTools is treated as a small digital instrument found on a well-designed workbench: calm enough for repeated use, specific enough to feel made, and visibly local. The system uses warm mineral paper, ink-black structural fields, one committed signal accent (vermillion), and precise linework borrowed from registration marks, index labels, and file-room notation.

The visual world is not a hero-led marketing page. The catalog is a working index with a strong opening panel, a deliberate asymmetrical rhythm, and tool cards that feel like labeled instruments. The PDF tool is a three-stage file studio: intake, queue, and output. It should feel like a tray moving through a machine, not a blank upload state.

## Dials

- Design variance: 8
- Motion intensity: 5
- Visual density: 5

## Palette

- Paper: `#F1F0EB`
- Shell: `#FBFAF6`
- Ink: `#1C2026`
- Muted ink: `#717775`
- Hairline: `rgba(28,32,38,.15)`
- Vermillion signal: `#D9573F`
- Soft signal: `#F4D8D1`
- Quiet green status: `#79A68B`

No gradients are used for visual identity. Texture comes from repeated CSS line patterns, offset hairlines, nested shells, and small registration marks.

## Typography

Use a neutral system sans for reliability in an Operate surface, but use weight, tracking, and scale for authorship. Headings are compact and deliberate; labels are small uppercase index notation; body copy is short and factual. Do not add marketing filler.

## Layout

- Floating content column inside a paper-colored application canvas.
- Narrow, quiet sidebar with index navigation.
- Catalog: asymmetric hero/index panel, one large featured tool card, then a compact tool rail.
- Tool page: left task rail + central queue + right output/status rail on wide windows; collapses to a single ordered column below 900px.
- Major surfaces use a double-bezel shell: outer tray, inner working surface.

## Motion

Use restrained spring-like transitions with custom cubic-bezier curves. Pattern marks drift a few pixels on hover; cards lift by transform only; queue rows enter with staggered opacity/translate motion; progress uses a moving highlight. Respect `prefers-reduced-motion`.

## Prohibited defaults

No generic gradient hero, no three equal feature cards, no filler “everything useful” copy, no fake metrics, no decorative orbital network as the primary visual, no plain centered uploader, no Bootstrap-style grid, and no invented tool categories beyond the actual product catalog.
