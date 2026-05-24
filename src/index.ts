/**
 * Entry point del mod. Se compila a `dist/mod.js` (IIFE ES2020) con
 * esbuild y se ejecuta dentro del sandbox del motor.
 *
 * El motor inyecta `host: ModHost` como global (ver globals.d.ts).
 * El sandbox NO expone window/document/fetch/etc. — solo lo que el
 * `HostBridge` declare segun permisos concedidos.
 *
 * Estructura recomendada para mods reales:
 *   - src/index.ts        entry: hooks lifecycle + registro de UI.
 *   - src/settings-tab.ts descriptor declarativo del tab.
 *   - src/apply-config.ts aplica cambios runtime via host.callHostFn.
 *   - src/types.ts        subset local del HostBridge.
 *   - src/globals.d.ts    declare global { var host: ModHost; }.
 *
 * El mod oficial "Fun Config" en
 * src/games/snake-classic/mods/bundled/studio.fun-config/ del
 * monorepo del framework sirve como ejemplo vivo + SDK reference.
 */

/// <reference path="./globals.d.ts" />

interface ModState {
  enabled: boolean;
}

const DEFAULT_STATE: ModState = {
  enabled: true,
};

async function loadState(): Promise<ModState> {
  if (!host.storage) return DEFAULT_STATE;
  const result = await host.storage.get('state');
  if (result.ok && result.value) {
    return { ...DEFAULT_STATE, ...(result.value as Partial<ModState>) };
  }
  return DEFAULT_STATE;
}

async function saveState(state: ModState): Promise<void> {
  if (!host.storage) return;
  await host.storage.set('state', state);
}

function t(key: string, fallback: string): string {
  return host.i18n ? host.i18n.t(key) : fallback;
}

host.registerHook('onActivate', async () => {
  const state = await loadState();

  host.registerSettingsTab?.({
    id: 'your-cool-mod',
    title: t('tab.title', 'Your Cool Mod'),
    icon: 'tune',
    body: [
      {
        kind: 'heading',
        level: 2,
        text: t('tab.title', 'Your Cool Mod'),
      },
      {
        kind: 'paragraph',
        text: t(
          'tab.intro',
          'Edita src/index.ts para anadir tus propios controles.',
        ),
      },
      {
        kind: 'toggle',
        label: t('toggle.enable', 'Activar funcionalidad'),
        value: state.enabled,
        onChange: async (next: boolean) => {
          state.enabled = next;
          await saveState(state);
        },
      },
    ],
  });

  host.subscribeEvent('GAME_STARTED', () => {
    if (state.enabled) {
      host.log.info('[your-cool-mod] partida iniciada');
    }
  });
});

host.registerHook('onDeactivate', () => {
  host.log.info('[your-cool-mod] desactivado');
});
