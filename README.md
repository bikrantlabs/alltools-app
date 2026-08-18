# AllTools Desktop

AllTools Desktop is the Electron application for the offline-first AllTools platform. It provides the user interface, catalog, plugin lifecycle, local job orchestration, native file dialogs, progress reporting, output handling, and packaging for Windows and Linux.

The application source is TypeScript. Python plugin implementations live in the separate [`alltools-plugins`](https://github.com/bikrantlabs/alltools-plugins) repository.

## Current status

The current development milestone includes the light-themed desktop shell, catalog browsing, the PDF-to-text workspace, multi-file PDF selection, local extraction through the sibling plugin repository, progress reporting, individual downloads, and download-all behavior. The production plugin download and per-user installation lifecycle is planned but not complete.

## Repository layout

```text
alltools-desktop/
  src/
    main.ts                 # Electron main process and IPC handlers
    preload.ts              # secure renderer bridge
    renderer/
      index.html
      renderer.ts           # typed UI controller
      styles.css
    shared/
      manifest.ts           # plugin manifest validation
      manifest.test.ts
    catalog/catalog.json    # bundled fallback catalog
  runtime/
    supervisor.py           # Python plugin process supervisor prototype
    test_supervisor.py
  tools/
    copy-assets.ts          # copies HTML/CSS/catalog into compiled output
  docs/                     # extended documentation
  AGENTS.md                 # agent and parallel-development guidance
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  tsconfig.json
```

## Prerequisites

Install the following tools before working on the desktop repository:

| Tool | Purpose |
|---|---|
| Git | Source control and repository workflows |
| Node.js 22 or compatible current LTS | Electron and TypeScript development |
| pnpm 9 or newer | JavaScript dependency management |
| Python 3.11 or newer | Local supervisor tests and future runtime bootstrap |
| uv | Local Python plugin environment management |

The application itself uses Electron. The PDF-to-text development workflow additionally requires the sibling plugin repository and its Python dependencies.

## Clone the repositories

The repositories are intentionally separate. From a common parent directory, clone both repositories as siblings:

```bash
mkdir -p AllToolsWorkspace
cd AllToolsWorkspace
git clone https://github.com/bikrantlabs/alltools-app.git alltools-desktop
git clone https://github.com/bikrantlabs/alltools-plugins.git alltools-plugins
```

The desktop application resolves the development plugin repository at:

```text
../alltools-plugins
```

relative to the desktop repository directory. If that sibling is not present, the app uses the bundled catalog, but the local PDF-to-text extraction workflow requires the plugin repository.

## Install desktop dependencies

From the desktop repository:

```bash
cd alltools-desktop
pnpm install
```

If pnpm reports that Electron build scripts were ignored, approve the dependency and install again:

```bash
pnpm approve-builds --all
pnpm install
```

Do not commit `node_modules`, `dist-ts`, or other generated directories.

## Run the desktop app in development

Compile the TypeScript sources and start Electron:

```bash
pnpm dev
```

The development build uses the local sibling plugin catalog and plugin backend. The Electron main process is compiled to `dist-ts/src/main.js`; the renderer is loaded from the copied files under `dist-ts/src/renderer`.

The first PDF workflow is available by opening **PDF to Text**, adding one or more PDF files through the dropzone, selecting **Extract text**, and downloading the resulting `.txt` files individually or together.

## Validate the desktop repository

Run the same checks used by the desktop CI workflow:

```bash
pnpm test
pnpm test:manifest
pnpm test:supervisor
pnpm build
```

`pnpm test` runs strict TypeScript compilation without emitting files. `pnpm test:manifest` validates the plugin manifest rules. `pnpm test:supervisor` tests the Python process bridge. `pnpm build` compiles TypeScript and copies the renderer assets into `dist-ts`.

## Package the desktop app

The packaging configuration targets Windows x64 with NSIS and Linux x64 with AppImage:

```bash
pnpm dist:linux
pnpm dist:win
```

These commands build the lightweight desktop shell. Plugin artifacts, Python environments, and model files should remain on-demand rather than being embedded in the initial installer.

## Desktop development rules

The renderer must not execute Python, access arbitrary filesystem paths, install packages, or load plugin-provided frontend code. Privileged operations belong in the Electron main process and are exposed through the narrow typed preload API.

The shared manifest and job protocol are cross-repository contracts. If a change affects them, update the corresponding documentation, schema, and tests in both repositories. See [`AGENTS.md`](AGENTS.md) for the complete parallel-development rules.

## Useful development commands

```bash
git status
git log --oneline -5
pnpm test
pnpm build
git diff
```

Keep commits focused. A good commit should describe one area such as `feat: add PDF output downloads`, `fix: validate plugin manifest`, or `docs: update local setup guide`.

## Troubleshooting

If the PDF tool shows no available backend, confirm that `alltools-plugins` is a sibling directory and that its PDF environment has been installed with `uv sync --dev`. If the app opens but the renderer is stale, remove `dist-ts` and run `pnpm build` again. If Electron installation scripts are blocked by pnpm, use `pnpm approve-builds --all` and reinstall.
