import { createEmptySubclass } from '../../data/attackSchema';
import { getLevelInfo, calculateModifier } from '../../features/battle/utils/partyUtils';
import { normalizeLogicBlocks } from './logicBlockUtils';
import { legacyCalculateMaxHP, legacyCalculateMaxMana } from './campaignRulesRuntime';
import type { IAppData, IBuff, IEnemy, IEquipment, IMonster, IPlayer, ISubclass } from '../../types';

/** Full player shape expected by PlayerManager + combatUtils. */
export const DEFAULT_PLAYER_TEMPLATE: Record<string, unknown> = {
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
  optionalSubclassId: null,
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
export const DEFAULT_ENEMY_TEMPLATE: Record<string, unknown> = {
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

export const DEFAULT_BUFF_TEMPLATE: Record<string, unknown> = {
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

const SUBCLASS_TEMPLATE = createEmptySubclass() as Record<string, unknown>;

function omitUndefined(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function asObject(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { ...fallback };
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
}

/**
 * hpBase is class hit-die foundation (≈6–40), not total max HP.
 * A prior bug wrote derived max HP into hpBase on every combat sync, inflating it over time.
 */
function sanitizePlayerHpBase(raw: Record<string, unknown>): number {
  const xp = asNumber(raw.xp, 0);
  const level = getLevelInfo(xp).level;
  const conMod = calculateModifier(asNumber(raw.con, 10));
  const hpBase = asNumber(raw.hpBase, 10);
  const hpCurrent = asNumber(raw.hpCurrent, hpBase);

  const maxReasonableBase = 12 + Math.max(0, level - 1) * 12 + 15;
  if (hpBase <= maxReasonableBase) return hpBase;

  const inferredBase = hpCurrent - conMod * level;
  if (inferredBase >= 6 && inferredBase <= maxReasonableBase) {
    return inferredBase;
  }

  return 10;
}

function sanitizePlayerHpFields(raw: Record<string, unknown>): { hpBase: number; hpCurrent: number } {
  const hpBase = sanitizePlayerHpBase(raw);
  const isVampire = raw.resourceTrait === 'vampire';

  const stub = {
    xp: asNumber(raw.xp, 0),
    hpBase,
    con: asNumber(raw.con, 10),
    int: asNumber(raw.int, 10),
    wis: asNumber(raw.wis, 10),
    cha: asNumber(raw.cha, 10),
    manaModifier: asNumber(raw.manaModifier, 0),
  } as import('../../types').IPlayer;

  const manaMax = legacyCalculateMaxMana(stub);
  const legacyMax = legacyCalculateMaxHP(stub, manaMax, isVampire);
  const rawCurrent = asNumber(raw.hpCurrent, legacyMax);
  const hpCurrent = Math.min(Math.max(0, rawCurrent), legacyMax);

  return { hpBase, hpCurrent };
}

/** Repairs inflated hpBase/hpCurrent from the actor-bridge bug; returns null if already sane. */
export function repairPlayerHpFields(player: IPlayer): Partial<IPlayer> | null {
  const fixed = sanitizePlayerHpFields(player as unknown as Record<string, unknown>);
  if (fixed.hpBase === player.hpBase && fixed.hpCurrent === player.hpCurrent) return null;
  return fixed;
}

function mergeWithTemplate(
  template: Record<string, unknown>,
  raw: unknown,
): Record<string, unknown> {
  const source = omitUndefined(raw);
  const merged: Record<string, unknown> = { ...template, ...source };

  for (const key of Object.keys(template)) {
    const templateVal = template[key];
    const sourceVal = source[key];

    if (Array.isArray(templateVal)) {
      merged[key] = asArray(sourceVal);
      continue;
    }

    if (templateVal !== null && typeof templateVal === 'object' && !Array.isArray(templateVal)) {
      merged[key] = asObject(sourceVal, templateVal as Record<string, unknown>);
    }
  }

  return merged;
}

export function normalizePlayer(player: unknown, index = 0): IPlayer {
  const raw = asObject(player);
  const subclassId =
    (raw.subclassId as string | null | undefined) ??
    (raw.subclass as string | null | undefined) ??
    null;
  const optionalSubclassId =
    (raw.optionalSubclassId as string | null | undefined) ?? null;
  const hpFields = sanitizePlayerHpFields(raw);
  const normalized = mergeWithTemplate(DEFAULT_PLAYER_TEMPLATE, {
    ...raw,
    id: raw.id != null ? String(raw.id) : `imported_player_${index}`,
    subclassId,
    optionalSubclassId,
    resourceTrait: raw.resourceTrait === 'vampire' ? 'vampire' : 'standard',
    recentSpells: asArray<number>(raw.recentSpells),
    manaExhaustion: asNumber(raw.manaExhaustion, 0),
    inParty: raw.inParty !== false,
    hpBase: hpFields.hpBase,
    hpCurrent: hpFields.hpCurrent,
  });

  delete normalized.subclass;
  return normalized as unknown as IPlayer;
}

export function normalizeEnemy(enemy: unknown, index = 0): IEnemy {
  const raw = asObject(enemy);
  return mergeWithTemplate(DEFAULT_ENEMY_TEMPLATE, {
    ...raw,
    id: raw.id != null ? String(raw.id) : `imported_enemy_${index}`,
    hp: asNumber(raw.hp, asNumber(raw.hpMax, 20)),
    hpMax: asNumber(raw.hpMax, asNumber(raw.hp, 20)),
    hpBase: asNumber(raw.hpBase, asNumber(raw.hpMax, 20)),
    buffStates: asObject(raw.buffStates),
    spentBuffs: asObject(raw.spentBuffs),
    attacks: asArray(raw.attacks),
  }) as unknown as IEnemy;
}

export function normalizeBuff(buff: unknown, defaultBuffs: IBuff[] = []): IBuff {
  const raw = asObject(buff);
  const merged = mergeWithTemplate(DEFAULT_BUFF_TEMPLATE, raw);
  const match = defaultBuffs.find(
    (d) =>
      (raw.id && d.id === raw.id) ||
      (typeof raw.name === 'string' &&
        d.name?.toLowerCase() === raw.name.toLowerCase()),
  );
  return (match ? mergeWithTemplate(merged, match) : merged) as unknown as IBuff;
}

export function normalizeSubclass(subclass: unknown, index = 0): ISubclass {
  const raw = asObject(subclass);
  return mergeWithTemplate(SUBCLASS_TEMPLATE, {
    ...raw,
    id: raw.id != null ? String(raw.id) : `imported_sub_${index}`,
    passiveTraits: asArray(raw.passiveTraits),
    abilities: asArray(raw.abilities),
    resistances: asArray(raw.resistances),
    immunities: asArray(raw.immunities),
    vulnerabilities: asArray(raw.vulnerabilities),
    resourceTrait: raw.resourceTrait === 'vampire' ? 'vampire' : 'standard',
  }) as unknown as ISubclass;
}

function normalizeEquipment(equipment: unknown): IEquipment {
  const eq = asObject(equipment);
  return {
    inventories: asObject(eq.inventories) as IEquipment['inventories'],
    equipped: asObject(eq.equipped) as IEquipment['equipped'],
    playerGold: asObject(eq.playerGold) as IEquipment['playerGold'],
  };
}

function normalizeChaos(chaos: unknown): IAppData['chaos'] {
  const c = asObject(chaos);
  return {
    ...c,
    customTables: asArray(c.customTables),
  } as IAppData['chaos'];
}

function normalizeNotebook(notebook: unknown): IAppData['notebook'] {
  const n = asObject(notebook);
  return {
    ...n,
    pages: asArray(n.pages),
  } as IAppData['notebook'];
}

export type NormalizedCampaignData = IAppData & { enemies?: IEnemy[] };

/**
 * Deep-hydrates legacy/imported campaign saves so nested entities always
 * contain the keys required by the current UI and combat engine.
 */
export function normalizeImportedData(
  importedData: unknown,
  defaultData: Partial<IAppData> | IAppData = {},
): NormalizedCampaignData {
  const defaults = defaultData;
  const imported =
    importedData && typeof importedData === 'object' && !Array.isArray(importedData)
      ? (importedData as Record<string, unknown>)
      : {};

  const defaultBuffs = asArray<IBuff>(defaults.buffsDatabase);
  const defaultSubclasses = asArray<ISubclass>(defaults.subclasses);

  const rawSubclasses = imported.subclasses ?? imported.customSubclasses;
  const subclasses: ISubclass[] = asArray<unknown>(rawSubclasses).map((sub, idx) => {
    const normalized = normalizeSubclass(sub, idx);
    const match = defaultSubclasses.find((d) => d.id === normalized.id);
    return match
      ? (mergeWithTemplate(
          normalized as unknown as Record<string, unknown>,
          match as unknown as Record<string, unknown>,
        ) as unknown as ISubclass)
      : normalized;
  });

  const players = asArray<unknown>(imported.players).map((player, idx) =>
    normalizePlayer(player, idx),
  );

  const enemies =
    imported.enemies !== undefined
      ? asArray<unknown>(imported.enemies).map((enemy, idx) => normalizeEnemy(enemy, idx))
      : undefined;

  const buffsDatabase = asArray<unknown>(imported.buffsDatabase).map((buff) =>
    normalizeBuff(buff, defaultBuffs),
  );

  const normalized: NormalizedCampaignData = {
    ...defaults,
    ...omitUndefined(imported),
    players,
    equipment: normalizeEquipment(imported.equipment ?? defaults.equipment),
    library: asArray<IMonster>(imported.library, asArray<IMonster>(defaults.library)),
    encounters: asArray(imported.encounters),
    training: asObject(imported.training, asObject(defaults.training)) as IAppData['training'],
    chaos: normalizeChaos(imported.chaos ?? defaults.chaos),
    notebook: normalizeNotebook(imported.notebook ?? defaults.notebook),
    bestiaryReview: asObject(
      imported.bestiaryReview,
      asObject(defaults.bestiaryReview),
    ) as IAppData['bestiaryReview'],
    buffsDatabase,
    subclasses,
    customSubclasses: subclasses,
    logicBlocks: normalizeLogicBlocks(imported.logicBlocks ?? defaults.logicBlocks),
  };

  if (enemies !== undefined) {
    normalized.enemies = enemies;
  }

  return normalized;
}
