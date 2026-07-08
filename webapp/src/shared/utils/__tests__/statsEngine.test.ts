import { describe, it, expect } from 'vitest';
import { calculateDerivedStats } from '../statsEngine';
import type { IPlayer } from '../../../types';
import type { MasterRace, MasterClass } from '../../../services/compendium/fiveETools/types';

describe('statsEngine', () => {
  it('should compute derived DEX based on base stats + race buff', () => {
    const player: IPlayer = {
      id: '1',
      name: 'Test',
      classType: 'Fighter',
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      ac: 10,
      hpBase: 10,
      hpCurrent: 10,
      subraceId: 'elf|phb'
    };

    const race: MasterRace = {
      id: 'elf|phb',
      entityKey: 'elf|phb',
      name: 'Elf',
      source: 'PHB',
      ability: [{ dex: 2 }],
      speed: 30,
      subraces: [
        {
          id: 'wood elf|phb',
          entityKey: 'elf|phb', // Matching for test simplicity
          name: 'Wood Elf',
          source: 'PHB',
          ability: [{ wis: 1 }]
        }
      ]
    };

    const computed = calculateDerivedStats(player, race);
    
    // DEX should be 10 + 2 = 12
    expect(computed.dex).toBe(12);
    // WIS should be 10 + 1 = 11 (from subrace)
    expect(computed.wis).toBe(11);
    
    // Proficiency for level 1 (0 xp) is 2
    expect(computed.proficiencyBonus).toBe(2);
  });

  it('should calculate unarmored defense for Barbarian', () => {
    const player: IPlayer = {
      id: '2',
      name: 'Barb',
      classType: 'Barbarian',
      str: 16, dex: 14, con: 16, int: 8, wis: 10, cha: 10,
      ac: 10,
      hpBase: 12,
      hpCurrent: 12
    };

    const playerClass: MasterClass = {
      id: 'barbarian|phb',
      entityKey: 'barbarian|phb',
      name: 'Barbarian',
      source: 'PHB',
      hitDice: '1d12'
    };

    const computed = calculateDerivedStats(player, undefined, playerClass);
    
    // Base 10 + DEX(+2) + CON(+3) = 15
    expect(computed.ac).toBe(15);
  });
});
