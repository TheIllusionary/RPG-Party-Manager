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
// This means:
//   Immunity + Vulnerability = Resistant (2 + -1 = 1)
//   Resistance + Vulnerability = Normal   (1 + -1 = 0)
//   Immunity alone            = Immune    (2 + 0  = 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the raw protection and vulnerability levels for a damage type,
 * scanning both character and equipped items.
 */
function _getDamageLevels(damageType, player, equipment) {
    const type = (damageType || '').toLowerCase().trim();
    const norm = arr => (arr || []).map(x => x.toLowerCase().trim());

    const charImmune = norm(player.immunities).includes(type);
    const charResist = norm(player.resistances).includes(type);
    const charVuln   = norm(player.vulnerabilities).includes(type);

    const items = getEquippedItemsForPlayer(player.id, equipment);
    let itemImmune = false, itemResist = false, itemVuln = false;
    items.forEach(item => {
        if (norm(item.immunities).includes(type))     itemImmune = true;
        if (norm(item.resistances).includes(type))    itemResist = true;
        if (norm(item.vulnerabilities).includes(type)) itemVuln = true;
    });

    // Best protection across all sources
    const protectionLevel = (charImmune || itemImmune) ? 2 : (charResist || itemResist) ? 1 : 0;
    // Any vulnerability = -1
    const vulnLevel = (charVuln || itemVuln) ? -1 : 0;

    return { protectionLevel, vulnLevel, charImmune, charResist, charVuln, itemImmune, itemResist, itemVuln };
}

/**
 * Checks damage multiplier based on target's resistances, immunities, and vulnerabilities,
 * considering both character-level and item-level sources.
 */
export function getDamageMultiplier(damageType, player, equipment) {
    const { protectionLevel, vulnLevel } = _getDamageLevels(damageType, player, equipment);
    const netLevel = protectionLevel + vulnLevel;
    if (netLevel >= 2) return 0;
    if (netLevel === 1) return 0.5;
    if (netLevel <= -1) return 2;
    return 1;
}

/**
 * Returns a human-readable breakdown of damage modifier sources for a damage type.
 * Used in the attack resolution modal to show DMs the per-layer info.
 * 
 * Returns: { charLabel, itemLabel, overallLabel, mult }
 *   charLabel / itemLabel: 'Immunity' | 'Resistance' | 'Vulnerability' | null
 *   overallLabel: 'Immune' | 'Resistant' | 'Vulnerable' | 'Normal'
 *   mult: 0 | 0.5 | 1 | 2
 */
export function getDamageModifierBreakdown(damageType, player, equipment) {
    const { protectionLevel, vulnLevel, charImmune, charResist, charVuln, itemImmune, itemResist, itemVuln } =
        _getDamageLevels(damageType, player, equipment);

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
