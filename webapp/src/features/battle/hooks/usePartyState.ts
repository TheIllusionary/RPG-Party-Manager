import { useState, useEffect, useRef, useCallback } from 'react';
import { ALL_CC_EFFECTS, DND_SKILLS, STATS_LIST } from '../utils/constants';
import { getXpForLevel, getLevelInfo, calculateModifier, formatModifier, calculateColor } from '../utils/partyUtils';
import {
    rollFormula,
    getCCModifier,
    applyDamageToPlayer,
    applyHealToPlayer,
    applyTempHpToPlayer,
    castSpellOnPlayer,
    convertHpToMana,
    convertManaToHp,
    isVampirePlayer,
    HP_TO_MANA_HP_COST,
    HP_TO_MANA_GAIN,
    MANA_TO_HP_MANA_COST,
    MANA_TO_HP_GAIN,
} from '../../../shared/utils/combatUtils';
import { resolvePlayerResources } from '../../../shared/utils/campaignRulesResolver';
import { repairPlayerHpFields } from '../../../shared/utils/migrationUtils';
import { isManaCastingEnabled, isSpellFatigueActive, isSpellSlotsCastingActive } from '../../../shared/utils/castingSystem';
import {
  adjustSpellSlot,
  buildSpellSlotsForLevel,
  castSpellWithSlot,
  getPlayerSpellSlots,
  playerQualifiesForSpellSlots,
  restoreSpellSlotsToMax,
} from '../../../shared/utils/spellSlotUtils';
import { getCasterProgression, getClassAbilityProfile } from '../../../shared/schema/classAbilityMap';
import {
  hpChangeTrigger,
  hpChangeVariables,
  mergePlayerWithRules,
} from '../../../shared/utils/campaignRulesRuntime';
import { getActiveTraits, aggregateStats } from '../utils/traitUtils';
import { CONDITIONS_DICT, deriveConditions } from '../../../data/conditions';
import type { IPartyState, IUsePartyStateParams } from '../../../types/battle';
import type { IInventoryItem, IPlayer, StatAbbr } from '../../../types';
import type { LogicBlock } from '../../../types/domain';
import type {
  ICastSpellResult,
  IHpManaConversionResult,
  IPlayerSpriteInfo,
  IDndSkill,
} from '../../../types/battle';

export default function usePartyState({
    data,
    updateData,
    equipment,
    subclasses,
    buffsDatabase,
    config,
    battleMode,
    logicBlocks,
    setBattleNotes = () => {},
    compendiumClasses,
    compendiumSubclasses,
    compendiumRaces,
}: IUsePartyStateParams): IPartyState {
const focusAndSelectRef = useCallback((el) => {
    if (el) {
        setTimeout(() => {
            el.focus();
            el.select();
        }, 10);
    }
}, []);

const [editingId, setEditingId] = useState(null);

const [inlineCastPlayerId, setInlineCastPlayerId] = useState(null);
const [actionToast, setActionToast] = useState('');
const prevBattleModeRef = useRef(battleMode);
const hpRepairDoneRef = useRef(false);

useEffect(() => {
    if (hpRepairDoneRef.current || !Array.isArray(data) || data.length === 0) return;
    let changed = false;
    const repaired = data.map((p) => {
        const fix = repairPlayerHpFields(p);
        if (!fix) return p;
        changed = true;
        return { ...p, ...fix };
    });
    hpRepairDoneRef.current = true;
    if (changed) updateData(repaired);
}, [data, updateData]);

const showActionToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(''), 2500);
};

useEffect(() => {
    if (prevBattleModeRef.current && !battleMode) {
        if (!Array.isArray(data)) return;
        const needsClear = data.some(p => (p.recentSpells || []).length > 0);
        if (needsClear) {
            updateData(data.map(p => ({ ...p, recentSpells: [] })));
        }
    }
    prevBattleModeRef.current = battleMode;
}, [battleMode]);

const [playerEditField, setPlayerEditField] = useState(null); // { id, field }
const [playerEditValue, setPlayerEditValue] = useState('');
const [buffInputPlayerId, setBuffInputPlayerId] = useState<string | null>(null);
const [buffSearchText, setBuffSearchText] = useState('');
const [expandedPlayers, setExpandedPlayers] = useState({});

const getPlayerSubclass = (player) => {
    if (!player?.subclassId) return null;
    return compendiumSubclasses?.find(s => s.entityKey === player.subclassId) || subclasses?.find(s => s.id === player.subclassId) || null;
};

