import { TRIGGER_FRIENDLY_MAP } from '../../../shared/schema/SchemaResolver';
import type { ICombatState } from '../../../types/battle';

function triggerLabel(trigger: string): string {
  return TRIGGER_FRIENDLY_MAP[trigger] ?? trigger;
}

export interface EncounterScenePanelProps {
  combat: ICombatState;
}

export default function EncounterScenePanel({ combat }: EncounterScenePanelProps) {
  const {
    encounterRules,
    currentTurnActor,
    turnOrder,
    currentTurnIndex,
    advanceEncounterTurn,
  } = combat;

  const activeRules = encounterRules.filter((r) => r.enabled);

  return (
    <aside className="encounter-scene-panel" aria-label="Encounter and scene rules">
      <div className="encounter-scene-panel__head">
        <h3 className="encounter-scene-panel__title">Encounter / Scene</h3>
        <div className="encounter-scene-panel__turn">
          {currentTurnActor ? (
            <span className="encounter-turn-label" title="Current actor in turn queue">
              Turn: <strong>{currentTurnActor.name}</strong>
              <span className="encounter-turn-index">
                ({(currentTurnIndex % Math.max(1, turnOrder.length)) + 1}/{turnOrder.length})
              </span>
            </span>
          ) : (
            <span className="encounter-turn-label encounter-turn-label--empty">No actors in turn order</span>
          )}
          <button
            type="button"
            className="encounter-next-turn-btn"
            onClick={advanceEncounterTurn}
            disabled={turnOrder.length === 0}
          >
            Avançar Turno
          </button>
        </div>
      </div>

      <div className="encounter-scene-panel__rules">
        {activeRules.length === 0 ? (
          <p className="encounter-scene-panel__empty">
            No encounter-scoped rules active. Add rules with scope &quot;encounter&quot; in Campaign Rules.
          </p>
        ) : (
          <ul className="encounter-rule-list">
            {activeRules.map((rule) => (
              <li key={rule.id} className="encounter-rule-item">
                <span className="encounter-rule-name">{rule.name}</span>
                {rule.description && (
                  <span className="encounter-rule-desc">{rule.description}</span>
                )}
                <span className="encounter-rule-trigger">{triggerLabel(rule.trigger)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
