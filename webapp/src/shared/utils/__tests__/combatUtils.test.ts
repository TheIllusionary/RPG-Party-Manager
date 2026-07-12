import { describe, it, expect } from 'vitest';
import { calculateEffectiveAC } from '../combatUtils';

describe('combatUtils', () => {
    describe('calculateEffectiveAC', () => {
        it('returns player base ac if no armor is equipped', () => {
            const player = { id: 'p1', ac: 12 };
            const equipment = { equipped: { p1: {} } };
            const result = calculateEffectiveAC(player, equipment);
            expect(result).toBe(12);
        });

        it('adds DEX modifier to player base ac when no armor is equipped', () => {
            const player = { id: 'p1', ac: 10, dex: 16 };
            const equipment = { equipped: { p1: {} } };
            const result = calculateEffectiveAC(player, equipment);
            expect(result).toBe(13); // 10 + 3
        });

        it('returns 10 if player has no ac and no armor', () => {
            const player = { id: 'p1' };
            const equipment = { equipped: {} };
            const result = calculateEffectiveAC(player, equipment);
            expect(result).toBe(10);
        });

        it('calculates armor base AC + modStat correctly', () => {
            const player = { id: 'p1', dex: 16 };
            const equipment = {
                equipped: {
                    p1: {
                        armor: {
                            name: 'Studded Leather',
                            baseAC: 12,
                            acModifierStat: 'dex',
                            acModifierCap: null
                        }
                    }
                }
            };
            // 12 + ((16 - 10) / 2) = 12 + 3 = 15
            const result = calculateEffectiveAC(player, equipment);
            expect(result).toBe(15);
        });

        it('respects armor max modifier cap', () => {
            const player = { id: 'p1', dex: 18 };
            const equipment = {
                equipped: {
                    p1: {
                        armor: {
                            name: 'Half Plate',
                            baseAC: 15,
                            acModifierStat: 'dex',
                            acModifierCap: 2
                        }
                    }
                }
            };
            // 15 + min(2, (18 - 10) / 2) = 15 + 2 = 17
            const result = calculateEffectiveAC(player, equipment);
            expect(result).toBe(17);
        });

        it('adds acBonus from wondrous items and other slots', () => {
            const player = { id: 'p1', ac: 10 };
            const equipment = {
                equipped: {
                    p1: {
                        offhand: { name: 'Shield', acBonus: 2 },
                        __wondrous__: [
                            { name: 'Ring of Protection', acBonus: 1 },
                            { name: 'Cloak of Protection', acBonus: 1 }
                        ]
                    }
                }
            };
            const result = calculateEffectiveAC(player, equipment);
            expect(result).toBe(14);
        });

        it('adds additionalAC from active buffs', () => {
            const player = { id: 'p1', ac: 10, buffs: ['Shield of Faith'] };
            const equipment = { equipped: { p1: {} } };
            const buffsDatabase = [
                { name: 'Shield of Faith', type: 'toggle', additionalAC: 2 }
            ];
            const result = calculateEffectiveAC(player, equipment, buffsDatabase);
            expect(result).toBe(12);
        });

        it('subtracts AC from conditions like Slowed', () => {
            const player = { id: 'p1', ac: 15, buffs: ['Slowed'] };
            const equipment = { equipped: { p1: {} } };
            const buffsDatabase = [
                { name: 'Slowed', type: 'toggle', additionalAC: -2 }
            ];
            const result = calculateEffectiveAC(player, equipment, buffsDatabase);
            expect(result).toBe(13);
        });
    });
});
