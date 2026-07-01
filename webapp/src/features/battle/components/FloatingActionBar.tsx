import React from 'react';

export default function FloatingActionBar({ combat }) {
  const {
    selectedTargets,
    bulkActionValue,
    setBulkActionValue,
    bulkTempHp,
    setBulkTempHp,
    applyBulkHpToTargets,
    applyBulkManaDrain,
    clearTargetSelection,
  } = combat;

  if (selectedTargets.length === 0) return null;

  return (
    <div className="bulk-action-bar">
      <span className="bulk-action-label">
        {selectedTargets.length} alvo{selectedTargets.length !== 1 ? 's' : ''} selecionado{selectedTargets.length !== 1 ? 's' : ''}
      </span>
      <input
        type="number"
        className="input bulk-action-input"
        value={bulkActionValue}
        placeholder="Valor"
        onChange={(e) => setBulkActionValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') applyBulkHpToTargets(false);
        }}
      />
      <label className="bulk-temp-hp-label">
        <input
          type="checkbox"
          checked={bulkTempHp}
          onChange={(e) => setBulkTempHp(e.target.checked)}
        />
        Temp HP
      </label>
      <button type="button" className="btn bulk-btn-damage" onClick={() => applyBulkHpToTargets(false)}>Apply Damage</button>
      <button type="button" className="btn bulk-btn-heal" onClick={() => applyBulkHpToTargets(true)}>Apply Heal</button>
      <button type="button" className="btn bulk-btn-mana" onClick={applyBulkManaDrain}>Drain Mana</button>
      <button type="button" className="btn bulk-btn-clear" onClick={clearTargetSelection} title="Limpar seleção">✕</button>
    </div>
  );
}
