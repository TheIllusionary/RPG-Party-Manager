import type { Actor } from '../types/domain';
import type { LogicBlock, RuleScope } from '../types/domain';

/** Canonical engine event types (extends logic-block triggers). */
export type EngineEventType =
  | 'on_turn_start'
  | 'on_turn_end'
  | 'on_damage'
  | 'on_heal'
  | 'on_spell_cast'
  | 'damage_pipeline';

export interface DamagePayload {
  baseAmount: number;
  damageType: string;
}

export interface EngineEventPayload {
  actorId?: string;
  attackerId?: string;
  defenderId?: string;
  damage?: DamagePayload;
  variables?: Record<string, unknown>;
}

/** Aggregated protection flags used by the damage pipeline. */
export interface ActorDamageModifiers {
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  bypassResistances: string[];
}

export type DamagePipelineStepId =
  | 'base'
  | 'defender_immunity'
  | 'defender_resistance'
  | 'defender_vulnerability'
  | 'attacker_bypass'
  | 'application';

export interface DamagePipelineStep {
  id: DamagePipelineStepId;
  label: string;
  amountBefore: number;
  amountAfter: number;
  detail?: string;
  halted?: boolean;
}

export interface DamagePipelineState {
  damageType: string;
  baseAmount: number;
  currentAmount: number;
  halted: boolean;
  haltedReason?: string;
  resistanceApplied: boolean;
  resistanceMultiplier: number;
  bypassedResistance: boolean;
  amountBeforeResistance: number;
  steps: DamagePipelineStep[];
}

export interface DamageProcessResult {
  finalDamage: number;
  defender: Actor;
  pipeline: DamagePipelineState;
}

export interface ScopedRulesInput {
  global?: LogicBlock[];
  encounter?: LogicBlock[];
  /** Passive rules keyed by actor id (class traits, racial, etc.). */
  actor?: Record<string, LogicBlock[]>;
  /** Temporary condition rules (applied when actor has matching condition). */
  condition?: LogicBlock[];
}

export interface ScopedRulesBundle {
  global: LogicBlock[];
  encounter: LogicBlock[];
  actor: Map<string, LogicBlock[]>;
  condition: LogicBlock[];
}

export interface RuleEngineState {
  actors: Map<string, Actor>;
  rules: ScopedRulesBundle;
}

export interface TurnAdvanceResult {
  actorId: string;
  actor: Actor;
  eventResults: EventProcessResult[];
}

export interface EventProcessResult {
  eventType: EngineEventType;
  actor?: Actor;
  attacker?: Actor;
  defender?: Actor;
  damage?: DamageProcessResult;
  appliedBlocks: AppliedBlockSummary[];
  variables?: Record<string, unknown>;
}

export interface AppliedBlockSummary {
  blockId: string;
  blockName: string;
  scope: RuleScope;
  applied: boolean;
  skippedReason?: string;
}

export type EventMiddleware = (
  context: EventMiddlewareContext,
  next: () => void,
) => void;

export interface EventMiddlewareContext {
  eventType: EngineEventType;
  payload: EngineEventPayload;
  attacker?: Actor;
  defender?: Actor;
  actor?: Actor;
  variables: Record<string, unknown>;
}

export const DEFAULT_RULE_SCOPE: RuleScope = 'global';
