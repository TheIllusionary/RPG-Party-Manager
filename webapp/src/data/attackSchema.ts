/** Shared structured attack shape (monsters, subclasses, players). */
export function createEmptyAttack(name = 'New Attack') {
  return {
    id: `atk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    type: 'melee',
    toHit: null,
    dc: null,
    save: null,
    reach: '',
    range: '',
    damage: [{ formula: '1d6', type: 'slashing', average: 0 }],
    cc: '',
    ccCustom: '',
    halfOnSuccess: false,
    description: '',
  };
}

export function createEmptySubclass(name = 'New Subclass') {
  return {
    id: `sub_${Date.now()}`,
    name,
    description: '',
    baseClass: '',
    resourceTrait: 'standard',
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    passiveTraits: [],
    abilities: [],
  };
}