const getOptionalPlayerSubclass = (player) => {
    if (!player?.optionalSubclassId) return null;
    return compendiumSubclasses?.find(s => s.entityKey === player.optionalSubclassId) || subclasses?.find(s => s.id === player.optionalSubclassId) || null;
};

const playerUsesVampire = (player) => isVampirePlayer(player, getPlayerSubclass(player));

const castingUsesMana = isManaCastingEnabled(logicBlocks);
const castingUsesSpellSlots = isSpellSlotsCastingActive(logicBlocks);
const spellFatigueEnabled = isSpellFatigueActive(logicBlocks);

const getPlayerSpellSlotsFor = (player: IPlayer) =>
    getPlayerSpellSlots(player, getLevelInfo(player.xp ?? 0).level);

const adjustPlayerSpellSlot = (playerId: string, slotLevel: number, delta: number) => {
    const player = data.find((p) => p.id === playerId);
    if (!player) return;
    const level = getLevelInfo(player.xp ?? 0).level;
    updatePlayer(playerId, {
        spellSlots: adjustSpellSlot(player, slotLevel, delta, level),
    });
};

const [minimizedPlayers, setMinimizedPlayers] = useState(() => {
    const initial = {};
    const isStartupMinimized = config?.startupView === 'party-minimized';
    if (Array.isArray(data)) {
        data.forEach(p => {
            initial[p.id] = isStartupMinimized;
        });
    }
    return initial;
});
const isPlayerMinimized = (id) => minimizedPlayers[id] === true;

const computePlayerManaDelta = (player, amount) => {
    const maxMana = calculateMaxMana(player);
    if (amount > 0) return Math.max(0, player.manaCurrent - amount);
    if (amount < 0) return Math.min(maxMana, player.manaCurrent + Math.abs(amount));
    return player.manaCurrent;
};

const handleCastSpell = (playerId, spellLevel) => {
    const player = data.find(p => p.id === playerId);
    if (!player) return;

    const maxHp = calculateMaxHP(player);
    const subclass = getPlayerSubclass(player);

    if (!playerUsesVampire(player) && castingUsesSpellSlots) {
        const level = getLevelInfo(player.xp ?? 0).level;
        const result = castSpellWithSlot(player, spellLevel, level);
        if (result.ok === false) {
            showActionToast(`❌ ${result.error}`);
            return;
        }
        updatePlayer(playerId, mergePlayerWithRules(player, {
            spellSlots: result.spellSlots,
        }, logicBlocks, 'on_spell_cast', {
            ...getPlayerRuleOptions(player),
            variables: { spellLevel },
        }));
        showActionToast(`✦ Lvl ${spellLevel} (−1 slot ${result.slotLevel})`);
        setInlineCastPlayerId(null);
        return;
    }

    const playerForCast = spellFatigueEnabled ? player : { ...player, recentSpells: [] };
    const result = castSpellOnPlayer(playerForCast, spellLevel, maxHp, subclass) as ICastSpellResult;
    if (result.ok === false) {
        showActionToast(`❌ ${result.error}`);
        return;
    }

    const updates: Partial<IPlayer> = {
        hpCurrent: result.hpCurrent,
        hpTemp: result.hpTemp,
        ultCurrent: result.ultCurrent,
        recentSpells: spellFatigueEnabled ? result.recentSpells : (player.recentSpells ?? []),
    };
    if (result.manaCurrent !== undefined) {
        updates.manaCurrent = result.manaCurrent;
    }
    const withRules = mergePlayerWithRules(player, updates, logicBlocks, 'on_spell_cast', {
        ...getPlayerRuleOptions(player),
        variables: { spellLevel },
    });
    updatePlayer(playerId, withRules);
    showActionToast(`✦ Lvl ${spellLevel} (−${result.costPaid} ${result.costResource.toUpperCase()})`);
    setInlineCastPlayerId(null);
};

const handleHpToMana = (playerId) => {
    const player = data.find(p => p.id === playerId);
    if (!player || playerUsesVampire(player)) return;
    const result = convertHpToMana(player, calculateMaxHP(player), calculateMaxMana(player)) as IHpManaConversionResult;
    if (result.ok === false) {
        showActionToast(`❌ ${result.error}`);
        return;
    }
    updatePlayer(playerId, {
        hpCurrent: result.hpCurrent,
        hpTemp: result.hpTemp,
        ultCurrent: result.ultCurrent,
        manaCurrent: result.manaCurrent,
    });
    showActionToast(`♥→✦ −${HP_TO_MANA_HP_COST} HP, +${HP_TO_MANA_GAIN} Mana`);
};

