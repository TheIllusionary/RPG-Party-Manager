import { useState } from 'react';
import { DAMAGE_TYPES } from '../utils/constants';

export interface QuickActionBarProps {
  entityType: 'player' | 'enemy';
  entityId: string;
  onDamage: (entityType: 'player' | 'enemy', entityId: string, amount: number, damageType: string) => void;
  onHeal: (entityType: 'player' | 'enemy', entityId: string, amount: number) => void;
  disabled?: boolean;
}

export default function QuickActionBar({
  entityType,
  entityId,
  onDamage,
  onHeal,
  disabled = false,
}: QuickActionBarProps) {
  const [amount, setAmount] = useState('5');
  const [damageType, setDamageType] = useState(DAMAGE_TYPES[3] ?? 'Fire');

  const parsedAmount = Math.max(0, Math.floor(Number(amount)) || 0);

  return (
    <div className="quick-action-bar" onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        className="quick-action-input"
        min={0}
        value={amount}
        disabled={disabled}
        aria-label="Damage or heal amount"
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onDamage(entityType, entityId, parsedAmount, damageType);
        }}
      />
      <select
        className="quick-action-select"
        value={damageType}
        disabled={disabled}
        aria-label="Damage type"
        onChange={(e) => setDamageType(e.target.value)}
      >
        {DAMAGE_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="quick-action-btn quick-action-btn--damage"
        disabled={disabled || parsedAmount <= 0}
        onClick={() => onDamage(entityType, entityId, parsedAmount, damageType)}
      >
        Damage
      </button>
      <button
        type="button"
        className="quick-action-btn quick-action-btn--heal"
        disabled={disabled || parsedAmount <= 0}
        onClick={() => onHeal(entityType, entityId, parsedAmount)}
      >
        Heal
      </button>
    </div>
  );
}
