"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const manifest_1 = require("./manifest");
const validManifest = {
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
strict_1.default.equal((0, manifest_1.validateManifest)(validManifest), true);
strict_1.default.throws(() => (0, manifest_1.validateManifest)({ ...validManifest, capabilities: { network: true, filesystem: 'job-directory-only' } }));
console.log('manifest validation passed');
//# sourceMappingURL=manifest.test.js.map