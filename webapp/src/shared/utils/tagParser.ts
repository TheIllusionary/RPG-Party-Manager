/**
 * Universal Tag Parser for 5e.tools
 * Transforms inline `{@tag}` syntax into UI-ready text or HTML tokens.
 */

export function parseTags(input: string): string {
  if (!input) return input;

  return input.replace(/\{@([a-zA-Z0-9]+)\s*([^}]*)\}|\{@([a-zA-Z0-9]+)\}/g, (match, tag1, payload1, tag2) => {
    const tagName = (tag1 || tag2 || '').toLowerCase();
    const payload = payload1 ? payload1.trim() : '';

    // Handle tag without payload (e.g., {@d20}, {@h})
    if (!payload) {
      if (tagName === 'd20') return 'd20';
      if (tagName === 'h') return 'Hit: ';
      return '';
    }

    const parts = payload.split('|');
    const mainValue = parts[0] || '';
    const source = parts[1] || '';
    const displayOverride = parts.length >= 3 ? parts[2] : '';

    switch (tagName) {
      // 1. Mechanical Tags
      case 'dice':
      case 'damage': {
        const display = displayOverride || mainValue;
        return display === mainValue ? `[${mainValue}]` : display;
      }
      case 'scaledamage':
      case 'scaledice':
        const scaleDisplay = displayOverride || mainValue;
        return scaleDisplay === mainValue ? `[${mainValue}]` : scaleDisplay;
      case 'hit':
        return `+${mainValue.replace(/^\+/, '')}`;
      case 'atk':
        if (mainValue.includes('mw,rw')) return 'Melee or Ranged Weapon Attack:';
        if (mainValue.includes('mw')) return 'Melee Weapon Attack:';
        if (mainValue.includes('rw')) return 'Ranged Weapon Attack:';
        if (mainValue.includes('ms')) return 'Melee Spell Attack:';
        if (mainValue.includes('rs')) return 'Ranged Spell Attack:';
        return 'Attack:';
      case 'recharge':
        return `(Recharge ${mainValue}-6)`;

      // 2. Formatting Tags
      case 'b':
      case 'bold':
        return `<strong>${mainValue}</strong>`;
      case 'i':
      case 'italic':
        return `<em>${mainValue}</em>`;
      case 's':
      case 'strike':
        return `<del>${mainValue}</del>`;

      // 3. Reference Tags
      case 'spell':
      case 'creature':
      case 'item':
      case 'condition':
      case 'status':
      case 'background':
      case 'feat':
      case 'action':
      case 'class':
      case 'subclass': {
        let defaultSource = 'PHB';
        if (tagName === 'creature') defaultSource = 'MM';
        if (tagName === 'item') defaultSource = 'DMG';

        const refSource = source || defaultSource;
        const refId = `${mainValue.toLowerCase()}|${refSource.toUpperCase()}`;
        const refDisplay = displayOverride || mainValue;

        return `<span data-reference-type="${tagName}" data-reference-id="${refId}">${refDisplay}</span>`;
      }

      // 4. Fallbacks and Others
      case 'filter':
        return mainValue;
      case 'chance':
        return source ? source : `${mainValue}%`;
      case 'note':
        return displayOverride || mainValue;
      case 'book':
      case 'adventure':
        return mainValue;
      default:
        return displayOverride || mainValue;
    }
  });
}
