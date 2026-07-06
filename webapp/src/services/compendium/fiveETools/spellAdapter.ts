import type { LogicBlock, RuleExpression } from '../../../types/domain/logic-block';
import { spellSchoolLabel } from './schoolLabels';
import { FiveEToolsSanitizer, slugifyEntityId } from './sanitizer';
import type {
  FiveESpellClassEntry,
  FiveESpellFluffRaw,
  FiveESpellRaw,
  MasterSpell,
  SanitizedText,
} from './types';

const DURATION_UNIT_LABELS: Record<string, string> = {
  round: 'round',
  minute: 'minute',
  hour: 'hour',
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
};

export class FiveEToolsSpellAdapter {
  constructor(
    private readonly sanitizer: FiveEToolsSanitizer,
    private readonly schoolLabels: Record<string, string> = {},
  ) {}

  toMasterSpell(
    raw: FiveESpellRaw,
    classList: FiveESpellClassEntry[] | undefined,
    fluff?: FiveESpellFluffRaw,
  ): MasterSpell {
    const entityKey = this.buildEntityKey(raw.name, raw.source);
    const id = slugifyEntityId(raw.name, raw.source);
    const index = id.replace(/^5etools_spell_/, '');

    const descriptionResult = this.sanitizer.parseEntries(raw.entries, {
      defaultSource: raw.source,
      entityType: 'spell',
    });

    const higherLevelResult = raw.entriesHigherLevel?.length
      ? this.sanitizer.parseEntries(raw.entriesHigherLevel, {
          defaultSource: raw.source,
          entityType: 'spell',
        })
      : null;

    const search = mergeSearch(descriptionResult.merged, higherLevelResult?.merged);
    const classes = this.resolveClassNames(classList, raw.source);
    const { list: components, material } = this.extractComponents(raw.components);
    const damage = this.extractDamage(raw, descriptionResult.merged.plainText);
    const saveType = raw.savingThrow?.[0];
    const concentration = this.isConcentration(raw);
    const ritual = Boolean(raw.ritual);
    const logicBlock = this.buildLogicBlock(raw, search, classes, damage, saveType);

    return {
      id,
      entityKey,
      index,
      name: raw.name,
      source: raw.source,
      page: raw.page,
      level: raw.level,
      school: raw.school,
      schoolLabel: this.schoolLabels[raw.school] ?? spellSchoolLabel(raw.school),
      castingTime: this.formatCastingTime(raw.time),
      range: this.formatRange(raw.range),
      duration: this.formatDuration(raw.duration),
      ritual,
      concentration,
      components,
      material,
      description: descriptionResult.merged.plainText,
      higherLevel: higherLevelResult?.merged.plainText || undefined,
      classes,
      damageFormula: damage?.formula,
      damageType: damage?.type ?? raw.damageInflict?.[0],
      saveType,
      search,
      logicBlock,
      provenance: {
        provider: '5etools',
        dataPath: 'data/spells/spells-phb.json',
        fluffPath: fluff ? `data/spells/fluff-spells-${raw.source.toLowerCase()}.json` : undefined,
        sourceFile: `spells-${raw.source.toLowerCase()}.json`,
        ingestedAt: new Date().toISOString(),
      },
      sourceFlags: {
        srd: raw.srd,
        basicRules: raw.basicRules,
      },
      reprintedAs: raw.reprintedAs,
    };
  }

  buildEntityKey(name: string, source: string): string {
    return `${name}|${source.toUpperCase()}`;
  }

  formatCastingTime(time: FiveESpellRaw['time']): string {
    if (!time?.length) return '—';

    return time
      .map((entry) => {
        const n = entry.number ?? 1;
        const unit = entry.unit ?? 'action';
        if (n === 1 && unit === 'action') return '1 action';
        if (n === 1 && unit === 'bonus') return '1 bonus action';
        if (n === 1 && unit === 'reaction') return '1 reaction';
        if (unit === 'minute') return `${n} minute${n === 1 ? '' : 's'}`;
        if (unit === 'hour') return `${n} hour${n === 1 ? '' : 's'}`;
        return `${n} ${unit}${n === 1 ? '' : 's'}`;
      })
      .join(', ');
  }

  formatRange(range: FiveESpellRaw['range']): string {
    if (!range) return '—';

    const type = String(range.type ?? '');
    const distance = range.distance as Record<string, unknown> | undefined;

    if (type === 'self') return 'Self';
    if (type === 'touch') return 'Touch';
    if (type === 'sight') return 'Sight';
    if (type === 'unlimited') return 'Unlimited';
    if (type === 'special') return 'Special';

    if (distance) {
      const distType = String(distance.type ?? '');
      const amount = distance.amount;

      if (distType === 'self') return 'Self';
      if (distType === 'touch') return 'Touch';
      if (typeof amount === 'number') {
        if (distType === 'feet') return `${amount} feet`;
        if (distType === 'mile' || distType === 'miles') return `${amount} mile${amount === 1 ? '' : 's'}`;
        return `${amount} ${distType}`;
      }
    }

    return type || '—';
  }

