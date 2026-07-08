import React from 'react';
import type { IPlayerAttributesProps } from '@/features/PlayerCard/types';

export default function PlayerAttributes({
  player,
  computedPlayer,
  updatePlayer,
  statsList,
  getEquipmentBonus,
  effectiveStat,
  formatModifier,
  calculateModifier,
}: IPlayerAttributesProps) {
  return (
    <div className="compact-stats-grid">
      {statsList.map(stat => {
        const bonus = getEquipmentBonus(computedPlayer.id, stat);
        const eff = effectiveStat(computedPlayer, stat);
        return (
          <div key={stat} className="compact-stat-box">
            <div className="stat-name">{stat.toUpperCase()}</div>
            <div className="stat-mod-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <div className="stat-mod-badge">{formatModifier(calculateModifier(eff))}</div>
              {bonus !== 0 && (
                <div className="stat-equip-bonus" style={{ color: bonus > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {bonus > 0 ? '+' : ''}{bonus}
                </div>
              )}
            </div>
            <div className="stat-score-wrapper">
              <input
                type="number"
                className="stat-score-input"
                value={computedPlayer[stat as keyof typeof computedPlayer] || 10}
                onChange={e => updatePlayer(computedPlayer.id, stat as keyof typeof computedPlayer, parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
