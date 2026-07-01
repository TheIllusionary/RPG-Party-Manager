import React, { useState } from 'react';
import './EncounterBuilder.css';

export default function EncounterBuilder({ data, updateData, library }) {
    const [selectedEnemyId, setSelectedEnemyId] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Parse formula like "2d6+2" or "15" and roll
    const rollHP = (formula) => {
        if (!formula) return 10; // Fallback
        // Check if flat number
        if (!isNaN(formula)) return parseInt(formula);

        // Parse NdM+P
        const regex = /(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?/i;
        const match = formula.match(regex);

        if (!match) return 10; // Fallback if parse fails

        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        const operator = match[3];
        const modifier = parseInt(match[4]) || 0;

        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }

        if (operator === '+') total += modifier;
        if (operator === '-') total -= modifier;

        return Math.max(1, total);
    };

    const addEnemies = () => {
        if (!selectedEnemyId) return;
        const baseEnemy = library.find(e => e.id === selectedEnemyId);
        if (!baseEnemy) return;

        const newEnemies = [];
        // Count existing enemies of same type to number them correctly
        const existingCount = data.filter(e => e.baseId === baseEnemy.id).length;

        for (let i = 0; i < quantity; i++) {
            const rolledHP = rollHP(baseEnemy.hpFormula);
            newEnemies.push({
                id: Date.now().toString() + i, // Unique ID
                baseId: baseEnemy.id,
                name: `${baseEnemy.name} ${existingCount + i + 1}`,
                hpCurrent: rolledHP,
                hpMax: rolledHP,
                ac: baseEnemy.ac,
                exp: baseEnemy.exp
            });
        }

        updateData([...data, ...newEnemies]);
    };

    const updateEnemyHP = (id, change) => {
        const updated = data.map(e => {
            if (e.id === id) {
                return { ...e, hpCurrent: Math.max(0, Math.min(e.hpMax, e.hpCurrent + change)) };
            }
            return e;
        });
        updateData(updated);
    };

    const removeEnemy = (id) => {
        updateData(data.filter(e => e.id !== id));
    };

    const clearEncounter = () => {
        if (window.confirm("Are you sure you want to clear the entire encounter?")) {
            updateData([]);
        }
    };

    const totalExp = data.reduce((sum, e) => sum + (e.exp || 0), 0);

    // Grouping for visual display: Let's just list them individually so HP can be tracked
    return (
        <div className="encounter-builder-tab">
            <div className="encounter-header">
                <h2>Encounter Builder</h2>
                <div className="encounter-stats">
                    <div className="stat-badge exp-badge">Total EXP: {totalExp}</div>
                    <button className="btn btn-danger" onClick={clearEncounter}>Clear All</button>
                </div>
            </div>

            <div className="add-enemy-panel glass-panel">
                <div className="add-controls">
                    <select
                        className="input add-select"
                        value={selectedEnemyId}
                        onChange={(e) => setSelectedEnemyId(e.target.value)}
                    >
                        <option value="">-- Select Monster --</option>
                        {library.map(e => (
                            <option key={e.id} value={e.id}>{e.name} (CR: {e.cr})</option>
                        ))}
                    </select>

                    <input
                        type="number"
                        className="input quantity-input"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />

                    <button className="btn btn-primary" onClick={addEnemies}>+ Add</button>
                </div>
            </div>

            <div className="encounter-grid">
                {data.map(enemy => (
                    <div key={enemy.id} className="glass-panel combatant-card">
                        <div className="combatant-header">
                            <h3>{enemy.name}</h3>
                            <div className="combatant-ac">🛡️ {enemy.ac}</div>
                            <button className="delete-btn" onClick={() => removeEnemy(enemy.id)}>×</button>
                        </div>

                        <div className="combatant-hp">
                            <div className="hp-label">
                                <span>HP: {enemy.hpCurrent} / {enemy.hpMax}</span>
                            </div>
                            <div className="hp-bar-bg">
                                <div
                                    className="hp-bar-fill"
                                    style={{
                                        width: `${(enemy.hpCurrent / enemy.hpMax) * 100}%`,
                                        backgroundColor: enemy.hpCurrent === 0 ? '#ef4444' : '#10b981'
                                    }}
                                />
                            </div>

                            <div className="hp-controls">
                                <button onClick={() => updateEnemyHP(enemy.id, -1)}>-1</button>
                                <button onClick={() => updateEnemyHP(enemy.id, -5)}>-5</button>
                                <button onClick={() => updateEnemyHP(enemy.id, -10)}>-10</button>
                                <div className="spacer"></div>
                                <button onClick={() => updateEnemyHP(enemy.id, +1)}>+1</button>
                                <button onClick={() => updateEnemyHP(enemy.id, +5)}>+5</button>
                            </div>
                        </div>
                        {enemy.hpCurrent <= 0 && (
                            <div className="dead-overlay">DEAD</div>
                        )}
                    </div>
                ))}
                {data.length === 0 && (
                    <div className="empty-state">
                        <p>No enemies in the encounter. Add some from the library!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
