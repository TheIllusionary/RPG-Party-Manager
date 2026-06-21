/**
 * Normalizes text to handle typical OCR/copy typos in D&D monster sheets.
 */
export function normalizeText(text) {
    if (!text) return '';
    return text
        .replace(/Atta\s*ck/gi, 'Attack')
        .replace(/Att\s*ack/gi, 'Attack')
        .replace(/slash\s*ing/gi, 'slashing')
        .replace(/pierc\s*ing/gi, 'piercing')
        .replace(/bludgeon\s*ing/gi, 'slashing') // Wait, keep bludgeoning correct
        .replace(/bludgeon\s*ing/gi, 'bludgeoning')
        .replace(/\bld(\d+)/gi, '1d$1') // ld4 -> 1d4
        .replace(/\b([1-9])\s*([dD])\s*(\d+)/g, '$1$2$3') // 1 d 6 -> 1d6
        .replace(/[ \t]+/g, ' ')
        .replace(/\r\n/g, '\n')
        .trim();
}

/**
 * Parses raw text from monster abilities/actions to identify weapons/spells attacks.
 */
export function parseAbilities(abilitiesText) {
    if (!abilitiesText) return [];

    const normalized = normalizeText(abilitiesText);
    const lines = normalized.split('\n');
    const skills = [];
    let currentSkill = null;

    const pushCurrentSkill = () => {
        if (currentSkill) {
            skills.push(currentSkill);
            currentSkill = null;
        }
    };

    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed) return;

        // Clean leading OCR noise (commas, pipes, spaces, dashes)
        trimmed = trimmed.replace(/^[\s,./|*-]+/g, '').trim();
        if (!trimmed) return;

        // Numbered list item check (e.g. "1. Charm Ray.")
        const numMatch = trimmed.match(/^(\d+)\.\s+([A-Z][A-Za-z0-9\s'-]+?)\.\s*(.*)/);
        if (numMatch) {
            pushCurrentSkill();
            currentSkill = {
                name: numMatch[2].trim(),
                text: numMatch[3],
                rawLines: [trimmed]
            };
            return;
        }

        // Action header check (e.g. "Bite.")
        const headingMatch = trimmed.match(/^([A-Z][A-Za-z0-9\s'-,()/]{1,35})[\s.:]+(.*)/);
        if (headingMatch) {
            const nameCandidate = headingMatch[1].trim();
            const rest = headingMatch[2].trim();
            
            // "Hit" is part of the previous attack description
            if (nameCandidate.toLowerCase() === 'hit') {
                if (currentSkill) {
                    currentSkill.rawLines.push(trimmed);
                    currentSkill.text += ' ' + trimmed;
                } else {
                    currentSkill = { name: "Attack", text: trimmed, rawLines: [trimmed] };
                }
                return;
            }

            const wordCount = nameCandidate.split(/\s+/).length;
            const isSentenceStart = /^(the|if|on|or|and|but|a|an|each|when|at|of|to|for|with|by)\b/i.test(nameCandidate);
            const isAttack = /attack/i.test(rest) || /\+\d+\s*to\s*hit/i.test(rest);
            
            if ((wordCount <= 3 && !isSentenceStart) || isAttack || nameCandidate.toLowerCase() === 'eye rays') {
                pushCurrentSkill();
                currentSkill = {
                    name: nameCandidate,
                    text: rest,
                    rawLines: [trimmed]
                };
                return;
            }
        }

        if (currentSkill) {
            currentSkill.rawLines.push(trimmed);
            currentSkill.text += ' ' + trimmed;
        } else {
            currentSkill = {
                name: "Trait",
                text: trimmed,
                rawLines: [trimmed]
            };
        }
    });

    pushCurrentSkill();

    const parsedSkills = [];
    skills.forEach((s, idx) => {
        if (s.name.toLowerCase() === 'eye rays') return;

        const segment = s.text;

        const toHitMatch = segment.match(/\+(\d+)\s*to\s*hit/i);
        const toHit = toHitMatch ? parseInt(toHitMatch[1]) : null;

        const dcMatch = segment.match(/DC\s*(\d+)\s*([a-zA-Z]+)?/i);
        const dc = dcMatch ? parseInt(dcMatch[1]) : null;
        let save = null;
        if (dcMatch && dcMatch[2]) {
            save = dcMatch[2].trim();
        } else {
            const saveMatch = segment.match(/([a-zA-Z]+)\s+saving\s+throw/i);
            if (saveMatch) save = saveMatch[1].trim();
        }

        const damageRegex = /(\d+)\s*\(([^)]+)\)\s*([a-zA-Z]+)\s+damage/gi;
        const damageList = [];
        let dmgMatch;
        while ((dmgMatch = damageRegex.exec(segment)) !== null) {
            damageList.push({
                average: parseInt(dmgMatch[1]),
                formula: dmgMatch[2].replace(/\s+/g, ''),
                type: dmgMatch[3].toLowerCase()
            });
        }

        // Clean up damage list to avoid double-counting versatile or alternative damage types
        const seenTypes = new Set();
        const cleanedDamageList = [];
        damageList.forEach(d => {
            if (!seenTypes.has(d.type)) {
                seenTypes.add(d.type);
                cleanedDamageList.push(d);
            }
        });

        const halfOnSuccess = /half\s+as\s+much/i.test(segment) || /half\s+damage/i.test(segment);

        parsedSkills.push({
            id: `parsed_${idx}_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: s.name,
            toHit,
            dc,
            save,
            damage: cleanedDamageList,
            halfOnSuccess,
            description: segment
        });
    });

    return parsedSkills;
}

/**
 * Rolls dice formula (e.g. "1d4+2", "2d6") and supports Stronger Critical homebrew rules.
 */
export function rollFormula(formula, isCrit = false) {
    if (!formula) {
        return { total: 0, rolls: [], modifier: 0, diceCount: 0, diceSides: 0, critBonus: 0 };
    }
    
    const cleanFormula = formula.replace(/\s+/g, '').toLowerCase();
    
    // Match NdM + P or NdM - P
    const match = cleanFormula.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
    if (!match) {
        // Try flat number
        const flat = parseInt(cleanFormula);
        if (!isNaN(flat)) {
            return { total: flat, rolls: [], modifier: flat, diceCount: 0, diceSides: 0, critBonus: 0 };
        }
        return { total: 0, rolls: [], modifier: 0, diceCount: 0, diceSides: 0, critBonus: 0 };
    }
    
    const diceCount = parseInt(match[1]) || 1;
    const diceSides = parseInt(match[2]);
    const operator = match[3] || '+';
    const modifier = parseInt(match[4]) || 0;
    
    const rolls = [];
    let diceTotal = 0;
    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * diceSides) + 1;
        rolls.push(roll);
        diceTotal += roll;
    }
    
    const modValue = operator === '-' ? -modifier : modifier;
    
    let critBonus = 0;
    if (isCrit) {
        // Stronger Critical homebrew rule: add max value of normal dice roll
        critBonus = diceCount * diceSides;
    }
    
    const total = Math.max(0, diceTotal + modValue + critBonus);
    
    return {
        total,
        rolls,
        modifier: modValue,
        diceCount,
        diceSides,
        critBonus
    };
}

/**
 * Checks damage multiplier based on target's resistances, immunities, and vulnerabilities.
 */
export function getDamageMultiplier(damageType, target) {
    const type = (damageType || '').toLowerCase().trim();
    
    const immunities = (target.immunities || []).map(x => x.toLowerCase().trim());
    const resistances = (target.resistances || []).map(x => x.toLowerCase().trim());
    const vulnerabilities = (target.vulnerabilities || []).map(x => x.toLowerCase().trim());
    
    if (immunities.includes(type)) return 0;
    if (resistances.includes(type)) return 0.5;
    if (vulnerabilities.includes(type)) return 2;
    
    return 1;
}

/**
 * Extracts key status conditions and effects from a skill description.
 */
export function extractExtraEffects(description) {
    if (!description) return null;
    const desc = description.toLowerCase();
    const effects = [];
    if (desc.includes('paralyz')) effects.push('Paralyzed ⏳');
    if (desc.includes('charm')) effects.push('Charmed ✨');
    if (desc.includes('frighten') || desc.includes('fear')) effects.push('Frightened 😨');
    if (desc.includes('slow')) effects.push('Slowed 🐢');
    if (desc.includes('restrain')) effects.push('Restrained 🕸️');
    if (desc.includes('sleep') || desc.includes('unconsciou')) effects.push('Asleep 💤');
    if (desc.includes('petrif') || desc.includes('turn to stone')) effects.push('Petrified 🗿');
    if (desc.includes('blind')) effects.push('Blinded 🕶️');
    if (desc.includes('poison')) effects.push('Poisoned 🤢');
    if (desc.includes('deaf')) effects.push('Deafened 🔇');
    if (desc.includes('stun')) effects.push('Stunned 🌀');
    if (desc.includes('grapple')) effects.push('Grappled ✊');
    if (desc.includes('prone')) effects.push('Prone 🛏️');
    if (desc.includes('banish')) effects.push('Banished 🌀');
    if (desc.includes('incapacitat')) effects.push('Incapacitated 😵');
    if (desc.includes('move')) {
        const m = description.match(/move[s]?\s+(?:it|him|her|the target|them)\s+up\s+to\s+(\d+\s+feet)/i);
        if (m) {
            effects.push(`Moved up to ${m[1]} 🌀`);
        } else {
            effects.push('Moved telekinetically 🌀');
        }
    }
    
    return effects.length > 0 ? effects.join(', ') : null;
}
