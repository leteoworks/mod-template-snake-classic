/**
 * Tipos del HostBridge expuesto al mod. Subset minimal de lo declarado
 * en `@modules/mod-runtime/types.ts` del framework — copiado aqui
 * para que el mod sea standalone (no depende del runtime para
 * typechecking) y para que el bundle final sea autocontenido.
 *
 * Compatible con `requires.hostApi: ^1.0.0`.
 *
 * `host` viene como global ambient (ver globals.d.ts). NO importar
 * `host` desde aqui.
 */

export interface HookResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: { code: string; message: string };
}

export interface ModHost {
  callHostFn: (
    name: string,
    args: unknown,
  ) => Promise<HookResult> | HookResult;
  subscribeEvent: (
    name: string,
    cb: (payload: unknown) => void,
  ) => () => void;
  registerHook: (
    name: string,
    fn: (args?: unknown) => unknown,
  ) => void;
  registerSettingsTab?: (descriptor: unknown) => HookResult;
  storage?: {
    get: (key: string) => Promise<HookResult>;
    set: (key: string, value: unknown) => Promise<HookResult>;
    delete: (key: string) => Promise<HookResult>;
    keys: () => Promise<HookResult<string[]>>;
  };
  i18n?: {
    register: (
      locale: string,
      messages: Record<string, string>,
    ) => void;
    t: (key: string, params?: Record<string, unknown>) => string;
  };
  log: {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  analytics?: {
    track: (
      eventName: string,
      props: Record<string, unknown>,
    ) => void;
  };
}
