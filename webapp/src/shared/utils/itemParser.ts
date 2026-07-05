export interface ParsedItemStats {
  attributes: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
  modifiers: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
  acBonus: number;
  resistances: string[];
  immunities: string[];
}

/**
 * Strips 5etools formatting tags (e.g. {@item shield|phb} -> shield)
 */
function stripTags(text: string): string {
    return text.replace(/{@\w+ ([^|}]+)(?:\|[^}]+)?}/g, '$1');
}

/**
 * Parses a single text string (e.g. from MasterItem description) 
 * and extracts mechanical stats based on recognized natural language patterns.
 */
export function parseItemText(textEntries: string): ParsedItemStats {
  const result: ParsedItemStats = {
    attributes: {},
    modifiers: {},
    acBonus: 0,
    resistances: [],
    immunities: []
  };

  if (!textEntries) return result;

  textEntries = stripTags(textEntries);

  // 1. Stat Setters
  // Example: "Your Strength score becomes 19"
  const statSetterRegex = /(?:your\s+)?(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+score\s+(?:becomes|is|changes\s+to)\s+(\d+)/gi;
  let match;
  while ((match = statSetterRegex.exec(textEntries)) !== null) {
    const stat = match[1].toLowerCase().substring(0, 3) as keyof ParsedItemStats['attributes'];
    result.attributes[stat] = parseInt(match[2], 10);
  }

  // 2. Stat Modifiers
  // Example: "grant a +2 bonus to Constitution"
  const statModRegex = /(?:gain|grants?|have)\s+(?:a\s+)?\+?(\d+)\s+bonus\s+to\s+(strength|dexterity|constitution|intelligence|wisdom|charisma)/gi;
  while ((match = statModRegex.exec(textEntries)) !== null) {
    const stat = match[2].toLowerCase().substring(0, 3) as keyof ParsedItemStats['modifiers'];
    result.modifiers[stat] = (result.modifiers[stat] || 0) + parseInt(match[1], 10);
  }

  // 3. AC Modifiers
  // Example: "You gain a +1 bonus to AC" or "Armor Class +1"
  const acModRegex = /(?:gain|grants?|have|with)\s+(?:a\s+)?\+?(\d+)\s+bonus\s+to\s+(?:armor\s+class|ac)/gi;
  while ((match = acModRegex.exec(textEntries)) !== null) {
    result.acBonus += parseInt(match[1], 10);
  }
  
  const acBonusRegex2 = /(?:ac|armor\s+class)\s*\+(\d+)/gi;
  while ((match = acBonusRegex2.exec(textEntries)) !== null) {
    result.acBonus += parseInt(match[1], 10);
  }

  // 4. Resistances
  // Example: "resistance to fire and cold damage"
  const resRegex = /(?:have|gain)\s+resistance\s+to\s+([a-zA-Z\s,]+)\s+damage/gi;
  while ((match = resRegex.exec(textEntries)) !== null) {
    const typesStr = match[1].replace(/and/g, ',');
    const types = typesStr.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    result.resistances.push(...types);
  }

  // 5. Immunities
  // Example: "immune to poison damage"
  const immRegex = /(?:are|gain|have)\s+immun(?:ity|e)\s+to\s+([a-zA-Z\s,]+)\s+damage/gi;
  while ((match = immRegex.exec(textEntries)) !== null) {
    const typesStr = match[1].replace(/and/g, ',');
    const types = typesStr.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    result.immunities.push(...types);
  }

  // Remove duplicates
  result.resistances = [...new Set(result.resistances)];
  result.immunities = [...new Set(result.immunities)];

  return result;
}

/**
 * Parses an array of string entries from a 5etools item and extracts 
 * mechanical stats based on recognized natural language patterns.
 */
export function parseItemEntries(entries: any[]): ParsedItemStats {
  if (!entries || !Array.isArray(entries)) {
    return {
      attributes: {},
      modifiers: {},
      acBonus: 0,
      resistances: [],
      immunities: []
    };
  }

  // Flatten and join string entries
  const textEntries = entries
    .flat(Infinity)
    .filter(e => typeof e === 'string')
    .join(' ');
    
  return parseItemText(textEntries);
}
