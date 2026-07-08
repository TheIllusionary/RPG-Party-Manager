import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

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

  const { triggerTurnEffects } = combat;

  const isAnyPlayerExpanded = data.some((p) => !isPlayerMinimized(p.id));
  const isAnyEnemyExpanded = battleMode
    ? enemies.some((e) => !minimizedEnemies[e.id])
    : false;
  const isAnyExpanded = isAnyPlayerExpanded || isAnyEnemyExpanded;

  const toggleAllCards = () => {
    const newMinPlayers: Record<string, boolean> = {};
    data.forEach((p) => {
      newMinPlayers[p.id] = isAnyExpanded;
    });
    setMinimizedPlayers(newMinPlayers);

    if (battleMode) {
      const newMinEnemies: Record<string, boolean> = {};
      enemies.forEach((e) => {
        newMinEnemies[e.id] = isAnyExpanded;
      });
      setMinimizedEnemies(newMinEnemies);
    }
  };

  return (
    <div className="manager-header global-party-header app-section">
      <div className="header-left stack-sm">
        <h2 className="app-page-title app-page-title--sm">
          {battleMode ? 'Battle' : 'Party Roster'}
        </h2>
        {actionToast && <span className="action-toast">{actionToast}</span>}
      </div>
      <div className="manager-actions app-button-row">
        <button
          className="app-icon-btn"
          type="button"
          onClick={toggleAllCards}
          title={isAnyExpanded ? 'Recolher todos' : 'Expandir todos'}
          aria-label={isAnyExpanded ? 'Recolher todos os cards' : 'Expandir todos os cards'}
        >
          {isAnyExpanded ? (
            <ChevronsDownUp className="icon-sm" />
          ) : (
            <ChevronsUpDown className="icon-sm" />
          )}
        </button>
        {!battleMode && (
          <button
            className="btn btn-secondary party-top-btn"
            type="button"
            onClick={() => setPartyXpModalOpen(true)}
          >
            Party XP
          </button>
        )}
        {!battleMode && (
          <button
            className="btn btn-secondary party-top-btn"
            type="button"
            onClick={openPartyLevelModal}
          >
            Set Party Level
          </button>
        )}
        {!battleMode && (
          <button className="btn btn-primary" type="button" onClick={shortRest}>
            Short Rest
          </button>
        )}
        {!battleMode && (
          <button className="btn btn-primary" type="button" onClick={longRest}>
            Long Rest
          </button>
        )}
        {!battleMode && (
          <button className="btn" type="button" onClick={addPlayer}>
            Add Player
          </button>
        )}

        {battleMode && (
          <button type="button" className="btn btn-secondary" onClick={triggerTurnEffects}>
            Turn
          </button>
        )}
        <button
          type="button"
          className={`btn ${battleMode ? 'btn-secondary' : 'btn-fight'}`}
          onClick={() => {
            setBattleMode((b) => !b);
            if (!battleMode) {
              const newMin = { ...minimizedPlayers };
              data.forEach((p) => {
                if (p.inParty) newMin[p.id] = true;
              });
              setMinimizedPlayers(newMin);
              const newMinEnemies: Record<string, boolean> = {};
              enemies.forEach((e) => {
                newMinEnemies[e.id] = true;
              });
              setMinimizedEnemies(newMinEnemies);
            } else {
              setMinimizedPlayers({});
              setMinimizedEnemies({});
              setEnemies([]);
            }
          }}
        >
          {battleMode ? 'End Fight' : 'Fight!'}
        </button>
      </div>
    </div>
  );
}
