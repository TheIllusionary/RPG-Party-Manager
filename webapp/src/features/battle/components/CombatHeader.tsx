import React from 'react';
import type { ICombatHeaderProps } from '../../../types/battle';

export default function CombatHeader({
  party,
  combat,
  data,
  enemies,
  battleMode,
  setBattleMode,
  minimizedEnemies,
  setMinimizedEnemies,
  setEnemies,
}: ICombatHeaderProps) {
  const {
    actionToast,
    isPlayerMinimized,
    setMinimizedPlayers,
    minimizedPlayers,
    setPartyXpModalOpen,
    openPartyLevelModal,
    shortRest,
    longRest,
    addPlayer,
  } = party;

  const {
    isVttOpen,
    setIsVttOpen,
    triggerTurnEffects,
  } = combat;

  return (
    <div className="manager-header global-party-header">
      <div className="header-left">
        <h2>{battleMode ? '⚔️ Battle' : 'Party Roster'}</h2>
        {actionToast && <span className="action-toast">{actionToast}</span>}
      </div>
      <div className="manager-actions">
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            const isAnyPlayerExpanded = data.some((p) => !isPlayerMinimized(p.id));
            const isAnyEnemyExpanded = battleMode ? enemies.some((e) => !minimizedEnemies[e.id]) : false;
            const isAnyExpanded = isAnyPlayerExpanded || isAnyEnemyExpanded;

            const newMinPlayers: Record<string, boolean> = {};
            data.forEach((p) => { newMinPlayers[p.id] = isAnyExpanded; });
            setMinimizedPlayers(newMinPlayers);

            if (battleMode) {
              const newMinEnemies: Record<string, boolean> = {};
              enemies.forEach((e) => { newMinEnemies[e.id] = isAnyExpanded; });
              setMinimizedEnemies(newMinEnemies);
            }
          }}
          title={(data.some((p) => !isPlayerMinimized(p.id)) || (battleMode && enemies.some((e) => !minimizedEnemies[e.id]))) ? 'Minimize All Cards' : 'Expand All Cards'}
          style={{ fontSize: '1.2rem', paddingBottom: '2px', paddingLeft: '0.75rem', paddingRight: '0.75rem', marginRight: '0.25rem' }}
        >
          {(data.some((p) => !isPlayerMinimized(p.id)) || (battleMode && enemies.some((e) => !minimizedEnemies[e.id]))) ? '－' : '＋'}
        </button>
        {!battleMode && <button className="btn btn-secondary party-top-btn" type="button" onClick={() => setPartyXpModalOpen(true)}>✨ Party XP</button>}
        {!battleMode && <button className="btn btn-secondary party-top-btn" type="button" onClick={openPartyLevelModal}>📊 Set Party Level</button>}
        {!battleMode && <button className="btn btn-primary" type="button" onClick={shortRest}>☕ Short Rest</button>}
        {!battleMode && <button className="btn btn-primary" type="button" onClick={longRest}>🏕️ Long Rest</button>}
        {!battleMode && <button className="btn" type="button" onClick={addPlayer}>+ Add Player</button>}
        {battleMode && (
          <button
            type="button"
            className={`btn ${isVttOpen ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsVttOpen((prev) => !prev)}
            style={{ marginRight: '0.25rem' }}
          >
            {isVttOpen ? '🗺️ Hide VTT' : '🗺️ Show VTT'}
          </button>
        )}
        {battleMode && (
          <button type="button" className="btn btn-secondary" onClick={triggerTurnEffects} style={{ marginRight: '0.25rem' }}>
            ⏳ Turn
          </button>
        )}
        <button
          type="button"
          className={`btn ${battleMode ? 'btn-secondary' : 'btn-fight'}`}
          onClick={() => {
            setBattleMode((b) => !b);
            if (!battleMode) {
              const newMin = { ...minimizedPlayers };
              data.forEach((p) => { if (p.inParty) newMin[p.id] = true; });
              setMinimizedPlayers(newMin);
              const newMinEnemies: Record<string, boolean> = {};
              enemies.forEach((e) => { newMinEnemies[e.id] = true; });
              setMinimizedEnemies(newMinEnemies);
            } else {
              setMinimizedPlayers({});
              setMinimizedEnemies({});
              setEnemies([]);
            }
          }}
        >
          {battleMode ? '🏳️ End Fight' : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1em', height: '1em', display: 'inline', marginRight: '0.3em', verticalAlign: 'middle' }}>
                <path d="M3 3l5 5M16 3l5 5-8 8-5-5z" />
                <path d="M8 16l-5 5M21 21l-5-5" />
              </svg>
              Fight!
            </>
          )}
        </button>
      </div>
    </div>
  );
}
