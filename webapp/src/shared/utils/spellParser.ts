import { generateCompositeKey } from './etlHelpers';
import { parseTags } from './tagParser';

export interface ICompendiumSpell {
  id: string; // Composite key
  name: string;
  source: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: {
    v: boolean;
    s: boolean;
    m?: string;
  };
  duration: string;
  description: string;
  higherLevel?: string;
  classes: string[];
}

/**
 * Parses raw 5e.tools spell JSON arrays into clean `ICompendiumSpell` records for Dexie ingestion.
 * 
 * @param spellsData The parsed JSON object from a `spells-{SOURCE}.json` file.
 * @param sourcesData The parsed JSON object from `sources.json`.
 * @returns Array of normalized spell objects.
 */
export function parseSpells(spellsData: any, sourcesData: any): ICompendiumSpell[] {
  if (!spellsData?.spell || !Array.isArray(spellsData.spell)) return [];

  return spellsData.spell.map((rawSpell: any) => {
    const id = generateCompositeKey(rawSpell.name, rawSpell.source);
    
    // Resolve classes from sourcesData
    let classes: string[] = [];
    if (sourcesData && rawSpell.source && rawSpell.name) {
      const sourceObj = sourcesData[rawSpell.source];
      if (sourceObj && sourceObj[rawSpell.name] && Array.isArray(sourceObj[rawSpell.name].class)) {
        classes = sourceObj[rawSpell.name].class.map((c: { name: string }) => c.name);
      }
    }

    // Traverse and parse rich text descriptions
    const descriptionLines: string[] = [];
    if (Array.isArray(rawSpell.entries)) {
      rawSpell.entries.forEach((entry: any) => {
        if (typeof entry === 'string') {
          descriptionLines.push(`<p>${parseTags(entry)}</p>`);
        } else if (entry.type === 'list' && Array.isArray(entry.items)) {
          const listItems = entry.items
            .filter((item: any) => typeof item === 'string')
            .map((item: any) => `<li>${parseTags(item)}</li>`)
            .join('');
          if (listItems) descriptionLines.push(`<ul>${listItems}</ul>`);
        } else if (entry.type === 'entries' && Array.isArray(entry.entries)) {
          if (entry.name) descriptionLines.push(`<strong>${entry.name}</strong>`);
          entry.entries.forEach((sub: any) => {
             if (typeof sub === 'string') descriptionLines.push(`<p>${parseTags(sub)}</p>`);
          });
        }
      });
    }
    const description = descriptionLines.join('');

    // Parse higher level text
    let higherLevel: string | undefined = undefined;
    if (Array.isArray(rawSpell.entriesHigherLevel)) {
      const hlLines: string[] = [];
      rawSpell.entriesHigherLevel.forEach((hl: any) => {
        if (Array.isArray(hl.entries)) {
          hl.entries.forEach((entry: any) => {
            if (typeof entry === 'string') {
              hlLines.push(`<p>${parseTags(entry)}</p>`);
            }
          });
        }
      });
      if (hlLines.length > 0) {
        higherLevel = hlLines.join('');
      }
    }

    // Parse casting time
    const timeEntry = rawSpell.time?.[0];
    const castingTime = timeEntry ? `${timeEntry.number} ${timeEntry.unit}` : '1 action';

    // Parse range
    let range = 'Self';
    if (rawSpell.range) {
      if (rawSpell.range.type === 'point' && rawSpell.range.distance) {
        range = `${rawSpell.range.distance.amount} ${rawSpell.range.distance.type}`;
      } else if (rawSpell.range.type) {
        range = rawSpell.range.type;
      }
    }

    // Parse components
    const components = {
      v: !!rawSpell.components?.v,
      s: !!rawSpell.components?.s,
      m: undefined as string | undefined
    };
    if (rawSpell.components?.m) {
      if (typeof rawSpell.components.m === 'string') {
        components.m = parseTags(rawSpell.components.m);
      } else if (rawSpell.components.m.text) {
        components.m = parseTags(rawSpell.components.m.text);
      }
    }

    // Parse duration
    const durEntry = rawSpell.duration?.[0];
    let duration = 'Instantaneous';
    if (durEntry) {
      if (durEntry.type === 'instant') {
        duration = 'Instantaneous';
      } else if (durEntry.type === 'timed' && durEntry.duration) {
        duration = `${durEntry.duration.amount} ${durEntry.duration.type}`;
        if (durEntry.concentration) {
          duration = `Concentration, up to ${duration}`;
        }
      }
    }

    return {
      id,
      name: rawSpell.name,
      source: rawSpell.source,
      level: rawSpell.level || 0,
      school: rawSpell.school || 'A',
      castingTime,
      range,
      components,
      duration,
      description,
      higherLevel,
      classes,
    };
  });
}
