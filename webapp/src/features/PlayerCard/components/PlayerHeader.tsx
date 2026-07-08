import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { IPlayerHeaderProps } from '@/features/PlayerCard/types';
import PendingChoices from '@/features/battle/components/PendingChoices';
import { getAvailableChoices, isChoiceResolved } from '@/features/battle/utils/choiceEngine';
import type { MasterRace, MasterClass, MasterSubrace } from '@/services/compendium/fiveETools/types';
import type { IPlayer } from '@/types';

export default function PlayerHeader({
  player,
  computedPlayer,
  updatePlayer,
  battleMode,
  isTargetSelected,
  toggleTargetSelection,
  spriteState,
  spriteName,
  editingId,
  setEditingId,
  playerEditField,
  playerEditValue,
  focusAndSelectRef,
  setPlayerEditValue,
  commitPlayerEdit,
  cancelPlayerEdit,
  startPlayerEdit,
  getLevelInfo,
  compendiumRaces,
  compendiumClasses,
  compendiumSubclasses,
  ALL_CC_EFFECTS,
  addCc,
  removeCc,
  isPlayerMinimized,
  setMinimizedPlayers,
  calculateEffectiveAC,
  toggleParty,
  removePlayer,
  onOpenCodex,
}: IPlayerHeaderProps) {
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);

  useEffect(() => {
    if (!ccDropdownOpen) return;
    const handleOutsideClick = () => setCcDropdownOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [ccDropdownOpen]);

  return (
    <div className="player-card-header">
      <div className="player-header-left">
        {battleMode && (
          <label className="target-select-wrap" title="Select for bulk actions">
            <input
              type="checkbox"
              className="target-select-checkbox"
              checked={isTargetSelected('player', player.id)}
              onChange={() => toggleTargetSelection('player', player.id)}
              onClick={e => e.stopPropagation()}
            />
          </label>
        )}
        <div className="player-info-container">
          <div className={`player-sprite-container sprite-state-${spriteState}`} title={`State: ${spriteState.toUpperCase()}`}>
            <img src={`./sprites/${spriteName}.png`} alt={player.classType} className="player-sprite-img" />
            {spriteState === 'winded' && <span className="sweat-drop-overlay">💦</span>}
          </div>
          <div className="player-info">
            {editingId === player.id ? (
              <input
                className="input title-input"
                value={player.name}
                onChange={e => updatePlayer(player.id, 'name', e.target.value)}
                onBlur={() => setEditingId(null)}
                autoFocus
              />
            ) : (
              <h3 onClick={() => setEditingId(player.id)}>{player.name}</h3>
            )}
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
              {playerEditField?.id === player.id && playerEditField?.field === 'level' ? (
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="player-inline-edit-input level-inline-input"
                  value={playerEditValue}
                  ref={focusAndSelectRef}
                  autoFocus
                  onChange={e => setPlayerEditValue(e.target.value)}
                  onBlur={() => commitPlayerEdit(player)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitPlayerEdit(player);
                    if (e.key === 'Escape') cancelPlayerEdit();
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className="player-stat-clickable"
                  title="Click to set level (1–20)"
                  onClick={(e) => {
                    e.stopPropagation();
                    startPlayerEdit(player, 'level');
                  }}
                >
                  Lv. {getLevelInfo(player.xp).level}
                </span>
              )}
            </p>
            <div className="player-subtitle">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {compendiumRaces?.find(r => r.entityKey === player.race)?.name || player.race || 'Unknown Race'} {compendiumClasses?.find(c => c.entityKey === player.classType)?.name || player.classType || 'Unknown Class'}
              </span>
            </div>
          </div>
        </div>

        <div className="player-header-left-rows">
          {/* Crowd Control Badges & Add Button */}
          <div className="player-cc-container" onClick={e => e.stopPropagation()}>
            <span className="cc-header-tag">CC</span>
            {(player.cc || []).map(cc => (
              <button
                key={cc}
                className="player-cc-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCc(player.id, cc);
                }}
                title={`Click to cleanse ${cc}`}
              >
                {cc} <span className="cleanse-x">×</span>
              </button>
            ))}
            <div className="player-cc-add-dropdown">
              <button
                className="player-cc-add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setCcDropdownOpen(prev => !prev);
                }}
                title="Add Crowd Control effect"
              >
                +
              </button>
              {ccDropdownOpen && (
                <div className="cc-dropdown-menu">
                  {ALL_CC_EFFECTS.map(effect => {
                    const hasCc = (player.cc || []).includes(effect);
                    return (
                      <button
                        key={effect}
                        disabled={hasCc}
                        onClick={(e) => {
                          e.stopPropagation();
                          addCc(player.id, effect);
                          setCcDropdownOpen(false);
                        }}
                        className="cc-dropdown-item"
                      >
                        {effect}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="card-top-right">
        <button
          type="button"
          className="app-icon-btn"
          title={isPlayerMinimized(computedPlayer.id) ? 'Expandir card' : 'Recolher card'}
          aria-label={isPlayerMinimized(computedPlayer.id) ? 'Expandir card' : 'Recolher card'}
          onClick={() =>
            setMinimizedPlayers((prev) => ({
              ...prev,
              [computedPlayer.id]: !isPlayerMinimized(computedPlayer.id),
            }))
          }
        >
          {isPlayerMinimized(computedPlayer.id) ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
        <div className="armor-class-badge" title={`Armor Class (AC) [Base: ${computedPlayer.ac || 10}]`}>
          🛡️ {calculateEffectiveAC(computedPlayer)}
        </div>
        <div className="player-controls">
          <button
            className="codex-btn party-toggle"
            onClick={onOpenCodex}
            title="Open Codex (Setup & Lore)"
          >
            📖
          </button>
          <button
            className={`party-toggle ${player.inParty ? 'in-party' : 'out-party'}`}
            onClick={() => toggleParty(player.id)}
            title={player.inParty ? "In Active Party" : "Benched"}
          >
            {player.inParty ? '⚔️' : '💤'}
          </button>
          <button className="delete-btn" onClick={() => removePlayer(player.id)}>×</button>
        </div>
      </div>
    </div>
  );
}
