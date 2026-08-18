# AllTools Development Workflow

AllTools is developed as two coordinated repositories: `alltools-app` owns the Electron, React, preload, catalog, lifecycle, and packaging experience; `alltools-plugins` owns Python plugin implementations, manifests, dependencies, fixtures, and protocol behavior. GitHub Issues are the source of truth for work requests, bugs, design proposals, and coordination decisions. Chat is useful for discussion, but durable work must become a tracked issue before implementation.

## How to request work

Use the issue chooser rather than a blank issue. Choose **Feature request** for a new user-visible capability, **Bug report** for behavior that is broken, or **Design proposal** for visual hierarchy, interaction, accessibility, or information-architecture changes. Plugin-only requests belong in `alltools-plugins`; a feature requiring both a backend and a screen should be opened in the repository that owns the primary outcome and linked to a companion issue in the other repository.

A request should explain the user problem, the desired workflow, observable acceptance criteria, and relevant constraints. Screenshots and sample files are welcome, but private data and secrets must never be attached. If the request is not clear enough to implement or test, it remains in triage until the missing information is resolved.

## Labels

Labels describe stable dimensions rather than temporary opinions. Keep the shared labels synchronized across both repositories.

| Dimension | Labels | Meaning |
|---|---|---|
| Type | `type: feature`, `type: bug`, `type: design`, `type: chore`, `type: docs` | What kind of work is being requested |
| Area | `area: ui`, `area: electron`, `area: plugin`, `area: protocol`, `area: packaging`, `area: docs` | Which subsystem owns most of the work |
| Priority | `priority: now`, `priority: next`, `priority: later` | Product ordering, not severity |
| Status | `status: triage`, `status: ready`, `status: in progress`, `status: blocked`, `status: review`, `status: done` | Current workflow state |
| Coordination | `coordination: app`, `coordination: plugin`, `coordination: both` | Repository boundary and companion work |
| Risk | `risk: contract`, `risk: security`, `risk: packaging` | Work needing additional review |

Do not use labels such as `urgent` as a substitute for explaining impact. A production-blocking failure should be described in the issue and assigned an appropriate priority.

## Project board

Create one organization-level GitHub Project named **AllTools Roadmap**. Add issues from both repositories to the same board. Use these fields:

| Field | Values |
|---|---|
| Status | Backlog, Triage, Ready, In Progress, Blocked, Review, Done |
| Priority | Now, Next, Later |
| Area | UI, Electron, Plugin, Protocol, Packaging, Documentation |
| Repository | App, Plugins, Both |
| Iteration | Current milestone or release cycle |

The default board view should be a board grouped by Status. Add a roadmap table grouped by Iteration and a filtered view for `Priority = Now`. The repository issue remains canonical; the project is the planning surface.

## Workflow states

New issues enter **Triage**. During triage, the request is clarified, labeled, assigned to a repository, and either accepted, deferred, or closed as invalid or duplicate. An accepted issue moves to **Ready** only when its acceptance criteria are testable and its dependencies are understood. Work moves to **In Progress** when implementation begins, **Blocked** when external information or a companion issue is required, and **Review** when a pull request is open and local validation has passed. It moves to **Done** only after the pull request is merged, CI is green, and the issue acceptance criteria are satisfied.

## Cross-repository work

For a feature that spans the two repositories, create a primary issue and a companion issue. Link them in both directions using `Part of #...` or `Blocked by bikrantlabs/<repo>#...`. Use the same concise title prefix and add `coordination: both`. The app issue should describe the user-facing workflow; the plugin issue should describe the manifest, protocol, dependency, fixture, and runtime contract. Never hide a shared-contract change inside one repository without updating the other repository’s schema and tests.

A pull request should reference its issue with `Closes #123` when it completes the issue. For cross-repository work, use `Related to bikrantlabs/alltools-plugins#123` in the companion pull request and include both CI links in the issue discussion.

## Definition of Ready

An issue is ready when the user outcome is clear, the affected repository or repositories are identified, acceptance criteria are observable, security and offline constraints are stated, and required fixtures or screenshots are available. UI work should mention dark, light, system, keyboard, and responsive behavior when relevant. Plugin work should mention input/output descriptors, protocol events, dependency installation, and platform expectations.

## Definition of Done

A change is done when the implementation matches the acceptance criteria, no plugin injects frontend code, privileged behavior stays behind the preload bridge, offline claims remain true, and the relevant tests pass. Desktop changes require `pnpm test`, `pnpm test:manifest`, `pnpm test:supervisor`, and `pnpm build`; packaging changes also require an Electron startup smoke test and archive-content verification. Plugin changes require manifest validation, Python tests or fixture smoke tests, and protocol-event coverage. Cross-repository changes require both CI workflows to pass.

## Recommended request format

A concise request title should begin with `feat:`, `bug:`, `design:`, `plugin:`, `chore:`, or `docs:`. The body should answer: What problem are we solving? Who experiences it? What should the workflow do? How will we know it works? Which repository owns each part? What constraints or references matter?
