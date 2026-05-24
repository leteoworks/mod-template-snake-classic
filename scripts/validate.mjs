#!/usr/bin/env node
/**
 * Valida `mod.json` contra el schema Zod canónico del framework.
 *
 * El schema viaja inline aquí para que el modder no dependa del
 * monorepo. Sync esperado: cuando el framework publique
 * `@leteoworks/mod-manifest-schema` como paquete npm, este archivo
 * lo importa y desaparece la duplicación. Mientras tanto, el sync
 * lo hace `scripts/mods/sync-template-schema.mjs` en el monorepo
 * (futuro).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const semverStrictRegex =
  /^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.-]+)?$/i;
const semverRangeRegex =
  /^[~^>=<]*[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.-]+)?$/i;
const modIdRegex =
  /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)?$/;

const engineIdSchema = z.enum([
  'quickjs',
  'quickjs-declarative-ui',
  'iframe-sandbox',
  'isolated-vm',
  'ses-compartment',
  'web-worker-offscreen-canvas',
  'shadow-realm',
]);

const permBase = { rationale: z.string().min(1).max(200) };

const permissionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('events'),
    subscribe: z.array(z.string()).optional(),
    dispatch: z.array(z.string()).optional(),
    ...permBase,
  }),
  z.object({
    type: z.literal('settings-ui'),
    maxTabs: z.number().int().positive().optional(),
    ...permBase,
  }),
  z.object({
    type: z.literal('storage'),
    quotaKb: z.number().int().positive().optional(),
    ...permBase,
  }),
  z.object({
    type: z.literal('i18n'),
    namespaces: z.array(z.string()).min(1),
    ...permBase,
  }),
  z.object({
    type: z.literal('assets'),
    kinds: z.array(z.enum(['images', 'audio', 'fonts'])).min(1),
    ...permBase,
  }),
  z.object({
    type: z.literal('powerups'),
    actions: z.array(z.enum(['toggle', 'register', 'tune'])).min(1),
    ...permBase,
  }),
  z.object({
    type: z.literal('game-specific'),
    surface: z.string().min(1),
    actions: z.array(z.string()).min(1),
    ...permBase,
  }),
]);

const manifestSchema = z.object({
  manifestVersion: z.literal(1),
  id: z.string().regex(modIdRegex),
  version: z.string().regex(semverStrictRegex),
  target: z.object({
    gameId: z.string().min(1),
    gameVersion: z.string().regex(semverRangeRegex),
  }),
  engine: z.object({
    preferred: engineIdSchema,
    fallbacks: z.array(engineIdSchema),
  }),
  requires: z.object({
    hostApi: z.string().regex(semverRangeRegex),
    dlcs: z.array(z.string()).optional(),
  }),
  entry: z.string().min(1),
  permissions: z.array(permissionSchema),
  metadata: z.object({
    name: z.string().min(1).max(80),
    description: z.string().min(1).max(500),
    author: z.string().min(1).max(80),
    homepage: z.string().url().optional(),
    license: z.string().optional(),
    tags: z.array(z.string()).max(5).optional(),
    icon: z.string().optional(),
  }),
});

(async () => {
  const repoRoot = process.cwd();
  const raw = JSON.parse(
    await readFile(path.join(repoRoot, 'mod.json'), 'utf-8'),
  );
  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    console.error('[validate] mod.json invalido:\n');
    for (const issue of result.error.issues) {
      console.error(
        `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      );
    }
    process.exit(1);
  }
  console.log(
    `[validate] ✓ ${result.data.id}@${result.data.version} valido.`,
  );
})();
