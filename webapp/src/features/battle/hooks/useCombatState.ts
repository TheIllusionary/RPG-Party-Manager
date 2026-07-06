import { useState, useEffect, useRef } from 'react';
import db from '../../../services/db';
const defaultMonsters = [] as any[];
import { generateUniqueId, ALL_CC_EFFECTS } from '../utils/constants';
import {
    parseAbilities,
    rollFormula,
    getDamageMultiplier,
    getDamageModifierBreakdown,
    getEnemyDamageMultiplier,
    getEnemyDamageModifierBreakdown,
    getAttackAdvantageState,
    rollWithAdvantageState,
    extractExtraEffects,
    calculateEffectiveAC,
    getSaveModifiers,
    calculateEffectiveEnemyAC,
    calculateEffectiveEnemyStat,
    getCCModifier,
    applyDamageToPlayer,
} from '../../../shared/utils/combatUtils';
import {
  applyEnemyRuleTrigger,
  applyPlayerRuleTrigger,
  hpChangeTrigger,
  hpChangeVariables,
  mergeEnemyWithRules,
  mergePlayerWithRules,
  resolveEnemyResources,
} from '../../../shared/utils/campaignRulesRuntime';
import { useRuleEngineCombat } from './useRuleEngineCombat';
import type { ICombatState, IPartyState, IUseCombatStateParams, IEnemySpriteInfo } from '../../../types/battle';
import type { IAttack, IEnemy, IMonster, IPlayer, StatAbbr } from '../../../types';

