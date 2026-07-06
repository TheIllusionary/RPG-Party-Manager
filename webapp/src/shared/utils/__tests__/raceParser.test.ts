import { describe, it, expect } from 'vitest';
import {
  parseChooseObject,
  parseAbilityArray,
  parseSkillProficiencies,
  applyRaceChoicesToPlayer,
} from '../raceParser';
import type { IPlayer } from '../../../types';

// ---------------------------------------------------------------------------
// Helper: minimal IPlayer stub
// ---------------------------------------------------------------------------
function mockPlayer(overrides: Partial<IPlayer> = {}): IPlayer {
  return {
    id: 'test-player',
    name: 'Tester',
    classType: 'default',
    xp: 0,
    inParty: true,
    hpBase: 10,
    hpCurrent: 10,
    manaCurrent: 0,
    ultMax: 100,
    ultCurrent: 0,
    ac: 10,
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseChooseObject
// ---------------------------------------------------------------------------
describe('parseChooseObject', () => {
  it('parses a skill choose block', () => {
    const raw = { choose: { from: ['Acrobatics', 'Athletics', 'Perception'], count: 2 } };
    const result = parseChooseObject(raw, 'skill');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('skill');
    expect(result!.count).toBe(2);
    expect(result!.options).toContain('Acrobatics');
    expect(result!.options).toContain('Athletics');
    expect(result!.options).toContain('Perception');
  });

  it('parses a language choose block with count: 1 default', () => {
    const raw = { choose: { from: ['Common', 'Elvish', 'Dwarvish'] } };
    const result = parseChooseObject(raw, 'language');
    expect(result).not.toBeNull();
    expect(result!.count).toBe(1);
    expect(result!.options).toHaveLength(3);
  });

  it('returns null for invalid/empty input', () => {
    expect(parseChooseObject(null, 'skill')).toBeNull();
    expect(parseChooseObject({}, 'skill')).toBeNull();
    expect(parseChooseObject({ choose: { from: [] } }, 'skill')).toBeNull();
  });

  it('parses an ability score choose block', () => {
    const raw = { choose: { from: ['str', 'dex', 'int'], count: 1 } };
    const result = parseChooseObject(raw, 'ability');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('ability');
    expect(result!.options).toContain('str');
    expect(result!.options).toContain('dex');
  });
});

// ---------------------------------------------------------------------------
// parseAbilityArray
// ---------------------------------------------------------------------------
describe('parseAbilityArray', () => {
  it('extracts fixed ASI bonuses', () => {
    const raw = [{ str: 2, con: 1 }];
    const { fixed, choices } = parseAbilityArray(raw);
    expect(fixed).toHaveLength(1);
    expect(fixed[0]).toEqual({ str: 2, con: 1 });
    expect(choices).toHaveLength(0);
  });

  it('extracts choose ASI blocks', () => {
    const raw = [{ str: 2 }, { choose: { from: ['dex', 'int', 'cha'], count: 1 } }];
    const { fixed, choices } = parseAbilityArray(raw);
    expect(fixed).toHaveLength(1);
    expect(fixed[0]).toEqual({ str: 2 });
    expect(choices).toHaveLength(1);
    expect(choices[0].count).toBe(1);
    expect(choices[0].options).toContain('dex');
  });

  it('handles empty array', () => {
    const { fixed, choices } = parseAbilityArray([]);
    expect(fixed).toHaveLength(0);
    expect(choices).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseSkillProficiencies
// ---------------------------------------------------------------------------
describe('parseSkillProficiencies', () => {
  it('parses skill proficiency choose blocks', () => {
    const raw = [{ choose: { from: ['Arcana', 'History', 'Nature'], count: 1 } }];
    const result = parseSkillProficiencies(raw);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('skill');
    expect(result[0].count).toBe(1);
    expect(result[0].options).toContain('Arcana');
  });

  it('ignores fixed (non-choose) skill entries', () => {
    const raw = [{ Perception: true, Stealth: true }];
    const result = parseSkillProficiencies(raw);
    expect(result).toHaveLength(0); // Fixed profs don't produce IChoiceObjects
  });

  it('returns empty array for invalid input', () => {
    expect(parseSkillProficiencies([])).toHaveLength(0);
    expect(parseSkillProficiencies(null as any)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyRaceChoicesToPlayer
// ---------------------------------------------------------------------------
describe('applyRaceChoicesToPlayer', () => {
  const baseRace = {
    id: 'race-1',
    entityKey: 'phb_race_human',
    index: 'phb_race_human',
    name: 'Human',
    source: 'PHB',
    ability: [{ str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }],
    search: { plainText: 'Human', tags: [] },
    provenance: { provider: '5etools' as const, dataPath: '', sourceFile: '', ingestedAt: '' },
    sourceFlags: {},
  };

  it('applies fixed ASI bonuses from base race', () => {
    const player = mockPlayer({ str: 10, dex: 10 });
    const diff = applyRaceChoicesToPlayer(player, baseRace, null, {}, []);
    expect(diff.str).toBe(11);
    expect(diff.dex).toBe(11);
    expect(diff.int).toBe(11);
  });

  it('stacks subrace fixed ASI on top of base race', () => {
    const player = mockPlayer({ str: 10, int: 10 });
    const subrace = {
      id: 'sub-1',
      entityKey: 'phb_race_elf_high-elf',
      parentEntityKey: 'phb_race_elf',
      name: 'High Elf',
      source: 'PHB',
      ability: [{ int: 1 }],
    };

    const elfRace = {
      ...baseRace,
      name: 'Elf',
      ability: [{ dex: 2 }],
    };

    const diff = applyRaceChoicesToPlayer(player, elfRace, subrace, {}, []);
    // dex +2 from base, int +1 from subrace
    expect(diff.dex).toBe(12);
    expect(diff.int).toBe(11);
  });

  it('applies chosen ASI bonuses and stores them in asiChoices', () => {
    const player = mockPlayer({ str: 10, cha: 10 });
    const diff = applyRaceChoicesToPlayer(player, baseRace, null, { str: 1, cha: 1 }, []);
    // Base Human gives +1 to all, chosen bonus adds +1 extra to str and cha
    expect(diff.str).toBe(12); // 10 + 1 (base) + 1 (choice)
    expect(diff.cha).toBe(12);
    expect(diff.asiChoices).toEqual({ str: 1, cha: 1 });
  });

  it('applies chosen skill proficiencies to player.skills', () => {
    const player = mockPlayer({ skills: { Stealth: true } });
    const diff = applyRaceChoicesToPlayer(player, baseRace, null, {}, ['Arcana', 'History']);
    expect(diff.skills?.['Arcana']).toBe(true);
    expect(diff.skills?.['History']).toBe(true);
    // Pre-existing skill preserved
    expect(diff.skills?.['Stealth']).toBe(true);
    expect(diff.proficiencyChoices).toEqual(['Arcana', 'History']);
  });

  it('returns empty diff if race is null', () => {
    const player = mockPlayer();
    const diff = applyRaceChoicesToPlayer(player, null, null, {}, []);
    expect(Object.keys(diff)).toHaveLength(0);
  });

  it('sets subraceId in diff when subrace is provided', () => {
    const player = mockPlayer();
    const subrace = {
      id: 'sub-2',
      entityKey: 'phb_race_dwarf_hill',
      parentEntityKey: 'phb_race_dwarf',
      name: 'Hill Dwarf',
      source: 'PHB',
    };
    const diff = applyRaceChoicesToPlayer(player, baseRace, subrace, {}, []);
    expect(diff.subraceId).toBe('phb_race_dwarf_hill');
  });

  it('sets subraceId to null when no subrace', () => {
    const player = mockPlayer();
    const diff = applyRaceChoicesToPlayer(player, baseRace, null, {}, []);
    expect(diff.subraceId).toBeNull();
  });
});
