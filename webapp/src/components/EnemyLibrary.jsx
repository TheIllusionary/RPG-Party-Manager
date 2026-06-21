import React, { useState } from 'react';
import './EnemyLibrary.css';
import defaultMonsters from './default_monsters.json';

const generateUniqueId = () => Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);

const DAMAGE_TYPES = [
    'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 
    'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'
];

export default function EnemyLibrary({ data, updateData }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedEnemyId, setExpandedEnemyId] = useState(null);
    const [expandedOriginalName, setExpandedOriginalName] = useState('');

    const addEnemy = () => {
        const newId = Date.now().toString();
        const newEnemy = {
            id: newId,
            name: 'New Monster',
            classType: 'Enemy',
            ac: 12,
            hpMax: 20,
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            proficiency: 2,
            background: 'CR 1',
            abilities: '',
            features: '',
            skills: {},
            saves: {},
            resistances: [],
            immunities: [],
            vulnerabilities: [],
            attacks: []
        };
        updateData([...data, newEnemy]);
        setExpandedEnemyId(newId);
        setExpandedOriginalName('New Monster');
    };

    const updateEnemy = (id, field, value) => {
        updateData(data.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const removeEnemy = (id) => {
        if (window.confirm("Delete this monster from the library?")) {
            if (expandedEnemyId === id) {
                setExpandedEnemyId(null);
                setExpandedOriginalName('');
            }
            updateData(data.filter(e => e.id !== id));
        }
    };

    const copyEnemy = (enemy) => {
        const newId = generateUniqueId();
        const copyName = `${enemy.name} (Copy)`;
        const newEnemy = {
            ...enemy,
            id: newId,
            name: copyName,
            isDefault: false
        };
        updateData([...data, newEnemy]);
        setExpandedEnemyId(newId);
        setExpandedOriginalName(copyName);
    };

    const getSortName = (e) => {
        if (e.id === expandedEnemyId) {
            return expandedOriginalName || e.name;
        }
        return e.name;
    };

    const sortedData = [...defaultMonsters, ...data].sort((a, b) => 
        getSortName(a).localeCompare(getSortName(b))
    );

    const filteredData = sortedData.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (e.background || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statsList = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const dndSkills = [
        { name: 'Acrobatics', stat: 'dex' }, { name: 'Animal Handling', stat: 'wis' },
        { name: 'Arcana', stat: 'int' }, { name: 'Athletics', stat: 'str' },
        { name: 'Deception', stat: 'cha' }, { name: 'History', stat: 'int' },
        { name: 'Insight', stat: 'wis' }, { name: 'Intimidation', stat: 'cha' },
        { name: 'Investigation', stat: 'int' }, { name: 'Medicine', stat: 'wis' },
        { name: 'Nature', stat: 'int' }, { name: 'Perception', stat: 'wis' },
        { name: 'Performance', stat: 'cha' }, { name: 'Persuasion', stat: 'cha' },
        { name: 'Religion', stat: 'int' }, { name: 'Sleight of Hand', stat: 'dex' },
        { name: 'Stealth', stat: 'dex' }, { name: 'Survival', stat: 'wis' }
    ];

    const calculateModifier = (score) => Math.floor(((score || 10) - 10) / 2);
    const formatModifier = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

    return (
        <div className="enemy-library-tab">
            <div className="library-header">
                <h2>Bestiary Database</h2>
                <button className="btn btn-primary" onClick={addEnemy}>+ Create Monster</button>
            </div>

            <div className="library-search-bar">
                <input 
                    type="text" 
                    className="input search-input" 
                    placeholder="🔍 Search monsters by name or type/CR..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="library-table-container glass-panel">
                <table className="library-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type / CR</th>
                            <th>Class</th>
                            <th>AC</th>
                            <th>Max HP</th>
                            <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(enemy => {
                            const isExpanded = expandedEnemyId === enemy.id;
                            const miniSprite = (enemy.classType || '').toLowerCase() === 'boss' ? 'boss' : 'enemy';
                            return (
                                <React.Fragment key={enemy.id}>
                                    <tr className={`monster-row ${isExpanded ? 'expanded-row' : ''}`}>
                                        <td className="monster-name-cell">
                                            <div className="monster-name-avatar">
                                                <img src={`./sprites/${miniSprite}.png`} alt={enemy.classType} className="monster-mini-sprite" />
                                                <strong>{enemy.name}</strong>
                                            </div>
                                        </td>
                                        <td>{enemy.background || 'CR 1'}</td>
                                        <td>
                                            <span className={`class-badge ${(enemy.classType || 'Enemy').toLowerCase()}`}>
                                                {enemy.classType || 'Enemy'}
                                            </span>
                                        </td>
                                        <td>🛡️ {enemy.ac}</td>
                                        <td>❤️ {enemy.hpMax || 20}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                            <button 
                                                className="btn btn-secondary small-btn" 
                                                onClick={() => copyEnemy(enemy)}
                                                style={{ marginRight: '0.5rem' }}
                                            >
                                                📋 Copy
                                            </button>
                                            {!enemy.isDefault ? (
                                                <>
                                                    <button 
                                                        className="btn btn-secondary small-btn" 
                                                        onClick={() => {
                                                            if (isExpanded) {
                                                                setExpandedEnemyId(null);
                                                                setExpandedOriginalName('');
                                                            } else {
                                                                setExpandedEnemyId(enemy.id);
                                                                setExpandedOriginalName(enemy.name);
                                                            }
                                                        }}
                                                        style={{ marginRight: '0.5rem' }}
                                                    >
                                                        {isExpanded ? '▲ Collapse' : '✏️ Edit'}
                                                    </button>
                                                    <button className="delete-btn" onClick={() => removeEnemy(enemy.id)}>×</button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '1rem', fontStyle: 'italic' }}>
                                                    🔒 Default
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="detail-expanded-row">
                                            <td colSpan={6}>
                                                <div className="monster-detailed-editor glass-panel">
                                                    <div className="editor-section-title" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Monster Name</label>
                                                            <input 
                                                                type="text" 
                                                                className="input" 
                                                                value={enemy.name} 
                                                                onChange={e => updateEnemy(enemy.id, 'name', e.target.value)} 
                                                                style={{ margin: 0, width: '100%', fontSize: '1.1rem', fontWeight: 'bold' }}
                                                            />
                                                        </div>
                                                        <div style={{ width: '120px' }}>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>CR</label>
                                                            <input 
                                                                type="text" 
                                                                className="input" 
                                                                value={enemy.cr || ''} 
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    updateEnemy(enemy.id, 'cr', val);
                                                                    const currentBg = enemy.background || '';
                                                                    const typePart = currentBg.split(', CR ')[0] || '';
                                                                    updateEnemy(enemy.id, 'background', typePart ? `${typePart}, CR ${val}` : `CR ${val}`);
                                                                }} 
                                                                    style={{ margin: 0, width: '100%', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
                                                                placeholder="e.g. 1/4"
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="rp-field full-width bestiary-abilities-field" style={{ marginBottom: '1.25rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>Abilities</label>
                                                        <textarea
                                                            className="input rp-textarea"
                                                            style={{ width: '100%', minHeight: '120px', fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: '1.4', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '6px' }}
                                                            value={enemy.abilities || ''}
                                                            onChange={e => updateEnemy(enemy.id, 'abilities', e.target.value)}
                                                            placeholder="Actions, attacks, multiattacks..."
                                                        />
                                                    </div>

                                                    {/* Structured Attacks Editor */}
                                                    <div className="rp-field full-width bestiary-attacks-editor" style={{ marginBottom: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 'bold' }}>Interactive Attacks (Overrides Raw Text Parser)</label>
                                                        
                                                        <div className="structured-attacks-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                            {(enemy.attacks || []).map((atk, idx) => (
                                                                <div key={idx} className="structured-attack-card" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                        <input
                                                                            type="text"
                                                                            className="input"
                                                                            placeholder="Attack Name (e.g. Bite)"
                                                                            value={atk.name}
                                                                            onChange={(e) => {
                                                                                const updated = [...(enemy.attacks || [])];
                                                                                updated[idx] = { ...atk, name: e.target.value };
                                                                                updateEnemy(enemy.id, 'attacks', updated);
                                                                            }}
                                                                            style={{ margin: 0, flex: 2 }}
                                                                        />
                                                                        <select
                                                                            className="input"
                                                                            value={atk.type || 'melee'}
                                                                            onChange={(e) => {
                                                                                const updated = [...(enemy.attacks || [])];
                                                                                updated[idx] = { ...atk, type: e.target.value };
                                                                                updateEnemy(enemy.id, 'attacks', updated);
                                                                            }}
                                                                            style={{ margin: 0, flex: 1 }}
                                                                        >
                                                                            <option value="melee">Melee</option>
                                                                            <option value="ranged">Ranged</option>
                                                                            <option value="melee/ranged">Melee/Ranged</option>
                                                                        </select>
                                                                        <button type="button" className="delete-btn" onClick={() => {
                                                                            const updated = (enemy.attacks || []).filter((_, i) => i !== idx);
                                                                            updateEnemy(enemy.id, 'attacks', updated);
                                                                        }} style={{ fontSize: '1.2rem', padding: '0.2rem 0.5rem' }}>×</button>
                                                                    </div>

                                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                        <div style={{ flex: 1, minWidth: '80px' }}>
                                                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.1rem' }}>To Hit</label>
                                                                            <input
                                                                                type="number"
                                                                                className="input"
                                                                                value={atk.toHit || 0}
                                                                                onChange={(e) => {
                                                                                    const updated = [...(enemy.attacks || [])];
                                                                                    updated[idx] = { ...atk, toHit: parseInt(e.target.value) || 0 };
                                                                                    updateEnemy(enemy.id, 'attacks', updated);
                                                                                }}
                                                                                style={{ margin: 0 }}
                                                                            />
                                                                        </div>
                                                                        <div style={{ flex: 1, minWidth: '80px' }}>
                                                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.1rem' }}>Reach</label>
                                                                            <input
                                                                                type="text"
                                                                                className="input"
                                                                                placeholder="e.g. 5 ft."
                                                                                value={atk.reach || ''}
                                                                                onChange={(e) => {
                                                                                    const updated = [...(enemy.attacks || [])];
                                                                                    updated[idx] = { ...atk, reach: e.target.value };
                                                                                    updateEnemy(enemy.id, 'attacks', updated);
                                                                                }}
                                                                                style={{ margin: 0 }}
                                                                            />
                                                                        </div>
                                                                        <div style={{ flex: 1, minWidth: '80px' }}>
                                                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.1rem' }}>Range</label>
                                                                            <input
                                                                                type="text"
                                                                                className="input"
                                                                                placeholder="e.g. 30/120 ft."
                                                                                value={atk.range || ''}
                                                                                onChange={(e) => {
                                                                                    const updated = [...(enemy.attacks || [])];
                                                                                    updated[idx] = { ...atk, range: e.target.value };
                                                                                    updateEnemy(enemy.id, 'attacks', updated);
                                                                                }}
                                                                                style={{ margin: 0 }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem' }}>
                                                                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Damage Component</label>
                                                                        {((atk.damage || [])).map((dmg, dIdx) => (
                                                                            <div key={dIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                                                <input
                                                                                    type="text"
                                                                                    className="input"
                                                                                    placeholder="Formula (e.g. 1d6+2)"
                                                                                    value={dmg.formula}
                                                                                    onChange={(e) => {
                                                                                        const updated = [...(enemy.attacks || [])];
                                                                                        const updatedDmg = [...(atk.damage || [])];
                                                                                        updatedDmg[dIdx] = { ...dmg, formula: e.target.value };
                                                                                        updated[idx] = { ...atk, damage: updatedDmg };
                                                                                        updateEnemy(enemy.id, 'attacks', updated);
                                                                                    }}
                                                                                    style={{ margin: 0, flex: 2 }}
                                                                                />
                                                                                <select
                                                                                    className="input"
                                                                                    value={dmg.type || 'slashing'}
                                                                                    onChange={(e) => {
                                                                                        const updated = [...(enemy.attacks || [])];
                                                                                        const updatedDmg = [...(atk.damage || [])];
                                                                                        updatedDmg[dIdx] = { ...dmg, type: e.target.value };
                                                                                        updated[idx] = { ...atk, damage: updatedDmg };
                                                                                        updateEnemy(enemy.id, 'attacks', updated);
                                                                                    }}
                                                                                    style={{ margin: 0, flex: 2 }}
                                                                                >
                                                                                    {DAMAGE_TYPES.map(t => (
                                                                                        <option key={t} value={t.toLowerCase()}>{t}</option>
                                                                                    ))}
                                                                                </select>
                                                                                <button type="button" className="delete-btn" onClick={() => {
                                                                                    const updated = [...(enemy.attacks || [])];
                                                                                    const updatedDmg = (atk.damage || []).filter((_, i) => i !== dIdx);
                                                                                    updated[idx] = { ...atk, damage: updatedDmg };
                                                                                    updateEnemy(enemy.id, 'attacks', updated);
                                                                                }} style={{ fontSize: '1rem', padding: '0.1rem 0.4rem' }}>×</button>
                                                                            </div>
                                                                        ))}
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-secondary"
                                                                            onClick={() => {
                                                                                const updated = [...(enemy.attacks || [])];
                                                                                const updatedDmg = [...(atk.damage || []), { formula: '1d6', type: 'slashing' }];
                                                                                updated[idx] = { ...atk, damage: updatedDmg };
                                                                                updateEnemy(enemy.id, 'attacks', updated);
                                                                            }}
                                                                            style={{ marginTop: '0.4rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                                                        >
                                                                            + Add Damage Component
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(!enemy.attacks || enemy.attacks.length === 0) && (
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                                                                    No structured attacks defined. The system will auto-parse standard weapon attacks (e.g. Talon, Javelin) from the raw text Abilities block above.
                                                                </div>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            onClick={() => {
                                                                const newAtk = {
                                                                    name: 'New Attack',
                                                                    type: 'melee',
                                                                    toHit: 0,
                                                                    reach: '5 ft.',
                                                                    range: '',
                                                                    damage: [{ formula: '1d6', type: 'slashing' }]
                                                                };
                                                                const updated = [...(enemy.attacks || []), newAtk];
                                                                updateEnemy(enemy.id, 'attacks', updated);
                                                            }}
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                        >
                                                            + Add Structured Attack
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="stats-skills-tab">
                                                        {statsList.map(stat => {
                                                            const eff = enemy[stat] || 10;
                                                            const mod = calculateModifier(eff);
                                                            const relatedSkills = dndSkills.filter(s => s.stat === stat);
                                                            const isSaveProficient = enemy.saves?.[stat];
                                                            const profBonus = enemy.proficiency !== undefined ? enemy.proficiency : 2;
                                                            const saveBonus = mod + (isSaveProficient ? profBonus : 0);
                                                            return (
                                                                <div key={stat} className="stat-group">
                                                                    <div className="stat-group-header">
                                                                        <div 
                                                                            className={`skill-checkbox save-checkbox ${isSaveProficient ? 'proficient' : ''}`}
                                                                            onClick={() => {
                                                                                const currentSaves = enemy.saves || {};
                                                                                updateEnemy(enemy.id, 'saves', { ...currentSaves, [stat]: !currentSaves[stat] });
                                                                            }}
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
                                                                        <div className="stat-save-display">
                                                                            <span className="stat-save-display-label">Save</span>
                                                                            <span style={{ color: isSaveProficient ? 'var(--primary)' : 'var(--text-primary)' }}>
                                                                                {formatModifier(saveBonus)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {relatedSkills.length > 0 && (
                                                                        <div className="stat-group-skills">
                                                                            {relatedSkills.map(skill => {
                                                                                const isProficient = enemy.skills && enemy.skills[skill.name];
                                                                                const skillBonus = mod + (isProficient ? profBonus : 0);
                                                                                return (
                                                                                    <div 
                                                                                        key={skill.name} 
                                                                                        className={`skill-row ${isProficient ? 'proficient' : ''}`} 
                                                                                        onClick={() => {
                                                                                            const currentSkills = enemy.skills || {};
                                                                                            updateEnemy(enemy.id, 'skills', { ...currentSkills, [skill.name]: !currentSkills[skill.name] });
                                                                                        }}
                                                                                    >
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

                                                        {/* Resistances & Vulnerabilities Editor */}
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
                                                                            <option value="">+ Add</option>
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
                                                                            <option value="">+ Add</option>
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
                                                                            <option value="">+ Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(enemy.vulnerabilities || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="combat-tab-content integrated-combat" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
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
                                                                    value={enemy.hpMax || 20}
                                                                    onChange={e => updateEnemy(enemy.id, 'hpMax', Math.max(1, parseInt(e.target.value) || 1))} 
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
                                                            <div className="combat-stat-box">
                                                                <label>Class Type</label>
                                                                <select
                                                                    className="input combat-input"
                                                                    value={enemy.classType || 'Enemy'}
                                                                    onChange={e => updateEnemy(enemy.id, 'classType', e.target.value)}
                                                                    style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                                                                >
                                                                    <option value="Enemy">Enemy</option>
                                                                    <option value="Boss">Boss</option>
                                                                </select>
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

                                                        <div className="carrying-capacity mini-capacity" style={{ marginTop: '1rem' }}>
                                                            <h4>Carrying</h4>
                                                            <div className="capacity-bar">
                                                                Max Load: {(enemy.str || 10) * 15} lbs<br />
                                                                Push/Drag: {(enemy.str || 10) * 30} lbs
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                                        <button className="btn btn-primary" onClick={() => {
                                                            setExpandedEnemyId(null);
                                                            setExpandedOriginalName('');
                                                        }}>💾 Save & Close</button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <p>No monsters found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
