#!/usr/bin/env node
/**
 * Build pipeline del mod template.
 *
 * Transforma `src/index.ts` (+ modulos importados) a `dist/mod.js`
 * (IIFE autocontenido, ES2020, sin dependencias externas) listo para
 * que el motor del runtime de mods lo evalue dentro del sandbox.
 *
 * Uso:
 *   pnpm build              # build dev
 *   pnpm build --watch      # rebuild en cambios
 *   pnpm build --minify     # release (recomendado antes de pnpm pack)
 *
 * Patron canonico:
 *   `host` es global ambient inyectado por el motor (ver
 *   src/globals.d.ts). NO se importa desde codigo del mod — esbuild
 *   lo deja tal cual.
 */

import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const minify = args.has('--minify');
const watch = args.has('--watch');

const manifest = JSON.parse(
  readFileSync(resolve(__dirname, 'mod.json'), 'utf-8'),
);

const options = {
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  outfile: resolve(__dirname, 'dist/mod.js'),
  bundle: true,
  format: 'iife',
  target: 'es2020',
  platform: 'neutral',
  minify,
  sourcemap: false,
  legalComments: 'none',
  banner: {
    js: `/* ${manifest.metadata.name} v${manifest.version} — built by mod-template-snake-classic. */`,
  },
  define: {
    'MOD_BUILD.modId': JSON.stringify(manifest.id),
    'MOD_BUILD.version': JSON.stringify(manifest.version),
  },
};

async function main() {
  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    console.log('[mod build] watching src/ for changes…');
  } else {
    await build(options);
    console.log(
      `[mod build] ✓ dist/mod.js ${minify ? '(minified)' : ''} listo.`,
    );
  }
}

main().catch((err) => {
  console.error('[mod build] error:', err);
  process.exit(1);
});
