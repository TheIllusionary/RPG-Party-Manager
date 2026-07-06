import type { IChoiceObject, IPlayer, StatAbbr } from '../../types';
import type { MasterRace, MasterSubrace } from '../../services/compendium/fiveETools/types';

// All D&D 5e skills with their governing stat
export const ALL_SKILLS: Record<string, StatAbbr> = {
  Acrobatics: 'dex',
  'Animal Handling': 'wis',
  Arcana: 'int',
  Athletics: 'str',
  Deception: 'cha',
  History: 'int',
  Insight: 'wis',
  Intimidation: 'cha',
  Investigation: 'int',
  Medicine: 'wis',
  Nature: 'int',
  Perception: 'wis',
  Performance: 'cha',
  Persuasion: 'cha',
  Religion: 'int',
  'Sleight of Hand': 'dex',
  Stealth: 'dex',
  Survival: 'wis',
};

export const ALL_STATS: StatAbbr[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const STAT_NAME_MAP: Record<string, StatAbbr> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
  str: 'str',
  dex: 'dex',
  con: 'con',
  int: 'int',
  wis: 'wis',
  cha: 'cha',
};

/**
 * Parses a raw 5etools `choose` object into a structured IChoiceObject.
 * Returns null if the input is not a valid `choose` block.
 *
 * @example
 * // ASI choice
 * parseChooseObject({ choose: { from: ['str', 'dex'], count: 1 } }, 'ability')
 * // => { type: 'ability', count: 1, options: ['str', 'dex'] }
 *
 * // Skill choice
 * parseChooseObject({ choose: { from: ['Acrobatics', 'Athletics'], count: 2 } }, 'skill')
 * // => { type: 'skill', count: 2, options: ['Acrobatics', 'Athletics'] }
 */
export function parseChooseObject(raw: any, type: IChoiceObject['type']): IChoiceObject | null {
  if (!raw) return null;

  // Handle direct `{ choose: { from, count } }` structure
  const chooseBlock = raw.choose ?? raw;
  if (!chooseBlock?.from || !Array.isArray(chooseBlock.from)) return null;

  const options: string[] = chooseBlock.from
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item.name) return item.name;
      return null;
    })
    .filter(Boolean) as string[];

  if (options.length === 0) return null;

  return {
    type,
    count: typeof chooseBlock.count === 'number' ? chooseBlock.count : 1,
    options,
  };
}

/**
 * Parses a raw 5etools ability array into:
 * - Fixed bonuses: `Record<StatAbbr, number>` entries
 * - Choice blocks: `IChoiceObject[]` entries
 */
export function parseAbilityArray(rawAbility: any[]): {
  fixed: Array<Record<string, number>>;
  choices: IChoiceObject[];
} {
  const fixed: Array<Record<string, number>> = [];
  const choices: IChoiceObject[] = [];

  if (!Array.isArray(rawAbility)) return { fixed, choices };

  for (const entry of rawAbility) {
    if (typeof entry !== 'object' || entry === null) continue;

    // Has a `choose` key → it's a choice
    if (entry.choose) {
      const parsed = parseChooseObject(entry, 'ability');
      if (parsed) {
        // Normalize stat keys in the options
        parsed.options = parsed.options
          .map((o: string) => STAT_NAME_MAP[o.toLowerCase()] ?? o)
          .filter(Boolean);
        choices.push(parsed);
      }
      continue;
    }

    // Otherwise it's a flat fixed bonus object like { str: 2, dex: 1 }
    const fixedEntry: Record<string, number> = {};
    for (const [k, v] of Object.entries(entry)) {
      if (typeof v === 'number') {
        const normalized = STAT_NAME_MAP[k.toLowerCase()];
        if (normalized) fixedEntry[normalized] = v;
      }
    }
    if (Object.keys(fixedEntry).length > 0) fixed.push(fixedEntry);
  }

  return { fixed, choices };
}

/**
 * Parses a raw 5etools `skillProficiencies` array into IChoiceObject[].
 */
