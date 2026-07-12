import { renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '../..');
const apiDir = resolve(__dirname, '../../api');

const rootPackage = resolve(rootDir, 'package.json');
const rootPackageTemp = resolve(rootDir, 'package-temp.json');
const rootLock = resolve(rootDir, 'package-lock.json');
const rootLockTemp = resolve(rootDir, 'package-lock-temp.json');

let renamedPackage = false;
let renamedLock = false;

try {
  if (existsSync(rootPackage)) {
    renameSync(rootPackage, rootPackageTemp);
    renamedPackage = true;
  }
  if (existsSync(rootLock)) {
    renameSync(rootLock, rootLockTemp);
    renamedLock = true;
  }

  console.log('[build-api-deps] Installing API dependencies...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execSync(npmCmd + ' install --omit=dev', { cwd: apiDir, stdio: 'inherit' });
} catch (err) {
  console.error('[build-api-deps] Installation failed:', err);
  process.exitCode = 1;
} finally {
  if (renamedPackage && existsSync(rootPackageTemp)) {
    renameSync(rootPackageTemp, rootPackage);
  }
  if (renamedLock && existsSync(rootLockTemp)) {
    renameSync(rootLockTemp, rootLock);
  }
  console.log('[build-api-deps] Restored root package files.');
}
