import type { ISRDSpell } from '../../types/srd';

import './compendium.css';

function formatSpellLevel(level: number): string {
  if (level === 0) return 'Cantrip';
  return `Level ${level}`;
}

function DescriptionBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) {
    return <p className="compendium-detail__empty">No description available.</p>;
  }
  return (
    <div className="compendium-detail__body">
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function SpellCard({ spell }: { spell: ISRDSpell }) {
  const tags = [
    formatSpellLevel(spell.level),
    spell.school,
    spell.castingTime,
    spell.range,
    spell.duration,
    spell.ritual ? 'Ritual' : null,
    spell.concentration ? 'Concentration' : null,
  ].filter(Boolean) as string[];

  return (
    <article className="compendium-detail compendium-detail--spell">
      <header className="compendium-detail__header">
        <h2 className="compendium-detail__title">{spell.name}</h2>
        <div className="compendium-detail__tags">
          {tags.map((tag) => (
            <span key={tag} className="compendium-tag">
              {tag}
            </span>
          ))}
        </div>
      </header>

      <section className="compendium-detail__section">
        <h3 className="compendium-detail__section-title">Components</h3>
        <p className="compendium-detail__meta-line">
          {spell.components.length > 0 ? spell.components.join(', ') : '—'}
          {spell.material ? ` (${spell.material})` : ''}
        </p>
      </section>

      {spell.classes.length > 0 && (
        <section className="compendium-detail__section">
          <h3 className="compendium-detail__section-title">Classes</h3>
          <p className="compendium-detail__meta-line">{spell.classes.join(', ')}</p>
        </section>
      )}

      {(spell.damageFormula || spell.saveType) && (
        <section className="compendium-detail__section compendium-detail__section--inline">
          {spell.damageFormula && (
            <p>
              <strong>Damage:</strong> {spell.damageFormula}
              {spell.damageType ? ` ${spell.damageType}` : ''}
            </p>
          )}
          {spell.saveType && (
            <p>
              <strong>Save:</strong> {spell.saveType}
            </p>
          )}
        </section>
      )}

      <section className="compendium-detail__section">
        <h3 className="compendium-detail__section-title">Description</h3>
        <DescriptionBlock text={spell.description} />
      </section>

      {spell.higherLevel && (
        <section className="compendium-detail__section">
          <h3 className="compendium-detail__section-title">At Higher Levels</h3>
          <DescriptionBlock text={spell.higherLevel} />
        </section>
      )}
    </article>
  );
}
