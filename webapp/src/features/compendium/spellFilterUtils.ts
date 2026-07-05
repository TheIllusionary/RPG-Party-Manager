import type { ISRDSpell } from '../../types/srd';

export type TriState = 'any' | 'yes' | 'no';

export interface SpellFilterState {
  levels: number[];
  school: string;
  className: string;
  castingTime: string;
  duration: string;
  range: string;
  ritual: TriState;
  concentration: TriState;
  components: string[];
  hasDamage: TriState;
  hasSave: TriState;
}

export interface SpellFilterOptions {
  schools: string[];
  classes: string[];
  castingTimes: string[];
  durations: string[];
  ranges: string[];
  levels: number[];
}

export const DEFAULT_SPELL_FILTERS: SpellFilterState = {
  levels: [],
  school: '',
  className: '',
  castingTime: '',
  duration: '',
  range: '',
  ritual: 'any',
  concentration: 'any',
  components: [],
  hasDamage: 'any',
  hasSave: 'any',
};

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function buildSpellFilterOptions(spells: ISRDSpell[]): SpellFilterOptions {
  const schools: string[] = [];
  const classes: string[] = [];
  const castingTimes: string[] = [];
  const durations: string[] = [];
  const ranges: string[] = [];
  const levels = new Set<number>();

  for (const spell of spells) {
    if (spell.school) schools.push(spell.school);
    for (const c of spell.classes ?? []) classes.push(c);
    if (spell.castingTime) castingTimes.push(spell.castingTime);
    if (spell.duration) durations.push(spell.duration);
    if (spell.range) ranges.push(spell.range);
    levels.add(spell.level);
  }

  return {
    schools: uniqSorted(schools),
    classes: uniqSorted(classes),
    castingTimes: uniqSorted(castingTimes),
    durations: uniqSorted(durations),
    ranges: uniqSorted(ranges),
    levels: [...levels].sort((a, b) => a - b),
  };
}

function matchesTriState(value: boolean, filter: TriState): boolean {
  if (filter === 'any') return true;
  return filter === 'yes' ? value : !value;
}

export function countActiveSpellFilters(filters: SpellFilterState): number {
  let n = 0;
  if (filters.levels.length > 0) n += 1;
  if (filters.school) n += 1;
  if (filters.className) n += 1;
  if (filters.castingTime) n += 1;
  if (filters.duration) n += 1;
  if (filters.range) n += 1;
  if (filters.ritual !== 'any') n += 1;
  if (filters.concentration !== 'any') n += 1;
  if (filters.components.length > 0) n += 1;
  if (filters.hasDamage !== 'any') n += 1;
  if (filters.hasSave !== 'any') n += 1;
  return n;
}

export function filterSpells(
  spells: ISRDSpell[],
  filters: SpellFilterState,
  searchQuery: string,
): ISRDSpell[] {
  const q = searchQuery.trim().toLowerCase();

  return spells.filter((spell) => {
    if (q) {
      const haystack = [
        spell.name,
        spell.school,
        spell.description,
        spell.higherLevel,
        ...(spell.classes ?? []),
        spell.damageType,
        spell.saveType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.levels.length > 0 && !filters.levels.includes(spell.level)) return false;
    if (filters.school && spell.school !== filters.school) return false;
    if (filters.className && !(spell.classes ?? []).includes(filters.className)) return false;
    if (filters.castingTime && spell.castingTime !== filters.castingTime) return false;
    if (filters.duration && spell.duration !== filters.duration) return false;
    if (filters.range && spell.range !== filters.range) return false;
    if (!matchesTriState(spell.ritual, filters.ritual)) return false;
    if (!matchesTriState(spell.concentration, filters.concentration)) return false;

    if (filters.components.length > 0) {
      const comps = spell.components ?? [];
      if (!filters.components.every((c) => comps.includes(c))) return false;
    }

    const hasDamage = Boolean(spell.damageFormula || spell.damageType);
    if (!matchesTriState(hasDamage, filters.hasDamage)) return false;

    const hasSave = Boolean(spell.saveType);
    if (!matchesTriState(hasSave, filters.hasSave)) return false;

    return true;
  });
}

export function levelLabel(level: number): string {
  return level === 0 ? 'Cantrip' : String(level);
}

export function toggleLevelFilter(levels: number[], level: number): number[] {
  return levels.includes(level) ? levels.filter((l) => l !== level) : [...levels, level].sort((a, b) => a - b);
}

export function toggleComponentFilter(components: string[], component: string): string[] {
  return components.includes(component)
    ? components.filter((c) => c !== component)
    : [...components, component];
}
