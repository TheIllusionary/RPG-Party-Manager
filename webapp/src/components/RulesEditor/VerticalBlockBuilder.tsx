import './VerticalBlockBuilder.css';

import { Plus, Trash2 } from 'lucide-react';

import {
  COMPARE_OP_LABELS,
  DEFAULT_FRIENDLY_LABEL,
  MATH_OP_LABELS,
  ACTOR_KIND_FRIENDLY_LABEL,
  ACTOR_KIND_OPTIONS,
  defaultConditionValue,
  isActorKindCondition,
  isNumericConditionField,
  triggerOptions,
} from '../../shared/schema/SchemaResolver';
import type { LogicBlock, RuleArithmeticOp } from '../../types/domain';

import SchemaSelect from './SchemaSelect';
import type { ConditionStep, FormulaOperand, FormulaStep, VerticalRuleDraft } from './formulaStack';
import { newStepId } from './formulaStack';

export interface VerticalBlockBuilderProps {
  block: LogicBlock;
  draft: VerticalRuleDraft;
  onDraftChange: (draft: VerticalRuleDraft) => void;
  onMetaChange: (patch: Partial<Pick<LogicBlock, 'name' | 'description' | 'enabled'>>) => void;
}

function OperandEditor({
  operand,
  onChange,
}: {
  operand: FormulaOperand;
  onChange: (operand: FormulaOperand) => void;
}) {
  return (
    <div className="vbb-operand-row">
      <select
        className="vbb-control vbb-operand-kind"
        value={operand.kind}
        onChange={(event) => {
          const kind = event.target.value as 'variable' | 'literal';
          onChange(
            kind === 'variable'
              ? { kind, friendlyLabel: DEFAULT_FRIENDLY_LABEL }
              : { kind, value: 1 },
          );
        }}
      >
        <option value="variable">Atributo</option>
        <option value="literal">Número</option>
      </select>
      {operand.kind === 'variable' ? (
        <SchemaSelect
          className="vbb-control vbb-operand-value"
          value={operand.friendlyLabel ?? DEFAULT_FRIENDLY_LABEL}
          onChange={(friendlyLabel) => onChange({ kind: 'variable', friendlyLabel })}
        />
      ) : (
        <input
          type="number"
          className="vbb-control vbb-operand-value"
          value={operand.value ?? 0}
          onChange={(event) =>
            onChange({
              kind: 'literal',
              value: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0,
            })
          }
        />
      )}
    </div>
  );
}

