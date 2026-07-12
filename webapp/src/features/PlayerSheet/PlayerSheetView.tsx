import React, { useState, useEffect } from 'react';
import type { IPlayer, IEquipment, ISubclass, IAppConfig } from '@/types';
import type { MasterClass, MasterRace } from '@/services/compendium/fiveETools/types';
import { getAvailableChoices, isChoiceResolved } from '@/features/battle/utils/choiceEngine';
import PendingChoices from '@/features/battle/components/PendingChoices';
import { getActiveTraits } from '@/features/battle/utils/traitUtils';
import { calculateDerivedStats } from '@/shared/utils/statsEngine';
import PlayerAttributes from '@/features/PlayerCard/components/PlayerAttributes';
import { AccordionContainer, AccordionGroup, AccordionItem } from '@/shared/components/Accordion/Accordion';
import SearchableCombobox from '@/shared/components/SearchableCombobox/SearchableCombobox';
import { getLevelInfo } from '@/features/battle/utils/partyUtils';
import usePartyState from '@/features/battle/hooks/usePartyState';
import type { LogicBlock } from '@/types/domain';
import type { IBuff } from '@/types';

interface IPlayerSheetViewProps {
    players: IPlayer[];
    updatePlayers: (players: IPlayer[]) => void;
    activeSheetPlayerId: string | null;
    setActiveSheetPlayerId: (id: string | null) => void;
    equipment: IEquipment;
    subclasses: ISubclass[];
    logicBlocks?: LogicBlock[];
    buffsDatabase: IBuff[];
    config: IAppConfig;
    compendiumClasses?: MasterClass[];
    compendiumSubclasses?: ISubclass[];
    compendiumRaces?: MasterRace[];
}

