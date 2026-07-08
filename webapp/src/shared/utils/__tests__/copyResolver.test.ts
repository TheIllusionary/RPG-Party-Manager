import { describe, it, expect } from 'vitest';
import { resolveMonsterCopy } from '../copyResolver';

describe('copyResolver', () => {
  it('should resolve a basic monster copy with overrides', () => {
    const baseGoblin = {
      name: 'Goblin',
      source: 'MM',
      size: 'S',
      type: 'humanoid',
      ac: 15,
      hp: { average: 7, formula: '2d6' },
      str: 8,
      dex: 14,
      trait: [
        { name: 'Nimble Escape', entries: ['The goblin can take...'] }
      ]
    };

    const goblinBoss = {
      name: 'Goblin Boss',
      source: 'MM',
      _copy: {
        name: 'Goblin',
        source: 'MM'
      },
      hp: { average: 21, formula: '6d6' }, // Explicit override
      str: 10, // Explicit override
      trait: [ // Assuming we completely override traits if provided explicitly
        { name: 'Nimble Escape', entries: ['The goblin can take...'] },
        { name: 'Redirect Attack', entries: ['When a creature...'] }
      ]
    };

    const allMonstersMap = new Map<string, any>();
    allMonstersMap.set('goblin|mm', baseGoblin);
    allMonstersMap.set('goblin boss|mm', goblinBoss);

    const resolved = resolveMonsterCopy(goblinBoss, allMonstersMap);

    // Should inherit from base
    expect(resolved.size).toBe('S');
    expect(resolved.type).toBe('humanoid');
    expect(resolved.ac).toBe(15);
    expect(resolved.dex).toBe(14); // inherited correctly

    // Should override with child explicit values
    expect(resolved.hp.average).toBe(21);
    expect(resolved.str).toBe(10);
    expect(resolved.trait.length).toBe(2);
  });

  it('should apply _mod replaceTxt', () => {
    const baseBeholder = {
      name: 'Beholder Zombie',
      source: 'MM',
      action: [
        { name: 'Bite', entries: ['the zombie bites.'] }
      ]
    };

    const nerozar = {
      name: 'Nerozar the Defeated',
      source: 'WDMM',
      _copy: {
        name: 'Beholder Zombie',
        source: 'MM',
        _mod: {
          '*': {
            mode: 'replaceTxt',
            replace: 'the zombie',
            with: 'Nerozar',
            flags: 'i'
          }
        }
      }
    };

    const allMonstersMap = new Map<string, any>();
    allMonstersMap.set('beholder zombie|mm', baseBeholder);
    allMonstersMap.set('nerozar the defeated|wdmm', nerozar);

    const resolved = resolveMonsterCopy(nerozar, allMonstersMap);

    // The text should be replaced
    expect(resolved.action[0].entries[0]).toBe('Nerozar bites.');
  });

  it('should apply _mod replaceArr', () => {
    const baseBeholder = {
      name: 'Beholder Zombie',
      source: 'MM',
      action: [
        { name: 'Bite', entries: ['Bites'] },
        { name: 'Eye Ray', entries: ['Uses a random eye ray.'] }
      ]
    };

    const nerozar = {
      name: 'Nerozar the Defeated',
      source: 'WDMM',
      _copy: {
        name: 'Beholder Zombie',
        source: 'MM',
        _mod: {
          'action': {
            mode: 'replaceArr',
            replace: 'Eye Ray',
            items: {
              name: 'Eye Ray',
              entries: ['Uses a specific eye ray (Nerozar version).']
            }
          }
        }
      }
    };

    const allMonstersMap = new Map<string, any>();
    allMonstersMap.set('beholder zombie|mm', baseBeholder);
    allMonstersMap.set('nerozar the defeated|wdmm', nerozar);

    const resolved = resolveMonsterCopy(nerozar, allMonstersMap);

    expect(resolved.action.length).toBe(2);
    expect(resolved.action[1].name).toBe('Eye Ray');
    expect(resolved.action[1].entries[0]).toBe('Uses a specific eye ray (Nerozar version).');
  });
});
