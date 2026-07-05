import {
  DEFAULT_CAMPAIGN_LOGIC_BLOCKS,
} from '../features/dashboard/constants/dashboardDefaults';
import { normalizeImportedData } from '../shared/utils/migrationUtils';
import { mergeLogicBlocksById } from '../shared/utils/logicBlockUtils';
import type { IAppData } from '../types';

export const DEFAULT_SUBCLASSES: any[] = [];

export const DEFAULT_DATA: IAppData = {
  players: [
    { id: '1', name: 'Aelar', classType: 'Rogue', xp: 0, inParty: true, hpBase: 24, hpCurrent: 24, manaCurrent: 0, ultMax: 100, ultCurrent: 0, ac: 15, str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 12, background: 'Criminal', race: 'Elf', alignment: 'CG', features: 'Sneak Attack, Darkvision' },
    { id: '2', name: 'Thorgar', classType: 'Barbarian', xp: 0, inParty: true, hpBase: 35, hpCurrent: 35, manaCurrent: 0, ultMax: 100, ultCurrent: 0, ac: 14, str: 17, dex: 14, con: 16, int: 8, wis: 10, cha: 10, background: 'Outlander', race: 'Dwarf', alignment: 'CN', features: 'Rage, Unarmored Defense' },
    { id: '3', name: 'Lyra', classType: 'Wizard', xp: 0, inParty: true, hpBase: 18, hpCurrent: 18, manaCurrent: 20, ultMax: 100, ultCurrent: 0, ac: 12, str: 8, dex: 13, con: 14, int: 17, wis: 12, cha: 10, background: 'Sage', race: 'Human', alignment: 'LN', features: 'Arcane Recovery, Spellcasting' },
    { id: '4', name: 'Kaelen', classType: 'Cleric', xp: 0, inParty: true, hpBase: 27, hpCurrent: 27, manaCurrent: 15, ultMax: 100, ultCurrent: 0, ac: 18, str: 14, dex: 10, con: 15, int: 10, wis: 16, cha: 12, background: 'Acolyte', race: 'Half-Elf', alignment: 'LG', features: 'Divine Domain, Channel Divinity' }
  ],
  equipment: { inventories: {}, equipped: {}, playerGold: {} },
  library: [],
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
  logicBlocks: DEFAULT_CAMPAIGN_LOGIC_BLOCKS,
};

/** Merges remote/parsed save data with defaults (new buffs, missing keys). */
export function mergeCampaignData(parsed: unknown): IAppData {
  if (!parsed) return { ...DEFAULT_DATA };

  const normalized = normalizeImportedData(parsed, DEFAULT_DATA);

  const mergedBuffs = [...(normalized.buffsDatabase ?? [])];
  for (const defBuff of DEFAULT_DATA.buffsDatabase) {
    if (!mergedBuffs.some((b) => b.name.toLowerCase() === defBuff.name.toLowerCase())) {
      mergedBuffs.push({ ...defBuff });
    }
  }

  const mergedSubclasses = [...(normalized.subclasses ?? [])];
  for (const defSub of DEFAULT_DATA.subclasses) {
    if (!mergedSubclasses.some((s) => s.id === defSub.id)) {
      mergedSubclasses.push({ ...defSub });
    }
  }

  const mergedLogicBlocks = mergeLogicBlocksById(
    normalized.logicBlocks,
    DEFAULT_DATA.logicBlocks,
  );

  return {
    ...normalized,
    logicBlocks: mergedLogicBlocks,
    library:
      normalized.library && normalized.library.length > 0
        ? normalized.library
        : DEFAULT_DATA.library,
    training: normalized.training || {},
    chaos: normalized.chaos || { customTables: [] },
    notebook: normalized.notebook || { pages: [] },
    bestiaryReview: normalized.bestiaryReview || {},
    buffsDatabase: mergedBuffs,
    subclasses: mergedSubclasses,
    customSubclasses: mergedSubclasses,
  };
}

/** Strips Mongo metadata fields before sending game state to the API. */
export function toApiPayload(data: Record<string, unknown>): Record<string, unknown> {
  const {
    _id: _mongoId,
    campaignId: _campaignId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    __v: _version,
    ...gameState
  } = data;
  return gameState;
}
