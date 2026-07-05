import React, { useState, useEffect, useMemo } from 'react';
import './Equipment.css';
import type { IEquipmentProps, IEditingItemsMap } from '../../types/inventory';
import { useCompendiumItems } from '../../shared/hooks/useCompendiumItems';
import { parseItemText } from '../../shared/utils/itemParser';
const DAMAGE_TYPES = [
    'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
    'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'
];

const ALL_CC_EFFECTS = [
    'Blind 🕶️', 'Charmed ✨', 'Deafened 🔇', 'Frightened 😨', 'Grappled ✊',
    'Incapacitated 😵', 'Paralyzed ⏳', 'Petrified 🗿', 'Poisoned 🤢',
    'Prone 🛏️', 'Restrained 🕸️', 'Stunned 🌀', 'Asleep 💤', 'Slowed 🐢'
];

const EQUIPPABLE_TYPES = ['head', 'neck', 'armor', 'mainHand', 'mainHand2', 'offhand', 'offhand2', 'waist', 'feet', 'gloves', 'wondrous'];

const rarityBadgeStyles = {
    'Common': {
        background: 'rgba(255, 255, 255, 0.15)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    'Uncommon': {
        background: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
        border: '1px solid rgba(34, 197, 94, 0.3)'
    },
    'Rare': {
        background: 'rgba(96, 165, 250, 0.15)',
        color: '#60a5fa',
        border: '1px solid rgba(96, 165, 250, 0.3)'
    },
    'Very Rare': {
        background: 'rgba(168, 85, 247, 0.15)',
        color: '#a855f7',
        border: '1px solid rgba(168, 85, 247, 0.3)'
    },
    'Legendary': {
        background: 'rgba(251, 191, 36, 0.15)',
        color: '#fbbf24',
        border: '1px solid rgba(251, 191, 36, 0.3)'
    },
    'Mythic/Artifact': {
        background: 'rgba(249, 115, 22, 0.15)',
        color: '#f97316',
        border: '1px solid rgba(249, 115, 22, 0.3)'
    }
};

const getRarityBadgeStyle = (rarity) => {
    return rarityBadgeStyles[rarity] || rarityBadgeStyles['Common'];
};

const emptyItemExtras = () => ({
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
    rarity: 'Common',
    setAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
});