export function parseSkillProficiencies(rawSkillProfs: any[]): IChoiceObject[] {
  const choices: IChoiceObject[] = [];
  if (!Array.isArray(rawSkillProfs)) return choices;

  for (const entry of rawSkillProfs) {
    if (typeof entry !== 'object' || entry === null) continue;

    // e.g. { choose: { from: ['Acrobatics', 'Athletics'], count: 2 } }
    if (entry.choose) {
      const parsed = parseChooseObject(entry, 'skill');
      if (parsed) choices.push(parsed);
      continue;
    }

    // e.g. { Perception: true, History: true } — fixed proficiencies (no choice needed)
    // We don't emit IChoiceObject for these — they're just applied directly.
  }

  return choices;
}

/**
 * Parses a raw 5etools `languageProficiencies` array into IChoiceObject[].
 */
export function parseLanguageProficiencies(rawLangProfs: any[]): IChoiceObject[] {
  const choices: IChoiceObject[] = [];
  if (!Array.isArray(rawLangProfs)) return choices;

  for (const entry of rawLangProfs) {
    if (typeof entry !== 'object' || entry === null) continue;
    if (entry.choose) {
      const parsed = parseChooseObject(entry, 'language');
      if (parsed) choices.push(parsed);
    }
  }

  return choices;
}

/**
 * Applies the mechanical effects of a selected Race/Subrace and the player's
 * explicit choices (ASI picks + proficiency picks) to produce a player diff.
 *
 * This is a pure function — it does NOT mutate the player.
 *
 * @param player     The current player object.
 * @param race       The selected MasterRace document.
 * @param subrace    The selected MasterSubrace (or null).
 * @param asiChoices Map of stat abbr → chosen bonus (for `choose` ASI blocks).
 * @param profChoices Array of skill names chosen from proficiency choice blocks.
 * @returns A partial IPlayer diff that can be merged via updatePlayer().
 */
export function applyRaceChoicesToPlayer(
  player: IPlayer,
  race: MasterRace | null,
  subrace: MasterSubrace | null,
  asiChoices: Record<string, number>,
  profChoices: string[],
): Partial<IPlayer> {
  const diff: Partial<IPlayer> = {};

  if (!race) return diff;

  // --- 1. Apply fixed ASI bonuses from base race ---
  for (const abilityEntry of race.ability ?? []) {
    for (const [statKey, bonus] of Object.entries(abilityEntry)) {
      const stat = statKey as StatAbbr;
      if (ALL_STATS.includes(stat)) {
        (diff as any)[stat] = ((player[stat] as number) || 0) + bonus;
      }
    }
  }

  // --- 2. Apply fixed ASI bonuses from subrace ---
  if (subrace) {
    for (const abilityEntry of subrace.ability ?? []) {
      for (const [statKey, bonus] of Object.entries(abilityEntry)) {
        const stat = statKey as StatAbbr;
        if (ALL_STATS.includes(stat)) {
          // Use diff value if already modified by base race, else player value
          const currentVal = (diff as any)[stat] ?? (player[stat] as number) ?? 0;
          (diff as any)[stat] = currentVal + bonus;
        }
      }
    }
  }

  // --- 3. Apply chosen ASI bonuses (from `choose` blocks) ---
  for (const [stat, bonus] of Object.entries(asiChoices)) {
    if (ALL_STATS.includes(stat as StatAbbr) && bonus > 0) {
      const currentVal = (diff as any)[stat] ?? (player[stat] as number) ?? 0;
      (diff as any)[stat] = currentVal + bonus;
    }
  }
  diff.asiChoices = { ...asiChoices };

  // --- 4. Apply chosen skill proficiencies ---
  const existingSkills = { ...(player.skills ?? {}) };
  for (const skillName of profChoices) {
    existingSkills[skillName] = true;
  }
  // Also apply any fixed skill proficiencies from the race (non-choose entries)
  for (const skillEntry of race.skillChoices ?? []) {
    // skillChoices only contains `choose` blocks, not fixed ones
    // Fixed ones would need to be in traits text — skip here
    void skillEntry;
  }
  diff.skills = existingSkills;
  diff.proficiencyChoices = profChoices;

  // --- 5. Persist subrace ID ---
  diff.subraceId = subrace?.entityKey ?? null;

  return diff;
}
