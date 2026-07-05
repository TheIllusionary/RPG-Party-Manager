import { filterActiveLogicBlocks } from './logicBlockUtils';
import type { LogicBlock } from '../../types/domain';

/** Homebrew mana pool — when enabled, campaign uses mana instead of spell slots. */
export const MANA_CASTING_RULE_ID = 'mana_max_formula';
/** D&D 5e spell slots for caster classes (when mana rule is off). */
export const SPELL_SLOTS_RULE_ID = 'spell_slots_enabled';
/** Combat fatigue on repeated low-level mana casts (mana mode only). */
export const SPELL_FATIGUE_RULE_ID = 'spell_fatigue_enabled';

export type CampaignCastingMode = 'mana' | 'spell_slots';

export const CASTING_MODE_CONTROLLED_RULE_IDS = new Set([
  MANA_CASTING_RULE_ID,
  SPELL_SLOTS_RULE_ID,
]);

function findRule(blocks: LogicBlock[], id: string): LogicBlock | undefined {
  return filterActiveLogicBlocks(blocks).find((b) => b.id === id);
}

export function getManaCastingRule(blocks: LogicBlock[]): LogicBlock | undefined {
  return findRule(blocks, MANA_CASTING_RULE_ID);
}

export function isManaCastingEnabled(logicBlocks?: LogicBlock[]): boolean {
  const rule = getManaCastingRule(logicBlocks ?? []);
  if (!rule) return true;
  return rule.enabled;
}

export function isSpellSlotsRuleEnabled(logicBlocks?: LogicBlock[]): boolean {
  const rule = findRule(logicBlocks ?? [], SPELL_SLOTS_RULE_ID);
  if (!rule) return false;
  return rule.enabled;
}

export function isSpellFatigueRuleEnabled(logicBlocks?: LogicBlock[]): boolean {
  const rule = findRule(logicBlocks ?? [], SPELL_FATIGUE_RULE_ID);
  if (!rule) return false;
  return rule.enabled;
}

export function getCampaignCastingMode(logicBlocks?: LogicBlock[]): CampaignCastingMode {
  return isManaCastingEnabled(logicBlocks) ? 'mana' : 'spell_slots';
}

/** Spell slots UI/casts — mana off + spell slots rule on. */
export function isSpellSlotsCastingActive(logicBlocks?: LogicBlock[]): boolean {
  return !isManaCastingEnabled(logicBlocks) && isSpellSlotsRuleEnabled(logicBlocks);
}

/** Fatigue tracker — mana mode + fatigue rule on (never with spell slots). */
export function isSpellFatigueActive(logicBlocks?: LogicBlock[]): boolean {
  return isManaCastingEnabled(logicBlocks) && isSpellFatigueRuleEnabled(logicBlocks);
}

export function setCampaignCastingMode(
  logicBlocks: LogicBlock[],
  mode: CampaignCastingMode,
): LogicBlock[] {
  const now = new Date().toISOString();
  return logicBlocks.map((block) => {
    if (block.id === MANA_CASTING_RULE_ID) {
      return { ...block, enabled: mode === 'mana', updatedAt: now };
    }
    if (block.id === SPELL_SLOTS_RULE_ID) {
      return { ...block, enabled: mode === 'spell_slots', updatedAt: now };
    }
    return block;
  });
}

export function setOptionalRuleEnabled(
  logicBlocks: LogicBlock[],
  ruleId: typeof SPELL_FATIGUE_RULE_ID,
  enabled: boolean,
): LogicBlock[] {
  const now = new Date().toISOString();
  return logicBlocks.map((block) =>
    block.id === ruleId ? { ...block, enabled, updatedAt: now } : block,
  );
}
