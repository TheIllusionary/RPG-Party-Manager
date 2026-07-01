export const generateUniqueId = () => Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);

export const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
];

export const ALL_CC_EFFECTS = [
  'Blind 🕶️', 'Charmed ✨', 'Deafened 🔇', 'Frightened 😨', 'Grappled ✊',
  'Incapacitated 😵', 'Paralyzed ⏳', 'Petrified 🗿', 'Poisoned 🤢', 'Prone 🛏️',
  'Restrained 🕸️', 'Stunned 🌀', 'Asleep 💤', 'Slowed 🐢',
];

export const DND_SKILLS = [
  { name: 'Acrobatics', stat: 'dex' }, { name: 'Animal Handling', stat: 'wis' },
  { name: 'Arcana', stat: 'int' }, { name: 'Athletics', stat: 'str' },
  { name: 'Deception', stat: 'cha' }, { name: 'History', stat: 'int' },
  { name: 'Insight', stat: 'wis' }, { name: 'Intimidation', stat: 'cha' },
  { name: 'Investigation', stat: 'int' }, { name: 'Medicine', stat: 'wis' },
  { name: 'Nature', stat: 'int' }, { name: 'Perception', stat: 'wis' },
  { name: 'Performance', stat: 'cha' }, { name: 'Persuasion', stat: 'cha' },
  { name: 'Religion', stat: 'int' }, { name: 'Sleight of Hand', stat: 'dex' },
  { name: 'Stealth', stat: 'dex' }, { name: 'Survival', stat: 'wis' },
];

export const STATS_LIST = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];
