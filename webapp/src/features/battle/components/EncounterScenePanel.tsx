import React from 'react';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { TRIGGER_FRIENDLY_MAP } from '../../../shared/schema/SchemaResolver';
import type { ICombatState, IPartyState } from '../../../types/battle';
import type { IEnemy } from '../../../types';

function triggerLabel(trigger: string): string {
  return TRIGGER_FRIENDLY_MAP[trigger] ?? trigger;
}

export interface EncounterScenePanelProps {
  combat: ICombatState;
  party: IPartyState;
  enemies: IEnemy[];
  minimizedEnemies: Record<string, boolean>;
  setMinimizedEnemies: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setEnemies: React.Dispatch<React.SetStateAction<IEnemy[]>>;
  battleMode: boolean;
  setBattleMode: React.Dispatch<React.SetStateAction<boolean>>;
  isVttActive: boolean;
  onToggleVtt: () => void;
}

export default function EncounterScenePanel({
  combat,
  party,
  enemies,
  minimizedEnemies,
  setMinimizedEnemies,
  setEnemies,
  battleMode,
  setBattleMode,
  isVttActive,
  onToggleVtt,
}: EncounterScenePanelProps) {
  const {
    getEnemySpriteInfo,
    encounterRules,
    currentTurnIndex,
    advanceEncounterTurn,
    triggerTurnEffects,
    initiativeMode,
    setInitiativeMode,
    customTurnOrder,
    setCustomTurnOrder,
    turnOrder,
    currentTurnActor,
  } = combat;

  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
  const [showInitiativeMenu, setShowInitiativeMenu] = React.useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    const newOrder = [...customTurnOrder];
    const item = newOrder[draggedIdx];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(index, 0, item);
    
    setCustomTurnOrder(newOrder);
    setDraggedIdx(null);
  };

  const handleModeChange = (mode: 'none' | 'group' | 'individual') => {
    setInitiativeMode(mode);
    if (mode === 'group') {
      setCustomTurnOrder(['group-party', 'group-enemies']);
    } else if (mode === 'individual') {
      const pIds = data.filter(p => p.inParty).map(p => p.id);
      const eIds = enemies.map(e => e.id);
      setCustomTurnOrder([...pIds, ...eIds]);
    } else {
      setCustomTurnOrder([]);
    }
    setShowInitiativeMenu(false);
  };

  const scrollToCard = (type: 'player' | 'enemy', id: string) => {
    if (id === 'group-party' || id === 'group-enemies') return;
    const el = document.getElementById(`${type}-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getSpriteForId = (id: string) => {
    if (id === 'group-party') return { sprite: 'default', type: 'player', state: 'normal' };
    if (id === 'group-enemies') return { sprite: 'enemy', type: 'enemy', state: 'normal' };
    
    const p = data.find(x => x.id === id);
    if (p) {
      const info = getPlayerSpriteInfo(p);
      return { sprite: info.spriteName || 'default', type: 'player', state: info.spriteState };
    }
    
    const e = enemies.find(x => x.id === id);
    if (e) {
      const info = getEnemySpriteInfo(e);
      return { sprite: info.spriteName || 'enemy', type: 'enemy', state: info.spriteState };
    }

    return { sprite: 'default', type: 'player', state: 'normal' };
  };

  const {
    getPlayerSpriteInfo,
    data,
    isPlayerMinimized,
    setMinimizedPlayers,
    minimizedPlayers,
    actionToast,
  } = party;

  const isAnyPlayerExpanded = data.some((p) => !isPlayerMinimized(p.id));
  const isAnyEnemyExpanded = enemies.some((e) => !minimizedEnemies[e.id]);
  const isAnyExpanded = isAnyPlayerExpanded || isAnyEnemyExpanded;

  const isLastTurn =
    initiativeMode === 'none' ||
    turnOrder.length === 0 ||
    (currentTurnIndex % turnOrder.length) === turnOrder.length - 1;

  const toggleAllCards = () => {
    const newMinPlayers: Record<string, boolean> = {};
    data.forEach((p) => {
      newMinPlayers[p.id] = isAnyExpanded;
    });
    setMinimizedPlayers(newMinPlayers);

    const newMinEnemies: Record<string, boolean> = {};
    enemies.forEach((e) => {
      newMinEnemies[e.id] = isAnyExpanded;
    });
    setMinimizedEnemies(newMinEnemies);
  };

  const handleEndFight = () => {
    setBattleMode(false);
    setMinimizedPlayers({});
    setMinimizedEnemies({});
    setEnemies([]);
  };

  const activeRules = encounterRules.filter((r) => r.enabled);

  return (
    <aside className="encounter-scene-panel" aria-label="Encounter and scene rules">
      {/* Header Row: Title & Action Toolbar */}
      <div className="encounter-scene-panel__head">
        <div className="encounter-scene-panel__head-left">
          <h3 className="encounter-scene-panel__title">Battle / Encounter</h3>
          {actionToast && (
            <span className="action-toast">
              {actionToast}
            </span>
          )}
        </div>

        <div className="manager-actions app-button-row">
          <button
            className="app-icon-btn"
            type="button"
            onClick={toggleAllCards}
            title={isAnyExpanded ? 'Recolher todos' : 'Expandir todos'}
            aria-label={isAnyExpanded ? 'Recolher todos os cards' : 'Expandir todos os cards'}
            style={{ minHeight: '2rem', height: '2rem', width: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            {isAnyExpanded ? (
              <ChevronsDownUp className="icon-sm" />
            ) : (
              <ChevronsUpDown className="icon-sm" />
            )}
          </button>
          
          <button
            type="button"
            className={`btn ${isVttActive ? 'btn-primary' : 'btn-secondary'}`}
            onClick={onToggleVtt}
            style={{ minHeight: '2rem', height: '2rem', fontSize: '0.8rem', padding: '0 0.75rem' }}
          >
            🗺️ VTT
          </button>
          
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowInitiativeMenu(!showInitiativeMenu)}
              style={{ minHeight: '2rem', height: '2rem', fontSize: '0.8rem', padding: '0 0.75rem' }}
            >
              Initiative
            </button>
            {showInitiativeMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '0.25rem', padding: '0.5rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button className="btn btn-secondary small-btn" onClick={() => handleModeChange('none')}>None</button>
                <button className="btn btn-secondary small-btn" onClick={() => handleModeChange('group')}>Group</button>
                <button className="btn btn-secondary small-btn" onClick={() => handleModeChange('individual')}>Individual</button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleEndFight}
            style={{ minHeight: '2rem', height: '2rem', fontSize: '0.8rem', padding: '0 0.75rem' }}
          >
            End Fight
          </button>
        </div>
      </div>

      {/* Turn Row: CRPG-style Initiative Track & Turn Description */}
      <div className="encounter-scene-panel__turn-row">
        {initiativeMode !== 'none' && customTurnOrder.length > 0 ? (
          <div className="crpg-initiative-container">
            {customTurnOrder.map((id, idx) => {
              const info = getSpriteForId(id);
              const isCurrent = turnOrder.length > 0 && turnOrder[currentTurnIndex % turnOrder.length]?.id === id;
              
              let name = '';
              if (id === 'group-party') name = 'Party';
              else if (id === 'group-enemies') name = 'Enemies';
              else {
                const actor = turnOrder.find(x => x.id === id);
                name = actor ? actor.name : '';
              }

              return (
                <div
                  key={`${id}-${idx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => scrollToCard(info.type as 'player' | 'enemy', id)}
                  className={`crpg-initiative-card ${isCurrent ? 'is-active' : ''}`}
                  title={id === 'group-party' ? 'Party Group' : id === 'group-enemies' ? 'Enemies Group' : 'Click to scroll, drag to reorder'}
                >
                  <div className={`player-sprite-container sprite-state-${info.state}`}>
                    <img src={`./sprites/${info.sprite}.png`} alt={name} className="player-sprite-img" />
                    {info.state === 'winded' && <span className="sweat-drop-overlay">💦</span>}
                  </div>
                  <span className="crpg-initiative-card__name">{name}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="crpg-initiative-spacer" />
        )}

        <div className="encounter-scene-panel__turn-controls">
          {initiativeMode !== 'none' && (currentTurnActor ? (
            <span className="encounter-turn-label" title="Current actor in turn queue">
              Turn: <strong>{currentTurnActor.name}</strong>
              <span className="encounter-turn-index">
                ({(currentTurnIndex % Math.max(1, turnOrder.length)) + 1}/{turnOrder.length})
              </span>
            </span>
          ) : (
            <span className="encounter-turn-label encounter-turn-label--empty">No actors in turn order</span>
          ))}
          
          <button
            type="button"
            className={`encounter-next-turn-btn ${isLastTurn ? 'is-end-turn' : ''}`}
            onClick={advanceEncounterTurn}
            disabled={initiativeMode !== 'none' && turnOrder.length === 0}
          >
            {isLastTurn ? 'End Turn' : 'Next Turn'}
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