const handleManaToHp = (playerId) => {
    const player = data.find(p => p.id === playerId);
    if (!player || playerUsesVampire(player)) return;
    const result = convertManaToHp(player, calculateMaxHP(player)) as IHpManaConversionResult;
    if (result.ok === false) {
        showActionToast(`❌ ${result.error}`);
        return;
    }
    updatePlayer(playerId, {
        hpCurrent: result.hpCurrent,
        hpTemp: result.hpTemp,
        ultCurrent: result.ultCurrent,
        manaCurrent: result.manaCurrent,
    });
    showActionToast(`✦→♥ −${MANA_TO_HP_MANA_COST} Mana, +${MANA_TO_HP_GAIN} HP`);
};

const getEquipmentBonus = (playerId, stat) => {
    const player = data.find(p => p.id === playerId);
    const baseStat = player ? (player[stat] || 10) : 10;
    const equipped = equipment?.equipped?.[playerId];
    if (!equipped) return 0;

    let setVal = 0;
    let modifierSum = 0;

    Object.entries(equipped).forEach(([slotId, slot]) => {
        if (slotId === '__wondrous__') {
            if (Array.isArray(slot)) {
                slot.forEach((wItem: IInventoryItem) => {
                    modifierSum += wItem?.modifiers?.[stat] || 0;
                    const sVal = wItem?.setAttributes?.[stat] || 0;
                    if (sVal > setVal) {
                        setVal = sVal;
                    }
                });
            }
        } else {
            modifierSum += slot?.modifiers?.[stat] || 0;
            const sVal = slot?.setAttributes?.[stat] || 0;
            if (sVal > setVal) {
                setVal = sVal;
            }
        }
    });

    if (setVal > baseStat) {
        return setVal - baseStat;
    } else {
        return modifierSum;
    }
};

const effectiveStat = (player, stat) => {
    let score = (player[stat] || 10) + getEquipmentBonus(player.id, stat);
    
    if (player.cc && player.cc.length > 0) {
        const allConditions = deriveConditions(player.cc);
        allConditions.forEach(c => {
            const def = CONDITIONS_DICT[c];
            if (def && def.modifiers && def.modifiers.stats && def.modifiers.stats[stat] !== undefined) {
                score += def.modifiers.stats[stat];
            }
        });
    }
    
    return score;
};

const getDefaultManaModifier = (player: IPlayer): number => {
    const profile = getClassAbilityProfile(player.classType);
    if (!profile?.spellcasting) return 0;
    const score = effectiveStat(player, profile.spellcasting);
    return calculateModifier(score);
};

const calculateMaxHP = (player: IPlayer) => {
    let hpMax = resolvePlayerResources(player, logicBlocks, {
        subclass: getPlayerSubclass(player),
        getEffectiveStat: effectiveStat,
    }).hpMax;
    
    if (compendiumClasses && compendiumRaces) {
        const traits = getActiveTraits(player, compendiumClasses, compendiumSubclasses || [], compendiumRaces);
        const stats = aggregateStats(traits);
        hpMax += (stats.hpMaxBonus || 0);
    }
    return hpMax;
};

const calculateEffectiveAC = (player: IPlayer) => {
    let ac = player.ac || 10;
    ac += getEquipmentBonus(player.id, 'ac');
    if (compendiumClasses && compendiumRaces) {
        const traits = getActiveTraits(player, compendiumClasses, compendiumSubclasses || [], compendiumRaces);
        const stats = aggregateStats(traits);
        ac += (stats.acBonus || 0);
    }

    if (Array.isArray(buffsDatabase) && buffsDatabase.length > 0 && player.buffs) {
        player.buffs.forEach(name => {
            const config = buffsDatabase.find(x => x.name === name);
            if (config) {
                const isToggle = config.type === 'toggle';
                const isSpent = player.spentBuffs?.[name] === true;
                const isToggledActive = player.buffStates?.[name] !== false;
                const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;
                
                if (isActive && config.additionalAC) {
                    ac += config.additionalAC;
                }
            }
        });
    }

    if (player.cc && player.cc.length > 0) {
        const allConditions = deriveConditions(player.cc);
        allConditions.forEach(c => {
            const def = CONDITIONS_DICT[c];
            if (def && def.modifiers && def.modifiers.ac) {
                ac += def.modifiers.ac;
            }
        });
    }

    return ac;
};

