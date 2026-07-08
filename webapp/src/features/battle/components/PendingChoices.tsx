import { useState, useMemo, useCallback } from 'react';
import type { IChoiceObject } from '../../../services/compendium/fiveETools/types';
import type { IResolvedChoices } from '../../../types';

interface PendingChoicesProps {
  /** All pending choices gathered across all unlocked levels. */
  choices: IChoiceObject[];
  /** Currently saved selections in the new level-gated schema. */
  currentSelections?: IResolvedChoices;
  /** Called when the user clicks "Apply". Receives the resolved structure. */
  onCommit: (selections: IResolvedChoices) => void;
  /** Called when the user dismisses the panel without saving. */
  onDismiss?: () => void;
}

/**
 * Renders pending mechanical choices (ASIs, Skill Proficiencies, Languages)
 * grouped by Level and Type.
 */
export default function PendingChoices({
  choices,
  currentSelections,
  onCommit,
  onDismiss,
}: PendingChoicesProps) {
  // state structure: { "level_type_idx": string[] }
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    choices.forEach((choice, idx) => {
      const level = choice.level || 1;
      const key = `${level}_${choice.type}_${idx}`;
      const savedForLevel = currentSelections?.[level];
      let preSelected: string[] = [];

      if (savedForLevel) {
        if (choice.type === 'ability' && savedForLevel.asi) {
          // Push each stat N times based on its value
          for (const [k, v] of Object.entries(savedForLevel.asi)) {
            if (choice.options.includes(k)) {
              for (let i = 0; i < v; i++) preSelected.push(k);
            }
          }
        } else if (choice.type === 'skill' || choice.type === 'tool') {
          preSelected = (savedForLevel.proficiencies || []).filter(p => choice.options.includes(p));
        } else if (choice.type === 'language') {
          preSelected = (savedForLevel.languages || []).filter(l => choice.options.includes(l));
        }
      }
      init[key] = preSelected;
    });
    return init;
  });

  const isComplete = useMemo(
    () => choices.every((choice, idx) => {
      const level = choice.level || 1;
      const key = `${level}_${choice.type}_${idx}`;
      return (selected[key]?.length ?? 0) >= choice.count;
    }),
    [choices, selected],
  );

  const toggleOption = useCallback((choiceKey: string, option: string, max: number) => {
    setSelected((prev) => {
      const current = [...(prev[choiceKey] ?? [])];
      const existingIdx = current.indexOf(option);
      if (existingIdx !== -1) {
        current.splice(existingIdx, 1);
      } else if (current.length < max) {
        current.push(option);
      }
      return { ...prev, [choiceKey]: current };
    });
  }, []);

  const addOption = useCallback((choiceKey: string, option: string, max: number) => {
    setSelected((prev) => {
      const current = [...(prev[choiceKey] ?? [])];
      if (current.length < max) {
        current.push(option);
      }
      return { ...prev, [choiceKey]: current };
    });
  }, []);

  const removeOption = useCallback((choiceKey: string, option: string) => {
    setSelected((prev) => {
      const current = [...(prev[choiceKey] ?? [])];
      const existingIdx = current.indexOf(option);
      if (existingIdx !== -1) {
        current.splice(existingIdx, 1);
      }
      return { ...prev, [choiceKey]: current };
    });
  }, []);

  const handleCommit = useCallback(() => {
    const result: IResolvedChoices = JSON.parse(JSON.stringify(currentSelections || {}));

    choices.forEach((choice, idx) => {
      const level = choice.level || 1;
      const key = `${level}_${choice.type}_${idx}`;
      const chosen = selected[key] || [];

      if (!result[level]) result[level] = {};

      if (choice.type === 'ability') {
        if (!result[level].asi) result[level].asi = {};
        chosen.forEach(stat => {
          result[level].asi![stat] = (result[level].asi![stat] || 0) + 1;
        });
      } else if (choice.type === 'skill' || choice.type === 'tool') {
        if (!result[level].proficiencies) result[level].proficiencies = [];
        result[level].proficiencies = Array.from(new Set([...result[level].proficiencies!, ...chosen]));
      } else if (choice.type === 'language') {
        if (!result[level].languages) result[level].languages = [];
        result[level].languages = Array.from(new Set([...result[level].languages!, ...chosen]));
      }
    });

    onCommit(result);
  }, [choices, selected, onCommit, currentSelections]);

  const typeLabel: Record<IChoiceObject['type'], string> = {
    ability: 'Ability Score Increase',
    skill: 'Skill Proficiency',
    tool: 'Tool Proficiency',
    language: 'Language',
  };

  // Group choices by level for rendering
  const groupedChoices = useMemo(() => {
    const map = new Map<number, typeof choices>();
    choices.forEach(c => {
      const lvl = c.level || 1;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [choices]);

  return (
    <div className="pending-choices-panel">
      <div className="pending-choices-header">
        <span className="pending-choices-title">⚠ Pending Choices</span>
        {onDismiss && (
          <button
            type="button"
            className="pending-choices-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss choices panel"
          >
            ×
          </button>
        )}
      </div>

      {groupedChoices.map(([level, levelChoices]) => (
        <div key={`level-${level}`} className="pending-choices-level-group" style={{ marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            Level {level}
          </h4>
          {levelChoices.map((choice, idx) => {
            const key = `${level}_${choice.type}_${idx}`;
            const currentList = selected[key] ?? [];
            const remaining = choice.count - currentList.length;

            return (
              <div key={key} className="pending-choices-group">
                <p className="pending-choices-group-label">
                  <strong>{typeLabel[choice.type]}</strong>
                  <span className="pending-choices-count">
                    {remaining > 0
                      ? `Choose ${remaining} more`
                      : `✓ ${choice.count} selected`}
                  </span>
                </p>
                <div className="pending-choices-options">
                  {choice.options.map((option) => {
                    const optionCount = currentList.filter(o => o === option).length;
                    const isAtGlobalLimit = currentList.length >= choice.count;

                    if (choice.type === 'ability') {
                      // Render a counter for ASIs (allowing +2 to the same stat)
                      const canAdd = !isAtGlobalLimit && optionCount < 2; // Generally a stat can't go up by more than 2 in one go
                      return (
                        <div key={option} className="pending-choice-counter-item">
                          <span className="pending-choice-counter-label">{option.toUpperCase()}</span>
                          <div className="pending-choice-counter-controls">
                            <button
                              type="button"
                              className="pending-choice-counter-btn"
                              disabled={optionCount === 0}
                              onClick={() => removeOption(key, option)}
                            >
                              -
                            </button>
                            <span className="pending-choice-counter-value">{optionCount}</span>
                            <button
                              type="button"
                              className="pending-choice-counter-btn"
                              disabled={!canAdd}
                              onClick={() => addOption(key, option, choice.count)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      // Standard checkbox for skills/languages
                      const isChecked = optionCount > 0;
                      const isDisabled = !isChecked && isAtGlobalLimit;
                      return (
                        <label
                          key={option}
                          className={`pending-choice-item ${isDisabled ? 'is-disabled' : ''} ${isChecked ? 'is-selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => toggleOption(key, option, choice.count)}
                          />
                          <span>{option.toUpperCase()}</span>
                        </label>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        className={`pending-choices-apply-btn ${isComplete ? 'is-ready' : ''}`}
        onClick={handleCommit}
        title="Apply current selections to character"
      >
        {isComplete ? '✓ Apply All Choices' : 'Apply Current Selections'}
      </button>
    </div>
  );
}
