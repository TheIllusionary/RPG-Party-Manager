import React from 'react';
import type { IPartyLevelModalProps } from '../../../types/battle';

export default function PartyLevelModal({ party }: IPartyLevelModalProps) {
  const {
    partyLevelModalOpen,
    setPartyLevelModalOpen,
    partyLevelInput,
    setPartyLevelInput,
    focusAndSelectRef,
    applyPartyLevel,
    data,
    getLevelInfo,
  } = party;

  if (!partyLevelModalOpen) return null;

  const activeMembers = data.filter((p) => p.inParty);
  const activeCount = activeMembers.length;

  return (
    <div className="global-modal-overlay" onClick={() => setPartyLevelModalOpen(false)}>
      <div className="damage-heal-popup glass-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Set Party Level</h3>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
          {activeCount > 0
            ? `Sets level 1–20 for ${activeCount} active member${activeCount === 1 ? '' : 's'} (⚔️). HP and mana are adjusted.`
            : 'No active party members. Add players to the party first.'}
        </p>

        {activeCount > 0 && (
          <ul style={{
            listStyle: 'none',
            padding: '0 0 1rem',
            margin: 0,
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
          >
            {activeMembers.map((p) => (
              <li key={p.id} style={{ padding: '0.2rem 0' }}>
                {p.name} — Lvl {getLevelInfo(p.xp).level} → Lvl {partyLevelInput || '?'}
              </li>
            ))}
          </ul>
        )}

        <input
          type="number"
          className="input global-dh-input"
          min={1}
          max={20}
          value={partyLevelInput}
          ref={focusAndSelectRef}
          disabled={activeCount === 0}
          onChange={(e) => setPartyLevelInput(e.target.value)}
          onWheel={(e) => {
            e.preventDefault();
            const dir = Math.sign(e.deltaY) * -1;
            setPartyLevelInput((prev) => {
              const next = Math.max(1, Math.min(20, (parseInt(prev, 10) || 1) + dir));
              return String(next);
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'w' || e.key === 'ArrowUp') {
              e.preventDefault();
              setPartyLevelInput((prev) => String(Math.min(20, (parseInt(prev, 10) || 1) + 1)));
            }
            if (e.key === 's' || e.key === 'ArrowDown') {
              e.preventDefault();
              setPartyLevelInput((prev) => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)));
            }
            if (e.key === 'Enter') applyPartyLevel();
            if (e.key === 'Escape') setPartyLevelModalOpen(false);
          }}
          placeholder="1–20"
        />

        <div className="popup-actions" style={{ flexDirection: 'column' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={activeCount === 0}
            onClick={applyPartyLevel}
          >
            Apply to Party
          </button>
          <button type="button" className="btn" onClick={() => setPartyLevelModalOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