export default function useCombatState({
    campaignId,
    enemies,
    setEnemies,
    minimizedEnemies,
    setMinimizedEnemies,
    battleMode,
    setBattleMode,
    library,
    updateLibrary,
    buffsDatabase,
    config,
    configModalOpen,
    equipment,
    logicBlocks,
    battleNotes: battleNotesProp,
    setBattleNotes: setBattleNotesProp,
}: IUseCombatStateParams, party: IPartyState): ICombatState {
    const {
        data,
        updateData,
        updatePlayer,
        calculateMaxHP,
        calculateMaxMana,
        getLevelInfo,
        getPlayerSubclass,
        getPlayerBuffsWithConfig,
        computePlayerHpDelta,
        computePlayerManaDelta,
        showActionToast,
        effectiveStat,
        partyXpModalOpen,
        partyLevelModalOpen,
        setMinimizedPlayers,
        minimizedPlayers,
    } = party;

const getPlayerRuleOptions = (player: IPlayer) => ({
    subclass: getPlayerSubclass(player),
    getEffectiveStat: effectiveStat,
});

const calculateEnemyMaxHP = (enemy: IEnemy) =>
    resolveEnemyResources(enemy, logicBlocks).hpMax;

const ruleEngineCombat = useRuleEngineCombat({
    players: data,
    enemies,
    logicBlocks,
    calculateMaxHP,
    calculateMaxMana,
    calculateEnemyMaxHP,
    updatePlayers: updateData,
    setEnemies,
    showActionToast,
});

const [inlineDeltaEdit, setInlineDeltaEdit] = useState(null); // { type: 'player'|'enemy', id, field: 'hp'|'mana' }
const [inlineDeltaValue, setInlineDeltaValue] = useState('');

const [selectedTargets, setSelectedTargets] = useState([]);
const [bulkActionValue, setBulkActionValue] = useState('');
const [bulkTempHp, setBulkTempHp] = useState(false);

const targetKey = (type, id) => `${type}:${id}`;
const isTargetSelected = (type, id) => selectedTargets.includes(targetKey(type, id));
const toggleTargetSelection = (type, id) => {
    const key = targetKey(type, id);
    setSelectedTargets(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
};
const clearTargetSelection = () => {
    setSelectedTargets([]);
    setBulkActionValue('');
    setBulkTempHp(false);
};

const [buffInputEnemyId, setBuffInputEnemyId] = useState<string | null>(null);

const [activeAttackState, setActiveAttackState] = useState(null);
const [autoRollEnabled, setAutoRollEnabled] = useState(() => {
    return config?.defaultRollMode === 'auto';
});

useEffect(() => {
    setAutoRollEnabled(config?.defaultRollMode === 'auto');
}, [config?.defaultRollMode]);

const getEnemyAttacks = (enemy) => {
    if (Array.isArray(enemy.attacks) && enemy.attacks.length > 0) {
        return enemy.attacks;
    }
    return parseAbilities(enemy.abilities || '');
};

const startAttackTargeting = (enemy, attack) => {
    const isSave = typeof attack.dc === 'number' || (attack.dc && !isNaN(parseInt(attack.dc)));
    setAutoRollEnabled(!isSave);
    setActiveAttackState({
        mode: 'enemy-vs-player',
        attacker: enemy,
        attack,
        selectedTargets: {},
        rollResults: null
    });
};

const startPlayerAttackTargeting = (player, attack) => {
    const isSave = typeof attack.dc === 'number' || (attack.dc && !isNaN(parseInt(attack.dc)));
    setAutoRollEnabled(!isSave);
    setActiveAttackState({
        mode: 'player-vs-enemy',
        attacker: player,
        attack,
        selectedTargets: {},
        rollResults: null
    });
};

const executePlayerAttack = () => {
    const { attacker: player, attack, selectedTargets } = activeAttackState;

    const targetIds = Object.keys(selectedTargets).filter(id => {
        if (autoRollEnabled) return !!selectedTargets[id];
        return selectedTargets[id] && selectedTargets[id] !== 'none';
    });

    if (targetIds.length === 0) {
        alert(autoRollEnabled ? 'Please select at least one target enemy!' : 'Please flag at least one enemy as Hit/Miss or Save/Fail!');
        return;
    }

    const results = [];
    let updatedEnemies = [...enemies];
    const extraEffect = attack.cc === 'custom' ? attack.ccCustom : (attack.cc || extractExtraEffects(attack.description));
    const isSave = typeof attack.dc === 'number' || (attack.dc && !isNaN(parseInt(attack.dc)));
    const toHit = attack.toHit || 0;

    targetIds.forEach(enemyId => {
        const enemyIndex = updatedEnemies.findIndex(e => e.id === enemyId);
        if (enemyIndex === -1) return;
        const enemy = updatedEnemies[enemyIndex];

        let d20 = null;
        let d20Rolls = null;
        let resultType = 'miss';
        let totalRoll = 0;
        let saveBonus = 0;
        let saveStat = '';
        let dcVal = 0;

        if (autoRollEnabled) {
            const extraEffect = attack.cc === 'custom' ? attack.ccCustom : (attack.cc || extractExtraEffects(attack.description));
            if (isSave) {
                saveStat = (attack.save || 'Dexterity').toLowerCase();
                const statKey = saveStat.substring(0, 3);
                dcVal = parseInt(attack.dc);

                const saveMods = getSaveModifiers(enemy, extraEffect, [], buffsDatabase, statKey);
                const d20Result = rollWithAdvantageState(saveMods.advantageState);
                d20 = d20Result.roll;
                d20Rolls = d20Result.rolls;

                const statVal = calculateEffectiveEnemyStat(enemy, statKey);
                const statMod = Math.floor((statVal - 10) / 2);
                const isProf = enemy.saves && enemy.saves[statKey];
                const profBonus = enemy.proficiency !== undefined ? enemy.proficiency : 2;
                saveBonus = statMod + (isProf ? profBonus : 0) + saveMods.saveBonus;
                
                totalRoll = d20 + saveBonus;
                resultType = totalRoll >= dcVal ? 'save_success' : 'save_failed';
            } else {
                d20 = Math.floor(Math.random() * 20) + 1;
                d20Rolls = [d20];
                totalRoll = d20 + toHit;
                if (d20 === 20) resultType = 'crit';
                else if (d20 === 1) resultType = 'crit_miss';
                else if (totalRoll >= calculateEffectiveEnemyAC(enemy, buffsDatabase)) resultType = 'hit';
            }
        } else {
            const status = selectedTargets[enemyId];
            if (isSave) {
                dcVal = parseInt(attack.dc);
                saveStat = (attack.save || 'Dexterity').toLowerCase();
                resultType = status === 'fail' ? 'save_failed' : 'save_success';
            } else {
                resultType = status === 'fail' ? 'hit' : 'miss';
            }
        }

        let totalDamageApplied = 0;
        const damageBreakdowns = [];
        const shouldApplyDamage = (!isSave && (resultType === 'hit' || resultType === 'crit'))
            || (isSave && (resultType === 'save_failed' || (resultType === 'save_success' && attack.halfOnSuccess)));

        if (shouldApplyDamage) {
            const isCrit = resultType === 'crit';
            const damageComponents = [...(attack.damage || [])];

            if (player.buffs && Array.isArray(buffsDatabase)) {
                player.buffs.forEach(name => {
                    const config = buffsDatabase.find(x => x.name === name);
                    if (config && config.additionalDamage) {
                        const isToggle = config.type === 'toggle';
                        const isSpent = player.spentBuffs?.[name] === true;
                        const isToggledActive = player.buffStates?.[name] !== false;
                        const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;
                        if (isActive) {
                            const parts = config.additionalDamage.trim().split(' ');
                            damageComponents.push({
                                formula: parts[0],
                                type: parts.slice(1).join(' ') || 'force'
                            });
                        }
                    }
                });
            }

            damageComponents.forEach(comp => {
                const rolled = rollFormula(comp.formula, isCrit);
                const mult = getEnemyDamageMultiplier(comp.type, enemy);
                let finalDmg = Math.floor(rolled.total * mult);
                if (isSave && resultType === 'save_success' && attack.halfOnSuccess) {
                    finalDmg = Math.floor(finalDmg / 2);
                }
                totalDamageApplied += finalDmg;
                let breakdownStr = `${rolled.total} ${comp.type}`;
                if (mult !== 1) {
                    const multLabel = mult === 0 ? 'immune' : (mult === 0.5 ? 'resistant' : 'vulnerable');
                    breakdownStr += ` (${multLabel} -> ${finalDmg})`;
                }
                damageBreakdowns.push(breakdownStr);
            });
        }

        const originalHp = enemy.hp;
        const hpBase = computeEnemyHpDelta(enemy, totalDamageApplied);
        const hpResult = totalDamageApplied > 0
            ? mergeEnemyWithRules(enemy, hpBase, logicBlocks, 'on_damage', {
                damage: totalDamageApplied,
                amount: totalDamageApplied,
            })
            : hpBase;
        updatedEnemies[enemyIndex] = { ...enemy, ...hpResult };

        results.push({
            enemyId: enemy.id,
            enemyName: enemy.name,
            ac: calculateEffectiveEnemyAC(enemy, buffsDatabase),
            d20,
            d20Rolls,
            toHit,
            totalRoll,
            resultType,
            totalDamageApplied,
            damageBreakdowns,
            originalHp,
            newHp: hpResult.hp,
            maxHp: enemy.hpMax,
            isSave,
            saveStat,
            saveBonus,
            dc: dcVal,
            resolvedEffect: (resultType === 'save_failed' || resultType === 'hit' || resultType === 'crit') ? extraEffect : null,
            damageTypeBreakdowns: (attack.damage || []).map(comp => ({
                type: comp.type,
                ...getEnemyDamageModifierBreakdown(comp.type, enemy),
            })),
        });
    });

    setEnemies(updatedEnemies);

    let logText = `\n[COMBAT LOG] ${player.name} uses ${attack.name} against:`;
    results.forEach(r => {
        const resultLabel = r.isSave
            ? (r.resultType === 'save_success' ? 'SAVE SUCCESS 🛡️' : 'SAVE FAILED 💥')
            : (r.resultType === 'crit' ? 'CRITICAL HIT 🌟' : (r.resultType === 'hit' ? 'HIT 🎯' : (r.resultType === 'crit_miss' ? 'CRITICAL MISS ❌' : 'MISS 💨')));
        logText += `\n- ${r.enemyName}: ${resultLabel}`;
        if (r.totalDamageApplied > 0) logText += ` (${r.totalDamageApplied} dmg)`;
    });
    setBattleNotes(prev => prev + logText);

    setActiveAttackState(prev => ({ ...prev, rollResults: results }));
};

const executeAttack = () => {
    if (activeAttackState?.mode === 'player-vs-enemy') {
        executePlayerAttack();
        return;
    }

    const { attacker: enemy, attack, selectedTargets } = activeAttackState;

    const targetIds = Object.keys(selectedTargets).filter(id => {
        if (autoRollEnabled) {
            return !!selectedTargets[id];
        } else {
            return selectedTargets[id] && selectedTargets[id] !== 'none';
        }
    });

    if (targetIds.length === 0) {
        alert(autoRollEnabled ? "Please select at least one target player!" : "Please flag at least one player as Hit/Miss or Save/Fail!");
        return;
    }

    const results = [];
    let updatedPlayers = [...data];
    const extraEffect = attack.cc === 'custom'
        ? attack.ccCustom
        : (attack.cc || extractExtraEffects(attack.description));

    targetIds.forEach(targetId => {
        const playerIndex = updatedPlayers.findIndex(p => p.id === targetId);
        if (playerIndex === -1) return;
        const player = updatedPlayers[playerIndex];
        const subclassData = getPlayerSubclass(player);

        const isSave = typeof attack.dc === 'number' || (attack.dc && !isNaN(parseInt(attack.dc)));
        let d20 = null;
        let d20Rolls = null; // array of raw dice (for adv/disadv display)
        let advantageState = 'normal';
        let resultType = 'miss';
        let totalRoll = 0;
        let saveBonus = 0;
        let saveStat = '';
        let dcVal = 0;
        const toHit = attack.toHit || 0;

        if (autoRollEnabled) {
            const extraEffect = attack.cc === 'custom' ? attack.ccCustom : (attack.cc || extractExtraEffects(attack.description));
            if (isSave) {
                saveStat = (attack.save || 'Dexterity').toLowerCase();
                const statKey = saveStat.substring(0, 3); // 'str', 'dex', 'con', 'int', 'wis', 'cha'
                const saveMods = getSaveModifiers(player, extraEffect, equipment, buffsDatabase, statKey);
                advantageState = saveMods.advantageState;
                const d20Result = rollWithAdvantageState(advantageState);
                d20 = d20Result.roll;
                d20Rolls = d20Result.rolls;

                dcVal = parseInt(attack.dc);
                const statVal = player[statKey] !== undefined ? player[statKey] : 10;
                const statMod = Math.floor((statVal - 10) / 2);
                const isProf = player.saves && player.saves[statKey];
                const profBonus = getLevelInfo(player.xp).level >= 17 ? 6 : Math.ceil(getLevelInfo(player.xp).level / 4) + 1;
                saveBonus = statMod + (isProf ? profBonus : 0) + saveMods.saveBonus;
                totalRoll = d20 + saveBonus;

                if (totalRoll >= dcVal) {
                    resultType = 'save_success';
                } else {
                    resultType = 'save_failed';
                }
            } else {
                advantageState = getAttackAdvantageState(attack, player, equipment, buffsDatabase);
                const d20Result = rollWithAdvantageState(advantageState);
                d20 = d20Result.roll;
                d20Rolls = d20Result.rolls;
                totalRoll = d20 + toHit;
                if (d20 === 20) resultType = 'crit';
                else if (d20 === 1) resultType = 'crit_miss';
                else if (totalRoll >= calculateEffectiveAC(player, equipment, buffsDatabase)) resultType = 'hit';
            }
        } else {
            // Manual resolution based on selected status
            const status = selectedTargets[player.id];
            if (isSave) {
                dcVal = parseInt(attack.dc);
                saveStat = (attack.save || 'Dexterity').toLowerCase();
                if (status === 'fail') {
                    resultType = 'save_failed';
                } else {
                    resultType = 'save_success';
                }
            } else {
                if (status === 'fail') {
                    resultType = 'hit';
                } else {
                    resultType = 'miss';
                }
            }
        }

        let totalDamageApplied = 0;
        let damageBreakdowns = [];

        const shouldApplyDamage = (!isSave && (resultType === 'hit' || resultType === 'crit')) ||
            (isSave && (resultType === 'save_failed' || (resultType === 'save_success' && attack.halfOnSuccess)));

        if (shouldApplyDamage) {
            const isCrit = resultType === 'crit';
            const damageComponents = [...(attack.damage || [])];

            if (enemy.buffs && Array.isArray(buffsDatabase)) {
                enemy.buffs.forEach(name => {
                    const config = buffsDatabase.find(x => x.name === name);
                    if (config && config.additionalDamage) {
                        const isToggle = config.type === 'toggle';
                        const isSpent = enemy.spentBuffs?.[name] === true;
                        const isToggledActive = enemy.buffStates?.[name] !== false;
                        const isActive = isToggle ? (isToggledActive && !isSpent) : !isSpent;
                        if (isActive) {
                            const parts = config.additionalDamage.trim().split(' ');
                            damageComponents.push({
                                formula: parts[0],
                                type: parts.slice(1).join(' ') || 'force'
                            });
                        }
                    }
                });
            }

            damageComponents.forEach(comp => {
                const rolled = rollFormula(comp.formula, isCrit);
                const mult = getDamageMultiplier(comp.type, player, equipment, subclassData);

                let finalDmg = Math.floor(rolled.total * mult);
                if (isSave && resultType === 'save_success' && attack.halfOnSuccess) {
                    finalDmg = Math.floor(finalDmg / 2);
                }
                totalDamageApplied += finalDmg;

                let breakdownStr = `${rolled.total} ${comp.type}`;
                if (rolled.rolls.length > 0) {
                    breakdownStr = `[${rolled.rolls.join('+')}]${rolled.modifier !== 0 ? (rolled.modifier > 0 ? '+' + rolled.modifier : rolled.modifier) : ''}`;
                    if (isCrit) {
                        breakdownStr += ` + ${rolled.critBonus} (crit)`;
                    }
                    breakdownStr += ` = ${rolled.total} ${comp.type}`;
                }

                if (mult !== 1) {
                    const multLabel = mult === 0 ? 'immune' : (mult === 0.5 ? 'resistant' : 'vulnerable');
                    breakdownStr += ` (${multLabel} -> ${finalDmg})`;
                } else if (isSave && resultType === 'save_success' && attack.halfOnSuccess) {
                    breakdownStr += ` (saved -> ${finalDmg})`;
                }

                damageBreakdowns.push(breakdownStr);
            });
        }

        const originalHp = player.hpCurrent;
        const originalHpTemp = player.hpTemp || 0;
        const maxHp = calculateMaxHP(player);

        const damageResult = applyDamageToPlayer(player, totalDamageApplied, maxHp);
        const newHp = damageResult.hpCurrent;
        const newHpTemp = damageResult.hpTemp;
        const newUlt = damageResult.ultCurrent;

        const rulePatch = totalDamageApplied > 0
            ? mergePlayerWithRules(
                player,
                { hpCurrent: newHp, hpTemp: newHpTemp, ultCurrent: newUlt },
                logicBlocks,
                'on_damage',
                {
                    ...getPlayerRuleOptions(player),
                    variables: { damage: totalDamageApplied, amount: totalDamageApplied },
                },
            )
            : { hpCurrent: newHp, hpTemp: newHpTemp, ultCurrent: newUlt };

        const resolvedEffect = (resultType === 'save_failed' || resultType === 'hit' || resultType === 'crit') ? extraEffect : null;

        let newCc = [...(player.cc || [])];
        if (resolvedEffect) {
            let matched = false;
            ALL_CC_EFFECTS.forEach(eff => {
                const baseWord = eff.split(' ')[0].toLowerCase();
                if (resolvedEffect.toLowerCase().includes(baseWord)) {
                    if (getCCModifier(eff, player, equipment) !== 'immune') {
                        if (!newCc.includes(eff)) {
                            newCc.push(eff);
                        }
                    }
                    matched = true;
                }
            });
            if (!matched && resolvedEffect.trim() !== '') {
                if (getCCModifier(resolvedEffect, player, equipment) !== 'immune') {
                    if (!newCc.includes(resolvedEffect)) {
                        newCc.push(resolvedEffect);
                    }
                }
            }
        }

        updatedPlayers[playerIndex] = {
            ...player,
            ...rulePatch,
            cc: newCc
        };

        results.push({
            playerId: player.id,
            playerName: player.name,
            ac: calculateEffectiveAC(player, equipment),
            d20,
            d20Rolls,
            advantageState,
            toHit,
            totalRoll,
            resultType,
            totalDamageApplied,
            damageBreakdowns,
            originalHp,
            newHp,
            maxHp,
            isSave,
            saveStat,
            saveBonus,
            dc: dcVal,
            resolvedEffect,
            // Per-damage-type source breakdown for modal display
            damageTypeBreakdowns: (attack.damage || []).map(comp => ({
                type: comp.type,
                ...getDamageModifierBreakdown(comp.type, player, equipment, subclassData)
            })),
            // Active CC on this player at time of attack
            activeCc: [...(player.cc || [])]
        });
    });

    updateData(updatedPlayers);

    // Automatically log results to notes without alert
    let logText = `\n[COMBAT LOG] ${enemy.name} uses ${attack.name} against:`;
    results.forEach(r => {
        let resultLabel;
        let rollDetail;
        if (r.isSave) {
            resultLabel = r.resultType === 'save_success' ? 'SAVE SUCCESS 🛡️' : 'SAVE FAILED 💥';
            if (r.d20 === null) {
                rollDetail = `${r.saveStat.toUpperCase()} Save DC ${r.dc} (Manual Resolution)`;
            } else {
                rollDetail = `${r.saveStat.toUpperCase()} Save DC ${r.dc}: rolled d20 (${r.d20}) + ${r.saveBonus} = ${r.totalRoll}`;
            }
        } else {
            resultLabel = r.resultType === 'crit' ? 'CRITICAL HIT 🌟' : (r.resultType === 'hit' ? 'HIT 🎯' : (r.resultType === 'crit_miss' ? 'CRITICAL MISS ❌' : 'MISS 💨'));
            if (r.d20 === null) {
                rollDetail = `vs AC ${r.ac} (Manual Resolution)`;
            } else {
                rollDetail = `rolled d20 (${r.d20}) + ${r.toHit} = ${r.totalRoll} vs AC ${r.ac}`;
            }
        }
        logText += `\n- ${r.playerName}: ${rollDetail} (${resultLabel})`;

        const hasDamage = r.resultType === 'hit' || r.resultType === 'crit' || r.resultType === 'save_failed' || (r.resultType === 'save_success' && r.totalDamageApplied > 0);
        if (hasDamage || r.resolvedEffect) {
            logText += ` |`;
            if (hasDamage) {
                logText += ` Damage: ${r.totalDamageApplied} [${r.damageBreakdowns.join(', ')}] | HP: ${r.originalHp} -> ${r.newHp}`;
            }
            if (r.resolvedEffect) {
                logText += ` Effect: ${r.resolvedEffect}`;
            }
        }
    });
    logText += `\n`;
    setBattleNotes(prev => (prev ? prev + logText : logText));

    setActiveAttackState(prev => ({
        ...prev,
        rollResults: results
    }));
};

const [enemyEditField, setEnemyEditField] = useState(null);
const [enemyEditValue, setEnemyEditValue] = useState('');
const [enemySearchText, setEnemySearchText] = useState('');

const triggerEnemyLimitBreak = (id) => {
    setEnemies(prev => prev.map(e => e.id === id ? { ...e, limitBreakUsed: true } : e));
};

// (battleMode is passed as a prop from App)

// VTT integration state
const [isVttOpen, setIsVttOpen] = useState(false);
const [isVttFullscreen, setIsVttFullscreen] = useState(false);
const [vttRoomUrl, setVttRoomUrl] = useState('https://owlbear.rodeo');
const [vttInputVal, setVttInputVal] = useState('https://owlbear.rodeo');
const [internalBattleNotes, setInternalBattleNotes] = useState('');
const battleNotes = battleNotesProp !== undefined ? battleNotesProp : internalBattleNotes;
const setBattleNotes = setBattleNotesProp || setInternalBattleNotes;
const [vttLoading, setVttLoading] = useState(false);
const [loadingVtt, setLoadingVtt] = useState(true);

const vttPlaceholderRef = useRef(null);
const hasLoadedVttUrlRef = useRef(false);

useEffect(() => {
    const handleOutsideClick = () => {
        setBuffInputEnemyId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
}, []);

// Load VTT settings from Dexie
useEffect(() => {
    async function loadVtt() {
        if (!campaignId) return;
        setLoadingVtt(true);
        try {
            const record = await db.campaignState.get(`campaign_${campaignId}_vtt`);
            if (record?.data) {
                setIsVttOpen(record.data.isVttOpen ?? false);
                setVttRoomUrl(record.data.vttRoomUrl ?? 'https://owlbear.rodeo');
                setVttInputVal(record.data.vttRoomUrl ?? 'https://owlbear.rodeo');
            }
        } catch (err) {
            console.error('Failed to load VTT settings:', err);
        } finally {
            setLoadingVtt(false);
        }
    }
    loadVtt();
}, [campaignId]);

// Save VTT settings to Dexie
useEffect(() => {
    if (loadingVtt || !campaignId) return;
    db.campaignState.put({
        id: `campaign_${campaignId}_vtt`,
        campaignId: campaignId,
        type: 'vttSettings',
        data: { isVttOpen, vttRoomUrl },
        updatedAt: Date.now()
    }).catch(err => console.error('Failed to save VTT settings:', err));
}, [campaignId, isVttOpen, vttRoomUrl, loadingVtt]);

// Toggle battle layout full-width container class on container element
useEffect(() => {
    const container = document.querySelector('.container');
    if (!container) return;
    if (battleMode) {
        container.classList.add('battle-mode-layout');
    } else {
        container.classList.remove('battle-mode-layout');
    }
    return () => {
        container.classList.remove('battle-mode-layout');
    };
}, [battleMode]);

// Handle incoming load status events from Electron main process
useEffect(() => {
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    if (!ipc) return;

    const handleLoadingStatus = (event, { loading }) => {
        setVttLoading(loading);
    };

    ipc.on('vtt-loading-status', handleLoadingStatus);
    return () => {
        ipc.off('vtt-loading-status', handleLoadingStatus);
    };
}, []);


const getVttUrl = (input) => {
    const trimmed = input.trim();
    if (!trimmed) return 'https://owlbear.rodeo';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    if (trimmed.startsWith('room/')) {
        return `https://owlbear.rodeo/${trimmed}`;
    }
    return `https://owlbear.rodeo/room/${trimmed}`;
};

const handleLoadVtt = () => {
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    if (!ipc) return;
    const targetUrl = getVttUrl(vttInputVal);
    setVttRoomUrl(targetUrl);
    setVttInputVal(targetUrl);
    ipc.send('vtt-load-url', { url: targetUrl });
};

const handleReloadVtt = () => {
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    if (!ipc) return;
    ipc.send('vtt-reload');
};

const handleOpenInBrowser = () => {
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    if (!ipc) return;
    ipc.send('vtt-open-browser', { url: vttRoomUrl });
};

const startEnemyEdit = (enemy, field) => {
    setEnemyEditField({ id: enemy.id, field });
    setEnemyEditValue(String(enemy[field]));
};

const commitEnemyEdit = (enemy) => {
    if (!enemyEditField) return;
    const val = Math.max(1, parseInt(enemyEditValue) || 1);
    if (enemyEditField.field === 'hpMax') {
        setEnemies(prev => prev.map(e => {
            if (e.id !== enemy.id) return e;
            return { ...e, hpMax: val, hp: val, limitBreakUsed: false };
        }));
    } else {
        updateEnemy(enemy.id, enemyEditField.field, val);
    }
    setEnemyEditField(null);
    setEnemyEditValue('');
};

const cancelEnemyEdit = () => {
    setEnemyEditField(null);
    setEnemyEditValue('');
};

const addEnemy = () => {
    const newId = Date.now().toString();
    const e = {
        id: newId,
        name: 'Enemy', classType: 'Enemy',
        ac: 12, hpBase: 20, hp: 20, hpMax: 20,
        str: 10, dex: 10, con: 10, int: 6, wis: 8, cha: 6,
        abilities: '',
        features: '', background: '',
        skills: {},
        editing: true,
        limitBreakUsed: false,
        resistances: [],
        immunities: [],
        vulnerabilities: [],
        ccResistances: [],
        ccImmunities: [],
        ccVulnerabilities: [],
        cc: [],
        buffs: [],
        buffStates: {},
        spentBuffs: {},
        attacks: []
    };
    setEnemies(prev => [...prev, e]);
    setMinimizedEnemies(prev => ({ ...prev, [newId]: true }));
};

const updateEnemy = (id: string, field: keyof IEnemy, val: IEnemy[keyof IEnemy]) =>
    setEnemies(prev => prev.map((e): IEnemy => {
    if (e.id === id) {
        if (field === 'classType') {
            const classType = String(val);
            if (classType === 'Boss') {
                return { ...e, classType, bossHpStart: e.hp, limitBreakUsed: false };
            }
            return { ...e, classType, bossHpStart: undefined, limitBreakUsed: false };
        }
        return { ...e, [field]: val };
    }
    return e;
}));

const removeEnemy = id => setEnemies(prev => prev.filter(e => e.id !== id));
const toggleEnemySkill = (id, skill) => setEnemies(prev => prev.map(e => e.id === id ? { ...e, skills: { ...e.skills, [skill]: !e.skills?.[skill] } } : e));

const copyActiveEnemy = (id) => {
    const index = enemies.findIndex(e => e.id === id);
    if (index === -1) return;
    const source = enemies[index];
    const newId = generateUniqueId();
    const clone = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        editing: false
    };

    const updated = [...enemies];
    updated.splice(index + 1, 0, clone);
    setEnemies(updated);

    setMinimizedEnemies(prev => ({ ...prev, [newId]: minimizedEnemies[id] }));
};

const selectMonster = (enemyId, monster) => {
    setEnemies(prev => prev.map(e => {
        if (e.id === enemyId) {
            return {
                ...e,
                name: monster.name,
                ac: monster.ac || 12,
                hpMax: monster.hpMax || 20,
                hp: monster.hpMax || 20,
                str: monster.str || 10,
                dex: monster.dex || 10,
                con: monster.con || 10,
                int: monster.int || 10,
                wis: monster.wis || 10,
                cha: monster.cha || 10,
                proficiency: monster.proficiency || 2,
                background: monster.background || '',
                abilities: monster.abilities || '',
                features: monster.features || '',
                skills: monster.skills || {},
                saves: monster.saves || {},
                resistances: monster.resistances || [],
                immunities: monster.immunities || [],
                vulnerabilities: monster.vulnerabilities || [],
                ccResistances: monster.ccResistances || [],
                ccImmunities: monster.ccImmunities || [],
                ccVulnerabilities: monster.ccVulnerabilities || [],
                cc: [],
                buffs: monster.buffs || [],
                buffStates: {},
                spentBuffs: {},
                attacks: monster.attacks && monster.attacks.length > 0 
                    ? monster.attacks 
                    : (monster.abilities ? parseAbilities(monster.abilities) : []),
                classType: monster.classType || 'Enemy',
                editing: false,
                limitBreakUsed: false
            };
        }
        return e;
    }));
};

const createAndSelectMonster = (enemyId, name) => {
    const monsterName = name.trim() || 'Custom Monster';
    const newMonster = {
        id: Date.now().toString(),
        name: monsterName,
        classType: 'Enemy',
        ac: 12, hpMax: 20,
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        proficiency: 2, background: 'CR 1',
        abilities: '',
        features: '', skills: {}, saves: {},
        resistances: [], immunities: [], vulnerabilities: [],
        ccResistances: [], ccImmunities: [], ccVulnerabilities: [],
        buffs: [],
        attacks: []
    };
    updateLibrary([...library, newMonster]);
    selectMonster(enemyId, newMonster);
};

const computeEnemyHpDelta = (enemy, amount, asTempHp = false) => {
    let hp = enemy.hp;
    let hpTemp = enemy.hpTemp || 0;
    let limitBreakUsed = enemy.limitBreakUsed;

    if (asTempHp && amount !== 0) {
        hpTemp = Math.max(hpTemp, Math.abs(amount));
        return { hp, hpTemp, limitBreakUsed };
    }

    if (amount > 0) {
        let remainingDamage = amount;
        if (hpTemp > 0) {
            const absorbed = Math.min(hpTemp, remainingDamage);
            hpTemp -= absorbed;
            remainingDamage -= absorbed;
        }
        hp = Math.max(0, enemy.hp - remainingDamage);
    } else if (amount < 0) {
        hp = Math.min(enemy.hpMax, enemy.hp + Math.abs(amount));
    }

    if (enemy.classType === 'Boss') {
        const bossHpStart = enemy.bossHpStart || enemy.hpMax;
        const damageTaken = Math.max(0, bossHpStart - hp);
        const rawUltPercent = hp <= 0 ? 0 : Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
        limitBreakUsed = rawUltPercent < 100 ? false : limitBreakUsed;
    }

    return { hp, hpTemp, limitBreakUsed };
};

const computeEnemyHpDeltaWithRules = (enemy: IEnemy, amount: number, asTempHp = false) => {
    const base = computeEnemyHpDelta(enemy, amount, asTempHp);
    const trigger = hpChangeTrigger(amount);
    if (!trigger || asTempHp || amount === 0 || !logicBlocks?.length) return base;
    return mergeEnemyWithRules(enemy, base, logicBlocks, trigger, hpChangeVariables(amount));
};

const startInlineDelta = (type, id, field) => {
    setInlineDeltaEdit({ type, id, field });
    setInlineDeltaValue('');
};

const cancelInlineDelta = () => {
    setInlineDeltaEdit(null);
    setInlineDeltaValue('');
};

const commitInlineDelta = () => {
    if (!inlineDeltaEdit) return;
    const amount = parseInt(inlineDeltaValue);
    if (isNaN(amount) || amount === 0) {
        cancelInlineDelta();
        return;
    }

    const { type, id, field } = inlineDeltaEdit;

    if (field === 'hp') {
        if (type === 'player') {
            const player = data.find(p => p.id === id);
            if (player) updatePlayer(id, computePlayerHpDelta(player, amount));
        } else {
            setEnemies(prev => prev.map(e => {
                if (e.id !== id) return e;
                return { ...e, ...computeEnemyHpDeltaWithRules(e, amount) };
            }));
        }
    } else if (field === 'mana' && type === 'player') {
        const player = data.find(p => p.id === id);
        if (player) updatePlayer(id, 'manaCurrent', computePlayerManaDelta(player, amount));
    }

    cancelInlineDelta();
};

const applyBulkHpToTargets = (isHeal) => {
    const amount = parseInt(bulkActionValue);
    if (isNaN(amount) || amount <= 0 || selectedTargets.length === 0) return;

    const delta = isHeal ? -amount : amount;
    const effectiveTempHp = bulkTempHp && delta > 0;
    let nextPlayers = [...data];
    let nextEnemies = [...enemies];

    selectedTargets.forEach(key => {
        const [type, id] = key.split(':');
        if (type === 'player') {
            const idx = nextPlayers.findIndex(p => p.id === id);
            if (idx !== -1) {
                nextPlayers[idx] = { ...nextPlayers[idx], ...computePlayerHpDelta(nextPlayers[idx], delta, effectiveTempHp) };
            }
        } else if (type === 'enemy') {
            const idx = nextEnemies.findIndex(e => e.id === id);
            if (idx !== -1) {
                nextEnemies[idx] = { ...nextEnemies[idx], ...computeEnemyHpDeltaWithRules(nextEnemies[idx], delta, effectiveTempHp) };
            }
        }
    });

    updateData(nextPlayers);
    setEnemies(nextEnemies);
    clearTargetSelection();
};

const applyBulkManaDrain = () => {
    const amount = parseInt(bulkActionValue);
    if (isNaN(amount) || amount <= 0 || selectedTargets.length === 0) return;

    const nextPlayers = data.map(p => {
        const key = targetKey('player', p.id);
        if (!selectedTargets.includes(key)) return p;
        return { ...p, manaCurrent: computePlayerManaDelta(p, amount) };
    });

    updateData(nextPlayers);
    clearTargetSelection();
};

useEffect(() => {
    if (!battleMode) clearTargetSelection();
}, [battleMode]);

useEffect(() => {
    if (partyXpModalOpen || partyLevelModalOpen || isVttFullscreen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => {
        document.body.style.overflow = 'unset';
    };
}, [partyXpModalOpen, partyLevelModalOpen, isVttFullscreen]);

const isVttActive = battleMode && isVttOpen && !partyXpModalOpen && !partyLevelModalOpen && !activeAttackState && !configModalOpen;

// Auto-exit VTT fullscreen if VTT becomes inactive
useEffect(() => {
    if (!isVttActive) {
        setTimeout(() => {
            setIsVttFullscreen(false);
        }, 0);
    }
}, [isVttActive]);

// Handle Escape key to exit fullscreen (for main window focus)
useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && isVttFullscreen) {
            setIsVttFullscreen(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
}, [isVttFullscreen]);

// Handle IPC event from Electron main process to exit fullscreen (when VTT subview is focused)
useEffect(() => {
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    if (!ipc) return;

    const handleExitFullscreen = () => {
        setIsVttFullscreen(false);
    };

    ipc.on('vtt-exit-fullscreen', handleExitFullscreen);
    return () => {
        ipc.off('vtt-exit-fullscreen', handleExitFullscreen);
    };
}, []);

useEffect(() => {
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    if (!ipc) return;

    if (!isVttActive || !vttPlaceholderRef.current) {
        ipc.send('vtt-toggle-visibility', { visible: false });
        return;
    }

    // Make VTT View visible
    ipc.send('vtt-toggle-visibility', { visible: true });

    // Load saved URL on initial show
    if (!hasLoadedVttUrlRef.current) {
        ipc.send('vtt-load-url', { url: vttRoomUrl });
        hasLoadedVttUrlRef.current = true;
    }

    // Function to update bounds based on placeholder client rect and prevent covering bottom nav
    const updateBounds = () => {
        if (isVttFullscreen) {
            ipc.send('vtt-update-bounds', {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            });
            return;
        }

        if (!vttPlaceholderRef.current) return;
        const rect = vttPlaceholderRef.current.getBoundingClientRect();

        // Get bottom nav top coordinate if it exists
        const bottomNav = document.querySelector('.bottom-nav');
        let bottomLimit = window.innerHeight;
        if (bottomNav) {
            const navRect = bottomNav.getBoundingClientRect();
            bottomLimit = navRect.top;
        }

        const y = rect.top;
        const maxAllowedHeight = bottomLimit - y - 10; // 10px safety margin
        const height = Math.min(rect.height, maxAllowedHeight);

        ipc.send('vtt-update-bounds', {
            x: rect.left,
            y: y,
            width: rect.width,
            height: height > 0 ? height : 0
        });
    };

    // Run initial update
    updateBounds();

    // Listen for resizing
    const resizeObserver = new ResizeObserver(() => {
        updateBounds();
    });
    resizeObserver.observe(vttPlaceholderRef.current);

    // Listen to window resizing and page-level scrolling (capturing to cover internal scrolling divs)
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);

    // Set up periodic interval poll to guarantee bounds tracking during transitions/rendering
    const intervalId = setInterval(updateBounds, 150);

    return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateBounds);
        window.removeEventListener('scroll', updateBounds, true);
        clearInterval(intervalId);

        // Critical: Ensure VTT is hidden when this component unmounts or VTT is deactivated
        ipc.send('vtt-toggle-visibility', { visible: false });
    };
}, [isVttActive, vttRoomUrl, isVttFullscreen]);

