import { FiveEToolsBaseAdapter } from './baseAdapter';
import type { MasterRace, IExtractedStats } from './types';
import { extractStatsFromText } from './traitExtractor';

export class FiveEToolsRaceAdapter extends FiveEToolsBaseAdapter<any, MasterRace> {
  public toMasterDocument(raw: any): MasterRace {
    const source = raw.source || this.sanitizer.options.defaultSource || 'unknown';
    const entityKey = this.generateEntityKey(source, 'race', raw.name);

    const sizeMap: Record<string, string> = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan', V: 'Varies' };
    const rawSize = Array.isArray(raw.size) ? raw.size[0] : raw.size;
    const size = sizeMap[rawSize as string] || rawSize || 'Medium';
    
    // Parse speed
    let speed = '';
    if (typeof raw.speed === 'number') {
      speed = `${raw.speed} ft.`;
    } else if (typeof raw.speed === 'object' && raw.speed !== null) {
      const parts = [];
      if (raw.speed.walk) parts.push(`${raw.speed.walk} ft.`);
      for (const [k, v] of Object.entries(raw.speed)) {
        if (k !== 'walk' && (typeof v === 'number' || typeof v === 'string')) {
          parts.push(`${k} ${v} ft.`);
        }
      }
      speed = parts.join(', ');
    }

    const traits: Array<{name: string, desc: string, stats?: IExtractedStats}> = [];
    if (raw.entries) {
      for (const entry of raw.entries) {
        if (typeof entry === 'object' && entry.name && entry.entries) {
           const desc = this.sanitizer.parseEntries([entry]).merged.plainText;
           const stats = extractStatsFromText(desc);
           traits.push({
             name: entry.name,
             desc,
             ...(stats ? { stats } : {})
           });
        } else if (typeof entry === 'string') {
           const desc = this.sanitizer.parseEntries([entry]).merged.plainText;
           const stats = extractStatsFromText(desc);
           traits.push({ 
             name: 'Trait', 
             desc,
             ...(stats ? { stats } : {})
           });
        }
      }
    }

    return {
      id: crypto.randomUUID(),
      entityKey,
      index: entityKey,
      name: raw.name,
      source,
      size,
      speed,
      ability: raw.ability || [],
      traits,
      search: { plainText: raw.name, tags: [] }, // Skeleton
      provenance: this.buildProvenance('data/races.json'),
      sourceFlags: this.extractSourceFlags(raw),
    };
  }
}
