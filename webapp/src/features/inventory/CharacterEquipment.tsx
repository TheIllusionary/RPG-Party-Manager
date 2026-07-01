// @ts-nocheck — TODO: tighten inventory component types
import React, { useState } from 'react';
import './CharacterEquipment.css';
import type { IBuff, IEquipment, IPlayer } from '../../types';

const DAMAGE_TYPES = [
    'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
    'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'
];

const ALL_CC_EFFECTS = [
    'Blind 🕶️', 'Charmed ✨', 'Deafened 🔇', 'Frightened 😨', 'Grappled ✊',
    'Incapacitated 😵', 'Paralyzed ⏳', 'Petrified 🗿', 'Poisoned 🤢',
    'Prone 🛏️', 'Restrained 🕸️', 'Stunned 🌀', 'Asleep 💤', 'Slowed 🐢'
];

const SLOT_DEFS = [
    { id: 'head', label: 'Head', icon: '⛑️', hint: 'Helmet' },
    { id: 'neck', label: 'Neck', icon: '📿', hint: 'Necklace / Amulet' },
    { id: 'armor', label: 'Armor', icon: '🥋', hint: 'Armor / Robe' },
    { id: 'mainHand', label: 'Main Hand', icon: '⚔️', hint: 'Weapon' },
    { id: 'mainHand2', label: 'Main Hand 2', icon: '💍', hint: 'Ring 1' },
    { id: 'offhand', label: 'Offhand', icon: '🛡️', hint: 'Shield / Off-weapon' },
    { id: 'offhand2', label: 'Offhand 2', icon: '💍', hint: 'Ring 2' },
    { id: 'waist', label: 'Waist', icon: '🎗️', hint: 'Belt / Sash' },
    { id: 'feet', label: 'Feet', icon: '👢', hint: 'Boots / Sandals' },
    { id: 'gloves', label: 'Gloves', icon: '🧤', hint: 'Gloves / Gauntlets' },
];

const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const emptySlot = () => ({
    name: '',
    description: '',
    modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    setAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    acBonus: 0,
    baseAC: 10,
    acModifierStat: 'dex',
    acModifierCap: null,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    ccResistances: [],
    ccImmunities: [],
    ccVulnerabilities: [],
    buffs: []
});

const newWondrousItem = () => ({
    id: Date.now().toString(),
    name: 'New Wondrous Item',
    category: '',
    description: '',
    modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    setAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    acBonus: 0,
    baseAC: 10,
    acModifierStat: 'dex',
    acModifierCap: null,
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    ccResistances: [],
    ccImmunities: [],
    ccVulnerabilities: [],
    buffs: []
});

const getPlayerEquipment = (equipped, playerId) => {
    const base = equipped?.[playerId] || {};
    const result = {};
    SLOT_DEFS.forEach(s => {
        result[s.id] = base[s.id] || (s.id === 'armor' && base['torso']) || emptySlot();
    });
    return result;
};

// Slot positions in the paper doll (left%, top%) — calibrated to arms-down silhouette
const SLOT_POSITIONS = {
    head: { left: '50%', top: '12%', anchor: 'top-center' }, // +10%
    neck: { left: '50%', top: '21%', anchor: 'top-center' }, // +5%
    armor: { left: '50%', top: '32%', anchor: 'top-center' },
    mainHand: { left: '73%', top: '48%', anchor: 'right' },      // left 5%
    mainHand2: { left: '73%', top: '55%', anchor: 'right' },      // left 5%, up 5%
    offhand: { left: '27%', top: '48%', anchor: 'left' },       // right 5%
    offhand2: { left: '27%', top: '55%', anchor: 'left' },       // right 5%, up 5%
    waist: { left: '50%', top: '48%', anchor: 'top-center' }, // -5%
    feet: { left: '50%', top: '87%', anchor: 'top-center' },
    gloves: { left: '27%', top: '38%', anchor: 'left' },
};

interface CharacterEquipmentProps {
  data: IEquipment;
  updateData: (d: IEquipment) => void;
  players: IPlayer[];
  buffsDatabase?: IBuff[];
  updateBuffsDatabase?: (b: IBuff[]) => void;
}

