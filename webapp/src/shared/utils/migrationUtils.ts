import { createEmptySubclass } from '../../data/attackSchema';

/** Full player shape expected by PlayerManager + combatUtils. */
export const DEFAULT_PLAYER_TEMPLATE = {
  id: '',
  name: 'Unknown',
  classType: 'Default',
  xp: 0,
  inParty: true,
  hpBase: 10,
  hpCurrent: 10,
  manaCurrent: 0,
  ultMax: 100,
  ultCurrent: 0,
  ac: 10,
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  skills: {},
  saves: {},
  manaExhaustion: 0,
  resourceTrait: 'standard',
  subclassId: null,
  recentSpells: [],
  background: '',
  race: '',
  alignment: '',
  features: '',
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  ccResistances: [],
  ccImmunities: [],
  ccVulnerabilities: [],
  cc: [],
  buffs: [],
};

/** Active battle enemy shape (when present in legacy exports). */
export const DEFAULT_ENEMY_TEMPLATE = {
  id: '',
  name: 'Enemy',
  classType: 'Enemy',
  ac: 12,
  hpBase: 20,
  hp: 20,
  hpMax: 20,
  str: 10,
  dex: 10,
  con: 10,
  int: 6,
  wis: 8,
  cha: 6,
  proficiency: 2,
  abilities: '',
  features: '',
  background: '',
  skills: {},
  saves: {},
  editing: false,
  limitBreakUsed: false,
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  ccResistances: [],
  ccImmunities: [],
  ccVulnerabilities: [],
  cc: [],
  buffs: [],
  buffStates: {},
  spentBuffs: {},
  attacks: [],
};

export const DEFAULT_BUFF_TEMPLATE = {
  id: '',
  name: '',
  description: '',
  type: 'toggle',
  oncePerRest: 'none',
  turnType: '',
  turnFormula: '',
  additionalDamage: '',
  additionalAC: 0,
  dodge: false,
  extraMovement: 0,
  extraAction: false,
  savingThrowBonus: 0,
};

const SUBCLASS_TEMPLATE = createEmptySubclass();

function omitUndefined(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function asObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function asNumber(value, fallback = 0) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
}

function mergeWithTemplate(template, raw) {
  const source = omitUndefined(raw);
  const merged = { ...template, ...source };

  for (const key of Object.keys(template)) {
    const templateVal = template[key];
    const sourceVal = source[key];

    if (Array.isArray(templateVal)) {
      merged[key] = asArray(sourceVal, []);
      continue;
    }

    if (templateVal !== null && typeof templateVal === 'object' && !Array.isArray(templateVal)) {
      merged[key] = asObject(sourceVal, { ...templateVal });
    }
  }

  return merged;
}

export function normalizePlayer(player, index = 0) {
  const subclassId = player?.subclassId ?? player?.subclass ?? null;
  const normalized = mergeWithTemplate(DEFAULT_PLAYER_TEMPLATE, {
    ...player,
    id: player?.id != null ? String(player.id) : `imported_player_${index}`,
    subclassId,
    resourceTrait: player?.resourceTrait === 'vampire' ? 'vampire' : 'standard',
    recentSpells: asArray(player?.recentSpells),
    manaExhaustion: asNumber(player?.manaExhaustion, 0),
    inParty: player?.inParty !== false,
  });

  delete normalized.subclass;
  return normalized;
}

export function normalizeEnemy(enemy, index = 0) {
  return mergeWithTemplate(DEFAULT_ENEMY_TEMPLATE, {
    ...enemy,
    id: enemy?.id != null ? String(enemy.id) : `imported_enemy_${index}`,
    hp: asNumber(enemy?.hp, enemy?.hpMax ?? DEFAULT_ENEMY_TEMPLATE.hp),
    hpMax: asNumber(enemy?.hpMax, enemy?.hp ?? DEFAULT_ENEMY_TEMPLATE.hpMax),
    hpBase: asNumber(enemy?.hpBase, enemy?.hpMax ?? DEFAULT_ENEMY_TEMPLATE.hpBase),
    buffStates: asObject(enemy?.buffStates),
    spentBuffs: asObject(enemy?.spentBuffs),
    attacks: asArray(enemy?.attacks),
  });
}

