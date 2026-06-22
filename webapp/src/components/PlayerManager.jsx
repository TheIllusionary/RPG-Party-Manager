import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PlayerManager.css';
import defaultMonsters from './default_monsters.json';

const generateUniqueId = () => Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);

import { parseAbilities, rollFormula, getDamageMultiplier, extractExtraEffects } from '../utils/combatUtils';

const DAMAGE_TYPES = [
    'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 
    'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'
];

const ALL_CC_EFFECTS = [
    'Blind 🕶️',
    'Charmed ✨',
    'Deafened 🔇',
    'Frightened 😨',
    'Grappled ✊',
    'Incapacitated 😵',
    'Paralyzed ⏳',
    'Petrified 🗿',
    'Poisoned 🤢',
    'Prone 🛏️',
    'Restrained 🕸️',
    'Stunned 🌀',
    'Asleep 💤',
    'Slowed 🐢'
];

export default function PlayerManager({
    data,
    updateData,
    equipment,
    battleMode,
    setBattleMode,
    enemies,
    setEnemies,
    minimizedEnemies,
    setMinimizedEnemies,
    library,
    updateLibrary
}) {
    const focusAndSelectRef = useCallback((el) => {
        if (el) {
            setTimeout(() => {
                el.focus();
                el.select();
            }, 10);
        }
    }, []);

    const [editingId, setEditingId] = useState(null);
    const [damageModalId, setDamageModalId] = useState(null);
    const [damageAmount, setDamageAmount] = useState('');
    const [isTempHpCheckboxChecked, setIsTempHpCheckboxChecked] = useState(false);

    const [playerEditField, setPlayerEditField] = useState(null); // { id, field }
    const [playerEditValue, setPlayerEditValue] = useState('');
    const [ccDropdownPlayerId, setCcDropdownPlayerId] = useState(null);

    const [activeAttackState, setActiveAttackState] = useState(null);
    const [autoRollEnabled, setAutoRollEnabled] = useState(false);

    const getEnemyAttacks = (enemy) => {
        if (Array.isArray(enemy.attacks) && enemy.attacks.length > 0) {
            return enemy.attacks;
        }
        return parseAbilities(enemy.abilities || '');
    };

    const startAttackTargeting = (enemy, attack) => {
        setActiveAttackState({
            enemy,
            attack,
            selectedTargets: {},
            rollResults: null
        });
    };

    const executeAttack = () => {
        const { enemy, attack, selectedTargets } = activeAttackState;
        
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
        const extraEffect = extractExtraEffects(attack.description);
        
        targetIds.forEach(targetId => {
            const playerIndex = updatedPlayers.findIndex(p => p.id === targetId);
            if (playerIndex === -1) return;
            const player = updatedPlayers[playerIndex];
            
            const isSave = typeof attack.dc === 'number' || (attack.dc && !isNaN(parseInt(attack.dc)));
            let d20 = null;
            let resultType = 'miss';
            let totalRoll = 0;
            let saveBonus = 0;
            let saveStat = '';
            let dcVal = 0;
            const toHit = attack.toHit || 0;
            
            if (autoRollEnabled) {
                d20 = Math.floor(Math.random() * 20) + 1;
                if (isSave) {
                    dcVal = parseInt(attack.dc);
                    saveStat = (attack.save || 'Dexterity').toLowerCase();
                    const statKey = saveStat.substring(0, 3); // 'str', 'dex', 'con', 'int', 'wis', 'cha'
                    const statVal = player[statKey] !== undefined ? player[statKey] : 10;
                    const statMod = Math.floor((statVal - 10) / 2);
                    const isProf = player.saves && player.saves[statKey];
                    const profBonus = getLevelInfo(player.xp).level >= 17 ? 6 : Math.ceil(getLevelInfo(player.xp).level / 4) + 1;
                    saveBonus = statMod + (isProf ? profBonus : 0);
                    totalRoll = d20 + saveBonus;
                    
                    if (totalRoll >= dcVal) {
                        resultType = 'save_success';
                    } else {
                        resultType = 'save_failed';
                    }
                } else {
                    totalRoll = d20 + toHit;
                    if (d20 === 20) resultType = 'crit';
                    else if (d20 === 1) resultType = 'crit_miss';
                    else if (totalRoll >= player.ac) resultType = 'hit';
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
                const damageComponents = attack.damage || [];
                
                damageComponents.forEach(comp => {
                    const rolled = rollFormula(comp.formula, isCrit);
                    const mult = getDamageMultiplier(comp.type, player);
                    
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
            const maxHp = calculateMaxHP(player);
            const newHp = Math.max(0, originalHp - totalDamageApplied);
            
            let newUlt = player.ultCurrent;
            if (totalDamageApplied > 0 && originalHp > 0) {
                const actualDamageTaken = originalHp - newHp;
                const conMod = calculateModifier(player.con);
                const damageMultiplier = Math.max(0.6, Math.min(1.5, 1.35 - 0.15 * conMod));
                const limitBreakMaxDamage = maxHp * damageMultiplier;
                const points = (actualDamageTaken / limitBreakMaxDamage) * player.ultMax;
                newUlt = Math.min(player.ultMax, player.ultCurrent + points);
            }
            
            updatedPlayers[playerIndex] = {
                ...player,
                hpCurrent: newHp,
                ultCurrent: newUlt
            };
            
            const resolvedEffect = (resultType === 'save_failed' || resultType === 'hit' || resultType === 'crit') ? extraEffect : null;
            
            results.push({
                playerId: player.id,
                playerName: player.name,
                ac: player.ac,
                d20,
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
                resolvedEffect
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


    // Missing state hooks for player card minimization
    const [minimizedPlayers, setMinimizedPlayers] = useState(() => {
        const initial = {};
        if (Array.isArray(data)) {
            data.forEach(p => {
                initial[p.id] = false;
            });
        }
        return initial;
    });
    const isPlayerMinimized = (id) => minimizedPlayers[id] === true;

    // Missing state hooks for enemy inline edits
    const [enemyEditField, setEnemyEditField] = useState(null);
    const [enemyEditValue, setEnemyEditValue] = useState('');
    const [enemySearchText, setEnemySearchText] = useState('');

    // Helper to trigger enemy limit break without violating React Hook rule
    const triggerEnemyLimitBreak = (id) => {
        setEnemies(prev => prev.map(e => e.id === id ? { ...e, limitBreakUsed: true } : e));
    };

    // (battleMode is passed as a prop from App)

    // VTT integration state
    const [isVttOpen, setIsVttOpen] = useState(() => localStorage.getItem('isVttOpen') === 'true');
    const [isVttFullscreen, setIsVttFullscreen] = useState(false);
    const [vttRoomUrl, setVttRoomUrl] = useState(() => localStorage.getItem('vttRoomUrl') || 'https://owlbear.rodeo');
    const [vttInputVal, setVttInputVal] = useState(() => localStorage.getItem('vttRoomUrl') || '');
    const [battleNotes, setBattleNotes] = useState(() => localStorage.getItem('battleNotes') || '');
    const [vttLoading, setVttLoading] = useState(false);

    const vttPlaceholderRef = useRef(null);
    const hasLoadedVttUrlRef = useRef(false);

    useEffect(() => {
        const handleOutsideClick = () => {
            setCcDropdownPlayerId(null);
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    // Save persistent VTT and notes state to localStorage
    useEffect(() => {
        localStorage.setItem('isVttOpen', isVttOpen);
    }, [isVttOpen]);

    useEffect(() => {
        localStorage.setItem('vttRoomUrl', vttRoomUrl);
    }, [vttRoomUrl]);

    useEffect(() => {
        localStorage.setItem('battleNotes', battleNotes);
    }, [battleNotes]);

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
            attacks: []
        };
        setEnemies(prev => [...prev, e]);
        setMinimizedEnemies(prev => ({ ...prev, [newId]: true }));
    };

    const updateEnemy = (id, field, val) => setEnemies(prev => prev.map(e => {
        if (e.id === id) {
            if (field === 'classType') {
                if (val === 'Boss') {
                    return { ...e, classType: val, bossHpStart: e.hp, limitBreakUsed: false };
                } else {
                    return { ...e, classType: val, bossHpStart: undefined, limitBreakUsed: false };
                }
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
                    attacks: monster.attacks || [],
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
            resistances: [], immunities: [], vulnerabilities: [], attacks: []
        };
        updateLibrary([...library, newMonster]);
        selectMonster(enemyId, newMonster);
    };

    const applyEnemyHP = (id) => {
        const amount = parseInt(damageAmount);
        if (isNaN(amount) || amount === 0) { setDamageModalId(null); setDamageAmount(''); return; }
        setEnemies(prev => prev.map(e => {
            if (e.id !== id) return e;
            const newHp = Math.min(e.hpMax, e.hp - amount);
            if (e.classType === 'Boss') {
                const bossHpStart = e.bossHpStart || e.hpMax;
                const damageTaken = Math.max(0, bossHpStart - newHp);
                const rawUltPercent = Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
                const limitBreakUsed = rawUltPercent < 100 ? false : e.limitBreakUsed;
                return { ...e, hp: newHp, limitBreakUsed };
            }
            return { ...e, hp: newHp };
        }));
        setDamageModalId(null);
        setDamageAmount('');
    };

    const getEquipmentBonus = (playerId, stat) => {
        const equipped = equipment?.equipped?.[playerId];
        if (!equipped) return 0;
        let total = 0;
        Object.entries(equipped).forEach(([slotId, slot]) => {
            if (slotId === '__wondrous__') {
                if (Array.isArray(slot)) {
                    slot.forEach(wItem => {
                        total += wItem?.modifiers?.[stat] || 0;
                    });
                }
            } else {
                total += slot?.modifiers?.[stat] || 0;
            }
        });
        return total;
    };

    const effectiveStat = (player, stat) => {
        return (player[stat] || 10) + getEquipmentBonus(player.id, stat);
    };

    const [partyXpModalOpen, setPartyXpModalOpen] = useState(false);
    const [partyXpAmount, setPartyXpAmount] = useState('');

    useEffect(() => {
        if (damageModalId || partyXpModalOpen || isVttFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [damageModalId, partyXpModalOpen, isVttFullscreen]);

    // Track active/visible state of VTT view and sync bounds
    const isVttActive = battleMode && isVttOpen && !damageModalId && !partyXpModalOpen && !activeAttackState;

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
            background: '', race: '', alignment: '', features: '',
            resistances: [], immunities: [], vulnerabilities: []
        };
        updateData([...data, newPlayer]);
    };

    const calculateMaxHP = (player) => {
        const level = getLevelInfo(player.xp).level;
        const conMod = calculateModifier(effectiveStat(player, 'con'));
        return Math.max(1, (player.hpBase || 10) + (conMod * level));
    };

    const getPlayerSpriteInfo = (player) => {
        const cls = (player.classType || '').trim().toLowerCase();
        const validClasses = [
            'artificer', 'barbarian', 'bard', 'cleric', 'druid', 
            'fighter', 'monk', 'paladin', 'ranger', 'rogue', 
            'sorcerer', 'warlock', 'wizard'
        ];
        const spriteName = validClasses.includes(cls) ? cls : 'default';

        const maxHp = calculateMaxHP(player);
        const maxMana = calculateMaxMana(player);
        const isKO = player.hpCurrent <= 0;
        const isPowered = player.ultCurrent >= player.ultMax;
        const isWinded = maxMana > 0 && player.manaCurrent < maxMana * 0.2;
        const isHurt = player.hpCurrent < maxHp * 0.5;

        let spriteState = 'normal';
        if (isKO) spriteState = 'ko';
        else if (isPowered) spriteState = 'powered';
        else if (isWinded) spriteState = 'winded';
        else if (isHurt) spriteState = 'hurt';

        return { spriteName, spriteState };
    };

    const getEnemySpriteInfo = (enemy) => {
        const cls = (enemy.classType || '').trim().toLowerCase();
        const spriteName = cls === 'boss' ? 'boss' : 'enemy';

        const isKO = enemy.hp <= 0;
        let isPowered = false;
        if (cls === 'boss') {
            const bossHpStart = enemy.bossHpStart || enemy.hpMax;
            const damageTaken = Math.max(0, bossHpStart - enemy.hp);
            const rawUltPercent = Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
            isPowered = rawUltPercent >= 100 && !enemy.limitBreakUsed;
        }
        const isHurt = enemy.hp < enemy.hpMax * 0.5;

        let spriteState = 'normal';
        if (isKO) spriteState = 'ko';
        else if (isPowered) spriteState = 'powered';
        else if (isHurt) spriteState = 'hurt';

        return { spriteName, spriteState };
    };

    const updatePlayer = (id, field, value) => {
        const updated = data.map(p => {
            if (p.id === id) {
                if (field === 'hpCurrent') value = Math.min(value, calculateMaxHP(p));
                if (field === 'ultCurrent') value = Math.max(0, Math.min(value, p.ultMax));
                return { ...p, [field]: value };
            }
            return p;
        });
        updateData(updated);
    };

    const startPlayerEdit = (player, field) => {
        setPlayerEditField({ id: player.id, field });
        setPlayerEditValue(String(player[field]));
    };

    const commitPlayerEdit = (player) => {
        if (!playerEditField) return;
        let val = parseInt(playerEditValue) || 0;
        const field = playerEditField.field;
        if (field === 'hpCurrent') {
            val = Math.max(0, Math.min(val, calculateMaxHP(player)));
        } else if (field === 'manaCurrent') {
            val = Math.max(0, Math.min(val, calculateMaxMana(player)));
        } else if (field === 'ultCurrent') {
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

    const calculateModifier = (score) => {
        return Math.floor(((score || 10) - 10) / 2);
    };

    const getProficiencyBonus = (player) => {
        const lvl = getLevelInfo(player.xp).level;
        return lvl >= 17 ? 6 : Math.ceil(lvl / 4) + 1;
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
            const player = data.find(p => p.id === id);
            if (!player) return;
            const currentSaves = player.saves || {};
            updatePlayer(id, 'saves', { ...currentSaves, [stat]: !currentSaves[stat] });
        }
    };

    const formatModifier = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

    const xpThresholds = [
        0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
    ];

    const getLevelInfo = (xp) => {
        let level = 1;
        for (let i = 0; i < xpThresholds.length; i++) {
            if (xp >= xpThresholds[i]) {
                level = i + 1;
            } else {
                break;
            }
        }
        const currentLevelXp = xpThresholds[level - 1] || 0;
        const nextLevelXp = xpThresholds[level] || null;
        return { level, currentLevelXp, nextLevelXp, xpProgress: Math.max(0, xp - currentLevelXp) };
    };

    const calculateMaxMana = (player) => {
        const level = getLevelInfo(player.xp).level;
        const baseCasterPoints = level * 6 + 2;
        const intScore = player.int || 10;
        const wisScore = player.wis || 10;
        const chaScore = player.cha || 10;
        const intMultiplier = Math.max(0, (intScore - 10) / 10);
        const wisMultiplier = Math.max(0, (wisScore - 10) / 20);
        const chaMultiplier = Math.max(0, (chaScore - 10) / 20);
        const totalBonusMult = 1 + intMultiplier + wisMultiplier + chaMultiplier;
        const calculated = Math.floor(baseCasterPoints * totalBonusMult);
        return Math.max(0, calculated + (player.manaModifier || 0));
    };

    const calculateSpellCost = (spellLevel) => {
        let cost = 4 + Math.pow(spellLevel, 2.1);
        if (spellLevel >= 5) {
            cost += Math.pow(spellLevel, 2.25);
        }
        return Math.floor(cost);
    };

    const applyDamageOrHeal = (id, isEnemy = false) => {
        const amount = parseInt(damageAmount);
        if (isNaN(amount) || amount === 0) { 
            setDamageModalId(null); 
            setDamageAmount(''); 
            setIsTempHpCheckboxChecked(false);
            return; 
        }

        if (isEnemy) {
            setEnemies(prev => prev.map(e => {
                if (e.id !== id) return e;
                const newHp = Math.min(e.hpMax, e.hp - amount);
                return { ...e, hp: newHp };
            }));
            setDamageModalId(null);
            setDamageAmount('');
            return;
        }

        const player = data.find(p => p.id === id);
        if (!player) return;

        let newHP = player.hpCurrent;
        let newHpTemp = player.hpTemp || 0;
        let newUlt = player.ultCurrent;

        if (isTempHpCheckboxChecked) {
            newHpTemp = Math.max(newHpTemp, Math.abs(amount));
        } else {
            if (amount > 0) {
                let remainingDamage = amount;
                if (newHpTemp > 0) {
                    const absorbed = Math.min(newHpTemp, remainingDamage);
                    newHpTemp -= absorbed;
                    remainingDamage -= absorbed;
                }
                newHP = Math.max(0, player.hpCurrent - remainingDamage);
                const actualDamageTaken = player.hpCurrent - newHP;
                if (actualDamageTaken > 0) {
                    const conMod = calculateModifier(player.con);
                    const damageMultiplier = Math.max(0.6, Math.min(1.5, 1.35 - 0.15 * conMod));
                    const limitBreakMaxDamage = calculateMaxHP(player) * damageMultiplier;
                    const points = (actualDamageTaken / limitBreakMaxDamage) * player.ultMax;
                    newUlt = Math.min(player.ultMax, player.ultCurrent + points);
                }
            } else {
                newHP = Math.min(calculateMaxHP(player), player.hpCurrent + Math.abs(amount));
            }
        }

        const updated = data.map(p => {
            if (p.id === id) return { ...p, hpCurrent: newHP, hpTemp: newHpTemp, ultCurrent: newUlt };
            return p;
        });
        updateData(updated);
        setDamageModalId(null);
        setDamageAmount('');
        setIsTempHpCheckboxChecked(false);
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
        const updated = data.map(p => p.inParty ? { ...p, hpCurrent: Math.min(calculateMaxHP(p), p.hpCurrent + Math.floor(calculateMaxHP(p) * 0.5)) } : p);
        updateData(updated);
    };

    const longRest = () => {
        const updated = data.map(p => p.inParty ? { ...p, hpCurrent: calculateMaxHP(p), manaCurrent: calculateMaxMana(p) } : p);
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

    const calculateColor = (current, max) => {
        const ratio = Math.max(0, Math.min(1, current / max)) || 0;
        const hue = ratio * 120;
        return `hsl(${hue}, 80%, 50%)`;
    };

    const calculateSkillBonus = (player, stat, skillName) => {
        const mod = calculateModifier(effectiveStat(player, stat));
        const profBonus = getLevelInfo(player.xp).level >= 17 ? 6 : Math.ceil(getLevelInfo(player.xp).level / 4) + 1;
        const isProficient = player.skills && player.skills[skillName];
        return mod + (isProficient ? profBonus : 0);
    };

    const dndSkills = [
        { name: 'Acrobatics', stat: 'dex' }, { name: 'Animal Handling', stat: 'wis' },
        { name: 'Arcana', stat: 'int' }, { name: 'Athletics', stat: 'str' },
        { name: 'Deception', stat: 'cha' }, { name: 'History', stat: 'int' },
        { name: 'Insight', stat: 'wis' }, { name: 'Intimidation', stat: 'cha' },
        { name: 'Investigation', stat: 'int' }, { name: 'Medicine', stat: 'wis' },
        { name: 'Nature', stat: 'int' }, { name: 'Perception', stat: 'wis' },
        { name: 'Performance', stat: 'cha' }, { name: 'Persuasion', stat: 'cha' },
        { name: 'Religion', stat: 'int' }, { name: 'Sleight of Hand', stat: 'dex' },
        { name: 'Stealth', stat: 'dex' }, { name: 'Survival', stat: 'wis' }
    ];

    const toggleSkill = (playerId, skillName) => {
        const player = data.find(p => p.id === playerId);
        const currentSkills = player.skills || {};
        updatePlayer(playerId, 'skills', { ...currentSkills, [skillName]: !currentSkills[skillName] });
    };

    const statsList = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    const [castModalId, setCastModalId] = useState(null);
    const [spellLevel, setSpellLevel] = useState('');

    const [xpModalId, setXpModalId] = useState(null);
    const [xpModalType, setXpModalType] = useState('flat');
    const [xpInputValue, setXpInputValue] = useState('');

    const applySpellCast = (playerId) => {
        const player = data.find(p => p.id === playerId);
        if (!player) return;

        if (spellLevel === '') { alert('Please enter a spell level.'); return; }
        const lvl = parseInt(spellLevel);
        if (isNaN(lvl)) { alert('Please enter a valid number.'); return; }

        let newMana = player.manaCurrent;
        if (lvl > 0) {
            const baseCost = calculateSpellCost(lvl);
            const multiplier = 1 + (player.manaExhaustion || 0);
            const totalCost = Math.floor(baseCost * multiplier);
            const maxMana = calculateMaxMana(player);

            if (totalCost > maxMana * 0.5) {
                // Cannot Cast
                return;
            }

            newMana = player.manaCurrent - totalCost;
        } else if (lvl < 0) {
            const maxMana = calculateMaxMana(player);
            const restoreAmount = calculateSpellCost(Math.abs(lvl));
            newMana = Math.min(maxMana, player.manaCurrent + restoreAmount);
        }

        const updated = data.map(p => {
            if (p.id === playerId) {
                return { ...p, manaCurrent: newMana };
            }
            return p;
        });
        updateData(updated);
        setCastModalId(null);
        setSpellLevel('');
    };

    return (
        <div className="player-manager">
            {partyXpModalOpen && (
                <div className="global-modal-overlay" onClick={() => setPartyXpModalOpen(false)}>
                    <div className="damage-heal-popup glass-panel" onClick={e => e.stopPropagation()}>
                        <h3>Distribute Party EXP</h3>
                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Applies to active (⚔️) members only.
                        </p>
                        <input
                            type="number"
                            className="input global-dh-input"
                            value={partyXpAmount}
                            ref={focusAndSelectRef}
                            onChange={(e) => setPartyXpAmount(e.target.value)}
                            onWheel={(e) => {
                                e.preventDefault();
                                const dir = Math.sign(e.deltaY) * -1;
                                setPartyXpAmount(prev => (parseInt(prev) || 0) + dir);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'w' || e.key === 'ArrowUp') setPartyXpAmount(prev => (parseInt(prev) || 0) + 1);
                                if (e.key === 's' || e.key === 'ArrowDown') setPartyXpAmount(prev => (parseInt(prev) || 0) - 1);
                            }}
                            placeholder="0"
                        />
                        <div className="popup-actions" style={{ flexDirection: 'column' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" onClick={() => givePartyXP('flat')}>Give Flat XP</button>
                                <button className="btn btn-secondary" onClick={() => givePartyXP('percent')}>Give XP %</button>
                            </div>
                            <button className="btn btn-success" onClick={() => givePartyXP('levelup')}>🏆 Instant Level Up</button>
                            <button className="btn" onClick={() => setPartyXpModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="manager-header global-party-header">
                <div className="header-left">
                    <h2>{battleMode ? '⚔️ Battle' : 'Party Roster'}</h2>
                </div>
                <div className="manager-actions">
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                            const isAnyPlayerExpanded = data.some(p => !isPlayerMinimized(p.id));
                            const isAnyEnemyExpanded = battleMode ? enemies.some(e => !minimizedEnemies[e.id]) : false;
                            const isAnyExpanded = isAnyPlayerExpanded || isAnyEnemyExpanded;
                            
                            const newMinPlayers = {};
                            data.forEach(p => { newMinPlayers[p.id] = isAnyExpanded; });
                            setMinimizedPlayers(newMinPlayers);

                            if (battleMode) {
                                const newMinEnemies = {};
                                enemies.forEach(e => { newMinEnemies[e.id] = isAnyExpanded; });
                                setMinimizedEnemies(newMinEnemies);
                            }
                        }} 
                        title={(data.some(p => !isPlayerMinimized(p.id)) || (battleMode && enemies.some(e => !minimizedEnemies[e.id]))) ? "Minimize All Cards" : "Expand All Cards"}
                        style={{ fontSize: '1.2rem', paddingBottom: '2px', paddingLeft: '0.75rem', paddingRight: '0.75rem', marginRight: '0.25rem' }}
                    >
                        {(data.some(p => !isPlayerMinimized(p.id)) || (battleMode && enemies.some(e => !minimizedEnemies[e.id]))) ? '－' : '＋'}
                    </button>
                    {!battleMode && <button className="btn btn-secondary party-top-btn" onClick={() => setPartyXpModalOpen(true)}>✨ Party XP</button>}
                    {!battleMode && <button className="btn btn-primary" onClick={shortRest}>☕ Short Rest</button>}
                    {!battleMode && <button className="btn btn-primary" onClick={longRest}>🏕️ Long Rest</button>}
                    {!battleMode && <button className="btn" onClick={addPlayer}>+ Add Player</button>}
                    {battleMode && (
                        <button
                            className={`btn ${isVttOpen ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setIsVttOpen(prev => !prev)}
                            style={{ marginRight: '0.25rem' }}
                        >
                            {isVttOpen ? '🗺️ Hide VTT' : '🗺️ Show VTT'}
                        </button>
                    )}
                    <button
                        className={`btn ${battleMode ? 'btn-secondary' : 'btn-fight'}`}
                        onClick={() => {
                            setBattleMode(b => !b);
                            if (!battleMode) {
                                const newMin = { ...minimizedPlayers };
                                data.forEach(p => { if (p.inParty) newMin[p.id] = true; });
                                setMinimizedPlayers(newMin);
                                const newMinEnemies = {};
                                enemies.forEach(e => { newMinEnemies[e.id] = true; });
                                setMinimizedEnemies(newMinEnemies);
                            } else {
                                setMinimizedPlayers({});
                                setMinimizedEnemies({});
                                setEnemies([]);
                            }
                        }}
                    >
                        {battleMode ? '🏳️ End Fight' : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1em', height: '1em', display: 'inline', marginRight: '0.3em', verticalAlign: 'middle' }}>
                                    <path d="M3 3l5 5M16 3l5 5-8 8-5-5z" />
                                    <path d="M8 16l-5 5M21 21l-5-5" />
                                </svg>
                                Fight!
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className={`battle-arena ${battleMode ? 'active' : ''} ${isVttActive ? 'vtt-open' : ''}`}>
                <div className={battleMode ? 'battle-party-col' : ''}>
                    {battleMode && (
                        <div className="battle-enemy-panel-header">
                            <h3 className="battle-col-title" style={{ color: '#60a5fa' }}>⚔️ Party</h3>
                        </div>
                    )}
                    <div className={`roster-grid ${battleMode ? 'battle-mode-roster' : ''}`}>
                    {data.map(player => {
                        const ultPercent = Math.min(100, (player.ultCurrent / player.ultMax) * 100);
                        const { spriteName, spriteState } = getPlayerSpriteInfo(player);

                        return (
                            <div key={player.id} data-player-id={player.id} className={`glass-panel integrated-player-card ${!player.inParty ? 'inactive' : ''} ${isPlayerMinimized(player.id) ? 'minimized-card' : ''}`}>
                                <div className="player-card-header">
                                    <div className="player-info-container">
                                        <div className={`player-sprite-container sprite-state-${spriteState}`} title={`State: ${spriteState.toUpperCase()}`}>
                                            <img src={`./sprites/${spriteName}.png`} alt={player.classType} className="player-sprite-img" />
                                            {spriteState === 'winded' && <span className="sweat-drop-overlay">💦</span>}
                                        </div>
                                        <div className="player-info">
                                            {editingId === player.id ? (
                                                <input
                                                    className="input title-input"
                                                    value={player.name}
                                                    onChange={e => updatePlayer(player.id, 'name', e.target.value)}
                                                    onBlur={() => setEditingId(null)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <h3 onClick={() => setEditingId(player.id)}>{player.name}</h3>
                                            )}

                                            <div className="player-subtitle">
                                                <select
                                                    className="input inline-input class-input class-dropdown"
                                                    value={player.classType || 'Default'}
                                                    onChange={e => updatePlayer(player.id, 'classType', e.target.value)}
                                                >
                                                    {['Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Default'].map(cls => (
                                                        <option key={cls} value={cls}>{cls}</option>
                                                    ))}
                                                </select>
                                                <span>Lv. {getLevelInfo(player.xp).level}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Crowd Control Badges & Add Button */}
                                    <div className="player-cc-container" onClick={e => e.stopPropagation()}>
                                        {(player.cc || []).map(cc => (
                                            <button
                                                key={cc}
                                                className="player-cc-badge"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeCc(player.id, cc);
                                                }}
                                                title={`Click to cleanse ${cc}`}
                                            >
                                                {cc} <span className="cleanse-x">×</span>
                                            </button>
                                        ))}
                                        <div className="player-cc-add-dropdown">
                                            <button
                                                className="player-cc-add-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCcDropdownPlayerId(ccDropdownPlayerId === player.id ? null : player.id);
                                                }}
                                                title="Add Crowd Control effect"
                                            >
                                                +
                                            </button>
                                            {ccDropdownPlayerId === player.id && (
                                                <div className="cc-dropdown-menu">
                                                    {ALL_CC_EFFECTS.map(effect => {
                                                        const hasCc = (player.cc || []).includes(effect);
                                                        return (
                                                            <button
                                                                key={effect}
                                                                disabled={hasCc}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addCc(player.id, effect);
                                                                    setCcDropdownPlayerId(null);
                                                                }}
                                                                className="cc-dropdown-item"
                                                            >
                                                                {effect}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-top-right">
                                        <div className="armor-class-badge" title="Armor Class (AC)">
                                            🛡️ {player.ac}
                                        </div>
                                        <div className="player-controls">
                                            <button
                                                className={`party-toggle ${player.inParty ? 'in-party' : 'out-party'}`}
                                                onClick={() => toggleParty(player.id)}
                                                title={player.inParty ? "In Active Party" : "Benched"}
                                            >
                                                {player.inParty ? '⚔️' : '💤'}
                                            </button>
                                            <button className="delete-btn" onClick={() => removePlayer(player.id)}>×</button>
                                        </div>
                                    </div>
                                </div>



                                <div className="stats-grid">
                                    <div className={`stat-block ${player.hpCurrent <= 0 ? 'ko-state' : ''}`}>
                                        <div className="stat-label">
                                            <span>{player.hpCurrent <= 0 ? 'STATUS: K.O.' : 'HP'}</span>
                                            <span>
                                                {playerEditField?.id === player.id && playerEditField?.field === 'hpCurrent' ? (
                                                    <input
                                                        type="number"
                                                        className="player-inline-edit-input"
                                                        value={playerEditValue}
                                                        ref={focusAndSelectRef}
                                                        onChange={e => setPlayerEditValue(e.target.value)}
                                                        onBlur={() => commitPlayerEdit(player)}
                                                        onKeyDown={e => { if (e.key === 'Enter') commitPlayerEdit(player); if (e.key === 'Escape') cancelPlayerEdit(); }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span
                                                        className="player-stat-clickable"
                                                        title="Double-click to edit HP"
                                                        onDoubleClick={() => startPlayerEdit(player, 'hpCurrent')}
                                                    >{player.hpCurrent}</span>
                                                )}
                                                {player.hpTemp > 0 && (
                                                    <span className="temp-hp-label" style={{ color: '#60a5fa', marginLeft: '0.25rem', fontWeight: 'bold' }}>
                                                        (+{player.hpTemp})
                                                    </span>
                                                )}
                                                &nbsp;/ {calculateMaxHP(player)}
                                            </span>
                                        </div>
                                        <div className="stat-bar-bg">
                                            <div
                                                className="stat-bar-fill"
                                                style={{
                                                    width: `${Math.max(0, (player.hpCurrent / calculateMaxHP(player)) * 100)}%`,
                                                    background: player.hpCurrent <= 0 ? '#dc2626' : calculateColor(player.hpCurrent, calculateMaxHP(player))
                                                }}
                                            />
                                            {player.hpTemp > 0 && (
                                                <div
                                                    className="temp-hp-fill"
                                                    style={{
                                                        width: `${Math.min(100, (player.hpTemp / calculateMaxHP(player)) * 100)}%`
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className={`stat-block ${player.manaCurrent < 0 ? 'exhausted-state' : ''}`}>
                                        <div className="stat-label">
                                            <span>{player.manaCurrent < 0 ? 'EXHAUSTED' : 'Mana'}</span>
                                            <span>
                                                {playerEditField?.id === player.id && playerEditField?.field === 'manaCurrent' ? (
                                                    <input
                                                        type="number"
                                                        className="player-inline-edit-input"
                                                        value={playerEditValue}
                                                        ref={focusAndSelectRef}
                                                        onChange={e => setPlayerEditValue(e.target.value)}
                                                        onBlur={() => commitPlayerEdit(player)}
                                                        onKeyDown={e => { if (e.key === 'Enter') commitPlayerEdit(player); if (e.key === 'Escape') cancelPlayerEdit(); }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span
                                                        className="player-stat-clickable"
                                                        title="Double-click to edit Mana"
                                                        onDoubleClick={() => startPlayerEdit(player, 'manaCurrent')}
                                                    >{player.manaCurrent}</span>
                                                )}
                                                &nbsp;/ {calculateMaxMana(player)}
                                            </span>
                                        </div>
                                        <div className="stat-bar-bg">
                                            <div
                                                className="stat-bar-fill mana-fill"
                                                style={{ width: `${Math.max(0, (player.manaCurrent / calculateMaxMana(player)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className={`stat-block ${player.ultCurrent >= player.ultMax ? 'limit-ready-state' : ''}`}>
                                        <div className="stat-label">
                                            <span>{player.ultCurrent >= player.ultMax ? 'LIMIT BREAK READY' : 'Ultimate'}</span>
                                            <span>
                                                {playerEditField?.id === player.id && playerEditField?.field === 'ultCurrent' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                        <input
                                                            type="number"
                                                            className="player-inline-edit-input"
                                                            value={playerEditValue}
                                                            ref={focusAndSelectRef}
                                                            onChange={e => setPlayerEditValue(e.target.value)}
                                                            onBlur={() => commitPlayerEdit(player)}
                                                            onKeyDown={e => { if (e.key === 'Enter') commitPlayerEdit(player); if (e.key === 'Escape') cancelPlayerEdit(); }}
                                                            onClick={e => e.stopPropagation()}
                                                        />%
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="player-stat-clickable"
                                                        title="Double-click to edit Ultimate"
                                                        onDoubleClick={() => startPlayerEdit(player, 'ultCurrent')}
                                                    >{Math.floor((player.ultCurrent / player.ultMax) * 100)}%</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="stat-bar-bg ult-bg">
                                            <div
                                                className={`stat-bar-fill ult-fill ${player.ultCurrent >= player.ultMax ? 'limit-ready' : ''}`}
                                                style={{ width: `${ultPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="stat-controls hp-layout">
                                        <button className="dh-trigger-btn" onClick={() => setDamageModalId(player.id)}>Damage / Heal</button>
                                        <button className="dh-trigger-btn cast-btn" onClick={() => setCastModalId(player.id)}>Cast Spell</button>
                                        <button
                                            className="ult-use-btn"
                                            onClick={() => updatePlayer(player.id, 'ultCurrent', 0)}
                                            disabled={player.ultCurrent < player.ultMax}
                                            style={{ opacity: player.ultCurrent < player.ultMax ? 0.5 : 1 }}
                                        >
                                            Limit Break
                                        </button>
                                    </div>

                                    {castModalId === player.id && (() => {
                                        const lvl = parseInt(spellLevel) || 0;
                                        let isCannotCast = false;
                                        if (lvl > 0) {
                                            const baseCost = calculateSpellCost(lvl);
                                            const multiplier = 1 + (player.manaExhaustion || 0);
                                            const totalCost = Math.floor(baseCost * multiplier);
                                            const maxMana = calculateMaxMana(player);
                                            if (totalCost > maxMana * 0.5) {
                                                isCannotCast = true;
                                            }
                                        }

                                        const getSpellBtnLabel = () => {
                                            if (isCannotCast) return 'Cannot Cast';
                                            if (spellLevel === '') return 'Cast';
                                            if (lvl > 0) {
                                                const baseCost = calculateSpellCost(lvl);
                                                const multiplier = 1 + (player.manaExhaustion || 0);
                                                const totalCost = Math.floor(baseCost * multiplier);
                                                return `Cast (-${totalCost})`;
                                            } else if (lvl === 0) {
                                                return 'Cast (0)';
                                            } else {
                                                const restoreAmount = calculateSpellCost(Math.abs(lvl));
                                                return `Restore (+${restoreAmount})`;
                                            }
                                        };

                                        return (
                                            <div className="damage-heal-modal" style={{ marginTop: '0.25rem' }}>
                                                <input
                                                    type="number"
                                                    className="input dh-input cast-spell-input"
                                                    value={spellLevel}
                                                    ref={focusAndSelectRef}
                                                    onChange={e => setSpellLevel(e.target.value)}
                                                    onWheel={(e) => {
                                                        e.preventDefault();
                                                        const dir = Math.sign(e.deltaY) * -1;
                                                        setSpellLevel(prev => String((parseInt(prev) || 0) + dir));
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'w' || e.key === 'ArrowUp') setSpellLevel(prev => String((parseInt(prev) || 0) + 1));
                                                        if (e.key === 's' || e.key === 'ArrowDown') setSpellLevel(prev => String((parseInt(prev) || 0) - 1));
                                                        if (e.key === 'Enter') {
                                                            if (!isCannotCast) applySpellCast(player.id);
                                                        }
                                                    }}
                                                    placeholder="Level (e.g. 1-9, or -X)"
                                                />
                                                <button 
                                                    className="btn btn-primary small-btn" 
                                                    onClick={() => {
                                                        if (!isCannotCast) applySpellCast(player.id);
                                                    }}
                                                    disabled={isCannotCast}
                                                    style={isCannotCast ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                                >
                                                    {getSpellBtnLabel()}
                                                </button>
                                                <button className="btn small-btn" onClick={() => { setCastModalId(null); setSpellLevel(''); }}>Cancel</button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {!isPlayerMinimized(player.id) && (
                                    <div className="player-details-extended">
                                        {!battleMode && (
                                            <div className="stat-block mt-2">
                                                <div className="stat-label">
                                                    <span>EXP to Level {getLevelInfo(player.xp).level + 1}</span>
                                                    <span>{player.xp} / {getLevelInfo(player.xp).nextLevelXp || "Max"}</span>
                                                </div>
                                                <div className="stat-bar-bg xp-bg">
                                                    <div
                                                        className="stat-bar-fill xp-fill"
                                                        style={{
                                                            width: `${getLevelInfo(player.xp).nextLevelXp ? ((player.xp - getLevelInfo(player.xp).currentLevelXp) / (getLevelInfo(player.xp).nextLevelXp - getLevelInfo(player.xp).currentLevelXp)) * 100 : 100}%`
                                                        }}
                                                    />
                                                </div>
                                                <div className="stat-controls exp-controls">
                                                    <button onClick={() => {
                                                        setXpModalId(player.id);
                                                        setXpModalType('flat');
                                                        setXpInputValue('');
                                                    }}>Give XP</button>
                                                    <button onClick={() => {
                                                        setXpModalId(player.id);
                                                        setXpModalType('pct');
                                                        setXpInputValue('');
                                                    }}>Give XP %</button>
                                                    <button className="btn-success" onClick={() => {
                                                        const info = getLevelInfo(player.xp);
                                                        if (info.nextLevelXp) updatePlayer(player.id, 'xp', info.nextLevelXp);
                                                    }}>Level Up</button>
                                                </div>

                                                {xpModalId === player.id && (
                                                    <div className="damage-heal-modal" style={{ marginTop: '0.25rem' }}>
                                                        <input
                                                            type="number"
                                                            className="input dh-input"
                                                            value={xpInputValue}
                                                            onChange={e => setXpInputValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = parseInt(xpInputValue);
                                                                    if (isNaN(val)) { setXpModalId(null); return; }
                                                                    if (xpModalType === 'flat') {
                                                                        updatePlayer(player.id, 'xp', Math.max(0, player.xp + val));
                                                                    } else {
                                                                        const info = getLevelInfo(player.xp);
                                                                        if (info.nextLevelXp) {
                                                                            const req = info.nextLevelXp - info.currentLevelXp;
                                                                            updatePlayer(player.id, 'xp', Math.max(0, player.xp + Math.floor(req * (val / 100))));
                                                                        }
                                                                    }
                                                                    setXpModalId(null);
                                                                    setXpInputValue('');
                                                                }
                                                                if (e.key === 'Escape') { setXpModalId(null); setXpInputValue(''); }
                                                            }}
                                                            placeholder={xpModalType === 'flat' ? 'Flat XP (neg to remove)' : 'XP % (e.g. 10, -10)'}
                                                            autoFocus
                                                        />
                                                        <button className="btn btn-primary small-btn" onClick={() => {
                                                            const val = parseInt(xpInputValue);
                                                            if (isNaN(val)) { setXpModalId(null); return; }
                                                            if (xpModalType === 'flat') {
                                                                updatePlayer(player.id, 'xp', Math.max(0, player.xp + val));
                                                            } else {
                                                                const info = getLevelInfo(player.xp);
                                                                if (info.nextLevelXp) {
                                                                    const req = info.nextLevelXp - info.currentLevelXp;
                                                                    updatePlayer(player.id, 'xp', Math.max(0, player.xp + Math.floor(req * (val / 100))));
                                                                }
                                                            }
                                                            setXpModalId(null);
                                                            setXpInputValue('');
                                                        }}>Apply</button>
                                                        <button className="btn small-btn" onClick={() => { setXpModalId(null); setXpInputValue(''); }}>Cancel</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="stats-skills-tab">
                                            {statsList.map(stat => {
                                                const bonus = getEquipmentBonus(player.id, stat);
                                                const eff = effectiveStat(player, stat);
                                                const relatedSkills = dndSkills.filter(s => s.stat === stat);
                                                return (
                                                    <div key={stat} className="stat-group">
                                                        <div className="stat-group-header">
                                                            <div 
                                                                className={`skill-checkbox save-checkbox ${player.saves?.[stat] ? 'proficient' : ''}`}
                                                                onClick={() => toggleSaveProficiency(player.id, stat)}
                                                                title="Toggle Save Proficiency"
                                                            >
                                                                {player.saves?.[stat] && <span className="check-mark">●</span>}
                                                            </div>
                                                            <span className="stat-name">{stat.toUpperCase()}</span>
                                                            <input
                                                                type="number"
                                                                className="stat-score-input"
                                                                value={player[stat] || 10}
                                                                onChange={e => updatePlayer(player.id, stat, parseInt(e.target.value) || 0)}
                                                            />
                                                            <span className="stat-mod-badge">{formatModifier(calculateModifier(eff))}</span>
                                                            {bonus !== 0 && (
                                                                <span className="stat-equip-bonus" style={{ color: bonus > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                                    {bonus > 0 ? '+' : ''}{bonus} equip
                                                                </span>
                                                            )}
                                                            <div className="stat-save-display">
                                                                <span className="stat-save-display-label">Save</span>
                                                                <span style={{ color: player.saves?.[stat] ? 'var(--primary)' : 'var(--text-primary)' }}>
                                                                    {formatModifier(calculateModifier(eff) + (player.saves?.[stat] ? getProficiencyBonus(player) : 0))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {relatedSkills.length > 0 && (
                                                            <div className="stat-group-skills">
                                                                {relatedSkills.map(skill => {
                                                                    const skillBonus = calculateSkillBonus(player, skill.stat, skill.name);
                                                                    const isProficient = player.skills && player.skills[skill.name];
                                                                    return (
                                                                        <div key={skill.name} className={`skill-row ${isProficient ? 'proficient' : ''}`} onClick={() => toggleSkill(player.id, skill.name)}>
                                                                            <div className="skill-checkbox">
                                                                                {isProficient && <span className="check-mark">●</span>}
                                                                            </div>
                                                                            <div className="skill-bonus">
                                                                                {skillBonus >= 0 ? '+' : ''}{skillBonus}
                                                                            </div>
                                                                            <div className="skill-name">{skill.name}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            <div className="rp-field full-width stats-skills-features">
                                                <label>Features & Traits</label>
                                                <textarea
                                                    className="input rp-textarea mini-textarea"
                                                    value={player.features || ''}
                                                    onChange={e => updatePlayer(player.id, 'features', e.target.value)}
                                                    placeholder="List notable feats, darkvision..."
                                                />
                                            </div>

                                            {/* Resistances & Vulnerabilities Editor */}
                                            <div className="rp-field full-width player-resistances-section">
                                                <label>Resistances & Vulnerabilities</label>
                                                <div className="damage-mods-container">
                                                    {/* Resistances */}
                                                    <div className="damage-mod-row">
                                                        <span className="damage-mod-type-label res-lbl">Resistances (1/2 dmg)</span>
                                                        <div className="damage-mod-pills">
                                                            {(player.resistances || []).map(r => (
                                                                <span key={r} className="damage-pill pill-resistance">
                                                                    {r}
                                                                    <button type="button" className="pill-remove-btn" onClick={() => {
                                                                        const updated = (player.resistances || []).filter(x => x !== r);
                                                                        updatePlayer(player.id, 'resistances', updated);
                                                                    }}>×</button>
                                                                </span>
                                                            ))}
                                                            <select
                                                                className="input pill-select-add"
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val && !(player.resistances || []).includes(val)) {
                                                                        const updated = [...(player.resistances || []), val];
                                                                        updatePlayer(player.id, 'resistances', updated);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">+ Add</option>
                                                                {DAMAGE_TYPES.filter(t => !(player.resistances || []).includes(t)).map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Immunities */}
                                                    <div className="damage-mod-row">
                                                        <span className="damage-mod-type-label imm-lbl">Immunities (0 dmg)</span>
                                                        <div className="damage-mod-pills">
                                                            {(player.immunities || []).map(i => (
                                                                <span key={i} className="damage-pill pill-immunity">
                                                                    {i}
                                                                    <button type="button" className="pill-remove-btn" onClick={() => {
                                                                        const updated = (player.immunities || []).filter(x => x !== i);
                                                                        updatePlayer(player.id, 'immunities', updated);
                                                                    }}>×</button>
                                                                </span>
                                                            ))}
                                                            <select
                                                                className="input pill-select-add"
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val && !(player.immunities || []).includes(val)) {
                                                                        const updated = [...(player.immunities || []), val];
                                                                        updatePlayer(player.id, 'immunities', updated);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">+ Add</option>
                                                                {DAMAGE_TYPES.filter(t => !(player.immunities || []).includes(t)).map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Vulnerabilities */}
                                                    <div className="damage-mod-row">
                                                        <span className="damage-mod-type-label vul-lbl">Vulnerabilities (2x dmg)</span>
                                                        <div className="damage-mod-pills">
                                                            {(player.vulnerabilities || []).map(v => (
                                                                <span key={v} className="damage-pill pill-vulnerability">
                                                                    {v}
                                                                    <button type="button" className="pill-remove-btn" onClick={() => {
                                                                        const updated = (player.vulnerabilities || []).filter(x => x !== v);
                                                                        updatePlayer(player.id, 'vulnerabilities', updated);
                                                                    }}>×</button>
                                                                </span>
                                                            ))}
                                                            <select
                                                                className="input pill-select-add"
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val && !(player.vulnerabilities || []).includes(val)) {
                                                                        const updated = [...(player.vulnerabilities || []), val];
                                                                        updatePlayer(player.id, 'vulnerabilities', updated);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">+ Add</option>
                                                                {DAMAGE_TYPES.filter(t => !(player.vulnerabilities || []).includes(t)).map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="combat-tab-content integrated-combat">
                                            <div className="combat-stats-row mini-combat-row">
                                                <div className="combat-stat-box">
                                                    <label>AC</label>
                                                    <input
                                                        type="number"
                                                        className="input combat-input"
                                                        value={player.ac}
                                                        onChange={e => updatePlayer(player.id, 'ac', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="combat-stat-box">
                                                    <label>Base HP</label>
                                                    <input
                                                        type="number"
                                                        className="input combat-input"
                                                        value={player.hpBase}
                                                        onChange={e => updatePlayer(player.id, 'hpBase', Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                                                        +{calculateModifier(player.con) * getLevelInfo(player.xp).level} CON = {calculateMaxHP(player)} Max HP
                                                    </div>
                                                </div>
                                                <div className="combat-stat-box">
                                                    <label>Mana Mod</label>
                                                    <input
                                                        type="number"
                                                        className="input combat-input"
                                                        value={player.manaModifier || 0}
                                                        onChange={e => updatePlayer(player.id, 'manaModifier', parseInt(e.target.value) || 0)}
                                                        onWheel={e => {
                                                            e.preventDefault();
                                                            updatePlayer(player.id, 'manaModifier', (player.manaModifier || 0) + Math.sign(e.deltaY) * -1);
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'ArrowUp') { e.preventDefault(); updatePlayer(player.id, 'manaModifier', (player.manaModifier || 0) + 1); }
                                                            if (e.key === 'ArrowDown') { e.preventDefault(); updatePlayer(player.id, 'manaModifier', (player.manaModifier || 0) - 1); }
                                                        }}
                                                    />
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scroll to adjust</div>
                                                </div>
                                                <div className="combat-stat-box">
                                                    <label>Max Mana</label>
                                                    <div className="combat-input calculated-stat">{calculateMaxMana(player)}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto Calc.</div>
                                                </div>
                                            </div>

                                            <div className="starve-row" style={{ marginTop: '0.5rem' }}>
                                                <div className="starve-control" title="MP Starve: Each stack increases spell costs by 100%. Adjust manually.">
                                                    <button
                                                        className="starve-adj-btn"
                                                        onClick={() => updatePlayer(player.id, 'manaExhaustion', Math.max(0, (player.manaExhaustion || 0) - 1))}
                                                    >－</button>
                                                    <span className={`starve-label ${player.manaExhaustion > 0 ? 'active' : ''}`}>
                                                        Starve [{player.manaExhaustion || 0}]
                                                    </span>
                                                    <button
                                                        className="starve-adj-btn"
                                                        onClick={() => updatePlayer(player.id, 'manaExhaustion', (player.manaExhaustion || 0) + 1)}
                                                    >＋</button>
                                                </div>
                                            </div>

                                            <div className="carrying-capacity mini-capacity">
                                                <h4>Capacity</h4>
                                                <div className="capacity-bar">
                                                    Max Load: {(player.str || 10) * 15} lbs <br />
                                                    Push/Drag/Lift: {(player.str || 10) * 30} lbs
                                                </div>
                                            </div>

                                            <div className="rp-field">
                                                <label>Background / Race / Alignment</label>
                                                <input
                                                    className="input"
                                                    value={player.background || ''}
                                                    onChange={e => updatePlayer(player.id, 'background', e.target.value)}
                                                    placeholder="e.g. Human Fighter, Acolyte, LG"
                                                />
                                            </div>

                                            <div className="xp-section mini-xp">
                                                <label>EXP</label>
                                                <input
                                                    type="number"
                                                    className="input xp-input"
                                                    value={player.xp || 0}
                                                    onChange={e => updatePlayer(player.id, 'xp', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    </div>
                </div>

                {battleMode && isVttOpen && (
                    <div className="battle-vtt-column">
                        <div className="vtt-embedded-panel glass-panel">
                            <div className="vtt-toolbar">
                                <div className="vtt-toolbar-left">
                                    <input 
                                        type="text" 
                                        className="input vtt-url-input" 
                                        placeholder="Enter Room ID (e.g. room-abc) or full URL..." 
                                        value={vttInputVal}
                                        onChange={(e) => setVttInputVal(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleLoadVtt();
                                        }}
                                    />
                                    <button className="btn btn-primary vtt-btn" onClick={handleLoadVtt}>Load</button>
                                    <button className="btn btn-secondary vtt-btn" onClick={handleReloadVtt}>Reload</button>
                                </div>
                                <div className="vtt-toolbar-right">
                                    <button className="btn btn-secondary vtt-btn" onClick={() => setIsVttFullscreen(true)} title="Enter Fullscreen VTT">
                                        🖥️ Fullscreen
                                    </button>
                                    <button className="btn btn-secondary vtt-btn" onClick={handleOpenInBrowser}>
                                        🌐 Open in Browser
                                    </button>
                                </div>
                            </div>
                            <div className="vtt-view-placeholder" ref={vttPlaceholderRef}>
                                {vttLoading && (
                                    <div className="vtt-loading-overlay">
                                        <div className="vtt-spinner"></div>
                                        <span>Loading Owlbear Rodeo...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!battleMode && data.length === 0 && (
                    <div className="empty-state">
                        <p>Your party is empty. Add a player to begin your adventure.</p>
                    </div>
                )}

                {/* ===== ENEMY COLUMN IN BATTLE MODE ===== */}
                {
                    battleMode && (
                        <div className="battle-enemy-panel">
                            <div className="battle-enemy-panel-header">
                                <h3 className="battle-col-title">💀 Enemies</h3>
                                <button className="btn btn-danger small-btn" onClick={addEnemy}>+ Add Enemy</button>
                            </div>

                            {enemies.length === 0 && (
                                <div className="empty-state" style={{ padding: '1rem' }}>
                                    <p style={{ fontSize: '0.85rem' }}>No enemies yet. Add one!</p>
                                </div>
                            )}

                            <div className={`roster-grid ${battleMode ? 'battle-mode-roster' : ''}`}>
                                {enemies.map(enemy => {
                                    // No tabs used, single extended view
                                    const { spriteName, spriteState } = getEnemySpriteInfo(enemy);
                                    return (
                                        <div key={enemy.id} className={`glass-panel integrated-player-card enemy-card ${enemy.hp <= 0 ? 'ko-state' : ''} ${minimizedEnemies[enemy.id] ? 'minimized-card' : ''}`}>

                                            {/* Header */}
                                            <div className="player-card-header">
                                                <div className="player-info-container">
                                                    <div className={`player-sprite-container sprite-state-${spriteState}`} title={`State: ${spriteState.toUpperCase()}`}>
                                                        <img src={`./sprites/${spriteName}.png`} alt={enemy.classType} className="player-sprite-img" />
                                                    </div>
                                                    <div className="player-info">
                                                        {enemy.editing ? (
                                                            <div className="enemy-name-search-container">
                                                                <input 
                                                                    className="input title-input" 
                                                                    value={enemySearchText}
                                                                    onChange={e => setEnemySearchText(e.target.value)}
                                                                    onBlur={() => {
                                                                        setTimeout(() => {
                                                                            updateEnemy(enemy.id, 'name', enemySearchText || enemy.name);
                                                                            updateEnemy(enemy.id, 'editing', false);
                                                                        }, 200);
                                                                    }}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') {
                                                                            updateEnemy(enemy.id, 'name', enemySearchText || enemy.name);
                                                                            updateEnemy(enemy.id, 'editing', false);
                                                                        }
                                                                        if (e.key === 'Escape') {
                                                                            updateEnemy(enemy.id, 'editing', false);
                                                                        }
                                                                    }}
                                                                    autoFocus
                                                                />
                                                                <div className="enemy-search-dropdown">
                                                                    {[...defaultMonsters, ...library]
                                                                        .filter(m => m.name.toLowerCase().includes((enemySearchText || '').toLowerCase()))
                                                                        .slice(0, 10)
                                                                        .map(m => (
                                                                            <div 
                                                                                key={m.id} 
                                                                                className="enemy-search-item"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    selectMonster(enemy.id, m);
                                                                                }}
                                                                            >
                                                                                <span>{m.name}</span>
                                                                                <span className="search-item-type">{m.background || 'Monster'}</span>
                                                                            </div>
                                                                        ))
                                                                    }
                                                                    <div 
                                                                        className="enemy-search-item enemy-search-create-btn"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            createAndSelectMonster(enemy.id, enemySearchText);
                                                                        }}
                                                                    >
                                                                        + Create Bestiary Entry: "{enemySearchText || 'New Monster'}"
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <h3 onClick={() => {
                                                                setEnemySearchText(enemy.name);
                                                                updateEnemy(enemy.id, 'editing', true);
                                                            }}>{enemy.name}</h3>
                                                        )}
                                                        <div className="player-subtitle">
                                                            <select
                                                                className="input inline-input class-input class-dropdown"
                                                                value={enemy.classType || 'Enemy'}
                                                                onChange={e => updateEnemy(enemy.id, 'classType', e.target.value)}
                                                            >
                                                                <option value="Enemy">Enemy</option>
                                                                <option value="Boss">Boss</option>
                                                            </select>
                                                            <span>AC {enemy.ac}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="card-top-right">
                                                    <div
                                                        className={`armor-class-badge enemy-ac-badge ${enemyEditField?.id === enemy.id && enemyEditField?.field === 'ac' ? 'editing' : ''}`}
                                                        title="Click to edit AC"
                                                        onClick={() => { if (!(enemyEditField?.id === enemy.id && enemyEditField?.field === 'ac')) startEnemyEdit(enemy, 'ac'); }}
                                                    >
                                                        {enemyEditField?.id === enemy.id && enemyEditField?.field === 'ac' ? (
                                                            <input
                                                                type="number"
                                                                className="enemy-inline-edit-input"
                                                                value={enemyEditValue}
                                                                ref={focusAndSelectRef}
                                                                onChange={e => setEnemyEditValue(e.target.value)}
                                                                onBlur={() => commitEnemyEdit(enemy)}
                                                                onKeyDown={e => { if (e.key === 'Enter') commitEnemyEdit(enemy); if (e.key === 'Escape') cancelEnemyEdit(); }}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <span className="enemy-ac-display">🛡️ {enemy.ac} <span className="edit-pencil">✏️</span></span>
                                                        )}
                                                    </div>
                                                    <div className="player-controls">
                                                        <button 
                                                            className="party-toggle" 
                                                            onClick={() => copyActiveEnemy(enemy.id)}
                                                            title="Copy/Duplicate Monster"
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            📋
                                                        </button>
                                                        <button className="delete-btn" onClick={() => removeEnemy(enemy.id)}>×</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* MAIN: HP and Ultimate — ALWAYS VISIBLE */}
                                            <div className="stats-grid">
                                                <div className={`stat-block ${enemy.hp <= 0 ? 'ko-state' : ''}`}>
                                                    <div className="stat-label">
                                                        <span>{enemy.hp <= -0.5 * enemy.hpMax ? 'OVERKILL' : (enemy.hp <= 0 ? 'DEFEATED' : 'HP')}</span>
                                                        <span>
                                                            {enemy.hp} /&nbsp;
                                                            {enemyEditField?.id === enemy.id && enemyEditField?.field === 'hpMax' ? (
                                                                <input
                                                                    type="number"
                                                                    className="enemy-inline-edit-input enemy-hpmax-edit"
                                                                    value={enemyEditValue}
                                                                    ref={focusAndSelectRef}
                                                                    onChange={e => setEnemyEditValue(e.target.value)}
                                                                    onBlur={() => commitEnemyEdit(enemy)}
                                                                    onKeyDown={e => { if (e.key === 'Enter') commitEnemyEdit(enemy); if (e.key === 'Escape') cancelEnemyEdit(); }}
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span
                                                                    className="enemy-hpmax-clickable"
                                                                    title="Click to edit Max HP"
                                                                    onClick={() => startEnemyEdit(enemy, 'hpMax')}
                                                                >{enemy.hpMax} <span className="edit-pencil">✏️</span></span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="stat-bar-bg">
                                                        <div className="stat-bar-fill" style={{
                                                            width: `${Math.max(0, (enemy.hp / enemy.hpMax) * 100)}%`,
                                                            background: enemy.hp <= 0 ? '#dc2626' : calculateColor(enemy.hp, enemy.hpMax)
                                                        }} />
                                                    </div>
                                                </div>

                                                {/* Ultimate Bar */}
                                                {enemy.classType === 'Boss' && (() => {
                                                    const bossHpStart = enemy.bossHpStart || enemy.hpMax;
                                                    const damageTaken = Math.max(0, bossHpStart - enemy.hp);
                                                    const rawUltPercent = Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
                                                    const isEnemyLimitReady = rawUltPercent >= 100 && !enemy.limitBreakUsed;
                                                    const enemyUltPercent = enemy.limitBreakUsed ? 0 : Math.max(0, rawUltPercent);
                                                    return (
                                                        <div className={`stat-block ${isEnemyLimitReady ? 'limit-ready-state' : ''}`}>
                                                            <div className="stat-label">
                                                                <span>{isEnemyLimitReady ? 'LIMIT BREAK READY' : 'Ultimate'}</span>
                                                                <span>{enemyUltPercent}%</span>
                                                            </div>
                                                            <div className="stat-bar-bg ult-bg">
                                                                <div
                                                                    className={`stat-bar-fill ult-fill ${isEnemyLimitReady ? 'limit-ready' : ''}`}
                                                                    style={{ width: `${enemyUltPercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                 {/* Action Buttons Row */}
                                                 <div className="stat-controls hp-layout">
                                                     <button className="dh-trigger-btn" onClick={() => { setDamageAmount(''); setDamageModalId(enemy.id); }}>Damage / Heal</button>
                                                     {enemy.classType === 'Boss' && (() => {
                                                         const bossHpStart = enemy.bossHpStart || enemy.hpMax;
                                                         const damageTaken = Math.max(0, bossHpStart - enemy.hp);
                                                         const rawUltPercent = Math.min(100, Math.floor((damageTaken / (bossHpStart * 0.7)) * 100));
                                                         const isEnemyLimitReady = rawUltPercent >= 100 && !enemy.limitBreakUsed;
                                                         return (
                                                             <button
                                                                 className="ult-use-btn"
                                                                 onClick={() => triggerEnemyLimitBreak(enemy.id)}
                                                                 disabled={!isEnemyLimitReady}
                                                                 style={{ opacity: !isEnemyLimitReady ? 0.5 : 1 }}
                                                             >
                                                                 Limit Break
                                                             </button>
                                                         );
                                                     })()}
                                                 </div>

                                                 {/* Skills Section (Always Visible) */}
                                                 <div className="enemy-skills-always-visible" style={{ marginTop: '0.75rem', padding: '0.5rem 0 0 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                                                         ⚔️ Skills
                                                     </div>
                                                     <div className="enemy-skills-buttons-grid" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                         {getEnemyAttacks(enemy).map(attack => (
                                                             <button
                                                                 key={attack.id || attack.name}
                                                                 className="btn btn-secondary enemy-skill-roll-btn"
                                                                 onClick={() => startAttackTargeting(enemy, attack)}
                                                                 style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', flex: '1 1 auto', minWidth: '80px', margin: 0 }}
                                                             >
                                                                 {attack.name}
                                                             </button>
                                                         ))}
                                                         {getEnemyAttacks(enemy).length === 0 && (
                                                             <div className="no-skills-msg" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No attacks found.</div>
                                                         )}
                                                     </div>
                                                 </div>
                                             </div>
                                            {/* BOTTOM PORTION (VISIBLE ONLY WHEN EXPANDED) */}
                                            {!minimizedEnemies[enemy.id] && (
                                                <div className="player-details-extended">
                                                    <div className="rp-field full-width enemy-abilities-field" style={{ marginBottom: '1.25rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>Abilities</label>
                                                        <textarea
                                                            className="input rp-textarea"
                                                            style={{ width: '100%', minHeight: '120px', fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: '1.4', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '6px' }}
                                                            value={enemy.abilities || ''}
                                                            onChange={e => updateEnemy(enemy.id, 'abilities', e.target.value)}
                                                            placeholder="Actions, attacks, multiattacks..."
                                                        />
                                                    </div>
                                                    <div className="stats-skills-tab">
                                                        {statsList.map(stat => {
                                                            const eff = enemy[stat] || 10;
                                                            const mod = calculateModifier(eff);
                                                            const relatedSkills = dndSkills.filter(s => s.stat === stat);
                                                            const isSaveProficient = enemy.saves?.[stat];
                                                            const profBonus = enemy.proficiency !== undefined ? enemy.proficiency : 2;
                                                            const saveBonus = mod + (isSaveProficient ? profBonus : 0);
                                                            return (
                                                                <div key={stat} className="stat-group">
                                                                    <div className="stat-group-header">
                                                                        <div 
                                                                            className={`skill-checkbox save-checkbox ${isSaveProficient ? 'proficient' : ''}`}
                                                                            onClick={() => toggleSaveProficiency(enemy.id, stat, true)}
                                                                            title="Toggle Save Proficiency"
                                                                        >
                                                                            {isSaveProficient && <span className="check-mark">●</span>}
                                                                        </div>
                                                                        <span className="stat-name">{stat.toUpperCase()}</span>
                                                                        <input
                                                                            type="number"
                                                                            className="stat-score-input"
                                                                            value={enemy[stat] || 10}
                                                                            onChange={e => updateEnemy(enemy.id, stat, parseInt(e.target.value) || 0)}
                                                                        />
                                                                        <span className="stat-mod-badge">{formatModifier(mod)}</span>
                                                                        <div className="stat-save-display">
                                                                            <span className="stat-save-display-label">Save</span>
                                                                            <span style={{ color: isSaveProficient ? 'var(--primary)' : 'var(--text-primary)' }}>
                                                                                {formatModifier(saveBonus)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {relatedSkills.length > 0 && (
                                                                        <div className="stat-group-skills">
                                                                            {relatedSkills.map(skill => {
                                                                                const isProficient = enemy.skills && enemy.skills[skill.name];
                                                                                const skillBonus = mod + (isProficient ? profBonus : 0);
                                                                                return (
                                                                                    <div key={skill.name} className={`skill-row ${isProficient ? 'proficient' : ''}`} onClick={() => toggleEnemySkill(enemy.id, skill.name)}>
                                                                                        <div className="skill-checkbox">
                                                                                            {isProficient && <span className="check-mark">●</span>}
                                                                                        </div>
                                                                                        <div className="skill-bonus">
                                                                                            {formatModifier(skillBonus)}
                                                                                        </div>
                                                                                        <div className="skill-name">{skill.name}</div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        <div className="rp-field full-width stats-skills-features">
                                                            <label>Features & Traits</label>
                                                            <textarea
                                                                className="input rp-textarea mini-textarea"
                                                                value={enemy.features || ''}
                                                                onChange={e => updateEnemy(enemy.id, 'features', e.target.value)}
                                                                placeholder="Special traits, immunities, resistances..."
                                                            />
                                                        </div>

                                                        {/* Enemy Resistances & Vulnerabilities Editor */}
                                                        <div className="rp-field full-width player-resistances-section">
                                                            <label>Resistances & Vulnerabilities</label>
                                                            <div className="damage-mods-container">
                                                                {/* Resistances */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label res-lbl">Resistances (1/2 dmg)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.resistances || []).map(r => (
                                                                            <span key={r} className="damage-pill pill-resistance">
                                                                                {r}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.resistances || []).filter(x => x !== r);
                                                                                    updateEnemy(enemy.id, 'resistances', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.resistances || []).includes(val)) {
                                                                                    const updated = [...(enemy.resistances || []), val];
                                                                                    updateEnemy(enemy.id, 'resistances', updated);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">+ Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(enemy.resistances || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Immunities */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label imm-lbl">Immunities (0 dmg)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.immunities || []).map(i => (
                                                                            <span key={i} className="damage-pill pill-immunity">
                                                                                {i}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.immunities || []).filter(x => x !== i);
                                                                                    updateEnemy(enemy.id, 'immunities', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.immunities || []).includes(val)) {
                                                                                    const updated = [...(enemy.immunities || []), val];
                                                                                    updateEnemy(enemy.id, 'immunities', updated);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">+ Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(enemy.immunities || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Vulnerabilities */}
                                                                <div className="damage-mod-row">
                                                                    <span className="damage-mod-type-label vul-lbl">Vulnerabilities (2x dmg)</span>
                                                                    <div className="damage-mod-pills">
                                                                        {(enemy.vulnerabilities || []).map(v => (
                                                                            <span key={v} className="damage-pill pill-vulnerability">
                                                                                {v}
                                                                                <button type="button" className="pill-remove-btn" onClick={() => {
                                                                                    const updated = (enemy.vulnerabilities || []).filter(x => x !== v);
                                                                                    updateEnemy(enemy.id, 'vulnerabilities', updated);
                                                                                }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input pill-select-add"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val && !(enemy.vulnerabilities || []).includes(val)) {
                                                                                    const updated = [...(enemy.vulnerabilities || []), val];
                                                                                    updateEnemy(enemy.id, 'vulnerabilities', updated);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">+ Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(enemy.vulnerabilities || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* COMBAT */}
                                                    <div className="combat-tab-content integrated-combat">
                                                        <div className="combat-stats-row mini-combat-row">
                                                            <div className="combat-stat-box">
                                                                <label>AC</label>
                                                                <input 
                                                                    type="number" 
                                                                    className="input combat-input" 
                                                                    value={enemy.ac}
                                                                    onChange={e => updateEnemy(enemy.id, 'ac', parseInt(e.target.value) || 0)} 
                                                                />
                                                            </div>
                                                            <div className="combat-stat-box">
                                                                <label>Max HP</label>
                                                                <input 
                                                                    type="number" 
                                                                    className="input combat-input" 
                                                                    value={enemy.hpMax}
                                                                    onChange={e => {
                                                                        const v = Math.max(1, parseInt(e.target.value) || 1);
                                                                        setEnemies(prev => prev.map(item => item.id === enemy.id ? { ...item, hpMax: v, hp: Math.min(item.hp, v) } : item));
                                                                    }} 
                                                                />
                                                            </div>
                                                            <div className="combat-stat-box">
                                                                <label>Prof Bonus</label>
                                                                <input 
                                                                    type="number" 
                                                                    className="input combat-input" 
                                                                    value={enemy.proficiency !== undefined ? enemy.proficiency : 2}
                                                                    onChange={e => updateEnemy(enemy.id, 'proficiency', parseInt(e.target.value) || 0)} 
                                                                />
                                                            </div>
                                                            <div className="combat-stat-box" style={{ flex: 2 }}>
                                                                <label>Type / CR / Notes</label>
                                                                <input 
                                                                    className="input combat-input" 
                                                                    value={enemy.background || ''}
                                                                    onChange={e => updateEnemy(enemy.id, 'background', e.target.value)}
                                                                    placeholder="e.g. Undead, CR 2, Legendary" 
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="carrying-capacity mini-capacity">
                                                            <h4>Carrying</h4>
                                                            <div className="capacity-bar">
                                                                Max Load: {(enemy.str || 10) * 15} lbs<br />
                                                                Push/Drag: {(enemy.str || 10) * 30} lbs
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
            </div>

            {/* Battle Notes Footer Section */}
            {battleMode && (
                <div className="battle-notes-footer-section">
                    <div className="vtt-notes-panel glass-panel">
                        <h3>Notes & Combat Logs</h3>
                        <textarea 
                            className="input vtt-notes-textarea" 
                            placeholder="Write scratchpad notes, initiative order, encounter descriptions, loot, or status effects..."
                            value={battleNotes}
                            onChange={(e) => setBattleNotes(e.target.value)}
                        />
                    </div>
                </div>
            )}
            {activeAttackState && (() => {
                const { enemy, attack, selectedTargets, rollResults } = activeAttackState;
                const activePlayers = data.filter(p => p.inParty);
                const isSave = typeof attack.dc === 'number' || (attack.dc && !isNaN(parseInt(attack.dc)));

                return (
                    <div className="global-modal-overlay" onClick={() => setActiveAttackState(null)}>
                        <div className="damage-heal-popup attack-resolution-popup glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '90%' }}>
                            <div className="attack-popup-header" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>⚔️ Resolve Attack: {attack.name}</h3>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Used by <strong>{enemy.name}</strong> {isSave ? (
                                        <>• DC: <strong>{attack.dc} {attack.save}</strong></>
                                    ) : (
                                        <>• Modifier: <strong>+{attack.toHit}</strong> to hit</>
                                    )}
                                </p>
                                {attack.description && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic', lineHeight: '1.4', wordBreak: 'break-word', maxHeight: '120px', overflowY: 'auto' }}>
                                        {attack.description}
                                    </div>
                                )}
                                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {attack.reach && <span>Reach: {attack.reach} &nbsp;·&nbsp; </span>}
                                    {attack.range && <span>Range: {attack.range} &nbsp;·&nbsp; </span>}
                                    {attack.damage && attack.damage.length > 0 && <span>Damage: {attack.damage.map(d => `${d.formula} ${d.type}`).join(' + ')} &nbsp;·&nbsp; </span>}
                                    {isSave && <span>Half on save: {attack.halfOnSuccess ? 'Yes' : 'No'}</span>}
                                </div>
                            </div>

                            {!rollResults ? (
                                /* TARGET SELECTION PHASE */
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <h4 style={{ fontSize: '0.95rem', margin: 0, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                            {autoRollEnabled ? 'Select Targets:' : (isSave ? 'Flag Saving Throws:' : 'Flag Attacks:')}
                                        </h4>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={autoRollEnabled} 
                                                onChange={e => setAutoRollEnabled(e.target.checked)} 
                                                style={{ cursor: 'pointer' }}
                                            />
                                            🎲 Auto-Roll in App
                                        </label>
                                    </div>
                                    <div className="targets-checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1.25rem' }}>
                                        {activePlayers.map(player => {
                                             if (autoRollEnabled) {
                                                 const isChecked = !!selectedTargets[player.id];
                                                 return (
                                                     <div
                                                         key={player.id}
                                                         className={`target-checklist-row ${isChecked ? 'selected' : ''}`}
                                                         onClick={() => {
                                                             setActiveAttackState(prev => ({
                                                                 ...prev,
                                                                 selectedTargets: {
                                                                     ...prev.selectedTargets,
                                                                     [player.id]: !prev.selectedTargets[player.id]
                                                                 }
                                                             }));
                                                         }}
                                                         style={{
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             gap: '0.75rem',
                                                             padding: '0.6rem 0.8rem',
                                                             background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                                             border: isChecked ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                             borderRadius: 'var(--radius-sm)',
                                                             cursor: 'pointer',
                                                             transition: 'var(--transition)'
                                                         }}
                                                     >
                                                         <input
                                                             type="checkbox"
                                                             checked={isChecked}
                                                             onChange={() => {}} // Row click handles it
                                                             style={{ cursor: 'pointer' }}
                                                         />
                                                         <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                             <span style={{ fontWeight: '500' }}>{player.name}</span>
                                                             <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                                                 <span style={{ color: 'var(--text-secondary)' }}>🛡️ AC {player.ac}</span>
                                                                 <span style={{ color: player.hpCurrent <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                                                     ❤️ {player.hpCurrent}{player.hpTemp > 0 && (
                                                                          <span style={{ color: '#60a5fa', marginLeft: '0.25rem' }}>
                                                                              (+{player.hpTemp})
                                                                          </span>
                                                                      )} / {calculateMaxHP(player)}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 );
                                             } else {
                                                 const status = selectedTargets[player.id] || 'none';
                                                 const getRowStyles = () => {
                                                     if (status === 'fail') {
                                                         return {
                                                             border: '1px solid rgba(239, 68, 68, 0.4)',
                                                             background: 'rgba(239, 68, 68, 0.08)'
                                                         };
                                                     } else if (status === 'success') {
                                                         return {
                                                             border: '1px solid rgba(16, 185, 129, 0.4)',
                                                             background: 'rgba(16, 185, 129, 0.08)'
                                                         };
                                                     } else {
                                                         return {
                                                             border: '1px solid rgba(255, 255, 255, 0.05)',
                                                             background: 'rgba(255, 255, 255, 0.02)'
                                                         };
                                                     }
                                                 };
                                                 const rowStyles = getRowStyles();
                                                 
                                                 const setTargetStatus = (playerId, newStatus) => {
                                                     setActiveAttackState(prev => ({
                                                         ...prev,
                                                         selectedTargets: {
                                                             ...prev.selectedTargets,
                                                             [playerId]: newStatus
                                                         }
                                                     }));
                                                 };

                                                 return (
                                                     <div
                                                         key={player.id}
                                                         className="target-checklist-row"
                                                         style={{
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'space-between',
                                                             padding: '0.6rem 0.8rem',
                                                             borderRadius: 'var(--radius-sm)',
                                                             cursor: 'default',
                                                             transition: 'var(--transition)',
                                                             ...rowStyles
                                                         }}
                                                     >
                                                         <div>
                                                             <div style={{ fontWeight: '500' }}>{player.name}</div>
                                                             <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                                                 <span style={{ color: 'var(--text-secondary)' }}>🛡️ AC {player.ac}</span>
                                                                 <span style={{ color: player.hpCurrent <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                                                     ❤️ {player.hpCurrent}{player.hpTemp > 0 && (
                                                                          <span style={{ color: '#60a5fa', marginLeft: '0.25rem' }}>
                                                                              (+{player.hpTemp})
                                                                          </span>
                                                                      )} / {calculateMaxHP(player)}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                         
                                                         <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                             <button 
                                                                 className="btn"
                                                                 onClick={() => setTargetStatus(player.id, 'none')}
                                                                 style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: status === 'none' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                             >
                                                                 None
                                                             </button>
                                                             <button 
                                                                 className="btn"
                                                                 onClick={() => setTargetStatus(player.id, 'success')}
                                                                 style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: status === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(0,0,0,0.2)', color: status === 'success' ? 'var(--success)' : 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                             >
                                                                 {isSave ? 'Save 🛡️' : 'Miss 💨'}
                                                             </button>
                                                             <button 
                                                                 className="btn"
                                                                 onClick={() => setTargetStatus(player.id, 'fail')}
                                                                 style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: status === 'fail' ? 'rgba(239,68,68,0.25)' : 'rgba(0,0,0,0.2)', color: status === 'fail' ? 'var(--danger)' : 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                             >
                                                                 {isSave ? 'Fail 💥' : 'Hit 🎯'}
                                                             </button>
                                                         </div>
                                                     </div>
                                                 );
                                             }
                                         })}
                                        {activePlayers.length === 0 && (
                                             <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                 No active party members. Toggle some players on!
                                             </div>
                                         )}
                                    </div>

                                    <div className="popup-actions" style={{ marginTop: '1rem' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={executeAttack}
                                            disabled={activePlayers.length === 0 || Object.keys(selectedTargets).filter(id => selectedTargets[id] && selectedTargets[id] !== 'none').length === 0}
                                            style={{ flex: 1 }}
                                        >
                                            {autoRollEnabled ? (isSave ? '🎲 Roll Saves' : '🎲 Roll Attacks') : 'Apply Resolution'}
                                        </button>
                                        <button className="btn" onClick={() => setActiveAttackState(null)}>Cancel</button>
                                    </div>
                                </>
                            ) : (
                                /* ROLL RESULTS PHASE */
                                <>
                                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Roll Results:</h4>
                                    <div className="attack-results-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1.25rem' }}>
                                        {rollResults.map(res => {
                                             const isCrit = res.resultType === 'crit';
                                             const isCritMiss = res.resultType === 'crit_miss';
                                             const isHit = res.resultType === 'hit' || isCrit || res.resultType === 'save_failed' || (res.resultType === 'save_success' && res.totalDamageApplied > 0);
                                             
                                             let badgeBg = 'rgba(239, 68, 68, 0.15)'; // red for miss
                                             let badgeColor = 'var(--danger)';
                                             let badgeLabel = res.isSave ? 'FAILED 💥' : 'MISS 💨';
                                             
                                             if (res.isSave) {
                                                 if (res.resultType === 'save_success') {
                                                     badgeBg = 'rgba(16, 185, 129, 0.15)'; // green for success
                                                     badgeColor = 'var(--success)';
                                                     badgeLabel = 'SAVED 🛡️';
                                                 }
                                             } else {
                                                 if (isCrit) {
                                                     badgeBg = 'rgba(245, 158, 11, 0.25)'; // gold for crit
                                                     badgeColor = 'var(--warning)';
                                                     badgeLabel = 'CRIT HIT! 🌟';
                                                 } else if (isCritMiss) {
                                                     badgeBg = 'rgba(239, 68, 68, 0.3)';
                                                     badgeColor = '#f87171';
                                                     badgeLabel = 'CRIT MISS! ❌';
                                                 } else if (isHit) {
                                                     badgeBg = 'rgba(16, 185, 129, 0.15)'; // green for hit
                                                     badgeColor = 'var(--success)';
                                                     badgeLabel = 'HIT! 🎯';
                                                 }
                                             }

                                             return (
                                                 <div 
                                                     key={res.playerId} 
                                                     className="result-row-card"
                                                     style={{
                                                         padding: '0.75rem',
                                                         background: 'rgba(255, 255, 255, 0.02)',
                                                         border: '1px solid rgba(255, 255, 255, 0.05)',
                                                         borderRadius: 'var(--radius-sm)'
                                                     }}
                                                 >
                                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                         <strong style={{ fontSize: '1rem' }}>{res.playerName}</strong>
                                                         <span 
                                                             style={{
                                                                 padding: '0.2rem 0.5rem',
                                                                 borderRadius: '4px',
                                                                 fontSize: '0.75rem',
                                                                 fontWeight: 'bold',
                                                                 background: badgeBg,
                                                                 color: badgeColor
                                                             }}
                                                         >
                                                             {badgeLabel}
                                                         </span>
                                                     </div>

                                                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                         <div>
                                                             {res.d20 === null ? (
                                                                 res.isSave ? (
                                                                     <>
                                                                         Save (<strong>{res.saveStat.toUpperCase()}</strong>): <strong>Manual Resolution</strong> vs DC {res.dc}
                                                                     </>
                                                                 ) : (
                                                                     <>
                                                                         Roll: <strong>Manual Resolution</strong> vs AC {res.ac}
                                                                     </>
                                                                 )
                                                             ) : (
                                                                 res.isSave ? (
                                                                     <>
                                                                         Save (<strong>{res.saveStat.toUpperCase()}</strong>): <strong>d20 ({res.d20})</strong> + {res.saveBonus} = <strong>{res.totalRoll}</strong> vs DC {res.dc}
                                                                     </>
                                                                 ) : (
                                                                     <>
                                                                         Roll: <strong>d20 ({res.d20})</strong> + {res.toHit} = <strong>{res.totalRoll}</strong> vs AC {res.ac}
                                                                     </>
                                                                 )
                                                             )}
                                                         </div>
                                                         {isHit && (
                                                             <>
                                                                 {res.totalDamageApplied > 0 && (
                                                                     <>
                                                                         <div style={{ color: 'var(--text-primary)' }}>
                                                                             Damage Taken: <strong style={{ color: 'var(--danger)' }}>{res.totalDamageApplied}</strong>
                                                                         </div>
                                                                         {res.damageBreakdowns.map((b, idx) => (
                                                                             <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', paddingLeft: '0.5rem' }}>
                                                                                 ↳ {b}
                                                                             </div>
                                                                         ))}
                                                                     </>
                                                                 )}
                                                                 <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                                     <span>HP:</span>
                                                                     <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{res.originalHp}</span>
                                                                     <span>→</span>
                                                                     <span style={{ color: res.newHp <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{res.newHp}</span>
                                                                     <span>/ {res.maxHp}</span>
                                                                 </div>
                                                             </>
                                                         )}
                                                         {res.resolvedEffect && (
                                                             <div style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                                                 ⚠️ Effect: <span style={{ textDecoration: 'underline' }}>{res.resolvedEffect}</span>
                                                             </div>
                                                         )}
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                    </div>

                                    <div className="popup-actions" style={{ gap: '0.5rem' }}>
                                        <button className="btn btn-primary" onClick={() => setActiveAttackState(null)} style={{ flex: 1 }}>Close</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Top-Level Damage/Heal Modal Overlay */}
            {damageModalId && (() => {
                const player = data.find(p => p.id === damageModalId);
                const enemy = enemies.find(e => e.id === damageModalId);
                const target = player || enemy;
                if (!target) return null;
                const isEnemy = !!enemy;

                return (
                    <div className="global-modal-overlay" onClick={() => { setDamageModalId(null); setDamageAmount(''); setIsTempHpCheckboxChecked(false); }}>
                        <div className="damage-heal-popup glass-panel" onClick={e => e.stopPropagation()}>
                            <h3>HP Change: {target.name}</h3>
                            <p className="dh-hint">Positive = Damage &nbsp;·&nbsp; Negative = Heal</p>
                            <input
                                type="number"
                                className="input global-dh-input"
                                value={damageAmount}
                                style={{ color: parseInt(damageAmount) < 0 ? '#4ade80' : parseInt(damageAmount) > 0 ? '#f87171' : 'inherit', fontWeight: 700, fontSize: '1.6rem', textAlign: 'center' }}
                                ref={focusAndSelectRef}
                                onChange={(e) => setDamageAmount(e.target.value)}
                                onWheel={(e) => {
                                    e.preventDefault();
                                    const dir = Math.sign(e.deltaY) * -1;
                                    setDamageAmount(prev => String((parseInt(prev) || 0) + dir));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp') setDamageAmount(prev => String((parseInt(prev) || 0) + 1));
                                    if (e.key === 'ArrowDown') setDamageAmount(prev => String((parseInt(prev) || 0) - 1));
                                    if (e.key === 'Enter') {
                                        if (isEnemy) applyEnemyHP(target.id);
                                        else applyDamageOrHeal(target.id);
                                    }
                                }}
                                placeholder="0"
                            />
                            {!isEnemy && (
                                <label className="temp-hp-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={isTempHpCheckboxChecked}
                                        onChange={(e) => setIsTempHpCheckboxChecked(e.target.checked)}
                                    />
                                    Apply as Temporary HP
                                </label>
                            )}
                            <div className="popup-actions">
                                <button className="btn btn-primary" onClick={() => {
                                    if (isEnemy) applyEnemyHP(target.id);
                                    else applyDamageOrHeal(target.id);
                                }}>Apply</button>
                                <button className="btn" onClick={() => { setDamageModalId(null); setDamageAmount(''); setIsTempHpCheckboxChecked(false); }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div >
    );
}
