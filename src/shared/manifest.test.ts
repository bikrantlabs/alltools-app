import assert from 'node:assert/strict';
import { validateManifest, type PluginManifest } from './manifest';

const validManifest: PluginManifest = {
  id: 'pdf-to-text',
  name: 'PDF to Text',
  version: '0.1.0',
  description: 'Offline extraction',
  runtime: { type: 'python', packageManager: 'uv', platforms: ['linux-x64'] },
  entrypoint: { command: 'python -m plugin', protocolVersion: 1 },
  capabilities: { network: false, filesystem: 'job-directory-only' },
  ui: { mode: 'generic-form' },
  job: { inputSchema: {}, outputSchema: {} }
};

assert.equal(validateManifest(validManifest), true);
assert.throws(() => validateManifest({ ...validManifest, capabilities: { network: true, filesystem: 'job-directory-only' } } as never));
console.log('manifest validation passed');
