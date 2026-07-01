import { XP_THRESHOLDS } from './constants';
import type { ILevelInfo } from '../../../types/battle';

export function getXpForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(20, Math.floor(Number(level)) || 1));
  return XP_THRESHOLDS[clamped - 1] ?? 0;
}

export function getLevelInfo(xp: number): ILevelInfo {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const currentLevelXp = XP_THRESHOLDS[level - 1] || 0;
  const nextLevelXp = XP_THRESHOLDS[level] ?? null;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpProgress: Math.max(0, xp - currentLevelXp),
  };
}

export function calculateModifier(score: number): number {
  return Math.floor(((score || 10) - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calculateColor(current: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, current / max)) || 0;
  const hue = ratio * 120;
  return `hsl(${hue}, 80%, 50%)`;
}
