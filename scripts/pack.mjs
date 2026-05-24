#!/usr/bin/env node
/**
 * Empaqueta el mod a un .zip listo para subir a Steam Workshop.
 *
 * Estructura del zip:
 *   <modId>.zip
 *   ├── mod.json
 *   ├── dist/mod.js
 *   ├── assets/
 *   └── locales/
 *
 * Tamaño max recomendado: 5 MB. Si excedes, valida los assets.
 */

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readFile as readFileAsync, stat } from 'node:fs/promises';
import path from 'node:path';

const MAX_ZIP_BYTES = 5 * 1024 * 1024;

// Fix W-A8: tops esperados + patrones toxicos. Solo se empaquetan
// los 4 tops listados. Cualquier subdir tóxico anidado (e.g.
// assets/.git/ — sucede más de lo que parece) se filtra con -x.
const ZIP_INCLUDED_TOPS = ['mod.json', 'dist', 'assets', 'locales'];
const ZIP_TOXIC_PATTERNS = [
  '*.env',
  '*.env.*',
  '.git/*',
  'node_modules/*',
  '.DS_Store',
  '*.log',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'src/*',
  '.github/*',
  '*.pem',
  '*.key',
  '*.crt',
];

async function readModignore(repoRoot) {
  // Patrones extra del modder en .modignore (formato gitignore-like).
  try {
    const raw = await readFileAsync(
      path.join(repoRoot, '.modignore'),
      'utf-8',
    );
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('#'));
  } catch {
    return [];
  }
}

(async () => {
  const repoRoot = process.cwd();
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, 'mod.json'), 'utf-8'),
  );
  await mkdir(path.join(repoRoot, 'dist'), { recursive: true });
  const outZip = path.join(repoRoot, 'dist', `${manifest.id}.zip`);

  if (process.platform === 'win32') {
    console.error(
      'Windows: instala zip o ejecuta desde WSL para empaquetar.',
    );
    process.exit(2);
  }

  // Comprobar que dist/mod.js existe (que se haya hecho build antes).
  try {
    await stat(path.join(repoRoot, 'dist/mod.js'));
  } catch {
    console.error(
      'dist/mod.js no existe — ejecuta `pnpm build` primero.',
    );
    process.exit(3);
  }

  // Borrar zip previo si existe.
  spawnSync('rm', ['-f', outZip]);

  // Empaquetar solo lo necesario (W-A8 fix: filtro positivo).
  const args = ['-r', '-q', outZip];
  const includedTops = [];
  for (const item of ZIP_INCLUDED_TOPS) {
    try {
      await stat(path.join(repoRoot, item));
      args.push(item);
      includedTops.push(item);
    } catch {
      // Opcional — skip.
    }
  }
  if (includedTops.length === 0) {
    console.error(
      'No se encontraron tops esperados (mod.json/dist/assets/locales).',
    );
    process.exit(5);
  }
  // Excludes: patrones toxicos + .modignore del modder.
  const modignoreExtras = await readModignore(repoRoot);
  for (const pat of [...ZIP_TOXIC_PATTERNS, ...modignoreExtras]) {
    args.push('-x', pat);
  }
  const result = spawnSync('zip', args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 4);
  }

  const sizeBytes = (await stat(outZip)).size;
  console.log(
    `[pack] ${outZip} (${Math.round(sizeBytes / 1024)} KB)`,
  );
  if (sizeBytes > MAX_ZIP_BYTES) {
    console.warn(
      `[pack] aviso: zip > ${Math.round(MAX_ZIP_BYTES / 1024 / 1024)} MB, `
        + 'considera optimizar assets antes de Workshop publish.',
    );
  }
})();
