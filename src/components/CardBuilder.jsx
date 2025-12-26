import React, { useState, useMemo } from 'react';
import { X, Database, LayoutGrid, Edit2, Save, Trash2, ImagePlus, Upload, Download } from 'lucide-react';
import Card from './Card';
import { fileToBase64 } from '../utils/fileUtils';
import './CardBuilder.css';

const ASPECT_RATIO = 2.5 / 3.5;

export default function CardBuilder({ onCreateCard, masterSets, onUpdateMasterSets, onCardClick }) {
    const [viewMode, setViewMode] = useState('premade'); // 'premade' or 'inventory'
    const [rarity, setRarity] = useState(1); // Used for batch upload default

    // Inventory State

    // Inventory State
    const [searchQuery, setSearchQuery] = useState('');
    const [editingCard, setEditingCard] = useState(null); // For global edit
    const [deletingCard, setDeletingCard] = useState(null); // For deletion confirmation

    const handlePremadeUpload = async (files) => {
        if (!files || files.length === 0) return;

        let successCount = 0;
        const newCards = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                // Apply auto-crop first
                const croppedBlob = await autoCropImage(file);
                const base64 = await fileToBase64(croppedBlob);

                const newCard = {
                    id: `custom-${Date.now()}-${i}`,
                    name: file.name.replace(/\.[^/.]+$/, "") || 'New Card',
                    rarity: rarity,
                    holoPattern: 'none',
                    description: 'Quick uploaded.',
                    image: base64,
                    isCustom: true
                };
                newCards.push(newCard);
                successCount++;
            } catch (err) {
                console.error('Quick upload error:', err);
            }
        }

        if (newCards.length > 0) {
            onCreateCard(newCards);
        }
        setViewMode('inventory');
    };

    const handleExportSource = async () => {
        const dataStr = `export const SETS = ${JSON.stringify(masterSets, null, 2)};`;

        try {
            // Attempt to use the File System Access API (Chrome/Edge/Opera)
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'sets.js',
                    types: [{
                        description: 'JavaScript Source File',
                        accept: { 'text/javascript': ['.js'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(dataStr);
                await writable.close();
                return;
            }
            throw new Error('API not supported');
        } catch (err) {
            // Fallback for Firefox/Safari or if user cancels
            if (err.name === 'AbortError') return;

            const blob = new Blob([dataStr], { type: "text/javascript;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = "sets.js";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleImportSource = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                let jsonPart = text.replace(/^export\s+const\s+SETS\s+=\s+/, '');
                jsonPart = jsonPart.replace(/;\s*$/, '');

                const importedSets = JSON.parse(jsonPart);

                if (Array.isArray(importedSets)) {
                    // Check if window.confirm is wanted or custom modal. Using window.confirm for simplicity as per plan.
                    if (window.confirm(`Import ${importedSets.length} sets? This will overwrite your current configuration.`)) {
                        onUpdateMasterSets(importedSets);
                        alert('Import successful!');
                    }
                } else {
                    alert('Invalid file format: Expected an array of sets.');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse file. Please ensure it is a valid sets.js file exported from CardSim.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const autoCropImage = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    const { width: imgWidth, height: imgHeight } = img;
                    const targetAspect = ASPECT_RATIO;
                    let cropWidth, cropHeight, x, y;

                    if (imgWidth / imgHeight > targetAspect) {
                        cropHeight = imgHeight;
                        cropWidth = imgHeight * targetAspect;
                        x = (imgWidth - cropWidth) / 2;
                        y = 0;
                    } else {
                        cropWidth = imgWidth;
                        cropHeight = imgWidth / targetAspect;
                        x = 0;
                        y = (imgHeight - cropHeight) / 2;
                    }

                    const pixelCrop = { x, y, width: cropWidth, height: cropHeight };
                    try {
                        const blob = await getCroppedBlob(e.target.result, pixelCrop);
                        resolve(blob);
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };



    // Derived Inventory List (Flattened)
    const allCards = useMemo(() => {
        if (!masterSets) return [];
        return masterSets.flatMap(set => set.cards.map(card => ({ ...card, setName: set.name, setSymbol: set.symbol, setId: set.id })));
    }, [masterSets]);

    const filteredCards = useMemo(() => {
        if (!searchQuery) return allCards;
        return allCards.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allCards, searchQuery]);


    const handleUpdateCard = (e) => {
        e.preventDefault();
        // editingCard contains the updated data. We need to find the set it belongs to.
        // The editingCard might be missing the 'setId' if we destructured it purely from the form?
        // Actually, we pass the full object to setEditingCard, so it should have setId if we mapped it correctly.
        // Wait, 'allCards' adds 'setId'. 'editingCard' will have it.

        if (!editingCard.setId) {
            alert("Error: Cannot identify source set for this card.");
            return;
        }

        const newSets = masterSets.map(set => {
            if (set.id === editingCard.setId) {
                return {
                    ...set,
                    cards: set.cards.map(c => c.id === editingCard.id ? {
                        id: editingCard.id,
                        name: editingCard.name,
                        rarity: editingCard.rarity,
                        holoPattern: editingCard.holoPattern || 'none',
                        image: editingCard.image,
                        description: editingCard.description,
                        isCustom: editingCard.isCustom
                    } : c)
                };
            }
            return set;
        });

        onUpdateMasterSets(newSets);
        setEditingCard(null);
    };

    const confirmDelete = () => {
        if (!deletingCard || !deletingCard.setId) return;

        const newSets = masterSets.map(set => {
            if (set.id === deletingCard.setId) {
                return {
                    ...set,
                    cards: set.cards.filter(c => c.id !== deletingCard.id)
                };
            }
            return set;
        });

        onUpdateMasterSets(newSets);
        setDeletingCard(null);
    };

    return (
        <div className="card-builder-container">
            {/* Toggle Header */}
            <div className="builder-nav glass-panel" style={{ marginBottom: '20px', padding: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                    className={`btn ${viewMode === 'premade' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('premade')}
                >
                    <ImagePlus size={16} style={{ marginRight: '8px' }} /> Quick Upload
                </button>
                <button
                    className={`btn ${viewMode === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('inventory')}
                >
                    <LayoutGrid size={16} style={{ marginRight: '8px' }} /> Card Database ({allCards.length})
                </button>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }}></div>
                <button className="btn btn-secondary" onClick={() => document.getElementById('builder-import').click()}>
                    <Upload size={16} /> Import Pack
                </button>
                <input
                    id="builder-import"
                    type="file"
                    accept=".js,.json"
                    style={{ display: 'none' }}
                    onChange={handleImportSource}
                />
                <button className="btn btn-secondary" onClick={handleExportSource}>
                    <Download size={16} /> Download Source
                </button>
            </div>

            {viewMode === 'premade' && (
                <div className="premade-upload-view glass-panel">
                    <div className="premade-header">
                        <h2>Quick Card Upload</h2>
                        <p>Upload card artwork - we'll automatically crop it and set the name to the filename.</p>
                    </div>

                    <div
                        className="upload-zone premade-zone"
                        onClick={() => document.getElementById('premade-upload').click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                handlePremadeUpload(e.dataTransfer.files);
                            }
                        }}
                    >
                        <ImagePlus size={48} />
                        <h3>Drop Card Artworks Here</h3>
                        <span>Select multiple images to batch create</span>
                        <input
                            id="premade-upload"
                            type="file"
                            hidden
                            multiple
                            accept="image/*"
                            onChange={(e) => e.target.files && handlePremadeUpload(e.target.files)}
                        />
                    </div>

                    <div className="upload-settings" style={{ marginTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <div className="setting-item">
                            <label>Default Rarity (Stars)</label>
                            <div className="star-selector">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        className={`star-btn ${rarity >= star ? 'active' : ''}`}
                                        onClick={() => setRarity(star)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {viewMode === 'inventory' && (
                <div className="inventory-database glass-panel" style={{ padding: '20px' }}>
                    <div className="inventory-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                        <h2>Full Card Database</h2>
                        <input
                            type="text"
                            placeholder="Search all cards..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#000', color: 'white', width: '300px' }}
                        />
                    </div>
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Card</th>
                                <th>Set</th>
                                <th>Rarity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCards.map(card => (
                                <tr key={card.id}>
                                    <td style={{ fontFamily: 'monospace', color: '#888' }}>{card.id}</td>
                                    <td>
                                        <div className="card-info-cell">
                                            <img src={card.image} alt="" className="tiny-preview" onClick={() => onCardClick(card)} style={{ cursor: 'zoom-in' }} />
                                            <span>{card.name}</span>
                                        </div>
                                    </td>
                                    <td>{card.setSymbol} {card.setName}</td>
                                    <td>{'★'.repeat(card.rarity)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button className="icon-btn edit" onClick={() => setEditingCard({ ...card })}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="icon-btn delete" onClick={() => setDeletingCard(card)} style={{ color: '#ff4444' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}



            {/* EDIT CARD MODAL */}
            {editingCard && (
                <div className="modal-overlay" onClick={() => setEditingCard(null)}>
                    <form className="admin-modal glass-panel" onClick={e => e.stopPropagation()} onSubmit={handleUpdateCard}>
                        <div className="modal-header">
                            <h3>Edit Card Details</h3>
                            <button type="button" className="close-btn" onClick={() => setEditingCard(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Source Set</label>
                                <input type="text" value={editingCard.setName || 'Unknown'} disabled style={{ opacity: 0.5 }} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Card ID</label>
                                    <input
                                        type="text"
                                        value={editingCard.id}
                                        disabled
                                        style={{ opacity: 0.5 }}
                                        title="IDs cannot be changed from the global view to prevent conflicts."
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
                                    <button type="button" className="btn btn-secondary tiny" onClick={() => document.getElementById('edit-card-db-upload').click()}>Upload</button>
                                    <input id="edit-card-db-upload" type="file" hidden accept="image/*"
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
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingCard(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingCard && (
                <div className="modal-overlay" onClick={() => setDeletingCard(null)}>
                    <div className="delete-modal glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '20px', textAlign: 'center', margin: 'auto' }}>
                        <h3 style={{ marginBottom: '15px' }}>Delete Card?</h3>
                        <p>Are you sure you want to delete <strong>{deletingCard.name}</strong> from the database?</p>
                        <p style={{ fontSize: '0.9em', color: '#aaa', marginBottom: '20px' }}>This action cannot be undone.</p>
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '10px', marginTop: '20px', display: 'flex' }}>
                            <button className="btn btn-secondary" onClick={() => setDeletingCard(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmDelete} style={{ backgroundColor: '#ff4444', borderColor: '#ff4444' }}>
                                <Trash2 size={16} style={{ marginRight: '5px' }} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper function to crop image and return a Blob
async function getCroppedBlob(imageSrc, pixelCrop) {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (error) => reject(error));
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg');
    });
}
