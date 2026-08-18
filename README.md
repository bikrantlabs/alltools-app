# AllTools Desktop

AllTools Desktop is the Electron application for the offline-first AllTools platform. It provides the user interface, catalog, plugin lifecycle, local job orchestration, native file dialogs, progress reporting, output handling, and packaging for Windows and Linux.

The application source is TypeScript. Python plugin implementations live in the separate [`alltools-plugins`](https://github.com/bikrantlabs/alltools-plugins) repository.

## Current status

The current development milestone includes a React and TypeScript renderer built with electron-vite, the dark-first desktop shell, catalog browsing, dedicated PDF-to-text, PDF Merge, and Image Convert workflows, local plugin installation and execution, progress reporting, individual downloads, and download-all behavior.

## Repository layout

```text
alltools-desktop/
  src/
    main.ts                 # Electron main process and IPC handlers
    preload.ts              # secure renderer bridge
    renderer/
      index.html             # electron-vite HTML entrypoint
      src/
        main.tsx             # React mount point
        App.tsx              # catalog, routing, and tool workspaces
        types.ts             # renderer bridge and tool types
        styles.css           # shared React visual system
    shared/
      manifest.ts           # plugin manifest validation
      manifest.test.ts
    catalog/catalog.json    # bundled fallback catalog
  runtime/
    supervisor.py           # Python plugin process supervisor prototype
    test_supervisor.py
  
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

Start the electron-vite development server and Electron:

```bash
pnpm dev
```

The development build uses electron-vite with separate main, preload, and React renderer bundles. The main and preload outputs are written under `dist-electron/`, and the React renderer is emitted under `dist-electron/renderer/`. The local sibling plugin catalog and plugin backend are still used during development.

The first PDF workflow is available by opening **PDF to Text**, adding one or more PDF files through the dropzone, selecting **Extract text**, and downloading the resulting `.txt` files individually or together.

## Validate the desktop repository

Run the same checks used by the desktop CI workflow:

```bash
pnpm test
pnpm test:manifest
pnpm test:supervisor
pnpm build
```

`pnpm test` runs strict TypeScript compilation for the Electron and React sources. `pnpm test:manifest` validates the plugin manifest rules. `pnpm test:supervisor` tests the Python process bridge. `pnpm build` runs electron-vite and emits the main, preload, and React renderer bundles into `dist-electron/`.

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

If a plugin is unavailable, confirm that `alltools-plugins` is a sibling directory and that the requested plugin has a manifest under `plugins/<plugin-id>/plugin.json`. If the app opens with stale renderer output, remove `dist-electron` and run `pnpm build` again. To open DevTools during development, set `ALLTOOLS_DEVTOOLS=1` before running Electron. If pnpm reports ignored dependency build scripts, use `pnpm approve-builds --all` and reinstall.
