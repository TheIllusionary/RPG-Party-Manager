import { CheckSquare, Square } from 'lucide-react';
import './UniversalFilterPanel.css';

export interface UniversalFilterPanelProps {
  availableSources: string[];
  selectedSources: string[];
  onChange: (sources: string[]) => void;
}

export default function UniversalFilterPanel({
  availableSources,
  selectedSources,
  onChange,
}: UniversalFilterPanelProps) {
  const toggleSource = (source: string) => {
    if (selectedSources.includes(source)) {
      onChange(selectedSources.filter((s) => s !== source));
    } else {
      onChange([...selectedSources, source].sort());
    }
  };

  const selectAll = () => {
    onChange([...availableSources].sort());
  };

  const clearAll = () => {
    onChange([]);
  };

  if (availableSources.length === 0) return null;

  return (
    <div className="compendium-universal-filters">
      <div className="compendium-universal-filters__head">
        <span className="compendium-universal-filters__title">Sources / Books</span>
        <div className="compendium-universal-filters__actions">
          <button type="button" className="compendium-filter-clear" onClick={selectAll}>
            All
          </button>
          <button type="button" className="compendium-filter-clear" onClick={clearAll}>
            None
          </button>
        </div>
      </div>
      <div className="compendium-universal-filters__list">
        {availableSources.map((source) => {
          const isActive = selectedSources.includes(source);
          return (
            <label key={source} className="compendium-universal-filter-item">
              <input
                type="checkbox"
                className="visually-hidden"
                checked={isActive}
                onChange={() => toggleSource(source)}
              />
              <span className="compendium-universal-filter-item__icon">
                {isActive ? <CheckSquare size={16} /> : <Square size={16} />}
              </span>
              <span className="compendium-universal-filter-item__label">{source}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
