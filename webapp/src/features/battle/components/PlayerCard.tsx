import React, { useState, useEffect } from 'react';
import { DAMAGE_TYPES } from '../utils/constants';
import {
  getSpellCostPreview,
  calculateEffectiveAC,
  HP_TO_MANA_HP_COST,
  HP_TO_MANA_GAIN,
  MANA_TO_HP_MANA_COST,
  MANA_TO_HP_GAIN,
} from '../../../shared/utils/combatUtils';
import type { IBuff, IEquipment, IPlayer, ISubclass } from '../../../types';

interface PlayerCardProps {
  player: IPlayer;
  party: any; // TODO: fix any — usePartyState return type
  combat: any; // TODO: fix any — useCombatState return type
  battleMode: boolean;
  equipment: IEquipment;
  subclasses: ISubclass[];
  buffsDatabase: IBuff[];
}

export default function PlayerCard({ player, party, combat, battleMode, equipment, subclasses, buffsDatabase }: PlayerCardProps) {
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);

  useEffect(() => {
    if (!ccDropdownOpen) return;
    const handleOutsideClick = () => setCcDropdownOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [ccDropdownOpen]);

  const {
    focusAndSelectRef,
    editingId,
    setEditingId,
    inlineCastPlayerId,
    setInlineCastPlayerId,
    playerEditField,
    playerEditValue,
    setPlayerEditValue,
    buffInputPlayerId,
    setBuffInputPlayerId,
    buffSearchText,
    setBuffSearchText,
    expandedPlayers,
    setExpandedPlayers,
    isPlayerMinimized,
    xpModalId,
    setXpModalId,
    xpModalType,
    setXpModalType,
    xpInputValue,
    setXpInputValue,
    getPlayerSubclass,
    playerUsesVampire,
    handleCastSpell,
    handleHpToMana,
    handleManaToHp,
    getEquipmentBonus,
    effectiveStat,
    calculateMaxHP,
    calculateMaxMana,
    getPlayerBuffsWithConfig,
    handleRemoveBuffFromTop,
    handleToggleBuff,
    getPlayerSpriteInfo,
    updatePlayer,
    startPlayerEdit,
    commitPlayerEdit,
    cancelPlayerEdit,
    addCc,
    removeCc,
    getProficiencyBonus,
    toggleSaveProficiency,
    formatModifier,
    getLevelInfo,
    calculateModifier,
    toggleParty,
    removePlayer,
    calculateColor,
    calculateSkillBonus,
    toggleSkill,
    dndSkills,
    statsList,
    ALL_CC_EFFECTS,
    inlineDeltaEdit,
    inlineDeltaValue,
    setInlineDeltaValue,
    startInlineDelta,
    cancelInlineDelta,
    commitInlineDelta,
    isTargetSelected,
    toggleTargetSelection,
    startPlayerAttackTargeting
  } = { ...party, ...combat };

  const { spriteName, spriteState } = getPlayerSpriteInfo(player);
  const ultPercent = Math.min(100, (player.ultCurrent / player.ultMax) * 100);

  return (

                                <div key={player.id} data-player-id={player.id} className={`glass-panel integrated-player-card ${!player.inParty ? 'inactive' : ''} ${isPlayerMinimized(player.id) ? 'minimized-card' : ''} ${isTargetSelected('player', player.id) ? 'target-selected' : ''}`}>
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
                                                        <select
                                                            className="input inline-input class-input class-dropdown"
                                                            value={player.subclassId || ''}
                                                            onChange={e => updatePlayer(player.id, 'subclassId', e.target.value || null)}
                                                            title="Equipped subclass"
                                                        >
                                                            <option value="">No Subclass</option>
                                                            {subclasses.map(sub => (
                                                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            className="input inline-input class-input class-dropdown"
                                                            value={player.classType || 'Default'}
                                                            onChange={e => updatePlayer(player.id, 'classType', e.target.value)}
                                                        >
                                                            {['Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Default'].map(cls => (
                                                                <option key={cls} value={cls}>{cls}</option>
                                                            ))}
                                                        </select>

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

                                                {/* Buffs & Debuffs Row */}
                                                <div className="player-buff-container" onClick={e => e.stopPropagation()}>
                                                    <span className="buff-header-tag">Buff/Debuff</span>
                                                    {(() => {
                                                        const allBuffs = getPlayerBuffsWithConfig(player, equipment);
                                                        const hasManyBuffs = allBuffs.length >= 5;
                                                        const isExpanded = !!expandedPlayers[player.id];
                                                        const shouldCollapse = hasManyBuffs && !isExpanded;

                                                        if (shouldCollapse) {
                                                            return (
                                                                <div
                                                                    className="player-buff-badge buffs-expand-badge"
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        background: 'rgba(59, 130, 246, 0.2)',
                                                                        borderColor: 'rgba(59, 130, 246, 0.4)',
                                                                        color: 'var(--text-primary)'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedPlayers(prev => ({ ...prev, [player.id]: true }));
                                                                    }}
                                                                    title="Click to expand buffs"
                                                                >
                                                                    (Buffs +)
                                                                </div>
                                                            );
                                                        }

                                                        return allBuffs.map((buff, idx) => {
                                                            const isToggle = buff.config?.type === 'toggle';
                                                            const isFixed = buff.config?.type === 'fixed' || !buff.config;
                                                            const isTurn = buff.config?.type === 'turn';
                                                            const isSpent = (player.spentBuffs || {})[buff.name] === true;
                                                            const isToggledActive = (player.buffStates || {})[buff.name] !== false;
                                                            const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;

                                                            let badgeClass = "player-buff-badge";
                                                            if (isSpent) badgeClass += " buff-spent";
                                                            else if (isToggle && !isActive) badgeClass += " buff-inactive";

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={badgeClass}
                                                                    title={(() => {
                                                                        const desc = buff.config?.description || '';
                                                                        const mainText = isSpent ? `${buff.name} (Spent - Rest required)` : `Source: ${buff.sourceName} (${buff.slotLabel || 'Character'}). Click to toggle/use.`;
                                                                        return desc ? `${desc}\n${mainText}` : mainText;
                                                                    })()}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleToggleBuff(player, buff, true);
                                                                    }}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    {buff.name} {isToggle && (isActive ? "🟢" : "🔴")} {isSpent && "💤"}
                                                                    <button
                                                                        type="button"
                                                                        className="buff-remove-x"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveBuffFromTop(player, buff);
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                    <div className="player-buff-add-container">
                                                        {buffInputPlayerId === player.id ? (
                                                            <div className="buff-inline-search-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search buff..."
                                                                    className="input buff-inline-input"
                                                                    value={buffSearchText}
                                                                    onChange={(e) => setBuffSearchText(e.target.value)}
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Escape') {
                                                                            setBuffInputPlayerId(null);
                                                                            setBuffSearchText('');
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="buff-inline-cancel-btn"
                                                                    onClick={() => {
                                                                        setBuffInputPlayerId(null);
                                                                        setBuffSearchText('');
                                                                    }}
                                                                >
                                                                    ×
                                                                </button>
                                                                <div className="cc-dropdown-menu" style={{ left: 0, right: 'auto', width: '200px' }}>
                                                                    {buffsDatabase
                                                                        .filter(b => {
                                                                            const isAlreadyActive = (player.buffs || []).includes(b.name);
                                                                            const matchesSearch = b.name.toLowerCase().includes(buffSearchText.toLowerCase());
                                                                            return !isAlreadyActive && matchesSearch;
                                                                        })
                                                                        .map(b => (
                                                                            <button
                                                                                key={b.id}
                                                                                type="button"
                                                                                className="cc-dropdown-item"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const currentBuffs = player.buffs || [];
                                                                                    if (!currentBuffs.includes(b.name)) {
                                                                                        updatePlayer(player.id, 'buffs', [...currentBuffs, b.name]);
                                                                                    }
                                                                                    setBuffInputPlayerId(null);
                                                                                    setBuffSearchText('');
                                                                                }}
                                                                            >
                                                                                {b.name}
                                                                            </button>
                                                                        ))}
                                                                    {buffsDatabase.filter(b => !(player.buffs || []).includes(b.name) && b.name.toLowerCase().includes(buffSearchText.toLowerCase())).length === 0 && (
                                                                        <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                            No matching buffs
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {(() => {
                                                                    const allBuffs = getPlayerBuffsWithConfig(player, equipment);
                                                                    const hasManyBuffs = allBuffs.length >= 5;
                                                                    const isExpanded = !!expandedPlayers[player.id];
                                                                    if (hasManyBuffs && isExpanded) {
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                className="player-buff-collapse-btn"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setExpandedPlayers(prev => ({ ...prev, [player.id]: false }));
                                                                                }}
                                                                                title="Collapse Buffs"
                                                                                style={{ marginRight: '0.25rem' }}
                                                                            >
                                                                                --
                                                                            </button>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                                <button
                                                                    className="player-buff-add-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setBuffInputPlayerId(player.id);
                                                                        setBuffSearchText('');
                                                                    }}
                                                                    title="Add Buff/Debuff"
                                                                >
                                                                    +
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-top-right">
                                            <div className="armor-class-badge" title={`Armor Class (AC) [Base: ${player.ac || 10}]`}>
                                                🛡️ {calculateEffectiveAC(player, equipment)}
                                            </div>
                                            <div className="player-controls">
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



                                    <div className="stats-grid">
                                        <div className={`stat-block ${player.hpCurrent <= 0 ? 'ko-state' : ''}`}>
                                            <div className="stat-label">
                                                <span>{player.hpCurrent <= 0 ? 'STATUS: K.O.' : (playerUsesVampire(player) ? 'HP (Blood)' : 'HP')}</span>
                                                <span className="stat-value-row">
                                                    {inlineDeltaEdit?.type === 'player' && inlineDeltaEdit?.id === player.id && inlineDeltaEdit?.field === 'hp' ? (
                                                        <input
                                                            type="number"
                                                            className="inline-delta-input"
                                                            value={inlineDeltaValue}
                                                            ref={focusAndSelectRef}
                                                            placeholder="+dmg / -heal"
                                                            onChange={e => setInlineDeltaValue(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') commitInlineDelta();
                                                                if (e.key === 'Escape') cancelInlineDelta();
                                                            }}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="player-stat-clickable inline-stat-delta"
                                                            title="Click: +damage / -heal"
                                                            onClick={() => startInlineDelta('player', player.id, 'hp')}
                                                        >{player.hpCurrent}</span>
                                                    )}
                                                    {player.hpTemp > 0 && (
                                                        <span className="temp-hp-label" style={{ color: '#60a5fa', marginLeft: '0.25rem', fontWeight: 'bold' }}>
                                                            (+{player.hpTemp})
                                                        </span>
                                                    )}
                                                    &nbsp;/ {calculateMaxHP(player)}
                                                    {!playerUsesVampire(player) && (
                                                        <span className="resource-swap-btns">
                                                            <button type="button" className="resource-swap-btn" title={`Sacrifice ${HP_TO_MANA_HP_COST} HP → ${HP_TO_MANA_GAIN} Mana (no Limit Break)`} onClick={() => handleHpToMana(player.id)}>♥→✦</button>
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="stat-bar-bg">
                                                <div
                                                    className="stat-bar-fill"
                                                    style={{
                                                        width: `${Math.max(0, (player.hpCurrent / calculateMaxHP(player)) * 100)}%`,
                                                        background: player.hpCurrent <= 0 ? '#dc2626' : calculateColor(player.hpCurrent, calculateMaxHP(player))
                                                    }}
                                                />
                                                {player.hpTemp > 0 && (
                                                    <div
                                                        className="temp-hp-fill"
                                                        style={{
                                                            width: `${Math.min(100, (player.hpTemp / calculateMaxHP(player)) * 100)}%`
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {!playerUsesVampire(player) && (
                                            <div className={`stat-block ${player.manaCurrent < 0 ? 'exhausted-state' : ''}`}>
                                                <div className="stat-label">
                                                    <span>{player.manaCurrent < 0 ? 'EXHAUSTED' : 'Mana'}</span>
                                                    <span className="stat-value-row">
                                                        {inlineDeltaEdit?.type === 'player' && inlineDeltaEdit?.id === player.id && inlineDeltaEdit?.field === 'mana' ? (
                                                            <input
                                                                type="number"
                                                                className="inline-delta-input"
                                                                value={inlineDeltaValue}
                                                                ref={focusAndSelectRef}
                                                                placeholder="+drain / -restore"
                                                                onChange={e => setInlineDeltaValue(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') commitInlineDelta();
                                                                    if (e.key === 'Escape') cancelInlineDelta();
                                                                }}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <span
                                                                className="player-stat-clickable inline-stat-delta"
                                                                title="Click: +drain mana / -restore mana"
                                                                onClick={() => startInlineDelta('player', player.id, 'mana')}
                                                            >{player.manaCurrent}</span>
                                                        )}
                                                        &nbsp;/ {calculateMaxMana(player)}
                                                        <span className="resource-swap-btns">
                                                            <button type="button" className="resource-swap-btn" title={`Spend ${MANA_TO_HP_MANA_COST} Mana → ${MANA_TO_HP_GAIN} HP`} onClick={() => handleManaToHp(player.id)}>✦→♥</button>
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="stat-bar-bg">
                                                    <div
                                                        className="stat-bar-fill mana-fill"
                                                        style={{ width: `${Math.max(0, (player.manaCurrent / calculateMaxMana(player)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {playerUsesVampire(player) && (
                                            <div className="stat-block vampire-mana-merged" title="Blood Magic — mana pool merged into HP">
                                                <div className="stat-label">
                                                    <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Blood Magic</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mana merged into HP</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className={`stat-block ${player.ultCurrent >= player.ultMax ? 'limit-ready-state' : ''}`}>
                                            <div className="stat-label">
                                                <span>{player.ultCurrent >= player.ultMax ? 'LIMIT BREAK READY' : 'Ultimate'}</span>
                                                <span>
                                                    {playerEditField?.id === player.id && playerEditField?.field === 'ultCurrent' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            <input
                                                                type="number"
                                                                className="player-inline-edit-input"
                                                                value={playerEditValue}
                                                                ref={focusAndSelectRef}
                                                                onChange={e => setPlayerEditValue(e.target.value)}
                                                                onBlur={() => commitPlayerEdit(player)}
                                                                onKeyDown={e => { if (e.key === 'Enter') commitPlayerEdit(player); if (e.key === 'Escape') cancelPlayerEdit(); }}
                                                                onClick={e => e.stopPropagation()}
                                                            />%
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="player-stat-clickable"
                                                            title="Double-click to edit Ultimate"
                                                            onDoubleClick={() => startPlayerEdit(player, 'ultCurrent')}
                                                        >{Math.floor((player.ultCurrent / player.ultMax) * 100)}%</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="stat-bar-bg ult-bg">
                                                <div
                                                    className={`stat-bar-fill ult-fill ${player.ultCurrent >= player.ultMax ? 'limit-ready' : ''}`}
                                                    style={{ width: `${ultPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="stat-controls hp-layout">
                                            {inlineCastPlayerId === player.id ? (
                                                <div className="inline-cast-picker">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
                                                        const preview = getSpellCostPreview(player, lvl, getPlayerSubclass(player));
                                                        return (
                                                            <button
                                                                key={lvl}
                                                                type="button"
                                                                className="cast-level-btn"
                                                                title={`Cast level ${lvl} (−${preview.cost} ${preview.resource.toUpperCase()})`}
                                                                onClick={() => handleCastSpell(player.id, lvl)}
                                                            >
                                                                <span className="cast-level-num">{lvl}</span>
                                                                <span className="cast-level-cost">−{preview.cost}</span>
                                                            </button>
                                                        );
                                                    })}
                                                    <button type="button" className="cast-cancel-btn" onClick={() => setInlineCastPlayerId(null)}>✕</button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="cast-spell-btn"
                                                    onClick={() => {
                                                        setInlineCastPlayerId(player.id);
                                                        cancelInlineDelta();
                                                    }}
                                                    title={playerUsesVampire(player) ? 'Cast spell (costs HP)' : 'Cast spell (costs Mana)'}
                                                >
                                                    ✦ Cast
                                                </button>
                                            )}
                                            {(player.recentSpells || []).length > 0 && (
                                                <span className="fatigue-badge" title={`Fatigue tracker: ${(player.recentSpells || []).join(', ')}`}>
                                                    Fadiga [{player.recentSpells.length}]
                                                </span>
                                            )}
                                            <button
                                                className="ult-use-btn"
                                                onClick={() => updatePlayer(player.id, 'ultCurrent', 0)}
                                                disabled={player.ultCurrent < player.ultMax}
                                                style={{ opacity: player.ultCurrent < player.ultMax ? 0.5 : 1 }}
                                            >
                                                Limit Break
                                            </button>
                                        </div>
                                    </div>

                                    {!isPlayerMinimized(player.id) && (
                                        <div className="player-details-extended">
                                            {(() => {
                                                const sub = getPlayerSubclass(player);
                                                if (!sub) return null;
                                                return (
                                                    <div className="subclass-player-section glass-panel" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                                            Subclass: {sub.name}
                                                        </div>
                                                        {(sub.passiveTraits || []).length > 0 && (
                                                            <div style={{ marginBottom: '0.65rem' }}>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Passive Traits</div>
                                                                {(sub.passiveTraits || []).map((trait, idx) => (
                                                                    <div key={idx} style={{ marginBottom: '0.35rem' }}>
                                                                        <strong style={{ fontSize: '0.85rem' }}>{trait.name}</strong>
                                                                        {trait.description && (
                                                                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{trait.description}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {(sub.abilities || []).length > 0 && (
                                                            <div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Subclass Abilities</div>
                                                                <div className="enemy-skills-buttons-grid" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                    {(sub.abilities || []).map(atk => (
                                                                        <button
                                                                            key={atk.id || atk.name}
                                                                            type="button"
                                                                            className="btn btn-secondary enemy-skill-roll-btn"
                                                                            onClick={() => startPlayerAttackTargeting(player, atk)}
                                                                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', margin: 0 }}
                                                                        >
                                                                            {atk.name}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            {!battleMode && (
                                                <div className="stat-block mt-2">
                                                    <div className="stat-label">
                                                        <span>EXP to Level {getLevelInfo(player.xp).level + 1}</span>
                                                        <span>{player.xp} / {getLevelInfo(player.xp).nextLevelXp || "Max"}</span>
                                                    </div>
                                                    <div className="stat-bar-bg xp-bg">
                                                        <div
                                                            className="stat-bar-fill xp-fill"
                                                            style={{
                                                                width: `${getLevelInfo(player.xp).nextLevelXp ? ((player.xp - getLevelInfo(player.xp).currentLevelXp) / (getLevelInfo(player.xp).nextLevelXp - getLevelInfo(player.xp).currentLevelXp)) * 100 : 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="stat-controls exp-controls">
                                                        <button onClick={() => {
                                                            setXpModalId(player.id);
                                                            setXpModalType('flat');
                                                            setXpInputValue('');
                                                        }}>Give XP</button>
                                                        <button onClick={() => {
                                                            setXpModalId(player.id);
                                                            setXpModalType('pct');
                                                            setXpInputValue('');
                                                        }}>Give XP %</button>
                                                        <button className="btn-success" onClick={() => {
                                                            const info = getLevelInfo(player.xp);
                                                            if (info.nextLevelXp) updatePlayer(player.id, 'xp', info.nextLevelXp);
                                                        }}>Level Up</button>
                                                    </div>

                                                    {xpModalId === player.id && (
                                                        <div className="damage-heal-modal" style={{ marginTop: '0.25rem' }}>
                                                            <input
                                                                type="number"
                                                                className="input dh-input"
                                                                value={xpInputValue}
                                                                onChange={e => setXpInputValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        const val = parseInt(xpInputValue);
                                                                        if (isNaN(val)) { setXpModalId(null); return; }
                                                                        if (xpModalType === 'flat') {
                                                                            updatePlayer(player.id, 'xp', Math.max(0, player.xp + val));
                                                                        } else {
                                                                            const info = getLevelInfo(player.xp);
                                                                            if (info.nextLevelXp) {
                                                                                const req = info.nextLevelXp - info.currentLevelXp;
                                                                                updatePlayer(player.id, 'xp', Math.max(0, player.xp + Math.floor(req * (val / 100))));
                                                                            }
                                                                        }
                                                                        setXpModalId(null);
                                                                        setXpInputValue('');
                                                                    }
                                                                    if (e.key === 'Escape') { setXpModalId(null); setXpInputValue(''); }
                                                                }}
                                                                placeholder={xpModalType === 'flat' ? 'Flat XP (neg to remove)' : 'XP % (e.g. 10, -10)'}
                                                                autoFocus
                                                            />
                                                            <button className="btn btn-primary small-btn" onClick={() => {
                                                                const val = parseInt(xpInputValue);
                                                                if (isNaN(val)) { setXpModalId(null); return; }
                                                                if (xpModalType === 'flat') {
                                                                    updatePlayer(player.id, 'xp', Math.max(0, player.xp + val));
                                                                } else {
                                                                    const info = getLevelInfo(player.xp);
                                                                    if (info.nextLevelXp) {
                                                                        const req = info.nextLevelXp - info.currentLevelXp;
                                                                        updatePlayer(player.id, 'xp', Math.max(0, player.xp + Math.floor(req * (val / 100))));
                                                                    }
                                                                }
                                                                setXpModalId(null);
                                                                setXpInputValue('');
                                                            }}>Apply</button>
                                                            <button className="btn small-btn" onClick={() => { setXpModalId(null); setXpInputValue(''); }}>Cancel</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="stats-skills-tab">
                                                {statsList.map(stat => {
                                                    const bonus = getEquipmentBonus(player.id, stat);
                                                    const eff = effectiveStat(player, stat);
                                                    const relatedSkills = dndSkills.filter(s => s.stat === stat);
                                                    return (
                                                        <div key={stat} className="stat-group">
                                                            <div className="stat-group-header">
                                                                <div
                                                                    className={`skill-checkbox save-checkbox ${player.saves?.[stat] ? 'proficient' : ''}`}
                                                                    onClick={() => toggleSaveProficiency(player.id, stat)}
                                                                    title="Toggle Save Proficiency"
                                                                >
                                                                    {player.saves?.[stat] && <span className="check-mark">●</span>}
                                                                </div>
                                                                <span className="stat-name">{stat.toUpperCase()}</span>
                                                                <input
                                                                    type="number"
                                                                    className="stat-score-input"
                                                                    value={player[stat] || 10}
                                                                    onChange={e => updatePlayer(player.id, stat, parseInt(e.target.value) || 0)}
                                                                />
                                                                <span className="stat-mod-badge">{formatModifier(calculateModifier(eff))}</span>
                                                                {bonus !== 0 && (
                                                                    <span className="stat-equip-bonus" style={{ color: bonus > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                                        {bonus > 0 ? '+' : ''}{bonus} equip
                                                                    </span>
                                                                )}
                                                                <div className="stat-save-display">
                                                                    <span className="stat-save-display-label">Save</span>
                                                                    <span style={{ color: player.saves?.[stat] ? 'var(--primary)' : 'var(--text-primary)' }}>
                                                                        {formatModifier(calculateModifier(eff) + (player.saves?.[stat] ? getProficiencyBonus(player) : 0))}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {relatedSkills.length > 0 && (
                                                                <div className="stat-group-skills">
                                                                    {relatedSkills.map(skill => {
                                                                        const skillBonus = calculateSkillBonus(player, skill.stat, skill.name);
                                                                        const isProficient = player.skills && player.skills[skill.name];
                                                                        return (
                                                                            <div key={skill.name} className={`skill-row ${isProficient ? 'proficient' : ''}`} onClick={() => toggleSkill(player.id, skill.name)}>
                                                                                <div className="skill-checkbox">
                                                                                    {isProficient && <span className="check-mark">●</span>}
                                                                                </div>
                                                                                <div className="skill-bonus">
                                                                                    {skillBonus >= 0 ? '+' : ''}{skillBonus}
                                                                                </div>
                                                                                <div className="skill-name">{skill.name}</div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                <div className="rp-field full-width stats-skills-features">
                                                    <label>Features & Traits</label>
                                                    <textarea
                                                        className="input rp-textarea mini-textarea"
                                                        value={player.features || ''}
                                                        onChange={e => updatePlayer(player.id, 'features', e.target.value)}
                                                        placeholder="List notable feats, darkvision..."
                                                    />
                                                </div>

                                                {/* Resistances & Vulnerabilities Editor */}
                                                <div className="rp-field full-width player-resistances-section">
                                                    <label>Resistances & Vulnerabilities</label>
                                                    <div className="damage-mods-container">
                                                        {/* Resistances */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label res-lbl">Resistances (1/2 dmg)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.resistances || []).map(r => (
                                                                    <span key={r} className="damage-pill pill-resistance">
                                                                        {r}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.resistances || []).filter(x => x !== r);
                                                                            updatePlayer(player.id, 'resistances', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.resistances || []).includes(val)) {
                                                                            const updated = [...(player.resistances || []), val];
                                                                            updatePlayer(player.id, 'resistances', updated);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {DAMAGE_TYPES.filter(t => !(player.resistances || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Immunities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label imm-lbl">Immunities (0 dmg)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.immunities || []).map(i => (
                                                                    <span key={i} className="damage-pill pill-immunity">
                                                                        {i}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.immunities || []).filter(x => x !== i);
                                                                            updatePlayer(player.id, 'immunities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.immunities || []).includes(val)) {
                                                                            const updated = [...(player.immunities || []), val];
                                                                            updatePlayer(player.id, 'immunities', updated);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {DAMAGE_TYPES.filter(t => !(player.immunities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Vulnerabilities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label vul-lbl">Vulnerabilities (2x dmg)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.vulnerabilities || []).map(v => (
                                                                    <span key={v} className="damage-pill pill-vulnerability">
                                                                        {v}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.vulnerabilities || []).filter(x => x !== v);
                                                                            updatePlayer(player.id, 'vulnerabilities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.vulnerabilities || []).includes(val)) {
                                                                            const updated = [...(player.vulnerabilities || []), val];
                                                                            updatePlayer(player.id, 'vulnerabilities', updated);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {DAMAGE_TYPES.filter(t => !(player.vulnerabilities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* CC Resistances & Vulnerabilities Editor */}
                                                <div className="rp-field full-width player-resistances-section">
                                                    <label>CC Resistances &amp; Vulnerabilities</label>
                                                    <div className="damage-mods-container">
                                                        {/* CC Resistances */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label res-lbl">CC Resistances (adv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccResistances || []).map(r => (
                                                                    <span key={r} className="damage-pill pill-resistance">
                                                                        {r}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccResistances || []).filter(x => x !== r);
                                                                            updatePlayer(player.id, 'ccResistances', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccResistances || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccResistances', [...(player.ccResistances || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccResistances || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Immunities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label imm-lbl">CC Immunities (cannot be affected)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccImmunities || []).map(i => (
                                                                    <span key={i} className="damage-pill pill-immunity">
                                                                        {i}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccImmunities || []).filter(x => x !== i);
                                                                            updatePlayer(player.id, 'ccImmunities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccImmunities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccImmunities', [...(player.ccImmunities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccImmunities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Vulnerabilities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label vul-lbl">CC Vulnerabilities (disadv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccVulnerabilities || []).map(v => (
                                                                    <span key={v} className="damage-pill pill-vulnerability">
                                                                        {v}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccVulnerabilities || []).filter(x => x !== v);
                                                                            updatePlayer(player.id, 'ccVulnerabilities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccVulnerabilities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccVulnerabilities', [...(player.ccVulnerabilities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccVulnerabilities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Buffs & Debuffs Section */}
                                                <div className="rp-field full-width player-buffs-section">
                                                    <label>Buffs &amp; Debuffs (Character Level)</label>
                                                    <div className="buffs-editor-container">
                                                        <div className="buffs-editor-pills">
                                                            {(player.buffs || []).map(b => (
                                                                <span key={b} className="buff-pill">
                                                                    {b}
                                                                    <button
                                                                        type="button"
                                                                        className="pill-remove-btn"
                                                                        onClick={() => {
                                                                            const updated = (player.buffs || []).filter(x => x !== b);
                                                                            updatePlayer(player.id, 'buffs', updated);
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <select
                                                            className="input buff-add-input"
                                                            value=""
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    const current = player.buffs || [];
                                                                    if (!current.includes(val)) {
                                                                        updatePlayer(player.id, 'buffs', [...current, val]);
                                                                    }
                                                                }
                                                            }}
                                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.4rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            <option value="">+ Add Buff/Debuff...</option>
                                                            {buffsDatabase
                                                                .filter(b => !(player.buffs || []).includes(b.name))
                                                                .map(b => (
                                                                    <option key={b.id} value={b.name}>{b.name}</option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="combat-tab-content integrated-combat">
                                                <div className="combat-stats-row mini-combat-row">
                                                    <div className="combat-stat-box">
                                                        <label>Base AC</label>
                                                        <input
                                                            type="number"
                                                            className="input combat-input"
                                                            value={player.ac}
                                                            onChange={e => updatePlayer(player.id, 'ac', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <div className="combat-stat-box">
                                                        <label>Base HP</label>
                                                        <input
                                                            type="number"
                                                            className="input combat-input"
                                                            value={player.hpBase}
                                                            onChange={e => updatePlayer(player.id, 'hpBase', Math.max(1, parseInt(e.target.value) || 1))}
                                                        />
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                                                            +{calculateModifier(player.con) * getLevelInfo(player.xp).level} CON = {calculateMaxHP(player)} Max HP
                                                        </div>
                                                    </div>
                                                    <div className="combat-stat-box">
                                                        <label>Resource Trait</label>
                                                        <select
                                                            className="input combat-input"
                                                            value={player.resourceTrait || 'standard'}
                                                            onChange={e => updatePlayer(player.id, 'resourceTrait', e.target.value)}
                                                        >
                                                            <option value="standard">Standard</option>
                                                            <option value="vampire">Blood Magic (Vampire)</option>
                                                        </select>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {playerUsesVampire(player) ? 'Mana → HP pool' : 'HP ↔ Mana conversion'}
                                                        </div>
                                                    </div>
                                                    {!playerUsesVampire(player) && (
                                                        <>
                                                            <div className="combat-stat-box">
                                                                <label>Mana Mod</label>
                                                                <input
                                                                    type="number"
                                                                    className="input combat-input"
                                                                    value={player.manaModifier || 0}
                                                                    onChange={e => updatePlayer(player.id, 'manaModifier', parseInt(e.target.value) || 0)}
                                                                    onWheel={e => {
                                                                        e.preventDefault();
                                                                        updatePlayer(player.id, 'manaModifier', (player.manaModifier || 0) + Math.sign(e.deltaY) * -1);
                                                                    }}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'ArrowUp') { e.preventDefault(); updatePlayer(player.id, 'manaModifier', (player.manaModifier || 0) + 1); }
                                                                        if (e.key === 'ArrowDown') { e.preventDefault(); updatePlayer(player.id, 'manaModifier', (player.manaModifier || 0) - 1); }
                                                                    }}
                                                                />
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scroll to adjust</div>
                                                            </div>
                                                            <div className="combat-stat-box">
                                                                <label>Max Mana</label>
                                                                <div className="combat-input calculated-stat">{calculateMaxMana(player)}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto Calc.</div>
                                                            </div>
                                                        </>
                                                    )}
                                                    {playerUsesVampire(player) && (
                                                        <div className="combat-stat-box">
                                                            <label>Merged Mana Bonus</label>
                                                            <div className="combat-input calculated-stat">+{calculateMaxMana(player)} HP</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>100% mana → max HP</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* CC Resistances & Vulnerabilities Editor */}
                                                <div className="rp-field full-width player-resistances-section">
                                                    <label>CC Resistances &amp; Vulnerabilities</label>
                                                    <div className="damage-mods-container">
                                                        {/* CC Resistances */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label res-lbl">CC Resistances (adv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccResistances || []).map(r => (
                                                                    <span key={r} className="damage-pill pill-resistance">
                                                                        {r}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccResistances || []).filter(x => x !== r);
                                                                            updatePlayer(player.id, 'ccResistances', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccResistances || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccResistances', [...(player.ccResistances || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccResistances || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Immunities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label imm-lbl">CC Immunities (cannot be affected)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccImmunities || []).map(i => (
                                                                    <span key={i} className="damage-pill pill-immunity">
                                                                        {i}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccImmunities || []).filter(x => x !== i);
                                                                            updatePlayer(player.id, 'ccImmunities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccImmunities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccImmunities', [...(player.ccImmunities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccImmunities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Vulnerabilities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label vul-lbl">CC Vulnerabilities (disadv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccVulnerabilities || []).map(v => (
                                                                    <span key={v} className="damage-pill pill-vulnerability">
                                                                        {v}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccVulnerabilities || []).filter(x => x !== v);
                                                                            updatePlayer(player.id, 'ccVulnerabilities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccVulnerabilities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccVulnerabilities', [...(player.ccVulnerabilities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccVulnerabilities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="starve-row" style={{ marginTop: '0.5rem' }}>
                                                    <div className="starve-control" title="MP Starve: Each stack increases spell costs by 100%. Adjust manually.">
                                                        <button
                                                            className="starve-adj-btn"
                                                            onClick={() => updatePlayer(player.id, 'manaExhaustion', Math.max(0, (player.manaExhaustion || 0) - 1))}
                                                        >－</button>
                                                        <span className={`starve-label ${player.manaExhaustion > 0 ? 'active' : ''}`}>
                                                            Starve [{player.manaExhaustion || 0}]
                                                        </span>
                                                        <button
                                                            className="starve-adj-btn"
                                                            onClick={() => updatePlayer(player.id, 'manaExhaustion', (player.manaExhaustion || 0) + 1)}
                                                        >＋</button>
                                                    </div>
                                                </div>

                                                {/* CC Resistances & Vulnerabilities Editor */}
                                                <div className="rp-field full-width player-resistances-section">
                                                    <label>CC Resistances &amp; Vulnerabilities</label>
                                                    <div className="damage-mods-container">
                                                        {/* CC Resistances */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label res-lbl">CC Resistances (adv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccResistances || []).map(r => (
                                                                    <span key={r} className="damage-pill pill-resistance">
                                                                        {r}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccResistances || []).filter(x => x !== r);
                                                                            updatePlayer(player.id, 'ccResistances', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccResistances || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccResistances', [...(player.ccResistances || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccResistances || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Immunities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label imm-lbl">CC Immunities (cannot be affected)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccImmunities || []).map(i => (
                                                                    <span key={i} className="damage-pill pill-immunity">
                                                                        {i}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccImmunities || []).filter(x => x !== i);
                                                                            updatePlayer(player.id, 'ccImmunities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccImmunities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccImmunities', [...(player.ccImmunities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccImmunities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Vulnerabilities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label vul-lbl">CC Vulnerabilities (disadv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccVulnerabilities || []).map(v => (
                                                                    <span key={v} className="damage-pill pill-vulnerability">
                                                                        {v}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccVulnerabilities || []).filter(x => x !== v);
                                                                            updatePlayer(player.id, 'ccVulnerabilities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccVulnerabilities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccVulnerabilities', [...(player.ccVulnerabilities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccVulnerabilities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="carrying-capacity mini-capacity">
                                                    <h4>Capacity</h4>
                                                    <div className="capacity-bar">
                                                        Max Load: {(player.str || 10) * 15} lbs <br />
                                                        Push/Drag/Lift: {(player.str || 10) * 30} lbs
                                                    </div>
                                                </div>

                                                {/* CC Resistances & Vulnerabilities Editor */}
                                                <div className="rp-field full-width player-resistances-section">
                                                    <label>CC Resistances &amp; Vulnerabilities</label>
                                                    <div className="damage-mods-container">
                                                        {/* CC Resistances */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label res-lbl">CC Resistances (adv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccResistances || []).map(r => (
                                                                    <span key={r} className="damage-pill pill-resistance">
                                                                        {r}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccResistances || []).filter(x => x !== r);
                                                                            updatePlayer(player.id, 'ccResistances', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccResistances || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccResistances', [...(player.ccResistances || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccResistances || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Immunities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label imm-lbl">CC Immunities (cannot be affected)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccImmunities || []).map(i => (
                                                                    <span key={i} className="damage-pill pill-immunity">
                                                                        {i}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccImmunities || []).filter(x => x !== i);
                                                                            updatePlayer(player.id, 'ccImmunities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccImmunities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccImmunities', [...(player.ccImmunities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccImmunities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Vulnerabilities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label vul-lbl">CC Vulnerabilities (disadv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(player.ccVulnerabilities || []).map(v => (
                                                                    <span key={v} className="damage-pill pill-vulnerability">
                                                                        {v}
                                                                        <button type="button" className="pill-remove-btn" onClick={() => {
                                                                            const updated = (player.ccVulnerabilities || []).filter(x => x !== v);
                                                                            updatePlayer(player.id, 'ccVulnerabilities', updated);
                                                                        }}>×</button>
                                                                    </span>
                                                                ))}
                                                                <select
                                                                    className="input pill-select-add"
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val && !(player.ccVulnerabilities || []).includes(val)) {
                                                                            updatePlayer(player.id, 'ccVulnerabilities', [...(player.ccVulnerabilities || []), val]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">+ Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(player.ccVulnerabilities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rp-field">
                                                    <label>Background / Race / Alignment</label>
                                                    <input
                                                        className="input"
                                                        value={player.background || ''}
                                                        onChange={e => updatePlayer(player.id, 'background', e.target.value)}
                                                        placeholder="e.g. Human Fighter, Acolyte, LG"
                                                    />
                                                </div>

                                                <div className="xp-section mini-xp">
                                                    <label>EXP</label>
                                                    <input
                                                        type="number"
                                                        className="input xp-input"
                                                        value={player.xp || 0}
                                                        onChange={e => updatePlayer(player.id, 'xp', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            
  );
}
