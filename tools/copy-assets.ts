import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

async function copyAssets(): Promise<void> {
  const root = process.cwd();
  await mkdir(path.join(root, 'dist-ts', 'src', 'renderer'), { recursive: true });
  await mkdir(path.join(root, 'dist-ts', 'src', 'catalog'), { recursive: true });
  await cp(path.join(root, 'src', 'renderer', 'index.html'), path.join(root, 'dist-ts', 'src', 'renderer', 'index.html'));
  await cp(path.join(root, 'src', 'renderer', 'pdf-to-text.html'), path.join(root, 'dist-ts', 'src', 'renderer', 'pdf-to-text.html'));
  await cp(path.join(root, 'src', 'renderer', 'styles.css'), path.join(root, 'dist-ts', 'src', 'renderer', 'styles.css'));
  await cp(path.join(root, 'src', 'catalog', 'catalog.json'), path.join(root, 'dist-ts', 'src', 'catalog', 'catalog.json'));
}

void copyAssets();
