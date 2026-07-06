import type { Actor } from '../types/domain';
import type { LogicBlock, LogicTrigger } from '../types/domain';
import { logicEngine } from '../services/homebrew/LogicEngine';
import type { LogicEngineResult } from '../services/homebrew/LogicEngine';

import { runDamagePipeline } from './damagePipeline';
import { buildScopedRulesBundle, mergeRulesForTrigger, resolveRuleScope } from './modifiers';
import type {
  AppliedBlockSummary,
  DamageProcessResult,
  EngineEventPayload,
  EngineEventType,
  EventMiddleware,
  EventMiddlewareContext,
  EventProcessResult,
  RuleEngineState,
  ScopedRulesBundle,
  ScopedRulesInput,
  TurnAdvanceResult,
} from './types';

export class RuleEngine {
  private actors: Map<string, Actor>;
  private rules: ScopedRulesBundle;
  private middlewares: EventMiddleware[] = [];

  constructor(state?: Partial<RuleEngineState>) {
    this.actors = state?.actors ?? new Map();
    this.rules = state?.rules ?? buildScopedRulesBundle({});
  }

  /** Register pipeline middleware (runs before core `executeEvent`). */
  use(middleware: EventMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  getActor(actorId: string): Actor | undefined {
    return this.actors.get(actorId);
  }

  setActor(actor: Actor): void {
    this.actors.set(actor.id, actor);
  }

  setRules(input: ScopedRulesInput): void {
    this.rules = buildScopedRulesBundle(input);
  }

  getRules(): ScopedRulesBundle {
    return this.rules;
  }

  /**
   * High-level damage API — UI can call:
   * `engine.processDamage(attacker, defender, 20, 'acid')`
   */
  processDamage(
    attacker: Actor | string,
    defender: Actor | string,
    amount: number,
    damageType: string,
  ): DamageProcessResult {
    const attackerActor = typeof attacker === 'string' ? this.requireActor(attacker) : attacker;
    const defenderActor = typeof defender === 'string' ? this.requireActor(defender) : defender;

    const eventResult = this.processEvent(
      'damage_pipeline',
      {
        attackerId: attackerActor.id,
        defenderId: defenderActor.id,
        damage: { baseAmount: amount, damageType },
      },
      attackerActor,
      defenderActor,
    );

    if (!eventResult.damage) {
      throw new Error('RuleEngine.processDamage: pipeline did not produce a damage result');
    }

    return eventResult.damage;
  }

  /**
   * Generic event processor with optional middleware chain.
   */
  processEvent(
    eventType: EngineEventType,
    payload: EngineEventPayload = {},
    attacker?: Actor,
    defender?: Actor,
  ): EventProcessResult {
    const actor =
      payload.actorId != null ? this.actors.get(payload.actorId) : defender ?? attacker;

    const ctx: EventMiddlewareContext = {
      eventType,
      payload,
      attacker,
      defender,
      actor,
      variables: { ...(payload.variables ?? {}) },
    };

    const result = this.runMiddlewareChain(ctx, 0);
    this.persistActorsFromResult(result);
    return result;
  }

  /**
   * Starts a turn for `actorId`, firing `on_turn_start` then `on_turn_end`
   * across global, encounter, actor, and condition scopes.
   */
  advanceTurn(actorId: string): TurnAdvanceResult {
    const actor = this.requireActor(actorId);

    const startResult = this.processEvent(
      'on_turn_start',
      { actorId, variables: { turnActorId: actorId } },
      undefined,
      actor,
    );

    const midActor = startResult.actor ?? startResult.defender ?? actor;

    const endResult = this.processEvent(
      'on_turn_end',
      { actorId, variables: { turnActorId: actorId } },
      undefined,
      midActor,
    );

    const finalActor = endResult.actor ?? endResult.defender ?? midActor;
    this.setActor(finalActor);

    return {
      actorId,
      actor: finalActor,
      eventResults: [startResult, endResult],
    };
  }

  private runMiddlewareChain(ctx: EventMiddlewareContext, index: number): EventProcessResult {
    if (index >= this.middlewares.length) {
      return this.executeEvent(ctx);
    }

    let result: EventProcessResult | undefined;
    this.middlewares[index](ctx, () => {
      result = this.runMiddlewareChain(ctx, index + 1);
    });
    return result ?? this.executeEvent(ctx);
  }

  private executeEvent(ctx: EventMiddlewareContext): EventProcessResult {
    if (ctx.eventType === 'damage_pipeline' && ctx.attacker && ctx.defender && ctx.payload.damage) {
      const damage = runDamagePipeline({
        attacker: ctx.attacker,
        defender: ctx.defender,
        baseAmount: ctx.payload.damage.baseAmount,
        damageType: ctx.payload.damage.damageType,
        rules: this.rules,
      });

      return {
        eventType: ctx.eventType,
        attacker: ctx.attacker,
        defender: damage.defender,
        damage,
        appliedBlocks: damage.pipeline.steps.map((step) => ({
          blockId: step.id,
          blockName: step.label,
          scope: 'global',
          applied: true,
          skippedReason: step.detail,
        })),
        variables: ctx.variables,
      };
    }

    const target = ctx.actor ?? ctx.defender ?? ctx.attacker;
    if (!target) {
      return {
        eventType: ctx.eventType,
        appliedBlocks: [],
        variables: ctx.variables,
      };
    }

    const trigger = ctx.eventType as LogicTrigger;
    const blocks = mergeRulesForTrigger(this.rules, target, trigger);
    const engineResult = this.runLogicBlocks(blocks, target, trigger, ctx.variables);

    return {
      eventType: ctx.eventType,
      actor: engineResult.actor,
      attacker: ctx.attacker,
      defender: ctx.defender ?? engineResult.actor,
      appliedBlocks: this.summarizeBlocks(blocks, engineResult),
      variables: ctx.variables,
    };
  }

  private persistActorsFromResult(result: EventProcessResult): void {
    if (result.damage?.defender) {
      this.setActor(result.damage.defender);
    } else if (result.defender) {
      this.setActor(result.defender);
    } else if (result.actor) {
      this.setActor(result.actor);
    }
  }

  private runLogicBlocks(
    blocks: LogicBlock[],
    actor: Actor,
    trigger: LogicTrigger,
    variables?: Record<string, unknown>,
  ): LogicEngineResult {
    return logicEngine.evaluateBlocks(blocks, { actor, variables }, { trigger });
  }

  private summarizeBlocks(
    blocks: LogicBlock[],
    result: LogicEngineResult,
  ): AppliedBlockSummary[] {
    return result.results.map((row) => {
      const block = blocks.find((b) => b.id === row.blockId);
      return {
        blockId: row.blockId,
        blockName: row.blockName,
        scope: block ? resolveRuleScope(block) : 'global',
        applied: row.applied,
        skippedReason: row.skippedReason,
      };
    });
  }

  private requireActor(actorId: string): Actor {
    const actor = this.actors.get(actorId);
    if (!actor) {
      throw new Error(`RuleEngine: actor not found: ${actorId}`);
    }
    return actor;
  }
}

export function createRuleEngine(state?: Partial<RuleEngineState>): RuleEngine {
  return new RuleEngine(state);
}

export const gameRuleEngine = createRuleEngine();
