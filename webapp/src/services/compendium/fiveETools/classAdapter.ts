import { FiveEToolsBaseAdapter } from './baseAdapter';
import type { MasterClass, MasterSubclass, IExtractedStats } from './types';
import { extractStatsFromText } from './traitExtractor';
import { parseFixedSkillProficiencies } from '../../../shared/utils/raceParser';

function parseHitDice(hdObj: any): string {
  if (!hdObj) return '';
  return `${hdObj.number || 1}d${hdObj.faces || 8}`;
}

function parseProficiencies(profObj: any): any {
  if (!profObj) return {};
  const armor = profObj.armor || [];
  const weapons = profObj.weapons || [];
  let skills = '';
  const s = profObj.skills && profObj.skills[0];
  if (s && s.choose) {
    skills = `Choose ${s.choose.count || 1} from ${s.choose.from.join(', ')}`;
  }
  return { armor, weapons, skills };
}

export class FiveEToolsClassAdapter extends FiveEToolsBaseAdapter<any, { masterClass: MasterClass; masterSubclasses: MasterSubclass[] }> {
  public toMasterDocument(raw: any, allFeatures: any[] = [], allSubclassFeatures: any[] = []): { masterClass: MasterClass; masterSubclasses: MasterSubclass[] } {
    const source = raw.source || this.sanitizer.options.defaultSource || 'unknown';
    const entityKey = this.generateEntityKey(source, 'class', raw.name);

    const features: Array<{ name: string; desc: string }> = [];
    if (raw.classFeatures && Array.isArray(raw.classFeatures)) {
       for (const featureRef of raw.classFeatures) {
         let pipeStr = '';
         if (typeof featureRef === 'string') {
            pipeStr = featureRef;
         } else if (typeof featureRef === 'object' && featureRef.classFeature) {
            pipeStr = featureRef.classFeature;
         }
         
         if (pipeStr) {
            const parts = pipeStr.split('|');
            const name = parts[0] || '';
            const className = parts[1] || raw.name;
            const classSource = parts[2] || source;
            const level = parts[3] ? parseInt(parts[3], 10) : 1;

            let found = allFeatures.find((f: any) => 
               f.name === name && 
               f.className === className && 
               (!f.classSource || f.classSource === classSource) &&
               f.level === level
            );

            if (!found) {
               found = allFeatures.find((f: any) => 
                  f.name === name && 
                  f.className === className
               );
            }

            if (found && found.entries) {
               const desc = this.sanitizer.parseEntries(found.entries).merged.plainText;
               const stats = extractStatsFromText(desc);
               features.push({
                 name: found.name,
                 desc,
                 level: found.level || level,
                 ...(stats ? { stats } : {})
               });
            } else {
               features.push({ name, desc: '', level });
            }
         }
       }
    }

    const masterSubclasses: MasterSubclass[] = [];
    if (raw.subclasses && Array.isArray(raw.subclasses)) {
      for (const sc of raw.subclasses) {
        const scFeatures: Array<{ name: string; desc: string; level: number }> = [];
        if (sc.subclassFeatures) {
          for (const featureRef of sc.subclassFeatures) {
             let pipeStr = '';
             if (typeof featureRef === 'string') pipeStr = featureRef;
             else if (typeof featureRef === 'object' && featureRef.subclassFeature) pipeStr = featureRef.subclassFeature;
             
             if (pipeStr) {
                // Name|ClassName|ClassSource|SubclassShortName|SubclassSource|Level
                const parts = pipeStr.split('|');
                const name = parts[0] || '';
                const className = parts[1] || raw.name;
                const classSource = parts[2] || source;
                const subclassShortName = parts[3] || sc.shortName || sc.name;
                const subclassSource = parts[4] || sc.source || source;
                const level = parts[5] ? parseInt(parts[5], 10) : 1;

                let found = allSubclassFeatures.find((f: any) => 
                   f.name === name && 
                   f.className === className && 
                   (!f.classSource || f.classSource === classSource) &&
                   f.subclassShortName === subclassShortName &&
                   (!f.subclassSource || f.subclassSource === subclassSource) &&
                   f.level === level
                );

                if (!found) {
                   found = allSubclassFeatures.find((f: any) => 
                      f.name === name && 
                      f.className === className && 
                      f.subclassShortName === subclassShortName
                   );
                }

                if (found && found.entries) {
                   const desc = this.sanitizer.parseEntries(found.entries).merged.plainText;
                   const stats = extractStatsFromText(desc);
                   scFeatures.push({
                     name: found.name,
                     desc,
                     level: found.level || level,
                     ...(stats ? { stats } : {})
                   });
                } else {
                   scFeatures.push({ name, desc: '', level });
                }
             }
          }
        }
        
        const scSource = sc.source || source;
        const scEntityKey = this.generateEntityKey(scSource, 'subclass', `${raw.name}-${sc.shortName || sc.name}`);
        
        masterSubclasses.push({
          id: crypto.randomUUID(),
          entityKey: scEntityKey,
          index: scEntityKey,
          classId: entityKey,
          name: sc.name,
          shortName: sc.shortName || sc.name,
          source: scSource,
          features: scFeatures,
          search: this.sanitizer.parseInlineTags(sc.name),
          provenance: this.buildProvenance('data/class/class-placeholder.json'),
          sourceFlags: this.extractSourceFlags(sc),
        });
      }
    }

    const fixedSkills = raw.startingProficiencies?.skills 
      ? parseFixedSkillProficiencies(raw.startingProficiencies.skills)
      : [];
      
    const saves = Array.isArray(raw.proficiency) 
      ? raw.proficiency.map((s: string) => s.toLowerCase().substring(0, 3)) 
      : [];

    const masterClass: MasterClass = {
      id: crypto.randomUUID(),
      entityKey,
      index: entityKey,
      name: raw.name,
      source,
      hitDice: parseHitDice(raw.hd),
      proficiencies: parseProficiencies(raw.startingProficiencies),
      ...(fixedSkills.length > 0 ? { skills: fixedSkills } : {}),
      ...(saves.length > 0 ? { saves } : {}),
      features,
      search: this.sanitizer.parseInlineTags(raw.name), 
      provenance: this.buildProvenance('data/class/class-placeholder.json'),
      sourceFlags: this.extractSourceFlags(raw),
    };

    return { masterClass, masterSubclasses };
  }
}
