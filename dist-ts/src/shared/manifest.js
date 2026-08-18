"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateManifest = validateManifest;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
function assertManifest(condition, message) {
    if (!condition)
        throw new Error(`Invalid plugin manifest: ${message}`);
}
function validateManifest(manifest) {
    assertManifest(manifest && typeof manifest === 'object', 'manifest must be an object');
    assertManifest(ID_PATTERN.test(manifest.id ?? ''), 'id must be kebab-case');
    assertManifest(typeof manifest.name === 'string' && manifest.name.length > 0, 'name is required');
    assertManifest(VERSION_PATTERN.test(manifest.version ?? ''), 'version must be semantic');
    assertManifest(typeof manifest.description === 'string', 'description is required');
    assertManifest(manifest.runtime?.type === 'python', 'only Python plugins are supported');
    assertManifest(manifest.runtime?.packageManager === 'uv', 'plugins must use uv');
    assertManifest(Array.isArray(manifest.runtime?.platforms) && manifest.runtime.platforms.length > 0, 'platforms are required');
    assertManifest(typeof manifest.entrypoint?.command === 'string' && manifest.entrypoint.command.length > 0, 'entrypoint command is required');
    assertManifest(manifest.entrypoint?.protocolVersion === 1, 'protocol version must be 1');
    assertManifest(manifest.capabilities?.network === false, 'network capability must be disabled for MVP');
    assertManifest(['job-directory-only', 'declared-paths'].includes(manifest.capabilities?.filesystem ?? ''), 'filesystem capability is invalid');
    assertManifest(['generic-form', 'dedicated-screen'].includes(manifest.ui?.mode ?? ''), 'UI mode is invalid');
    assertManifest(Boolean(manifest.job?.inputSchema) && Boolean(manifest.job?.outputSchema), 'job schemas are required');
    return true;
}
//# sourceMappingURL=manifest.js.map