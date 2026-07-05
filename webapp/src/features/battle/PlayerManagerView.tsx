import React from 'react';
import PartyXpModal from './components/PartyXpModal';
import PartyLevelModal from './components/PartyLevelModal';
import CombatHeader from './components/CombatHeader';
import PlayerCard from './components/PlayerCard';
import EnemyCard from './components/EnemyCard';
import VttOverlay from './components/VttOverlay';
import AttackResolutionModal from './components/AttackResolutionModal';
import FloatingActionBar from './components/FloatingActionBar';
import EncounterScenePanel from './components/EncounterScenePanel';
import type { IPlayerManagerViewProps } from '../../types/battle';
import { useCompendiumMonsters } from '../../shared/hooks/useCompendiumMonsters';

export default function PlayerManagerView({
  party,
  combat,
  equipment,
  subclasses,
  buffsDatabase,
  battleMode,
  setBattleMode,
  enemies,
  setEnemies,
  minimizedEnemies,
  setMinimizedEnemies,
  library,
  updateLibrary,
  compendiumClasses,
  compendiumSubclasses,
  compendiumRaces,
}: IPlayerManagerViewProps) {
  const players = party.data;
  const enemyList = enemies;
  const { monsters: compendiumMonsters } = useCompendiumMonsters();

  return (
    <div className="player-manager stack">
      <PartyXpModal party={party} />
      <PartyLevelModal party={party} />

      <CombatHeader
        party={party}
        combat={combat}
        data={players}
        enemies={enemyList}
        battleMode={battleMode}
        setBattleMode={setBattleMode}
        minimizedEnemies={minimizedEnemies}
        setMinimizedEnemies={setMinimizedEnemies}
        setEnemies={setEnemies}
      />

      <div className={`battle-arena ${battleMode ? 'active' : ''} ${combat.isVttActive ? 'vtt-open' : ''}`}>
        {battleMode && <EncounterScenePanel combat={combat} />}

        <div className="battle-arena-cols">
        <div className={battleMode ? 'battle-party-col' : ''}>
          {battleMode && (
            <div className="battle-enemy-panel-header">
              <h3 className="battle-col-title" style={{ color: '#60a5fa' }}>⚔️ Party</h3>
            </div>
          )}
          <div
            className={`roster-grid ${battleMode ? 'battle-mode-roster' : 'app-responsive-grid'}`}
          >
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                party={party}
                combat={combat}
                battleMode={battleMode}
                equipment={equipment}
                subclasses={subclasses}
                buffsDatabase={buffsDatabase}
                compendiumClasses={compendiumClasses}
                compendiumSubclasses={compendiumSubclasses}
                compendiumRaces={compendiumRaces}
              />
            ))}
          </div>
        </div>

        {battleMode && (
          <div className="battle-enemy-panel">
            <div className="battle-enemy-panel-header">
              <h3 className="battle-col-title">💀 Enemies</h3>
              <button type="button" className="btn btn-danger small-btn" onClick={combat.addEnemy}> Add Enemy</button>
            </div>

            {enemyList.length === 0 && (
              <div className="empty-state" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.85rem' }}>No enemies yet. Add one!</p>
              </div>
            )}

            <div className="roster-grid battle-mode-roster">
              {enemyList.map((enemy) => (
                <EnemyCard
                  key={enemy.id}
                  enemy={enemy}
                  party={party}
                  combat={combat}
                  battleMode={battleMode}
                  minimizedEnemies={minimizedEnemies}
                  library={library}
                  compendiumMonsters={compendiumMonsters}
                  updateLibrary={updateLibrary}
                  buffsDatabase={buffsDatabase}
                />
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      <VttOverlay combat={combat} battleMode={battleMode} data={players} />
      <AttackResolutionModal
        party={party}
        combat={combat}
        equipment={equipment}
        buffsDatabase={buffsDatabase}
      />
      <FloatingActionBar combat={combat} />
    </div>
  );
}
