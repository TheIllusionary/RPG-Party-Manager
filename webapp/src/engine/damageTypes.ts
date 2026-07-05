/** Normalizes D&D damage type labels for comparisons (case-insensitive). */
export function normalizeDamageType(raw: string | undefined | null): string {
  return (raw ?? '').toLowerCase().trim();
}

export function damageTypesMatch(a: string, b: string): boolean {
  const na = normalizeDamageType(a);
  const nb = normalizeDamageType(b);
  if (!na || !nb) return false;
  return na === nb;
}

function toTypeList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((t) => normalizeDamageType(t)).filter(Boolean);
}

export function mergeTypeLists(...sources: Array<string[] | undefined>): string[] {
  const set = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const item of source) {
      const norm = normalizeDamageType(item);
      if (norm) set.add(norm);
    }
  }
  return [...set];
}

export { toTypeList };
