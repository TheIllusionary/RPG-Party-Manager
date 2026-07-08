import { describe, it, expect } from 'vitest';
import { parseTags } from '../tagParser';

describe('tagParser', () => {
  it('parses mechanical tags correctly', () => {
    expect(parseTags('Takes {@damage 1d6} acid damage')).toBe('Takes [1d6] acid damage');
    expect(parseTags('Uses {@dice 8d6|8d6|Display text} damage')).toBe('Uses Display text damage');
    expect(parseTags('Uses {@dice 8d6}')).toBe('Uses [8d6]');
    expect(parseTags('{@hit 5} to hit')).toBe('+5 to hit');
    expect(parseTags('{@hit +5} to hit')).toBe('+5 to hit');
    expect(parseTags('{@atk mw}')).toBe('Melee Weapon Attack:');
    expect(parseTags('{@atk rw}')).toBe('Ranged Weapon Attack:');
    expect(parseTags('{@recharge 5}')).toBe('(Recharge 5-6)');
    expect(parseTags('{@d20}')).toBe('d20');
    expect(parseTags('{@h}')).toBe('Hit: ');
  });

  it('parses formatting tags correctly', () => {
    expect(parseTags('{@b bold text}')).toBe('<strong>bold text</strong>');
    expect(parseTags('{@i italic text}')).toBe('<em>italic text</em>');
    expect(parseTags('{@s strike text}')).toBe('<del>strike text</del>');
  });

  it('parses reference tags correctly into HTML spans', () => {
    expect(parseTags('Casts {@spell fireball}')).toBe('Casts <span data-reference-type="spell" data-reference-id="fireball|PHB">fireball</span>');
    expect(parseTags('Casts {@spell fireball|XGE}')).toBe('Casts <span data-reference-type="spell" data-reference-id="fireball|XGE">fireball</span>');
    expect(parseTags('Casts {@spell fireball|PHB|massive fire}')).toBe('Casts <span data-reference-type="spell" data-reference-id="fireball|PHB">massive fire</span>');
    
    expect(parseTags('Summons a {@creature goblin}')).toBe('Summons a <span data-reference-type="creature" data-reference-id="goblin|MM">goblin</span>');
    expect(parseTags('Uses a {@item longsword|PHB}')).toBe('Uses a <span data-reference-type="item" data-reference-id="longsword|PHB">longsword</span>');
  });

  it('handles multiple tags in one string', () => {
    const input = '{@atk mw} {@hit 5} to hit, taking {@damage 1d6+2} damage.';
    const output = 'Melee Weapon Attack: +5 to hit, taking [1d6+2] damage.';
    expect(parseTags(input)).toBe(output);
  });
});
