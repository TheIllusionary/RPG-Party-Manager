import type { MasterRace, MasterSubrace, IChoiceObject } from '../../services/compendium/fiveETools/types';

interface RaceDetailViewProps {
  race: MasterRace;
}

const STAT_LABELS: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

const CHOICE_TYPE_LABELS: Record<IChoiceObject['type'], string> = {
  ability: 'Ability Score Increase',
  skill: 'Skill Proficiency',
  tool: 'Tool Proficiency',
  language: 'Language',
};

function ChoiceBlock({ choice }: { choice: IChoiceObject }) {
  return (
    <div className="race-choice-block">
      <span className="race-choice-type">{CHOICE_TYPE_LABELS[choice.type]}</span>
      <span className="race-choice-desc">
        Choose {choice.count} from:{' '}
        <em>{choice.options.map(o => STAT_LABELS[o] ?? o).join(', ')}</em>
      </span>
    </div>
  );
}

function SubraceCard({ subrace }: { subrace: MasterSubrace }) {
  const allChoices = [
    ...(subrace.abilityChoices ?? []),
    ...(subrace.skillChoices ?? []),
    ...(subrace.languageChoices ?? []),
  ];

  return (
    <div className="race-subrace-card">
      <h4 className="race-subrace-name">{subrace.name}</h4>

      {/* Fixed ASI bonuses */}
      {(subrace.ability ?? []).length > 0 && (
        <div className="race-asi-row">
          {(subrace.ability ?? []).map((entry, i) =>
            Object.entries(entry).map(([stat, val]) => (
              <span key={`${stat}-${i}`} className="race-asi-badge">
                {STAT_LABELS[stat] ?? stat.toUpperCase()} {val > 0 ? `+${val}` : val}
              </span>
            ))
          )}
        </div>
      )}

      {/* Choice blocks */}
      {allChoices.map((choice, i) => (
        <ChoiceBlock key={i} choice={choice} />
      ))}

      {/* Traits */}
      {(subrace.traits ?? []).slice(0, 4).map((trait, i) => (
        <div key={i} className="race-trait-row">
          <span className="race-trait-name">{trait.name}:</span>
          <span className="race-trait-desc">{trait.desc}</span>
        </div>
      ))}
    </div>
  );
}

export default function RaceDetailView({ race }: RaceDetailViewProps) {
  const allBaseChoices = [
    ...(race.abilityChoices ?? []),
    ...(race.skillChoices ?? []),
    ...(race.languageChoices ?? []),
  ];

  return (
    <div className="race-detail-view">
      {/* Header */}
      <div className="race-detail-header">
        <h2 className="race-detail-name">{race.name}</h2>
        <span className="race-detail-source">{race.source}</span>
      </div>

      {/* Basic stats row */}
      <div className="race-stats-row">
        {race.size && (
          <div className="race-stat-pill">
            <span className="race-stat-label">Size</span>
            <span className="race-stat-value">{race.size}</span>
          </div>
        )}
        {race.speed && (
          <div className="race-stat-pill">
            <span className="race-stat-label">Speed</span>
            <span className="race-stat-value">{race.speed}</span>
          </div>
        )}
        {race.subraces && race.subraces.length > 0 && (
          <div className="race-stat-pill">
            <span className="race-stat-label">Subraces</span>
            <span className="race-stat-value">{race.subraces.length}</span>
          </div>
        )}
      </div>

      {/* Fixed ASI bonuses from base race */}
      {(race.ability ?? []).length > 0 && (
        <div className="race-section">
          <h3 className="race-section-title">Ability Score Improvements</h3>
          <div className="race-asi-row">
            {(race.ability ?? []).map((entry, i) =>
              Object.entries(entry).map(([stat, val]) => (
                <span key={`${stat}-${i}`} className="race-asi-badge">
                  {STAT_LABELS[stat] ?? stat.toUpperCase()} {val > 0 ? `+${val}` : val}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Choice blocks for base race */}
      {allBaseChoices.length > 0 && (
        <div className="race-section">
          <h3 className="race-section-title">Choices</h3>
          {allBaseChoices.map((choice, i) => (
            <ChoiceBlock key={i} choice={choice} />
          ))}
        </div>
      )}

      {/* Racial traits */}
      {(race.traits ?? []).length > 0 && (
        <div className="race-section">
          <h3 className="race-section-title">Racial Traits</h3>
          <div className="race-trait-list">
            {(race.traits ?? []).map((trait, i) => (
              <div key={i} className="race-trait-item">
                <p className="race-trait-item-name">{trait.name}</p>
                <p className="race-trait-item-desc">{trait.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subraces */}
      {(race.subraces ?? []).length > 0 && (
        <div className="race-section">
          <h3 className="race-section-title">Subraces</h3>
          <div className="race-subrace-list">
            {(race.subraces ?? []).map((sr) => (
              <SubraceCard key={sr.entityKey} subrace={sr} />
            ))}
          </div>
        </div>
      )}

      {/* No data fallback */}
      {!race.traits?.length && !race.subraces?.length && (
        <p className="race-no-data">No detailed trait data available for this race.</p>
      )}
    </div>
  );
}
