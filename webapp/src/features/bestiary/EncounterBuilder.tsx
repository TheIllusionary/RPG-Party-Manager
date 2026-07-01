import React, { useState } from 'react';
import './EncounterBuilder.css';
import type { IEncounterBuilderProps } from '../../types/bestiary';

export default function EncounterBuilder({ data, updateData, library }: IEncounterBuilderProps) {
    const [selectedEnemyId, setSelectedEnemyId] = useState('');
    const [quantity, setQuantity] = useState(1);

    const rollHP = (formula: string | undefined): number => {
        if (!formula) return 10;
        if (!Number.isNaN(Number(formula))) return parseInt(formula, 10);

        const regex = /(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?/i;
        const match = formula.match(regex);

        if (!match) return 10;

        const count = parseInt(match[1] ?? '1', 10);
        const sides = parseInt(match[2], 10);
        const operator = match[3];
        const modifier = parseInt(match[4] ?? '0', 10);

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
        const baseEnemy = library.find((e) => e.id === selectedEnemyId);
        if (!baseEnemy) return;

        const newEnemies = [];
        const existingCount = data.filter((e) => e.baseId === baseEnemy.id).length;

        for (let i = 0; i < quantity; i++) {
            const rolledHP = rollHP(baseEnemy.hpFormula);
            newEnemies.push({
                id: `${Date.now()}${i}`,
                baseId: baseEnemy.id,
                name: `${baseEnemy.name} ${existingCount + i + 1}`,
                hpCurrent: rolledHP,
                hpMax: rolledHP,
                ac: baseEnemy.ac,
                exp: baseEnemy.exp,
            });
        }

        updateData([...data, ...newEnemies]);
    };

    const updateEnemyHP = (id: string, change: number) => {
        const updated = data.map((e) => {
            if (e.id === id) {
                return { ...e, hpCurrent: Math.max(0, Math.min(e.hpMax, e.hpCurrent + change)) };
            }
            return e;
        });
        updateData(updated);
    };

    const removeEnemy = (id: string) => {
        updateData(data.filter((e) => e.id !== id));
    };

    const clearEncounter = () => {
        if (window.confirm('Are you sure you want to clear the entire encounter?')) {
            updateData([]);
        }
    };

    const totalExp = data.reduce((sum, e) => sum + (e.exp || 0), 0);

    return (
        <div className="encounter-builder-tab">
            <div className="encounter-header">
                <h2>Encounter Builder</h2>
                <div className="encounter-stats">
                    <div className="stat-badge exp-badge">Total EXP: {totalExp}</div>
                    <button type="button" className="btn btn-danger" onClick={clearEncounter}>Clear All</button>
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
                        {library.map((e) => (
                            <option key={e.id} value={e.id}>{e.name} (CR: {e.cr})</option>
                        ))}
                    </select>

                    <input
                        type="number"
                        className="input quantity-input"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    />

                    <button type="button" className="btn btn-primary" onClick={addEnemies}>+ Add</button>
                </div>
            </div>

            <div className="encounter-grid">
                {data.map((enemy) => (
                    <div key={enemy.id} className="glass-panel combatant-card">
                        <div className="combatant-header">
                            <h3>{enemy.name}</h3>
                            <div className="combatant-ac">🛡️ {enemy.ac}</div>
                            <button type="button" className="delete-btn" onClick={() => removeEnemy(enemy.id)}>×</button>
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
                                        backgroundColor: enemy.hpCurrent === 0 ? '#ef4444' : '#10b981',
                                    }}
                                />
                            </div>

                            <div className="hp-controls">
                                <button type="button" onClick={() => updateEnemyHP(enemy.id, -1)}>-1</button>
                                <button type="button" onClick={() => updateEnemyHP(enemy.id, -5)}>-5</button>
                                <button type="button" onClick={() => updateEnemyHP(enemy.id, -10)}>-10</button>
                                <div className="spacer" />
                                <button type="button" onClick={() => updateEnemyHP(enemy.id, 1)}>+1</button>
                                <button type="button" onClick={() => updateEnemyHP(enemy.id, 5)}>+5</button>
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