const calculateMaxMana = (player: IPlayer) =>
    resolvePlayerResources(player, logicBlocks, {
        subclass: getPlayerSubclass(player),
        getEffectiveStat: effectiveStat,
    }).manaMax;

const getPlayerRuleOptions = (player: IPlayer) => ({
    subclass: getPlayerSubclass(player),
    getEffectiveStat: effectiveStat,
});

const computePlayerHpDelta = (player, amount, asTempHp = false) => {
    const maxHp = calculateMaxHP(player);
    let base: Partial<IPlayer>;
    if (asTempHp && amount !== 0) {
        base = applyTempHpToPlayer(player, amount);
    } else if (amount > 0) {
        base = applyDamageToPlayer(player, amount, maxHp);
    } else if (amount < 0) {
        base = applyHealToPlayer(player, amount, maxHp);
    } else {
        return {
            hpCurrent: player.hpCurrent,
            hpTemp: player.hpTemp || 0,
            ultCurrent: player.ultCurrent ?? 0,
        };
    }

    const trigger = hpChangeTrigger(amount);
    if (!trigger || !logicBlocks?.length) return base;

    return mergePlayerWithRules(player, base, logicBlocks, trigger, {
        ...getPlayerRuleOptions(player),
        variables: hpChangeVariables(amount),
    });
};

const [partyXpModalOpen, setPartyXpModalOpen] = useState(false);
const [partyXpAmount, setPartyXpAmount] = useState('');
const [partyLevelModalOpen, setPartyLevelModalOpen] = useState(false);
const [partyLevelInput, setPartyLevelInput] = useState('1');

const addPlayer = () => {
    const newPlayer = {
        id: Date.now().toString(),
        name: 'New Player',
        classType: 'Class',
        xp: 0,
        inParty: true,
        hpBase: 10,
        hpCurrent: 10,
        manaCurrent: 10,
        ultMax: 100,
        ultCurrent: 0,
        ac: 10,
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        skills: {},
        manaExhaustion: 0,
        resourceTrait: 'standard',
        subclassId: null,
        recentSpells: [],
        background: '', race: '', alignment: '', features: '',
        resistances: [], immunities: [], vulnerabilities: [],
        ccResistances: [], ccImmunities: [], ccVulnerabilities: [],
        buffs: []
    };
    updateData([...data, newPlayer]);
};

const getSlotLabel = (slotId) => {
    const mapping = {
        head: 'Head',
        neck: 'Neck',
        armor: 'Armor',
        mainHand: 'Main Hand',
        mainHand2: 'Main Hand 2',
        offhand: 'Offhand',
        offhand2: 'Offhand 2',
        waist: 'Waist',
        feet: 'Feet',
        gloves: 'Gloves'
    };
    return mapping[slotId] || slotId;
};

const getPlayerBuffs = (player, equipment) => {
    const list = [];

    // 1. Character level buffs
    if (player.buffs) {
        player.buffs.forEach(b => {
            list.push({ text: b, source: 'character', sourceName: player.name });
        });
    }

    // 2. Equipped items level buffs
    const equipped = equipment?.equipped?.[player.id];
    if (equipped) {
        Object.entries(equipped).forEach(([slotId, slot]) => {
            if (slotId === '__wondrous__') {
                if (Array.isArray(slot)) {
                    slot.forEach(w => {
                        if (w && w.name && w.name.trim().length > 0 && w.buffs) {
                            w.buffs.forEach(b => {
                                list.push({ text: b, source: 'wondrous', sourceName: w.name, slotLabel: 'Wondrous Item' });
                            });
                        }
                    });
                }
            } else {
                const item = slot as IInventoryItem | null | undefined;
                if (item?.name && item.name.trim().length > 0 && item.buffs) {
                    const slotLabel = getSlotLabel(slotId);
                    item.buffs.forEach((b) => {
                        list.push({ text: b, source: 'item', sourceName: item.name, slotLabel });
                    });
                }
            }
        });
    }

    return list;
};

const handleRemoveBuffFromTop = (player, buff) => {
    if (buff.source === 'character') {
        const updated = (player.buffs || []).filter(x => x !== buff.name);
        updatePlayer(player.id, 'buffs', updated);
    } else if (buff.source === 'wondrous') {
        alert(`This effect comes from the equipped item "${buff.sourceName}" (Wondrous Item). To remove it, please unequip the item or edit the item's properties.`);
    } else {
        alert(`This effect comes from the equipped item "${buff.sourceName}" (${buff.slotLabel}). To remove it, please unequip the item or edit the item's properties.`);
    }
};

