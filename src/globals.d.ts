/**
 * Declaracion ambient del global `host` inyectado por el motor del
 * runtime de mods dentro del sandbox.
 *
 * Patron canonico: el motor (QuickJS / isolated-vm / etc.) coloca
 * `host` en el global scope del sandbox. TypeScript necesita saber
 * que existe via este `declare global`.
 *
 * NO importar `host` desde codigo del mod (NO `import { host } from
 * './types'`). El `declare` es type-only; esbuild lo elimina al
 * compilar y el bundle quedaria con un identificador colgante. Aqui
 * lo declaramos como global ambient y el codigo lo referencia
 * directamente.
 *
 * Doc canonica del patron:
 *   docs/mods/mod-development/getting-started.md
 */

import type { ModHost } from './types';

declare global {

  var host: ModHost;
}

export {};
