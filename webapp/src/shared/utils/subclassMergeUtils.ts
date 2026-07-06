import type { ISubclass } from '../../types';

export function mergeSubclassesById(existing: ISubclass[], incoming: ISubclass[]): ISubclass[] {
  const map = new Map(existing.map((s) => [s.id, s]));
  for (const sub of incoming) {
    map.set(sub.id, sub);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function subclassesFromSrdEntries(
  entries: Array<{ subclass: ISubclass }>,
): ISubclass[] {
  return entries.map((e) => e.subclass);
}