  formatDuration(duration: FiveESpellRaw['duration']): string {
    if (!duration?.length) return '—';

    return duration
      .map((entry) => {
        const type = String(entry.type ?? '');
        if (type === 'instant') return 'Instantaneous';
        if (type === 'permanent') return 'Permanent';
        if (type === 'special') return 'Special';

        const inner = entry.duration as Record<string, unknown> | undefined;
        const amount = typeof inner?.amount === 'number' ? inner.amount : 1;
        const unit = String(inner?.type ?? 'round');
        const unitLabel = DURATION_UNIT_LABELS[unit] ?? unit;
        const base = `${amount} ${unitLabel}${amount === 1 ? '' : 's'}`;

        if (entry.concentration) return `Concentration, up to ${base}`;
        return base;
      })
      .join(', ');
  }

  extractComponents(components: FiveESpellRaw['components']): { list: string[]; material?: string } {
    if (!components) return { list: [] };

    const list: string[] = [];
    if (components.v) list.push('V');
    if (components.s) list.push('S');
    if (components.m) {
      list.push('M');
      if (typeof components.m === 'string') {
        return { list, material: components.m };
      }
    }

    return { list };
  }

  buildLogicBlock(
    raw: FiveESpellRaw,
    sanitized: SanitizedText,
    classes: string[],
    damage: { formula: string; type?: string } | null,
    saveType?: string,
  ): LogicBlock {
    const blockId = slugifyEntityId(raw.name, raw.source);
    const now = new Date().toISOString();

    const compute: RuleExpression = damage
      ? { kind: 'formula', expression: damage.formula }
      : { kind: 'literal', value: 0 };

    return {
      id: blockId,
      name: raw.name,
      description: sanitized.plainText,
      trigger: 'on_spell_cast',
      enabled: true,
      effects: [],
      updatedAt: now,
      conditions:
        raw.level > 0 ? [{ field: 'variables.spellLevel', op: 'gte', value: raw.level }] : undefined,
      compute,
      customAttributes: {
        provider: '5etools',
        entityKey: this.buildEntityKey(raw.name, raw.source),
        spellLevel: raw.level,
        school: this.schoolLabels[raw.school] ?? spellSchoolLabel(raw.school),
        castingTime: this.formatCastingTime(raw.time),
        range: this.formatRange(raw.range),
        duration: this.formatDuration(raw.duration),
        ritual: Boolean(raw.ritual),
        concentration: this.isConcentration(raw),
        classes,
        damageType: damage?.type ?? raw.damageInflict?.[0],
        saveType,
      },
    };
  }

  private resolveClassNames(classList: FiveESpellClassEntry[] | undefined, spellSource: string): string[] {
    if (!classList?.length) return [];

    const names = new Set<string>();
    for (const entry of classList) {
      if (entry.source.toUpperCase() === spellSource.toUpperCase()) {
        names.add(entry.name);
      }
    }

    if (names.size === 0) {
      for (const entry of classList) {
        names.add(entry.name);
      }
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  }

  private isConcentration(raw: FiveESpellRaw): boolean {
    if (raw.concentration != null) return Boolean(raw.concentration);
    return Boolean(raw.duration?.some((d) => Boolean(d.concentration)));
  }

  private extractDamage(
    raw: FiveESpellRaw,
    description: string,
  ): { formula: string; type?: string } | null {
    const scaling = raw.scalingLevelDice as
      | { scaling?: Record<string, string>; label?: string }
      | undefined;

    if (scaling?.scaling) {
      const levels = Object.keys(scaling.scaling)
        .map((k) => Number.parseInt(k, 10))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);
      const firstLevel = levels[0];
      if (firstLevel != null) {
        return {
          formula: scaling.scaling[String(firstLevel)],
          type: raw.damageInflict?.[0],
        };
      }
    }

    const damageMatch = description.match(/\b(\d+d\d+(?:\s*\+\s*\d+)?)\b/i);
    if (damageMatch) {
      return { formula: damageMatch[1].replace(/\s+/g, ''), type: raw.damageInflict?.[0] };
    }

    return null;
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

/** Resolve class list from sources.json for a spell. */
export function resolveSpellClassesFromSources(
  sourcesMap: Record<string, Record<string, { class?: FiveESpellClassEntry[] }>>,
  spellSource: string,
  spellName: string,
): FiveESpellClassEntry[] | undefined {
  const bySource = sourcesMap[spellSource.toUpperCase()] ?? sourcesMap[spellSource];
  return bySource?.[spellName]?.class;
}
