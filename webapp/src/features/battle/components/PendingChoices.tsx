import { useState, useMemo, useCallback } from 'react';
import type { IChoiceObject } from '../../../services/compendium/fiveETools/types';

interface PendingChoicesProps {
  /** All pending choices from the selected race/subrace. */
  choices: IChoiceObject[];
  /** Currently saved selections (merged from player.proficiencyChoices + player.asiChoices). */
  currentSelections: string[];
  /** Called when the user clicks "Apply". Receives the flat selected-option list. */
  onCommit: (selections: string[]) => void;
  /** Called when the user dismisses the panel without saving. */
  onDismiss?: () => void;
}

/**
 * Renders pending mechanical choices (ASIs, Skill Proficiencies, Languages)
 * grouped by type. Enforces the `count` limit per choice block via checkbox
 * disabling. Calls `onCommit` with the final flat selections array.
 */
export default function PendingChoices({
  choices,
  currentSelections,
  onCommit,
  onDismiss,
}: PendingChoicesProps) {
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => {
    // Pre-populate with existing selections, grouped by choice option membership
    const init: Record<string, Set<string>> = {};
    choices.forEach((choice, idx) => {
      const key = `${choice.type}_${idx}`;
      const preSelected = choice.options.filter((o) => currentSelections.includes(o));
      init[key] = new Set(preSelected);
    });
    return init;
  });

  const allSelections = useMemo(() => {
    const flat: string[] = [];
    for (const set of Object.values(selected)) {
      flat.push(...set);
    }
    return flat;
  }, [selected]);

  const isComplete = useMemo(
    () => choices.every((choice, idx) => {
      const key = `${choice.type}_${idx}`;
      return (selected[key]?.size ?? 0) >= choice.count;
    }),
    [choices, selected],
  );

  const toggleOption = useCallback((choiceKey: string, option: string, max: number) => {
    setSelected((prev) => {
      const current = new Set(prev[choiceKey] ?? []);
      if (current.has(option)) {
        current.delete(option);
      } else if (current.size < max) {
        current.add(option);
      }
      return { ...prev, [choiceKey]: current };
    });
  }, []);

  const typeLabel: Record<IChoiceObject['type'], string> = {
    ability: 'Ability Score Increase',
    skill: 'Skill Proficiency',
    tool: 'Tool Proficiency',
    language: 'Language',
  };

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

      {choices.map((choice, idx) => {
        const key = `${choice.type}_${idx}`;
        const currentSet = selected[key] ?? new Set<string>();
        const remaining = choice.count - currentSet.size;

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
                const isChecked = currentSet.has(option);
                const isDisabled = !isChecked && currentSet.size >= choice.count;
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
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className={`pending-choices-apply-btn ${isComplete ? 'is-ready' : ''}`}
        disabled={!isComplete}
        onClick={() => onCommit(allSelections)}
        title={isComplete ? 'Apply choices to character' : 'Complete all selections first'}
      >
        {isComplete ? '✓ Apply Choices' : 'Complete selections…'}
      </button>
    </div>
  );
}
