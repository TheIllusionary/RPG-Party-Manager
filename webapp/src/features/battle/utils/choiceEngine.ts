import type { MasterClass, MasterRace, MasterSubrace, IChoiceObject } from '../../../services/compendium/fiveETools/types';
import type { IPlayer, IResolvedChoices } from '../../../types';
import { getLevelInfo } from './partyUtils';

/**
 * Extracts and groups all available choices for a player up to their current level.
 */
export function getAvailableChoices(
  player: IPlayer,
  race?: MasterRace | null,
  subrace?: MasterSubrace | null,
  playerClass?: MasterClass | null
): IChoiceObject[] {
  const currentLevel = getLevelInfo(player.xp || 0).level;
  const allChoices: IChoiceObject[] = [];

  // Level 1: Race & Subrace Choices
  if (race) {
    if (race.abilityChoices) allChoices.push(...race.abilityChoices.map(c => ({ ...c, level: 1 })));
    if (race.skillChoices) allChoices.push(...race.skillChoices.map(c => ({ ...c, level: 1 })));
    if (race.languageChoices) allChoices.push(...race.languageChoices.map(c => ({ ...c, level: 1 })));
  }

  if (subrace) {
    if (subrace.abilityChoices) allChoices.push(...subrace.abilityChoices.map(c => ({ ...c, level: 1 })));
    if (subrace.skillChoices) allChoices.push(...subrace.skillChoices.map(c => ({ ...c, level: 1 })));
    if (subrace.languageChoices) allChoices.push(...subrace.languageChoices.map(c => ({ ...c, level: 1 })));
  }

  // Class Choices (ASIs) up to currentLevel
  if (playerClass && playerClass.features) {
    for (const feature of playerClass.features) {
      if (feature.level <= currentLevel && feature.name.toLowerCase().includes('ability score improvement')) {
        // Yield an ASI choice of 2 points (or 1 feat, though feats aren't fully supported yet)
        allChoices.push({
          type: 'ability',
          count: 2,
          options: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
          level: feature.level,
        });
      }
    }
  }

  return allChoices;
}

/**
 * Determines if a choice at a specific level is fully resolved.
 */
export function isChoiceResolved(
  choice: IChoiceObject,
  resolvedChoices?: IResolvedChoices
): boolean {
  if (!resolvedChoices) return false;
  
  const levelData = resolvedChoices[choice.level || 1];
  if (!levelData) return false;

  if (choice.type === 'ability') {
    const asiKeys = Object.keys(levelData.asi || {});
    // Sum total ASI points spent for this level
    const totalPoints = Object.values(levelData.asi || {}).reduce((sum, val) => sum + val, 0);
    return totalPoints >= choice.count;
  }
  
  if (choice.type === 'skill' || choice.type === 'tool') {
    return (levelData.proficiencies?.length || 0) >= choice.count;
  }

  if (choice.type === 'language') {
    return (levelData.languages?.length || 0) >= choice.count;
  }

  return false;
}