export function normalizeBuff(buff, defaultBuffs = []) {
  const merged = mergeWithTemplate(DEFAULT_BUFF_TEMPLATE, buff);
  const match = defaultBuffs.find(
    (d) => (buff?.id && d.id === buff.id)
      || (buff?.name && d.name?.toLowerCase() === buff.name.toLowerCase())
  );
  return match ? mergeWithTemplate(merged, match) : merged;
}

export function normalizeSubclass(subclass, index = 0) {
  return mergeWithTemplate(SUBCLASS_TEMPLATE, {
    ...subclass,
    id: subclass?.id != null ? String(subclass.id) : `imported_sub_${index}`,
    passiveTraits: asArray(subclass?.passiveTraits),
    abilities: asArray(subclass?.abilities),
    resistances: asArray(subclass?.resistances),
    immunities: asArray(subclass?.immunities),
    vulnerabilities: asArray(subclass?.vulnerabilities),
    resourceTrait: subclass?.resourceTrait === 'vampire' ? 'vampire' : 'standard',
  });
}

function normalizeEquipment(equipment) {
  const eq = asObject(equipment);
  return {
    inventories: asObject(eq.inventories),
    equipped: asObject(eq.equipped),
    playerGold: asObject(eq.playerGold),
  };
}

function normalizeChaos(chaos) {
  const c = asObject(chaos);
  return {
    ...c,
    customTables: asArray(c.customTables),
  };
}

function normalizeNotebook(notebook) {
  const n = asObject(notebook);
  return {
    ...n,
    pages: asArray(n.pages),
  };
}

/**
 * Deep-hydrates legacy/imported campaign saves so nested entities always
 * contain the keys required by the current UI and combat engine.
 */
export function normalizeImportedData(importedData, defaultData) {
  const defaults = defaultData || {};
  const imported = importedData && typeof importedData === 'object' && !Array.isArray(importedData)
    ? importedData
    : {};

  const defaultBuffs = asArray(defaults.buffsDatabase);
  const defaultSubclasses = asArray(defaults.subclasses);

  const rawSubclasses = imported.subclasses ?? imported.customSubclasses;
  const subclasses = asArray(rawSubclasses).map((sub, idx) => {
    const normalized = normalizeSubclass(sub, idx);
    const match = defaultSubclasses.find((d) => d.id === normalized.id);
    return match ? mergeWithTemplate(normalized, match) : normalized;
  });

  const players = asArray(imported.players).map((player, idx) => normalizePlayer(player, idx));

  const enemies = imported.enemies !== undefined
    ? asArray(imported.enemies).map((enemy, idx) => normalizeEnemy(enemy, idx))
    : undefined;

  const buffsDatabase = asArray(imported.buffsDatabase).map((buff) => normalizeBuff(buff, defaultBuffs));

  const normalized = {
    ...defaults,
    ...omitUndefined(imported),
    players,
    equipment: normalizeEquipment(imported.equipment ?? defaults.equipment),
    library: asArray(imported.library, asArray(defaults.library)),
    encounters: asArray(imported.encounters),
    training: asObject(imported.training, asObject(defaults.training)),
    chaos: normalizeChaos(imported.chaos ?? defaults.chaos),
    notebook: normalizeNotebook(imported.notebook ?? defaults.notebook),
    bestiaryReview: asObject(imported.bestiaryReview, asObject(defaults.bestiaryReview)),
    buffsDatabase,
    subclasses,
    customSubclasses: subclasses,
  };

  if (enemies !== undefined) {
    normalized.enemies = enemies;
  }

  return normalized;
}
