import type { Actor } from '../../../types/domain';
import type { LogicBlock } from '../../../types/domain';

export const DASHBOARD_TEST_CAMPAIGN_ID = 'dm-dashboard-test';

/** Mana = (Constitution × 2) + Level — homebrew JSON block for RuleEvaluator tests. */
export const MANA_MAX_RULE: LogicBlock = {
  id: 'mana_max_formula',
  name: 'Mana Maximum',
  description: 'Mana = Spell Slots Points at level scaled by INT (12 divisor) and WIS/CHA (24 divisor, baseline 14). Disable to use D&D 5e Spell Slots in the campaign.',
  trigger: 'manual',
  enabled: true,
  computeTarget: 'manaMax',
  effects: [],
  updatedAt: '2026-07-12T20:45:00Z',
  conditions: [{ field: 'actor.kind', op: 'eq', value: 'player' }],
  compute: {
    kind: 'binary',
    op: 'add',
    left: {
      kind: 'binary',
      op: 'multiply',
      left: { kind: 'field', path: 'actor.stats.con' },
      right: { kind: 'literal', value: 2 },
    },
    right: { kind: 'field', path: 'actor.customAttributes.level' },
  },
};

/** Spell slots D&D 5e — only caster classes receive slots when this rule is on (mana rule off). */
export const SPELL_SLOTS_RULE: LogicBlock = {
  id: 'spell_slots_enabled',
  name: 'Spell Slots (D&D 5e)',
  description:
    'Enables spell slots for spellcasting classes (Wizard, Cleric, etc.). Fighters and Rogues do not receive slots.',
  trigger: 'manual',
  enabled: false,
  effects: [],
  updatedAt: new Date(0).toISOString(),
};

/** Fatigue on repeated lvl 1–3 casts — mana mode only; spell slots never use fatigue. */
export const SPELL_FATIGUE_RULE: LogicBlock = {
  id: 'spell_fatigue_enabled',
  name: 'Casting Fatigue',
  description:
    'Level 1–3 spells repeated in the same combat increase mana cost (homebrew). Does not affect spell slots.',
  trigger: 'manual',
  enabled: false,
  effects: [],
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_CAMPAIGN_LOGIC_BLOCKS: LogicBlock[] = [
  MANA_MAX_RULE,
  SPELL_SLOTS_RULE,
  SPELL_FATIGUE_RULE,
];

export const DASHBOARD_LOGIC_BLOCKS: LogicBlock[] = DEFAULT_CAMPAIGN_LOGIC_BLOCKS;

export function createSampleActors(): Actor[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'actor_lyra',
      kind: 'player',
      name: 'Lyra (Wizard)',
      inParty: true,
      stats: { str: 8, dex: 13, con: 14, int: 17, wis: 12, cha: 10 },
      resources: {
        hp: { current: 18, max: 18 },
        mana: { current: 12, max: 20, label: 'Mana' },
      },
      conditions: ['Blessed'],
      visibility: {
        hp: 'visible',
        resources: 'visible',
        notes: 'dm_only',
        playerVisibleAttributeKeys: ['level'],
      },
      customAttributes: { level: 5, classType: 'Wizard' },
      dmNotes: 'Secret: allied with the Raven Queen',
      updatedAt: now,
    },
    {
      id: 'actor_goblin',
      kind: 'monster',
      name: 'Goblin Skirmisher',
      stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      resources: {
        hp: { current: 5, max: 7 },
      },
      conditions: ['Hidden'],
      visibility: {
        hp: 'approximate',
        resources: 'hidden',
        notes: 'dm_only',
      },
      realHP: 5,
      updatedAt: now,
    },
  ];
}

export function createEmptyActor(): Actor {
  const now = new Date().toISOString();
  return {
    id: `actor_${Date.now()}`,
    kind: 'player',
    name: 'New Actor',
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    resources: {
      hp: { current: 10, max: 10 },
      mana: { current: 0, max: 0, label: 'Mana' },
    },
    visibility: {
      hp: 'visible',
      resources: 'visible',
      notes: 'dm_only',
      playerVisibleAttributeKeys: ['level'],
    },
    customAttributes: { level: 1 },
    updatedAt: now,
  };
}
