
import React, { useState, useCallback, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, X, Check, Sparkles, Database, LayoutGrid, Edit2, Save, Trash2, ImagePlus } from 'lucide-react';
import Card from './Card';
import { fileToBase64 } from '../utils/fileUtils';
import './CardBuilder.css';

const ASPECT_RATIO = 2.5 / 3.5;

export default function CardBuilder({ onCreateCard, masterSets, onUpdateMasterSets, onCardClick }) {
    const [viewMode, setViewMode] = useState('builder'); // 'builder', 'inventory', or 'premade'
    const [image, setImage] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    // Creator State
    const [cardName, setCardName] = useState('New Card');
    const [rarity, setRarity] = useState(1);
    const [holoPattern, setHoloPattern] = useState('none');
    const [description, setDescription] = useState('A unique custom creation.');
    const [previewImage, setPreviewImage] = useState(null);

    // Inventory State
    const [searchQuery, setSearchQuery] = useState('');
    const [editingCard, setEditingCard] = useState(null); // For global edit
    const [deletingCard, setDeletingCard] = useState(null); // For deletion confirmation

    const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const processFiles = async (files) => {
        if (!files || files.length === 0) return;

        if (files.length === 1) {
            // Single File - Cropper Mode
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImage(reader.result);
                setShowCropper(true);
            });
            reader.readAsDataURL(files[0]);
        } else {
            // Batch Mode (from builder tab)
            if (!window.confirm(`Batch create ${files.length} cards?`)) return;

            let successCount = 0;
            const newCards = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const base64 = await fileToBase64(file);
                    const newCard = {
                        id: `custom-${Date.now()}-${i}`,
                        name: file.name.replace(/\.[^/.]+$/, "") || 'New Card',
                        rarity: 1, // Default rarity for builder batch
                        holoPattern: 'none',
                        description: 'Batch created.',
                        image: base64,
                        isCustom: true
                    };
                    newCards.push(newCard);
                    successCount++;
                } catch (err) {
                    console.error('Batch upload error:', err);
                }
            }
            if (newCards.length > 0) {
                onCreateCard(newCards);
            }
            alert(`Successfully created ${successCount} cards!`);
            setViewMode('inventory');
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

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

    const createCroppedImage = async () => {
        try {
            const croppedBlob = await getCroppedBlob(image, croppedAreaPixels);
            const base64 = await fileToBase64(croppedBlob);
            setPreviewImage(base64);
            setShowCropper(false);
        } catch (e) {
            console.error('Processing Error:', e);
            alert('Image processing failed.');
        }
    };

    const handleSave = () => {
        if (!previewImage) return;

        const newCard = {
            id: `custom-${Date.now()}`,
            name: cardName,
            rarity: rarity,
            holoPattern: holoPattern,
            description: description,
            image: previewImage,
            isCustom: true
        };

        onCreateCard(newCard);

        // Reset form
        setCardName('New Card');
        setRarity(1);
        setHoloPattern('none');
        setPreviewImage(null);
        setImage(null);
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
            <div className="builder-nav glass-panel" style={{ marginBottom: '20px', padding: '10px', display: 'flex', gap: '10px' }}>
                <button
                    className={`btn ${viewMode === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('builder')}
                >
                    <Sparkles size={16} style={{ marginRight: '8px' }} /> Card Creator
                </button>
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

            {viewMode === 'builder' && (
                <div className="builder-layout">
                    <div className="builder-controls glass-panel">
                        <h2>Create New Card</h2>

                        <div className="control-group">
                            <label>Card Name</label>
                            <input
                                type="text"
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                placeholder="Enter card name..."
                            />
                        </div>

                        <div className="control-group">
                            <label>Rarity (Stars)</label>
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

                        <div className="control-group">
                            <label>Holo Pattern</label>
                            <select
                                value={holoPattern}
                                onChange={(e) => setHoloPattern(e.target.value)}
                                className="holo-select"
                            >
                                <option value="none">None (Standard)</option>
                                <option value="linear">Linear Sheen</option>
                                <option value="rainbow">Rainbow (Secret Rare)</option>
                                <option value="sparkle">Cosmos / Sparkle</option>
                            </select>
                        </div>

                        <div className="control-group">
                            <label>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this card do?"
                            />
                        </div>

                        <div className="control-group">
                            <label>Image</label>
                            {!previewImage ? (
                                <div
                                    className="upload-zone"
                                    onClick={() => document.getElementById('file-upload').click()}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={handleDrop}
                                >
                                    <Upload size={32} />
                                    <span>Drag & Drop OR Click (Multiselect Supported)</span>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        hidden
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileInput}
                                    />
                                </div>
                            ) : (
                                <div className="image-preview-strip">
                                    <img src={previewImage} alt="preview" />
                                    <button className="change-img-btn" onClick={() => setImage(null) || setPreviewImage(null)}>
                                        <X size={16} /> Remove
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            className="btn btn-primary btn-full"
                            disabled={!previewImage || !cardName}
                            onClick={handleSave}
                        >
                            Create Card
                        </button>
                    </div>

                    <div className="builder-preview">
                        <h3>Live Preview</h3>
                        <div className="preview-container">
                            <Card
                                card={{
                                    name: cardName,
                                    rarity: rarity,
                                    holoPattern: holoPattern,
                                    description: description,
                                    image: previewImage || 'https://via.placeholder.com/400x600?text=Upload+Image'
                                }}
                                isRevealed={true}
                                onClick={onCardClick}
                            />
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

            {showCropper && (
                <div className="cropper-modal">
                    <div className="cropper-content glass-panel">
                        <h3>Crop Card Image</h3>
                        <div className="cropper-wrapper">
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={ASPECT_RATIO}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className="cropper-controls">
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                onChange={(e) => setZoom(e.target.value)}
                            />
                            <div className="cropper-btns">
                                <button className="btn btn-secondary" onClick={() => setShowCropper(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={createCroppedImage}>Apply Crop</button>
                            </div>
                        </div>
                    </div>
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
