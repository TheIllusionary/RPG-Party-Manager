import { useState } from 'react';
import type { ActorDamageModifiers } from '../../../engine/types';
import { ALL_CC_EFFECTS } from '../utils/constants';
import { deriveConditions, CONDITIONS_DICT } from '../../../data/conditions';

export interface ActorModifierBadgesProps {
  entityType: 'player' | 'enemy';
  entityId: string;
  conditions: string[];
  modifiers: ActorDamageModifiers | null;
  onAddCondition: (entityType: 'player' | 'enemy', entityId: string, effect: string) => void;
  onRemoveCondition: (entityType: 'player' | 'enemy', entityId: string, effect: string) => void;
  children?: React.ReactNode;
}

export default function ActorModifierBadges({
  entityType,
  entityId,
  conditions,
  modifiers,
  onAddCondition,
  onRemoveCondition,
  children,
}: ActorModifierBadgesProps) {
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState(ALL_CC_EFFECTS[0] ?? 'Poisoned 🤢');

  const resistances = modifiers?.resistances ?? [];
  const immunities = modifiers?.immunities ?? [];
  const vulnerabilities = modifiers?.vulnerabilities ?? [];

  const hasAny =
    resistances.length > 0 ||
    immunities.length > 0 ||
    vulnerabilities.length > 0 ||
    conditions.length > 0 ||
    adding;

  const hasResistances = resistances.length > 0 || immunities.length > 0 || vulnerabilities.length > 0;

  return (
    <div className="actor-modifiers-column" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Row 1: Resistances, Immunities, Vulnerabilities */}
      {hasResistances && (
        <div className="actor-tag-area" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {resistances.map((t) => (
            <span key={`res-${t}`} className="actor-mod-badge actor-mod-badge--resist" title={`Resistance: ${t}`} data-tooltip={`Resistance: ${t}`}>
              Resist: {t}
            </span>
          ))}
          {immunities.map((t) => (
            <span key={`imm-${t}`} className="actor-mod-badge actor-mod-badge--immune" title={`Immunity: ${t}`} data-tooltip={`Immunity: ${t}`}>
              Immune: {t}
            </span>
          ))}
          {vulnerabilities.map((t) => (
            <span key={`vul-${t}`} className="actor-mod-badge actor-mod-badge--vuln" title={`Vulnerability: ${t}`} data-tooltip={`Vulnerability: ${t}`}>
              Vuln: {t}
            </span>
          ))}
        </div>
      )}

      {/* Row 2: Buffs & Debuffs */}
      {children && (
        <div className="actor-tag-area" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {children}
        </div>
      )}

      {/* Row 3: Conditions (CC) */}
      <div className="actor-tag-area" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        {deriveConditions(conditions).map((cc) => {
          const isDerived = !conditions.includes(cc);
          const conditionData = CONDITIONS_DICT[cc];
          
          return (
            <button
              key={cc}
              type="button"
              className={`actor-mod-badge actor-mod-badge--condition ${isDerived ? 'derived' : ''}`}
              data-tooltip={conditionData?.description || ''}
              title={isDerived ? `Derived from parent condition` : `Remove ${cc}`}
              onClick={(e) => {
                  if (!isDerived) {
                      onRemoveCondition(entityType, entityId, cc);
                  }
              }}
              style={isDerived ? { cursor: 'help' } : undefined}
            >
              {cc} {!isDerived && <span className="actor-tag-remove">×</span>}
            </button>
          );
        })}
        {adding ? (
          <span className="actor-tag-inline-add">
            <select
              className="actor-tag-select"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              {ALL_CC_EFFECTS.filter((e) => !conditions.includes(e)).map((effect) => (
                <option key={effect} value={effect}>
                  {effect}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="actor-tag-confirm-btn"
              onClick={() => {
                if (pick && !conditions.includes(pick)) {
                  onAddCondition(entityType, entityId, pick);
                }
                setAdding(false);
              }}
            >
              ✓
            </button>
            <button type="button" className="actor-tag-cancel-btn" onClick={() => setAdding(false)}>
              ✕
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="actor-tag-add-btn"
            title="Add condition"
            onClick={() => setAdding(true)}
          >
            + Cond
          </button>
        )}
      </div>
    </div>
  );
}