const getEnemyBuffsList = (enemy) => {
    return (enemy.buffs || []).map(b => {
        const config = buffsDatabase.find(x => x.name === b);
        return { name: b, config };
    });
};

const handleRemoveEnemyBuff = (enemyId, buffName) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy) return;
    const updated = (enemy.buffs || []).filter(x => x !== buffName);
    const nextStates = { ...(enemy.buffStates || {}) };
    const nextSpent = { ...(enemy.spentBuffs || {}) };
    delete nextStates[buffName];
    delete nextSpent[buffName];
    setEnemies(prev => prev.map(e => e.id === enemyId ? {
        ...e,
        buffs: updated,
        buffStates: nextStates,
        spentBuffs: nextSpent
    } : e));
};

const getEnemySpriteInfo = (enemy) => {
    const cls = (enemy.classType || '').trim().toLowerCase();
    const spriteName = cls === 'boss' ? 'boss' : 'enemy';

    const isKO = enemy.hp <= 0;
    let isPowered = false;
    if (cls === 'boss') {
        const bossHpStart = enemy.bossHpStart || enemy.hpMax;
        const damageTaken = Math.max(0, bossHpStart - enemy.hp);
        const rawUltPercent = enemy.hp <= 0 ? 0 : Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
        isPowered = rawUltPercent >= 100 && !enemy.limitBreakUsed;
    }
    const isHurt = enemy.hp < enemy.hpMax * 0.5;

    let spriteState: IEnemySpriteInfo['spriteState'] = 'normal';
    if (isKO) spriteState = 'ko';
    else if (isPowered) spriteState = 'powered';
    else if (isHurt) spriteState = 'hurt';

    return { spriteName, spriteState };
};

