# Instructions for Claude (this is your mod)

> You're at the root of a mod created from the template. Claude
> Code reads this file automatically on startup. If you arrived
> here by manual copy, the canonical file lives at
> `leteoworks.github.io/mod-portal-snake-classic/ai-friendly/CLAUDE.template`.

## What this project is

External mod for a game in the **my-game-fw** framework
(Vue/TS/Quasar mini-games with a sandboxed mod system).

- **Target game**: `<gameId>` (declared in `mod.json`, usually
  `snake-classic`).
- **Preferred engine**: `quickjs-declarative-ui` with fallback
  `quickjs`. The engine evaluates `dist/mod.js` in a WASM
  sandbox.
- **What does NOT exist in the sandbox**: `window`, `document`,
  `fetch`, `XMLHttpRequest`, `process`, `require`, `import`,
  `localStorage`, `sessionStorage`, DOM, file system.
- **The only thing that exists**: the global `host: ModHost`
  declared as ambient in `src/globals.d.ts`.

## Key files

| Path | Role |
|---|---|
| `mod.json` | Mod manifest. `id`, `version`, `target`, permissions, metadata. **Any API you use in code requires its permission here.** |
| `src/index.ts` | Entry point. Compiles to `dist/mod.js` (IIFE ES2020 via esbuild). |
| `src/globals.d.ts` | Declares `host: ModHost` as global ambient. **NEVER import `host` from here or anywhere else** — it's global. |
| `src/types.ts` | Local subset of HostBridge. Source of the types you see in `host.*`. |
| `locales/en.json`, `locales/es.json` | i18n. Keys with the namespace declared in `mod.json#permissions[type=i18n].namespaces`. |
| `build.mjs` | esbuild pipeline. Doesn't usually need editing. |
| `package.json` | Scripts `build`, `validate`, `pack`. |
| `dist/mod.js` | Build output. Gitignored. |

## Hard rules — Claude must NEVER violate

1. **Do not import `host`**. It's global ambient, not a module.
   If you see `import { host } from ...`, it's a bug. Only
   `/// <reference path="./globals.d.ts" />` at the top of
   `index.ts`.
2. **Do not use `window`, `document`, `fetch`, `process`,
   `require`, dynamic `import`, `eval`, `Function` constructor,
   DOM, file system, `localStorage`**. The sandbox blocks all
   that. If you need network, use `host.http` with `network`
   permission declared. If you need persistence, use
   `host.storage`.
3. **Do not write outside of `host.storage`**. The quota is in
   `mod.json` (`permissions.storage.quotaKb`). Exceeding it
   rejects with `QUOTA_EXCEEDED`.