const getPlayerBuffsWithConfig = (player, equipment) => {
    return getPlayerBuffs(player, equipment).map(buff => {
        const config = buffsDatabase.find(x => x.name === buff.text);
        return {
            ...buff,
            name: buff.text,
            config
        };
    });
};

const handleToggleBuff = (entity, buff) => {
    const config = buff.config;
    if (!config) return;

    const name = buff.name;
    const isToggle = config.type === 'toggle';
    const isFixed = config.type === 'fixed';
    const isTurn = config.type === 'turn';
    const isRestLimited = config.oncePerRest === 'short' || config.oncePerRest === 'long';

    const spentBuffs = { ...(entity.spentBuffs || {}) };
    const buffStates = { ...(entity.buffStates || {}) };

    if (spentBuffs[name]) {
        alert(`"${name}" has already been used and is spent. A rest is required.`);
        return;
    }

    if (config.type === 'turn') {
        const rolled = rollFormula(config.turnFormula || '0');
        const amt = rolled.total;

        let msg = '';
        let hpCurrent = entity.hpCurrent !== undefined ? entity.hpCurrent : entity.hp;
        let hpMax = entity.hpCurrent !== undefined ? calculateMaxHP(entity) : entity.hpMax;
        let manaCurrent = entity.manaCurrent !== undefined ? entity.manaCurrent : 0;
        let manaMax = entity.hpCurrent !== undefined ? calculateMaxMana(entity) : 0;
        let tempHp = entity.hpTemp || 0;

        if (config.turnType === 'healHP') {
            const nextHp = Math.min(hpMax, hpCurrent + amt);
            msg = `Healed ${entity.name} for ${amt} HP (${hpCurrent} -> ${nextHp})`;
            hpCurrent = nextHp;
        } else if (config.turnType === 'damageHP') {
            const nextHp = Math.max(0, hpCurrent - amt);
            msg = `Dealt ${amt} damage to ${entity.name} (${hpCurrent} -> ${nextHp})`;
            hpCurrent = nextHp;
        } else if (config.turnType === 'healTempHP') {
            const nextTemp = Math.max(tempHp, amt);
            msg = `${entity.name} gained ${amt} Temp HP (current: ${tempHp} -> new: ${nextTemp})`;
            tempHp = nextTemp;
        } else if (config.turnType === 'healMana') {
            const nextMana = Math.min(manaMax, manaCurrent + amt);
            msg = `Restored ${amt} Mana to ${entity.name} (${manaCurrent} -> ${nextMana})`;
            manaCurrent = nextMana;
        } else if (config.turnType === 'damageMana') {
            const nextMana = Math.max(0, manaCurrent - amt);
            msg = `Drained ${amt} Mana from ${entity.name} (${manaCurrent} -> ${nextMana})`;
            manaCurrent = nextMana;
        }

        let formulaLog = `rolled ${config.turnFormula} = ${rolled.total}`;
        if (rolled.rolls.length > 0) {
            formulaLog = `rolled [${rolled.rolls.join('+')}]${rolled.modifier !== 0 ? (rolled.modifier > 0 ? '+' + rolled.modifier : rolled.modifier) : ''} = ${rolled.total}`;
        }
        const logText = `\n[Turn Buff: ${name}] ${msg} (${formulaLog})`;
        setBattleNotes(prev => (prev ? prev + logText : logText));

        if (isRestLimited) {
            spentBuffs[name] = true;
        }

        const basePatch = { hpCurrent, manaCurrent, hpTemp: tempHp, spentBuffs };
        let finalPatch: Partial<IPlayer> = basePatch;
        if (config.turnType === 'damageHP') {
            finalPatch = mergePlayerWithRules(entity, basePatch, logicBlocks, 'on_damage', {
                ...getPlayerRuleOptions(entity),
                variables: { damage: amt, amount: amt },
            });
        } else if (config.turnType === 'healHP') {
            finalPatch = mergePlayerWithRules(entity, basePatch, logicBlocks, 'on_heal', {
                ...getPlayerRuleOptions(entity),
                variables: { healed: amt, amount: amt },
            });
        }
        updatePlayer(entity.id, finalPatch);
        return;
    }

    if (isToggle) {
        const currentlyActive = buffStates[name] !== false;
        if (currentlyActive) {
            buffStates[name] = false;
            if (isRestLimited) {
                spentBuffs[name] = true;
            }
        } else {
            buffStates[name] = true;
        }
    } else if (isFixed) {
        if (isRestLimited) {
            if (window.confirm(`Use rest-limited buff "${name}"? This will consume its charge until the next rest.`)) {
                spentBuffs[name] = true;
            }
        }
    }

    updatePlayer(entity.id, { buffStates, spentBuffs });
};