export default function Equipment({
  data,
  updateData,
  players,
  buffsDatabase = [],
  updateBuffsDatabase = () => {},
}: IEquipmentProps) {
    const isArray = Array.isArray(data);
    const inventories = isArray ? {} : data.inventories || {};
    const playerGold = isArray ? {} : data.playerGold || {};

    const [editingItems, setEditingItems] = useState<IEditingItemsMap>({});
    // Gold modal: { playerId, amount }
    const [goldModal, setGoldModal] = useState(null); // { id: playerId }
    const [goldDelta, setGoldDelta] = useState('');

    // Searchable/quick-create buffs local states
    const [buffSearchQuery, setBuffSearchQuery] = useState('');
    const [isBuffDropdownOpen, setIsBuffDropdownOpen] = useState(null); // stores itemId
    const [quickBuffName, setQuickBuffName] = useState('');
    const [quickBuffDesc, setQuickBuffDesc] = useState('');

    useEffect(() => {
        const container = document.querySelector('.container');
        if (!container) return;
        container.classList.add('battle-mode-layout');
        return () => {
            container.classList.remove('battle-mode-layout');
        };
    }, []);

    const saveState = (newInventories, newPlayerGold) => {
        updateData({ ...data, inventories: newInventories, playerGold: newPlayerGold });
    };

    const updatePlayerGold = (playerId, value) => {
        const amount = Math.max(0, parseInt(value) || 0);
        const newPlayerGold = { ...playerGold, [playerId]: amount };
        saveState(inventories, newPlayerGold);
    };

    const openGoldModal = (playerId) => {
        setGoldModal({ id: playerId });
        setGoldDelta('');
    };

    const applyGoldDelta = (playerId) => {
        const delta = parseInt(goldDelta) || 0;
        const current = playerGold[playerId] ?? 0;
        updatePlayerGold(playerId, current + delta);
        setGoldModal(null);
        setGoldDelta('');
    };

    const sections = players.map(p => ({ id: p.id, label: p.name }));

    const getItems = (sectionId) => {
        const invItems = inventories[sectionId] || [];
        const wondrousItems = data.equipped?.[sectionId]?.__wondrous__ || [];
        
        const merged = [...invItems];
        wondrousItems.forEach(wItem => {
            const exists = invItems.some(i => i.id === wItem.id || i.name === wItem.name);
            if (!exists) {
                merged.push({
                    id: wItem.id,
                    name: wItem.name,
                    category: wItem.category || '',
                    description: wItem.description,
                    quantity: 1,
                    weight: '',
                    type: 'wondrous',
                    rarity: wItem.rarity || 'Common',
                    modifiers: wItem.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                    setAttributes: wItem.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                    acBonus: wItem.acBonus || 0,
                    baseAC: wItem.baseAC !== undefined ? wItem.baseAC : 10,
                    acModifierStat: wItem.acModifierStat !== undefined ? wItem.acModifierStat : 'dex',
                    acModifierCap: wItem.acModifierCap !== undefined ? wItem.acModifierCap : null,
                    resistances: wItem.resistances || [],
                    immunities: wItem.immunities || [],
                    vulnerabilities: wItem.vulnerabilities || [],
                    ccResistances: wItem.ccResistances || [],
                    ccImmunities: wItem.ccImmunities || [],
                    ccVulnerabilities: wItem.ccVulnerabilities || [],
                    buffs: wItem.buffs || [],
                    isWondrousOnly: true
                });
            }
        });
        return merged;
    };

    const isItemEquipped = (playerId, item) => {
        const playerEquipped = data.equipped?.[playerId] || {};
        if (item.type === 'wondrous') {
            const wondrous = playerEquipped.__wondrous__ || [];
            return wondrous.some(w => w.id === item.id || w.name === item.name);
        } else if (item.type && item.type !== 'other' && item.type !== 'Consumables' && item.type !== 'Key Item' && item.type !== 'Loot') {
            const slotId = item.type;
            const currentSlot = playerEquipped[slotId] || {};
            return currentSlot.name === item.name;
        }
        return false;
    };

    const addItem = (sectionId) => {
        const newItem = { 
            id: Date.now().toString(), 
            name: 'New Item', 
            description: '', 
            quantity: 1, 
            weight: '',
            type: 'other',
            modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
            ...emptyItemExtras()
        };
        const sectionItems = [newItem, ...(inventories[sectionId] || [])];
        updateData({
            ...data,
            inventories: { ...inventories, [sectionId]: sectionItems }
        });
        setEditingItems(prev => ({ ...prev, [newItem.id]: { ...newItem } }));
    };

    const sortAlphabetically = (playerId) => {
        const inv = inventories[playerId] || [];
        const sorted = [...inv].sort((a, b) => a.name.localeCompare(b.name));
        saveState({ ...inventories, [playerId]: sorted }, playerGold);
    };

    const sortEquippedFirst = (playerId) => {
        const inv = inventories[playerId] || [];
        const sorted = [...inv].sort((a, b) => {
            const aEquipped = isItemEquipped(playerId, a);
            const bEquipped = isItemEquipped(playerId, b);
            if (aEquipped && !bEquipped) return -1;
            if (!aEquipped && bEquipped) return 1;
            return 0;
        });
        saveState({ ...inventories, [playerId]: sorted }, playerGold);
    };

    const moveItem = (playerId, index, direction) => {
        const inv = [...(inventories[playerId] || [])];
        if (direction === 'up' && index > 0) {
            const temp = inv[index];
            inv[index] = inv[index - 1];
            inv[index - 1] = temp;
        } else if (direction === 'down' && index < inv.length - 1) {
            const temp = inv[index];
            inv[index] = inv[index + 1];
            inv[index + 1] = temp;
        }
        saveState({ ...inventories, [playerId]: inv }, playerGold);
    };

    const startEditing = (item) => setEditingItems(prev => ({ ...prev, [item.id]: { ...item } }));

    const updateDraft = (itemId, field, value) => {
        setEditingItems(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    };

    const handleItemNameChange = (itemId: string, val: string) => {
        updateDraft(itemId, 'name', val);
        const compendiumMatch = compendiumItems.find(i => i.name.toLowerCase() === val.toLowerCase());
        if (compendiumMatch) {
            const parsed = parseItemText(compendiumMatch.description);
            setEditingItems(prev => {
                const newDraft = { ...prev[itemId] };
                if (compendiumMatch.description && !newDraft.description) newDraft.description = compendiumMatch.description;
                if (compendiumMatch.armorClass) newDraft.baseAC = compendiumMatch.armorClass;
                if (parsed.acBonus) newDraft.acBonus = parsed.acBonus;
                
                const mods = newDraft.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
                newDraft.modifiers = { ...mods, ...parsed.modifiers };
                
                const setAttrs = newDraft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
                newDraft.setAttributes = { ...setAttrs, ...parsed.attributes };
                
                const res = new Set([...(newDraft.resistances || []), ...parsed.resistances]);
                newDraft.resistances = Array.from(res);
                
                const imm = new Set([...(newDraft.immunities || []), ...parsed.immunities]);
                newDraft.immunities = Array.from(imm);
                
                return { ...prev, [itemId]: newDraft };
            });
        }
    };

    const saveItem = (sectionId, itemId) => {
        const draft = editingItems[itemId];
        if (!draft) return;
        
        if (draft.isWondrousOnly) {
            const equipped = data.equipped || {};
            const playerEquipped = equipped[sectionId] || {};
            const wondrous = playerEquipped.__wondrous__ || [];
            
            let newWondrous = wondrous;
            let finalInvItems = inventories[sectionId] || [];
            let updatedEquipped = { ...playerEquipped };
            
            if (draft.type !== 'wondrous') {
                newWondrous = wondrous.filter(w => w.id !== itemId);
                updatedEquipped.__wondrous__ = newWondrous;
                
                const newInvItem = {
                    id: draft.id,
                    name: draft.name,
                    category: draft.category || '',
                    description: draft.description,
                    quantity: 1,
                    weight: '',
                    type: draft.type,
                    rarity: draft.rarity || 'Common',
                    modifiers: draft.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                    setAttributes: draft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
                };
                finalInvItems = [...finalInvItems, newInvItem];
                
                if (draft.type && draft.type !== 'other' && draft.type !== 'Consumables' && draft.type !== 'Key Item' && draft.type !== 'Loot') {
                    const slotId = draft.type;
                    updatedEquipped[slotId] = {
                        name: draft.name,
                        description: draft.description,
                        rarity: draft.rarity || 'Common',
                        modifiers: draft.modifiers,
                        setAttributes: draft.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
                    };
                }
                
                updateData({
                    ...data,
                    inventories: { ...inventories, [sectionId]: finalInvItems },
                    equipped: {
                        ...equipped,
                        [sectionId]: updatedEquipped
                    }
                });
            } else {
                const updatedWondrous = wondrous.map(w => w.id === itemId ? {
                    id: draft.id,
                    name: draft.name,
                    category: draft.category || w.category || 'Inventory Wondrous',
                    description: draft.description,
                    rarity: draft.rarity || w.rarity || 'Common',
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
                } : w);
                updateData({
                    ...data,
                    equipped: {
                        ...equipped,
                        [sectionId]: {
                            ...playerEquipped,
                            __wondrous__: updatedWondrous
                        }
                    }
                });
            }
        } else {
            const currentItems = getItems(sectionId);
            const oldItem = currentItems.find(i => i.id === itemId);
            const sectionItems = currentItems.map(i => i.id === itemId ? { ...draft } : i);
            const finalInvItems = sectionItems.filter(i => !i.isWondrousOnly);
            
            let newEquipped = data.equipped || {};
            const playerEquipped = { ...(newEquipped[sectionId] || {}) };
            
            if (oldItem) {
                const wasEquipped = isItemEquipped(sectionId, oldItem);
                
                if (wasEquipped) {
                    if (oldItem.type !== draft.type) {
                        if (oldItem.type === 'wondrous') {
                            const wondrous = playerEquipped.__wondrous__ || [];
                            playerEquipped.__wondrous__ = wondrous.filter(w => w.id !== itemId && w.name !== oldItem.name);
                        } else if (oldItem.type && oldItem.type !== 'other' && oldItem.type !== 'Consumables' && oldItem.type !== 'Key Item' && oldItem.type !== 'Loot') {
                            const oldSlot = oldItem.type;
                            if (playerEquipped[oldSlot]?.name === oldItem.name) {
                                playerEquipped[oldSlot] = { name: '', description: '', modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } };
                            }
                        }
                    }
                    
                    if (draft.type === 'wondrous') {
                        const wondrous = playerEquipped.__wondrous__ || [];
                        const exists = wondrous.some(w => w.id === itemId || w.name === draft.name);
                        if (!exists) {
                            playerEquipped.__wondrous__ = [...wondrous, {
                                id: draft.id,
                                name: draft.name,
                                category: draft.category || 'Inventory Wondrous',
                                description: draft.description,
                                rarity: draft.rarity || 'Common',
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
                            }];
                        } else {
                            playerEquipped.__wondrous__ = wondrous.map(w => (w.id === itemId || w.name === oldItem.name) ? {
                                id: draft.id,
                                name: draft.name,
                                category: draft.category || w.category || 'Inventory Wondrous',
                                description: draft.description,
                                rarity: draft.rarity || w.rarity || 'Common',
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
                            } : w);
                        }
                    } else if (draft.type && draft.type !== 'other' && draft.type !== 'Consumables' && draft.type !== 'Key Item' && draft.type !== 'Loot') {
                        const slotId = draft.type;
                        playerEquipped[slotId] = {
                            name: draft.name,
                            description: draft.description,
                            rarity: draft.rarity || 'Common',
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
                        };
                    }
                }
            }
            
            updateData({
                ...data,
                inventories: { ...inventories, [sectionId]: finalInvItems },
                equipped: {
                    ...newEquipped,
                    [sectionId]: playerEquipped
                }
            });
        }
        setEditingItems(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
    };

    const cancelEdit = (itemId: string) => {
        setEditingItems(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
    };

    const removeItem = (sectionId, itemId) => {
        const itemToRemove = getItems(sectionId).find(i => i.id === itemId);
        if (!itemToRemove) return;
        
        let newEquipped = data.equipped || {};
        const playerEquipped = newEquipped[sectionId] || {};
        
        if (itemToRemove.type === 'wondrous') {
            const wondrous = playerEquipped.__wondrous__ || [];
            const newWondrous = wondrous.filter(w => w.id !== itemId && w.name !== itemToRemove.name);
            newEquipped = {
                ...newEquipped,
                [sectionId]: {
                    ...playerEquipped,
                    __wondrous__: newWondrous
                }
            };
        } else if (itemToRemove.type && itemToRemove.type !== 'other' && itemToRemove.type !== 'Consumables' && itemToRemove.type !== 'Key Item' && itemToRemove.type !== 'Loot') {
            const slotId = itemToRemove.type;
            if (playerEquipped[slotId]?.name === itemToRemove.name) {
                newEquipped = {
                    ...newEquipped,
                    [sectionId]: {
                        ...playerEquipped,
                        [slotId]: { name: '', description: '', modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }
                    }
                };
            }
        }
        
        if (itemToRemove.isWondrousOnly) {
            updateData({ ...data, equipped: newEquipped });
        } else {
            const sectionItems = (inventories[sectionId] || []).filter(i => i.id !== itemId);
            updateData({
                ...data,
                inventories: { ...inventories, [sectionId]: sectionItems },
                equipped: newEquipped
            });
        }
        cancelEdit(itemId);
    };

    const equipItem = (playerId, item) => {
        const equipped = data.equipped || {};
        const playerEquipped = equipped[playerId] || {};
        const isEquipped = isItemEquipped(playerId, item);
        
        if (isEquipped) {
            if (item.type === 'wondrous') {
                const wondrous = playerEquipped.__wondrous__ || [];
                const newWondrous = wondrous.filter(w => w.id !== item.id && w.name !== item.name);
                const newEquipped = {
                    ...equipped,
                    [playerId]: {
                        ...playerEquipped,
                        __wondrous__: newWondrous
                    }
                };
                
                if (item.isWondrousOnly) {
                    const newInvItem = {
                        ...item,
                        quantity: 1,
                        weight: ''
                    };
                    const sectionItems = [...(inventories[playerId] || []), newInvItem];
                    updateData({
                        ...data,
                        equipped: newEquipped,
                        inventories: { ...inventories, [playerId]: sectionItems }
                    });
                } else {
                    updateData({ ...data, equipped: newEquipped });
                }
            } else {
                const slotId = item.type;
                const newEquipped = {
                    ...equipped,
                    [playerId]: {
                        ...playerEquipped,
                        [slotId]: { name: '', description: '', modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }
                    }
                };
                updateData({ ...data, equipped: newEquipped });
            }
        } else {
            if (item.type === 'wondrous') {
                const wondrous = playerEquipped.__wondrous__ || [];
                const newItem = {
                    ...item,
                    category: item.category || 'Inventory Wondrous'
                };
                const newEquipped = {
                    ...equipped,
                    [playerId]: {
                        ...playerEquipped,
                        __wondrous__: [...wondrous, newItem]
                    }
                };
                updateData({ ...data, equipped: newEquipped });
            } else {
                const slotId = item.type;
                const newItem = {
                    ...item
                };
                const newEquipped = {
                    ...equipped,
                    [playerId]: {
                        ...playerEquipped,
                        [slotId]: newItem
                    }
                };
                updateData({ ...data, equipped: newEquipped });
            }
        }
    };

    const { items: compendiumItems } = useCompendiumItems();

    return (
        <div className="equipment-tab">
            <datalist id="compendium-items-list">
                {compendiumItems.map((item, idx) => (
                    <option key={idx} value={item.name} />
                ))}
            </datalist>
            {/* GOLD MODAL */}
            {goldModal && (
                <div className="global-modal-overlay" onClick={() => setGoldModal(null)}>
                    <div className="damage-heal-popup glass-panel" onClick={e => e.stopPropagation()}>
                        <h3>Gold: {players.find(p => p.id === goldModal.id)?.name}</h3>
                        <p className="dh-hint" style={{ marginBottom: '0.5rem' }}>
                            Current: <strong style={{ color: '#fbbf24' }}>{playerGold[goldModal.id] ?? 0} GP</strong>
                            &nbsp;·&nbsp; Positive = Add &nbsp;·&nbsp; Negative = Spend
                        </p>
                        <input
                            type="number"
                            className="input global-dh-input"
                            value={goldDelta}
                            onChange={e => setGoldDelta(e.target.value)}
                            onWheel={e => {
                                e.preventDefault();
                                setGoldDelta(prev => String((parseInt(prev) || 0) + Math.sign(e.deltaY) * -1));
                            }}
                            onKeyDown={e => {
                                if (e.key === 'ArrowUp') setGoldDelta(prev => String((parseInt(prev) || 0) + 1));
                                if (e.key === 'ArrowDown') setGoldDelta(prev => String((parseInt(prev) || 0) - 1));
                                if (e.key === 'Enter') applyGoldDelta(goldModal.id);
                            }}
                            placeholder="0"
                            autoFocus
                            style={{
                                color: parseInt(goldDelta) < 0 ? '#f87171' : parseInt(goldDelta) > 0 ? '#fbbf24' : 'inherit',
                                fontWeight: 700, fontSize: '1.6rem', textAlign: 'center'
                            }}
                        />
                        <div className="popup-actions">
                            <button className="btn btn-success" onClick={() => applyGoldDelta(goldModal.id)}>Apply</button>
                            <button className="btn" onClick={() => setGoldModal(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="equipment-header">
                <h2>Party Inventory</h2>
            </div>

            <div className="inventory-grid">
                {sections.map(section => {
                    const items = getItems(section.id);
                    const gold = playerGold[section.id] ?? 0;
                    return (
                        <div key={section.id} className="inventory-section glass-panel">
                            <div className="inventory-header">
                                <h3>{section.label}</h3>
                                <button className="btn btn-primary" onClick={() => addItem(section.id)}>Add Item</button>
                            </div>

                            {/* SORT TOOLBAR */}
                            <div className="inventory-sort-bar">
                                <span className="sort-label">Sort:</span>
                                <button className="btn sort-btn" onClick={() => sortAlphabetically(section.id)} title="Sort Alphabetically">🔤 A-Z</button>
                                <button className="btn sort-btn" onClick={() => sortEquippedFirst(section.id)} title="Sort Equipped First">🛡️ Equipped First</button>
                            </div>

                            {/* PER-PLAYER GOLD ROW */}
                            <div className="gold-row">
                                <span className="gold-row-icon">💰</span>
                                <span className="gold-row-label">Gold (GP)</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="input gold-row-input"
                                    value={gold}
                                    onChange={e => updatePlayerGold(section.id, e.target.value)}
                                    onWheel={e => {
                                        e.preventDefault();
                                        updatePlayerGold(section.id, gold + Math.sign(e.deltaY) * -1);
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'ArrowUp') updatePlayerGold(section.id, gold + 1);
                                        if (e.key === 'ArrowDown') updatePlayerGold(section.id, Math.max(0, gold - 1));
                                    }}
                                />
                                <button
                                    className="btn gold-adjust-btn"
                                    onClick={() => openGoldModal(section.id)}
                                    title="Add or spend gold"
                                >+/−</button>
                            </div>

                            {items.length === 0 ? (
                                <p className="inv-empty">No items yet.</p>
                            ) : (
                                <div className="items-list">
                                    {items.map(item => {
                                        const draft = editingItems[item.id];
                                        const isEditing = !!draft;
                                        const display = isEditing ? draft : item;
                                        const invIndex = (inventories[section.id] || []).findIndex(i => i.id === item.id);

                                        return (
                                            <div key={item.id} className={`item-row ${isEditing ? 'item-row-editing' : ''} ${item.isWondrousOnly ? 'wondrous-only-row' : ''}`}>
                                                <div className="item-row-main" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                                    {isEditing ? (
                                                        <>
                                                            {/* Row 1: Manual ordering arrows, Item Name (input) */}
                                                            <div className="item-row-line1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                                                {invIndex !== -1 && (
                                                                    <div className="item-reorder-controls" style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                                                        <button className="reorder-arrow-btn" disabled={true}>▲</button>
                                                                        <button className="reorder-arrow-btn" disabled={true}>▼</button>
                                                                    </div>
                                                                )}
                                                                <input className="input item-name-input" value={display.name}
                                                                    onChange={e => handleItemNameChange(item.id, e.target.value)}
                                                                    list="compendium-items-list"
                                                                    placeholder="Item Name"
                                                                    style={{ fontWeight: 600, fontSize: '0.95rem', flex: 1 }} />
                                                            </div>

                                                            {/* Row 2: Item Type dropdown, Rarity selector, Quantity, Weight, Save/Cancel, Remove */}
                                                            <div className="item-row-line2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '150px', flexShrink: 0 }}>
                                                                    <select
                                                                        className="input item-type-select"
                                                                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', width: '100%' }}
                                                                        value={display.type || 'other'}
                                                                        onChange={e => updateDraft(item.id, 'type', e.target.value)}
                                                                    >
                                                                        <option value="other">Other / General</option>
                                                                        <option value="Consumables">Consumables</option>
                                                                        <option value="Key Item">Key Item</option>
                                                                        <option value="Loot">Loot / Valuables</option>
                                                                        <optgroup label="Equipable Slots">
                                                                            <option value="head">🎩 Head</option>
                                                                            <option value="neck">📿 Neck</option>
                                                                            <option value="armor">🥋 Armor</option>
                                                                            <option value="mainHand">⚔️ Main Hand</option>
                                                                            <option value="mainHand2">💍 Ring 1 (Main Hand 2)</option>
                                                                            <option value="offhand">🛡️ Offhand</option>
                                                                            <option value="offhand2">💍 Ring 2 (Offhand 2)</option>
                                                                            <option value="waist">🎗️ Waist</option>
                                                                            <option value="feet">👢 Feet</option>
                                                                            <option value="gloves">🧤 Gloves</option>
                                                                            <option value="wondrous">✨ Wondrous Item</option>
                                                                        </optgroup>
                                                                    </select>
                                                                    <select
                                                                        className="input item-rarity-select"
                                                                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', width: '100%' }}
                                                                        value={display.rarity || 'Common'}
                                                                        onChange={e => updateDraft(item.id, 'rarity', e.target.value)}
                                                                    >
                                                                        <option value="Common">Common</option>
                                                                        <option value="Uncommon">Uncommon</option>
                                                                        <option value="Rare">Rare</option>
                                                                        <option value="Very Rare">Very Rare</option>
                                                                        <option value="Legendary">Legendary</option>
                                                                        <option value="Mythic/Artifact">Mythic/Artifact</option>
                                                                    </select>
                                                                </div>

                                                                <div className="item-row-right-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                                    <div className="item-qty-weight" style={{ flexShrink: 0 }}>
                                                                        <label>Qty</label>
                                                                        <input type="number" min="0" className="input item-qty-input"
                                                                            value={display.quantity} disabled={display.isWondrousOnly}
                                                                            onChange={e => updateDraft(item.id, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                                                                            onWheel={!display.isWondrousOnly ? e => {
                                                                                e.preventDefault();
                                                                                updateDraft(item.id, 'quantity', Math.max(0, (display.quantity || 0) + Math.sign(e.deltaY) * -1));
                                                                            } : undefined} />
                                                                        <label>Wt</label>
                                                                        <input type="number" min="0" step="0.1" className="input item-weight-input"
                                                                            value={display.weight} disabled={display.isWondrousOnly} placeholder="—"
                                                                            onChange={e => updateDraft(item.id, 'weight', e.target.value)} />
                                                                    </div>

                                                                    <div className="item-row-actions" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                                                                        <button className="btn btn-success small-btn" onClick={() => saveItem(section.id, item.id)}>Save</button>
                                                                        <button className="btn small-btn" onClick={() => cancelEdit(item.id)}>Cancel</button>
                                                                        <button className="delete-btn" onClick={() => removeItem(section.id, item.id)}>×</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Row 1: Manual ordering arrows, Item Name (display) */}
                                                            <div className="item-row-line1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                                                {invIndex !== -1 && (
                                                                    <div className="item-reorder-controls" style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                                                        <button 
                                                                            className="reorder-arrow-btn" 
                                                                            onClick={() => moveItem(section.id, invIndex, 'up')}
                                                                            disabled={invIndex === 0}
                                                                            title="Move Up"
                                                                        >▲</button>
                                                                        <button 
                                                                            className="reorder-arrow-btn" 
                                                                            onClick={() => moveItem(section.id, invIndex, 'down')}
                                                                            disabled={invIndex === (inventories[section.id] || []).length - 1}
                                                                            title="Move Down"
                                                                        >▼</button>
                                                                    </div>
                                                                )}
                                                                <span className="item-name-label" style={{ fontWeight: 600 }}>
                                                                    {item.name}
                                                                </span>
                                                            </div>

                                                            {/* Row 2: Item Type tag, Modifiers tag, Quantity, Weight, Equip button, Edit button, Delete button */}
                                                            <div className="item-row-line2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                                                <span className="item-type-badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '4px', textTransform: 'capitalize', flexShrink: 0, ...getRarityBadgeStyle(item.rarity || 'Common') }}>
                                                                    {item.type === 'other' ? 'Other' : item.type === 'mainHand' ? 'Main Hand' : item.type === 'mainHand2' ? 'Ring 1' : item.type === 'offhand' ? 'Offhand' : item.type === 'offhand2' ? 'Ring 2' : item.type}
                                                                </span>

                                                                {item.modifiers && Object.values(item.modifiers).some(v => v !== 0) && (
                                                                    <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', flexShrink: 0 }}>
                                                                        {['str', 'dex', 'con', 'int', 'wis', 'cha'].filter(s => item.modifiers[s] !== 0).map(s => `${s.toUpperCase()} ${item.modifiers[s] > 0 ? '+' : ''}${item.modifiers[s]}`).join(', ')}
                                                                    </span>
                                                                )}

                                                                {item.setAttributes && Object.values(item.setAttributes).some(v => v !== 0) && (
                                                                    <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '4px', flexShrink: 0 }}>
                                                                        {['str', 'dex', 'con', 'int', 'wis', 'cha'].filter(s => item.setAttributes[s] !== 0).map(s => `SET ${s.toUpperCase()} = ${item.setAttributes[s]}`).join(', ')}
                                                                    </span>
                                                                )}

                                                                <div className="item-row-right-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                                    <div className="item-qty-weight" style={{ flexShrink: 0 }}>
                                                                        <label>Qty</label>
                                                                        <input type="number" min="0" className="input item-qty-input"
                                                                            value={display.quantity} disabled={true} />
                                                                        <label>Wt</label>
                                                                        <input type="number" min="0" step="0.1" className="input item-weight-input"
                                                                            value={display.weight} disabled={true} placeholder="—" />
                                                                    </div>

                                                                    <div className="item-row-actions" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                                                                        {['head', 'neck', 'armor', 'mainHand', 'mainHand2', 'offhand', 'offhand2', 'waist', 'feet', 'gloves', 'wondrous'].includes(item.type) && (
                                                                            (() => {
                                                                                const isEquipped = isItemEquipped(section.id, item);
                                                                                return (
                                                                                    <button 
                                                                                        className={`btn small-btn ${isEquipped ? 'btn-success' : 'btn-primary'}`} 
                                                                                        onClick={() => equipItem(section.id, item)}
                                                                                        style={{ 
                                                                                            padding: '0.3rem 0.65rem', 
                                                                                            fontSize: '0.78rem', 
                                                                                            background: isEquipped ? '#10b981' : 'var(--primary)', 
                                                                                            borderColor: isEquipped ? '#10b981' : 'var(--primary)',
                                                                                            color: '#fff'
                                                                                        }}
                                                                                    >
                                                                                        {isEquipped ? '🛡️ Equipped' : '🛡️ Equip'}
                                                                                    </button>
                                                                                );
                                                                            })()
                                                                        )}
                                                                        <button className="btn small-btn" onClick={() => startEditing(item)}>Edit</button>
                                                                        <button className="delete-btn" onClick={() => removeItem(section.id, item.id)}>×</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Stat Modifiers & Item Properties Editor */}
                                                    {isEditing && EQUIPPABLE_TYPES.includes(display.type) && (
                                                        <div style={{ marginTop: '0.25rem', width: '100%' }}>
                                                            {/* Stat modifiers row */}
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item Stat Modifiers</span>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => {
                                                                    const currentMods = display.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
                                                                    return (
                                                                        <div key={stat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '4px', padding: '0.15rem' }}>
                                                                            <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{stat}</span>
                                                                            <input
                                                                                type="number"
                                                                                className="input"
                                                                                style={{ padding: '0.05rem', textAlign: 'center', fontSize: '0.75rem', height: '22px', border: 'none', background: 'transparent' }}
                                                                                value={currentMods[stat] || 0}
                                                                                onChange={e => {
                                                                                    const val = parseInt(e.target.value) || 0;
                                                                                    updateDraft(item.id, 'modifiers', { ...currentMods, [stat]: val });
                                                                                }}
                                                                                onWheel={e => {
                                                                                    e.preventDefault();
                                                                                    const dir = Math.sign(e.deltaY) * -1;
                                                                                    updateDraft(item.id, 'modifiers', { ...currentMods, [stat]: (currentMods[stat] || 0) + dir });
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div style={{ marginTop: '0.4rem' }}>
                                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Set Attributes</span>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                                    {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => {
                                                                        const currentSet = display.setAttributes || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
                                                                        return (
                                                                            <div key={stat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '4px', padding: '0.15rem' }}>
                                                                                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{stat}</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="input"
                                                                                    placeholder="-"
                                                                                    style={{ padding: '0.05rem', textAlign: 'center', fontSize: '0.75rem', height: '22px', border: 'none', background: 'transparent' }}
                                                                                    value={currentSet[stat] || ''}
                                                                                    onChange={e => {
                                                                                        const val = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                                                                        updateDraft(item.id, 'setAttributes', { ...currentSet, [stat]: val });
                                                                                    }}
                                                                                    onWheel={e => {
                                                                                        e.preventDefault();
                                                                                        const dir = Math.sign(e.deltaY) * -1;
                                                                                        const currentVal = currentSet[stat] || 0;
                                                                                        const nextVal = Math.max(0, currentVal + dir);
                                                                                        updateDraft(item.id, 'setAttributes', { ...currentSet, [stat]: nextVal });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Armor-specific properties vs AC Bonus */}
                                                            {display.type === 'armor' ? (
                                                                <div style={{ marginTop: '0.4rem', display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '0.4rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Base AC</span>
                                                                        <input
                                                                            type="number"
                                                                            className="input"
                                                                            style={{ padding: '0.05rem', textAlign: 'center', fontSize: '0.75rem', height: '22px', width: '100%' }}
                                                                            value={display.baseAC !== undefined ? display.baseAC : 10}
                                                                            onChange={e => updateDraft(item.id, 'baseAC', parseInt(e.target.value) || 0)}
                                                                        />
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Mod</span>
                                                                        <select
                                                                            className="input"
                                                                            style={{ fontSize: '0.72rem', padding: '0.05rem 0.2rem', height: '22px', width: '100%' }}
                                                                            value={display.acModifierStat !== undefined ? display.acModifierStat : 'dex'}
                                                                            onChange={e => updateDraft(item.id, 'acModifierStat', e.target.value)}
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
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Cap</span>
                                                                        <input
                                                                            type="number"
                                                                            className="input"
                                                                            placeholder="No Cap"
                                                                            style={{ padding: '0.05rem', textAlign: 'center', fontSize: '0.75rem', height: '22px', width: '100%' }}
                                                                            value={display.acModifierCap !== undefined && display.acModifierCap !== null ? display.acModifierCap : ''}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                updateDraft(item.id, 'acModifierCap', val === '' ? null : parseInt(val));
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>AC Bonus</span>
                                                                    <input
                                                                        type="number"
                                                                        className="input"
                                                                        style={{ padding: '0.05rem', textAlign: 'center', fontSize: '0.75rem', height: '22px', width: '56px' }}
                                                                        value={display.acBonus || 0}
                                                                        onChange={e => updateDraft(item.id, 'acBonus', parseInt(e.target.value) || 0)}
                                                                        onWheel={e => {
                                                                            e.preventDefault();
                                                                            updateDraft(item.id, 'acBonus', (display.acBonus || 0) + Math.sign(e.deltaY) * -1);
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Damage Resistance/Immunity/Vulnerability */}
                                                            {[{ key: 'resistances', label: 'Dmg Resistances', color: '#60a5fa' }, { key: 'immunities', label: 'Dmg Immunities', color: '#a78bfa' }, { key: 'vulnerabilities', label: 'Dmg Vulnerabilities', color: '#f87171' }].map(({ key, label, color }) => (
                                                                <div key={key} style={{ marginTop: '0.35rem' }}>
                                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem', alignItems: 'center' }}>
                                                                        {(display[key] || []).map(r => (
                                                                            <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.68rem', color }}>
                                                                                {r}
                                                                                <button type="button" onClick={() => updateDraft(item.id, key, (display[key] || []).filter(x => x !== r))} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, fontSize: '0.7rem', lineHeight: 1 }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input"
                                                                            style={{ fontSize: '0.68rem', padding: '0.05rem 0.2rem', height: '20px', minWidth: '60px' }}
                                                                            value=""
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                if (val && !(display[key] || []).includes(val)) {
                                                                                    updateDraft(item.id, key, [...(display[key] || []), val]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {DAMAGE_TYPES.filter(t => !(display[key] || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* CC Resistance/Immunity/Vulnerability */}
                                                            {[{ key: 'ccResistances', label: 'CC Resistances', color: '#34d399' }, { key: 'ccImmunities', label: 'CC Immunities', color: '#a78bfa' }, { key: 'ccVulnerabilities', label: 'CC Vulnerabilities', color: '#fb923c' }].map(({ key, label, color }) => (
                                                                <div key={key} style={{ marginTop: '0.35rem' }}>
                                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem', alignItems: 'center' }}>
                                                                        {(display[key] || []).map(r => (
                                                                            <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.68rem', color }}>
                                                                                {r}
                                                                                <button type="button" onClick={() => updateDraft(item.id, key, (display[key] || []).filter(x => x !== r))} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, fontSize: '0.7rem', lineHeight: 1 }}>×</button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="input"
                                                                            style={{ fontSize: '0.68rem', padding: '0.05rem 0.2rem', height: '20px', minWidth: '60px' }}
                                                                            value=""
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                if (val && !(display[key] || []).includes(val)) {
                                                                                    updateDraft(item.id, key, [...(display[key] || []), val]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Add</option>
                                                                            {ALL_CC_EFFECTS.filter(t => !(display[key] || []).includes(t)).map(t => (
                                                                                <option key={t} value={t}>{t}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {/* Buffs & Debuffs */}
                                                            <div style={{ marginTop: '0.35rem' }}>
                                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Buffs &amp; Debuffs</span>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem', alignItems: 'center' }}>
                                                                    {(display.buffs || []).map(b => (
                                                                        <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '12px', padding: '0 0.4rem', fontSize: '0.68rem', color: '#34d399' }}>
                                                                            {b}
                                                                            <button type="button" onClick={() => updateDraft(item.id, 'buffs', (display.buffs || []).filter(x => x !== b))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', padding: 0, fontSize: '0.7rem', lineHeight: 1 }}>×</button>
                                                                        </span>
                                                                    ))}
                                                                    {(() => {
                                                                        const filteredBuffs = buffsDatabase
                                                                            .filter(b => !(display.buffs || []).includes(b.name))
                                                                            .filter(b => b.name.toLowerCase().includes(buffSearchQuery.toLowerCase()));
                                                                        return (
                                                                            <div className="searchable-buff-selector" style={{ position: 'relative', display: 'inline-block' }}>
                                                                                {isBuffDropdownOpen !== item.id ? (
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
                                                                                            setIsBuffDropdownOpen(item.id);
                                                                                            setBuffSearchQuery('');
                                                                                            setQuickBuffName('');
                                                                                            setQuickBuffDesc('');
                                                                                        }}
                                                                                    >
                                                                                        Add Buff
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
                                                                                                value={buffSearchQuery} 
                                                                                                onChange={(e) => {
                                                                                                    setBuffSearchQuery(e.target.value);
                                                                                                    setQuickBuffName(e.target.value);
                                                                                                }} 
                                                                                                style={{ fontSize: '0.68rem', padding: '0.2rem', height: '22px', flex: 1 }}
                                                                                                autoFocus
                                                                                            />
                                                                                            <button 
                                                                                                type="button" 
                                                                                                className="btn" 
                                                                                                onClick={() => setIsBuffDropdownOpen(null)}
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
                                                                                                        updateDraft(item.id, 'buffs', [...(display.buffs || []), b.name]);
                                                                                                        setIsBuffDropdownOpen(null);
                                                                                                    }}
                                                                                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                                                                                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
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
                                                                                                value={quickBuffName}
                                                                                                onChange={e => setQuickBuffName(e.target.value)}
                                                                                                style={{ fontSize: '0.68rem', padding: '0.15rem', height: '20px' }}
                                                                                            />
                                                                                            <textarea 
                                                                                                placeholder="Description..." 
                                                                                                className="input"
                                                                                                value={quickBuffDesc}
                                                                                                onChange={e => setQuickBuffDesc(e.target.value)}
                                                                                                style={{ fontSize: '0.68rem', padding: '0.15rem', height: '36px', resize: 'none' }}
                                                                                            />
                                                                                            <button 
                                                                                                type="button" 
                                                                                                className="btn btn-success" 
                                                                                                style={{ fontSize: '0.65rem', padding: '0.1rem 0.2rem', height: '20px', background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                                                                                                onClick={() => {
                                                                                                    if (!quickBuffName.trim()) {
                                                                                                        alert("Please enter a buff name.");
                                                                                                        return;
                                                                                                    }
                                                                                                    if (buffsDatabase.some(b => b.name.toLowerCase() === quickBuffName.trim().toLowerCase())) {
                                                                                                        alert("A buff with this name already exists.");
                                                                                                        return;
                                                                                                    }
                                                                                                    const newBuff = {
                                                                                                        id: 'buff_' + Date.now(),
                                                                                                        name: quickBuffName.trim(),
                                                                                                        type: 'fixed',
                                                                                                        description: quickBuffDesc.trim()
                                                                                                    };
                                                                                                    updateBuffsDatabase([...buffsDatabase, newBuff]);
                                                                                                    updateDraft(item.id, 'buffs', [...(display.buffs || []), newBuff.name]);
                                                                                                    setIsBuffDropdownOpen(null);
                                                                                                    setQuickBuffName('');
                                                                                                    setQuickBuffDesc('');
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
                                                    )}
                                                </div>

                                                {isEditing ? (
                                                    <textarea className="input item-desc" value={display.description}
                                                        onChange={e => updateDraft(item.id, 'description', e.target.value)}
                                                        placeholder="Item description..." rows={2} style={{ marginTop: '0.5rem' }} />
                                                ) : (
                                                    item.description && <p className="item-desc-preview" style={{ marginTop: '0.25rem' }}>{item.description}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
