import React from 'react';
import {
  calculateEffectiveAC,
  calculateEffectiveEnemyAC,
  getDamageModifierBreakdown,
  extractExtraEffects,
  getSaveModifiers,
  getAttackAdvantageState,
} from '../../../shared/utils/combatUtils';

export default function AttackResolutionModal({
  party, combat, equipment, buffsDatabase,
}) {
  const { data, getPlayerSubclass, getLevelInfo, calculateMaxHP } = party;
  const {
    activeAttackState, setActiveAttackState, autoRollEnabled, setAutoRollEnabled,
    executeAttack, enemies,
  } = combat;

  if (!activeAttackState) return null;

  const { mode = 'enemy-vs-player', attacker, attack, selectedTargets, rollResults } = activeAttackState;
  const isPlayerAttack = mode === 'player-vs-enemy';
  const activePlayers = data.filter(p => p.inParty);
  const isSave = typeof attack.dc === 'number' || (attack.dc && !isNaN(parseInt(attack.dc)));

  return (
                    <div className="global-modal-overlay" onClick={() => setActiveAttackState(null)}>
                        <div className="damage-heal-popup attack-resolution-popup glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '90%' }}>
                            <div className="attack-popup-header" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>⚔️ Resolve Attack: {attack.name}</h3>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Used by <strong>{attacker.name}</strong> {isSave ? (
                                        <>• DC: <strong>{attack.dc} {attack.save}</strong></>
                                    ) : (
                                        <>• Modifier: <strong>+{attack.toHit}</strong> to hit</>
                                    )}
                                </p>
                                {attack.description && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic', lineHeight: '1.4', wordBreak: 'break-word', maxHeight: '120px', overflowY: 'auto' }}>
                                        {attack.description}
                                    </div>
                                )}
                                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {attack.reach && <span>Reach: {attack.reach} &nbsp;·&nbsp; </span>}
                                    {attack.range && <span>Range: {attack.range} &nbsp;·&nbsp; </span>}
                                    {attack.damage && attack.damage.length > 0 && <span>Damage: {attack.damage.map(d => `${d.formula} ${d.type}`).join(' + ')} &nbsp;·&nbsp; </span>}
                                    {isSave && <span>Half on save: {attack.halfOnSuccess ? 'Yes' : 'No'}</span>}
                                </div>
                            </div>

                            {!rollResults ? (
                                /* TARGET SELECTION PHASE */
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <h4 style={{ fontSize: '0.95rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                            {autoRollEnabled ? 'Select Targets:' : (isSave ? 'Flag Saving Throws:' : 'Flag Attacks:')}
                                        </h4>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                            <input
                                                type="checkbox"
                                                checked={autoRollEnabled}
                                                onChange={e => setAutoRollEnabled(e.target.checked)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            🎲 Auto-Roll in App
                                        </label>
                                    </div>
                                    <div className="targets-checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1.25rem' }}>
                                        {isPlayerAttack ? enemies.map(enemy => {
                                            if (autoRollEnabled) {
                                                const isChecked = !!selectedTargets[enemy.id];
                                                return (
                                                    <div
                                                        key={enemy.id}
                                                        className={`target-checklist-row ${isChecked ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setActiveAttackState(prev => ({
                                                                ...prev,
                                                                selectedTargets: {
                                                                    ...prev.selectedTargets,
                                                                    [enemy.id]: !prev.selectedTargets[enemy.id]
                                                                }
                                                            }));
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                            padding: '0.6rem 0.8rem',
                                                            background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                                            border: isChecked ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)'
                                                        }}
                                                    >
                                                        <input type="checkbox" checked={isChecked} onChange={() => { }} style={{ cursor: 'pointer' }} />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: '500' }}>{enemy.name}</span>
                                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                                                    <span style={{ color: 'var(--text-secondary)' }}>🛡️ AC {calculateEffectiveEnemyAC(enemy, buffsDatabase)}</span>
                                                                    <span style={{ color: enemy.hp <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                                                        ❤️ {enemy.hp} / {enemy.hpMax}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            const status = selectedTargets[enemy.id] || 'none';
                                            return (
                                                <div key={enemy.id} className="target-checklist-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>{enemy.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AC {calculateEffectiveEnemyAC(enemy, buffsDatabase)} · HP {enemy.hp}/{enemy.hpMax}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button type="button" className="btn" onClick={() => setActiveAttackState(prev => ({ ...prev, selectedTargets: { ...prev.selectedTargets, [enemy.id]: 'none' } }))} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>None</button>
                                                        <button type="button" className="btn" onClick={() => setActiveAttackState(prev => ({ ...prev, selectedTargets: { ...prev.selectedTargets, [enemy.id]: 'success' } }))} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>{isSave ? 'Save' : 'Miss'}</button>
                                                        <button type="button" className="btn" onClick={() => setActiveAttackState(prev => ({ ...prev, selectedTargets: { ...prev.selectedTargets, [enemy.id]: 'fail' } }))} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>{isSave ? 'Fail' : 'Hit'}</button>
                                                    </div>
                                                </div>
                                            );
                                        }) : activePlayers.map(player => {
                                            if (autoRollEnabled) {
                                                const isChecked = !!selectedTargets[player.id];
                                                return (
                                                    <div
                                                        key={player.id}
                                                        className={`target-checklist-row ${isChecked ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setActiveAttackState(prev => ({
                                                                ...prev,
                                                                selectedTargets: {
                                                                    ...prev.selectedTargets,
                                                                    [player.id]: !prev.selectedTargets[player.id]
                                                                }
                                                            }));
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem',
                                                            padding: '0.6rem 0.8rem',
                                                            background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                                            border: isChecked ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            cursor: 'pointer',
                                                            transition: 'var(--transition)'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => { }} // Row click handles it
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: '500' }}>{player.name}</span>
                                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                                                    <span style={{ color: 'var(--text-secondary)' }}>🛡️ AC {calculateEffectiveAC(player, equipment, buffsDatabase)}</span>
                                                                    <span style={{ color: player.hpCurrent <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                                                        ❤️ {player.hpCurrent}{player.hpTemp > 0 && (
                                                                            <span style={{ color: '#60a5fa', marginLeft: '0.25rem' }}>
                                                                                (+{player.hpTemp})
                                                                            </span>
                                                                        )} / {calculateMaxHP(player)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {/* Combat info strip */}
                                                            {(() => {
                                                                const extraEffect = attack.cc === 'custom' ? attack.ccCustom : (attack.cc || extractExtraEffects(attack.description));
                                                                const saveStat = (attack.save || 'Dexterity').toLowerCase();
                                                                const statKey = saveStat.substring(0, 3);
                                                                const saveMods = getSaveModifiers(player, extraEffect, equipment, buffsDatabase, statKey);
                                                                const advState = isSave ? saveMods.advantageState : getAttackAdvantageState(attack, player, equipment, buffsDatabase);
                                                                const subclassData = getPlayerSubclass(player);
                                                                const dmgBreakdowns = (attack.damage || []).map(comp => ({ type: comp.type, ...getDamageModifierBreakdown(comp.type, player, equipment, subclassData) }));
                                                                const activeCc = player.cc || [];
                                                                const advColor = advState === 'advantage' ? '#34d399' : advState === 'disadvantage' ? '#f87171' : 'var(--text-muted)';

                                                                let advLabel = '→ Normal Roll';
                                                                if (isSave) {
                                                                    advLabel = advState === 'advantage' ? '▲ Save Adv.' : advState === 'disadvantage' ? '▼ Save Disadv.' : '→ Save Normal';
                                                                } else {
                                                                    advLabel = advState === 'advantage' ? '▲ Advantage' : advState === 'disadvantage' ? '▼ Disadvantage' : '→ Normal Roll';
                                                                }

                                                                return (
                                                                    <div style={{ marginTop: '0.3rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.7rem' }}>
                                                                        {activeCc.length > 0 && (
                                                                            <span style={{ color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '10px', padding: '0.1rem 0.45rem' }}>
                                                                                {activeCc.join(' · ')}
                                                                            </span>
                                                                        )}
                                                                        {dmgBreakdowns.filter(b => b.charLabel || b.itemLabel).map((b, i) => (
                                                                            <span key={i} style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.1rem 0.45rem' }}>
                                                                                {b.type}: {[b.charLabel && `Char:${b.charLabel}`, b.itemLabel && `Item:${b.itemLabel}`].filter(Boolean).join(' ')} → {b.overallLabel}
                                                                            </span>
                                                                        ))}
                                                                        {isSave && saveMods.saveBonus !== 0 && (
                                                                            <span style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '10px', padding: '0.1rem 0.45rem', fontWeight: '600' }}>
                                                                                {saveMods.saveBonus > 0 ? `+${saveMods.saveBonus}` : saveMods.saveBonus} to save
                                                                            </span>
                                                                        )}
                                                                        <span style={{ color: advColor, background: `${advColor}18`, border: `1px solid ${advColor}44`, borderRadius: '10px', padding: '0.1rem 0.45rem', fontWeight: '600' }}>
                                                                            {advLabel}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                const status = selectedTargets[player.id] || 'none';
                                                const getRowStyles = () => {
                                                    if (status === 'fail') {
                                                        return {
                                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                                            background: 'rgba(239, 68, 68, 0.08)'
                                                        };
                                                    } else if (status === 'success') {
                                                        return {
                                                            border: '1px solid rgba(16, 185, 129, 0.4)',
                                                            background: 'rgba(16, 185, 129, 0.08)'
                                                        };
                                                    } else {
                                                        return {
                                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                                            background: 'rgba(255, 255, 255, 0.02)'
                                                        };
                                                    }
                                                };
                                                const rowStyles = getRowStyles();

                                                const setTargetStatus = (playerId, newStatus) => {
                                                    setActiveAttackState(prev => ({
                                                        ...prev,
                                                        selectedTargets: {
                                                            ...prev.selectedTargets,
                                                            [playerId]: newStatus
                                                        }
                                                    }));
                                                };

                                                return (
                                                    <div
                                                        key={player.id}
                                                        className="target-checklist-row"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.6rem 0.8rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            cursor: 'default',
                                                            transition: 'var(--transition)',
                                                            ...rowStyles
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: '500' }}>{player.name}</div>
                                                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>🛡️ AC {calculateEffectiveAC(player, equipment, buffsDatabase)}</span>
                                                                <span style={{ color: player.hpCurrent <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                                                    ❤️ {player.hpCurrent}{player.hpTemp > 0 && (
                                                                        <span style={{ color: '#60a5fa', marginLeft: '0.25rem' }}>
                                                                            (+{player.hpTemp})
                                                                        </span>
                                                                    )} / {calculateMaxHP(player)}
                                                                </span>
                                                            </div>
                                                            {/* Combat info strip for manual mode */}
                                                            {(() => {
                                                                const dmgBreakdowns = (attack.damage || []).map(comp => ({ type: comp.type, ...getDamageModifierBreakdown(comp.type, player, equipment, getPlayerSubclass(player)) }));
                                                                const activeCc = player.cc || [];
                                                                return (activeCc.length > 0 || dmgBreakdowns.some(b => b.charLabel || b.itemLabel)) && (
                                                                    <div style={{ marginTop: '0.3rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.68rem' }}>
                                                                        {activeCc.length > 0 && (
                                                                            <span style={{ color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '10px', padding: '0.1rem 0.4rem' }}>
                                                                                {activeCc.join(' · ')}
                                                                            </span>
                                                                        )}
                                                                        {dmgBreakdowns.filter(b => b.charLabel || b.itemLabel).map((b, i) => (
                                                                            <span key={i} style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.1rem 0.4rem' }}>
                                                                                {b.type}: {[b.charLabel && `Char:${b.charLabel}`, b.itemLabel && `Item:${b.itemLabel}`].filter(Boolean).join(' ')} → {b.overallLabel}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button
                                                                className="btn"
                                                                onClick={() => setTargetStatus(player.id, 'none')}
                                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: status === 'none' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                            >
                                                                None
                                                            </button>
                                                            <button
                                                                className="btn"
                                                                onClick={() => setTargetStatus(player.id, 'success')}
                                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: status === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(0,0,0,0.2)', color: status === 'success' ? 'var(--success)' : 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                            >
                                                                {isSave ? 'Save 🛡️' : 'Miss 💨'}
                                                            </button>
                                                            <button
                                                                className="btn"
                                                                onClick={() => setTargetStatus(player.id, 'fail')}
                                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: status === 'fail' ? 'rgba(239,68,68,0.25)' : 'rgba(0,0,0,0.2)', color: status === 'fail' ? 'var(--danger)' : 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                            >
                                                                {isSave ? 'Fail 💥' : 'Hit 🎯'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                        {activePlayers.length === 0 && !isPlayerAttack && (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                No active party members. Toggle some players on!
                                            </div>
                                        )}
                                        {enemies.length === 0 && isPlayerAttack && (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                No enemies in battle. Add enemies first!
                                            </div>
                                        )}
                                    </div>

                                    <div className="popup-actions" style={{ marginTop: '1rem' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={executeAttack}
                                            disabled={(isPlayerAttack ? enemies.length === 0 : activePlayers.length === 0) || Object.keys(selectedTargets).filter(id => selectedTargets[id] && selectedTargets[id] !== 'none').length === 0}
                                            style={{ flex: 1 }}
                                        >
                                            {autoRollEnabled ? (isSave ? '🎲 Roll Saves' : '🎲 Roll Attacks') : 'Apply Resolution'}
                                        </button>
                                        <button className="btn" onClick={() => setActiveAttackState(null)}>Cancel</button>
                                    </div>
                                </>
                            ) : (
                                /* ROLL RESULTS PHASE */
                                <>
                                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Roll Results:</h4>
                                    <div className="attack-results-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1.25rem' }}>
                                        {rollResults.map(res => {
                                            const isCrit = res.resultType === 'crit';
                                            const isCritMiss = res.resultType === 'crit_miss';
                                            const isHit = res.resultType === 'hit' || isCrit || res.resultType === 'save_failed' || (res.resultType === 'save_success' && res.totalDamageApplied > 0);

                                            let badgeBg = 'rgba(239, 68, 68, 0.15)'; // red for miss
                                            let badgeColor = 'var(--danger)';
                                            let badgeLabel = res.isSave ? 'FAILED 💥' : 'MISS 💨';

                                            if (res.isSave) {
                                                if (res.resultType === 'save_success') {
                                                    badgeBg = 'rgba(16, 185, 129, 0.15)'; // green for success
                                                    badgeColor = 'var(--success)';
                                                    badgeLabel = 'SAVED 🛡️';
                                                }
                                            } else {
                                                if (isCrit) {
                                                    badgeBg = 'rgba(245, 158, 11, 0.25)'; // gold for crit
                                                    badgeColor = 'var(--warning)';
                                                    badgeLabel = 'CRIT HIT! 🌟';
                                                } else if (isCritMiss) {
                                                    badgeBg = 'rgba(239, 68, 68, 0.3)';
                                                    badgeColor = '#f87171';
                                                    badgeLabel = 'CRIT MISS! ❌';
                                                } else if (isHit) {
                                                    badgeBg = 'rgba(16, 185, 129, 0.15)'; // green for hit
                                                    badgeColor = 'var(--success)';
                                                    badgeLabel = 'HIT! 🎯';
                                                }
                                            }

                                            return (
                                                <div
                                                    key={res.playerId || res.enemyId}
                                                    className="result-row-card"
                                                    style={{
                                                        padding: '0.75rem',
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                                        borderRadius: 'var(--radius-sm)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                        <strong style={{ fontSize: '1rem' }}>{res.playerName || res.enemyName}</strong>
                                                        <span
                                                            style={{
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 'bold',
                                                                background: badgeBg,
                                                                color: badgeColor
                                                            }}
                                                        >
                                                            {badgeLabel}
                                                        </span>
                                                    </div>

                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <div>
                                                            {res.d20 === null ? (
                                                                res.isSave ? (
                                                                    <>
                                                                        Save (<strong>{res.saveStat.toUpperCase()}</strong>): <strong>Manual Resolution</strong> vs DC {res.dc}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Roll: <strong>Manual Resolution</strong> vs AC {res.ac}
                                                                    </>
                                                                )
                                                            ) : (
                                                                res.isSave ? (
                                                                    <>
                                                                        Save (<strong>{res.saveStat.toUpperCase()}</strong>): <strong>d20 ({res.d20})</strong> + {res.saveBonus} = <strong>{res.totalRoll}</strong> vs DC {res.dc}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {res.advantageState && res.advantageState !== 'normal' && res.d20Rolls && res.d20Rolls.length === 2 ? (
                                                                            <>
                                                                                Roll: <span style={{ color: res.advantageState === 'advantage' ? '#34d399' : '#f87171', fontWeight: 600, fontSize: '0.75rem' }}>
                                                                                    {res.advantageState === 'advantage' ? '▲ Advantage' : '▼ Disadvantage'}
                                                                                </span>{' '}
                                                                                <strong>d20 ({res.d20Rolls[0]}|{res.d20Rolls[1]}, using {res.d20})</strong> + {res.toHit} = <strong>{res.totalRoll}</strong> vs AC {res.ac}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                Roll: <strong>d20 ({res.d20})</strong> + {res.toHit} = <strong>{res.totalRoll}</strong> vs AC {res.ac}
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )
                                                            )}
                                                        </div>
                                                        {isHit && (
                                                            <>
                                                                {res.totalDamageApplied > 0 && (
                                                                    <>
                                                                        <div style={{ color: 'var(--text-primary)' }}>
                                                                            Damage {isPlayerAttack ? 'Dealt' : 'Taken'}: <strong style={{ color: 'var(--danger)' }}>{res.totalDamageApplied}</strong>
                                                                        </div>
                                                                        {res.damageBreakdowns.map((b, idx) => (
                                                                            <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', paddingLeft: '0.5rem' }}>
                                                                                ↳ {b}
                                                                            </div>
                                                                        ))}
                                                                    </>
                                                                )}
                                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                                    <span>HP:</span>
                                                                    <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{res.originalHp}</span>
                                                                    <span>→</span>
                                                                    <span style={{ color: res.newHp <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{res.newHp}</span>
                                                                    <span>/ {res.maxHp}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {res.resolvedEffect && (
                                                            <div style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                                                ⚠️ Effect: <span style={{ textDecoration: 'underline' }}>{res.resolvedEffect}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="popup-actions" style={{ gap: '0.5rem' }}>
                                        <button className="btn btn-primary" onClick={() => setActiveAttackState(null)} style={{ flex: 1 }}>Close</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
  );
}