function ConditionValueEditor({
  friendlyLabel,
  value,
  onChange,
}: {
  friendlyLabel: string;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  if (isActorKindCondition(friendlyLabel)) {
    const strValue = String(value || 'player');
    return (
      <select
        className="vbb-control vbb-condition-value"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Tipo de ator"
      >
        {ACTOR_KIND_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (isNumericConditionField(friendlyLabel)) {
    return (
      <input
        type="number"
        className="vbb-control vbb-condition-value"
        value={typeof value === 'number' ? value : Number(value) || 0}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Valor da condição"
      />
    );
  }

  return (
    <input
      type="text"
      className="vbb-control vbb-condition-value"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Valor"
      aria-label="Valor da condição"
    />
  );
}

export default function VerticalBlockBuilder({
  block,
  draft,
  onDraftChange,
  onMetaChange,
}: VerticalBlockBuilderProps) {
  const updateStep = (stepId: string, patch: Partial<FormulaStep>) => {
    onDraftChange({
      ...draft,
      steps: draft.steps.map((step) =>
        step.id === stepId ? ({ ...step, ...patch } as FormulaStep) : step,
      ),
    });
  };

  const removeStep = (stepId: string) => {
    const next = draft.steps.filter((step) => step.id !== stepId);
    if (next.length === 0 || next[0].kind !== 'seed') {
      return;
    }
    onDraftChange({ ...draft, steps: next });
  };

  const addCombineStep = () => {
    onDraftChange({
      ...draft,
      steps: [
        ...draft.steps,
        {
          id: newStepId(),
          kind: 'combine',
          op: 'add' as RuleArithmeticOp,
          operand: { kind: 'literal', value: 1 },
        },
      ],
    });
  };

  const addCondition = () => {
    const next: ConditionStep = {
      id: newStepId(),
      friendlyLabel: ACTOR_KIND_FRIENDLY_LABEL,
      op: 'eq',
      value: 'player',
    };
    onDraftChange({ ...draft, conditions: [...draft.conditions, next] });
  };

  const updateCondition = (id: string, patch: Partial<ConditionStep>) => {
    onDraftChange({
      ...draft,
      conditions: draft.conditions.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...patch };
        if (patch.friendlyLabel && patch.friendlyLabel !== c.friendlyLabel) {
          merged.value = defaultConditionValue(patch.friendlyLabel);
        }
        return merged;
      }),
    });
  };

  const removeCondition = (id: string) => {
    onDraftChange({
      ...draft,
      conditions: draft.conditions.filter((c) => c.id !== id),
    });
  };

  return (
    <div className="vbb-root">
      <div className="vbb-card">
        <h4 className="vbb-section-title">Receita da regra</h4>
        <div className="vbb-meta-grid">
          <label className="vbb-field">
            Nome
            <input
              className="vbb-control"
              value={block.name}
              onChange={(e) => onMetaChange({ name: e.target.value })}
            />
          </label>
          <label className="vbb-field vbb-field--wide">
            Descrição
            <input
              className="vbb-control"
              value={block.description ?? ''}
              onChange={(e) => onMetaChange({ description: e.target.value })}
              placeholder="Ex.: Mana máxima baseada em CON e nível"
            />
          </label>
        </div>
      </div>

      <div className="vbb-card vbb-card--solid">
        <label className="vbb-field vbb-field--emphasis">
          Quando esta regra roda
          <select
            className="vbb-control"
            value={draft.trigger}
            onChange={(e) => onDraftChange({ ...draft, trigger: e.target.value })}
          >
            {triggerOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stack">
        <div className="vbb-section-header">
          <h4 className="vbb-section-title">Fórmula (empilhada)</h4>
          <button type="button" className="vbb-btn-secondary" onClick={addCombineStep}>
            <Plus className="icon-sm" aria-hidden />
            Passo matemático
          </button>
        </div>

        <div className="vbb-stack">
          {draft.steps.map((step, index) => (
            <div key={step.id} className="vbb-step">
              <div className="vbb-step-body">
                {step.kind === 'seed' ? (
                  <>
                    <span className="vbb-step-label vbb-step-label--seed">Começar com</span>
                    <OperandEditor
                      operand={step.operand}
                      onChange={(operand) => updateStep(step.id, { operand } as Partial<FormulaStep>)}
                    />
                  </>
                ) : (
                  <>
                    <span className="vbb-step-label vbb-step-label--combine">
                      Depois {index > 0 ? `#${index}` : ''}
                    </span>
                    <div className="vbb-combine-row">
                      <select
                        className="vbb-control vbb-op-select"
                        value={step.op}
                        onChange={(e) =>
                          updateStep(step.id, { op: e.target.value as RuleArithmeticOp })
                        }
                      >
                        {Object.entries(MATH_OP_LABELS).map(([op, label]) => (
                          <option key={op} value={op}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <OperandEditor
                        operand={step.operand}
                        onChange={(operand) =>
                          updateStep(step.id, { operand } as Partial<FormulaStep>)
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              {step.kind !== 'seed' && (
                <button
                  type="button"
                  className="vbb-icon-danger"
                  onClick={() => removeStep(step.id)}
                  aria-label="Remover passo"
                >
                  <Trash2 className="icon-sm" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="stack">
        <div className="vbb-section-header">
          <h4 className="vbb-section-title">Condições (se aplicável)</h4>
          <button type="button" className="vbb-btn-secondary" onClick={addCondition}>
            <Plus className="icon-sm" aria-hidden />
            Condição
          </button>
        </div>

        {draft.conditions.length === 0 && (
          <p className="vbb-empty-hint">
            Sem condições — a regra vale para todos os atores. Ex.: &quot;Se tipo de ator é
            jogador&quot; usa <code>actor.kind</code> (player / npc / monster).
          </p>
        )}

        <div className="vbb-stack">
          {draft.conditions.map((condition) => (
            <div key={condition.id} className="vbb-step vbb-step--condition">
              <div className="vbb-condition-grid">
                <label className="vbb-condition-field">
                  <span className="vbb-condition-field-label">Campo</span>
                  <SchemaSelect
                    className="vbb-control"
                    value={condition.friendlyLabel}
                    onChange={(friendlyLabel) => updateCondition(condition.id, { friendlyLabel })}
                  />
                </label>
                <label className="vbb-condition-field">
                  <span className="vbb-condition-field-label">Operador</span>
                  <select
                    className="vbb-control"
                    value={condition.op}
                    onChange={(e) =>
                      updateCondition(condition.id, {
                        op: e.target.value as ConditionStep['op'],
                      })
                    }
                  >
                    {Object.entries(COMPARE_OP_LABELS).map(([op, label]) => (
                      <option key={op} value={op}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="vbb-condition-field">
                  <span className="vbb-condition-field-label">Valor</span>
                  <ConditionValueEditor
                    friendlyLabel={condition.friendlyLabel}
                    value={condition.value}
                    onChange={(value) => updateCondition(condition.id, { value })}
                  />
                </label>
              </div>
              <button
                type="button"
                className="vbb-icon-danger"
                onClick={() => removeCondition(condition.id)}
                aria-label="Remover condição"
              >
                <Trash2 className="icon-sm" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
