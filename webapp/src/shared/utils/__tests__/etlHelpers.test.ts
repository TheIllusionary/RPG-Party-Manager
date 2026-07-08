import { describe, it, expect } from 'vitest';
import { generateCompositeKey } from '../etlHelpers';

describe('etlHelpers', () => {
  describe('generateCompositeKey', () => {
    it('generates a composite key correctly', () => {
      expect(generateCompositeKey('Fireball', 'PHB')).toBe('fireball|PHB');
      expect(generateCompositeKey('acid splash', 'phb')).toBe('acid splash|PHB');
    });

    it('throws if arguments are missing', () => {
      expect(() => generateCompositeKey('', 'PHB')).toThrow();
      expect(() => generateCompositeKey('Fireball', '')).toThrow();
    });
  });
});
