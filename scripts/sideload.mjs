#!/usr/bin/env node
/**
 * Copia el mod local a userData/snake-classic/mods/<modId>/ para
 * que el juego lo detecte como sideload en builds dev (o builds
 * retail con sideload activo).
 *
 * Resuelve el userData path según plataforma. Si lo necesitas, override
 * via env var MOD_USERDATA_PATH (útil en setups custom).
 */

import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import path from 'node:path';

function resolveUserDataBase() {
  const override = process.env.MOD_USERDATA_PATH;
  if (override) return override;
  switch (platform()) {
    case 'darwin':
      return path.join(
        homedir(),
        'Library/Application Support',
      );
    case 'win32':
      return process.env.APPDATA ?? path.join(homedir(), 'AppData/Roaming');
    case 'linux':
      return (
        process.env.XDG_CONFIG_HOME
        ?? path.join(homedir(), '.config')
      );
    default:
      throw new Error(`platform no soportada: ${platform()}`);
  }
}

(async () => {
  const repoRoot = process.cwd();
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, 'mod.json'), 'utf-8'),
  );
  const target = path.join(
    resolveUserDataBase(),
    manifest.target.gameId,
    'mods',
    manifest.id,
  );
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  // Solo lo necesario para que el loader cargue.
  for (const item of ['mod.json', 'dist', 'assets', 'locales']) {
    const src = path.join(repoRoot, item);
    try {
      await cp(src, path.join(target, item), { recursive: true });
    } catch {
      // assets/locales puede no existir — OK.
    }
  }
  console.log(`[sideload] copiado a ${target}`);
})();
