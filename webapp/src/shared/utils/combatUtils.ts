// @ts-nocheck — internal OCR parsers; public exports typed via shared/types/combat.ts
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
        const headingMatch = trimmed.match(/^([A-Z][A-Za-z0-9\s'-,()/]{1,35})[\s.:]+(.*)/);;
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

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a flat array of all equipped item objects for a player.
 * Covers all regular slot types and wondrous items.
 * Only items that have a name (i.e. actually equipped) are returned.
 */
export function getEquippedItemsForPlayer(playerId, equipment) {
    const equipped = equipment?.equipped?.[playerId];
    if (!equipped) return [];
    const items = [];
    Object.entries(equipped).forEach(([slotId, slot]) => {
        if (slotId === '__wondrous__') {
            if (Array.isArray(slot)) {
                slot.forEach(w => { if (w?.name) items.push(w); });
            }
        } else {
            if (slot && slot.name && slot.name.trim().length > 0) {
                items.push(slot);
            }
        }
    });
    return items;
}

/**
 * Calculates the effective Armor Class (AC) for a player based on their stats
 * and currently equipped items (ignoring inventory items not equipped).
 */
export function calculateEffectiveAC(player, equipment, buffsDatabase = []) {
    if (!player) return 10;
    
    const equipped = equipment?.equipped?.[player.id];
    const armorSlot = equipped?.armor; // slot renamed from torso to armor
    
    let baseAC = 10;
    const hasArmorEquipped = armorSlot && armorSlot.name && armorSlot.name.trim().length > 0;
    
    if (hasArmorEquipped) {
        const itemBaseAC = armorSlot.baseAC !== undefined && armorSlot.baseAC !== null ? armorSlot.baseAC : 10;
        const modStat = armorSlot.acModifierStat; // e.g., 'dex', 'str', or ''
        let mod = 0;
        if (modStat) {
            const statValue = player[modStat] !== undefined ? player[modStat] : 10;
            const rawMod = Math.floor((statValue - 10) / 2);
            const cap = armorSlot.acModifierCap;
            mod = (cap !== undefined && cap !== null) ? Math.min(rawMod, cap) : rawMod;
        }
        baseAC = itemBaseAC + mod;
    } else {
        baseAC = player.ac !== undefined && player.ac !== null ? player.ac : 10;
    }
    
    // Add acBonus from all OTHER equipped items and wondrous items
    let bonus = 0;
    if (equipped) {
        Object.entries(equipped).forEach(([slotId, slot]) => {
            if (slotId === 'armor') return; // already handled above
            if (slotId === '__wondrous__') {
                if (Array.isArray(slot)) {
                    slot.forEach(w => {
                        if (w && w.name && w.name.trim().length > 0) {
                            bonus += w.acBonus || 0;
                        }
                    });
                }
            } else {
                if (slot && slot.name && slot.name.trim().length > 0) {
                    bonus += slot.acBonus || 0;
                }
            }
        });
    }
    
    let totalAC = baseAC + bonus;

    // Scan active buffs for additionalAC
    if (Array.isArray(buffsDatabase) && buffsDatabase.length > 0) {
        const buffNames = new Set();
        if (player.buffs) {
            player.buffs.forEach(b => buffNames.add(b));
        }
        
        const items = getEquippedItemsForPlayer(player.id, equipment);
        items.forEach(item => {
            if (item.buffs) {
                item.buffs.forEach(b => buffNames.add(b));
            }
        });
        
        buffNames.forEach(name => {
            const config = buffsDatabase.find(x => x.name === name);
            if (config) {
                const isToggle = config.type === 'toggle';
                const isSpent = player.spentBuffs?.[name] === true;
                const isToggledActive = player.buffStates?.[name] !== false;
                const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;
                
                if (isActive && config.additionalAC) {
                    totalAC += config.additionalAC;
                }
            }
        });
    }
    
    return totalAC;
}


// ─────────────────────────────────────────────────────────────────────────────
// DAMAGE MULTIPLIER (Level-Based System)
//
// Protection levels:  Immunity = +2, Resistance = +1
// Vulnerability level: Vulnerability = -1
// Net = max(protectionLevel) + min(0, vulnLevel)
//   net >= 2 → 0×  (immune)
//   net == 1 → 0.5× (resistant)
//   net == 0 → 1×  (normal)
//   net <= -1 → 2× (vulnerable)
//
// Subclass collision rule: subclass vulnerabilities override base resistances/immunities.
// ─────────────────────────────────────────────────────────────────────────────

function normDamageTypes(arr) {
    return (arr || []).map(x => x.toLowerCase().trim());
}

function uniqueTypes(arr) {
    const seen = new Set();
    const out = [];
    (arr || []).forEach((entry) => {
        const key = (entry || '').toLowerCase().trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(entry);
    });
    return out;
}

/**
 * Merges player base damage modifiers with equipped subclass overrides.
 * Subclass vulnerabilities cancel base resistances/immunities for the same type.
 */
export function getEffectiveDamageModifiers(player, subclassData = null) {
    const base = {
        resistances: [...(player?.resistances || [])],
        immunities: [...(player?.immunities || [])],
        vulnerabilities: [...(player?.vulnerabilities || [])],
    };

    if (!subclassData) return base;

    const subclassVulnTypes = new Set(normDamageTypes(subclassData.vulnerabilities));

    const resistances = uniqueTypes([
        ...base.resistances,
        ...(subclassData.resistances || []),
    ]).filter((type) => !subclassVulnTypes.has(type.toLowerCase().trim()));

    const immunities = uniqueTypes([
        ...base.immunities,
        ...(subclassData.immunities || []),
    ]).filter((type) => !subclassVulnTypes.has(type.toLowerCase().trim()));

    const vulnerabilities = uniqueTypes([
        ...base.vulnerabilities,
        ...(subclassData.vulnerabilities || []),
    ]);

    return { resistances, immunities, vulnerabilities };
}

/**
 * Returns the raw protection and vulnerability levels for a damage type,
 * scanning character (with optional subclass merge) and equipped items.
 */
function _getDamageLevels(damageType, player, equipment, subclassData = null) {
    const type = (damageType || '').toLowerCase().trim();
    const mods = getEffectiveDamageModifiers(player, subclassData);
    const norm = normDamageTypes;

    const charImmune = norm(mods.immunities).includes(type);
    const charResist = norm(mods.resistances).includes(type);
    const charVuln   = norm(mods.vulnerabilities).includes(type);

    const items = getEquippedItemsForPlayer(player.id, equipment);
    let itemImmune = false, itemResist = false, itemVuln = false;
    items.forEach(item => {
        if (norm(item.immunities).includes(type))     itemImmune = true;
        if (norm(item.resistances).includes(type))    itemResist = true;
        if (norm(item.vulnerabilities).includes(type)) itemVuln = true;
    });

    const protectionLevel = (charImmune || itemImmune) ? 2 : (charResist || itemResist) ? 1 : 0;
    const vulnLevel = (charVuln || itemVuln) ? -1 : 0;

    return { protectionLevel, vulnLevel, charImmune, charResist, charVuln, itemImmune, itemResist, itemVuln };
}

function _getEnemyDamageLevels(damageType, enemy) {
    const type = (damageType || '').toLowerCase().trim();
    const norm = normDamageTypes;

    const charImmune = norm(enemy?.immunities).includes(type);
    const charResist = norm(enemy?.resistances).includes(type);
    const charVuln   = norm(enemy?.vulnerabilities).includes(type);

    const protectionLevel = charImmune ? 2 : charResist ? 1 : 0;
    const vulnLevel = charVuln ? -1 : 0;

    return { protectionLevel, vulnLevel, charImmune, charResist, charVuln, itemImmune: false, itemResist: false, itemVuln: false };
}

function _netLevelToMultiplier(netLevel) {
    if (netLevel >= 2) return 0;
    if (netLevel === 1) return 0.5;
    if (netLevel <= -1) return 2;
    return 1;
}

/**
 * Checks damage multiplier based on target's resistances, immunities, and vulnerabilities,
 * considering character, subclass, and item-level sources.
 */
export function getDamageMultiplier(damageType, player, equipment, subclassData = null) {
    const { protectionLevel, vulnLevel } = _getDamageLevels(damageType, player, equipment, subclassData);
    return _netLevelToMultiplier(protectionLevel + vulnLevel);
}

export function getEnemyDamageMultiplier(damageType, enemy) {
    const { protectionLevel, vulnLevel } = _getEnemyDamageLevels(damageType, enemy);
    return _netLevelToMultiplier(protectionLevel + vulnLevel);
}

/**
 * Returns a human-readable breakdown of damage modifier sources for a damage type.
 */
export function getDamageModifierBreakdown(damageType, player, equipment, subclassData = null) {
    const { protectionLevel, vulnLevel, charImmune, charResist, charVuln, itemImmune, itemResist, itemVuln } =
        _getDamageLevels(damageType, player, equipment, subclassData);

    const charLabel = charImmune ? 'Immunity' : charResist ? 'Resistance' : charVuln ? 'Vulnerability' : null;
    const itemLabel = itemImmune ? 'Immunity' : itemResist ? 'Resistance' : itemVuln ? 'Vulnerability' : null;

    const netLevel = protectionLevel + vulnLevel;
    let overallLabel = 'Normal';
    let mult = 1;
    if (netLevel >= 2) { overallLabel = 'Immune';      mult = 0; }
    else if (netLevel === 1) { overallLabel = 'Resistant';  mult = 0.5; }
    else if (netLevel <= -1) { overallLabel = 'Vulnerable'; mult = 2; }

    return { charLabel, itemLabel, overallLabel, mult };
}

export function getEnemyDamageModifierBreakdown(damageType, enemy) {
    const { protectionLevel, vulnLevel, charImmune, charResist, charVuln } =
        _getEnemyDamageLevels(damageType, enemy);

    const charLabel = charImmune ? 'Immunity' : charResist ? 'Resistance' : charVuln ? 'Vulnerability' : null;
    const netLevel = protectionLevel + vulnLevel;
    let overallLabel = 'Normal';
    let mult = 1;
    if (netLevel >= 2) { overallLabel = 'Immune';      mult = 0; }
    else if (netLevel === 1) { overallLabel = 'Resistant';  mult = 0.5; }
    else if (netLevel <= -1) { overallLabel = 'Vulnerable'; mult = 2; }

    return { charLabel, itemLabel: null, overallLabel, mult };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVANTAGE / DISADVANTAGE FROM ACTIVE CC EFFECTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines advantage/disadvantage for an attack roll against a target player,
 * based on that player's currently active CC effects (player.cc).
 *
 * Rules applied:
 *   Prone → melee: advantage, ranged: disadvantage
 *   Restrained, Paralyzed, Stunned, Petrified, Asleep, Incapacitated, Blind → advantage
 *   If both advantage and disadvantage sources are present → normal (they cancel)
 *
 * Returns: 'advantage' | 'disadvantage' | 'normal'
 */
export function getAttackAdvantageState(attack, targetPlayer, equipment, buffsDatabase = []) {
    const cc = (targetPlayer.cc || []).map(x => x.toLowerCase());

    // CC keywords that grant attackers advantage
    const advantageKeywords = ['paralyzed', 'stunned', 'petrified', 'asleep', 'incapacitated', 'restrained', 'blind'];
    let hasAdvantage = advantageKeywords.some(kw => cc.some(c => c.includes(kw)));

    // Prone: melee → advantage, ranged → disadvantage, ambiguous → advantage
    const isProne = cc.some(c => c.includes('prone'));
    const isRangedAttack = !!(attack.range) && !attack.reach;
    let hasDisadvantage = false;

    if (isProne) {
        if (isRangedAttack) {
            hasDisadvantage = true;
        } else {
            hasAdvantage = true;
        }
    }

    // Scan target's active buffs for "dodge" (which gives attackers disadvantage)
    if (Array.isArray(buffsDatabase) && buffsDatabase.length > 0) {
        const buffNames = new Set();
        if (targetPlayer.buffs) {
            targetPlayer.buffs.forEach(b => buffNames.add(b));
        }
        const items = getEquippedItemsForPlayer(targetPlayer.id, equipment);
        items.forEach(item => {
            if (item.buffs) {
                item.buffs.forEach(b => buffNames.add(b));
            }
        });

        buffNames.forEach(name => {
            const config = buffsDatabase.find(x => x.name === name);
            if (config) {
                const isToggle = config.type === 'toggle';
                const isSpent = targetPlayer.spentBuffs?.[name] === true;
                const isToggledActive = targetPlayer.buffStates?.[name] !== false;
                const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;

                if (isActive && config.dodge) {
                    hasDisadvantage = true;
                }
            }
        });
    }

    // Advantage and disadvantage cancel each other out
    if (hasAdvantage && hasDisadvantage) return 'normal';
    if (hasAdvantage) return 'advantage';
    if (hasDisadvantage) return 'disadvantage';
    return 'normal';
}

/**
 * Rolls a d20 with advantage, disadvantage, or normal.
 * Returns { roll, rolls, type }
 *   roll: the final d20 result used
 *   rolls: array of all dice rolled (1 or 2 dice)
 *   type: 'advantage' | 'disadvantage' | 'normal'
 */
export function rollWithAdvantageState(advantageState) {
    if (advantageState === 'advantage') {
        const r1 = Math.floor(Math.random() * 20) + 1;
        const r2 = Math.floor(Math.random() * 20) + 1;
        return { roll: Math.max(r1, r2), rolls: [r1, r2], type: 'advantage' };
    } else if (advantageState === 'disadvantage') {
        const r1 = Math.floor(Math.random() * 20) + 1;
        const r2 = Math.floor(Math.random() * 20) + 1;
        return { roll: Math.min(r1, r2), rolls: [r1, r2], type: 'disadvantage' };
    } else {
        const r = Math.floor(Math.random() * 20) + 1;
        return { roll: r, rolls: [r], type: 'normal' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CC (CROWD CONTROL) MODIFIER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a CC effect string for comparison by extracting just the word part
 * (strips emoji and trims).
 */
function normaliseCCEffect(eff) {
    return (eff || '').replace(/[^\w\s]/g, '').trim().toLowerCase().split(/\s+/)[0];
}

/**
 * Gets the modifier for a specific CC effect being applied to a player,
 * considering both character-level and item-level CC resistances/immunities/vulnerabilities.
 *
 * Uses the same level-based system as damage:
 *   Immunity (+2), Resistance (+1), Vulnerability (-1)
 *   net >= 2 → 'immune', net == 1 → 'resistant', net <= -1 → 'vulnerable', else → 'normal'
 *
 * Returns: 'immune' | 'resistant' | 'vulnerable' | 'normal'
 */
export function getCCModifier(ccEffect, player, equipment) {
    const effectKey = normaliseCCEffect(ccEffect);
    const matchesEffect = arr =>
        (arr || []).some(x => normaliseCCEffect(x) === effectKey);

    const charImmune = matchesEffect(player.ccImmunities);
    const charResist = matchesEffect(player.ccResistances);
    const charVuln   = matchesEffect(player.ccVulnerabilities);

    const items = getEquippedItemsForPlayer(player.id, equipment);
    let itemImmune = false, itemResist = false, itemVuln = false;
    items.forEach(item => {
        if (matchesEffect(item.ccImmunities))     itemImmune = true;
        if (matchesEffect(item.ccResistances))    itemResist = true;
        if (matchesEffect(item.ccVulnerabilities)) itemVuln = true;
    });

    const protectionLevel = (charImmune || itemImmune) ? 2 : (charResist || itemResist) ? 1 : 0;
    const vulnLevel = (charVuln || itemVuln) ? -1 : 0;
    const netLevel = protectionLevel + vulnLevel;

    if (netLevel >= 2) return 'immune';
    if (netLevel === 1) return 'resistant';
    if (netLevel <= -1) return 'vulnerable';
    return 'normal';
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONDITION EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

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

export function getSaveModifiers(player, ccEffect, equipment, buffsDatabase = [], saveStatKey = null) {
    let advantageState = 'normal';
    let saveBonus = 0;
    
    let hasAdv = false;
    let hasDis = false;
    
    if (ccEffect) {
        const normalizedCc = ccEffect.split(' ')[0].toLowerCase().trim();
        
        let isResistant = (player.ccResistances || []).some(r => r.toLowerCase().includes(normalizedCc));
        let isVulnerable = (player.ccVulnerabilities || []).some(v => v.toLowerCase().includes(normalizedCc));
        let isImmune = (player.ccImmunities || []).some(i => i.toLowerCase().includes(normalizedCc));
        
        const items = getEquippedItemsForPlayer(player.id, equipment);
        items.forEach(item => {
            if ((item.ccResistances || []).some(r => r.toLowerCase().includes(normalizedCc))) isResistant = true;
            if ((item.ccVulnerabilities || []).some(v => v.toLowerCase().includes(normalizedCc))) isVulnerable = true;
            if ((item.ccImmunities || []).some(i => i.toLowerCase().includes(normalizedCc))) isImmune = true;
        });
        
        if (isResistant) hasAdv = true;
        if (isVulnerable) hasDis = true;
        if (isImmune) {
            hasAdv = true;
        }
    }
    
    if (Array.isArray(buffsDatabase) && buffsDatabase.length > 0) {
        const buffNames = new Set();
        if (player.buffs) {
            player.buffs.forEach(b => buffNames.add(b));
        }
        const items = getEquippedItemsForPlayer(player.id, equipment);
        items.forEach(item => {
            if (item.buffs) {
                item.buffs.forEach(b => buffNames.add(b));
            }
        });
        
        buffNames.forEach(name => {
            const config = buffsDatabase.find(x => x.name === name);
            if (config) {
                const isToggle = config.type === 'toggle';
                const isSpent = player.spentBuffs?.[name] === true;
                const isToggledActive = player.buffStates?.[name] !== false;
                const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;
                
                if (isActive) {
                    let applyAdv = false;
                    let applyDis = false;

                    if (config.advantageSave) {
                        if (config.advantageSaveStats !== undefined) {
                            if (saveStatKey && config.advantageSaveStats[saveStatKey] === true) {
                                applyAdv = true;
                            }
                        } else {
                            applyAdv = true;
                        }
                    }
                    if (config.disadvantageSave) {
                        if (config.disadvantageSaveStats !== undefined) {
                            if (saveStatKey && config.disadvantageSaveStats[saveStatKey] === true) {
                                applyDis = true;
                            }
                        } else {
                            applyDis = true;
                        }
                    }

                    if (applyAdv) hasAdv = true;
                    if (applyDis) hasDis = true;
                    if (config.savingThrowBonus) saveBonus += config.savingThrowBonus;
                }
            }
        });
    }
    
    if (hasAdv && hasDis) advantageState = 'normal';
    else if (hasAdv) advantageState = 'advantage';
    else if (hasDis) advantageState = 'disadvantage';
    
    return { advantageState, saveBonus };
}

export function calculateEffectiveEnemyAC(enemy, buffsDatabase = []) {
    if (!enemy) return 10;
    let totalAC = enemy.ac || 10;
    
    if (Array.isArray(buffsDatabase) && buffsDatabase.length > 0 && enemy.buffs) {
        enemy.buffs.forEach(name => {
            const config = buffsDatabase.find(x => x.name === name);
            if (config) {
                const isToggle = config.type === 'toggle';
                const isSpent = enemy.spentBuffs?.[name] === true;
                const isToggledActive = enemy.buffStates?.[name] !== false;
                const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;
                
                if (isActive && config.additionalAC) {
                    totalAC += config.additionalAC;
                }
            }
        });
    }
    return totalAC;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELL COSTS, FATIGUE & PLAYER RESOURCE RULES
// Legacy VBA (SpellPlayer1–6): cost = 4 + level^2.1; if level > 5, also + level^2.25
// ─────────────────────────────────────────────────────────────────────────────

/** HP sacrificed per 1 Mana gained (standard casters). */
export const HP_TO_MANA_HP_COST = 2;
export const HP_TO_MANA_GAIN = 1;

/** Mana spent per 1 HP healed (standard casters). */
export const MANA_TO_HP_MANA_COST = 1;
export const MANA_TO_HP_GAIN = 1;

/** Blood Magic: fixed HP cost per spell level. */
export const VAMPIRE_HP_PER_SPELL_LEVEL = 10;

/** Spell levels 1–3 tracked for combat fatigue. */
export const FATIGUE_TRACKED_MAX_LEVEL = 3;

/** +50% mana cost per prior cast of the same low-level spell this combat. */
export const FATIGUE_PENALTY_PER_REPEAT = 0.5;

/**
 * Base mana cost from legacy Excel macros (levels 1–9).
 * @param {number} spellLevel
 * @returns {number}
 */
export function getBaseSpellManaCost(spellLevel) {
    const level = Math.max(1, Math.min(9, Math.floor(Number(spellLevel) || 1)));
    let cost = 4 + Math.pow(level, 2.1);
    if (level > 5) {
        cost += Math.pow(level, 2.25);
    }
    return Math.floor(cost);
}

/** @returns {Record<number, number>} */
export function getSpellManaCostTable() {
    const table = {};
    for (let level = 1; level <= 9; level += 1) {
        table[level] = getBaseSpellManaCost(level);
    }
    return table;
}

export function getVampireSpellHpCost(spellLevel) {
    const level = Math.max(1, Math.min(9, Math.floor(Number(spellLevel) || 1)));
    return VAMPIRE_HP_PER_SPELL_LEVEL * level;
}

export function isVampirePlayer(player, subclassData = null) {
    if (subclassData?.resourceTrait === 'vampire') return true;
    if (subclassData?.resourceTrait === 'standard') return false;
    return player?.resourceTrait === 'vampire';
}

/**
 * Fatigue multiplier for repeated lvl 1–3 casts in the same combat.
 * @param {number} spellLevel
 * @param {number[]} [recentSpells]
 */
export function getFatigueMultiplier(spellLevel, recentSpells = []) {
    const level = Math.floor(Number(spellLevel) || 0);
    if (level < 1 || level > FATIGUE_TRACKED_MAX_LEVEL) return 1;
    const priorCasts = recentSpells.filter((l) => l === level).length;
    return 1 + priorCasts * FATIGUE_PENALTY_PER_REPEAT;
}

export function getStarveMultiplier(manaExhaustion = 0) {
    return 1 + Math.max(0, manaExhaustion);
}

/**
 * Final mana cost including fatigue (recentSpells) and Starve stacks (manaExhaustion).
 */
export function getEffectiveSpellManaCost(player, spellLevel) {
    const base = getBaseSpellManaCost(spellLevel);
    const fatigue = getFatigueMultiplier(spellLevel, player?.recentSpells);
    const starve = getStarveMultiplier(player?.manaExhaustion);
    return Math.floor(base * fatigue * starve);
}

export function getSpellCostPreview(player, spellLevel, subclassData = null) {
    if (isVampirePlayer(player, subclassData)) {
        return { cost: getVampireSpellHpCost(spellLevel), resource: 'hp' };
    }
    return { cost: getEffectiveSpellManaCost(player, spellLevel), resource: 'mana' };
}

export function appendRecentSpell(recentSpells, spellLevel) {
    const level = Math.floor(Number(spellLevel) || 0);
    if (level < 1 || level > 9) return recentSpells || [];
    return [...(recentSpells || []), level];
}

export function computeLimitBreakGain(player, actualDamageTaken, maxHp) {
    if (actualDamageTaken <= 0) return player.ultCurrent ?? 0;
    const conMod = Math.floor(((player.con ?? 10) - 10) / 2);
    const damageMultiplier = Math.max(0.6, Math.min(1.5, 1.35 - 0.15 * conMod));
    const limitBreakMaxDamage = maxHp * damageMultiplier;
    if (limitBreakMaxDamage <= 0) return player.ultCurrent ?? 0;
    const points = (actualDamageTaken / limitBreakMaxDamage) * (player.ultMax ?? 100);
    return Math.min(player.ultMax ?? 100, (player.ultCurrent ?? 0) + points);
}

/**
 * Suffer damage — subtracts HP (temp HP first) and charges Limit Break.
 */
export function applyDamageToPlayer(player, amount, maxHp) {
    const damage = Math.floor(Number(amount) || 0);
    if (damage <= 0) {
        return {
            hpCurrent: player.hpCurrent,
            hpTemp: player.hpTemp || 0,
            ultCurrent: player.ultCurrent ?? 0,
        };
    }

    let newHpTemp = player.hpTemp || 0;
    let remainingDamage = damage;
    if (newHpTemp > 0) {
        const absorbed = Math.min(newHpTemp, remainingDamage);
        newHpTemp -= absorbed;
        remainingDamage -= absorbed;
    }

    const originalHp = player.hpCurrent;
    const newHp = Math.max(0, originalHp - remainingDamage);
    const actualDamageTaken = originalHp - newHp;

    let newUlt = player.ultCurrent ?? 0;
    if (actualDamageTaken > 0 && originalHp > 0) {
        newUlt = computeLimitBreakGain(player, actualDamageTaken, maxHp);
    }
    if (newHp <= 0) newUlt = 0;

    return { hpCurrent: newHp, hpTemp: newHpTemp, ultCurrent: newUlt };
}

/**
 * Spend HP as a resource — does NOT charge Limit Break.
 * Blocked when cost >= current HP (prevents accidental death).
 */
export function consumeHpFromPlayer(player, amount) {
    const cost = Math.floor(Number(amount) || 0);
    if (cost <= 0) {
        return { ok: false, error: 'Invalid HP cost' };
    }
    if (cost >= player.hpCurrent) {
        return { ok: false, error: 'Cost would be lethal — action blocked' };
    }

    return {
        ok: true,
        hpCurrent: player.hpCurrent - cost,
        hpTemp: player.hpTemp || 0,
        ultCurrent: player.ultCurrent ?? 0,
    };
}

/** Heal HP — does not affect Limit Break. */
export function applyHealToPlayer(player, amount, maxHp) {
    const heal = Math.abs(Math.floor(Number(amount) || 0));
    if (heal <= 0) {
        return {
            hpCurrent: player.hpCurrent,
            hpTemp: player.hpTemp || 0,
            ultCurrent: player.ultCurrent ?? 0,
        };
    }
    return {
        hpCurrent: Math.min(maxHp, player.hpCurrent + heal),
        hpTemp: player.hpTemp || 0,
        ultCurrent: player.ultCurrent ?? 0,
    };
}

export function applyTempHpToPlayer(player, amount) {
    const temp = Math.abs(Math.floor(Number(amount) || 0));
    return {
        hpCurrent: player.hpCurrent,
        hpTemp: Math.max(player.hpTemp || 0, temp),
        ultCurrent: player.ultCurrent ?? 0,
    };
}

/**
 * Cast a spell — vampire uses consumeHP; standard uses mana with fatigue/starve.
 */
export function castSpellOnPlayer(player, spellLevel, maxHp, subclassData = null) {
    const level = Math.floor(Number(spellLevel) || 0);
    if (level < 1 || level > 9) {
        return { ok: false, error: 'Spell level must be 1–9' };
    }

    if (isVampirePlayer(player, subclassData)) {
        const hpCost = getVampireSpellHpCost(level);
        const hpResult = consumeHpFromPlayer(player, hpCost);
        if (!hpResult.ok) return hpResult;
        return {
            ok: true,
            ...hpResult,
            recentSpells: appendRecentSpell(player.recentSpells, level),
            costPaid: hpCost,
            costResource: 'hp',
        };
    }

    const manaCost = getEffectiveSpellManaCost(player, level);
    if ((player.manaCurrent ?? 0) < manaCost) {
        return { ok: false, error: `Not enough mana (need ${manaCost})` };
    }

    return {
        ok: true,
        hpCurrent: player.hpCurrent,
        hpTemp: player.hpTemp || 0,
        ultCurrent: player.ultCurrent ?? 0,
        manaCurrent: (player.manaCurrent ?? 0) - manaCost,
        recentSpells: appendRecentSpell(player.recentSpells, level),
        costPaid: manaCost,
        costResource: 'mana',
    };
}

/** Standard: sacrifice HP (no ult charge) to restore mana. */
export function convertHpToMana(player, maxHp, maxMana) {
    const hpResult = consumeHpFromPlayer(player, HP_TO_MANA_HP_COST);
    if (!hpResult.ok) return hpResult;
    return {
        ok: true,
        ...hpResult,
        manaCurrent: Math.min(maxMana, (player.manaCurrent ?? 0) + HP_TO_MANA_GAIN),
    };
}

/** Standard: spend mana to heal HP. */
export function convertManaToHp(player, maxHp) {
    if ((player.manaCurrent ?? 0) < MANA_TO_HP_MANA_COST) {
        return { ok: false, error: 'Not enough mana' };
    }
    const healResult = applyHealToPlayer(player, -MANA_TO_HP_GAIN, maxHp);
    return {
        ok: true,
        ...healResult,
        manaCurrent: (player.manaCurrent ?? 0) - MANA_TO_HP_MANA_COST,
    };
}
