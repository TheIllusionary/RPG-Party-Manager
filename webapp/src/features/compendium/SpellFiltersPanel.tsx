import type { SpellFilterOptions, SpellFilterState, TriState } from './spellFilterUtils';
import { countActiveSpellFilters, levelLabel, toggleComponentFilter, toggleLevelFilter } from './spellFilterUtils';

export interface SpellFiltersPanelProps {
  filters: SpellFilterState;
  options: SpellFilterOptions;
  onChange: (next: SpellFilterState) => void;
  onClear: () => void;
}

function FilterSelect({
  label,
  value,
  onChange,
  choices,
  allLabel = 'All',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  choices: string[];
  allLabel?: string;
}) {
  return (
    <label className="compendium-filter-field">
      <span className="compendium-filter-field__label">{label}</span>
      <select
        className="compendium-filter-field__select input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{allLabel}</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </label>
  );
}

function TriSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
}) {
  return (
    <label className="compendium-filter-field">
      <span className="compendium-filter-field__label">{label}</span>
      <select
        className="compendium-filter-field__select input"
        value={value}
        onChange={(e) => onChange(e.target.value as TriState)}
      >
        <option value="any">All</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}

export default function SpellFiltersPanel({
  filters,
  options,
  onChange,
  onClear,
}: SpellFiltersPanelProps) {
  const activeCount = countActiveSpellFilters(filters);

  return (
    <div className="compendium-spell-filters">
      <div className="compendium-spell-filters__head">
        <span className="compendium-spell-filters__title">Filters</span>
        {activeCount > 0 && (
          <button type="button" className="compendium-filter-clear" onClick={onClear}>
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="compendium-filter-levels">
        <span className="compendium-filter-field__label">Level</span>
        <div className="compendium-filter-pills">
          {options.levels.map((level) => (
            <button
              key={level}
              type="button"
              className={`compendium-filter-pill ${filters.levels.includes(level) ? 'is-active' : ''}`}
              onClick={() =>
                onChange({ ...filters, levels: toggleLevelFilter(filters.levels, level) })
              }
            >
              {levelLabel(level)}
            </button>
          ))}
        </div>
      </div>

      <div className="compendium-filter-grid">
        <FilterSelect
          label="School"
          value={filters.school}
          onChange={(school) => onChange({ ...filters, school })}
          choices={options.schools}
        />
        <FilterSelect
          label="Class"
          value={filters.className}
          onChange={(className) => onChange({ ...filters, className })}
          choices={options.classes}
        />
        <FilterSelect
          label="Casting time"
          value={filters.castingTime}
          onChange={(castingTime) => onChange({ ...filters, castingTime })}
          choices={options.castingTimes}
        />
        <FilterSelect
          label="Duration"
          value={filters.duration}
          onChange={(duration) => onChange({ ...filters, duration })}
          choices={options.durations}
        />
        <FilterSelect
          label="Range"
          value={filters.range}
          onChange={(range) => onChange({ ...filters, range })}
          choices={options.ranges}
        />
        <TriSelect
          label="Ritual"
          value={filters.ritual}
          onChange={(ritual) => onChange({ ...filters, ritual })}
        />
        <TriSelect
          label="Concentration"
          value={filters.concentration}
          onChange={(concentration) => onChange({ ...filters, concentration })}
        />
        <TriSelect
          label="Has damage"
          value={filters.hasDamage}
          onChange={(hasDamage) => onChange({ ...filters, hasDamage })}
        />
        <TriSelect
          label="Has save"
          value={filters.hasSave}
          onChange={(hasSave) => onChange({ ...filters, hasSave })}
        />
      </div>

      <div className="compendium-filter-components">
        <span className="compendium-filter-field__label">Components</span>
        <div className="compendium-filter-pills">
          {['V', 'S', 'M'].map((component) => (
            <button
              key={component}
              type="button"
              className={`compendium-filter-pill ${filters.components.includes(component) ? 'is-active' : ''}`}
              onClick={() =>
                onChange({
                  ...filters,
                  components: toggleComponentFilter(filters.components, component),
                })
              }
            >
              {component}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
