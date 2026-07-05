import type { Actor } from '../types/domain';
import type { ActorDamageModifiers, DamagePipelineState, DamageProcessResult } from './types';
import { normalizeDamageType } from './damageTypes';
import {
  collectActorModifiers,
  collectAttackerBypass,
  getActorScopedRules,
  getConditionRulesForActor,
  hasBypass,
  hasImmunity,
  hasResistance,
  hasVulnerability,
} from './modifiers';
import type { ScopedRulesBundle } from './types';

function pushStep(
  state: DamagePipelineState,
  id: DamagePipelineState['steps'][number]['id'],
  label: string,
  amountAfter: number,
  detail?: string,
  halted = false,
): void {
  state.steps.push({
    id,
    label,
    amountBefore: state.currentAmount,
    amountAfter,
    detail,
    halted,
  });
  state.currentAmount = amountAfter;
  if (halted) {
    state.halted = true;
  }
}

function applyHpDamage(actor: Actor, amount: number): Actor {
  const hp = actor.resources.hp ?? { current: 0, max: 0 };
  const current = hp.current ?? 0;
  const next = Math.max(0, current - amount);

  return {
    ...actor,
    resources: {
      ...actor.resources,
      hp: { ...hp, current: next },
    },
    updatedAt: new Date().toISOString(),
  };
}

export interface RunDamagePipelineParams {
  attacker: Actor;
  defender: Actor;
  baseAmount: number;
  damageType: string;
  rules: ScopedRulesBundle;
}

/**
 * D&D 5e damage resolution pipeline (middleware-friendly, stage-ordered).
 *
 * 1. Base damage + type
 * 2. Defender immunities → 0 (halt)
 * 3. Defender resistances → half
 * 4. Attacker bypass resistance → restore pre-resistance amount
 * 5. Apply to defender HP
 */
export function runDamagePipeline(params: RunDamagePipelineParams): DamageProcessResult {
  const damageType = normalizeDamageType(params.damageType);
  const baseAmount = Math.max(0, Math.floor(params.baseAmount));

  const defenderActorRules = getActorScopedRules(params.rules, params.defender.id);
  const defenderConditionRules = getConditionRulesForActor(params.defender, params.rules);
  const defenderMods: ActorDamageModifiers = collectActorModifiers(
    params.defender,
    defenderActorRules,
    defenderConditionRules,
  );

  const attackerActorRules = getActorScopedRules(params.rules, params.attacker.id);
  const attackerBypass = collectAttackerBypass(params.attacker, attackerActorRules);

  const state: DamagePipelineState = {
    damageType,
    baseAmount,
    currentAmount: baseAmount,
    halted: false,
    resistanceApplied: false,
    resistanceMultiplier: 1,
    bypassedResistance: false,
    amountBeforeResistance: baseAmount,
    steps: [],
  };

  pushStep(state, 'base', 'Base damage', baseAmount, `${baseAmount} ${damageType}`);

  if (hasImmunity(defenderMods, damageType)) {
    pushStep(
      state,
      'defender_immunity',
      'Defender immunity',
      0,
      `Immune to ${damageType}`,
      true,
    );
    state.haltedReason = 'defender_immune';
    return {
      finalDamage: 0,
      defender: params.defender,
      pipeline: state,
    };
  }

  pushStep(
    state,
    'defender_immunity',
    'Defender immunity check',
    state.currentAmount,
    'No immunity',
  );

  let afterResistance = state.currentAmount;
  if (hasResistance(defenderMods, damageType) && afterResistance > 0) {
    state.resistanceApplied = true;
    state.resistanceMultiplier = 0.5;
    state.amountBeforeResistance = afterResistance;
    afterResistance = Math.floor(afterResistance * 0.5);
    pushStep(
      state,
      'defender_resistance',
      'Defender resistance',
      afterResistance,
      `Resistant to ${damageType} (×½)`,
    );
  } else {
    pushStep(
      state,
      'defender_resistance',
      'Defender resistance check',
      afterResistance,
      'No resistance',
    );
  }

  if (
    state.resistanceApplied &&
    hasBypass(attackerBypass, damageType) &&
    state.amountBeforeResistance > 0
  ) {
    state.bypassedResistance = true;
    afterResistance = state.amountBeforeResistance;
    pushStep(
      state,
      'attacker_bypass',
      'Attacker bypass resistance',
      afterResistance,
      `Bypass ${damageType} resistance`,
    );
  } else {
    pushStep(
      state,
      'attacker_bypass',
      'Attacker bypass check',
      afterResistance,
      state.resistanceApplied ? 'No bypass' : 'N/A',
    );
  }

  if (hasVulnerability(defenderMods, damageType) && afterResistance > 0) {
    afterResistance = afterResistance * 2;
    pushStep(
      state,
      'defender_vulnerability',
      'Defender vulnerability',
      afterResistance,
      `Vulnerable to ${damageType} (×2)`,
    );
  } else {
    pushStep(
      state,
      'defender_vulnerability',
      'Defender vulnerability check',
      afterResistance,
      'No vulnerability',
    );
  }

  const finalDamage = Math.max(0, afterResistance);
  const updatedDefender = applyHpDamage(params.defender, finalDamage);

  pushStep(
    state,
    'application',
    'Apply to HP',
    finalDamage,
    `HP ${params.defender.resources.hp?.current ?? 0} → ${updatedDefender.resources.hp?.current ?? 0}`,
  );

  return {
    finalDamage,
    defender: updatedDefender,
    pipeline: state,
  };
}
