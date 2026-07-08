import { generateCompositeKey } from './etlHelpers';
import { parseTags } from './tagParser';
import type { IMonster } from '../../types';

export function extractAC(ac: any): { ac: number; from: string } {
  if (typeof ac === 'number') {
    return { ac, from: '' };
  }
  if (Array.isArray(ac) && ac.length > 0) {
    const first = ac[0];
    if (typeof first === 'number') {
      return { ac: first, from: '' };
    }
    if (first && typeof first === 'object' && first.ac) {
      const fromText = Array.isArray(first.from) ? first.from.join(', ') : (first.from || '');
      return { ac: first.ac, from: fromText };
    }
  }
  return { ac: 10, from: '' };
}

export function extractHP(hp: any): { average: number; formula: string } {
  if (typeof hp === 'number') {
    return { average: hp, formula: '' };
  }
  if (hp && typeof hp === 'object') {
    return {
      average: hp.average || 0,
      formula: hp.formula || ''
    };
  }
  return { average: 0, formula: '' };
}

export function extractSpeed(speed: any): string {
  if (!speed) return '0 ft.';
  if (typeof speed === 'number') return `${speed} ft.`;
  if (typeof speed === 'string') return speed;

  const speeds: string[] = [];
  if (speed.walk) {
    speeds.push(typeof speed.walk === 'number' ? `${speed.walk} ft.` : `${speed.walk.number} ft. ${speed.walk.condition || ''}`.trim());
  }
  for (const [key, val] of Object.entries(speed)) {
    if (key === 'walk') continue;
    if (typeof val === 'number') {
      speeds.push(`${key} ${val} ft.`);
    } else if (val && typeof val === 'object' && 'number' in val) {
      const condition = (val as any).condition ? ` ${(val as any).condition}` : '';
      speeds.push(`${key} ${(val as any).number} ft.${condition}`);
    } else if (typeof val === 'boolean' && val) {
      speeds.push(`${key}`);
    }
  }
  return speeds.join(', ');
}

export function parseEntries(entries: any[]): string {
  if (!entries || !Array.isArray(entries)) return '';
  const lines: string[] = [];

  for (const entry of entries) {
    if (typeof entry === 'string') {
      lines.push(`<p>${parseTags(entry)}</p>`);
    } else if (entry && typeof entry === 'object') {
      if (entry.type === 'list' && Array.isArray(entry.items)) {
        const listItems = entry.items.map((item: any) => {
          if (typeof item === 'string') return `<li>${parseTags(item)}</li>`;
          if (item.type === 'itemSub') {
            return `<li><strong>${item.name}</strong> ${parseTags(item.entry)}</li>`;
          }
          return '';
        }).join('');
        lines.push(`<ul>${listItems}</ul>`);
      } else if (entry.name && entry.entries) {
        lines.push(`<strong>${entry.name}.</strong>`);
        lines.push(parseEntries(entry.entries));
      } else if (entry.entries) {
        lines.push(parseEntries(entry.entries));
      }
    }
  }
  return lines.join('');
}

export function parseMonster(raw: any): IMonster {
  const id = generateCompositeKey(raw.name, raw.source);
  
  const { ac, from } = extractAC(raw.ac);
  const { average, formula } = extractHP(raw.hp);
  const speedStr = extractSpeed(raw.speed);

  // We gracefully handle `_copy` by falling back to whatever raw fields exist.
  // In a robust pipeline, `_copy` would be resolved before hitting this parser.
  
  let featuresHtml = '';
  if (Array.isArray(raw.trait)) {
    featuresHtml += parseEntries(raw.trait);
  }

  let actionsHtml = '';
  if (Array.isArray(raw.action)) {
    actionsHtml += parseEntries(raw.action);
  }

  return {
    id,
    name: raw.name || 'Unknown',
    classType: 'Monster',
    ac,
    hpMax: average,
    hpBase: average,
    hpCurrent: average,
    hpFormula: formula,
    str: raw.str || 10,
    dex: raw.dex || 10,
    con: raw.con || 10,
    int: raw.int || 10,
    wis: raw.wis || 10,
    cha: raw.cha || 10,
    cr: raw.cr ? (typeof raw.cr === 'string' ? raw.cr : raw.cr.cr || '0') : '0',
    background: speedStr, // storing speed in background for now, or could map differently
    features: featuresHtml,
    abilities: actionsHtml,
    isDefault: false
  };
}
