import type { IPlayer, StatAbbr } from '../../types';
import type { MasterRace, MasterClass } from '../../services/compendium/fiveETools/types';
import { ALL_STATS } from './raceParser';
import { getLevelInfo } from '../../features/battle/utils/partyUtils';

/**
 * Computes the real-time derived stats for a player based on their base attributes,
 * selected race bonuses, subrace bonuses, ASI choices, and class unarmored defense.
 * 
 * @param player The raw IPlayer document containing base stats and choices.
 * @param race The resolved MasterRace document.
 * @param playerClass The resolved MasterClass document.
 * @returns A computed copy of IPlayer with all derived stats applied.
 */
export function calculateDerivedStats(
  player: IPlayer, 
  race?: MasterRace, 
  playerClass?: MasterClass
): IPlayer {
  // Deep clone to avoid mutating the original raw document
  const computed = JSON.parse(JSON.stringify(player)) as IPlayer;

  // 1. Apply Base Race ASIs (fixed)
  if (race && race.ability) {
    for (const abilityEntry of race.ability) {
      for (const [statKey, bonus] of Object.entries(abilityEntry)) {
        if (ALL_STATS.includes(statKey as StatAbbr)) {
          (computed as any)[statKey] += bonus;
        }
      }
    }
  }

  // 2. Apply Subrace ASIs (fixed)
  if (race && race.subraces && computed.subraceId) {
    const subrace = race.subraces.find(sr => sr.entityKey === computed.subraceId);
    if (subrace && subrace.ability) {
      for (const abilityEntry of subrace.ability) {
        for (const [statKey, bonus] of Object.entries(abilityEntry)) {
          if (ALL_STATS.includes(statKey as StatAbbr)) {
            (computed as any)[statKey] += bonus;
          }
        }
      }
    }
  }

  // 3. Apply Chosen ASIs (from `choose` blocks or level-gated ASIs)
  // Backward compatibility: legacy `asiChoices` are treated as Level 1
  if (computed.asiChoices) {
    for (const [statKey, bonus] of Object.entries(computed.asiChoices)) {
      if (ALL_STATS.includes(statKey as StatAbbr) && typeof bonus === 'number' && bonus > 0) {
        (computed as any)[statKey] += bonus;
      }
    }
  }

  // Modern level-gated resolvedChoices
  if (computed.resolvedChoices) {
    for (const levelData of Object.values(computed.resolvedChoices)) {
      if (levelData.asi) {
        for (const [statKey, bonus] of Object.entries(levelData.asi)) {
          if (ALL_STATS.includes(statKey as StatAbbr) && typeof bonus === 'number' && bonus > 0) {
            (computed as any)[statKey] += bonus;
          }
        }
      }
    }
  }

  // 4. Calculate Proficiency Bonus based on level
  const levelInfo = getLevelInfo(computed.xp || 0);
  computed.proficiencyBonus = Math.ceil(levelInfo.level / 4) + 1;

  // 5. Calculate Derived Armor Class
  const dexMod = Math.floor((computed.dex - 10) / 2);
  const conMod = Math.floor((computed.con - 10) / 2);
  const wisMod = Math.floor((computed.wis - 10) / 2);

  let baseAc = 10 + dexMod;
  if (playerClass?.name === 'Barbarian') {
    baseAc = 10 + dexMod + conMod; // Unarmored Defense (Barbarian)
  } else if (playerClass?.name === 'Monk') {
    baseAc = 10 + dexMod + wisMod; // Unarmored Defense (Monk)
  }
  
  // Note: Actual AC might be overridden by equipped armor later in the UI pipeline,
  // but this serves as the foundational derived unarmored AC.
  computed.ac = baseAc;

  // 6. Calculate Max HP
  const baseHp = computed.hpBase || 10;
  computed.hpMax = baseHp + (conMod * levelInfo.level);

  // 7. Merge Fixed Non-Numeric Traits (Skills, Saves, Resistances, Immunities)
  const skillsSet = new Set<string>();
  const savesSet = new Set<string>();
  const resistancesSet = new Set<string>(computed.resistances || []);
  const immunitiesSet = new Set<string>(computed.immunities || []);
  const ccImmunitiesSet = new Set<string>(computed.ccImmunities || []);
  const languagesSet = new Set<string>(computed.languages || []);

  // Initialize from base player
  if (computed.skills) {
    for (const [k, v] of Object.entries(computed.skills)) {
      if (v) skillsSet.add(k);
    }
  }
  if (computed.saves) {
    for (const [k, v] of Object.entries(computed.saves)) {
      if (v) savesSet.add(k);
    }
  }

  // Merge resolved choices (skills and languages)
  if (computed.resolvedChoices) {
    for (const levelData of Object.values(computed.resolvedChoices)) {
      if (levelData.skills) levelData.skills.forEach(s => skillsSet.add(s));
      if (levelData.languages) levelData.languages.forEach(l => languagesSet.add(l));
    }
  }

  // Merge from Race
  if (race) {
    if (race.skills) race.skills.forEach(s => skillsSet.add(s));
    if (race.saves) race.saves.forEach(s => savesSet.add(s));
    if (race.resistances) race.resistances.forEach(r => resistancesSet.add(r));
    if (race.immunities) race.immunities.forEach(i => immunitiesSet.add(i));
    if (race.conditionImmunities) race.conditionImmunities.forEach(i => ccImmunitiesSet.add(i));
    if (race.languages) race.languages.forEach(l => languagesSet.add(l));
  }

  // Merge from Subrace
  if (race && race.subraces && computed.subraceId) {
    const subrace = race.subraces.find(sr => sr.entityKey === computed.subraceId);
    if (subrace) {
      if (subrace.skills) subrace.skills.forEach(s => skillsSet.add(s));
      if (subrace.saves) subrace.saves.forEach(s => savesSet.add(s));
      if (subrace.resistances) subrace.resistances.forEach(r => resistancesSet.add(r));
      if (subrace.immunities) subrace.immunities.forEach(i => immunitiesSet.add(i));
      if (subrace.conditionImmunities) subrace.conditionImmunities.forEach(i => ccImmunitiesSet.add(i));
      if (subrace.languages) subrace.languages.forEach(l => languagesSet.add(l));
    }
  }

  // Merge from Class
  if (playerClass) {
    if (playerClass.skills) playerClass.skills.forEach(s => skillsSet.add(s));
    if (playerClass.saves) playerClass.saves.forEach(s => savesSet.add(s));
    if (playerClass.resistances) playerClass.resistances.forEach(r => resistancesSet.add(r));
    if (playerClass.immunities) playerClass.immunities.forEach(i => immunitiesSet.add(i));
    if (playerClass.conditionImmunities) playerClass.conditionImmunities.forEach(i => ccImmunitiesSet.add(i));
    if (playerClass.languages) playerClass.languages.forEach(l => languagesSet.add(l));
  }

  // Assign back to computed
  computed.skills = {};
  skillsSet.forEach(s => { computed.skills![s] = true; });

  computed.saves = {};
  savesSet.forEach(s => { (computed.saves as any)[s as StatAbbr] = true; });

  computed.resistances = Array.from(resistancesSet);
  computed.immunities = Array.from(immunitiesSet);
  computed.ccImmunities = Array.from(ccImmunitiesSet);
  computed.languages = Array.from(languagesSet);

  return computed;
}