4. **Do not invent permissions without updating `mod.json`**. If
   you add `host.subscribeEvent('FOO', ...)` in code, also add
   `'FOO'` to the `subscribe[]` of the `events` permission. If
   you add `host.callHostFn('barFn', ...)`, also add the
   corresponding surface to the `game-specific` permission.

   **Security release 2026-05 (F21+F29)**: each host fn associated
   with a surface (e.g. `togglePowerUp` → `powerups.toggle`)
   requires the SPECIFIC `action` declared in
   `permissions[].actions[]`. Top-level permission is no longer
   enough. If the framework returns `PERMISSION_DENIED` with
   "requiere granted.<surface>.<action> que el manifest no
   declaró", add the action mentioned to your manifest.

   Mapping examples for Snake Classic:
   - `togglePowerUp` → `{ type: 'powerups', actions: ['toggle'] }`
   - `setPowerUpSpawnChance` → `actions: ['tuneProbabilities']`
   - Tunables via `gameConfigSet(name)` → `{ type: 'game-specific',
     surface: '<surfaceId>', actions: ['set'] }` (consult the
     game's host-api-changelog for `surfaceId`).
5. **Do not invent event or host-fn names**. The source of truth
   is the target game's `api-reference.md`. Common Snake Classic
   events: `GAME_STARTED`, `GAME_OVER`, `SCORE_CHANGED`,
   `LEVEL_UP`, `POWER_UP_PICKED`, `POWER_UP_EXPIRED`. Host fns:
   `gameConfigSet`, `gameConfigReset`, `gameConfigSnapshot`,
   `togglePowerUp`, `setPowerUpSpawnChance`. **Any other name,
   verify it in api-reference before using.**
6. **Do not mix `tunables.<X>` binding + a hook that writes the
   same key**. It's a race condition (last-write-wins).
   Canonical pattern: the binding applies to the game live AND
   the hook reads from storage to re-apply on `GAME_STARTED`. DO
   NOT write the same path from two places.

## Soft rules — conventions

- **`id`** in `mod.json`: convention `<handle>.<modname>`
  (kebab, lowercase, e.g. `yourhandle.power-mixer`). Immutable.
- **`version`**: strict SemVer. `patch` for bugfixes, `minor`
  for features, `major` breaks (resets player settings
  automatically).
- **`rationale`** in each permission: text the player reads. NOT
  trivial ("for fun" loses installs). Concrete: ("Applies the
  initial speed the player picked in the slider").
- **i18n keys** start with the declared namespace:
  `mod.<modId>.tab.title`, `mod.<modId>.section.spawn`, etc.
  Out of namespace, the framework rejects.
- **TypeScript strict** with `isolatedModules`. If you touch
  HostBridge types, do it in `src/types.ts`, not in
  `globals.d.ts`.
- **max-len 80** in imports (split multi-line if they exceed).
- **No obvious comments**. Only comment the "why" when the
  "what" isn't trivial from code.
- **Robustness against framework limits**. The framework
  applies per-mod rate-limits, hook caps, sampling auto-
  throttling, and storage quotas. A robust mod registers
  `host.diagnostics.onLimitHit(cb)` ONCE at setup and handles
  each event type in a `switch`. Bare minimum: a `host.log.warn`
  per event. Recommended: backoff on `rate-limit-hit`, mode
  switch on `sampling-throttling-activated`, self-check at end
  of setup with `host.diagnostics.getRegisteredHooks()`. See
  [cookbook §11–§14](https://leteoworks.github.io/mod-portal-snake-classic/cookbook).

  **2026-05 update (F38)**: there is now an aggregate
  rate-limit shared across ALL active mods (~10× per-mod
  default). You may receive `rate-limit-hit` even without
  exceeding your own per-mod cap when many mods are active —
  treat the same way (backoff with `retryAfterMs`).

  **2026-05 update (F46)**: if your `onLimitHit` callback throws
  ≥5 times, the framework logs `[mod:<id>] host.diagnostics
  .onLimitHit callback está throwing` to console (rate-limited
  1/min). Fix your handler when you see this.

- **Never mutate `payload` received in `subscribeEvent` callback**
  (2026-05 update F37). When 2+ mods subscribe to the same
  event, the framework deep-freezes the payload to prevent
  cross-mod mutation. Attempting `payload.score = 999` throws
  `TypeError`. If you need to modify the data, make a local copy:
  ```ts
  host.subscribeEvent('GAME_OVER', (payload) => {
    const my = JSON.parse(JSON.stringify(payload));
    my.adjustedScore = my.score * 2;  // ok — mutating local copy
  });
  ```

- **Don't assume `engine.preferred` is the engine you got**
  (2026-05 update F02). The game's policy decides the order of
  engine selection from your manifest's accepted set. Use
  `host.api.engineId` runtime to branch behavior per engine if
  needed — `preferred` only says "I accept this", not "I will
  receive this".

## Before any change

1. **Read full `mod.json`**. Knowing which permissions are
   declared avoids requesting APIs without permission.
2. **Read the relevant section of the target game's
   api-reference**
   (https://leteoworks.github.io/mod-portal-snake-classic/api-reference).
   Confirm the event / host fn you'll use EXISTS with that exact
   name.
3. **Read the code you'll touch**. Before adding a toggle, read
   `src/index.ts` and `src/settings-tab.ts` (if it exists) to
   see the descriptor shape the mod already uses.

## After any change

```bash
pnpm build       # esbuild → dist/mod.js
pnpm validate    # zod check of manifest against the schema
# Local sideload (path per OS):
#   macOS:   ~/Library/Application\ Support/snake-classic/mods/<modId>/
#   Windows: %APPDATA%/snake-classic/mods/<modId>/
#   Linux:   ~/.config/snake-classic/mods/<modId>/
# Restart the game. Activate the mod. Manual smoke test: the
# behavior described in the commit/prompt works.
```

If the change touches `mod.json`: re-run `pnpm validate`. If it
touches locales: verify that the keys in code exist in both
`en.json` and `es.json` locales.

## Quick pointers — "when you touch X, read Y"

| If you'll touch... | Read first |
|---|---|
| Adding a new slider/toggle | [tutorial/02-slider-tunable](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/02-slider-tunable) — `tunables.` binding concept + last-write-wins anti-pattern. |
| Reacting to a game event | [tutorial/03-game-events](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/03-game-events) — events catalog + permissions. |
| Customizing power-ups (Snake) | [tutorial/04-power-ups](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/04-power-ups) — array→UI pattern + bulk presets with `Promise.all`. |
| Preparing release to Workshop | [tutorial/05-release-ready](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/05-release-ready) — i18n, icon, validate, pack, upload. |
| Solving a concrete problem | [cookbook](https://leteoworks.github.io/mod-portal-snake-classic/cookbook) — 10 copy-paste recipes. |
| Something not working, don't know why | [troubleshooting](https://leteoworks.github.io/mod-portal-snake-classic/troubleshooting) — symptom→fix table. |
| Mod silently rejected, rate-limited, or throttled | [troubleshooting §10](https://leteoworks.github.io/mod-portal-snake-classic/troubleshooting) + [cookbook §11-§14](https://leteoworks.github.io/mod-portal-snake-classic/cookbook) — `host.diagnostics.onLimitHit(cb)` is THE single channel for ALL limit events. |
| Detail of a permission or `mod.json` field | [manifest-format](https://leteoworks.github.io/mod-portal-snake-classic/manifest-format). |
| Knowing which `host.*` is available | [api-reference](https://leteoworks.github.io/mod-portal-snake-classic/api-reference). |
| Your mod should work in ≥1 framework game | [targeting-games](https://leteoworks.github.io/mod-portal-snake-classic/targeting-games) — logical `gameId` vs AppID. |

## Reference mods (real code, not toy)

When a prompt of yours matches something already done in
production, look at the real code first:

- [`studio.fun-config`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.fun-config)
  — 22 power-up toggles + 3 presets (Classic/Casual/Hardcore).
- [`studio.gameplay-tuner`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.gameplay-tuner)
  — quantitative sliders + Easy/Normal/Hard presets.

Pasting a fragment of their code to Claude as a reference
("do it like in studio.fun-config: array→UI pattern") tends to
produce better results than describing the pattern in words.
