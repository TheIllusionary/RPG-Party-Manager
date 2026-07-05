import type { JsonValue } from '../../types/domain';

/**
 * Read a nested value using dot notation (`actor.resources.mana.current`).
 */
export function getPathValue(root: unknown, path: string): unknown {
  if (!path) return root;
  const segments = path.split('.');
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Set a nested value using dot notation. Creates intermediate objects as needed.
 */
export function setPathValue(root: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.');
  if (segments.length === 0) return;

  let current: Record<string, unknown> = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const next = current[key];
    if (next === null || next === undefined || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value as JsonValue;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