const getPlayerSpriteInfo = (player: IPlayer) => {
    const cls = (player.classType || '').trim().toLowerCase();
    const validClasses = [
        'artificer', 'barbarian', 'bard', 'cleric', 'druid',
        'fighter', 'monk', 'paladin', 'ranger', 'rogue',
        'sorcerer', 'warlock', 'wizard'
    ];
    let spriteName = 'default';
    for (const vc of validClasses) {
        if (cls.includes(vc)) {
            spriteName = vc;
            break;
        }
    }

    const maxHp = calculateMaxHP(player);
    const maxMana = calculateMaxMana(player);
    const isKO = player.hpCurrent <= 0;
    const isPowered = player.ultCurrent >= player.ultMax;
    const isVampire = playerUsesVampire(player);
    const isWinded = !isVampire && maxMana > 0 && player.manaCurrent < maxMana * 0.2;
    const isHurt = player.hpCurrent < maxHp * 0.5;

    let spriteState: IPlayerSpriteInfo['spriteState'] = 'normal';
    if (isKO) spriteState = 'ko';
    else if (isPowered) spriteState = 'powered';
    else if (isWinded) spriteState = 'winded';
    else if (isHurt) spriteState = 'hurt';

    return { spriteName, spriteState };
};

function updatePlayer(id: string, fields: Partial<IPlayer>): void;
function updatePlayer(id: string, field: keyof IPlayer, value: IPlayer[keyof IPlayer]): void;
function updatePlayer(
    id: string,
    fieldOrFields: keyof IPlayer | Partial<IPlayer>,
    value?: IPlayer[keyof IPlayer],
): void {
    const updated = data.map(p => {
        if (p.id === id) {
            if (typeof fieldOrFields === 'object') {
                let nextP = { ...p, ...fieldOrFields };
                if (nextP.hpCurrent !== undefined) {
                    nextP.hpCurrent = Math.min(nextP.hpCurrent, calculateMaxHP(nextP));
                    if (nextP.hpCurrent <= 0) {
                        nextP.ultCurrent = 0;
                    }
                }
                return nextP;
            } else {
                let val = value;
                const extra: Partial<IPlayer> = {};
                if (fieldOrFields === 'hpCurrent') {
                    val = Math.min(val as number, calculateMaxHP(p));
                    if ((val as number) <= 0) {
                        extra.ultCurrent = 0;
                    }
                }
                if (fieldOrFields === 'ultCurrent') val = Math.max(0, Math.min(val as number, p.ultMax));
                return { ...p, [fieldOrFields]: val, ...extra };
            }
        }
        return p;
    });
    updateData(updated);
}

const startPlayerEdit = (player, field) => {
    setPlayerEditField({ id: player.id, field });
    if (field === 'level') {
        setPlayerEditValue(String(getLevelInfo(player.xp).level));
    } else {
        setPlayerEditValue(String(player[field]));
    }
};

const commitPlayerEdit = (player) => {
    if (!playerEditField) return;
    const field = playerEditField.field;

    if (field === 'level') {
        const lvl = parseInt(playerEditValue, 10);
        if (!Number.isNaN(lvl)) setLevel(player.id, lvl);
        setPlayerEditField(null);
        setPlayerEditValue('');
        return;
    }

    let val = parseInt(playerEditValue) || 0;
    if (field === 'ultCurrent') {
        val = Math.max(0, Math.min(val, player.ultMax || 100));
    }
    updatePlayer(player.id, field, val);
    setPlayerEditField(null);
    setPlayerEditValue('');
};

const cancelPlayerEdit = () => {
    setPlayerEditField(null);
    setPlayerEditValue('');
};

const addCc = (playerId, effect) => {
    const player = data.find(p => p.id === playerId);
    if (!player) return;
    if (getCCModifier(effect, player, equipment) === 'immune') {
        alert(`${player.name} is immune to ${effect}!`);
        return;
    }
    const currentCc = player.cc || [];
    if (!currentCc.includes(effect)) {
        updatePlayer(playerId, 'cc', [...currentCc, effect]);
    }
};

const removeCc = (playerId, effect) => {
    const player = data.find(p => p.id === playerId);
    if (!player) return;
    const currentCc = player.cc || [];
    updatePlayer(playerId, 'cc', currentCc.filter(x => x !== effect));
};

