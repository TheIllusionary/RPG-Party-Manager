import { describe, it, expect } from 'vitest';
import { parseSpells } from '../spellParser';

describe('spellParser', () => {
  const mockSpellsData = {
    spell: [
      {
        name: 'Acid Splash',
        source: 'PHB',
        level: 0,
        school: 'C',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'feet', amount: 60 } },
        components: { v: true, s: true },
        duration: [{ type: 'instant' }],
        entries: [
          'You hurl a bubble of acid. {@damage 1d6} acid damage.'
        ],
        entriesHigherLevel: [
          {
            type: 'entries',
            name: 'At Higher Levels',
            entries: ['Damage increases to {@damage 2d6}.']
          }
        ]
      }
    ]
  };

  const mockSourcesData = {
    PHB: {
      'Acid Splash': {
        class: [
          { name: 'Sorcerer', source: 'PHB' },
          { name: 'Wizard', source: 'PHB' }
        ]
      }
    }
  };

  it('parses a spell correctly', () => {
    const results = parseSpells(mockSpellsData, mockSourcesData);
    expect(results).toHaveLength(1);
    
    const spell = results[0];
    expect(spell.id).toBe('acid splash|PHB');
    expect(spell.name).toBe('Acid Splash');
    expect(spell.source).toBe('PHB');
    expect(spell.level).toBe(0);
    expect(spell.castingTime).toBe('1 action');
    expect(spell.range).toBe('60 feet');
    expect(spell.components).toEqual({ v: true, s: true, m: undefined });
    expect(spell.duration).toBe('Instantaneous');
    expect(spell.description).toBe('<p>You hurl a bubble of acid. [1d6] acid damage.</p>');
    expect(spell.higherLevel).toBe('<p>Damage increases to [2d6].</p>');
    expect(spell.classes).toEqual(['Sorcerer', 'Wizard']);
  });

  it('handles missing classes gracefully', () => {
    const results = parseSpells(mockSpellsData, {});
    expect(results[0].classes).toEqual([]);
  });

  it('returns empty array if no spells in data', () => {
    expect(parseSpells({}, {})).toEqual([]);
  });
});
