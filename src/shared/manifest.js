const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid plugin manifest: ${message}`);
}

function validateManifest(manifest) {
  assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'manifest must be an object');
  assert(ID_PATTERN.test(manifest.id || ''), 'id must be kebab-case');
  assert(typeof manifest.name === 'string' && manifest.name.length > 0, 'name is required');
  assert(VERSION_PATTERN.test(manifest.version || ''), 'version must be semantic');
  assert(typeof manifest.description === 'string', 'description is required');
  assert(manifest.runtime?.type === 'python', 'only Python plugins are supported');
  assert(manifest.runtime?.packageManager === 'uv', 'plugins must use uv');
  assert(Array.isArray(manifest.runtime?.platforms) && manifest.runtime.platforms.length > 0, 'platforms are required');
  assert(typeof manifest.entrypoint?.command === 'string' && manifest.entrypoint.command.length > 0, 'entrypoint command is required');
  assert(manifest.entrypoint.protocolVersion === 1, 'protocol version must be 1');
  assert(manifest.capabilities?.network === false, 'network capability must be disabled for MVP');
  assert(['job-directory-only', 'declared-paths'].includes(manifest.capabilities?.filesystem), 'filesystem capability is invalid');
  assert(['generic-form', 'dedicated-screen'].includes(manifest.ui?.mode), 'UI mode is invalid');
  assert(manifest.job?.inputSchema && manifest.job?.outputSchema, 'job schemas are required');
  return true;
}

module.exports = { validateManifest };
