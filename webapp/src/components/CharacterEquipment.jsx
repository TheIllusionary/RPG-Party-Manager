import React, { useState } from 'react';
import './CharacterEquipment.css';

const SLOT_DEFS = [
    { id: 'head', label: 'Head', icon: '⛑️', hint: 'Helmet' },
    { id: 'neck', label: 'Neck', icon: '📿', hint: 'Necklace / Amulet' },
    { id: 'torso', label: 'Torso', icon: '🥋', hint: 'Armor / Robe' },
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
    modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
});

const newWondrousItem = () => ({
    id: Date.now().toString(),
    name: 'New Wondrous Item',
    category: '',
    description: '',
    modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
});

const getPlayerEquipment = (equipped, playerId) => {
    const base = equipped?.[playerId] || {};
    const result = {};
    SLOT_DEFS.forEach(s => {
        result[s.id] = base[s.id] || emptySlot();
    });
    return result;
};

// Slot positions in the paper doll (left%, top%) — calibrated to arms-down silhouette
const SLOT_POSITIONS = {
    head: { left: '50%', top: '12%', anchor: 'top-center' }, // +10%
    neck: { left: '50%', top: '21%', anchor: 'top-center' }, // +5%
    torso: { left: '50%', top: '32%', anchor: 'top-center' },
    mainHand: { left: '73%', top: '48%', anchor: 'right' },      // left 5%
    mainHand2: { left: '73%', top: '55%', anchor: 'right' },      // left 5%, up 5%
    offhand: { left: '27%', top: '48%', anchor: 'left' },       // right 5%
    offhand2: { left: '27%', top: '55%', anchor: 'left' },       // right 5%, up 5%
    waist: { left: '50%', top: '48%', anchor: 'top-center' }, // -5%
    feet: { left: '50%', top: '87%', anchor: 'top-center' },
    gloves: { left: '27%', top: '38%', anchor: 'left' },
};

export default function CharacterEquipment({ data, updateData, players }) {
    const equipped = data?.equipped || {};
    const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || '');
    const [openSlot, setOpenSlot] = useState(null); // slot id currently expanded
    const [editingWondrous, setEditingWondrous] = useState({}); // { [itemId]: draftItem }
    const [slotDraft, setSlotDraft] = useState(null); // { slotId, name, description, modifiers }

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

    const saveSlotItem = () => {
        if (!slotDraft || !openSlot) return;

        const newSlotData = {
            name: slotDraft.name,
            description: slotDraft.description,
            modifiers: slotDraft.modifiers
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
                    modifiers: slotDraft.modifiers
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
                    type: openSlot
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

    const saveWondrousItem = (itemId) => {
        const draft = editingWondrous[itemId];
        if (!draft) return;
        const updated = wondrousItems.map(i => i.id === itemId ? { ...draft } : i);
        
        // Update item in inventory if it exists there
        const invItems = data.inventories?.[selectedPlayerId] || [];
        const existsInInv = invItems.some(i => i.id === itemId);
        
        if (existsInInv) {
            const updatedInv = invItems.map(i => i.id === itemId ? {
                ...i,
                name: draft.name,
                description: draft.description,
                modifiers: draft.modifiers
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
        let total = 0;
        SLOT_DEFS.forEach(s => {
            total += playerEquip[s.id]?.modifiers?.[stat] || 0;
        });
        wondrousItems.forEach(w => {
            total += w.modifiers?.[stat] || 0;
        });
        acc[stat] = total;
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
                modifiers: current.modifiers ? { ...current.modifiers } : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
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

            {/* Stat bonuses summary strip */}
            <div className="equip-bonus-strip glass-panel">
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