const getProficiencyBonus = (player) => {
    const lvl = getLevelInfo(player.xp).level;
    return lvl >= 17 ? 6 : Math.ceil(lvl / 4) + 1;
};

const toggleSaveProficiency = (id, stat) => {
    const player = data.find(p => p.id === id);
    if (!player) return;
    const currentSaves = player.saves || {};
    updatePlayer(id, 'saves', { ...currentSaves, [stat]: !currentSaves[stat] });
};

const applyLevelToPlayer = (player, newLevel) => {
    const clamped = Math.max(1, Math.min(20, Math.floor(Number(newLevel)) || 1));
    const xp = getXpForLevel(clamped);
    const withXp = { ...player, xp };
    const maxHp = calculateMaxHP(withXp);
    const maxMana = calculateMaxMana(withXp);
    const patch: Partial<IPlayer> = {
        xp,
        hpCurrent: Math.min(player.hpCurrent ?? maxHp, maxHp),
        manaCurrent: Math.min(player.manaCurrent ?? maxMana, maxMana),
    };
    if (castingUsesSpellSlots) {
        const progression = getCasterProgression(withXp.classType);
        if (progression) {
            patch.spellSlots = buildSpellSlotsForLevel(clamped, progression, player.spellSlots, true);
        } else {
            patch.spellSlots = {};
        }
    }
    return patch;
};

const setLevel = (playerId, newLevel) => {
    const player = data.find(p => p.id === playerId);
    if (!player) return;
    updatePlayer(playerId, applyLevelToPlayer(player, newLevel));
};

const openPartyLevelModal = () => {
    const active = data.filter(p => p.inParty);
    if (active.length > 0) {
        const avg = Math.round(
            active.reduce((sum, p) => sum + getLevelInfo(p.xp).level, 0) / active.length,
        );
        setPartyLevelInput(String(avg));
    } else {
        setPartyLevelInput('1');
    }
    setPartyLevelModalOpen(true);
};

const applyPartyLevel = () => {
    const level = parseInt(partyLevelInput, 10);
    if (Number.isNaN(level) || level < 1 || level > 20) {
        showActionToast('❌ Enter a level between 1 and 20');
        return;
    }

    const updated = data.map((p) => {
        if (!p.inParty) return p;
        return { ...p, ...applyLevelToPlayer(p, level) };
    });
    updateData(updated);
    setPartyLevelModalOpen(false);
    showActionToast(`📊 Party set to level ${level}`);
};

const toggleParty = (id) => {
    const updated = data.map(p => p.id === id ? { ...p, inParty: !p.inParty } : p);
    updateData(updated);
};

const removePlayer = (id) => {
    if (window.confirm("Are you sure you want to delete this player?")) {
        updateData(data.filter(p => p.id !== id));
    }
};

const shortRest = () => {
    const updated = data.map(p => {
        if (!p.inParty) return p;
        const nextSpent = { ...(p.spentBuffs || {}) };
        Object.keys(nextSpent).forEach(buffName => {
            const config = buffsDatabase.find(b => b.name === buffName);
            if (config && config.oncePerRest === 'short') {
                delete nextSpent[buffName];
            }
        });
        return {
            ...p,
            hpCurrent: Math.min(calculateMaxHP(p), p.hpCurrent + Math.floor(calculateMaxHP(p) * 0.5)),
            ultCurrent: Math.max(0, Math.round((p.ultCurrent || 0) * 0.75)),
            spentBuffs: nextSpent
        };
    });
    updateData(updated);
};

const longRest = () => {
    const updated = data.map(p => {
        if (!p.inParty) return p;
        const level = getLevelInfo(p.xp ?? 0).level;
        const restPatch: Partial<IPlayer> = {
            hpCurrent: calculateMaxHP(p),
            manaCurrent: castingUsesMana ? calculateMaxMana(p) : 0,
            ultCurrent: Math.max(0, Math.round((p.ultCurrent || 0) * 0.5)),
            spentBuffs: {},
            recentSpells: [],
        };
        if (castingUsesSpellSlots && playerQualifiesForSpellSlots(p)) {
            restPatch.spellSlots = restoreSpellSlotsToMax(p, level);
        }
        return { ...p, ...restPatch };
    });
    updateData(updated);
};

