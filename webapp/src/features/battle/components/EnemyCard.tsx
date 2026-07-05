import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DAMAGE_TYPES, ALL_CC_EFFECTS } from '../utils/constants';
import { calculateEffectiveEnemyAC, getSaveModifiers } from '../../../shared/utils/combatUtils';
import type { IBuff, IEnemy } from '../../../types';
import type { IEnemyCardProps } from '../../../types/battle';
import QuickActionBar from './QuickActionBar';
import ActorModifierBadges from './ActorModifierBadges';

export default function EnemyCard({
  enemy,
  party,
  combat,
  battleMode,
  minimizedEnemies,
  library,
  updateLibrary,
  buffsDatabase,
  compendiumMonsters = [],
}: IEnemyCardProps) {
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);

  useEffect(() => {
    if (!ccDropdownOpen) return;
    const handleOutsideClick = () => setCcDropdownOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [ccDropdownOpen]);

  const {
    focusAndSelectRef,
    buffSearchText,
    setBuffSearchText,
    calculateColor,
    statsList,
    dndSkills,
    calculateModifier,
    formatModifier,
  } = party;
  const {
    inlineDeltaEdit,
    inlineDeltaValue,
    setInlineDeltaValue,
    startInlineDelta,
    cancelInlineDelta,
    commitInlineDelta,
    isTargetSelected,
    toggleTargetSelection,
    enemyEditField,
    enemyEditValue,
    setEnemyEditValue,
    startEnemyEdit,
    commitEnemyEdit,
    cancelEnemyEdit,
    updateEnemy,
    setEnemies,
    removeEnemy,
    copyActiveEnemy,
    selectMonster,
    createAndSelectMonster,
    toggleEnemySkill,
    triggerEnemyLimitBreak,
    getEnemyAttacks,
    startAttackTargeting,
    addEnemyCc,
    removeEnemyCc,
    getEnemyBuffsList,
    handleRemoveEnemyBuff,
    handleToggleEnemyBuff,
    getEnemySpriteInfo,
    toggleSaveProficiency,
    enemySearchText,
    setEnemySearchText,
    buffInputEnemyId,
    setBuffInputEnemyId,
    defaultMonsters,
    setMinimizedEnemies,
    calculateEnemyMaxHP,
    applyQuickDamage,
    applyQuickHeal,
    getModifiersFor,
  } = combat;

  const { spriteName, spriteState } = getEnemySpriteInfo(enemy);
  const ruleHpMax = calculateEnemyMaxHP(enemy);

  return (
    <div className={`glass-panel integrated-player-card enemy-card ${enemy.hp <= 0 ? 'ko-state' : ''} ${minimizedEnemies[enemy.id] ? 'minimized-card' : ''} ${isTargetSelected('enemy', enemy.id) ? 'target-selected' : ''}`}>

                                            {/* Header */}
                                            <div className="player-card-header">
                                                <div className="player-header-left">
                                                    <label className="target-select-wrap" title="Select for bulk actions">
                                                        <input
                                                            type="checkbox"
                                                            className="target-select-checkbox"
                                                            checked={isTargetSelected('enemy', enemy.id)}
                                                            onChange={() => toggleTargetSelection('enemy', enemy.id)}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </label>
                                                    <div className="player-info-container">
                                                        <div className={`player-sprite-container sprite-state-${spriteState}`} title={`State: ${spriteState.toUpperCase()}`}>
                                                            <img src={`./sprites/${spriteName}.png`} alt={enemy.classType} className="player-sprite-img" />
                                                        </div>
                                                        <div className="player-info">
                                                            {enemy.editing ? (
                                                                <div className="enemy-name-search-container">
                                                                    <input
                                                                        className="input title-input"
                                                                        value={enemySearchText}
                                                                        onChange={e => setEnemySearchText(e.target.value)}
                                                                        onBlur={() => {
                                                                            setTimeout(() => {
                                                                                updateEnemy(enemy.id, 'name', enemySearchText || enemy.name);
                                                                                updateEnemy(enemy.id, 'editing', false);
                                                                            }, 200);
                                                                        }}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') {
                                                                                updateEnemy(enemy.id, 'name', enemySearchText || enemy.name);
                                                                                updateEnemy(enemy.id, 'editing', false);
                                                                            }
                                                                            if (e.key === 'Escape') {
                                                                                updateEnemy(enemy.id, 'editing', false);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                    />
                                                                    <div className="enemy-search-dropdown">
                                                                        {[...defaultMonsters, ...compendiumMonsters, ...library]
                                                                            .filter(m => m.name.toLowerCase().includes((enemySearchText || '').toLowerCase()))
                                                                            .slice(0, 10)
                                                                            .map(m => (
                                                                                <div
                                                                                    key={m.id}
                                                                                    className="enemy-search-item"
                                                                                    onMouseDown={(e) => {
                                                                                        e.preventDefault();
                                                                                        selectMonster(enemy.id, m);
                                                                                    }}
                                                                                >
                                                                                    <span>{m.name}</span>
                                                                                    <span className="search-item-type">{m.background || 'Monster'}</span>
                                                                                </div>
                                                                            ))
                                                                        }
                                                                        <div
                                                                            className="enemy-search-item enemy-search-create-btn"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                createAndSelectMonster(enemy.id, enemySearchText);
                                                                            }}
                                                                        >
                                                                            + Create Bestiary Entry: "{enemySearchText || 'New Monster'}"
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <h3 onClick={() => {
                                                                    setEnemySearchText(enemy.name);
                                                                    updateEnemy(enemy.id, 'editing', true);
                                                                }}>{enemy.name}</h3>
                                                            )}
                                                            <div className="player-subtitle">
                                                                <select
                                                                    className="input inline-input class-input class-dropdown"
                                                                    value={enemy.classType || 'Enemy'}
                                                                    onChange={e => updateEnemy(enemy.id, 'classType', e.target.value)}
                                                                >
                                                                    <option value="Enemy">Enemy</option>
                                                                    <option value="Boss">Boss</option>
                                                                </select>
                                                                <span>AC {calculateEffectiveEnemyAC(enemy, buffsDatabase)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="player-header-left-rows">
                                                        {/* Crowd Control Badges & Add Button */}
                                                        <div className="player-cc-container" onClick={e => e.stopPropagation()}>
                                                            <span className="cc-header-tag">CC</span>
                                                            {(enemy.cc || []).map(cc => (
                                                                <button
                                                                    key={cc}
                                                                    className="player-cc-badge"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeEnemyCc(enemy.id, cc);
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
                                                                            const hasCc = (enemy.cc || []).includes(effect);
                                                                            return (
                                                                                <button
                                                                                    key={effect}
                                                                                    disabled={hasCc}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        addEnemyCc(enemy.id, effect);
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
                                                            {getEnemyBuffsList(enemy).map((buff, idx) => {
                                                                const isToggle = buff.config?.type === 'toggle';
                                                                const isSpent = (enemy.spentBuffs || {})[buff.name] === true;
                                                                const isToggledActive = (enemy.buffStates || {})[buff.name] !== false;
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
                                                                            const mainText = isSpent ? `${buff.name} (Spent - Rest required)` : `Click to toggle/use.`;
                                                                            return desc ? `${desc}\n${mainText}` : mainText;
                                                                        })()}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleEnemyBuff(enemy, buff);
                                                                        }}
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        {buff.name} {isToggle && (isActive ? "🟢" : "🔴")} {isSpent && "💤"}
                                                                        <button
                                                                            type="button"
                                                                            className="buff-remove-x"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleRemoveEnemyBuff(enemy.id, buff.name);
                                                                            }}
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                            <div className="player-buff-add-container">
                                                                {buffInputEnemyId === enemy.id ? (
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
                                                                                    setBuffInputEnemyId(null);
                                                                                    setBuffSearchText('');
                                                                                }
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            className="buff-inline-cancel-btn"
                                                                            onClick={() => {
                                                                                setBuffInputEnemyId(null);
                                                                                setBuffSearchText('');
                                                                            }}
                                                                        >
                                                                            ×
                                                                        </button>
                                                                        <div className="cc-dropdown-menu" style={{ left: 0, right: 'auto', width: '200px' }}>
                                                                            {buffsDatabase
                                                                                .filter(b => {
                                                                                    const isAlreadyActive = (enemy.buffs || []).includes(b.name);
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
                                                                                            const currentBuffs = enemy.buffs || [];
                                                                                            if (!currentBuffs.includes(b.name)) {
                                                                                                updateEnemy(enemy.id, 'buffs', [...currentBuffs, b.name]);
                                                                                            }
                                                                                            setBuffInputEnemyId(null);
                                                                                            setBuffSearchText('');
                                                                                        }}
                                                                                    >
                                                                                        {b.name}
                                                                                    </button>
                                                                                ))}
                                                                            {buffsDatabase.filter(b => !(enemy.buffs || []).includes(b.name) && b.name.toLowerCase().includes(buffSearchText.toLowerCase())).length === 0 && (
                                                                                <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                                    No matching buffs
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        className="player-buff-add-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setBuffInputEnemyId(enemy.id);
                                                                            setBuffSearchText('');
                                                                        }}
                                                                        title="Add Buff/Debuff"
                                                                    >
                                                                        +
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="card-top-right">
                                                    <button
                                                        type="button"
                                                        className="app-icon-btn"
                                                        title={minimizedEnemies[enemy.id] ? 'Expandir card' : 'Recolher card'}
                                                        aria-label={minimizedEnemies[enemy.id] ? 'Expandir card' : 'Recolher card'}
                                                        onClick={() =>
                                                            setMinimizedEnemies((prev) => ({
                                                                ...prev,
                                                                [enemy.id]: !prev[enemy.id],
                                                            }))
                                                        }
                                                    >
                                                        {minimizedEnemies[enemy.id] ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronUp className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <div
                                                        className={`armor-class-badge enemy-ac-badge ${enemyEditField?.id === enemy.id && enemyEditField?.field === 'ac' ? 'editing' : ''}`}
                                                        title="Click to edit AC"
                                                        onClick={() => { if (!(enemyEditField?.id === enemy.id && enemyEditField?.field === 'ac')) startEnemyEdit(enemy, 'ac'); }}
                                                    >
                                                        {enemyEditField?.id === enemy.id && enemyEditField?.field === 'ac' ? (
                                                            <input
                                                                type="number"
                                                                className="enemy-inline-edit-input"
                                                                value={enemyEditValue}
                                                                ref={focusAndSelectRef}
                                                                onChange={e => setEnemyEditValue(e.target.value)}
                                                                onBlur={() => commitEnemyEdit(enemy)}
                                                                onKeyDown={e => { if (e.key === 'Enter') commitEnemyEdit(enemy); if (e.key === 'Escape') cancelEnemyEdit(); }}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <span className="enemy-ac-display">🛡️ {calculateEffectiveEnemyAC(enemy, buffsDatabase)} <span className="edit-pencil">✏️</span></span>
                                                        )}
                                                    </div>
                                                    <div className="player-controls">
                                                        <button
                                                            className="party-toggle"
                                                            onClick={() => copyActiveEnemy(enemy.id)}
                                                            title="Copy/Duplicate Monster"
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            📋
                                                        </button>
                                                        <button className="delete-btn" onClick={() => removeEnemy(enemy.id)}>×</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* MAIN: HP and Ultimate — ALWAYS VISIBLE */}
                                            <div className="stats-grid">
                                                <div className={`stat-block ${enemy.hp <= 0 ? 'ko-state' : ''}`}>
                                                    <div className="stat-label">
                                                        <span>{enemy.hp <= -0.5 * ruleHpMax ? 'OVERKILL' : (enemy.hp <= 0 ? 'DEFEATED' : 'HP')}</span>
                                                        <span className="stat-value-row">
                                                            {inlineDeltaEdit?.type === 'enemy' && inlineDeltaEdit?.id === enemy.id && inlineDeltaEdit?.field === 'hp' ? (
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
                                                                    onClick={() => startInlineDelta('enemy', enemy.id, 'hp')}
                                                                >{enemy.hp}</span>
                                                            )}
                                                            &nbsp;/&nbsp;
                                                            {enemyEditField?.id === enemy.id && enemyEditField?.field === 'hpMax' ? (
                                                                <input
                                                                    type="number"
                                                                    className="enemy-inline-edit-input enemy-hpmax-edit"
                                                                    value={enemyEditValue}
                                                                    ref={focusAndSelectRef}
                                                                    onChange={e => setEnemyEditValue(e.target.value)}
                                                                    onBlur={() => commitEnemyEdit(enemy)}
                                                                    onKeyDown={e => { if (e.key === 'Enter') commitEnemyEdit(enemy); if (e.key === 'Escape') cancelEnemyEdit(); }}
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span
                                                                    className="enemy-hpmax-clickable"
                                                                    title="Click to edit Max HP"
                                                                    onClick={() => startEnemyEdit(enemy, 'hpMax')}
                                                                >{ruleHpMax} <span className="edit-pencil">✏️</span></span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="stat-bar-bg">
                                                        <div className="stat-bar-fill" style={{
                                                            width: `${Math.max(0, (enemy.hp / ruleHpMax) * 100)}%`,
                                                            background: enemy.hp <= 0 ? '#dc2626' : calculateColor(enemy.hp, ruleHpMax)
                                                        }} />
                                                    </div>
                                                    {battleMode && (
                                                        <>
                                                            <QuickActionBar
                                                                entityType="enemy"
                                                                entityId={enemy.id}
                                                                onDamage={applyQuickDamage}
                                                                onHeal={applyQuickHeal}
                                                            />
                                                            <ActorModifierBadges
                                                                entityType="enemy"
                                                                entityId={enemy.id}
                                                                entity={enemy}
                                                                conditions={enemy.cc ?? []}
                                                                modifiers={getModifiersFor(enemy.id)}
                                                                onAddCondition={(_type, id, effect) => addEnemyCc(id, effect)}
                                                                onRemoveCondition={(_type, id, effect) => removeEnemyCc(id, effect)}
                                                            />
                                                        </>
                                                    )}
                                                </div>

                                                {/* Ultimate Bar */}
                                                {enemy.classType === 'Boss' && (() => {
                                                    const bossHpStart = enemy.bossHpStart || ruleHpMax;
                                                    const damageTaken = Math.max(0, bossHpStart - enemy.hp);
                                                    const rawUltPercent = enemy.hp <= 0 ? 0 : Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
                                                    const isEnemyLimitReady = rawUltPercent >= 100 && !enemy.limitBreakUsed;
                                                    const enemyUltPercent = enemy.limitBreakUsed ? 0 : Math.max(0, rawUltPercent);
                                                    return (
                                                        <div className={`stat-block ${isEnemyLimitReady ? 'limit-ready-state' : ''}`}>
                                                            <div className="stat-label">
                                                                <span>{isEnemyLimitReady ? 'LIMIT BREAK READY' : 'Ultimate'}</span>
                                                                <span>{enemyUltPercent}%</span>
                                                            </div>
                                                            <div className="stat-bar-bg ult-bg">
                                                                <div
                                                                    className={`stat-bar-fill ult-fill ${isEnemyLimitReady ? 'limit-ready' : ''}`}
                                                                    style={{ width: `${enemyUltPercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Action Buttons Row */}
                                                <div className="stat-controls hp-layout">
                                                    {enemy.classType === 'Boss' && (() => {
                                                        const bossHpStart = enemy.bossHpStart || ruleHpMax;
                                                        const damageTaken = Math.max(0, bossHpStart - enemy.hp);
                                                        const rawUltPercent = enemy.hp <= 0 ? 0 : Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
                                                        const isEnemyLimitReady = rawUltPercent >= 100 && !enemy.limitBreakUsed;
                                                        return (
                                                            <button
                                                                className="ult-use-btn"
                                                                onClick={() => triggerEnemyLimitBreak(enemy.id)}
                                                                disabled={!isEnemyLimitReady}
                                                                style={{ opacity: !isEnemyLimitReady ? 0.5 : 1 }}
                                                            >
                                                                Limit Break
                                                            </button>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Skills Section (Always Visible) */}
                                                <div className="enemy-skills-always-visible" style={{ marginTop: '0.75rem', padding: '0.5rem 0 0 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                                                        ⚔️ Skills
                                                    </div>
                                                    <div className="enemy-skills-buttons-grid" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                        {getEnemyAttacks(enemy).map(attack => (
                                                            <button
                                                                key={attack.id || attack.name}
                                                                className="btn btn-secondary enemy-skill-roll-btn"
                                                                onClick={() => startAttackTargeting(enemy, attack)}
                                                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', flex: '1 1 auto', minWidth: '80px', margin: 0 }}
                                                            >
                                                                {attack.name}
                                                            </button>
                                                        ))}
                                                        {getEnemyAttacks(enemy).length === 0 && (
                                                            <div className="no-skills-msg" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No attacks found.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* BOTTOM PORTION (VISIBLE ONLY WHEN EXPANDED) */}
                                            {!minimizedEnemies[enemy.id] && (
                                                <div className="player-details-extended">
                                                    <div className="rp-field full-width enemy-abilities-field" style={{ marginBottom: '1.25rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>Abilities</label>
                                                        <textarea
                                                            className="input rp-textarea"
                                                            style={{ width: '100%', minHeight: '120px', fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: '1.4', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '6px' }}
                                                            value={enemy.abilities || ''}
                                                            onChange={e => updateEnemy(enemy.id, 'abilities', e.target.value)}
                                                            placeholder="Actions, attacks, multiattacks..."
                                                        />
                                                    </div>
                                                    <div className="stats-skills-tab">
                                                        {statsList.map(stat => {
                                                            const eff = enemy[stat] || 10;
                                                            const mod = calculateModifier(eff);
                                                            const relatedSkills = dndSkills.filter(s => s.stat === stat);
                                                            const isSaveProficient = enemy.saves?.[stat];
                                                            const profBonus = enemy.proficiency !== undefined ? enemy.proficiency : 2;
                                                            const baseSave = mod + (isSaveProficient ? profBonus : 0);
                                                            const saveMods = getSaveModifiers(enemy, '', null, buffsDatabase, stat.substring(0, 3).toLowerCase());
                                                            const saveBonus = baseSave + saveMods.saveBonus;
                                                            return (
                                                                <div key={stat} className="stat-group">
                                                                    <div className="stat-group-header">
                                                                        <div
                                                                            className={`skill-checkbox save-checkbox ${isSaveProficient ? 'proficient' : ''}`}
                                                                            onClick={() => toggleSaveProficiency(enemy.id, stat, true)}
                                                                            title="Toggle Save Proficiency"
                                                                        >
                                                                            {isSaveProficient && <span className="check-mark">●</span>}
                                                                        </div>
                                                                        <span className="stat-name">{stat.toUpperCase()}</span>
                                                                        <input
                                                                            type="number"
                                                                            className="stat-score-input"
                                                                            value={enemy[stat] || 10}
                                                                            onChange={e => updateEnemy(enemy.id, stat, parseInt(e.target.value) || 0)}
                                                                        />
                                                                        <span className="stat-mod-badge">{formatModifier(mod)}</span>
                                                                        <div className="stat-save-display" style={{ position: 'relative' }}>
                                                                            <span className="stat-save-display-label">Save</span>
                                                                            <span style={{ 
                                                                                color: saveMods.saveBonus > 0 ? 'var(--success)' : saveMods.saveBonus < 0 ? 'var(--danger)' : isSaveProficient ? 'var(--primary)' : 'var(--text-primary)'
                                                                            }} title={saveMods.saveBonus !== 0 ? `Modifiers applied: ${saveMods.saveBonus > 0 ? '+' : ''}${saveMods.saveBonus}` : ''}>
                                                                                {formatModifier(saveBonus)}
                                                                            </span>
                                                                            {saveMods.advantageState === 'advantage' && <span className="adv-indicator" title="Advantage on saving throw">A</span>}
                                                                            {saveMods.advantageState === 'disadvantage' && <span className="dis-indicator" title="Disadvantage on saving throw">D</span>}
                                                                        </div>
                                                                    </div>
                                                                    {relatedSkills.length > 0 && (
                                                                        <div className="stat-group-skills">
                                                                            {relatedSkills.map(skill => {
                                                                                const isProficient = enemy.skills && enemy.skills[skill.name];
                                                                                const skillBonus = mod + (isProficient ? profBonus : 0);
                                                                                return (
                                                                                    <div key={skill.name} className={`skill-row ${isProficient ? 'proficient' : ''}`} onClick={() => toggleEnemySkill(enemy.id, skill.name)}>
                                                                                        <div className="skill-checkbox">
                                                                                            {isProficient && <span className="check-mark">●</span>}
                                                                                        </div>
                                                                                        <div className="skill-bonus">
                                                                                            {formatModifier(skillBonus)}
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
                                                                value={enemy.features || ''}
                                                                onChange={e => updateEnemy(enemy.id, 'features', e.target.value)}
                                                                placeholder="Special traits, immunities, resistances..."
                                                            />
                                                        </div>

                                                        {/* Enemy Resistances & Vulnerabilities Editor */}
                                                        <div className="rp-field full-width player-resistances-section">
                                                            <label>Resistances & Vulnerabilities</label>
                                                            <div className="damage-mods-container">
                                                                {/* Resistances */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label res-lbl">Resistances (1/2 dmg)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.resistances || []).map(r => (
                                                                            <span key={r} className="damage-pill pill-resistance">
                                                                                {r}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.resistances || []).filter(x => x !== r);
                                                                                    updateEnemy(enemy.id, 'resistances', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.resistances || []).includes(val)) {
                                                                                    const updated = [...(enemy.resistances || []), val];
                                                                                    updateEnemy(enemy.id, 'resistances', updated);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(enemy.resistances || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Immunities */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label imm-lbl">Immunities (0 dmg)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.immunities || []).map(i => (
                                                                            <span key={i} className="damage-pill pill-immunity">
                                                                                {i}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.immunities || []).filter(x => x !== i);
                                                                                    updateEnemy(enemy.id, 'immunities', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.immunities || []).includes(val)) {
                                                                                    const updated = [...(enemy.immunities || []), val];
                                                                                    updateEnemy(enemy.id, 'immunities', updated);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(enemy.immunities || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Vulnerabilities */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label vul-lbl">Vulnerabilities (2x dmg)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.vulnerabilities || []).map(v => (
                                                                            <span key={v} className="damage-pill pill-vulnerability">
                                                                                {v}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.vulnerabilities || []).filter(x => x !== v);
                                                                                    updateEnemy(enemy.id, 'vulnerabilities', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.vulnerabilities || []).includes(val)) {
                                                                                    const updated = [...(enemy.vulnerabilities || []), val];
                                                                                    updateEnemy(enemy.id, 'vulnerabilities', updated);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(enemy.vulnerabilities || []).includes(t)).map(t => (
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
                                                                        {(enemy.ccResistances || []).map(r => (
                                                                            <span key={r} className="damage-pill pill-resistance">
                                                                                {r}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.ccResistances || []).filter(x => x !== r);
                                                                                    updateEnemy(enemy.id, 'ccResistances', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.ccResistances || []).includes(val)) {
                                                                                    updateEnemy(enemy.id, 'ccResistances', [...(enemy.ccResistances || []), val]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {ALL_CC_EFFECTS.filter(t => !(enemy.ccResistances || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* CC Immunities */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label imm-lbl">CC Immunities (cannot be affected)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.ccImmunities || []).map(i => (
                                                                            <span key={i} className="damage-pill pill-immunity">
                                                                                {i}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.ccImmunities || []).filter(x => x !== i);
                                                                                    updateEnemy(enemy.id, 'ccImmunities', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.ccImmunities || []).includes(val)) {
                                                                                    updateEnemy(enemy.id, 'ccImmunities', [...(enemy.ccImmunities || []), val]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {ALL_CC_EFFECTS.filter(t => !(enemy.ccImmunities || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* CC Vulnerabilities */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label vul-lbl">CC Vulnerabilities (disadv. on save)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.ccVulnerabilities || []).map(v => (
                                                                            <span key={v} className="damage-pill pill-vulnerability">
                                                                                {v}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.ccVulnerabilities || []).filter(x => x !== v);
                                                                                    updateEnemy(enemy.id, 'ccVulnerabilities', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.ccVulnerabilities || []).includes(val)) {
                                                                                    updateEnemy(enemy.id, 'ccVulnerabilities', [...(enemy.ccVulnerabilities || []), val]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {ALL_CC_EFFECTS.filter(t => !(enemy.ccVulnerabilities || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* COMBAT */}
                                                    <div className="combat-tab-content integrated-combat">
                                                        <div className="combat-stats-row mini-combat-row">
                                                            <div className="combat-stat-box">
                                                                <label>AC</label>
                                                                <input
                                                                    type="number"
                                                                    className="input combat-input"
                                                                    value={enemy.ac}
                                                                    onChange={e => updateEnemy(enemy.id, 'ac', parseInt(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                            <div className="combat-stat-box">
                                                                <label>Max HP</label>
                                                                <input
                                                                    type="number"
                                                                    className="input combat-input"
                                                                    value={enemy.hpMax}
                                                                    onChange={e => {
                                                                        const v = Math.max(1, parseInt(e.target.value) || 1);
                                                                        setEnemies(prev => prev.map(item => item.id === enemy.id ? { ...item, hpMax: v, hp: Math.min(item.hp, v) } : item));
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="combat-stat-box">
                                                                <label>Prof Bonus</label>
                                                                <input
                                                                    type="number"
                                                                    className="input combat-input"
                                                                    value={enemy.proficiency !== undefined ? enemy.proficiency : 2}
                                                                    onChange={e => updateEnemy(enemy.id, 'proficiency', parseInt(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                            <div className="combat-stat-box" style={{ flex: 2 }}>
                                                                <label>Type / CR / Notes</label>
                                                                <input
                                                                    className="input combat-input"
                                                                    value={enemy.background || ''}
                                                                    onChange={e => updateEnemy(enemy.id, 'background', e.target.value)}
                                                                    placeholder="e.g. Undead, CR 2, Legendary"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="carrying-capacity mini-capacity">
                                                            <h4>Carrying</h4>
                                                            <div className="capacity-bar">
                                                                Max Load: {(enemy.str || 10) * 15} lbs<br />
                                                                Push/Drag: {(enemy.str || 10) * 30} lbs
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
  );
}
