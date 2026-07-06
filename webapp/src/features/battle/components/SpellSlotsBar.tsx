import { formatSlotLabel } from '../../../shared/utils/spellSlotUtils';

export interface SpellSlotsBarProps {
  slots: Record<string, { current: number; max: number }>;
  onAdjust: (slotLevel: number, delta: number) => void;
  compact?: boolean;
}

export default function SpellSlotsBar({ slots, onAdjust, compact = false }: SpellSlotsBarProps) {
  const entries = Object.entries(slots)
    .map(([level, pool]) => ({ level: Number(level), ...pool }))
    .filter((e) => e.max > 0)
    .sort((a, b) => a.level - b.level);

  if (entries.length === 0) {
    return (
      <div className="spell-slots-bar spell-slots-bar--empty">
        <span className="spell-slots-label">Spell Slots</span>
        <span className="spell-slots-empty-note">No slots at this level</span>
      </div>
    );
  }

  return (
    <div className={`spell-slots-bar ${compact ? 'spell-slots-bar--compact' : ''}`}>
      <span className="spell-slots-label">Spell Slots</span>
      <div className="spell-slots-row">
        {entries.map(({ level, current, max }) => (
          <div key={level} className="spell-slot-chip">
            <span className="spell-slot-chip__label">{formatSlotLabel(level)}</span>
            <span className="spell-slot-chip__value">
              {current}/{max}
            </span>
            <span className="spell-slot-chip__controls">
              <button
                type="button"
                className="spell-slot-chip__btn"
                title={`Spend ${formatSlotLabel(level)} slot`}
                disabled={current <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdjust(level, -1);
                }}
              >
                −
              </button>
              <button
                type="button"
                className="spell-slot-chip__btn"
                title={`Restore ${formatSlotLabel(level)} slot`}
                disabled={current >= max}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdjust(level, 1);
                }}
              >
                +
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
