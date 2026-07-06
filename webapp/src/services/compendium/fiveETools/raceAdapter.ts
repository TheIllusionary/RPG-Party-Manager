import { FiveEToolsBaseAdapter } from './baseAdapter';
import type { MasterRace, MasterSubrace, IExtractedStats, IChoiceObject } from './types';
import { extractStatsFromText } from './traitExtractor';
import {
  parseAbilityArray,
  parseSkillProficiencies,
  parseLanguageProficiencies,
} from '../../../shared/utils/raceParser';

export class FiveEToolsRaceAdapter extends FiveEToolsBaseAdapter<any, MasterRace | MasterSubrace> {

  /**
   * Primary entry point. Examines the raw record and dispatches to
   * toBaseRace() or toSubrace() based on whether `raw.raceName` is present.
   */
  public toMasterDocument(raw: any): MasterRace | MasterSubrace {
    if (raw.raceName) {
      return this.toSubrace(raw);
    }
    return this.toBaseRace(raw);
  }

  private parseSpeed(raw: any): string {
    if (typeof raw.speed === 'number') return `${raw.speed} ft.`;
    if (typeof raw.speed === 'object' && raw.speed !== null) {
      const parts: string[] = [];
      if (raw.speed.walk) parts.push(`${raw.speed.walk} ft.`);
      for (const [k, v] of Object.entries(raw.speed)) {
        if (k !== 'walk' && (typeof v === 'number' || typeof v === 'string')) {
          parts.push(`${k} ${v} ft.`);
        }
      }
      return parts.join(', ');
    }
    return '';
  }

  private parseTraits(raw: any): Array<{ name: string; desc: string; stats?: IExtractedStats }> {
    const traits: Array<{ name: string; desc: string; stats?: IExtractedStats }> = [];
    if (!raw.entries) return traits;

    for (const entry of raw.entries) {
      if (typeof entry === 'object' && entry.name && entry.entries) {
        const desc = this.sanitizer.parseEntries([entry]).merged.plainText;
        const stats = extractStatsFromText(desc);
        traits.push({ name: entry.name, desc, ...(stats ? { stats } : {}) });
      } else if (typeof entry === 'string') {
        const desc = this.sanitizer.parseEntries([entry]).merged.plainText;
        const stats = extractStatsFromText(desc);
        traits.push({ name: 'Trait', desc, ...(stats ? { stats } : {}) });
      }
    }
    return traits;
  }

  /** Build a full MasterRace from a base race raw entry (no `raceName` field). */
  private toBaseRace(raw: any): MasterRace {
    const source = raw.source || this.sanitizer.options.defaultSource || 'unknown';
    const entityKey = this.generateEntityKey(source, 'race', raw.name);

    const sizeMap: Record<string, string> = {
      T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan', V: 'Varies',
    };
    const rawSize = Array.isArray(raw.size) ? raw.size[0] : raw.size;
    const size = sizeMap[rawSize as string] || rawSize || 'Medium';

    const speed = this.parseSpeed(raw);
    const traits = this.parseTraits(raw);

    // Parse ability array — split into fixed bonuses and choice blocks
    const { fixed: fixedAbility, choices: abilityChoices } = parseAbilityArray(raw.ability ?? []);
    const skillChoices = parseSkillProficiencies(raw.skillProficiencies ?? []);
    const languageChoices = parseLanguageProficiencies(raw.languageProficiencies ?? []);

    return {
      id: crypto.randomUUID(),
      entityKey,
      index: entityKey,
      name: raw.name,
      source,
      size,
      speed,
      ability: fixedAbility,
      ...(abilityChoices.length > 0 ? { abilityChoices } : {}),
      ...(skillChoices.length > 0 ? { skillChoices } : {}),
      ...(languageChoices.length > 0 ? { languageChoices } : {}),
      traits,
      subraces: [], // populated later by the ETL pipeline after all records are processed
      search: { plainText: raw.name, tags: [] },
      provenance: this.buildProvenance('data/races.json'),
      sourceFlags: this.extractSourceFlags(raw),
    };
  }

  /** Build a MasterSubrace from a raw entry that has a `raceName` field. */
  private toSubrace(raw: any): MasterSubrace {
    const source = raw.source || this.sanitizer.options.defaultSource || 'unknown';
    const parentSource = raw.raceSource || source;
    const parentEntityKey = this.generateEntityKey(parentSource, 'race', raw.raceName);
    const entityKey = this.generateEntityKey(source, 'race', `${raw.raceName}_${raw.name}`);

    const speed = raw.speed ? this.parseSpeed(raw) : undefined;
    const traits = this.parseTraits(raw);

    const { fixed: fixedAbility, choices: abilityChoices } = parseAbilityArray(raw.ability ?? []);
    const skillChoices = parseSkillProficiencies(raw.skillProficiencies ?? []);
    const languageChoices = parseLanguageProficiencies(raw.languageProficiencies ?? []);

    return {
      id: crypto.randomUUID(),
      entityKey,
      parentEntityKey,
      name: raw.name,
      source,
      ...(speed ? { speed } : {}),
      ability: fixedAbility,
      ...(abilityChoices.length > 0 ? { abilityChoices } : {}),
      ...(skillChoices.length > 0 ? { skillChoices } : {}),
      ...(languageChoices.length > 0 ? { languageChoices } : {}),
      traits,
    };
  }
}

/**
 * Post-processing step: given a flat list of races and subraces produced by
 * the adapter, attach subraces to their parent race objects.
 */
export function linkSubracesToRaces(
  allDocs: Array<MasterRace | MasterSubrace>,
): MasterRace[] {
  const races = allDocs.filter((d): d is MasterRace => !('parentEntityKey' in d));
  const subraces = allDocs.filter((d): d is MasterSubrace => 'parentEntityKey' in d);

  const raceMap = new Map<string, MasterRace>(races.map((r) => [r.entityKey, r]));

  for (const subrace of subraces) {
    const parent = raceMap.get(subrace.parentEntityKey);
    if (parent) {
      if (!parent.subraces) parent.subraces = [];
      parent.subraces.push(subrace);
    }
  }

  return races;
}
