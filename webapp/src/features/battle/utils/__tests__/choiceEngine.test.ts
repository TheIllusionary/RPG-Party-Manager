import { describe, it, expect } from 'vitest';
import { getAvailableChoices, isChoiceResolved } from '../choiceEngine';
import type { IPlayer, IResolvedChoices } from '../../../../types';
import type { MasterClass, MasterRace } from '../../../../services/compendium/fiveETools/types';

describe('choiceEngine', () => {
  it('should extract ASIs up to the players level', () => {
    const player: IPlayer = {
      id: '1',
      name: 'Test Wizard',
      classType: 'Wizard',
      xp: 14000, // Level 5 (6500) or Level 6? Level 5 is 6500, Level 6 is 14000
      // Actually let's just mock level 8
      inParty: true,
      hpBase: 10, hpCurrent: 10, ultCurrent: 0, ultMax: 100, ac: 10,
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      manaCurrent: 10
    };

    // Force xp for Level 8 (34000 xp)
    player.xp = 34000;

    const playerClass: MasterClass = {
      id: 'wizard',
      entityKey: 'wizard',
      name: 'Wizard',
      source: 'PHB',
      index: 'wizard',
      search: 'wizard',
      provenance: { version: '1', timestamp: 0 },
      sourceFlags: {},
      features: [
        { name: 'Ability Score Improvement', desc: '...', level: 4 },
        { name: 'Ability Score Improvement', desc: '...', level: 8 },
        { name: 'Ability Score Improvement', desc: '...', level: 12 }, // Should not be extracted
      ]
    };

    const choices = getAvailableChoices(player, null, null, playerClass);
    
    // We should only get the level 4 and 8 choices
    expect(choices.length).toBe(2);
    expect(choices[0].level).toBe(4);
    expect(choices[1].level).toBe(8);
  });

  it('should evaluate if a choice is resolved', () => {
    const choice = {
      type: 'ability' as const,
      count: 2,
      options: ['str', 'dex'],
      level: 4
    };

    // Unresolved completely
    expect(isChoiceResolved(choice, undefined)).toBe(false);

    // Partially resolved (1 point spent instead of 2)
    const partial: IResolvedChoices = {
      4: { asi: { str: 1 } }
    };
    expect(isChoiceResolved(choice, partial)).toBe(false);

    // Fully resolved (2 points spent)
    const resolved: IResolvedChoices = {
      4: { asi: { str: 1, dex: 1 } }
    };
    expect(isChoiceResolved(choice, resolved)).toBe(true);
  });
});
