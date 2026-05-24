# mod-template-snake-classic

Template clonable para empezar a hacer mods de **Snake Classic**.

> Scaffold W3 del roadmap del ecosistema Workshop. Tras gh repo create
> leteoworks/mod-template-snake-classic --public (D3) y push inicial, este
> es el repo publico canónico al que los modders apuntan desde:
> - El portal: `https://leteoworks.github.io/mod-portal-snake-classic/getting-started`
> - La Steam Guide "Empieza a hacer mods".
> - El landing del portal (botón "Mira el template").

---

## Quickstart

```bash
# 1. Clonar
git clone https://github.com/leteoworks/mod-template-snake-classic my-mod
cd my-mod

# 2. Instalar
pnpm install

# 3. Editar
#    - mod.json: id, version, permisos, metadata.
#    - src/index.ts: tu logica.

# 4. Build + sideload
pnpm build
pnpm sideload         # copia a userData/snake-classic/mods/<modId>/

# 5. Abre Snake Classic (build dev o easter egg en retail).
#    Tu mod aparece en Settings → Mods como "Sideload (dev)".
```

## Estructura

```
my-mod/
├── README.md
├── mod.json                  ← Manifest. Edita aqui.
├── package.json              ← esbuild + scripts pnpm
├── tsconfig.json             ← Strict mode + isolatedModules
├── build.mjs                 ← Pipeline esbuild (IIFE ES2020)
├── src/
│   ├── index.ts              ← Entry point + hooks lifecycle
│   ├── globals.d.ts          ← declare global { var host: ModHost }
│   └── types.ts              ← Subset local del HostBridge
├── assets/
│   ├── icon.png              ← 256x256 PNG, <100KB
│   └── screenshots/          ← Para Workshop, opcional
├── locales/                  ← Si declaras permisos.i18n
│   ├── en.json
│   └── es.json
├── scripts/
│   ├── pack.mjs              ← Genera my-mod.zip listo para Workshop
│   ├── sideload.mjs          ← Copia a userData
│   └── validate.mjs          ← Zod check del manifest
└── .github/workflows/ci.yml  ← Lint + build + validate en PRs
```

> **Patrón canónico** (importante): `host` es un **global ambient**
> inyectado por el motor del runtime dentro del sandbox. **NO se
> importa** desde código del mod. La declaración vive en
> `src/globals.d.ts` (`declare global { var host: ModHost; }`).
> Cualquier código que haga `import { host } from ...` rompe el
> build (esbuild emite nada para el `declare` y queda colgante).

## Scripts

- `pnpm dev` — esbuild watch + reload al guardar.
- `pnpm build` — produce `dist/mod.js` dev (sin minify).
- `pnpm build:release` — produce `dist/mod.js` minificado para
  publish.
- `pnpm typecheck` — tsc --noEmit (sin compilar).
- `pnpm pack` — empaqueta a `dist/my-mod.zip` para subir a Workshop.
- `pnpm validate` — Zod check contra el schema canonico del mod.
- `pnpm sideload` — copia a `<userData>/snake-classic/mods/<modId>/`.

## Publicar

Ver guia completa: [/publishing](https://leteoworks.github.io/mod-portal-snake-classic/publishing).

TL;DR:

```bash
pnpm pack
# → dist/my-mod.zip
```

Subir via cliente Steam → Snake Classic → Workshop → "Create New
Item" → drag & drop del zip.

## Tipos del HostBridge

El template incluye en `src/host-bridge.d.ts` los tipos del API
expuesto al mod (`host.callHostFn`, `host.subscribeEvent`,
`host.registerSettingsTab`, etc.). Auto-completion en IDEs Vue/TS.

## Validación

`pnpm validate` corre Zod contra `mod.json` usando el schema
publicado por el framework (`@leteoworks/mod-manifest-schema`, futuro
paquete npm). Mientras tanto, el schema viaja como JSON literal en
`scripts/validate.mjs`. CI lo ejecuta en cada PR.

## License

MIT — clona, modifica, comparte.
