import type { ISRDEquipmentItem } from '../../types/srd';

import './compendium.css';

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

function displayType(item: ISRDEquipmentItem): string {
  if (item.weaponCategory) return `Weapon · ${item.weaponCategory}`;
  if (item.armorCategory) return `Armor · ${item.armorCategory}`;
  return item.category || item.inventoryItem.type || 'Item';
}

function displayRarity(item: ISRDEquipmentItem): string | null {
  return item.inventoryItem.rarity?.trim() || null;
}

export default function ItemCard({ item }: { item: ISRDEquipmentItem }) {
  const rarity = displayRarity(item);
  const tags = [displayType(item), rarity].filter(Boolean) as string[];

  return (
    <article className="compendium-detail compendium-detail--item">
      <header className="compendium-detail__header">
        <h2 className="compendium-detail__title">{item.name}</h2>
        <div className="compendium-detail__tags">
          {tags.map((tag) => (
            <span key={tag} className="compendium-tag">
              {tag}
            </span>
          ))}
        </div>
      </header>

      <section className="compendium-detail__section compendium-detail__section--inline">
        {item.cost && (
          <p>
            <strong>Cost:</strong> {item.cost}
          </p>
        )}
        {item.weight && (
          <p>
            <strong>Weight:</strong> {item.weight}
          </p>
        )}
        {item.armorClass != null && (
          <p>
            <strong>AC:</strong> {item.armorClass}
          </p>
        )}
        {(item.damageFormula || item.damageType) && (
          <p>
            <strong>Damage:</strong>{' '}
            {[item.damageFormula, item.damageType].filter(Boolean).join(' ')}
          </p>
        )}
      </section>

      <section className="compendium-detail__section">
        <h3 className="compendium-detail__section-title">Description</h3>
        <DescriptionBlock text={item.description} />
      </section>
    </article>
  );
}