const addEnemyCc = (enemyId, effect) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy) return;
    if (getCCModifier(effect, enemy, null) === 'immune') {
        alert(`${enemy.name} is immune to ${effect}!`);
        return;
    }
    const currentCc = enemy.cc || [];
    if (!currentCc.includes(effect)) {
        updateEnemy(enemyId, 'cc', [...currentCc, effect]);
    }
};

const removeEnemyCc = (enemyId, effect) => {
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy) return;
    const currentCc = enemy.cc || [];
    updateEnemy(enemyId, 'cc', currentCc.filter(x => x !== effect));
};

const triggerTurnEffects = () => {
    let logLines = [];
    let changedPlayers = {}; // id -> fields
    let changedEnemies = {}; // id -> fields

    // 1. Process Players
    data.forEach(player => {
        if (!player.inParty) return;
        const turnStart = applyPlayerRuleTrigger(player, logicBlocks, 'on_turn_start', getPlayerRuleOptions(player));
        const working = { ...player, ...turnStart };
        const buffs = getPlayerBuffsWithConfig(working, equipment);
        let hpCurrent = working.hpCurrent;
        let hpMax = calculateMaxHP(working);
        let manaCurrent = working.manaCurrent;
        let manaMax = calculateMaxMana(working);
        let tempHp = working.hpTemp || 0;
        const spentBuffs = { ...(working.spentBuffs || {}) };
        let hasChanges = Object.keys(turnStart).length > 0;

        buffs.forEach(buff => {
            const config = buff.config;
            if (!config || config.type !== 'turn') return;
            if (spentBuffs[buff.name]) return; // Skip if spent

            const rolled = rollFormula(config.turnFormula || '0');
            const amt = rolled.total;
            let msg = '';

            if (config.turnType === 'healHP') {
                const nextHp = Math.min(hpMax, hpCurrent + amt);
                msg = `Healed ${player.name} for ${amt} HP (${hpCurrent} -> ${nextHp})`;
                hpCurrent = nextHp;
                hasChanges = true;
            } else if (config.turnType === 'damageHP') {
                const nextHp = Math.max(0, hpCurrent - amt);
                msg = `Dealt ${amt} damage to ${player.name} (${hpCurrent} -> ${nextHp})`;
                hpCurrent = nextHp;
                hasChanges = true;
            } else if (config.turnType === 'healTempHP') {
                const nextTemp = Math.max(tempHp, amt);
                msg = `${player.name} gained ${amt} Temp HP (current: ${tempHp} -> new: ${nextTemp})`;
                tempHp = nextTemp;
                hasChanges = true;
            } else if (config.turnType === 'healMana') {
                const nextMana = Math.min(manaMax, manaCurrent + amt);
                msg = `Restored ${amt} Mana to ${player.name} (${manaCurrent} -> ${nextMana})`;
                manaCurrent = nextMana;
                hasChanges = true;
            } else if (config.turnType === 'damageMana') {
                const nextMana = Math.max(0, manaCurrent - amt);
                msg = `Drained ${amt} Mana from ${player.name} (${manaCurrent} -> ${nextMana})`;
                manaCurrent = nextMana;
                hasChanges = true;
            }

            if (msg) {
                let formulaLog = `rolled ${config.turnFormula} = ${rolled.total}`;
                if (rolled.rolls.length > 0) {
                    formulaLog = `rolled [${rolled.rolls.join('+')}]${rolled.modifier !== 0 ? (rolled.modifier > 0 ? '+' + rolled.modifier : rolled.modifier) : ''} = ${rolled.total}`;
                }
                logLines.push(`[Turn Buff: ${buff.name}] ${msg} (${formulaLog})`);
            }

            if (config.oncePerRest === 'short' || config.oncePerRest === 'long') {
                spentBuffs[buff.name] = true;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            const endPatch = applyPlayerRuleTrigger(
                { ...working, hpCurrent, manaCurrent, hpTemp: tempHp, spentBuffs },
                logicBlocks,
                'on_turn_end',
                getPlayerRuleOptions(working),
            );
            changedPlayers[player.id] = { hpCurrent, manaCurrent, hpTemp: tempHp, spentBuffs, ...endPatch };
        }
    });

    // 2. Process Enemies
    enemies.forEach(enemy => {
        const turnStart = applyEnemyRuleTrigger(enemy, logicBlocks, 'on_turn_start');
        const working = { ...enemy, ...turnStart };
        const buffs = getEnemyBuffsList(working);
        let hpCurrent = working.hp ?? enemy.hp;
        let hpMax = calculateEnemyMaxHP(working);
        let tempHp = working.hpTemp || 0;
        const spentBuffs = { ...(working.spentBuffs || {}) };
        let hasChanges = Object.keys(turnStart).length > 0;

        buffs.forEach(buff => {
            const config = buff.config;
            if (!config || config.type !== 'turn') return;
            if (spentBuffs[buff.name]) return;

            const rolled = rollFormula(config.turnFormula || '0');
            const amt = rolled.total;
            let msg = '';

            if (config.turnType === 'healHP') {
                const nextHp = Math.min(hpMax, hpCurrent + amt);
                msg = `Healed ${enemy.name} for ${amt} HP (${hpCurrent} -> ${nextHp})`;
                hpCurrent = nextHp;
                hasChanges = true;
            } else if (config.turnType === 'damageHP') {
                const nextHp = Math.max(0, hpCurrent - amt);
                msg = `Dealt ${amt} damage to ${enemy.name} (${hpCurrent} -> ${nextHp})`;
                hpCurrent = nextHp;
                hasChanges = true;
            } else if (config.turnType === 'healTempHP') {
                const nextTemp = Math.max(tempHp, amt);
                msg = `${enemy.name} gained ${amt} Temp HP (current: ${tempHp} -> new: ${nextTemp})`;
                tempHp = nextTemp;
                hasChanges = true;
            }

            if (msg) {
                let formulaLog = `rolled ${config.turnFormula} = ${rolled.total}`;
                if (rolled.rolls.length > 0) {
                    formulaLog = `rolled [${rolled.rolls.join('+')}]${rolled.modifier !== 0 ? (rolled.modifier > 0 ? '+' + rolled.modifier : rolled.modifier) : ''} = ${rolled.total}`;
                }
                logLines.push(`[Turn Buff: ${buff.name}] ${msg} (${formulaLog})`);
            }

            if (config.oncePerRest === 'short' || config.oncePerRest === 'long') {
                spentBuffs[buff.name] = true;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            const endPatch = applyEnemyRuleTrigger(
                { ...working, hp: hpCurrent, hpTemp: tempHp, spentBuffs },
                logicBlocks,
                'on_turn_end',
            );
            changedEnemies[enemy.id] = { hp: hpCurrent, hpTemp: tempHp, spentBuffs, ...endPatch };
        }
    });

    // 3. Commit state changes
    if (Object.keys(changedPlayers).length > 0) {
        updateData(data.map(p => {
            if (changedPlayers[p.id]) {
                return { ...p, ...changedPlayers[p.id] };
            }
            return p;
        }));
    }

    if (Object.keys(changedEnemies).length > 0) {
        setEnemies(prev => prev.map(e => {
            if (changedEnemies[e.id]) {
                return { ...e, ...changedEnemies[e.id] };
            }
            return e;
        }));
    }

    // 4. Log to battle notes
    if (logLines.length > 0) {
        const separator = `\n--- Turn Resolved ---`;
        const joinedLogs = `\n` + logLines.join(`\n`);
        setBattleNotes(prev => (prev ? prev + separator + joinedLogs : separator + joinedLogs));
    } else {
        const separator = `\n--- Turn Resolved (No active effects) ---`;
        setBattleNotes(prev => (prev ? prev + separator : separator));
    }
};


    const shortRest = () => {
        party.shortRest();
        setEnemies(prev => prev.map(e => {
            const nextSpent = { ...(e.spentBuffs || {}) };
            Object.keys(nextSpent).forEach(buffName => {
                const config = buffsDatabase.find(b => b.name === buffName);
                if (config && config.oncePerRest === 'short') {
                    delete nextSpent[buffName];
                }
            });
            return { ...e, spentBuffs: nextSpent };
        }));
    };

    const longRest = () => {
        party.longRest();
        setEnemies(prev => prev.map(e => ({ ...e, spentBuffs: {} })));
    };

    const handleToggleBuff = (entity, buff, isPlayer) => {
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
            let hpMax = entity.hpCurrent !== undefined
                ? calculateMaxHP(entity)
                : calculateEnemyMaxHP(entity);
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

            if (isPlayer) {
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
            } else {
                const basePatch = { hp: hpCurrent, hpTemp: tempHp, spentBuffs };
                let finalPatch = basePatch;
                if (config.turnType === 'damageHP') {
                    finalPatch = mergeEnemyWithRules(entity, basePatch, logicBlocks, 'on_damage', {
                        damage: amt,
                        amount: amt,
                    });
                } else if (config.turnType === 'healHP') {
                    finalPatch = mergeEnemyWithRules(entity, basePatch, logicBlocks, 'on_heal', {
                        healed: amt,
                        amount: amt,
                    });
                }
                setEnemies(prev => prev.map(e => e.id === entity.id ? { ...e, ...finalPatch } : e));
            }
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

        if (isPlayer) {
            updatePlayer(entity.id, { buffStates, spentBuffs });
        } else {
            setEnemies(prev => prev.map(e => e.id === entity.id ? { ...e, buffStates, spentBuffs } : e));
        }
    };

    const handleToggleEnemyBuff = (entity, buff) => {
        handleToggleBuff(entity, buff, false);
    };

    const toggleSaveProficiency = (id, stat, isEnemy = false) => {
        if (isEnemy) {
            setEnemies(prev => prev.map(e => {
                if (e.id === id) {
                    const currentSaves = e.saves || {};
                    return { ...e, saves: { ...currentSaves, [stat]: !currentSaves[stat] } };
                }
                return e;
            }));
        } else {
            party.toggleSaveProficiency(id, stat);
        }
    };


    return {
        enemies,
        setEnemies,
        minimizedEnemies,
        setMinimizedEnemies,
        battleMode,
        setBattleMode,
        library,
        updateLibrary,
        buffsDatabase,
        config,
        configModalOpen,
        equipment,
        inlineDeltaEdit,
        setInlineDeltaEdit,
        inlineDeltaValue,
        setInlineDeltaValue,
        actionToast: party.actionToast,
        showActionToast,
        selectedTargets,
        setSelectedTargets,
        bulkActionValue,
        setBulkActionValue,
        bulkTempHp,
        setBulkTempHp,
        targetKey,
        isTargetSelected,
        toggleTargetSelection,
        clearTargetSelection,
        applyBulkHpToTargets,
        applyBulkManaDrain,
        activeAttackState,
        setActiveAttackState,
        autoRollEnabled,
        setAutoRollEnabled,
        getEnemyAttacks,
        startAttackTargeting,
        startPlayerAttackTargeting,
        executePlayerAttack,
        executeAttack,
        enemyEditField,
        setEnemyEditField,
        enemyEditValue,
        setEnemyEditValue,
        enemySearchText,
        setEnemySearchText,
        triggerEnemyLimitBreak,
        isVttOpen,
        setIsVttOpen,
        isVttFullscreen,
        setIsVttFullscreen,
        vttRoomUrl,
        setVttRoomUrl,
        vttInputVal,
        setVttInputVal,
        battleNotes,
        setBattleNotes,
        vttLoading,
        setVttLoading,
        vttPlaceholderRef,
        isVttActive,
        getVttUrl,
        handleLoadVtt,
        handleReloadVtt,
        handleOpenInBrowser,
        startEnemyEdit,
        commitEnemyEdit,
        cancelEnemyEdit,
        addEnemy,
        updateEnemy,
        removeEnemy,
        toggleEnemySkill,
        copyActiveEnemy,
        selectMonster,
        createAndSelectMonster,
        computeEnemyHpDelta,
        calculateEnemyMaxHP,
        startInlineDelta,
        cancelInlineDelta,
        commitInlineDelta,
        getEnemySpriteInfo,
        addEnemyCc,
        removeEnemyCc,
        getEnemyBuffsList,
        handleRemoveEnemyBuff,
        handleToggleBuff,
        handleToggleEnemyBuff,
        toggleSaveProficiency,
        triggerTurnEffects,
        shortRest,
        longRest,
        buffInputEnemyId,
        setBuffInputEnemyId,
        defaultMonsters: defaultMonsters as IMonster[],
        encounterRules: ruleEngineCombat.encounterRules,
        turnOrder: ruleEngineCombat.turnOrder,
        currentTurnIndex: ruleEngineCombat.currentTurnIndex,
        currentTurnActor: ruleEngineCombat.currentTurnActor,
        applyQuickDamage: ruleEngineCombat.applyQuickDamage,
        applyQuickHeal: ruleEngineCombat.applyQuickHeal,
        getModifiersFor: ruleEngineCombat.getModifiersFor,
        advanceEncounterTurn: ruleEngineCombat.advanceEncounterTurn,
    } satisfies ICombatState;
}
