import React, { useState, useEffect } from 'react';
import './Training.css';
import type { StatAbbr } from '../../types';
import type {
  ITrainingEntry,
  ITrainingProps,
  IPlayerTrainingCardProps,
  ITrainingEntryProps,
} from '../../types/campaign';

const STATS: StatAbbr[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS: Record<StatAbbr, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getNextSteppedValue(val: number, step: number, direction: number): number {
  const currentMultiple = Math.round(val / step) * step;
  let next = currentMultiple;
  if (direction > 0) {
    if (currentMultiple <= val) {
      next = currentMultiple + step;
    }
  } else {
    if (currentMultiple >= val) {
      next = currentMultiple - step;
    }
  }
  return next;
}

function createTrainingEntry(): ITrainingEntry {
  return {
    id: generateId(),
    name: 'New Training',
    stat: 'str',
    goal: 1000,
    progress: 0,
    lastRollDisplay: '',
  };
}

function TrainingEntry({ entry, player, onChange, onRemove }: ITrainingEntryProps) {
  const [rolling, setRolling] = useState(false);

  const statScore = player[entry.stat] ?? 10;
  const statMod = Math.floor((statScore - 10) / 2);
  const pct = entry.goal > 0 ? Math.min(100, Math.round((entry.progress / entry.goal) * 100)) : 0;
  const isComplete = entry.progress >= entry.goal;

  function handleField<K extends keyof ITrainingEntry>(field: K, value: ITrainingEntry[K]) {
    onChange({ ...entry, [field]: value });
  }

  const handleGoalScrollOrArrow = (direction: number) => {
    const nextVal = getNextSteppedValue(entry.goal, 100, direction);
    handleField('goal', Math.max(1, nextVal));
  };

  const handleProgressScrollOrArrow = (direction: number) => {
    const nextVal = getNextSteppedValue(entry.progress, 10, direction);
    handleField('progress', Math.max(0, nextVal));
  };

  function handleRoll() {
    setRolling(true);
    const rawRoll = Math.floor(Math.random() * 100) + 1;
    const roll = Math.round(rawRoll / 10) * 10;
    const modBonus = statMod * 10;
    const total = roll + modBonus;
    const statLabel = STAT_LABELS[entry.stat];
    const signStr = statMod >= 0 ? `+` : `-`;
    const absBonus = Math.abs(modBonus);
    const display = `Rolled ${rawRoll} → ${roll} ${signStr} (${statLabel} ${statMod} × 10 = ${absBonus}) = ${total} added`;
    const newProgress = entry.progress + total;
    onChange({ ...entry, progress: newProgress, lastRollDisplay: display });
    setTimeout(() => setRolling(false), 600);
  }

  return (
    <div className={`training-entry${isComplete ? ' training-entry--complete' : ''}`}>
      <div className="training-entry-header">
        <input
          className="input training-name-input"
          value={entry.name}
          onChange={e => handleField('name', e.target.value)}
          placeholder="Training name…"
        />
        {isComplete && (
          <span className="training-complete-badge">✓ COMPLETE</span>
        )}
        <button
          className="delete-btn training-remove-btn"
          onClick={onRemove}
          title="Remove training"
          type="button"
        >
          ×
        </button>
      </div>

      <div className="training-stat-row">
        <span className="training-label">Stat:</span>
        {STATS.map(s => (
          <button
            key={s}
            type="button"
            className={`training-stat-btn${entry.stat === s ? ' training-stat-btn--active' : ''}`}
            onClick={() => handleField('stat', s)}
          >
            {STAT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="training-fields-row">
        <div className="training-field-group">
          <label className="training-label">Goal</label>
          <input
            className="input training-number-input"
            type="number"
            min={1}
            step={100}
            value={entry.goal}
            onChange={e => handleField('goal', Math.max(1, parseInt(e.target.value, 10) || 1))}
            onWheel={e => {
              e.preventDefault();
              handleGoalScrollOrArrow(Math.sign(e.deltaY) * -1);
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                handleGoalScrollOrArrow(1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                handleGoalScrollOrArrow(-1);
              }
            }}
          />
        </div>
        <div className="training-field-group">
          <label className="training-label">Progress</label>
          <input
            className="input training-number-input"
            type="number"
            min={0}
            step={10}
            value={entry.progress}
            onChange={e => handleField('progress', Math.max(0, parseInt(e.target.value, 10) || 0))}
            onWheel={e => {
              e.preventDefault();
              handleProgressScrollOrArrow(Math.sign(e.deltaY) * -1);
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                handleProgressScrollOrArrow(1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                handleProgressScrollOrArrow(-1);
              }
            }}
          />
        </div>
        <button
          type="button"
          className={`training-roll-btn${rolling ? ' training-roll-btn--rolling' : ''}`}
          onClick={handleRoll}
          disabled={rolling}
        >
          🎲 Auto Roll
        </button>
      </div>

      <div className="training-progress-wrap">
        <div className="training-progress-bar-bg">
          <div
            className={`training-progress-bar-fill${isComplete ? ' training-progress-bar-fill--complete' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="training-progress-pct">{pct}%</span>
      </div>

      {entry.lastRollDisplay && (
        <div className="training-roll-result" key={entry.lastRollDisplay}>
          {entry.lastRollDisplay}
        </div>
      )}
    </div>
  );
}

function PlayerTrainingCard({ player, entries, onUpdate }: IPlayerTrainingCardProps) {
  function handleEntryChange(updatedEntry: ITrainingEntry) {
    const newEntries = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
    onUpdate(newEntries);
  }

  function handleRemove(id: string) {
    onUpdate(entries.filter(e => e.id !== id));
  }

  function handleAdd() {
    onUpdate([...entries, createTrainingEntry()]);
  }

  return (
    <div className="glass-panel player-training-card">
      <div className="player-training-header">
        <div className="player-training-avatar">
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="player-training-name">{player.name}</div>
          <div className="player-training-class">{player.classType}</div>
        </div>
      </div>

      <div className="training-entries-list">
        {entries.length === 0 && (
          <div className="training-empty-entries">No training assigned. Add one below.</div>
        )}
        {entries.map(entry => (
          <TrainingEntry
            key={entry.id}
            entry={entry}
            player={player}
            onChange={handleEntryChange}
            onRemove={() => handleRemove(entry.id)}
          />
        ))}
      </div>

      <button type="button" className="btn training-add-btn" onClick={handleAdd}>
        + Add Training
      </button>
    </div>
  );
}

export default function Training({ players, trainingData, updateTrainingData }: ITrainingProps) {
  const partyMembers = (players || []).filter(p => p.inParty);

  useEffect(() => {
    const container = document.querySelector('.container');
    if (!container) return;
    container.classList.add('battle-mode-layout');
    return () => {
      container.classList.remove('battle-mode-layout');
    };
  }, []);

  function handlePlayerUpdate(playerId: string, newEntries: ITrainingEntry[]) {
    updateTrainingData({ ...trainingData, [playerId]: newEntries });
  }

  return (
    <div className="training-page">
      <div className="training-page-header">
        <h2 className="training-title">📚 Training</h2>
        <p className="training-subtitle">Track skill progression and training milestones for your party.</p>
      </div>

      {partyMembers.length === 0 ? (
        <div className="glass-panel training-empty-state">
          <div className="training-empty-icon">⚔️</div>
          <div className="training-empty-text">No active party members.</div>
          <div className="training-empty-sub">Add players to your party to start tracking training.</div>
        </div>
      ) : (
        <div className="training-grid">
          {partyMembers.map(player => (
            <PlayerTrainingCard
              key={player.id}
              player={player}
              entries={trainingData[player.id] || []}
              onUpdate={entries => handlePlayerUpdate(player.id, entries)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
