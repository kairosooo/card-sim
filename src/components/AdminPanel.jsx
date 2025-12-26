
import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, Plus, Save, X, Database, Layers, Search, AlertTriangle, Check, CreditCard } from 'lucide-react';
import { fileToBase64 } from '../utils/fileUtils';
import './AdminPanel.css';

export default function AdminPanel({ masterSets, onUpdateMasterSets, onCardClick }) {
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

    const handleHardReset = () => {
        showConfirm('WIPE ALL DATA? This will delete your entire collection, all custom cards, and all expansions. You cannot undo this.', () => {
            localStorage.clear();
            window.location.reload();
        });
    };

    // New Set Form State
    const [newSetData, setNewSetData] = useState({ id: `SET-${Date.now()}`, name: 'New Expansion', symbol: '🆕', color: '#9b59b6' });

    const activeSet = masterSets.find(s => s.id === activeSetId);

    // Filter and Sort Cards (For viewing current set)
    const filteredCards = useMemo(() => {
        if (!activeSet) return [];
        let cards = [...activeSet.cards];

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
    }, [activeSet, searchQuery, sortConfig]);

    // Flattened Global DB for Card Selector
    const globalCardList = useMemo(() => {
        return masterSets.flatMap(set => set.cards.map(c => ({ ...c, fromSet: set.name })));
    }, [masterSets]);

    const filteredGlobalCards = useMemo(() => {
        if (!cardSelectorQuery) return globalCardList.slice(0, 20); // Limit initial view
        return globalCardList.filter(c =>
            c.name.toLowerCase().includes(cardSelectorQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(cardSelectorQuery.toLowerCase())
        ).slice(0, 50); // Cap output
    }, [globalCardList, cardSelectorQuery]);


    const stats = useMemo(() => {
        if (!activeSet) return null;
        const total = activeSet.cards.length;
        if (total === 0) return null;
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
        setNewSetData({ id: `SET-${Date.now()}`, name: 'New Expansion', symbol: '🆕', color: '#9b59b6' });
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

    // New "Add Card" logic: Just adds a card to the set, potentially copied?
    // For now we will support creating a NEW card instance, OR adding existing?
    // User asked "Add card function should be referring to the Inventory database".
    // We will implement: When you click "Add Card", we open a selector.
    // Clicking a card in the selector ADDS A COPY to this set with a NEW ID?
    // OR links it? The current data model (cards inside sets) implies copies or unique instances.
    // Let's assume unique instances. So "Pick from DB" -> "Clone to Set".
    const addCardToSet = (cardTemplate) => {
        if (!activeSet) return;

        let newId = `cs-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        // If template provided, use its data but new ID
        const newCard = cardTemplate ? {
            ...cardTemplate,
            id: newId,
            fromSet: undefined // Clean up
        } : {
            id: newId,
            name: 'New Card',
            rarity: 1,
            description: 'Insert description...',
            image: 'https://picsum.photos/seed/new/400/600'
        };

        const newSets = masterSets.map(s => {
            if (s.id === activeSetId) {
                return { ...s, cards: [...s.cards, newCard] };
            }
            return s;
        });
        onUpdateMasterSets(newSets);
        closeModals();
        // Maybe immediately edit?
        setEditTargetId(newCard.id);
        setEditingCard(newCard);
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
            if (s.id === activeSetId) {
                return {
                    ...s,
                    cards: s.cards.map(c => c.id === cardId ? { ...c, rarity: newRarity } : c)
                };
            }
            return s;
        });
        onUpdateMasterSets(newSets);
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
                    <h2>Expansion Pack Management</h2>
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
                        {masterSets.map(set => (
                            <div
                                key={set.id}
                                className={`set-item ${activeSetId === set.id ? 'active' : ''}`}
                                onClick={() => setActiveSetId(set.id)}
                            >
                                <span className="set-symbol" style={{ color: set.color }}>{set.symbol}</span>
                                <span className="set-name">{set.name}</span>
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
                    {activeSet ? (
                        <>
                            <div className="inventory-header">
                                <div className="inventory-info">
                                    <h3>{activeSet.name} Cards ({activeSet.cards.length})</h3>
                                    <span className="set-meta" style={{ color: activeSet.color }}>{activeSet.symbol} {activeSet.id}</span>
                                </div>
                                <div className="inventory-controls">
                                    <div className="search-bar">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search cards in set..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <button className="btn btn-secondary" onClick={() => setAddingCardToSet(true)}>
                                        <Plus size={18} /> Add Card
                                    </button>
                                </div>
                            </div>

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
                                            <th onClick={() => handleSort('id')} className="sortable">ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th onClick={() => handleSort('name')} className="sortable">Card {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th onClick={() => handleSort('rarity')} className="sortable">Rarity {sortConfig.key === 'rarity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCards.map(card => (
                                            <tr key={card.id}>
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

                    {/* ADD CARD SELECTOR */}
                    {addingCardToSet && (
                        <div className="admin-modal glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                            <div className="modal-header">
                                <h3>Add Card to {activeSet.name}</h3>
                                <button type="button" className="close-btn" onClick={closeModals}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: '#aaa', marginBottom: '15px' }}>Select a card from the Global Database to define in this pack, or create new.</p>

                                <div className="search-bar" style={{ width: '100%', marginBottom: '15px' }}>
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search global database..."
                                        value={cardSelectorQuery}
                                        onChange={(e) => setCardSelectorQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="card-selector-list" style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button className="selector-item new-card-btn" onClick={() => addCardToSet(null)}>
                                        <Plus size={16} /> Create Blank Card
                                    </button>
                                    {filteredGlobalCards.map((card, i) => (
                                        <div key={i} className="selector-item" onClick={() => addCardToSet(card)}>
                                            <img src={card.image} alt="" className="tiny-preview" />
                                            <div className="info">
                                                <span className="name">{card.name}</span>
                                                <span className="meta">{card.fromSet} • {'★'.repeat(card.rarity)}</span>
                                            </div>
                                            <Plus size={16} className="add-icon" />
                                        </div>
                                    ))}
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