export default function CharacterEquipment({ data, updateData, players, buffsDatabase = [], updateBuffsDatabase = () => {} }: CharacterEquipmentProps) {
    const equipped = data?.equipped || {};
    const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || '');
    const [openSlot, setOpenSlot] = useState(null); // slot id currently expanded
    const [editingWondrous, setEditingWondrous] = useState({}); // { [itemId]: draftItem }
    const [slotDraft, setSlotDraft] = useState(null); // { slotId, name, description, modifiers }

    // Searchable/quick-create buffs local states
    const [slotBuffSearchQuery, setSlotBuffSearchQuery] = useState('');
    const [isSlotBuffDropdownOpen, setIsSlotBuffDropdownOpen] = useState(false);
    const [quickSlotBuffName, setQuickSlotBuffName] = useState('');
    const [quickSlotBuffDesc, setQuickSlotBuffDesc] = useState('');

    const [wondrousBuffSearchQuery, setWondrousBuffSearchQuery] = useState('');
    const [isWondrousBuffDropdownOpen, setIsWondrousBuffDropdownOpen] = useState(null); // stores itemId
    const [quickWondrousBuffName, setQuickWondrousBuffName] = useState('');
    const [quickWondrousBuffDesc, setQuickWondrousBuffDesc] = useState('');

    const playerEquip = getPlayerEquipment(equipped, selectedPlayerId);
    const wondrousItems = equipped[selectedPlayerId]?.__wondrous__ || [];

    const updateDraftField = (field, value) => {
        setSlotDraft(prev => prev ? { ...prev, [field]: value } : null);
    };

    const updateDraftModifier = (stat, value) => {
        setSlotDraft(prev => {
            if (!prev) return null;
            const mods = prev.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
            return {
                ...prev,
                modifiers: { ...mods, [stat]: parseInt(value) || 0 }
            };
        });
    };

    const updateDraftSetAttribute = (stat, value) => {
        setSlotDraft(prev => {
            if (!prev) return null;
            const setAttrs = prev.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
            const val = value === '' ? 0 : (parseInt(value) || 0);
            return {
                ...prev,
                setAttributes: { ...setAttrs, [stat]: val }
            };
        });
    };

    const saveSlotItem = () => {
        if (!slotDraft || !openSlot) return;

        const newSlotData = {
            name: slotDraft.name,
            description: slotDraft.description,
            modifiers: slotDraft.modifiers,
            setAttributes: slotDraft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
            acBonus: slotDraft.acBonus || 0,
            baseAC: slotDraft.baseAC !== undefined ? slotDraft.baseAC : 10,
            acModifierStat: slotDraft.acModifierStat !== undefined ? slotDraft.acModifierStat : 'dex',
            acModifierCap: slotDraft.acModifierCap !== undefined ? slotDraft.acModifierCap : null,
            resistances: slotDraft.resistances || [],
            immunities: slotDraft.immunities || [],
            vulnerabilities: slotDraft.vulnerabilities || [],
            ccResistances: slotDraft.ccResistances || [],
            ccImmunities: slotDraft.ccImmunities || [],
            ccVulnerabilities: slotDraft.ccVulnerabilities || [],
            buffs: slotDraft.buffs || []
        };

        const newEquipped = {
            ...equipped,
            [selectedPlayerId]: {
                ...equipped[selectedPlayerId],
                [openSlot]: newSlotData
            }
        };

        // Sync with inventories
        let newInventories = data.inventories || {};
        if (slotDraft.name.trim().length > 0) {
            const invItems = newInventories[selectedPlayerId] || [];
            const exists = invItems.some(i => i.name === slotDraft.name);
            if (!exists) {
                const newInvItem = {
                    id: Date.now().toString(),
                    name: slotDraft.name,
                    description: slotDraft.description,
                    quantity: 1,
                    weight: '',
                    type: openSlot,
                    modifiers: slotDraft.modifiers,
                    setAttributes: slotDraft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                    acBonus: slotDraft.acBonus || 0,
                    baseAC: slotDraft.baseAC !== undefined ? slotDraft.baseAC : 10,
                    acModifierStat: slotDraft.acModifierStat !== undefined ? slotDraft.acModifierStat : 'dex',
                    acModifierCap: slotDraft.acModifierCap !== undefined ? slotDraft.acModifierCap : null,
                    resistances: slotDraft.resistances || [],
                    immunities: slotDraft.immunities || [],
                    vulnerabilities: slotDraft.vulnerabilities || [],
                    ccResistances: slotDraft.ccResistances || [],
                    ccImmunities: slotDraft.ccImmunities || [],
                    ccVulnerabilities: slotDraft.ccVulnerabilities || [],
                    buffs: slotDraft.buffs || []
                };
                newInventories = {
                    ...newInventories,
                    [selectedPlayerId]: [newInvItem, ...invItems]
                };
            } else {
                const updatedInv = invItems.map(i => i.name === slotDraft.name ? {
                    ...i,
                    description: slotDraft.description,
                    modifiers: slotDraft.modifiers,
                    setAttributes: slotDraft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                    type: openSlot,
                    acBonus: slotDraft.acBonus || 0,
                    baseAC: slotDraft.baseAC !== undefined ? slotDraft.baseAC : 10,
                    acModifierStat: slotDraft.acModifierStat !== undefined ? slotDraft.acModifierStat : 'dex',
                    acModifierCap: slotDraft.acModifierCap !== undefined ? slotDraft.acModifierCap : null,
                    resistances: slotDraft.resistances || [],
                    immunities: slotDraft.immunities || [],
                    vulnerabilities: slotDraft.vulnerabilities || [],
                    ccResistances: slotDraft.ccResistances || [],
                    ccImmunities: slotDraft.ccImmunities || [],
                    ccVulnerabilities: slotDraft.ccVulnerabilities || [],
                    buffs: slotDraft.buffs || []
                } : i);
                newInventories = {
                    ...newInventories,
                    [selectedPlayerId]: updatedInv
                };
            }
        }

        updateData({
            ...data,
            equipped: newEquipped,
            inventories: newInventories
        });
        
        setOpenSlot(null);
        setSlotDraft(null);
    };

    const handleClearSlot = () => {
        if (!openSlot) return;

        const current = playerEquip[openSlot];
        const newEquipped = {
            ...equipped,
            [selectedPlayerId]: {
                ...equipped[selectedPlayerId],
                [openSlot]: emptySlot()
            }
        };

        let newInventories = data.inventories || {};

        if (current && current.name.trim().length > 0) {
            const invItems = newInventories[selectedPlayerId] || [];
            const exists = invItems.some(i => i.name === current.name);
            if (!exists) {
                const newInvItem = {
                    id: Date.now().toString(),
                    name: current.name,
                    description: current.description,
                    quantity: 1,
                    weight: '',
                    type: openSlot,
                    modifiers: current.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
                };
                newInventories = {
                    ...newInventories,
                    [selectedPlayerId]: [newInvItem, ...invItems]
                };
            }
        }

        updateData({
            ...data,
            equipped: newEquipped,
            inventories: newInventories
        });

        setOpenSlot(null);
        setSlotDraft(null);
    };

    // ===== WONDROUS ITEMS HELPERS =====
    const saveWondrousItems = (items) => {
        const newEquipped = {
            ...equipped,
            [selectedPlayerId]: {
                ...equipped[selectedPlayerId],
                __wondrous__: items
            }
        };
        updateData({ ...data, equipped: newEquipped });
    };

    const addWondrousItem = () => {
        const item = newWondrousItem();
        const updated = [...wondrousItems, item];
        saveWondrousItems(updated);
        setEditingWondrous(prev => ({ ...prev, [item.id]: { ...item } }));
    };

    const startEditingWondrous = (item) => {
        setEditingWondrous(prev => ({ ...prev, [item.id]: { ...item } }));
    };

    const updateWondrousDraft = (itemId, field, value) => {
        setEditingWondrous(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    };

    const updateWondrousMod = (itemId, stat, value) => {
        setEditingWondrous(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                modifiers: { ...prev[itemId].modifiers, [stat]: parseInt(value) || 0 }
            }
        }));
    };

    const updateWondrousSetAttribute = (itemId, stat, value) => {
        setEditingWondrous(prev => {
            const draft = prev[itemId];
            if (!draft) return prev;
            const setAttrs = draft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
            const val = value === '' ? 0 : (parseInt(value) || 0);
            return {
                ...prev,
                [itemId]: {
                    ...draft,
                    setAttributes: { ...setAttrs, [stat]: val }
                }
            };
        });
    };

    const saveWondrousItem = (itemId) => {
        const draft = editingWondrous[itemId];
        if (!draft) return;
        const updated = wondrousItems.map(i => i.id === itemId ? { ...draft } : i);
        
        const invItems = data.inventories?.[selectedPlayerId] || [];
        const existsInInv = invItems.some(i => i.id === itemId);
        if (existsInInv) {
            const updatedInv = invItems.map(i => i.id === itemId ? {
                ...i,
                name: draft.name,
                description: draft.description,
                modifiers: draft.modifiers,
                setAttributes: draft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                acBonus: draft.acBonus || 0,
                baseAC: draft.baseAC !== undefined ? draft.baseAC : 10,
                acModifierStat: draft.acModifierStat !== undefined ? draft.acModifierStat : 'dex',
                acModifierCap: draft.acModifierCap !== undefined ? draft.acModifierCap : null,
                resistances: draft.resistances || [],
                immunities: draft.immunities || [],
                vulnerabilities: draft.vulnerabilities || [],
                ccResistances: draft.ccResistances || [],
                ccImmunities: draft.ccImmunities || [],
                ccVulnerabilities: draft.ccVulnerabilities || [],
                buffs: draft.buffs || []
            } : i);
            updateData({
                ...data,
                equipped: {
                    ...equipped,
                    [selectedPlayerId]: {
                        ...equipped[selectedPlayerId],
                        __wondrous__: updated
                    }
                },
                inventories: {
                    ...(data.inventories || {}),
                    [selectedPlayerId]: updatedInv
                }
            });
        } else {
            saveWondrousItems(updated);
        }
        
        setEditingWondrous(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
    };

    const cancelWondrousEdit = (itemId) => {
        setEditingWondrous(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
    };

    const removeWondrousItem = (itemId) => {
        const itemToRemove = wondrousItems.find(i => i.id === itemId);
        const updated = wondrousItems.filter(i => i.id !== itemId);
        
        if (itemToRemove) {
            const invItems = data.inventories?.[selectedPlayerId] || [];
            const existsInInv = invItems.some(i => i.id === itemId || i.name === itemToRemove.name);
            
            if (!existsInInv) {
                const newInvItem = {
                    id: itemToRemove.id,
                    name: itemToRemove.name,
                    description: itemToRemove.description,
                    quantity: 1,
                    weight: '',
                    type: 'wondrous',
                    modifiers: itemToRemove.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
                };
                const updatedInv = [...invItems, newInvItem];
                updateData({
                    ...data,
                    equipped: {
                        ...equipped,
                        [selectedPlayerId]: {
                            ...equipped[selectedPlayerId],
                            __wondrous__: updated
                        }
                    },
                    inventories: {
                        ...(data.inventories || {}),
                        [selectedPlayerId]: updatedInv
                    }
                });
            } else {
                saveWondrousItems(updated);
            }
        } else {
            saveWondrousItems(updated);
        }
        cancelWondrousEdit(itemId);
    };

    // Compute total equipment bonuses — includes wondrous items
    const totalBonuses = STATS.reduce((acc, stat) => {
        const player = players.find(p => p.id === selectedPlayerId);
        const baseStat = player ? (player[stat] || 10) : 10;

        let setVal = 0;
        let modifierSum = 0;

        SLOT_DEFS.forEach(s => {
            modifierSum += playerEquip[s.id]?.modifiers?.[stat] || 0;
            const sVal = playerEquip[s.id]?.setAttributes?.[stat] || 0;
            if (sVal > setVal) {
                setVal = sVal;
            }
        });
        wondrousItems.forEach(w => {
            modifierSum += w.modifiers?.[stat] || 0;
            const sVal = w.setAttributes?.[stat] || 0;
            if (sVal > setVal) {
                setVal = sVal;
            }
        });

        if (setVal > baseStat) {
            acc[stat] = setVal - baseStat;
        } else {
            acc[stat] = modifierSum;
        }
        return acc;
    }, {});

    const toggleSlot = (id) => {
        if (openSlot === id) {
            setOpenSlot(null);
            setSlotDraft(null);
        } else {
            setOpenSlot(id);
            const current = playerEquip[id] || emptySlot();
            setSlotDraft({
                slotId: id,
                name: current.name || '',
                description: current.description || '',
                modifiers: current.modifiers ? { ...current.modifiers } : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                acBonus: current.acBonus || 0,
                resistances: [...(current.resistances || [])],
                immunities: [...(current.immunities || [])],
                vulnerabilities: [...(current.vulnerabilities || [])],
                ccResistances: [...(current.ccResistances || [])],
                ccImmunities: [...(current.ccImmunities || [])],
                ccVulnerabilities: [...(current.ccVulnerabilities || [])]
            });
        }
    };
    const openSlotDef = SLOT_DEFS.find(s => s.id === openSlot);
    const openSlotData = slotDraft;

    if (players.length === 0) {
        return (
            <div className="char-equip-tab">
                <div className="empty-state"><p>No players in the roster yet.</p></div>
            </div>
        );
    }

    return (
        <div className="char-equip-tab">
            {/* Header + player selector */}
            <div className="char-equip-header">
                <h2>⚔️ Character Equipment</h2>
                <select
                    className="input player-selector"
                    value={selectedPlayerId}
                    onChange={e => { setSelectedPlayerId(e.target.value); setOpenSlot(null); setSlotDraft(null); setEditingWondrous({}); }}
                >
                    {players.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {p.classType}</option>
                    ))}
                </select>
            </div>

            {/* AC Bonuses summary strip */}
            <div className="equip-bonus-strip glass-panel ac-bonus-strip" style={{ marginBottom: '0.5rem' }}>
                <span className="bonus-strip-label">AC Bonuses</span>
                {(() => {
                    let totalAC = 0;
                    const itemsWithAC = [];
                    SLOT_DEFS.forEach(s => {
                        const val = playerEquip[s.id]?.acBonus || 0;
                        if (val) {
                            totalAC += val;
                            itemsWithAC.push({ name: playerEquip[s.id].name, slot: s.label, val });
                        }
                    });
                    wondrousItems.forEach(w => {
                        const val = w.acBonus || 0;
                        if (val) {
                            totalAC += val;
                            itemsWithAC.push({ name: w.name || 'Wondrous Item', slot: 'Wondrous', val });
                        }
                    });

                    return (
                        <>
                            <div className="bonus-chip total-ac-chip">
                                <span className="bonus-stat">TOTAL AC</span>
                                <span className={`bonus-val ${totalAC > 0 ? 'pos' : totalAC < 0 ? 'neg' : 'zero'}`}>
                                    {totalAC >= 0 ? '+' : ''}{totalAC}
                                </span>
                            </div>
                            {itemsWithAC.map((item, idx) => (
                                <div key={idx} className="bonus-chip ac-item-chip" title={item.name}>
                                    <span className="bonus-stat">{item.slot}</span>
                                    <span className="bonus-val">
                                        {item.val >= 0 ? '+' : ''}{item.val}
                                    </span>
                                </div>
                            ))}
                            {itemsWithAC.length === 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '0.25rem' }}>No AC bonuses equipped</span>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Stat bonuses summary strip */}
            <div className="equip-bonus-strip glass-panel" style={{ marginBottom: '0.5rem' }}>
                <span className="bonus-strip-label">Equipment Bonuses</span>
                {STATS.map(stat => (
                    <div key={stat} className="bonus-chip">
                        <span className="bonus-stat">{stat.toUpperCase()}</span>
                        <span className={`bonus-val ${totalBonuses[stat] > 0 ? 'pos' : totalBonuses[stat] < 0 ? 'neg' : 'zero'}`}>
                            {totalBonuses[stat] >= 0 ? '+' : ''}{totalBonuses[stat]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Item Buffs & Debuffs summary strip */}
            <div className="equip-bonus-strip glass-panel item-buffs-strip" style={{ marginBottom: '1.25rem' }}>
                <span className="bonus-strip-label">Item Buffs &amp; Debuffs</span>
                {(() => {
                    const itemBuffs = [];
                    SLOT_DEFS.forEach(s => {
                        const item = playerEquip[s.id];
                        if (item && Array.isArray(item.buffs)) {
                            item.buffs.forEach(b => {
                                itemBuffs.push({ name: b, source: s.label, itemName: item.name });
                            });
                        }
                    });
                    wondrousItems.forEach(w => {
                        if (w && Array.isArray(w.buffs)) {
                            w.buffs.forEach(b => {
                                itemBuffs.push({ name: b, source: 'Wondrous', itemName: w.name });
                            });
                        }
                    });

                    return (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {itemBuffs.map((buff, idx) => (
                                <span 
                                    key={idx} 
                                    className="item-buff-pill" 
                                    title={`From item: ${buff.itemName} (${buff.source})`}
                                >
                                    {buff.name}
                                </span>
                            ))}
                            {itemBuffs.length === 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '0.25rem' }}>No active item buffs/debuffs</span>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Paper doll + detail panel */}
            <div className="doll-and-detail">
                {/* PAPER DOLL */}
                <div className="paper-doll-wrap">
                    {/* Character image */}
                    <img
                        src="body-silhouette.png"
                        alt="Character silhouette"
                        className="char-silhouette-img"
                    />

                    {/* Equipment slot buttons positioned over doll */}
                    {SLOT_DEFS.map(slot => {
                        const pos = SLOT_POSITIONS[slot.id];
                        const slotData = playerEquip[slot.id];
                        const hasItem = slotData?.name?.trim().length > 0;
                        const isOpen = openSlot === slot.id;
                        return (
                            <button
                                key={slot.id}
                                className={`slot-pin anchor-${pos.anchor} ${hasItem ? 'slot-filled' : 'slot-empty'} ${isOpen ? 'slot-active' : ''}`}
                                style={{ left: pos.left, top: pos.top }}
                                onClick={() => toggleSlot(slot.id)}
                                title={hasItem ? slotData.name : 'No Item Equipped'}
                            >
                                <span className="slot-icon">{slot.icon}</span>
                                <span className="slot-name-mini">{hasItem ? slotData.name : slot.hint}</span>
                            </button>
                        );
                    })}
                </div>

                {/* DETAIL PANEL */}
                <div className="equip-detail-panel glass-panel">
                    {openSlot && openSlotDef && openSlotData ? (
                        <>
                            <div className="detail-header">
                                <span className="detail-slot-icon">{openSlotDef.icon}</span>
                                <div>
                                    <div className="detail-slot-label">{openSlotDef.label}</div>
                                    <input
                                        className="input detail-name-input"
                                        value={openSlotData.name}
                                        onChange={e => updateDraftField('name', e.target.value)}
                                        placeholder={`Enter ${openSlotDef.hint}`}
                                    />
                                </div>
                                <button className="delete-btn detail-close" onClick={() => { setOpenSlot(null); setSlotDraft(null); }}>×</button>
                            </div>

                            <div className="detail-desc-wrap">
                                <label>Description</label>
                                <textarea
                                    className="input detail-desc"
                                    value={openSlotData.description}
                                    onChange={e => updateDraftField('description', e.target.value)}
                                    placeholder="Item lore, properties, notes..."
                                    rows={3}
                                />
                            </div>

                            <div className="detail-mods-wrap">
                                <label>Stat Modifiers</label>
                                <div className="detail-mods-grid">
                                    {STATS.map(stat => (
                                        <div key={stat} className="detail-mod-cell">
                                            <span className="detail-mod-stat">{stat.toUpperCase()}</span>
                                            <input
                                                type="number"
                                                className="input detail-mod-input"
                                                value={openSlotData.modifiers?.[stat] || 0}
                                                onChange={e => updateDraftModifier(stat, e.target.value)}
                                                onWheel={e => {
                                                    e.preventDefault();
                                                    const dir = Math.sign(e.deltaY) * -1;
                                                    updateDraftModifier(stat, (openSlotData.modifiers?.[stat] || 0) + dir);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="detail-mods-wrap" style={{ marginTop: '0.75rem' }}>
                                <label>Set Attributes</label>
                                <div className="detail-mods-grid">
                                    {STATS.map(stat => (
                                        <div key={stat} className="detail-mod-cell">
                                            <span className="detail-mod-stat">{stat.toUpperCase()}</span>
                                            <input
                                                type="number"
                                                className="input detail-mod-input"
                                                placeholder="-"
                                                value={openSlotData.setAttributes?.[stat] || ''}
                                                onChange={e => updateDraftSetAttribute(stat, e.target.value)}
                                                onWheel={e => {
                                                    e.preventDefault();
                                                    const dir = Math.sign(e.deltaY) * -1;
                                                    const current = openSlotData.setAttributes?.[stat] || 0;
                                                    const nextVal = Math.max(0, current + dir);
                                                    updateDraftSetAttribute(stat, nextVal === 0 ? '' : nextVal);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                                {/* Armor-specific properties vs AC Bonus */}
                                {openSlot === 'armor' ? (
                                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>Base AC</label>
                                            <input
                                                type="number"
                                                className="input detail-mod-input"
                                                style={{ width: '100%' }}
                                                value={openSlotData.baseAC !== undefined ? openSlotData.baseAC : 10}
                                                onChange={e => updateDraftField('baseAC', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>Modifier Stat</label>
                                            <select
                                                className="input"
                                                style={{ width: '100%', fontSize: '0.8rem', height: '33px', padding: '0.1rem 0.25rem' }}
                                                value={openSlotData.acModifierStat !== undefined ? openSlotData.acModifierStat : 'dex'}
                                                onChange={e => updateDraftField('acModifierStat', e.target.value)}
                                            >
                                                <option value="">None</option>
                                                <option value="str">STR</option>
                                                <option value="dex">DEX</option>
                                                <option value="con">CON</option>
                                                <option value="int">INT</option>
                                                <option value="wis">WIS</option>
                                                <option value="cha">CHA</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>Modifier Cap</label>
                                            <input
                                                type="number"
                                                className="input detail-mod-input"
                                                placeholder="No Cap"
                                                style={{ width: '100%' }}
                                                value={openSlotData.acModifierCap !== undefined && openSlotData.acModifierCap !== null ? openSlotData.acModifierCap : ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    updateDraftField('acModifierCap', val === '' ? null : parseInt(val));
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <label style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>AC Bonus</label>
                                        <input
                                            type="number"
                                            className="input detail-mod-input"
                                            style={{ width: '72px' }}
                                            value={openSlotData.acBonus || 0}
                                            onChange={e => updateDraftField('acBonus', parseInt(e.target.value) || 0)}
                                            onWheel={e => {
                                                e.preventDefault();
                                                updateDraftField('acBonus', (openSlotData.acBonus || 0) + Math.sign(e.deltaY) * -1);
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Damage Resistances / Immunities / Vulnerabilities */}
                                <div style={{ marginTop: '0.75rem' }}>
                                    <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block' }}>Damage Modifiers</label>
                                    {[{ key: 'resistances', label: 'Resistances', color: '#60a5fa' }, { key: 'immunities', label: 'Immunities', color: '#a78bfa' }, { key: 'vulnerabilities', label: 'Vulnerabilities', color: '#f87171' }].map(({ key, label, color }) => (
                                        <div key={key} style={{ marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem', alignItems: 'center' }}>
                                                {(openSlotData[key] || []).map(r => (
                                                    <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: '12px', padding: '0 0.45rem', fontSize: '0.72rem', color }}>
                                                        {r}
                                                        <button type="button" onClick={() => updateDraftField(key, (openSlotData[key] || []).filter(x => x !== r))} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, fontSize: '0.75rem' }}>×</button>
                                                    </span>
                                                ))}
                                                <select className="input" style={{ fontSize: '0.72rem', padding: '0.05rem 0.2rem', height: '22px', minWidth: '64px' }} value=""
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val && !(openSlotData[key] || []).includes(val)) updateDraftField(key, [...(openSlotData[key] || []), val]);
                                                    }}>
                                                    <option value="">+ Add</option>
                                                    {DAMAGE_TYPES.filter(t => !(openSlotData[key] || []).includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* CC Resistances / Immunities / Vulnerabilities */}
                                <div style={{ marginTop: '0.75rem' }}>
                                    <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block' }}>CC Modifiers</label>
                                    {[{ key: 'ccResistances', label: 'CC Resistances', color: '#34d399' }, { key: 'ccImmunities', label: 'CC Immunities', color: '#a78bfa' }, { key: 'ccVulnerabilities', label: 'CC Vulnerabilities', color: '#fb923c' }].map(({ key, label, color }) => (
                                        <div key={key} style={{ marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem', alignItems: 'center' }}>
                                                {(openSlotData[key] || []).map(r => (
                                                    <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: '12px', padding: '0 0.45rem', fontSize: '0.72rem', color }}>
                                                        {r}
                                                        <button type="button" onClick={() => updateDraftField(key, (openSlotData[key] || []).filter(x => x !== r))} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, fontSize: '0.75rem' }}>×</button>
                                                    </span>
                                                ))}
                                                <select className="input" style={{ fontSize: '0.72rem', padding: '0.05rem 0.2rem', height: '22px', minWidth: '64px' }} value=""
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val && !(openSlotData[key] || []).includes(val)) updateDraftField(key, [...(openSlotData[key] || []), val]);
                                                    }}>
                                                    <option value="">+ Add</option>
                                                    {ALL_CC_EFFECTS.filter(t => !(openSlotData[key] || []).includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Buffs & Debuffs */}
                                <div style={{ marginTop: '0.75rem' }}>
                                    <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block' }}>Buffs &amp; Debuffs</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem', alignItems: 'center' }}>
                                        {(openSlotData.buffs || []).map(b => (
                                            <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '12px', padding: '0 0.45rem', fontSize: '0.72rem', color: '#34d399' }}>
                                                {b}
                                                <button type="button" onClick={() => updateDraftField('buffs', (openSlotData.buffs || []).filter(x => x !== b))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', padding: 0, fontSize: '0.75rem' }}>×</button>
                                            </span>
                                        ))}
                                        {(() => {
                                            const filteredBuffs = buffsDatabase
                                                .filter(b => !(openSlotData.buffs || []).includes(b.name))
                                                .filter(b => b.name.toLowerCase().includes(slotBuffSearchQuery.toLowerCase()));
                                            return (
                                                <div className="searchable-buff-selector" style={{ position: 'relative', display: 'inline-block' }}>
                                                    {!isSlotBuffDropdownOpen ? (
                                                        <button 
                                                            type="button" 
                                                            className="input" 
                                                            style={{ 
                                                                fontSize: '0.72rem', 
                                                                padding: '0.05rem 0.2rem', 
                                                                height: '22px', 
                                                                minWidth: '100px', 
                                                                background: 'rgba(255,255,255,0.05)', 
                                                                border: '1px solid rgba(255,255,255,0.15)',
                                                                borderRadius: '4px',
                                                                color: 'var(--text-primary)',
                                                                cursor: 'pointer',
                                                                textAlign: 'center'
                                                             }}
                                                            onClick={() => {
                                                                setIsSlotBuffDropdownOpen(true);
                                                                setSlotBuffSearchQuery('');
                                                                setQuickSlotBuffName('');
                                                                setQuickSlotBuffDesc('');
                                                            }}
                                                        >
                                                            + Add Buff
                                                        </button>
                                                    ) : (
                                                        <div className="buff-dropdown-container glass-panel" style={{ 
                                                            position: 'absolute', 
                                                            top: '26px', 
                                                            left: 0, 
                                                            zIndex: 1000, 
                                                            width: '210px', 
                                                            background: 'rgba(30, 41, 59, 0.95)', 
                                                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                                                            borderRadius: '8px', 
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', 
                                                            padding: '0.4rem',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '0.3rem'
                                                        }}>
                                                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Search buffs..." 
                                                                    className="input" 
                                                                    value={slotBuffSearchQuery} 
                                                                    onChange={(e) => {
                                                                        setSlotBuffSearchQuery(e.target.value);
                                                                        setQuickSlotBuffName(e.target.value);
                                                                    }} 
                                                                    style={{ fontSize: '0.72rem', padding: '0.2rem', height: '24px', flex: 1 }}
                                                                    autoFocus
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    className="btn" 
                                                                    onClick={() => setIsSlotBuffDropdownOpen(false)}
                                                                    style={{ padding: '0 0.3rem', fontSize: '0.72rem', height: '24px' }}
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                            
                                                            <div className="buff-options-list" style={{ 
                                                                maxHeight: '120px', 
                                                                overflowY: 'auto', 
                                                                display: 'flex', 
                                                                flexDirection: 'column', 
                                                                gap: '0.1rem',
                                                                borderBottom: filteredBuffs.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                                paddingBottom: '0.2rem'
                                                            }}>
                                                                {filteredBuffs.map(b => (
                                                                    <button 
                                                                        key={b.id} 
                                                                        type="button" 
                                                                        className="buff-option-item"
                                                                        style={{ 
                                                                            background: 'none', 
                                                                            border: 'none', 
                                                                            textAlign: 'left', 
                                                                            color: 'var(--text-primary)', 
                                                                            fontSize: '0.72rem', 
                                                                            padding: '0.2rem', 
                                                                            cursor: 'pointer',
                                                                            borderRadius: '4px',
                                                                            width: '100%',
                                                                            display: 'block'
                                                                        }}
                                                                        onClick={() => {
                                                                            updateDraftField('buffs', [...(openSlotData.buffs || []), b.name]);
                                                                            setIsSlotBuffDropdownOpen(false);
                                                                        }}
                                                                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                                        onMouseLeave={(e) => e.target.style.background = 'none'}
                                                                    >
                                                                        {b.name}
                                                                    </button>
                                                                ))}
                                                                {filteredBuffs.length === 0 && (
                                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '0.2rem' }}>No buffs found</span>
                                                                )}
                                                            </div>

                                                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.4rem', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                                <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#34d399' }}>Create Buff on the Fly:</div>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Buff Name" 
                                                                    className="input"
                                                                    value={quickSlotBuffName}
                                                                    onChange={e => setQuickSlotBuffName(e.target.value)}
                                                                    style={{ fontSize: '0.72rem', padding: '0.15rem', height: '22px' }}
                                                                />
                                                                <textarea 
                                                                    placeholder="Description..." 
                                                                    className="input"
                                                                    value={quickSlotBuffDesc}
                                                                    onChange={e => setQuickSlotBuffDesc(e.target.value)}
                                                                    style={{ fontSize: '0.72rem', padding: '0.15rem', height: '36px', resize: 'none' }}
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    className="btn btn-success" 
                                                                    style={{ fontSize: '0.68rem', padding: '0.1rem 0.2rem', height: '22px', background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                                                                    onClick={() => {
                                                                        if (!quickSlotBuffName.trim()) {
                                                                            alert("Please enter a buff name.");
                                                                            return;
                                                                        }
                                                                        if (buffsDatabase.some(b => b.name.toLowerCase() === quickSlotBuffName.trim().toLowerCase())) {
                                                                            alert("A buff with this name already exists.");
                                                                            return;
                                                                        }
                                                                        const newBuff = {
                                                                            id: 'buff_' + Date.now(),
                                                                            name: quickSlotBuffName.trim(),
                                                                            type: 'fixed',
                                                                            description: quickSlotBuffDesc.trim()
                                                                        };
                                                                        updateBuffsDatabase([...buffsDatabase, newBuff]);
                                                                        updateDraftField('buffs', [...(openSlotData.buffs || []), newBuff.name]);
                                                                        setIsSlotBuffDropdownOpen(false);
                                                                        setQuickSlotBuffName('');
                                                                        setQuickSlotBuffDesc('');
                                                                    }}
                                                                >
                                                                    Create &amp; Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                            <div className="detail-actions">
                                <button className="btn btn-success save-slot-btn" onClick={saveSlotItem}>
                                    💾 Save Slot
                                </button>
                                <button className="btn btn-danger clear-slot-btn" onClick={handleClearSlot}>
                                    🛡️ Clear Slot
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="detail-placeholder">
                            <span>👆</span>
                            <p>Click any slot on the character to view or edit equipment</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== WONDROUS ITEMS (CUSTOM) ===== */}
            <div className="wondrous-section glass-panel">
                <div className="wondrous-header">
                    <div>
                        <h3 className="wondrous-title">✨ Wondrous Items (Custom)</h3>
                        <p className="wondrous-subtitle">Homebrew &amp; magical items that don't fit standard slots</p>
                    </div>
                    <button className="btn btn-primary" onClick={addWondrousItem}>+ Add Item</button>
                </div>

                {wondrousItems.length === 0 && (
                    <p className="wondrous-empty">No wondrous items yet. Add one for homebrew magic!</p>
                )}

                <div className="wondrous-list">
                    {wondrousItems.map(item => {
                        const draft = editingWondrous[item.id];
                        const isEditing = !!draft;
                        const display = isEditing ? draft : item;

                        return (
                            <div key={item.id} className={`wondrous-item ${isEditing ? 'wondrous-item-editing' : ''}`}>
                                <div className="wondrous-item-header">
                                    <span className="wondrous-item-icon">✨</span>
                                    <div className="wondrous-item-meta">
                                        {isEditing ? (
                                            <input
                                                className="input wondrous-name-input"
                                                value={display.name}
                                                onChange={e => updateWondrousDraft(item.id, 'name', e.target.value)}
                                                placeholder="Item Name"
                                            />
                                        ) : (
                                            <span className="wondrous-item-name">{item.name}</span>
                                        )}
                                        {isEditing ? (
                                            <input
                                                className="input wondrous-cat-input"
                                                value={display.category}
                                                onChange={e => updateWondrousDraft(item.id, 'category', e.target.value)}
                                                placeholder="Category (e.g. Cursed, Artifact, Ring)"
                                            />
                                        ) : (
                                            item.category && <span className="wondrous-category-tag">{item.category}</span>
                                        )}
                                    </div>
                                    <div className="wondrous-item-actions">
                                        {isEditing ? (
                                            <>
                                                <button className="btn btn-success small-btn" onClick={() => saveWondrousItem(item.id)}>Save</button>
                                                <button className="btn small-btn" onClick={() => cancelWondrousEdit(item.id)}>Cancel</button>
                                            </>
                                        ) : (
                                            <button className="btn small-btn" onClick={() => startEditingWondrous(item)}>Edit</button>
                                        )}
                                        <button className="delete-btn" onClick={() => removeWondrousItem(item.id)}>×</button>
                                    </div>
                                </div>

                                {isEditing ? (
                                    <>
                                        <textarea
                                            className="input wondrous-desc"
                                            value={display.description}
                                            onChange={e => updateWondrousDraft(item.id, 'description', e.target.value)}
                                            placeholder="Item description, properties, lore..."
                                            rows={2}
                                        />
                                        <div className="wondrous-mods">
                                            <span className="wondrous-mods-label">Stat Modifiers</span>
                                            <div className="detail-mods-grid">
                                                {STATS.map(stat => (
                                                    <div key={stat} className="detail-mod-cell">
                                                        <span className="detail-mod-stat">{stat.toUpperCase()}</span>
                                                        <input
                                                            type="number"
                                                            className="input detail-mod-input"
                                                            value={display.modifiers?.[stat] || 0}
                                                            onChange={e => updateWondrousMod(item.id, stat, e.target.value)}
                                                            onWheel={e => {
                                                                e.preventDefault();
                                                                const dir = Math.sign(e.deltaY) * -1;
                                                                updateWondrousMod(item.id, stat, (display.modifiers?.[stat] || 0) + dir);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <span className="wondrous-mods-label" style={{ display: 'block', marginTop: '0.75rem' }}>Set Attributes</span>
                                            <div className="detail-mods-grid">
                                                {STATS.map(stat => (
                                                    <div key={stat} className="detail-mod-cell">
                                                        <span className="detail-mod-stat">{stat.toUpperCase()}</span>
                                                        <input
                                                            type="number"
                                                            className="input detail-mod-input"
                                                            placeholder="-"
                                                            value={display.setAttributes?.[stat] || ''}
                                                            onChange={e => updateWondrousSetAttribute(item.id, stat, e.target.value)}
                                                            onWheel={e => {
                                                                e.preventDefault();
                                                                const dir = Math.sign(e.deltaY) * -1;
                                                                const current = display.setAttributes?.[stat] || 0;
                                                                const nextVal = Math.max(0, current + dir);
                                                                updateWondrousSetAttribute(item.id, stat, nextVal === 0 ? '' : nextVal);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* AC Bonus */}
                                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AC Bonus</span>
                                                <input type="number" className="input detail-mod-input" style={{ width: '60px' }}
                                                    value={display.acBonus || 0}
                                                    onChange={e => updateWondrousDraft(item.id, 'acBonus', parseInt(e.target.value) || 0)}
                                                    onWheel={e => { e.preventDefault(); updateWondrousDraft(item.id, 'acBonus', (display.acBonus || 0) + Math.sign(e.deltaY) * -1); }}
                                                />
                                            </div>
                                            {/* Damage Modifiers */}
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Damage Modifiers</span>
                                                {[{ key: 'resistances', label: 'Resistances', color: '#60a5fa' }, { key: 'immunities', label: 'Immunities', color: '#a78bfa' }, { key: 'vulnerabilities', label: 'Vulnerabilities', color: '#f87171' }].map(({ key, label, color }) => (
                                                    <div key={key} style={{ marginBottom: '0.3rem' }}>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</span>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.1rem', alignItems: 'center' }}>
                                                            {(display[key] || []).map(r => (
                                                                <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.68rem', color }}>
                                                                    {r}
                                                                    <button type="button" onClick={() => updateWondrousDraft(item.id, key, (display[key] || []).filter(x => x !== r))} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, fontSize: '0.7rem' }}>×</button>
                                                                </span>
                                                            ))}
                                                            <select className="input" style={{ fontSize: '0.68rem', padding: '0.05rem 0.2rem', height: '20px', minWidth: '60px' }} value=""
                                                                onChange={e => { const val = e.target.value; if (val && !(display[key] || []).includes(val)) updateWondrousDraft(item.id, key, [...(display[key] || []), val]); }}>
                                                                <option value="">+ Add</option>
                                                                {DAMAGE_TYPES.filter(t => !(display[key] || []).includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* CC Modifiers */}
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>CC Modifiers</span>
                                                {[{ key: 'ccResistances', label: 'CC Resistances', color: '#34d399' }, { key: 'ccImmunities', label: 'CC Immunities', color: '#a78bfa' }, { key: 'ccVulnerabilities', label: 'CC Vulnerabilities', color: '#fb923c' }].map(({ key, label, color }) => (
                                                    <div key={key} style={{ marginBottom: '0.3rem' }}>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</span>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.1rem', alignItems: 'center' }}>
                                                            {(display[key] || []).map(r => (
                                                                <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.68rem', color }}>
                                                                    {r}
                                                                    <button type="button" onClick={() => updateWondrousDraft(item.id, key, (display[key] || []).filter(x => x !== r))} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, fontSize: '0.7rem' }}>×</button>
                                                                </span>
                                                            ))}
                                                            <select className="input" style={{ fontSize: '0.68rem', padding: '0.05rem 0.2rem', height: '20px', minWidth: '60px' }} value=""
                                                                onChange={e => { const val = e.target.value; if (val && !(display[key] || []).includes(val)) updateWondrousDraft(item.id, key, [...(display[key] || []), val]); }}>
                                                                <option value="">+ Add</option>
                                                                {ALL_CC_EFFECTS.filter(t => !(display[key] || []).includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Buffs & Debuffs */}
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Buffs &amp; Debuffs</span>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.1rem', alignItems: 'center' }}>
                                                    {(display.buffs || []).map(b => (
                                                        <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.68rem', color: '#34d399' }}>
                                                            {b}
                                                            <button type="button" onClick={() => updateWondrousDraft(item.id, 'buffs', (display.buffs || []).filter(x => x !== b))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', padding: 0, fontSize: '0.7rem' }}>×</button>
                                                        </span>
                                                    ))}
                                                    {(() => {
                                                        const filteredBuffs = buffsDatabase
                                                            .filter(b => !(display.buffs || []).includes(b.name))
                                                            .filter(b => b.name.toLowerCase().includes(wondrousBuffSearchQuery.toLowerCase()));
                                                        return (
                                                            <div className="searchable-buff-selector" style={{ position: 'relative', display: 'inline-block' }}>
                                                                {isWondrousBuffDropdownOpen !== item.id ? (
                                                                    <button 
                                                                        type="button" 
                                                                        className="input" 
                                                                        style={{ 
                                                                            fontSize: '0.68rem', 
                                                                            padding: '0.05rem 0.2rem', 
                                                                            height: '20px', 
                                                                            minWidth: '80px', 
                                                                            background: 'rgba(255,255,255,0.05)', 
                                                                            border: '1px solid rgba(255,255,255,0.15)',
                                                                            borderRadius: '4px',
                                                                            color: 'var(--text-primary)',
                                                                            cursor: 'pointer',
                                                                            textAlign: 'center'
                                                                        }}
                                                                        onClick={() => {
                                                                            setIsWondrousBuffDropdownOpen(item.id);
                                                                            setWondrousBuffSearchQuery('');
                                                                            setQuickWondrousBuffName('');
                                                                            setQuickWondrousBuffDesc('');
                                                                        }}
                                                                    >
                                                                        + Add Buff
                                                                    </button>
                                                                ) : (
                                                                    <div className="buff-dropdown-container glass-panel" style={{ 
                                                                        position: 'absolute', 
                                                                        top: '24px', 
                                                                        left: 0, 
                                                                        zIndex: 1000, 
                                                                        width: '210px', 
                                                                        background: 'rgba(30, 41, 59, 0.95)', 
                                                                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                                                                        borderRadius: '8px', 
                                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', 
                                                                        padding: '0.4rem',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '0.3rem'
                                                                    }}>
                                                                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="Search buffs..." 
                                                                                className="input" 
                                                                                value={wondrousBuffSearchQuery} 
                                                                                onChange={(e) => {
                                                                                    setWondrousBuffSearchQuery(e.target.value);
                                                                                    setQuickWondrousBuffName(e.target.value);
                                                                                }} 
                                                                                style={{ fontSize: '0.68rem', padding: '0.2rem', height: '22px', flex: 1 }}
                                                                                autoFocus
                                                                            />
                                                                            <button 
                                                                                type="button" 
                                                                                className="btn" 
                                                                                onClick={() => setIsWondrousBuffDropdownOpen(null)}
                                                                                style={{ padding: '0 0.3rem', fontSize: '0.68rem', height: '22px' }}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                        
                                                                        <div className="buff-options-list" style={{ 
                                                                            maxHeight: '120px', 
                                                                            overflowY: 'auto', 
                                                                            display: 'flex', 
                                                                            flexDirection: 'column', 
                                                                            gap: '0.1rem',
                                                                            borderBottom: filteredBuffs.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                                            paddingBottom: '0.2rem'
                                                                        }}>
                                                                            {filteredBuffs.map(b => (
                                                                                <button 
                                                                                    key={b.id} 
                                                                                    type="button" 
                                                                                    className="buff-option-item"
                                                                                    style={{ 
                                                                                        background: 'none', 
                                                                                        border: 'none', 
                                                                                        textAlign: 'left', 
                                                                                        color: 'var(--text-primary)', 
                                                                                        fontSize: '0.68rem', 
                                                                                        padding: '0.2rem', 
                                                                                        cursor: 'pointer',
                                                                                        borderRadius: '4px',
                                                                                        width: '100%',
                                                                                        display: 'block'
                                                                                    }}
                                                                                    onClick={() => {
                                                                                        updateWondrousDraft(item.id, 'buffs', [...(display.buffs || []), b.name]);
                                                                                        setIsWondrousBuffDropdownOpen(null);
                                                                                    }}
                                                                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                                                    onMouseLeave={(e) => e.target.style.background = 'none'}
                                                                                >
                                                                                    {b.name}
                                                                                </button>
                                                                            ))}
                                                                            {filteredBuffs.length === 0 && (
                                                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '0.2rem' }}>No buffs found</span>
                                                                            )}
                                                                        </div>

                                                                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.4rem', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                                            <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#34d399' }}>Create Buff on the Fly:</div>
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="Buff Name" 
                                                                                className="input"
                                                                                value={quickWondrousBuffName}
                                                                                onChange={e => setQuickWondrousBuffName(e.target.value)}
                                                                                style={{ fontSize: '0.68rem', padding: '0.15rem', height: '20px' }}
                                                                            />
                                                                            <textarea 
                                                                                placeholder="Description..." 
                                                                                className="input"
                                                                                value={quickWondrousBuffDesc}
                                                                                onChange={e => setQuickWondrousBuffDesc(e.target.value)}
                                                                                style={{ fontSize: '0.68rem', padding: '0.15rem', height: '36px', resize: 'none' }}
                                                                            />
                                                                            <button 
                                                                                type="button" 
                                                                                className="btn btn-success" 
                                                                                style={{ fontSize: '0.65rem', padding: '0.1rem 0.2rem', height: '20px', background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                                                                                onClick={() => {
                                                                                    if (!quickWondrousBuffName.trim()) {
                                                                                        alert("Please enter a buff name.");
                                                                                        return;
                                                                                    }
                                                                                    if (buffsDatabase.some(b => b.name.toLowerCase() === quickWondrousBuffName.trim().toLowerCase())) {
                                                                                        alert("A buff with this name already exists.");
                                                                                        return;
                                                                                    }
                                                                                    const newBuff = {
                                                                                        id: 'buff_' + Date.now(),
                                                                                        name: quickWondrousBuffName.trim(),
                                                                                        type: 'fixed',
                                                                                        description: quickWondrousBuffDesc.trim()
                                                                                    };
                                                                                    updateBuffsDatabase([...buffsDatabase, newBuff]);
                                                                                    updateWondrousDraft(item.id, 'buffs', [...(display.buffs || []), newBuff.name]);
                                                                                    setIsWondrousBuffDropdownOpen(null);
                                                                                    setQuickWondrousBuffName('');
                                                                                    setQuickWondrousBuffDesc('');
                                                                                }}
                                                                            >
                                                                                Create &amp; Add
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {item.description && <p className="wondrous-desc-preview">{item.description}</p>}
                                        
                                        {STATS.some(s => (item.modifiers?.[s] || 0) !== 0) && (
                                            <div className="wondrous-mod-pills">
                                                {STATS.filter(s => (item.modifiers?.[s] || 0) !== 0).map(s => (
                                                    <span key={s} className={`wondrous-mod-pill ${item.modifiers[s] > 0 ? 'pos' : 'neg'}`}>
                                                        {s.toUpperCase()} {item.modifiers[s] > 0 ? '+' : ''}{item.modifiers[s]}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {item.setAttributes && STATS.some(s => (item.setAttributes?.[s] || 0) !== 0) && (
                                            <div className="wondrous-mod-pills" style={{ marginTop: '0.2rem' }}>
                                                {STATS.filter(s => (item.setAttributes?.[s] || 0) !== 0).map(s => (
                                                    <span key={s} className="wondrous-mod-pill pos" style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.4)', color: '#a855f7' }}>
                                                        SET {s.toUpperCase()} = {item.setAttributes[s]}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {item.acBonus !== undefined && item.acBonus !== 0 && (
                                            <div className="wondrous-mod-pills" style={{ marginTop: '0.2rem' }}>
                                                <span className="wondrous-mod-pill pos" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6' }}>
                                                    AC Bonus: +{item.acBonus}
                                                </span>
                                            </div>
                                        )}

                                        {['resistances', 'immunities', 'vulnerabilities'].some(key => item[key] && item[key].length > 0) && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.35rem' }}>
                                                {item.resistances && item.resistances.map(r => (
                                                    <span key={r} style={{ background: 'rgba(96, 165, 250, 0.15)', border: '1px solid rgba(96, 165, 250, 0.3)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.62rem', color: '#60a5fa' }}>
                                                        Resist {r}
                                                    </span>
                                                ))}
                                                {item.immunities && item.immunities.map(i => (
                                                    <span key={i} style={{ background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.62rem', color: '#a78bfa' }}>
                                                        Immune {i}
                                                    </span>
                                                ))}
                                                {item.vulnerabilities && item.vulnerabilities.map(v => (
                                                    <span key={v} style={{ background: 'rgba(248, 113, 113, 0.15)', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.62rem', color: '#f87171' }}>
                                                        Vuln {v}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {['ccResistances', 'ccImmunities', 'ccVulnerabilities'].some(key => item[key] && item[key].length > 0) && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.35rem' }}>
                                                {item.ccResistances && item.ccResistances.map(r => (
                                                    <span key={r} style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.62rem', color: '#34d399' }}>
                                                        CC Resist {r}
                                                    </span>
                                                ))}
                                                {item.ccImmunities && item.ccImmunities.map(i => (
                                                    <span key={i} style={{ background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.62rem', color: '#a78bfa' }}>
                                                        CC Immune {i}
                                                    </span>
                                                ))}
                                                {item.ccVulnerabilities && item.ccVulnerabilities.map(v => (
                                                    <span key={v} style={{ background: 'rgba(251, 146, 60, 0.15)', border: '1px solid rgba(251, 146, 60, 0.3)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.62rem', color: '#fb923c' }}>
                                                        CC Vuln {v}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {item.buffs && item.buffs.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.35rem' }}>
                                                {item.buffs.map(b => (
                                                    <span key={b} style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.62rem', color: '#34d399' }}>
                                                        Buff: {b}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
