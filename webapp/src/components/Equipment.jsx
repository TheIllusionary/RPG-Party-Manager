import React, { useState, useEffect } from 'react';
import './Equipment.css';

export default function Equipment({ data, updateData, players }) {
    const isArray = Array.isArray(data);
    const inventories = isArray ? {} : data.inventories || {};
    const playerGold = isArray ? {} : data.playerGold || {};

    const [editingItems, setEditingItems] = useState({});
    // Gold modal: { playerId, amount }
    const [goldModal, setGoldModal] = useState(null); // { id: playerId }
    const [goldDelta, setGoldDelta] = useState('');

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
                    modifiers: wItem.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
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
            modifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
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
                    modifiers: draft.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
                };
                finalInvItems = [...finalInvItems, newInvItem];
                
                if (draft.type && draft.type !== 'other' && draft.type !== 'Consumables' && draft.type !== 'Key Item' && draft.type !== 'Loot') {
                    const slotId = draft.type;
                    updatedEquipped[slotId] = {
                        name: draft.name,
                        description: draft.description,
                        modifiers: draft.modifiers
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
                    modifiers: draft.modifiers
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
                                modifiers: draft.modifiers
                            }];
                        } else {
                            playerEquipped.__wondrous__ = wondrous.map(w => (w.id === itemId || w.name === oldItem.name) ? {
                                id: draft.id,
                                name: draft.name,
                                category: draft.category || w.category || 'Inventory Wondrous',
                                description: draft.description,
                                modifiers: draft.modifiers
                            } : w);
                        }
                    } else if (draft.type && draft.type !== 'other' && draft.type !== 'Consumables' && draft.type !== 'Key Item' && draft.type !== 'Loot') {
                        const slotId = draft.type;
                        playerEquipped[slotId] = {
                            name: draft.name,
                            description: draft.description,
                            modifiers: draft.modifiers
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

    const cancelEdit = (itemId) => {
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
                        id: item.id,
                        name: item.name,
                        category: item.category || '',
                        description: item.description,
                        quantity: 1,
                        weight: '',
                        type: 'wondrous',
                        modifiers: item.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
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
                    id: item.id,
                    name: item.name,
                    category: item.category || 'Inventory Wondrous',
                    description: item.description,
                    modifiers: item.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
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
                    name: item.name,
                    description: item.description,
                    modifiers: item.modifiers || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
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

    return (
        <div className="equipment-tab">
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
                                <button className="btn btn-primary" onClick={() => addItem(section.id)}>+ Add Item</button>
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
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
                                                        {isEditing ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
                                                                <input className="input item-name-input" value={display.name}
                                                                    onChange={e => updateDraft(item.id, 'name', e.target.value)}
                                                                    placeholder="Item Name" />
                                                                <select
                                                                    className="input item-type-select"
                                                                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
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
                                                                        <option value="torso">🥋 Torso</option>
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
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                                                                {invIndex !== -1 && (
                                                                    <div className="item-reorder-controls">
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
                                                                <span className="item-name-label" style={{ fontWeight: 600 }}>{item.name}</span>
                                                                {item.type && item.type !== 'other' && (
                                                                    <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', textTransform: 'capitalize' }}>
                                                                        {item.type === 'mainHand' ? 'Main Hand' : item.type === 'mainHand2' ? 'Ring 1' : item.type === 'offhand' ? 'Offhand' : item.type === 'offhand2' ? 'Ring 2' : item.type}
                                                                    </span>
                                                                )}
                                                                {item.modifiers && Object.values(item.modifiers).some(v => v !== 0) && (
                                                                    <span style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px' }}>
                                                                        {['str', 'dex', 'con', 'int', 'wis', 'cha'].filter(s => item.modifiers[s] !== 0).map(s => `${s.toUpperCase()} ${item.modifiers[s] > 0 ? '+' : ''}${item.modifiers[s]}`).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="item-qty-weight" style={{ flexShrink: 0 }}>
                                                            <label>Qty</label>
                                                            <input type="number" min="0" className="input item-qty-input"
                                                                value={display.quantity} disabled={!isEditing || display.isWondrousOnly}
                                                                onChange={e => updateDraft(item.id, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                                                                onWheel={isEditing && !display.isWondrousOnly ? e => {
                                                                    e.preventDefault();
                                                                    updateDraft(item.id, 'quantity', Math.max(0, (display.quantity || 0) + Math.sign(e.deltaY) * -1));
                                                                } : undefined} />
                                                            <label>Wt</label>
                                                            <input type="number" min="0" step="0.1" className="input item-weight-input"
                                                                value={display.weight} disabled={!isEditing || display.isWondrousOnly} placeholder="—"
                                                                onChange={e => updateDraft(item.id, 'weight', e.target.value)} />
                                                        </div>

                                                        <div className="item-row-actions" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                            {!isEditing && ['head', 'neck', 'torso', 'mainHand', 'mainHand2', 'offhand', 'offhand2', 'waist', 'feet', 'gloves', 'wondrous'].includes(item.type) && (
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
                                                            {isEditing ? (
                                                                <>
                                                                    <button className="btn btn-success small-btn" onClick={() => saveItem(section.id, item.id)}>Save</button>
                                                                    <button className="btn small-btn" onClick={() => cancelEdit(item.id)}>Cancel</button>
                                                                </>
                                                            ) : (
                                                                <button className="btn small-btn" onClick={() => startEditing(item)}>Edit</button>
                                                            )}
                                                            <button className="delete-btn" onClick={() => removeItem(section.id, item.id)}>×</button>
                                                        </div>
                                                    </div>

                                                    {/* Stat Modifiers Editor */}
                                                    {isEditing && ['head', 'neck', 'torso', 'mainHand', 'mainHand2', 'offhand', 'offhand2', 'waist', 'feet', 'gloves', 'wondrous'].includes(display.type) && (
                                                        <div style={{ marginTop: '0.25rem', width: '100%' }}>
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
