export const DEFAULT_SUBCLASSES = [
  {
    id: 'sub_blood_magic',
    name: 'Blood Magic',
    description: 'Sorcerous tradition that fuels spells with life force.',
    baseClass: 'Wizard',
    resourceTrait: 'vampire',
    resistances: [],
    immunities: [],
    vulnerabilities: ['Radiant'],
    passiveTraits: [
      { name: 'Scent of Blood', description: 'Track wounded creatures by smell within 60 ft.' },
    ],
    abilities: [
      {
        id: 'blood_bolt',
        name: 'Blood Bolt',
        type: 'ranged',
        toHit: 5,
        dc: null,
        save: null,
        reach: '',
        range: '60 ft.',
        damage: [{ formula: '2d8', type: 'necrotic', average: 9 }],
        cc: '',
        ccCustom: '',
        halfOnSuccess: false,
        description: 'Hurl corrupted blood at a foe.',
      },
    ],
  },
];

export const DEFAULT_DATA = {
  players: [
    { id: '1', name: 'Aelar', classType: 'Rogue', xp: 0, inParty: true, hpBase: 24, hpCurrent: 24, manaCurrent: 0, ultMax: 100, ultCurrent: 0, ac: 15, str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 12, background: 'Criminal', race: 'Elf', alignment: 'CG', features: 'Sneak Attack, Darkvision' },
    { id: '2', name: 'Thorgar', classType: 'Barbarian', xp: 0, inParty: true, hpBase: 35, hpCurrent: 35, manaCurrent: 0, ultMax: 100, ultCurrent: 0, ac: 14, str: 17, dex: 14, con: 16, int: 8, wis: 10, cha: 10, background: 'Outlander', race: 'Dwarf', alignment: 'CN', features: 'Rage, Unarmored Defense' },
    { id: '3', name: 'Lyra', classType: 'Wizard', xp: 0, inParty: true, hpBase: 18, hpCurrent: 18, manaCurrent: 20, ultMax: 100, ultCurrent: 0, ac: 12, str: 8, dex: 13, con: 14, int: 17, wis: 12, cha: 10, background: 'Sage', race: 'Human', alignment: 'LN', features: 'Arcane Recovery, Spellcasting' },
    { id: '4', name: 'Kaelen', classType: 'Cleric', xp: 0, inParty: true, hpBase: 27, hpCurrent: 27, manaCurrent: 15, ultMax: 100, ultCurrent: 0, ac: 18, str: 14, dex: 10, con: 15, int: 10, wis: 16, cha: 12, background: 'Acolyte', race: 'Half-Elf', alignment: 'LG', features: 'Divine Domain, Channel Divinity' }
  ],
  equipment: { inventories: {}, equipped: {}, playerGold: {} },
  library: [
    { id: 'l1', name: 'Goblin', classType: 'Enemy', ac: 13, hpMax: 7, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, features: 'Nimble Escape: Can take Disengage or Hide as a bonus action.', background: 'Goblinoid, CR 1/4', proficiency: 2, skills: { Stealth: true }, saves: {} },
    { id: 'l2', name: 'Orc', classType: 'Enemy', ac: 13, hpMax: 15, str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10, features: 'Aggressive: Can move up to its speed toward a hostile creature as a bonus action.', background: 'Humanoid, CR 1/2', proficiency: 2, skills: { Intimidation: true }, saves: {} },
    { id: 'l3', name: 'Troll', classType: 'Enemy', ac: 15, hpMax: 84, str: 18, dex: 13, con: 20, int: 7, wis: 9, cha: 7, features: 'Keen Smell: Advantage on Perception checks relying on smell.\nRegeneration: Regains 10 HP at start of turn unless hit with fire or acid.', background: 'Giant, CR 5', proficiency: 3, skills: { Perception: true }, saves: { con: true } },
    { id: 'l4', name: 'Red Dragon', classType: 'Boss', ac: 19, hpMax: 256, str: 26, dex: 10, con: 25, int: 16, wis: 15, cha: 19, features: 'Legendary Resistance (3/Day).\nFrightful Presence.\nFire Breath (Recharge 5-6): 15d6 fire damage in a 60ft cone (Dex save).', background: 'Dragon, CR 17', proficiency: 6, skills: { Perception: true, Stealth: true }, saves: { dex: true, con: true, wis: true, cha: true } }
  ],
  encounters: [],
  training: {},
  chaos: { customTables: [] },
  notebook: { pages: [] },
  bestiaryReview: {},
  buffsDatabase: [
    { id: 'b1', name: 'Regeneration', description: 'Regain 1d6 HP at the start of your turn.', type: 'turn', oncePerRest: 'none', turnType: 'healHP', turnFormula: '1d6' },
    { id: 'b2', name: 'Haste', description: 'Target gains +2 AC, extra action, and double movement speed.', type: 'toggle', oncePerRest: 'none', additionalDamage: '', additionalAC: 2, dodge: false, extraMovement: 30, extraAction: true },
    { id: 'b3', name: 'Second Wind', description: 'Once per short rest, heal 1d10.', type: 'turn', oncePerRest: 'short', turnType: 'healHP', turnFormula: '1d10' },
    { id: 'b4', name: 'Action Surge', description: 'Once per short rest, gain an extra action.', type: 'toggle', oncePerRest: 'short', additionalDamage: '', additionalAC: 0, dodge: false, extraMovement: 0, extraAction: true },
    { id: 'b5', name: 'Bless', description: 'Target gains a +2 bonus to saving throws and attack rolls.', type: 'toggle', oncePerRest: 'none', additionalDamage: '', additionalAC: 0, dodge: false, extraMovement: 0, extraAction: false, savingThrowBonus: 2 },
    { id: 'b6', name: 'Bane', description: 'Target suffers a -2 penalty to saving throws and attack rolls.', type: 'toggle', oncePerRest: 'none', additionalDamage: '', additionalAC: 0, dodge: false, extraMovement: 0, extraAction: false, savingThrowBonus: -2 },
    { id: 'b7', name: 'Rage', description: 'Barbarian Rage. Gain +2 additional melee damage, and +1 to saving throws.', type: 'toggle', oncePerRest: 'long', additionalDamage: '2', additionalAC: 0, dodge: false, extraMovement: 10, extraAction: false, savingThrowBonus: 1 },
    { id: 'b8', name: 'Shield of Faith', description: 'A shimmering field surrounds the target, granting +2 AC.', type: 'toggle', oncePerRest: 'none', additionalDamage: '', additionalAC: 2, dodge: false, extraMovement: 0, extraAction: false },
    { id: 'b9', name: 'Blur', description: 'Your body becomes blurred. Attacks against you have disadvantage (Dodge mode active).', type: 'toggle', oncePerRest: 'none', additionalDamage: '', additionalAC: 0, dodge: true, extraMovement: 0, extraAction: false },
    { id: 'b10', name: 'Divine Smite', description: 'Deal an extra 2d8 radiant damage on your next hit (Once per short rest).', type: 'fixed', oncePerRest: 'short', additionalDamage: '2d8', additionalAC: 0, dodge: false, extraMovement: 0, extraAction: false },
    { id: 'b11', name: 'Slow', description: 'Target AC is reduced by 2, and movement is reduced by 15 ft.', type: 'toggle', oncePerRest: 'none', additionalDamage: '', additionalAC: -2, dodge: false, extraMovement: -15, extraAction: false },
    { id: 'b12', name: 'Hunter\'s Mark', description: 'You deal an extra 1d6 damage when hitting the marked target.', type: 'toggle', oncePerRest: 'none', additionalDamage: '1d6', additionalAC: 0, dodge: false, extraMovement: 0, extraAction: false },
    { id: 'b13', name: 'Lay on Hands', description: 'Once per long rest, heal a target for 15 HP.', type: 'fixed', oncePerRest: 'long', additionalDamage: '', additionalAC: 0, dodge: false, extraMovement: 0, extraAction: false }
  ],
  subclasses: DEFAULT_SUBCLASSES,
};
