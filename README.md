# AllTools Desktop

This repository will contain the Electron desktop application for AllTools.

## Responsibilities

The desktop application owns the catalog, plugin installation and update flow, per-user storage locations, runtime bootstrap, Python supervisor, job lifecycle, permissions, logs, and the frontend UI.

The renderer must not execute Python, access arbitrary filesystem paths, install dependencies, or load plugin-provided frontend code. It communicates through a narrow preload API exposed by the Electron main process.

The main process starts and supervises the local Python runtime. It creates private job directories, copies or stages user-selected inputs, starts the selected plugin in its managed environment, forwards structured progress events to the renderer, handles cancellation, validates outputs, and reports failures.

## Planned application layout

```text
apps/desktop/
  src/main/       # Electron main process
  src/preload/    # narrow IPC bridge
  src/renderer/   # React application
  src/shared/     # shared types and schemas
packages/contracts/ # manifest and job protocol types
packages/ui/       # reusable light-theme components
tools/build/       # packaging and validation scripts
docs/              # architecture and release documentation
```

## Development source mode

In development, the app may read the sibling `alltools-plugins` repository through an explicit development configuration. This mode is disabled or replaced by the production catalog in packaged releases.

## Production source mode

In a packaged release, the app consumes a verified catalog and approved, versioned plugin artifacts. Updates are user-approved. The application should retain the previous plugin version until the new version passes installation and health checks, allowing a failed update to be rolled back.
