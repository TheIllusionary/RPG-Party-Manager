import { describe, it, expect } from 'vitest';
import { parseItemText, parseItemEntries } from '../itemParser';

describe('itemParser', () => {
    describe('parseItemText', () => {
        it('parses stat setters (e.g. Your Strength score becomes 19)', () => {
            const result = parseItemText("Your Strength score becomes 19");
            expect(result.attributes.str).toBe(19);
            
            const result2 = parseItemText("Your Intelligence score is 22");
            expect(result2.attributes.int).toBe(22);
        });

        it('parses stat modifiers (e.g. gain a +1 bonus to AC)', () => {
            const result = parseItemText("You gain a +1 bonus to AC");
            expect(result.acBonus).toBe(1);

            const result2 = parseItemText("Armor Class +2");
            expect(result2.acBonus).toBe(2);
        });

        it('parses attribute modifiers (e.g. gain a +2 bonus to Constitution)', () => {
            const result = parseItemText("grant a +2 bonus to Constitution and gain a +1 bonus to Strength");
            expect(result.modifiers.con).toBe(2);
            expect(result.modifiers.str).toBe(1);
        });

        it('parses resistances', () => {
            const result = parseItemText("You have resistance to fire and cold damage");
            expect(result.resistances).toContain("fire");
            expect(result.resistances).toContain("cold");
        });

        it('parses immunities', () => {
            const result = parseItemText("You gain immunity to poison damage");
            expect(result.immunities).toContain("poison");
        });

        it('strips 5etools tags', () => {
            const result = parseItemText("{@item shield|phb} grants a +2 bonus to AC");
            expect(result.acBonus).toBe(2);
        });

        it('returns empty object if nothing matches', () => {
            const result = parseItemText("This sword is very shiny and does 1d6 damage.");
            expect(result.acBonus).toBe(0);
            expect(Object.keys(result.attributes).length).toBe(0);
            expect(Object.keys(result.modifiers).length).toBe(0);
            expect(result.resistances.length).toBe(0);
            expect(result.immunities.length).toBe(0);
        });
    });

    describe('parseItemEntries', () => {
        it('parses array of strings correctly', () => {
            const result = parseItemEntries([
                "You gain a +1 bonus to AC.",
                "Your Strength score becomes 19."
            ]);
            expect(result.acBonus).toBe(1);
            expect(result.attributes.str).toBe(19);
        });

        it('returns default empty object for non-arrays', () => {
            const result = parseItemEntries(undefined as any);
            expect(result.acBonus).toBe(0);
        });
    });
});
