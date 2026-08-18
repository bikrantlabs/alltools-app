# AllTools Visual Direction

## Design read

Reading this as an **Operate** surface for people processing real files, with a **modern macOS utility** language: calm, polished, spatially clear, softly tactile, and native-feeling without imitating a specific Apple application.

## Chosen world

AllTools is a quiet, elegant desktop workbench for local file tasks. The interface should feel like a well-made macOS utility: a warm neutral canvas, translucent-looking surfaces without excessive blur, rounded controls, soft elevation, clean sans typography, and a single purposeful accent. It should feel contemporary and premium through restraint, not decoration.

The previous retro file-room, registration-mark, hard-offset, mono-index, and neobrutalist visual language is retired. Route identity and local-status indicators remain useful, but they should be presented as subtle modern chips and status pills.

## Palette

- App canvas: `#F5F5F7`
- Primary surface: `#FFFFFF`
- Secondary surface: `#FAFAFC`
- Elevated surface: `#FFFFFF`
- Ink: `#1D1D1F`
- Secondary ink: `#6E6E73`
- Hairline: `rgba(29,29,31,.09)`
- Soft shadow: `0 12px 34px rgba(29,29,31,.07)`
- Accent: `#5967D8`
- Accent soft: `#EEF0FF`
- Success: `#27845D`
- Success soft: `#E7F5ED`

The palette is neutral-first with one indigo accent. No gradients, hard offset shadows, decorative crosses, heavy index labels, or saturated multi-accent card systems.

## Typography

Use the native macOS stack: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`. Use rounded weight and scale rather than novelty fonts. Headings are compact and confident; body copy is short and factual; labels use normal sans with restrained tracking rather than monospaced technical notation.

## Layout

- Soft gray application canvas with a stable narrow sidebar.
- Rounded sidebar selection and rounded elevated content panels.
- Catalog header with a concise welcome and a single clear search control.
- Tool cards use generous padding, a calm icon tile, compact metadata, and one clear action.
- Tool page header uses a properly aligned back button, title block, route chip, and local-status pill.
- PDF workflow uses rounded intake, queue, process, and output surfaces with clear grouping.

## Motion

Use subtle transform and opacity transitions with a smooth custom curve. Cards lift by 2–3px, buttons compress slightly on press, and progress uses a quiet transform animation. Avoid perpetual decorative motion. Respect `prefers-reduced-motion`.

## Copy discipline

Use product-truth copy only. Avoid filler slogans, invented metrics, fake upcoming features, and generic claims. The interface should explain the current task and its local/offline behavior, not advertise imaginary product breadth.
