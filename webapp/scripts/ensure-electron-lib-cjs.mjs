import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const libDir = path.join(root, 'electron', 'lib');

mkdirSync(libDir, { recursive: true });
writeFileSync(
  path.join(libDir, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
  'utf8',
);

console.log('[electron] Wrote electron/lib/package.json (type: commonjs)');
