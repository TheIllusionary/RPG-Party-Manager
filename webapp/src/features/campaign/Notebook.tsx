// @ts-nocheck — TODO: type notebook page form fields
import React, { useState } from 'react';
import './Notebook.css';

import type { INotebookPage } from '../../types';

export default function Notebook({ notebookData, updateNotebookData }: { notebookData: { pages: INotebookPage[] }; updateNotebookData: (d: { pages: INotebookPage[] }) => void }) {
    const pages = notebookData.pages || [];
    const [selectedPageId, setSelectedPageId] = useState(null);
    const [activeType, setActiveType] = useState('quest'); // 'quest' or 'note'
    const [isListExpanded, setIsListExpanded] = useState(true);

    const handleSelectTab = (type) => {
        if (activeType === type) {
            // Clicked active tab icon, toggle collapse
            setIsListExpanded(prev => !prev);
        } else {
            // Clicked different tab icon, switch tab and ensure list is open
            setActiveType(type);
            setIsListExpanded(true);
        }
    };

    const addPage = () => {
        const newPage = {
            id: Date.now().toString(),
            title: `New ${activeType === 'quest' ? 'Quest' : 'Note'}`,
            content: '',
            type: activeType,
            createdAt: Date.now()
        };
        const newPages = [...pages, newPage];
        updateNotebookData({ pages: newPages });
        setSelectedPageId(newPage.id);
        setIsListExpanded(true);
    };

    const updatePage = (id, field, value) => {
        const newPages = pages.map(p => p.id === id ? { ...p, [field]: value } : p);
        updateNotebookData({ pages: newPages });
    };

    const deletePage = (id) => {
        if (window.confirm("Are you sure you want to delete this page?")) {
            const newPages = pages.filter(p => p.id !== id);
            updateNotebookData({ pages: newPages });
            if (selectedPageId === id) {
                setSelectedPageId(newPages.length > 0 ? newPages[0].id : null);
            }
        }
    };

    const filteredPages = pages.filter(p => p.type === activeType);
    const selectedPage = pages.find(p => p.id === selectedPageId);

    // If selected page is not in the active type, deselect it or select the first of active type
    const currentActivePage = (selectedPage && selectedPage.type === activeType) ? selectedPage : null;

    return (
        <div className="notebook-container glass-panel">
            {/* 1. Sidebar column */}
            <div className="notebook-sidebar">
                <button
                    className={`notebook-sidebar-btn ${activeType === 'quest' ? 'active' : ''}`}
                    onClick={() => handleSelectTab('quest')}
                    title="Quest Log"
                >
                    <span className="icon">📜</span>
                    <span className="label">Quests</span>
                </button>
                <button
                    className={`notebook-sidebar-btn ${activeType === 'note' ? 'active' : ''}`}
                    onClick={() => handleSelectTab('note')}
                    title="Notes & Lore"
                >
                    <span className="icon">📝</span>
                    <span className="label">Notes</span>
                </button>
            </div>

            {/* 2. Collapsible List column */}
            <div className={`notebook-list-panel ${isListExpanded ? 'expanded' : 'collapsed'}`}>
                <div className="list-panel-header">
                    <h3>{activeType === 'quest' ? 'Quests' : 'Notes'}</h3>
                    <button className="add-page-btn" onClick={addPage} title="Create page">+</button>
                </div>
                <div className="list-panel-content">
                    {filteredPages.map(p => (
                        <div
                            key={p.id}
                            className={`page-list-item ${currentActivePage?.id === p.id ? 'active' : ''}`}
                            onClick={() => setSelectedPageId(p.id)}
                        >
                            <span className="item-title">{p.title || '(Untitled)'}</span>
                            <span className="item-snippet">
                                {p.content ? p.content.slice(0, 30) + (p.content.length > 30 ? '...' : '') : '(Empty)'}
                            </span>
                        </div>
                    ))}
                    {filteredPages.length === 0 && (
                        <div className="empty-list-msg">
                            No {activeType === 'quest' ? 'quests' : 'notes'} yet. Click the "+" button to create one.
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Editor panel */}
            <div className="notebook-editor-panel">
                {currentActivePage ? (
                    <div className="editor-active">
                        <div className="editor-header">
                            <input
                                type="text"
                                className="input page-title-input"
                                value={currentActivePage.title}
                                onChange={(e) => updatePage(currentActivePage.id, 'title', e.target.value)}
                                placeholder="Page Title..."
                            />
                            
                            <div className="editor-meta-controls">
                                <div className="page-type-selector">
                                    <label htmlFor="page-type">Type: </label>
                                    <select
                                        id="page-type"
                                        className="input type-select"
                                        value={currentActivePage.type}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            updatePage(currentActivePage.id, 'type', newType);
                                            setActiveType(newType); // switch view to match new type
                                        }}
                                    >
                                        <option value="quest">Quest 📜</option>
                                        <option value="note">Note 📝</option>
                                    </select>
                                </div>
                                <button className="btn btn-danger delete-page-btn" onClick={() => deletePage(currentActivePage.id)}>
                                    🗑️ Delete Page
                                </button>
                            </div>
                        </div>

                        <div className="editor-body">
                            <textarea
                                className="input page-textarea"
                                value={currentActivePage.content}
                                onChange={(e) => updatePage(currentActivePage.id, 'content', e.target.value)}
                                placeholder="Type your notebook content here..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="editor-placeholder">
                        <div className="placeholder-content">
                            <span className="placeholder-icon">📓</span>
                            <h2>Notebook</h2>
                            <p>Select a page from the list or create a new one to begin editing.</p>
                            <button className="btn btn-primary" onClick={addPage}>+ Create New Page</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