export default function PlayerSheetView({
    players,
    updatePlayers,
    activeSheetPlayerId,
    setActiveSheetPlayerId,
    equipment,
    subclasses,
    logicBlocks,
    buffsDatabase,
    config,
    compendiumClasses,
    compendiumSubclasses,
    compendiumRaces
}: IPlayerSheetViewProps) {
    const [xpModalType, setXpModalType] = useState<'flat' | 'pct'>('flat');
    const [xpInputValue, setXpInputValue] = useState('');
    const [isXpModalOpen, setIsXpModalOpen] = useState(false);

    // Initialize party state for the sheet view calculations
    const party = usePartyState({
        data: players,
        updateData: updatePlayers,
        equipment,
        subclasses,
        logicBlocks,
        buffsDatabase,
        config,
        battleMode: false,
        compendiumClasses,
        compendiumSubclasses,
        compendiumRaces
    });

    const { 
        updatePlayer, calculateModifier, calculateMaxHP, calculateMaxMana, 
        playerUsesVampire, getDefaultManaModifier, statsList, getEquipmentBonus, 
        effectiveStat, formatModifier 
    } = party;

    // Ensure we have a valid player selected
    useEffect(() => {
        if (!activeSheetPlayerId && players.length > 0) {
            setActiveSheetPlayerId(players[0].id);
        } else if (activeSheetPlayerId && !players.find(p => p.id === activeSheetPlayerId)) {
            setActiveSheetPlayerId(players[0]?.id || null);
        }
    }, [activeSheetPlayerId, players, setActiveSheetPlayerId]);

    const player = players.find(p => p.id === activeSheetPlayerId);

    if (!player) {
        return (
            <div className="centered-placeholder">
                <div className="glass-panel">
                    <p className="text-secondary">No player selected or available.</p>
                </div>
            </div>
        );
    }

    const selectedRace = (compendiumRaces ?? []).find(r => r.entityKey === player.race) as MasterRace | undefined;
    const selectedSubrace = selectedRace?.subraces?.find(sr => sr.entityKey === player.subraceId);
    const selectedClass = (compendiumClasses ?? []).find(c => c.entityKey === player.classType) as MasterClass | undefined;

    const allChoices = getAvailableChoices(player, selectedRace, selectedSubrace, selectedClass);
    const unresolvedChoices = allChoices.filter(c => !isChoiceResolved(c, player.resolvedChoices));

    const computedPlayer = calculateDerivedStats(player, selectedRace, selectedClass);

    return (
        <div className="app-wrapper">
            <div className="main-content" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="player-sheet-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)' }}>Party Sheet</h2>
                    <select
                        className="input"
                        value={activeSheetPlayerId || ''}
                        onChange={e => setActiveSheetPlayerId(e.target.value)}
                        style={{ minWidth: '200px' }}
                    >
                        {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                        {player.name}'s Details
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Basics Section */}
                        <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Identity</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="rp-field full-width">
                                    <label>Background / Alignment</label>
                                    <input
                                        className="input"
                                        value={player.background || ''}
                                        onChange={e => updatePlayer(player.id, 'background', e.target.value)}
                                        placeholder="e.g. Human Fighter, Acolyte, LG"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class</label>
                                        <SearchableCombobox
                                            options={[
                                                { label: 'Default', value: 'Default' },
                                                ...(compendiumClasses || [])
                                                    .slice()
                                                    .sort((a,b) => a.name.localeCompare(b.name))
                                                    .map(cls => ({ label: cls.name, value: cls.entityKey }))
                                            ]}
                                            value={compendiumClasses?.find(c => c.entityKey === player.classType)?.name || (player.classType === 'Default' || player.classType === 'Class' ? '' : player.classType) || ''}
                                            onChange={val => {
                                                const match = compendiumClasses?.find(c => c.entityKey === val || c.name === val);
                                                updatePlayer(player.id, 'classType', match ? match.entityKey : (val || 'Default'));
                                            }}
                                            placeholder="Select Class..."
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subclass</label>
                                        <SearchableCombobox
                                            options={(compendiumSubclasses || [])
                                                .filter(sub => !player.classType || player.classType === 'Default' || sub.classId === player.classType)
                                                .map(sub => ({ label: sub.name, value: sub.entityKey }))}
                                            value={compendiumSubclasses?.find(s => s.entityKey === player.subclassId)?.name || player.subclassId || ''}
                                            onChange={val => {
                                                const match = compendiumSubclasses?.find(s => s.entityKey === val || s.name === val);
                                                updatePlayer(player.id, 'subclassId', match ? match.entityKey : (val || null));
                                            }}
                                            placeholder="Select Subclass..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Optional Subclass</label>
                                    <SearchableCombobox
                                        options={(compendiumSubclasses || [])
                                            .filter(sub => sub.entityKey !== player.subclassId)
                                            .map(sub => ({ label: sub.name, value: sub.entityKey }))}
                                        value={compendiumSubclasses?.find(s => s.entityKey === player.optionalSubclassId)?.name || player.optionalSubclassId || ''}
                                        onChange={val => {
                                            const match = compendiumSubclasses?.find(s => s.entityKey === val || s.name === val);
                                            updatePlayer(player.id, 'optionalSubclassId', match ? match.entityKey : (val || null));
                                        }}
                                        placeholder="Select Optional Subclass..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Progression</h3>
                            
                            <div className="stat-block mt-2">
                                <div className="stat-label">
                                    <span>EXP to Level {getLevelInfo(player.xp).level + 1}</span>
                                    <span>{player.xp} / {getLevelInfo(player.xp).nextLevelXp || "Max"}</span>
                                </div>
                                <div className="stat-bar-bg xp-bg" style={{ marginBottom: '0.5rem' }}>
                                    <div
                                        className="stat-bar-fill xp-fill"
                                        style={{
                                            width: `${getLevelInfo(player.xp).nextLevelXp ? ((player.xp - getLevelInfo(player.xp).currentLevelXp) / (getLevelInfo(player.xp).nextLevelXp - getLevelInfo(player.xp).currentLevelXp)) * 100 : 100}%`
                                        }}
                                    />
                                </div>
                                <div className="stat-controls exp-controls">
                                    <button onClick={() => { setIsXpModalOpen(true); setXpModalType('flat'); setXpInputValue(''); }}>Give XP</button>
                                    <button onClick={() => { setIsXpModalOpen(true); setXpModalType('pct'); setXpInputValue(''); }}>Give XP %</button>
                                    <button className="btn-success" onClick={() => {
                                        const info = getLevelInfo(player.xp);
                                        if (info.nextLevelXp) updatePlayer(player.id, 'xp', info.nextLevelXp);
                                    }}>Level Up</button>
                                </div>

                                {isXpModalOpen && (
                                    <div className="damage-heal-modal" style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-sm)' }}>
                                        <input
                                            type="number"
                                            className="input dh-input"
                                            value={xpInputValue}
                                            onChange={e => setXpInputValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = parseInt(xpInputValue);
                                                    if (isNaN(val)) { setIsXpModalOpen(false); return; }
                                                    if (xpModalType === 'flat') {
                                                        updatePlayer(player.id, 'xp', Math.max(0, player.xp + val));
                                                    } else {
                                                        const info = getLevelInfo(player.xp);
                                                        if (info.nextLevelXp) {
                                                            const req = info.nextLevelXp - info.currentLevelXp;
                                                            updatePlayer(player.id, 'xp', Math.max(0, player.xp + Math.floor(req * (val / 100))));
                                                        }
                                                    }
                                                    setIsXpModalOpen(false);
                                                    setXpInputValue('');
                                                }
                                                if (e.key === 'Escape') { setIsXpModalOpen(false); setXpInputValue(''); }
                                            }}
                                            placeholder={xpModalType === 'flat' ? 'Flat XP (neg to remove)' : 'XP % (e.g. 10, -10)'}
                                            autoFocus
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button className="btn btn-primary small-btn" onClick={() => {
                                                const val = parseInt(xpInputValue);
                                                if (isNaN(val)) { setIsXpModalOpen(false); return; }
                                                if (xpModalType === 'flat') {
                                                    updatePlayer(player.id, 'xp', Math.max(0, player.xp + val));
                                                } else {
                                                    const info = getLevelInfo(player.xp);
                                                    if (info.nextLevelXp) {
                                                        const req = info.nextLevelXp - info.currentLevelXp;
                                                        updatePlayer(player.id, 'xp', Math.max(0, player.xp + Math.floor(req * (val / 100))));
                                                    }
                                                }
                                                setIsXpModalOpen(false);
                                                setXpInputValue('');
                                            }}>Apply</button>
                                            <button className="btn small-btn" onClick={() => { setIsXpModalOpen(false); setXpInputValue(''); }}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {unresolvedChoices.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <PendingChoices
                                        choices={unresolvedChoices}
                                        currentSelections={player.resolvedChoices}
                                        onCommit={selections => {
                                            updatePlayer(player.id, 'resolvedChoices' as keyof IPlayer, selections);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Combat Setup Section */}
                        <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Combat Setup</h3>
                            <div className="combat-tab-content integrated-combat" style={{ padding: 0, background: 'transparent' }}>
                                <div className="combat-stats-row mini-combat-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                                    <div className="combat-stat-box">
                                        <label>Current HP</label>
                                        <div className="combat-input calculated-stat" style={{ color: player.hpCurrent <= 0 ? 'var(--danger)' : 'inherit' }}>
                                            {player.hpCurrent} <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>/ {calculateMaxHP(player)}</span>
                                        </div>
                                    </div>
                                    <div className="combat-stat-box">
                                        <label>Base AC</label>
                                        <input
                                            type="number"
                                            className="input combat-input"
                                            value={player.ac}
                                            placeholder="10"
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
                                        <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
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
                                                    value={player.manaModifier ?? ''}
                                                    placeholder="Auto"
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        updatePlayer(player.id, 'manaModifier', val === '' ? null : (parseInt(val) || 0));
                                                    }}
                                                />
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {player.manaModifier != null ? 'Manual override' : 'Auto (spellcasting stat)'}
                                                </div>
                                            </div>
                                            <div className="combat-stat-box">
                                                <label>Max Mana</label>
                                                <div className="combat-input calculated-stat">{calculateMaxMana(player)}</div>
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
                            </div>

                            <div className="carrying-capacity mini-capacity" style={{ marginTop: '1rem' }}>
                                <h4>Capacity</h4>
                                <div className="capacity-bar">
                                    Max Load: {(player.str || 10) * 15} lbs <br />
                                    Push/Drag/Lift: {(player.str || 10) * 30} lbs
                                </div>
                            </div>
                        </div>

                        {/* Stats & Skills Section */}
                        <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Attributes & Proficiencies</h3>
                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <PlayerAttributes
                                    player={player}
                                    computedPlayer={computedPlayer}
                                    updatePlayer={updatePlayer}
                                    statsList={statsList as string[]}
                                    getEquipmentBonus={getEquipmentBonus}
                                    effectiveStat={effectiveStat}
                                    formatModifier={formatModifier}
                                    calculateModifier={calculateModifier}
                                />
                                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {computedPlayer.saves && Object.entries(computedPlayer.saves).some(([_, v]) => v) && (
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saving Throws: </span>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                                {Object.entries(computedPlayer.saves).filter(([_, v]) => v).map(([s]) => (
                                                    <span key={s} className="badge badge-outline text-xs">{s.toUpperCase()}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {computedPlayer.skills && Object.keys(computedPlayer.skills).length > 0 && (
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Skills: </span>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                                {Object.keys(computedPlayer.skills).map((s) => (
                                                    <span key={s} className="badge badge-outline text-xs">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {(computedPlayer.resistances || []).length > 0 && (
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resistances: </span>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                                {computedPlayer.resistances?.map((r) => (
                                                    <span key={r} className="badge badge-outline text-xs" style={{ borderColor: '#fb923c', color: '#fb923c' }}>{r}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(computedPlayer.immunities || []).length > 0 && (
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Immunities: </span>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                                {computedPlayer.immunities?.map((i) => (
                                                    <span key={i} className="badge badge-outline text-xs" style={{ borderColor: '#4ade80', color: '#4ade80' }}>{i}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(computedPlayer.languages || []).length > 0 && (
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Languages: </span>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                                {computedPlayer.languages?.map((l) => (
                                                    <span key={l} className="badge badge-outline text-xs" style={{ borderColor: '#a855f7', color: '#a855f7' }}>{l}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Features & Traits (Text Area) */}
                        <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Lore & Notes</h3>
                            <div className="rp-field full-width stats-skills-features">
                                <label>Features & Traits</label>
                                <textarea
                                    className="input rp-textarea mini-textarea"
                                    style={{ minHeight: '120px' }}
                                    value={player.features || ''}
                                    onChange={e => updatePlayer(player.id, 'features', e.target.value)}
                                    placeholder="List notable feats, darkvision, or personal backstory notes..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Features Accordion */}
                    {(() => {
                        if (!compendiumClasses || !compendiumRaces) return null;
                        const activeTraits = getActiveTraits(player, compendiumClasses, compendiumSubclasses || [], compendiumRaces);
                        if (activeTraits.length === 0) return null;
                        
                        const groupedTraits = activeTraits.reduce((acc, trait) => {
                            const src = trait.source || 'Other';
                            if (!acc[src]) acc[src] = [];
                            acc[src].push(trait);
                            return acc;
                        }, {} as Record<string, typeof activeTraits>);

                        return (
                            <div className="subclass-player-section glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                                <div className="text-xs font-bold uppercase mb-4" style={{ color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                    Derived Features & Traits (Read-Only)
                                </div>
                                <AccordionContainer>
                                    {Object.entries(groupedTraits).map(([source, traits]) => (
                                        <AccordionGroup key={source} title={`${source} Features`}>
                                            {traits.map((trait, idx) => (
                                                <AccordionItem key={`${source}-${trait.name}-${idx}`} summary={trait.name}>
                                                    {trait.stats && (
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {trait.stats.acBonus && <span className="badge badge-outline text-xs">AC +{trait.stats.acBonus}</span>}
                                                            {trait.stats.hpMaxBonus && <span className="badge badge-outline text-xs">HP +{trait.stats.hpMaxBonus}</span>}
                                                            {trait.stats.speedBonus && <span className="badge badge-outline text-xs">Speed +{trait.stats.speedBonus}</span>}
                                                            {trait.stats.resistances && trait.stats.resistances.map(r => <span key={r} className="badge badge-outline text-xs" style={{ color: '#fb923c' }}>Resist: {r}</span>)}
                                                            {trait.stats.immunities && trait.stats.immunities.map(i => <span key={i} className="badge badge-outline text-xs" style={{ color: '#4ade80' }}>Immune: {i}</span>)}
                                                            {trait.stats.vulnerabilities && trait.stats.vulnerabilities.map(v => <span key={v} className="badge badge-outline text-xs" style={{ color: '#ef4444' }}>Vuln: {v}</span>)}
                                                        </div>
                                                    )}
                                                    {trait.desc && (
                                                        <p className="text-xs max-w-prose leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                                                            {trait.desc}
                                                        </p>
                                                    )}
                                                </AccordionItem>
                                            ))}
                                        </AccordionGroup>
                                    ))}
                                </AccordionContainer>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
