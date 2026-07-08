import { describe, it, expect } from 'vitest';
import { parseMonster } from '../monsterParser';

describe('monsterParser', () => {
  it('should parse complex AC objects', () => {
    const raw = {
      name: 'Test Monster',
      source: 'MM',
      ac: [
        { ac: 17, from: ['natural armor', 'shield'] }
      ]
    };
    const parsed = parseMonster(raw);
    expect(parsed.ac).toBe(17);
    // Since from is not saved on IMonster currently, we just verify AC extraction succeeds
  });

  it('should parse complex HP objects', () => {
    const raw = {
      name: 'Test Monster',
      source: 'MM',
      hp: { average: 93, formula: '11d10 + 33' }
    };
    const parsed = parseMonster(raw);
    expect(parsed.hpMax).toBe(93);
    expect(parsed.hpFormula).toBe('11d10 + 33');
  });

  it('should parse complex Speed objects', () => {
    const raw = {
      name: 'Test Monster',
      source: 'MM',
      speed: { walk: 30, fly: { number: 60, condition: '(hover)' } }
    };
    const parsed = parseMonster(raw);
    expect(parsed.background).toContain('30 ft.');
    expect(parsed.background).toContain('fly 60 ft. (hover)');
  });

  it('should recursively parse action entries', () => {
    const raw = {
      name: 'Nerozar Mock',
      source: 'WDMM',
      action: [
        {
          name: 'Eye Ray',
          entries: [
            'Uses a random ray.',
            {
              type: 'list',
              items: [
                {
                  type: 'itemSub',
                  name: '1. Paralyzing Ray.',
                  entry: 'You are {@condition paralyzed}.'
                }
              ]
            }
          ]
        }
      ]
    };
    const parsed = parseMonster(raw);
    
    // Check if the html was generated correctly
    expect(parsed.abilities).toContain('<strong>Eye Ray.</strong>');
    expect(parsed.abilities).toContain('<p>Uses a random ray.</p>');
    expect(parsed.abilities).toContain('<ul><li><strong>1. Paralyzing Ray.</strong> You are <span');
    expect(parsed.abilities).toContain('data-reference-type="condition"'); // From tag parser
  });
});
