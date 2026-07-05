import { IPlayer } from '../../../types';
import type { MasterClass, MasterSubclass, MasterRace, IExtractedStats } from '../../../services/compendium/fiveETools/types';
import { getLevelInfo } from './partyUtils';

// Fallback cleaner for any stale tags in the database (e.g. {@variantrule})
const cleanStaleTags = (desc: string) => {
  if (!desc || typeof desc !== 'string') return desc || '';
  return desc.replace(/\{@[a-zA-Z0-9]+\s+([^}]*)\}|\{@[a-zA-Z0-9]+\}/g, (match, p1) => {
    const payload = p1 || '';
    if (typeof payload === 'string' && payload) {
      const parts = payload.split('|');
      return parts[2] || parts[0];
    }
    return '';
  });
};

export function getActiveTraits(
  player: IPlayer, 
  classes: MasterClass[], 
  subclasses: MasterSubclass[], 
  races: MasterRace[]
) {
  const level = getLevelInfo(player.xp || 0).level;
  const activeFeatures: Array<{name: string; desc: string; source: string; stats?: IExtractedStats; level?: number}> = [];

  // Race
  if (player.race && races) {
    const race = races.find(r => r.entityKey === player.race);
    if (race && race.traits) {
      race.traits.forEach(t => activeFeatures.push({ ...t, desc: cleanStaleTags(t.desc), source: race.name, level: 1 }));
    }
  }

  // Class
  if (player.classType && classes) {
    const cls = classes.find(c => c.entityKey === player.classType);
    if (cls && cls.features) {
      cls.features.filter(f => f.level <= level).forEach(f => activeFeatures.push({ ...f, desc: cleanStaleTags(f.desc), source: cls.name }));
    }
  }

  // Subclass
  if (player.subclassId && subclasses) {
    const sub = subclasses.find(s => s.entityKey === player.subclassId);
    if (sub && sub.features) {
      sub.features.filter(f => f.level <= level).forEach(f => activeFeatures.push({ ...f, desc: cleanStaleTags(f.desc), source: sub.name }));
    }
  }
  
  if (player.optionalSubclassId && subclasses) {
    const sub2 = subclasses.find(s => s.entityKey === player.optionalSubclassId);
    if (sub2 && sub2.features) {
      sub2.features.filter(f => f.level <= level).forEach(f => activeFeatures.push({ ...f, desc: cleanStaleTags(f.desc), source: sub2.name }));
    }
  }

  // Sort chronologically by level
  activeFeatures.sort((a, b) => (a.level || 1) - (b.level || 1));

  return activeFeatures;
}

export function aggregateStats(activeFeatures: ReturnType<typeof getActiveTraits>): IExtractedStats {
  const result: IExtractedStats = {
    acBonus: 0,
    hpMaxBonus: 0,
    speedBonus: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: []
  };

  for (const feat of activeFeatures) {
    if (!feat.stats) continue;
    if (feat.stats.acBonus) result.acBonus = (result.acBonus || 0) + feat.stats.acBonus;
    if (feat.stats.hpMaxBonus) result.hpMaxBonus = (result.hpMaxBonus || 0) + feat.stats.hpMaxBonus;
    if (feat.stats.speedBonus) result.speedBonus = (result.speedBonus || 0) + feat.stats.speedBonus;
    if (feat.stats.resistances) result.resistances?.push(...feat.stats.resistances);
    if (feat.stats.immunities) result.immunities?.push(...feat.stats.immunities);
    if (feat.stats.vulnerabilities) result.vulnerabilities?.push(...feat.stats.vulnerabilities);
  }

  // Deduplicate arrays
  result.resistances = [...new Set(result.resistances)];
  result.immunities = [...new Set(result.immunities)];
  result.vulnerabilities = [...new Set(result.vulnerabilities)];

  return result;
}
