import { FiveEToolsBaseAdapter } from './baseAdapter';
import type { MasterMonster } from './types';

function parseAc(acArray: any[]): string {
  if (!acArray || acArray.length === 0) return '';
  const first = acArray[0];
  if (typeof first === 'number') return String(first);
  if (typeof first === 'object') {
    let s = String(first.ac || '');
    if (first.from) s += ` (${first.from.join(', ')})`;
    if (first.condition) s += ` ${first.condition}`;
    return s.trim();
  }
  return String(first);
}

function parseHp(hpObj: any): string {
  if (!hpObj) return '';
  if (typeof hpObj === 'number') return String(hpObj);
  const avg = hpObj.average || '';
  const formula = hpObj.formula ? `(${hpObj.formula})` : '';
  return `${avg} ${formula}`.trim();
}

function parseSpeed(speedObj: any): string {
  if (!speedObj) return '';
  if (typeof speedObj === 'number') return `${speedObj} ft.`;
  return Object.entries(speedObj)
    .filter(([k, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([k, v]) => (k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`))
    .join(', ');
}

export class FiveEToolsMonsterAdapter extends FiveEToolsBaseAdapter<any, MasterMonster> {
  public toMasterDocument(raw: any): MasterMonster {
    const source = raw.source || this.sanitizer.options.defaultSource || 'unknown';
    const entityKey = this.generateEntityKey(source, 'monster', raw.name);

    let typeStr = '';
    if (typeof raw.type === 'string') typeStr = raw.type;
    else if (typeof raw.type === 'object') typeStr = raw.type.type || '';

    let crStr = '';
    if (typeof raw.cr === 'string') crStr = raw.cr;
    else if (typeof raw.cr === 'object') crStr = raw.cr.cr || '';

    let alignmentStr = '';
    if (Array.isArray(raw.alignment)) alignmentStr = raw.alignment.join('');

    return {
      id: crypto.randomUUID(),
      entityKey,
      index: entityKey,
      name: raw.name,
      source,
      size: Array.isArray(raw.size) ? raw.size[0] : raw.size,
      type: typeStr,
      alignment: alignmentStr,
      cr: crStr,
      ac: parseAc(raw.ac),
      hp: parseHp(raw.hp),
      speed: parseSpeed(raw.speed),
      str: raw.str,
      dex: raw.dex,
      con: raw.con,
      int: raw.int,
      wis: raw.wis,
      cha: raw.cha,
      saves: raw.save || {},
      skills: raw.skill || {},
      senses: raw.senses || [],
      passivePerception: typeof raw.passive === 'number' ? raw.passive : undefined,
      languages: raw.languages || [],
      actions: (raw.action || []).map((a: any) => ({
        name: a.name,
        desc: this.sanitizer.parseEntries(a.entries).merged.plainText,
      })),
      traits: (raw.trait || []).map((t: any) => ({
        name: t.name,
        desc: this.sanitizer.parseEntries(t.entries).merged.plainText,
      })),
      search: this.sanitizer.parseInlineTags(raw.name), // Search plain text
      provenance: this.buildProvenance('data/bestiary/bestiary-placeholder.json'),
      sourceFlags: this.extractSourceFlags(raw),
    };
  }
}
