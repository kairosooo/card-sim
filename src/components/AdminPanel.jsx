
import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, Plus, Save, X, Database, Layers, Search, AlertTriangle, Check, CreditCard } from 'lucide-react';
import { fileToBase64 } from '../utils/fileUtils';
import { db } from '../utils/db';
import './AdminPanel.css';

export default function AdminPanel({ masterSets, onUpdateMasterSets, onCardClick, onResetCollection }) {
    // Modal States
    const [editingCard, setEditingCard] = useState(null);
    const [editingSet, setEditingSet] = useState(null);
    const [creatingSet, setCreatingSet] = useState(false);
    const [addingCardToSet, setAddingCardToSet] = useState(false); // To show "Card Selector"

    // Confirmation State
    const [confirmation, setConfirmation] = useState(null);

    const [activeSetId, setActiveSetId] = useState(masterSets[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [cardSelectorQuery, setCardSelectorQuery] = useState(''); // For searching global DB

    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [editTargetId, setEditTargetId] = useState(null);

    const [selectedIds, setSelectedIds] = useState([]);
    const [isUnassignedView, setIsUnassignedView] = useState(false);

    // Modal Specific States (for Card Selector)
    const [modalSelectedIds, setModalSelectedIds] = useState([]);
    const [modalSourceFilter, setModalSourceFilter] = useState('inventory'); // 'inventory' | 'all'
    const [modalRarityFilter, setModalRarityFilter] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleHardReset = () => {
        showConfirm('WIPE ALL DATA? This will delete your entire collection, all custom cards, and all expansions. You cannot undo this.', async () => {
            await db.clear();
            localStorage.clear(); // Clear local storage too just in case
            window.location.reload();
        });
    };



    // New Set Form State
    const [newSetData, setNewSetData] = useState({ id: `SET-${Date.now()}`, name: 'New Expansion', symbol: '🆕', color: '#9b59b6', image: '', price: 10 });

    const activeSet = masterSets.find(s => s.id === activeSetId);

    // List of cards that are NOT in any proper expansion pack (only in set-custom)
    const unassignedCardsList = useMemo(() => {
        const inventorySet = masterSets.find(s => s.id === 'set-custom');
        if (!inventorySet) return [];

        // A card is unassigned if it exists in inventory but its name/image combo 
        // doesn't appear in any other set. (Since IDs are cloned/different)
        const otherSetsCards = masterSets
            .filter(s => s.id !== 'set-custom')
            .flatMap(s => s.cards);

        return inventorySet.cards.filter(invCard =>
            !otherSetsCards.some(otherCard =>
                otherCard.name === invCard.name && otherCard.image === invCard.image
            )
        );
    }, [masterSets]);

    // Filter and Sort Cards (For viewing current set or unassigned)
    const filteredCards = useMemo(() => {
        let cards = [];
        if (isUnassignedView) {
            cards = [...unassignedCardsList];
        } else {
            if (!activeSet) return [];
            cards = [...activeSet.cards];
        }

        if (searchQuery) {
            cards = cards.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.id.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        cards.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return cards;
    }, [activeSet, isUnassignedView, unassignedCardsList, searchQuery, sortConfig]);

    // Flattened Global DB for Card Selector
    const globalCardListWithMetadata = useMemo(() => {
        return masterSets.flatMap(set => (set.cards || []).map(c => ({
            ...c,
            fromSet: set.name,
            fromSetId: set.id,
            isUnassigned: !masterSets.filter(s => s.id !== 'set-custom').some(s =>
                (s.cards || []).some(sc => sc.name === c.name && sc.image === c.image)
            )
        })));
    }, [masterSets]);

    const filteredGlobalCards = useMemo(() => {
        let cards = globalCardListWithMetadata;

        if (modalSourceFilter === 'inventory') {
            // Show all cards from "Custom Creations", regardless of unassigned status
            cards = cards.filter(c => c.fromSetId === 'set-custom');
        }
        // If 'all', show everything

        if (modalRarityFilter) {
            cards = cards.filter(c => c.rarity === modalRarityFilter);
        }

        if (cardSelectorQuery) {
            const query = cardSelectorQuery.toLowerCase();
            cards = cards.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.id.toLowerCase().includes(query)
            );
        }

        return cards;
    }, [globalCardListWithMetadata, modalSourceFilter, modalRarityFilter, cardSelectorQuery]);


    const stats = useMemo(() => {
        if (!activeSet || !activeSet.cards || activeSet.cards.length === 0) return null;
        const total = activeSet.cards.length;
        const rarityCounts = {};
        activeSet.cards.forEach(c => {
            rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + 1;
        });
        return Object.entries(rarityCounts).map(([rarity, count]) => ({
            rarity: parseInt(rarity),
            count,
            percentage: Math.round((count / total) * 100)
        })).sort((a, b) => a.rarity - b.rarity);
    }, [activeSet]);

    // Helpers
    const showConfirm = (message, action) => {
        setConfirmation({ message, onConfirm: action, type: 'danger' });
    };

    const closeModals = () => {
        setEditingCard(null);
        setEditingSet(null);
        setCreatingSet(false);
        setAddingCardToSet(false);
        setConfirmation(null);
        setNewSetData({ id: `SET-${Date.now()}`, name: 'New Expansion', symbol: '🆕', color: '#9b59b6', image: '', price: 10 });
        setSelectedIds([]);
        setModalSelectedIds([]);
    };

    // Actions
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const confirmCreateSet = (e) => {
        e.preventDefault();
        if (masterSets.find(s => s.id === newSetData.id)) {
            alert('Set ID already exists!');
            return;
        }
        const newSet = {
            ...newSetData,
            cards: []
        };
        onUpdateMasterSets([...masterSets, newSet]);
        setActiveSetId(newSet.id);
        closeModals();
    };

    const handleDeleteSet = (setId) => {
        showConfirm('Delete this expansion? All cards will be lost forever.', () => {
            const newSets = masterSets.filter(s => s.id !== setId);
            onUpdateMasterSets(newSets);
            if (activeSetId === setId) setActiveSetId(newSets[0]?.id || null);
            closeModals();
        });
    };

    const handleUpdateSet = (e) => {
        e.preventDefault();
        const newSets = masterSets.map(s => s.id === editingSet.id ? editingSet : s);
        onUpdateMasterSets(newSets);
        closeModals();
    };

    // Updated batch add logic
    const handleBatchAddCards = () => {
        if (!activeSet || modalSelectedIds.length === 0) return;

        const cardsToAdd = modalSelectedIds.map(id => {
            const template = globalCardListWithMetadata.find(c => c.id === id);
            return {
                ...template,
                id: `cs-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
                fromSet: undefined,
                fromSetId: undefined,
                isUnassigned: undefined
            };
        });

        const newSets = masterSets.map(s => {
            if (s.id === activeSetId) {
                return { ...s, cards: [...s.cards, ...cardsToAdd] };
            }
            return s;
        });

        onUpdateMasterSets(newSets);
        closeModals();
        alert(`Successfully added ${cardsToAdd.length} cards to ${activeSet.name}`);
    };

    const toggleModalCardSelection = (id) => {
        setModalSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleMouseEnterModalCard = (id) => {
        if (isDragging) {
            setModalSelectedIds(prev => prev.includes(id) ? prev : [...prev, id]);
        }
    };


    const handleDeleteCard = (cardId) => {
        showConfirm('Delete this card?', () => {
            const newSets = masterSets.map(s => {
                if (s.id === activeSetId) {
                    return { ...s, cards: s.cards.filter(c => c.id !== cardId) };
                }
                return s;
            });
            onUpdateMasterSets(newSets);
            closeModals();
        });
    };

    const handleUpdateCard = (e) => {
        e.preventDefault();
        const newSets = masterSets.map(s => {
            if (s.id === activeSetId) {
                return {
                    ...s,
                    cards: s.cards.map(c => c.id === editTargetId ? editingCard : c)
                };
            }
            return s;
        });
        onUpdateMasterSets(newSets);
        closeModals();
    };

    const handleUpdateCardRarity = (cardId, newRarity) => {
        const newSets = masterSets.map(s => {
            if (isUnassignedView) {
                // If in unassigned view, we are editing set-custom
                if (s.id === 'set-custom') {
                    return {
                        ...s,
                        cards: s.cards.map(c => c.id === cardId ? { ...c, rarity: newRarity } : c)
                    };
                }
            } else if (s.id === activeSetId) {
                return {
                    ...s,
                    cards: s.cards.map(c => c.id === cardId ? { ...c, rarity: newRarity } : c)
                };
            }
            return s;
        });
        onUpdateMasterSets(newSets);
    };

    // Bulk Actions
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredCards.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCards.map(c => c.id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        showConfirm(`Delete ${selectedIds.length} cards?`, () => {
            const newSets = masterSets.map(s => {
                if (isUnassignedView) {
                    if (s.id === 'set-custom') {
                        return { ...s, cards: s.cards.filter(c => !selectedIds.includes(c.id)) };
                    }
                } else if (s.id === activeSetId) {
                    return { ...s, cards: s.cards.filter(c => !selectedIds.includes(c.id)) };
                }
                return s;
            });
            onUpdateMasterSets(newSets);
            setSelectedIds([]);
            setConfirmation(null);
        });
    };

    const handleBulkMove = (targetSetId) => {
        if (selectedIds.length === 0) return;

        // Find the cards to move
        const currentSource = isUnassignedView ? 'set-custom' : activeSetId;
        const sourceSet = masterSets.find(s => s.id === currentSource);
        const cardsToMove = sourceSet.cards.filter(c => selectedIds.includes(c.id));

        const newSets = masterSets.map(s => {
            if (s.id === currentSource) {
                return { ...s, cards: s.cards.filter(c => !selectedIds.includes(c.id)) };
            }
            if (s.id === targetSetId) {
                // When moving, we might want to keep the original ID or clone?
                // For "Move", let's keep the ID.
                return { ...s, cards: [...s.cards, ...cardsToMove] };
            }
            return s;
        });

        onUpdateMasterSets(newSets);
        setSelectedIds([]);
        alert(`Moved ${cardsToMove.length} cards to ${masterSets.find(s => s.id === targetSetId).name}`);
    };

    const openEditCard = (card) => {
        setEditingCard({ ...card });
        setEditTargetId(card.id);
    };

    return (
        <div className="admin-panel-container">
            <header className="admin-header glass-panel">
                <div className="admin-title">
                    <Database size={24} />
                    <h2>ADMIN</h2>
                </div>
                <div className="admin-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" style={{ backgroundColor: '#c0392b', color: 'white', borderColor: '#c0392b' }} onClick={handleHardReset}>
                        <Trash2 size={18} /> Wipe All Data
                    </button>
                    <button className="btn btn-primary" onClick={() => setCreatingSet(true)}>
                        <Plus size={18} /> New Expansion
                    </button>
                </div>
            </header>

            <div className="admin-layout">
                <aside className="set-sidebar glass-panel">
                    <h3>Expansions</h3>
                    <div className="set-list">
                        {(() => {
                            const customSet = masterSets.find(s => s.id === 'set-custom');
                            if (!customSet) return null;
                            return (
                                <div
                                    className={`set-item special ${isUnassignedView ? 'active' : ''}`}
                                    onClick={() => {
                                        setIsUnassignedView(true);
                                        setActiveSetId(null);
                                    }}
                                >
                                    {customSet.image ? (
                                        <img src={customSet.image} alt="" className="set-pack-art-mini" />
                                    ) : (
                                        <span className="set-symbol" style={{ color: '#aaa' }}>📦</span>
                                    )}
                                    <span className="set-name">{customSet.name}</span>
                                    <span className="count-badge">{unassignedCardsList.length}</span>
                                    <div className="set-actions">
                                        <button className="icon-btn tiny" onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingSet(customSet);
                                        }}>
                                            <Edit2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="sidebar-divider" style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '10px 0' }} />
                        {masterSets.filter(s => s.id !== 'set-custom').map(set => (
                            <div
                                key={set.id}
                                className={`set-item ${!isUnassignedView && activeSetId === set.id ? 'active' : ''}`}
                                onClick={() => {
                                    setIsUnassignedView(false);
                                    setActiveSetId(set.id);
                                }}
                            >
                                {set.image ? (
                                    <img src={set.image} alt="" className="set-pack-art-mini" />
                                ) : (
                                    <span className="set-symbol" style={{ color: set.color }}>{set.symbol}</span>
                                )}
                                <span className="set-name">{set.name}</span>
                                <span className="count-badge">{set.cards.length}</span>
                                <div className="set-actions">
                                    <button className="icon-btn tiny" onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSet(set);
                                    }}>
                                        <Edit2 size={12} />
                                    </button>
                                    <button className="icon-btn tiny delete" onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSet(set.id);
                                    }}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="inventory-view glass-panel">
                    {(activeSet || isUnassignedView) ? (
                        <>
                            <div className="inventory-header">
                                <div className="inventory-info">
                                    <h3>
                                        {isUnassignedView ? 'Unassigned Inventory' : `${activeSet?.name || 'Expanded Set'} Cards`}
                                        ({filteredCards.length})
                                    </h3>
                                    {!isUnassignedView && activeSet && (
                                        <span className="set-meta" style={{ color: activeSet.color }}>{activeSet.symbol} {activeSet.id}</span>
                                    )}
                                </div>
                                <div className="inventory-controls">
                                    <div className="search-bar">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search cards..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {!isUnassignedView && (
                                        <button className="btn btn-secondary" onClick={() => setAddingCardToSet(true)}>
                                            <Plus size={18} /> Add Card
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Bulk Actions Menu */}
                            {selectedIds.length > 0 && (
                                <div className="bulk-actions-bar glass-panel animate-in">
                                    <span className="selection-count">{selectedIds.length} Selected</span>
                                    <div className="action-btns">
                                        {!isUnassignedView && (
                                            <button className="btn btn-secondary tiny" onClick={() => handleBulkMove('set-custom')}>
                                                Return to Inventory
                                            </button>
                                        )}
                                        {isUnassignedView && (
                                            <div className="move-to-dropdown">
                                                <select onChange={(e) => handleBulkMove(e.target.value)} defaultValue="">
                                                    <option value="" disabled>Move to Pack...</option>
                                                    {masterSets.filter(s => s.id !== 'set-custom').map(s => (
                                                        <option key={s.id} value={s.id}>{s.symbol} {s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <button className="btn btn-secondary tiny delete" onClick={handleBulkDelete}>
                                            <Trash2 size={14} /> Delete
                                        </button>
                                        <button className="btn btn-secondary tiny" onClick={() => setSelectedIds([])}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stats Bar */}
                            {stats && (
                                <div className="stats-bar">
                                    {stats.map(s => (
                                        <div key={s.rarity} className="stat-pill" title={`${s.count} cards`}>
                                            <span style={{ color: '#f1c40f' }}>{'★'.repeat(s.rarity)}</span>
                                            <span className="stat-pct">{s.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="inventory-table-wrapper">
                                <table className="inventory-table">
                                    <thead>
                                        <tr>
                                            <th className="checkbox-cell">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.length > 0 && selectedIds.length === filteredCards.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th onClick={() => handleSort('id')} className="sortable">ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th onClick={() => handleSort('name')} className="sortable">Card {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th onClick={() => handleSort('rarity')} className="sortable">Rarity {sortConfig.key === 'rarity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCards.map(card => (
                                            <tr key={card.id} className={selectedIds.includes(card.id) ? 'selected' : ''}>
                                                <td className="checkbox-cell">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(card.id)}
                                                        onChange={() => toggleSelect(card.id)}
                                                    />
                                                </td>
                                                <td className="id-cell">{card.id}</td>
                                                <td>
                                                    <div className="card-info-cell">
                                                        <img src={card.image} alt="" className="tiny-preview" onClick={() => onCardClick(card)} style={{ cursor: 'zoom-in' }} />
                                                        <span>{card.name}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="editable-stars">
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <span
                                                                key={star}
                                                                className={`star-icon ${star <= card.rarity ? 'active' : ''}`}
                                                                onClick={() => handleUpdateCardRarity(card.id, star)}
                                                                title={`Set rarity to ${star}`}
                                                            >★</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="actions-cell">
                                                    <button className="icon-btn edit" onClick={() => openEditCard(card)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleDeleteCard(card.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <Layers size={48} opacity={0.3} />
                            <p>Select an expansion to manage its contents</p>
                        </div>
                    )}
                </main>
            </div>

            {/* SHARED MODAL OVERLAY */}
            {(editingCard || editingSet || creatingSet || confirmation || addingCardToSet) && (
                <div className="modal-overlay" onClick={closeModals}>

                    {/* ADD CARD SELECTOR - FULL PAGE GRID */}
                    {addingCardToSet && (
                        <div className="modal-overlay full-page" onClick={closeModals}>
                            <div
                                className="admin-modal glass-panel full-modal"
                                onClick={e => e.stopPropagation()}
                                onMouseUp={() => setIsDragging(false)}
                            >
                                <div className="modal-header">
                                    <div className="title-group">
                                        <h3>Add Cards to {activeSet?.name || 'Set'}</h3>
                                        <span className="selection-badge">{modalSelectedIds.length} Selected</span>
                                    </div>
                                    <div className="modal-header-actions">
                                        <button className="btn btn-primary" onClick={handleBatchAddCards} disabled={modalSelectedIds.length === 0}>
                                            <Plus size={18} /> Add Selected Cards
                                        </button>
                                        <button type="button" className="close-btn" onClick={closeModals}><X size={24} /></button>
                                    </div>
                                </div>

                                <div className="modal-filters-bar">
                                    <div className="filter-group">
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search library..."
                                            value={cardSelectorQuery}
                                            onChange={(e) => setCardSelectorQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="filter-group">
                                        <button
                                            className={`filter-toggle ${modalSourceFilter === 'inventory' ? 'active' : ''}`}
                                            onClick={() => setModalSourceFilter(modalSourceFilter === 'inventory' ? 'all' : 'inventory')}
                                        >
                                            {modalSourceFilter === 'inventory' ? 'Showing Custom Inventory Only' : 'Including All Cards'}
                                        </button>
                                    </div>

                                    <div className="filter-group rarity-stars-filter">
                                        <span className="label">Rating:</span>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span
                                                key={star}
                                                className={`star-icon ${modalRarityFilter === star ? 'active' : ''}`}
                                                onClick={() => setModalRarityFilter(modalRarityFilter === star ? null : star)}
                                            >
                                                ★
                                            </span>
                                        ))}
                                        {modalRarityFilter && (
                                            <button className="clear-filter" onClick={() => setModalRarityFilter(null)}>
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="filter-group">
                                        <button
                                            className={`filter-toggle ${filteredGlobalCards.length > 0 && filteredGlobalCards.every(c => modalSelectedIds.includes(c.id)) ? 'active' : ''}`}
                                            onClick={() => {
                                                const allFilteredIds = filteredGlobalCards.map(c => c.id);
                                                const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => modalSelectedIds.includes(id));

                                                if (allSelected) {
                                                    setModalSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                                                } else {
                                                    setModalSelectedIds(prev => {
                                                        const newIds = new Set([...prev, ...allFilteredIds]);
                                                        return Array.from(newIds);
                                                    });
                                                }
                                            }}
                                        >
                                            {filteredGlobalCards.length > 0 && filteredGlobalCards.every(c => modalSelectedIds.includes(c.id)) ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                </div>

                                <div className="modal-body grid-view">
                                    <div className="card-selector-grid" onMouseDown={() => setIsDragging(true)}>
                                        {filteredGlobalCards.map((card) => (
                                            <div
                                                key={card.id}
                                                className={`grid-card-item ${modalSelectedIds.includes(card.id) ? 'selected' : ''}`}
                                                onClick={() => toggleModalCardSelection(card.id)}
                                                onMouseEnter={() => handleMouseEnterModalCard(card.id)}
                                            >
                                                <div className="card-face-wrapper">
                                                    <img src={card.image} alt={card.name} />
                                                    <div className="card-rating-overlay">
                                                        {'★'.repeat(card.rarity)}
                                                    </div>
                                                    <div className="selection-indicator">
                                                        <Check size={24} />
                                                    </div>
                                                </div>
                                                <span className="card-name-label">{card.name}</span>
                                            </div>
                                        ))}
                                        {filteredGlobalCards.length === 0 && (
                                            <div className="empty-results">
                                                <Layers size={48} />
                                                <p>No cards match your filters</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EDIT CARD */}
                    {editingCard && (
                        <form className="admin-modal glass-panel" onClick={e => e.stopPropagation()} onSubmit={handleUpdateCard}>
                            <div className="modal-header">
                                <h3>Edit Card Entry</h3>
                                <button type="button" className="close-btn" onClick={closeModals}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Card ID</label>
                                        <input
                                            type="text"
                                            value={editingCard.id}
                                            onChange={e => setEditingCard({ ...editingCard, id: e.target.value })}
                                            className={activeSet.cards.find(c => c.id === editingCard.id && c.id !== editTargetId) ? 'error-border' : ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Rarity (1-5)</label>
                                        <input type="number" min="1" max="5" value={editingCard.rarity}
                                            onChange={e => setEditingCard({ ...editingCard, rarity: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Name</label>
                                    <input type="text" value={editingCard.name}
                                        onChange={e => setEditingCard({ ...editingCard, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Image</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input type="text" value={editingCard.image} placeholder="Image URL or Path"
                                            onChange={e => setEditingCard({ ...editingCard, image: e.target.value })} style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btn-secondary tiny" onClick={() => document.getElementById('edit-card-upload').click()}>Upload</button>
                                        <input id="edit-card-upload" type="file" hidden accept="image/*"
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    try {
                                                        const base64 = await fileToBase64(e.target.files[0]);
                                                        setEditingCard({ ...editingCard, image: base64 });
                                                    } catch (err) { alert('Processing failed'); }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea value={editingCard.description} onChange={e => setEditingCard({ ...editingCard, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModals}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={activeSet.cards.find(c => c.id === editingCard.id && c.id !== editTargetId)}>
                                    <Save size={18} /> Save
                                </button>
                            </div>
                        </form>
                    )}

                    {/* EDIT EXPANSION */}
                    {editingSet && (
                        <form className="admin-modal glass-panel" onClick={e => e.stopPropagation()} onSubmit={handleUpdateSet}>
                            <div className="modal-header">
                                <h3>Edit Expansion</h3>
                                <button type="button" className="close-btn" onClick={closeModals}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input type="text" value={editingSet.name} onChange={e => setEditingSet({ ...editingSet, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Price (Coins)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingSet.price !== undefined ? editingSet.price : 10}
                                        onChange={e => setEditingSet({ ...editingSet, price: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Symbol</label>
                                        <input type="text" value={editingSet.symbol} onChange={e => setEditingSet({ ...editingSet, symbol: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Color</label>
                                        <input type="color" value={editingSet.color} onChange={e => setEditingSet({ ...editingSet, color: e.target.value })} style={{ height: '40px' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Pack Artwork</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input type="text" value={editingSet.image || ''} placeholder="Image URL"
                                            onChange={e => setEditingSet({ ...editingSet, image: e.target.value })} style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btn-secondary tiny" onClick={() => document.getElementById('edit-set-upload').click()}>Upload</button>
                                        <input id="edit-set-upload" type="file" hidden accept="image/*"
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    try {
                                                        const base64 = await fileToBase64(e.target.files[0]);
                                                        setEditingSet({ ...editingSet, image: base64 });
                                                    } catch (err) { alert('Processing failed'); }
                                                }
                                            }}
                                        />
                                    </div>
                                    {editingSet.image && <img src={editingSet.image} alt="Preview" className="pack-art-preview" />}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModals}>Cancel</button>
                                <button type="submit" className="btn btn-primary"><Save size={18} /> Update</button>
                            </div>
                        </form>
                    )}

                    {/* CREATE EXPANSION */}
                    {creatingSet && (
                        <form className="admin-modal glass-panel" onClick={e => e.stopPropagation()} onSubmit={confirmCreateSet}>
                            <div className="modal-header">
                                <h3>Create Expansion</h3>
                                <button type="button" className="close-btn" onClick={closeModals}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Set ID (Must be unique)</label>
                                    <input type="text" value={newSetData.id} onChange={e => setNewSetData({ ...newSetData, id: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Name</label>
                                    <input type="text" value={newSetData.name} onChange={e => setNewSetData({ ...newSetData, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Price (Coins)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newSetData.price}
                                        onChange={e => setNewSetData({ ...newSetData, price: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Symbol</label>
                                        <input type="text" value={newSetData.symbol} onChange={e => setNewSetData({ ...newSetData, symbol: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Color</label>
                                        <input type="color" value={newSetData.color} onChange={e => setNewSetData({ ...newSetData, color: e.target.value })} style={{ height: '40px' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Pack Artwork</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input type="text" value={newSetData.image} placeholder="Image URL"
                                            onChange={e => setNewSetData({ ...newSetData, image: e.target.value })} style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btn-secondary tiny" onClick={() => document.getElementById('new-set-upload').click()}>Upload</button>
                                        <input id="new-set-upload" type="file" hidden accept="image/*"
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    try {
                                                        const base64 = await fileToBase64(e.target.files[0]);
                                                        setNewSetData({ ...newSetData, image: base64 });
                                                    } catch (err) { alert('Processing failed'); }
                                                }
                                            }}
                                        />
                                    </div>
                                    {newSetData.image && <img src={newSetData.image} alt="Preview" className="pack-art-preview" />}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModals}>Cancel</button>
                                <button type="submit" className="btn btn-primary"><Plus size={18} /> Create</button>
                            </div>
                        </form>
                    )}

                    {/* CONFIRMATION */}
                    {confirmation && (
                        <div className="admin-modal glass-panel confirmation-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3><AlertTriangle size={20} color="#e74c3c" /> Confirm Action</h3>
                                <button type="button" className="close-btn" onClick={closeModals}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                <p>{confirmation.message}</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeModals}>Cancel</button>
                                <button className="btn btn-primary" style={{ background: '#e74c3c', borderColor: '#e74c3c' }} onClick={confirmation.onConfirm}>
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
