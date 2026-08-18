# AllTools Desktop Agent Guide

This repository owns the Electron desktop application. It must remain independently buildable and must not require the plugin repository to be checked out for normal compilation, tests, or packaged builds.

## Repository boundary

The companion plugin repository is `bikrantlabs/alltools-plugins`. Its local development sibling is expected at `../alltools-plugins`, but that directory is optional. The desktop repository must use the bundled catalog at `src/catalog/catalog.json` when the sibling repository is unavailable.

## Technology rules

The Electron application uses TypeScript for all active application, renderer, preload, shared-contract, and build-tool source. Do not add JavaScript application source files. Compiled JavaScript under `dist-ts` is generated output and must not be committed. The renderer must not use Node.js APIs or execute plugin code.

The application is built with Electron and a light, minimal HTML/CSS renderer. The preload bridge is the only renderer access to privileged Electron functionality. Keep `contextIsolation: true`, `nodeIntegration: false`, and the renderer sandbox enabled.

## Stable plugin contract

The desktop app consumes plugin manifests conforming to `../alltools-plugins/schemas/plugin-manifest.v1.json` or the equivalent bundled contract. The current protocol version is `1`. Plugins communicate through newline-delimited JSON over standard input/output. The request contains `jobId`, a private `jobDirectory`, input file descriptors, options, and an output directory. Plugin events are `progress`, `log`, `completed`, `failed`, and `cancelled`.

Do not change the manifest or job protocol shape casually. If a breaking change is required, create protocol version 2 and update both repositories’ contract documentation and tests. New frontend screens must be registered by stable `toolId` or `screenId`; plugins must never inject renderer JavaScript, HTML, React components, or CSS.

## Current PDF-to-text workflow

The reference plugin ID is `pdf-to-text`. Its generic fallback screen ID is `pdf-to-text`. The intended user workflow is multiple PDF selection or drag-and-drop, a file list with name and size, one extraction action, per-file progress, output result cards, individual download actions, and download-all behavior. The desktop app owns user-visible output destinations and may copy validated plugin outputs out of temporary job directories.

The current catalog entry is development-local and may later become a versioned GitHub Release artifact. Production code must not execute arbitrary branches. Prefer approved, immutable, versioned plugin artifacts with integrity metadata.

## Parallel-development rules

Desktop work may proceed using mock catalog entries and a local protocol fixture. Do not block UI work on plugin implementation. Plugin work may proceed using protocol test requests and fixture files. When changing a shared contract, update the local copy, its versioned schema, and the relevant contract test in the same change.

Before committing, run `pnpm test`, `pnpm test:manifest`, `pnpm test:supervisor`, and `pnpm build`. Keep commits focused and describe whether a change affects the manifest, job protocol, UI, runtime, packaging, or documentation.

## Do not do

Do not add cloud-only behavior to an offline plugin, do not grant network access by default, do not place Python environments inside the Electron renderer, do not commit virtual environments or model binaries, and do not assume that the plugin repository is present at runtime.