const givePartyXP = (type) => {
    const activePlayers = data.filter(p => p.inParty);
    if (activePlayers.length === 0) return;

    if (type === 'flat') {
        const amt = parseInt(partyXpAmount);
        if (!isNaN(amt)) {
            const updated = data.map(p => p.inParty ? { ...p, xp: Math.max(0, p.xp + amt) } : p);
            updateData(updated);
        }
    } else if (type === 'percent') {
        const pct = parseInt(partyXpAmount);
        if (!isNaN(pct)) {
            const updated = data.map(p => {
                if (p.inParty) {
                    const info = getLevelInfo(p.xp);
                    if (info.nextLevelXp) {
                        const req = info.nextLevelXp - info.currentLevelXp;
                        return { ...p, xp: Math.max(0, p.xp + Math.floor(req * (pct / 100))) };
                    }
                }
                return p;
            });
            updateData(updated);
        }
    } else if (type === 'levelup') {
        const updated = data.map(p => {
            if (p.inParty) {
                const info = getLevelInfo(p.xp);
                if (info.nextLevelXp) {
                    return { ...p, xp: info.nextLevelXp };
                }
            }
            return p;
        });
        updateData(updated);
    }

    setPartyXpModalOpen(false);
    setPartyXpAmount('');
};

const calculateSkillBonus = (player, stat, skillName) => {
    const mod = calculateModifier(effectiveStat(player, stat));
    const profBonus = getLevelInfo(player.xp).level >= 17 ? 6 : Math.ceil(getLevelInfo(player.xp).level / 4) + 1;
    const isProficient = player.skills && player.skills[skillName];
    return mod + (isProficient ? profBonus : 0);
};

const toggleSkill = (playerId, skillName) => {
    const player = data.find(p => p.id === playerId);
    const currentSkills = player.skills || {};
    updatePlayer(playerId, 'skills', { ...currentSkills, [skillName]: !currentSkills[skillName] });
};

const [xpModalId, setXpModalId] = useState<string | null>(null);
const [xpModalType, setXpModalType] = useState('flat');
const [xpInputValue, setXpInputValue] = useState('');


    return {
        data,
        updateData,
        focusAndSelectRef,
        editingId,
        setEditingId,
        inlineCastPlayerId,
        setInlineCastPlayerId,
        actionToast,
        showActionToast,
        playerEditField,
        setPlayerEditField,
        playerEditValue,
        setPlayerEditValue,
        buffInputPlayerId,
        setBuffInputPlayerId,
        buffSearchText,
        setBuffSearchText,
        expandedPlayers,
        setExpandedPlayers,
        minimizedPlayers,
        setMinimizedPlayers,
        isPlayerMinimized,
        partyXpModalOpen,
        setPartyXpModalOpen,
        partyXpAmount,
        setPartyXpAmount,
        partyLevelModalOpen,
        setPartyLevelModalOpen,
        partyLevelInput,
        setPartyLevelInput,
        openPartyLevelModal,
        applyPartyLevel,
        xpModalId,
        setXpModalId,
        xpModalType,
        setXpModalType,
        xpInputValue,
        setXpInputValue,
        getPlayerSubclass,
        getOptionalPlayerSubclass,
        playerUsesVampire,
        computePlayerHpDelta,
        computePlayerManaDelta,
        handleCastSpell,
        handleHpToMana,
        handleManaToHp,
        getEquipmentBonus,
        effectiveStat,
        addPlayer,
        calculateMaxHP,
        calculateEffectiveAC,
        calculateMaxMana,
        getDefaultManaModifier,
        getSlotLabel,
        getPlayerBuffs,
        handleRemoveBuffFromTop,
        getPlayerBuffsWithConfig,
        handleToggleBuff,
        getPlayerSpriteInfo,
        updatePlayer,
        startPlayerEdit,
        commitPlayerEdit,
        cancelPlayerEdit,
        addCc,
        removeCc,
        getProficiencyBonus,
        toggleSaveProficiency,
        formatModifier,
        getLevelInfo,
        getXpForLevel,
        calculateModifier,
        setLevel,
        toggleParty,
        removePlayer,
        shortRest,
        longRest,
        givePartyXP,
        calculateColor,
        calculateSkillBonus,
        toggleSkill,
        dndSkills: DND_SKILLS as readonly IDndSkill[],
        statsList: STATS_LIST as readonly StatAbbr[],
        ALL_CC_EFFECTS,
        castingUsesMana,
        castingUsesSpellSlots,
        spellFatigueEnabled,
        playerQualifiesForSpellSlots,
        getPlayerSpellSlots: getPlayerSpellSlotsFor,
        adjustPlayerSpellSlot,
    } satisfies IPartyState;
}
