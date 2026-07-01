import React from 'react';
import type { IPartyXpModalProps } from '../../../types/battle';

export default function PartyXpModal({ party }: IPartyXpModalProps) {
  const {
    partyXpModalOpen,
    setPartyXpModalOpen,
    partyXpAmount,
    setPartyXpAmount,
    focusAndSelectRef,
    givePartyXP,
  } = party;

  if (!partyXpModalOpen) return null;

  return (
    <div className="global-modal-overlay" onClick={() => setPartyXpModalOpen(false)}>
      <div className="damage-heal-popup glass-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Distribute Party EXP</h3>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Applies to active (⚔️) members only.
        </p>
        <input
          type="number"
          className="input global-dh-input"
          value={partyXpAmount}
          ref={focusAndSelectRef}
          onChange={(e) => setPartyXpAmount(e.target.value)}
          onWheel={(e) => {
            e.preventDefault();
            const dir = Math.sign(e.deltaY) * -1;
            setPartyXpAmount((prev) => String((parseInt(prev, 10) || 0) + dir));
          }}
          onKeyDown={(e) => {
            if (e.key === 'w' || e.key === 'ArrowUp') setPartyXpAmount((prev) => String((parseInt(prev, 10) || 0) + 1));
            if (e.key === 's' || e.key === 'ArrowDown') setPartyXpAmount((prev) => String((parseInt(prev, 10) || 0) - 1));
          }}
          placeholder="0"
        />
        <div className="popup-actions" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => givePartyXP('flat')}>Give Flat XP</button>
            <button type="button" className="btn btn-secondary" onClick={() => givePartyXP('percent')}>Give XP %</button>
          </div>
          <button type="button" className="btn btn-success" onClick={() => givePartyXP('levelup')}>🏆 Instant Level Up</button>
          <button type="button" className="btn" onClick={() => setPartyXpModalOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
