import { lazy, type ComponentType } from 'react';

const RELOAD_GUARD_KEY = 'ag-go:new-build-reload-at';
/** A second chunk failure within this window means the file is really missing; stop reloading. */
const RELOAD_GUARD_MS = 30_000;

const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

/** True when a lazy chunk could not load, typically because a new deploy removed the old files. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return CHUNK_LOAD_ERROR.test(message);
}

/**
 * Reloads the page to pick up the latest build. Returns false (and does nothing) when it already
 * reloaded moments ago or cannot remember that it did, so a genuinely missing file never loops.
 */
export function reloadForNewBuild(): boolean {
  try {
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - lastReloadAt < RELOAD_GUARD_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * `React.lazy` that reloads the page when the chunk is gone after a redeploy
 * ("Failed to fetch dynamically imported module"), instead of crashing the route.
 */
// Same constraint as React.lazy, so page props keep their types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error) && reloadForNewBuild()) {
        // Keep Suspense showing its fallback until the reload takes over.
        return new Promise<never>(() => undefined);
      }
      throw error;
    }),
  );
}

/** Build id of the currently deployed app, or undefined when it cannot be read. */
export async function fetchDeployedBuildId(): Promise<string | undefined> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      return undefined;
    }
    const body = (await response.json()) as { buildId?: unknown };
    return typeof body.buildId === 'string' ? body.buildId : undefined;
  } catch {
    return undefined;
  }
}
