"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
async function copyAssets() {
    const root = process.cwd();
    await (0, promises_1.mkdir)(node_path_1.default.join(root, 'dist-ts', 'src', 'renderer'), { recursive: true });
    await (0, promises_1.mkdir)(node_path_1.default.join(root, 'dist-ts', 'src', 'catalog'), { recursive: true });
    await (0, promises_1.cp)(node_path_1.default.join(root, 'src', 'renderer', 'index.html'), node_path_1.default.join(root, 'dist-ts', 'src', 'renderer', 'index.html'));
    await (0, promises_1.cp)(node_path_1.default.join(root, 'src', 'renderer', 'styles.css'), node_path_1.default.join(root, 'dist-ts', 'src', 'renderer', 'styles.css'));
    await (0, promises_1.cp)(node_path_1.default.join(root, 'src', 'catalog', 'catalog.json'), node_path_1.default.join(root, 'dist-ts', 'src', 'catalog', 'catalog.json'));
}
void copyAssets();
//# sourceMappingURL=copy-assets.js.map