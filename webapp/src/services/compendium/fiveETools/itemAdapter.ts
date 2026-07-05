import { FiveEToolsSanitizer, slugifyEntityId } from './sanitizer';
import type {
  FiveEItemRaw,
  MasterItem,
  SanitizedText,
} from './types';

/* ── 5e.tools item type code → human-readable category ──────────────── */

const ITEM_TYPE_LABELS: Record<string, string> = {
  A: 'Ammunition',
  AF: 'Ammunition (Firearm)',
  AIR: 'Vehicle (Air)',
  AT: "Artisan's Tools",
  EXP: 'Explosive',
  FD: 'Food and Drink',
  G: 'Adventuring Gear',
  GS: 'Gaming Set',
  GV: 'Generic Variant',
  HA: 'Heavy Armor',
  INS: 'Instrument',
  LA: 'Light Armor',
  M: 'Melee Weapon',
  MA: 'Medium Armor',
  MNT: 'Mount',
  OTH: 'Other',
  P: 'Potion',
  R: 'Ranged Weapon',
  RD: 'Rod',
  RG: 'Ring',
  S: 'Shield',
  SC: 'Scroll',
  SCF: 'Spellcasting Focus',
  SHP: 'Vehicle (Water)',
  ST: 'Staff',
  T: 'Tools',
  TAH: 'Tack and Harness',
  TG: 'Trade Good',
  VEH: 'Vehicle (Land)',
  W: 'Wand',
  WD: 'Wondrous Item',
  '$': 'Treasure',
};

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  B: 'bludgeoning',
  P: 'piercing',
  S: 'slashing',
  A: 'acid',
  C: 'cold',
  F: 'fire',
  FC: 'force',
  L: 'lightning',
  N: 'necrotic',
  O: 'poison',
  PS: 'psychic',
  R: 'radiant',
  T: 'thunder',
};

const PROPERTY_LABELS: Record<string, string> = {
  A: 'Ammunition',
  AF: 'Ammunition (Firearm)',
  F: 'Finesse',
  H: 'Heavy',
  L: 'Light',
  LD: 'Loading',
  R: 'Reach',
  RLD: 'Reload',
  S: 'Special',
  T: 'Thrown',
  '2H': 'Two-Handed',
  V: 'Versatile',
};

/**
 * Converts 5e.tools raw item JSON into `MasterItem` documents
 * for local storage in the `compendium-items` collection.
 *
 * Mirrors `FiveEToolsSpellAdapter` in structure and conventions.
 */
export class FiveEToolsItemAdapter {
  constructor(private readonly sanitizer: FiveEToolsSanitizer) {}

  toMasterItem(raw: FiveEItemRaw): MasterItem {
    const entityKey = this.buildEntityKey(raw.name, raw.source);
    const id = slugifyEntityId(raw.name, raw.source);
    const index = id.replace(/^5etools_item_/, '');

    const descriptionResult = this.sanitizer.parseEntries(raw.entries, {
      defaultSource: raw.source,
      entityType: 'item',
    });

    let description = descriptionResult.merged.markdown || descriptionResult.merged.plainText || '';
    const vehicleBlock = this.buildVehicleBlock(raw);
    if (vehicleBlock) {
      description = `${vehicleBlock}\n\n${description}`.trim();
    }

    const category = this.resolveCategory(raw);
    const damage = this.extractDamage(raw);
    const cost = this.formatCost(raw.value);
    const properties = this.resolveProperties(raw.property);

    return {
      id,
      entityKey,
      index,
      name: raw.name,
      source: raw.source,
      page: raw.page,
      type: raw.type,
      rarity: this.normalizeRarity(raw.rarity),
      weight: raw.weight,
      valueCp: raw.value,
      cost,
      category,
      weaponCategory: raw.weaponCategory,
      armorCategory: this.resolveArmorCategory(raw),
      armorClass: raw.ac,
      damageFormula: damage?.formula,
      damageType: damage?.type,
      properties,
      description,
      requiresAttunement: raw.reqAttune,
      magic: Boolean(raw.wondrous) || (raw.rarity != null && raw.rarity !== 'none'),
      search: descriptionResult.merged,
      provenance: {
        provider: '5etools',
        dataPath: 'data/items',
        sourceFile: `items-${raw.source.toLowerCase()}.json`,
        ingestedAt: new Date().toISOString(),
      },
      sourceFlags: {
        srd: raw.srd,
        basicRules: raw.basicRules,
      },
    };
  }

  buildEntityKey(name: string, source: string): string {
    return `${name}|${source.toUpperCase()}`;
  }

  private buildVehicleBlock(raw: any): string {
    const fields: string[] = [];
    if (raw.vehAc != null) fields.push(`**AC:** ${raw.vehAc}`);
    if (raw.vehHp != null) fields.push(`**HP:** ${raw.vehHp}`);
    if (raw.vehDmgThresh != null) fields.push(`**Damage Threshold:** ${raw.vehDmgThresh}`);
    if (raw.vehSpeed != null) fields.push(`**Speed:** ${raw.vehSpeed}`);
    if (raw.crew != null) fields.push(`**Crew:** ${raw.crew}`);
    if (raw.capPassenger != null) fields.push(`**Passengers:** ${raw.capPassenger}`);
    if (raw.capCargo != null) fields.push(`**Cargo:** ${raw.capCargo}`);

    if (fields.length === 0) return '';
    return '> ' + fields.join(' | ');
  }

  private resolveCategory(raw: FiveEItemRaw): string {
    if (raw.weaponCategory) return `Weapon · ${raw.weaponCategory}`;
    const armorCat = this.resolveArmorCategory(raw);
    if (armorCat) return `Armor · ${armorCat}`;
    return ITEM_TYPE_LABELS[raw.type ?? ''] ?? raw.type ?? 'Item';
  }

  private resolveArmorCategory(raw: FiveEItemRaw): string | undefined {
    const type = raw.type ?? '';
    if (type === 'LA') return 'Light';
    if (type === 'MA') return 'Medium';
    if (type === 'HA') return 'Heavy';
    if (type === 'S') return 'Shield';
    return undefined;
  }

  private extractDamage(raw: FiveEItemRaw): { formula: string; type?: string } | null {
    if (!raw.dmg1) return null;
    const type = raw.dmgType ? (DAMAGE_TYPE_LABELS[raw.dmgType] ?? raw.dmgType) : undefined;
    return { formula: raw.dmg1, type };
  }

  private formatCost(valueCp: number | undefined): string | undefined {
    if (valueCp == null || valueCp <= 0) return undefined;

    if (valueCp >= 100 && valueCp % 100 === 0) {
      return `${valueCp / 100} gp`;
    }
    if (valueCp >= 10 && valueCp % 10 === 0) {
      return `${valueCp / 10} sp`;
    }
    return `${valueCp} cp`;
  }

  private normalizeRarity(rarity: string | undefined): string | undefined {
    if (!rarity || rarity === 'none' || rarity === 'unknown') return undefined;
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  }

  private resolveProperties(props: string[] | undefined): string[] | undefined {
    if (!props?.length) return undefined;
    return props.map((p) => PROPERTY_LABELS[p] ?? p);
  }
}

function mergeSearch(...parts: (SanitizedText | null | undefined)[]): SanitizedText {
  const valid = parts.filter(Boolean) as SanitizedText[];
  return {
    plainText: valid.map((p) => p.plainText).filter(Boolean).join('\n\n'),
    markdown: valid.some((p) => p.markdown)
      ? valid.map((p) => p.markdown ?? p.plainText).filter(Boolean).join('\n\n')
      : undefined,
    tags: valid.flatMap((p) => p.tags),
  };
}
