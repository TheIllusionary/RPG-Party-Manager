/** 5e.tools internal school codes → display labels (PHB). */
export const FIVEE_SPELL_SCHOOL_LABELS: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
  V: 'Evocation',
};

export function spellSchoolLabel(code: string): string {
  return FIVEE_SPELL_SCHOOL_LABELS[code] ?? code;
}
