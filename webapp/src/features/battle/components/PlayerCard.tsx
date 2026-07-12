import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DAMAGE_TYPES } from '@/features/battle/utils/constants';
import {
  getSpellCostPreview,
  HP_TO_MANA_HP_COST,
  HP_TO_MANA_GAIN,
  MANA_TO_HP_MANA_COST,
  MANA_TO_HP_GAIN,
  getSaveModifiers,
} from '@/shared/utils/combatUtils';
import { calculateDerivedStats } from '@/shared/utils/statsEngine';
import type { IBuff, IEquipment, IPlayer, ISubclass } from '@/types';
import type { IPlayerCardProps } from '@/types/battle';
import QuickActionBar from './QuickActionBar';
import ActorModifierBadges from './ActorModifierBadges';
import SpellSlotsBar from './SpellSlotsBar';

import PlayerHeader from '@/features/PlayerCard/components/PlayerHeader';
import PlayerAttributes from '@/features/PlayerCard/components/PlayerAttributes';

export default function PlayerCard({
  player,
  party,
  combat,
  battleMode,
  equipment,
  subclasses,
  buffsDatabase,
  compendiumClasses,
  compendiumSubclasses,
  compendiumRaces,
  onOpenSheet
}: IPlayerCardProps) {
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
    setMinimizedPlayers,
    xpModalId,
    setXpModalId,
    xpModalType,
    setXpModalType,
    xpInputValue,
    setXpInputValue,
    getPlayerSubclass,
    getOptionalPlayerSubclass,
    playerUsesVampire,
    handleCastSpell,
    handleHpToMana,
    handleManaToHp,
    getEquipmentBonus,
    effectiveStat,
    calculateMaxHP,
    calculateMaxMana,
    getDefaultManaModifier,
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
    startPlayerAttackTargeting,
    applyQuickDamage,
    applyQuickHeal,
    getModifiersFor,
    castingUsesMana,
    castingUsesSpellSlots,
    spellFatigueEnabled,
    playerQualifiesForSpellSlots,
    getPlayerSpellSlots,
    adjustPlayerSpellSlot,
  } = { ...party, ...combat };

  const { spriteName, spriteState } = getPlayerSpriteInfo(player);

  const selectedRace = (compendiumRaces ?? []).find(r => r.entityKey === player.race) as MasterRace | undefined;
  const selectedClass = (compendiumClasses ?? []).find(c => c.entityKey === player.classType) as MasterClass | undefined;
  
  const computedPlayer = useMemo(() => {
    return calculateDerivedStats(player, selectedRace, selectedClass);
  }, [player, selectedRace, selectedClass]);

  const ultPercent = Math.min(100, (computedPlayer.ultCurrent / computedPlayer.ultMax) * 100);
  const canCastSpells =
    playerUsesVampire(computedPlayer) ||
    castingUsesMana ||
    (castingUsesSpellSlots && playerQualifiesForSpellSlots(computedPlayer));

  return (
                                <div id={`player-card-${player.id}`} key={player.id} data-player-id={player.id} className={`glass-panel integrated-player-card ${!player.inParty ? 'inactive' : ''} ${isPlayerMinimized(player.id) ? 'minimized-card' : ''} ${isTargetSelected('player', player.id) ? 'target-selected' : ''}`}>
                                    <PlayerHeader
                                        player={player}
                                        computedPlayer={computedPlayer}
                                        updatePlayer={updatePlayer}
                                        battleMode={battleMode}
                                        isTargetSelected={isTargetSelected}
                                        toggleTargetSelection={toggleTargetSelection}
                                        spriteState={spriteState}
                                        spriteName={spriteName}
                                        editingId={editingId}
                                        setEditingId={setEditingId}
                                        playerEditField={playerEditField}
                                        playerEditValue={playerEditValue}
                                        focusAndSelectRef={focusAndSelectRef}
                                        setPlayerEditValue={setPlayerEditValue}
                                        commitPlayerEdit={commitPlayerEdit}
                                        cancelPlayerEdit={cancelPlayerEdit}
                                        startPlayerEdit={startPlayerEdit}
                                        getLevelInfo={getLevelInfo}
                                        compendiumRaces={compendiumRaces}
                                        compendiumClasses={compendiumClasses}
                                        compendiumSubclasses={compendiumSubclasses}
                                        ALL_CC_EFFECTS={ALL_CC_EFFECTS}
                                        addCc={addCc}
                                        removeCc={removeCc}
                                        isPlayerMinimized={isPlayerMinimized}
                                        setMinimizedPlayers={setMinimizedPlayers}
                                        calculateEffectiveAC={party.calculateEffectiveAC}
                                        toggleParty={toggleParty}
                                        removePlayer={removePlayer}
                                        onOpenCodex={() => onOpenSheet && onOpenSheet(player.id)}
                                    />

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
                                            {battleMode && (
                                                <>
                                                    <QuickActionBar
                                                        entityType="player"
                                                        entityId={player.id}
                                                        onDamage={applyQuickDamage}
                                                        onHeal={applyQuickHeal}
                                                    />
                                                    <ActorModifierBadges
                                                        entityType="player"
                                                        entityId={player.id}
                                                        entity={player}
                                                        conditions={player.cc ?? []}
                                                        modifiers={getModifiersFor(player.id)}
                                                        onAddCondition={(_type, id, effect) => addCc(id, effect)}
                                                        onRemoveCondition={(_type, id, effect) => removeCc(id, effect)}
                                                    >
                                                    {(() => {
                                                        const allBuffs = getPlayerBuffsWithConfig(player, equipment);
                                                        const hasManyBuffs = allBuffs.length >= 5;
                                                        const isExpanded = !!expandedPlayers[player.id];
                                                        const shouldCollapse = hasManyBuffs && !isExpanded;

                                                        if (shouldCollapse) {
                                                            return (
                                                                <div
                                                                    className="player-buff-badge actor-mod-badge actor-mod-badge--buff buffs-expand-badge"
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

                                                            let badgeClass = "player-buff-badge actor-mod-badge actor-mod-badge--buff";
                                                            if (isSpent) badgeClass += " buff-spent";
                                                            else if (isToggle && !isActive) badgeClass += " buff-inactive";

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={badgeClass}
                                                                    data-tooltip={(() => {
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
                                                            <span className="actor-tag-inline-add">
                                                                <select
                                                                    className="actor-tag-select"
                                                                    value={buffSearchText}
                                                                    onChange={(e) => setBuffSearchText(e.target.value)}
                                                                >
                                                                    <option value="" disabled>Select Buff...</option>
                                                                    {buffsDatabase
                                                                        .filter(b => !(player.buffs || []).includes(b.name))
                                                                        .map(b => (
                                                                            <option key={b.id} value={b.name}>
                                                                                {b.name}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    className="actor-tag-confirm-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (buffSearchText) {
                                                                            const currentBuffs = player.buffs || [];
                                                                            if (!currentBuffs.includes(buffSearchText)) {
                                                                                updatePlayer(player.id, 'buffs', [...currentBuffs, buffSearchText]);
                                                                            }
                                                                        }
                                                                        setBuffInputPlayerId(null);
                                                                        setBuffSearchText('');
                                                                    }}
                                                                >
                                                                    ✓
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="actor-tag-cancel-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setBuffInputPlayerId(null);
                                                                        setBuffSearchText('');
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </span>
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
                                                    </ActorModifierBadges>
                                                </>
                                            )}
                                        </div>

                                        {!playerUsesVampire(player) && castingUsesMana && (
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

                                        {!playerUsesVampire(player) && castingUsesSpellSlots && playerQualifiesForSpellSlots(player) && (
                                            <div className="stat-block spell-slots-stat-block">
                                                <SpellSlotsBar
                                                    slots={getPlayerSpellSlots(player)}
                                                    onAdjust={(slotLevel, delta) =>
                                                        adjustPlayerSpellSlot(player.id, slotLevel, delta)
                                                    }
                                                    compact
                                                />
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
                                            {canCastSpells && inlineCastPlayerId === player.id ? (
                                                <div className="inline-cast-picker">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
                                                        const preview = castingUsesSpellSlots
                                                            ? { cost: 1, resource: 'slot' as const }
                                                            : getSpellCostPreview(player, lvl, getPlayerSubclass(player));
                                                        const costLabel = preview.resource === 'slot'
                                                            ? '1 slot'
                                                            : `−${preview.cost}`;
                                                        const titleCost = preview.resource === 'slot'
                                                            ? '1 SLOT'
                                                            : `${preview.cost} ${preview.resource.toUpperCase()}`;
                                                        return (
                                                            <button
                                                                key={lvl}
                                                                type="button"
                                                                className="cast-level-btn"
                                                                title={`Cast level ${lvl} (−${titleCost})`}
                                                                onClick={() => handleCastSpell(player.id, lvl)}
                                                            >
                                                                <span className="cast-level-num">{lvl}</span>
                                                                <span className="cast-level-cost">{costLabel}</span>
                                                            </button>
                                                        );
                                                    })}
                                                    <button type="button" className="cast-cancel-btn" onClick={() => setInlineCastPlayerId(null)}>✕</button>
                                                </div>
                                            ) : canCastSpells ? (
                                                <button
                                                    type="button"
                                                    className="cast-spell-btn"
                                                    onClick={() => {
                                                        setInlineCastPlayerId(player.id);
                                                        cancelInlineDelta();
                                                    }}
                                                    title={
                                                        playerUsesVampire(player)
                                                            ? 'Cast spell (costs HP)'
                                                            : castingUsesSpellSlots
                                                                ? 'Cast spell (costs spell slot)'
                                                                : 'Cast spell (costs Mana)'
                                                    }
                                                >
                                                    ✦ Cast
                                                </button>
                                            ) : null}
                                            {spellFatigueEnabled && castingUsesMana && (player.recentSpells || []).length > 0 && (
                                                <span className="fatigue-badge" title={`Fadiga: ${(player.recentSpells || []).join(', ')}`}>
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
                                            <PlayerAttributes
                                                player={player}
                                                computedPlayer={computedPlayer}
                                                updatePlayer={updatePlayer}
                                                statsList={statsList}
                                                getEquipmentBonus={getEquipmentBonus}
                                                effectiveStat={effectiveStat}
                                                formatModifier={formatModifier}
                                                calculateModifier={calculateModifier}
                                            />
                                            {(() => {
                                                const sub = getPlayerSubclass(player);
                                                const optSub = getOptionalPlayerSubclass?.(player);
                                                if (!sub && !optSub) return null;
                                                return (
                                                    <div className="subclass-player-section glass-panel" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
                                                        {sub && (
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                                            Subclass: {sub.name}
                                                        </div>
                                                        )}
                                                        {optSub && (
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                                            Opcional: {optSub.name}
                                                        </div>
                                                        )}
                                                        {(sub?.passiveTraits || []).length > 0 && (
                                                            <div style={{ marginBottom: '0.65rem' }}>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Passive Traits</div>
                                                                {(sub?.passiveTraits || []).map((trait, idx) => (
                                                                    <div key={idx} style={{ marginBottom: '0.35rem' }}>
                                                                        <strong style={{ fontSize: '0.85rem' }}>{trait.name}</strong>
                                                                        {trait.description && (
                                                                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{trait.description}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {(sub?.abilities || []).length > 0 && (
                                                            <div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Subclass Abilities</div>
                                                                <div className="enemy-skills-buttons-grid" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                    {(sub?.abilities || []).map(atk => (
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
                                            <div className="stats-skills-content">
                                            <div className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--primary)' }}>
                                                Proficiencies (PB +{getProficiencyBonus(computedPlayer)})
                                            </div>
                                            <div className="compact-proficiencies">
                                                {statsList.map(stat => {
                                                    const eff = effectiveStat(computedPlayer, stat);
                                                    const isComputedProf = computedPlayer.saves?.[stat];
                                                    const isBaseProf = player.saves?.[stat];
                                                    const isFixed = isComputedProf && !isBaseProf;
                                                    
                                                    const baseSave = calculateModifier(eff) + (isComputedProf ? getProficiencyBonus(computedPlayer) : 0);
                                                    const saveMods = getSaveModifiers(computedPlayer, '', equipment, buffsDatabase, stat.substring(0, 3).toLowerCase());
                                                    const finalSave = baseSave + saveMods.saveBonus;
                                                    
                                                    let modClass = '';
                                                    if (saveMods.advantageState === 'advantage') modClass = 'adv-save';
                                                    if (saveMods.advantageState === 'disadvantage') modClass = 'dis-save';
                                                    if (saveMods.saveBonus > 0) modClass = 'buffed-save';
                                                    if (saveMods.saveBonus < 0) modClass = 'debuffed-save';

                                                    if (!isComputedProf && saveMods.saveBonus === 0 && saveMods.advantageState === 'none') {
                                                        return null;
                                                    }

                                                    return (
                                                        <div 
                                                            key={`save-${stat}`} 
                                                            className={`proficiency-chip save-chip ${isComputedProf ? 'proficient' : ''} ${isFixed ? 'locked-trait' : ''} ${modClass}`} 
                                                            onClick={isFixed ? undefined : () => toggleSaveProficiency(player.id, stat)}
                                                            title={isFixed ? `Granted by Race/Class (Fixed)\nModifiers: ${saveMods.saveBonus} ${saveMods.advantageState}` : `Click to toggle save proficiency. Modifiers: ${saveMods.saveBonus} ${saveMods.advantageState}`}
                                                            style={{ position: 'relative', cursor: isFixed ? 'not-allowed' : 'pointer' }}
                                                        >
                                                            {stat.toUpperCase()} Save {finalSave >= 0 ? '+' : ''}{finalSave}
                                                            {saveMods.advantageState === 'advantage' && <span className="adv-indicator" title="Advantage on saving throw">A</span>}
                                                            {saveMods.advantageState === 'disadvantage' && <span className="dis-indicator" title="Disadvantage on saving throw">D</span>}
                                                        </div>
                                                    );
                                                })}
                                                {dndSkills.map(skill => {
                                                    const skillBonus = calculateSkillBonus(computedPlayer, skill.stat, skill.name);
                                                    const isComputedProficient = computedPlayer.skills && computedPlayer.skills[skill.name];
                                                    const isBaseProficient = player.skills && player.skills[skill.name];
                                                    const isFixed = isComputedProficient && !isBaseProficient;
                                                    
                                                    if (isComputedProficient || skillBonus > 0) {
                                                        return (
                                                            <div 
                                                                key={`skill-${skill.name}`} 
                                                                className={`proficiency-chip skill-chip ${isComputedProficient ? 'proficient' : ''} ${isFixed ? 'locked-trait' : ''}`}
                                                                onClick={isFixed ? undefined : () => toggleSkill(player.id, skill.name)}
                                                                title={isFixed ? "Granted by Race/Class (Fixed)" : "Click to toggle skill proficiency"}
                                                                style={{ cursor: isFixed ? 'not-allowed' : 'pointer' }}
                                                            >
                                                                {skill.name} {skillBonus >= 0 ? '+' : ''}{skillBonus}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>



                                                {/* Resistances & Vulnerabilities Editor */}
                                                <div className="rp-field full-width player-resistances-section">
                                                    <label>Resistances & Vulnerabilities</label>
                                                    <div className="damage-mods-container">
                                                        {/* Resistances */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label res-lbl">Resistances (1/2 dmg)</span>
                                                            <div className="damage-mod-pills">
                                                                {(computedPlayer.resistances || []).map(r => {
                                                                    const isFixed = !(player.resistances || []).includes(r);
                                                                    return (
                                                                    <span 
                                                                        key={r} 
                                                                        className={`damage-pill pill-resistance ${isFixed ? 'locked-trait' : ''}`}
                                                                        onClick={isFixed ? undefined : () => {
                                                                            const updated = (player.resistances || []).filter(x => x !== r);
                                                                            updatePlayer(player.id, 'resistances', updated);
                                                                        }}
                                                                        title={isFixed ? "Granted by Race/Class (Fixed)" : "Click to remove"}
                                                                        style={{ cursor: isFixed ? 'not-allowed' : 'pointer' }}
                                                                    >
                                                                        {r}
                                                                    </span>
                                                                )})}
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
                                                                    <option value="">Add</option>
                                                                    {DAMAGE_TYPES.filter(t => !(computedPlayer.resistances || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Immunities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label imm-lbl">Immunities (0 dmg)</span>
                                                            <div className="damage-mod-pills">
                                                                {(computedPlayer.immunities || []).map(i => {
                                                                    const isFixed = !(player.immunities || []).includes(i);
                                                                    return (
                                                                    <span 
                                                                        key={i} 
                                                                        className={`damage-pill pill-immunity ${isFixed ? 'locked-trait' : ''}`}
                                                                        onClick={isFixed ? undefined : () => {
                                                                            const updated = (player.immunities || []).filter(x => x !== i);
                                                                            updatePlayer(player.id, 'immunities', updated);
                                                                        }}
                                                                        title={isFixed ? "Granted by Race/Class (Fixed)" : "Click to remove"}
                                                                        style={{ cursor: isFixed ? 'not-allowed' : 'pointer' }}
                                                                    >
                                                                        {i}
                                                                    </span>
                                                                )})}
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
                                                                    <option value="">Add</option>
                                                                    {DAMAGE_TYPES.filter(t => !(computedPlayer.immunities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Vulnerabilities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label vul-lbl">Vulnerabilities (2x dmg)</span>
                                                            <div className="damage-mod-pills">
                                                                {(computedPlayer.vulnerabilities || []).map(v => (
                                                                    <span 
                                                                        key={v} 
                                                                        className="damage-pill pill-vulnerability"
                                                                        onClick={() => {
                                                                            const updated = (player.vulnerabilities || []).filter(x => x !== v);
                                                                            updatePlayer(player.id, 'vulnerabilities', updated);
                                                                        }}
                                                                        title="Click to remove"
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        {v}
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
                                                                    <option value="">Add</option>
                                                                    {DAMAGE_TYPES.filter(t => !(computedPlayer.vulnerabilities || []).includes(t)).map(t => (
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
                                                                {(computedPlayer.ccResistances || []).map(r => {
                                                                    const isFixed = !(player.ccResistances || []).includes(r);
                                                                    return (
                                                                    <span 
                                                                        key={r} 
                                                                        className={`damage-pill pill-resistance ${isFixed ? 'locked-trait' : ''}`}
                                                                        onClick={isFixed ? undefined : () => {
                                                                            const updated = (player.ccResistances || []).filter(x => x !== r);
                                                                            updatePlayer(player.id, 'ccResistances', updated);
                                                                        }}
                                                                        title={isFixed ? "Granted by Race/Class (Fixed)" : "Click to remove"}
                                                                        style={{ cursor: isFixed ? 'not-allowed' : 'pointer' }}
                                                                    >
                                                                        {r}
                                                                    </span>
                                                                )})}
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
                                                                    <option value="">Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(computedPlayer.ccResistances || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Immunities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label imm-lbl">CC Immunities (cannot be affected)</span>
                                                            <div className="damage-mod-pills">
                                                                {(computedPlayer.ccImmunities || []).map(i => {
                                                                    const isFixed = !(player.ccImmunities || []).includes(i);
                                                                    return (
                                                                    <span 
                                                                        key={i} 
                                                                        className={`damage-pill pill-immunity ${isFixed ? 'locked-trait' : ''}`}
                                                                        onClick={isFixed ? undefined : () => {
                                                                            const updated = (player.ccImmunities || []).filter(x => x !== i);
                                                                            updatePlayer(player.id, 'ccImmunities', updated);
                                                                        }}
                                                                        title={isFixed ? "Granted by Race/Class (Fixed)" : "Click to remove"}
                                                                        style={{ cursor: isFixed ? 'not-allowed' : 'pointer' }}
                                                                    >
                                                                        {i}
                                                                    </span>
                                                                )})}
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
                                                                    <option value="">Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(computedPlayer.ccImmunities || []).includes(t)).map(t => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* CC Vulnerabilities */}
                                                        <div className="damage-mod-row">
                                                            <span className="damage-mod-type-label vul-lbl">CC Vulnerabilities (disadv. on save)</span>
                                                            <div className="damage-mod-pills">
                                                                {(computedPlayer.ccVulnerabilities || []).map(v => (
                                                                    <span 
                                                                        key={v} 
                                                                        className="damage-pill pill-vulnerability"
                                                                        onClick={() => {
                                                                            const updated = (player.ccVulnerabilities || []).filter(x => x !== v);
                                                                            updatePlayer(player.id, 'ccVulnerabilities', updated);
                                                                        }}
                                                                        title="Click to remove"
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        {v}
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
                                                                    <option value="">Add</option>
                                                                    {ALL_CC_EFFECTS.filter(t => !(computedPlayer.ccVulnerabilities || []).includes(t)).map(t => (
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
                                                                <span 
                                                                    key={b} 
                                                                    className="buff-pill"
                                                                    onClick={() => {
                                                                        const updated = (player.buffs || []).filter(x => x !== b);
                                                                        updatePlayer(player.id, 'buffs', updated);
                                                                    }}
                                                                    title="Click to remove"
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    {b}
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
                                                            <option value="">Add Buff/Debuff...</option>
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
                                        </div>
                                    )}
                                </div>
                            
  );
}
