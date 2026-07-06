import { IExtractedStats } from './types';

/**
 * An NLP heuristics engine that attempts to parse D&D 5e text rules
 * into structured IExtractedStats for automated UI bonuses.
 */
export function extractStatsFromText(text: string): IExtractedStats | undefined {
  if (!text || typeof text !== 'string') return undefined;

  const stats: IExtractedStats = {
    acBonus: 0,
    hpMaxBonus: 0,
    speedBonus: 0,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
  };

  let hasExtracted = false;

  // 1. AC Bonus (e.g. "+1 bonus to AC", "bonus of +2 to AC")
  const acMatch = text.match(/\+(\d+)\s+(?:bonus\s+to\s+AC|to\s+AC)/i);
  if (acMatch && acMatch[1]) {
    stats.acBonus = parseInt(acMatch[1], 10);
    hasExtracted = true;
  }

  // 2. Speed Bonus (e.g. "speed increases by 10 feet")
  const speedMatch = text.match(/speed\s+increases\s+by\s+(\d+)/i);
  if (speedMatch && speedMatch[1]) {
    stats.speedBonus = parseInt(speedMatch[1], 10);
    hasExtracted = true;
  }

  // 3. Resistances (e.g. "resistance to fire and cold damage")
  const resMatch = text.match(/resistance\s+to\s+([a-zA-Z\s,]+)\s+damage/i);
  if (resMatch && resMatch[1]) {
    const types = resMatch[1].split(/\s+and\s+|,/).map(t => t.trim().toLowerCase()).filter(t => t);
    stats.resistances?.push(...types);
    hasExtracted = true;
  }

  // 4. Immunities (e.g. "immunity to poison damage")
  const immMatch = text.match(/immunity\s+to\s+([a-zA-Z\s,]+)\s+damage/i);
  if (immMatch && immMatch[1]) {
    const types = immMatch[1].split(/\s+and\s+|,/).map(t => t.trim().toLowerCase()).filter(t => t);
    stats.immunities?.push(...types);
    hasExtracted = true;
  }

  // 5. Condition Immunities (e.g. "immune to being charmed")
  const condImmMatch = text.match(/immune\s+to\s+being\s+([a-zA-Z\s,]+)/i);
  if (condImmMatch && condImmMatch[1]) {
    const types = condImmMatch[1].split(/\s+and\s+|,/).map(t => t.trim().toLowerCase()).filter(t => t);
    stats.immunities?.push(...types);
    hasExtracted = true;
  }

  if (!hasExtracted) return undefined;

  // Cleanup empty arrays
  if (stats.resistances?.length === 0) delete stats.resistances;
  if (stats.immunities?.length === 0) delete stats.immunities;
  if (stats.vulnerabilities?.length === 0) delete stats.vulnerabilities;
  if (stats.acBonus === 0) delete stats.acBonus;
  if (stats.hpMaxBonus === 0) delete stats.hpMaxBonus;
  if (stats.speedBonus === 0) delete stats.speedBonus;

  return Object.keys(stats).length > 0 ? stats : undefined;
}
