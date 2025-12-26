import React, { useState, useMemo } from 'react';
import { Beaker, Sparkles, ArrowRight, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import Card from './Card';
import './AlchemySystem.css';

const ALCHEMY_RECIPES = [
    { inputRarity: 1, inputCount: 3, outputRarity: 2, label: 'Transmute: Uncommon', color: '#2ecc71' },
    { inputRarity: 2, inputCount: 4, outputRarity: 3, label: 'Transmute: Rare', color: '#3498db' },
    { inputRarity: 3, inputCount: 5, outputRarity: 4, label: 'Transmute: Ultra', color: '#9b59b6' },
    { inputRarity: 4, inputCount: 6, outputRarity: 5, label: 'Transmute: Secret', color: '#f1c40f' },
];

const AlchemySystem = ({ collection, setCollection, masterSets, onCardClick }) => {
    const [selectedRecipe, setSelectedRecipe] = useState(ALCHEMY_RECIPES[0]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [isTransmuting, setIsTransmuting] = useState(false);
    const [transmutedCard, setTransmutedCard] = useState(null);

    // Get all cards in the collection filtered by the input rarity of the selected recipe
    const availableCards = useMemo(() => {
        const allCards = [];
        masterSets.forEach(set => {
            set.cards.forEach(card => {
                const count = collection[card.id] || 0;
                if (count > 0 && card.rarity === selectedRecipe.inputRarity) {
                    allCards.push({ ...card, availableCount: count });
                }
            });
        });
        return allCards;
    }, [collection, masterSets, selectedRecipe]);

    const handleSelectCard = (card) => {
        // Count how many of this card are already selected
        const currentlySelectedCountForward = selectedCards.filter(c => c.id === card.id).length;

        if (currentlySelectedCountForward >= card.availableCount) {
            return; // Cannot select more than owned
        }

        if (selectedCards.length >= selectedRecipe.inputCount) {
            return; // Recipe full
        }

        setSelectedCards([...selectedCards, card]);
    };

    const handleRemoveSelected = (index) => {
        const newSelected = [...selectedCards];
        newSelected.splice(index, 1);
        setSelectedCards(newSelected);
    };

    const handleTransmute = () => {
        if (selectedCards.length < selectedRecipe.inputCount) return;

        setIsTransmuting(true);

        // Perform alchemy after animation
        setTimeout(() => {
            // Find possible output cards
            const possibleOutputs = [];
            masterSets.forEach(set => {
                set.cards.forEach(card => {
                    if (card.rarity === selectedRecipe.outputRarity) {
                        possibleOutputs.push(card);
                    }
                });
            });

            if (possibleOutputs.length === 0) {
                alert("No cards found for this rarity level!");
                setIsTransmuting(false);
                return;
            }

            const resultCard = possibleOutputs[Math.floor(Math.random() * possibleOutputs.length)];

            // Update collection
            setCollection(prev => {
                const newCollection = { ...prev };

                // Deduct ingredients
                selectedCards.forEach(card => {
                    newCollection[card.id] = Math.max(0, newCollection[card.id] - 1);
                    if (newCollection[card.id] === 0) delete newCollection[card.id];
                });

                // Add result
                newCollection[resultCard.id] = (newCollection[resultCard.id] || 0) + 1;

                return newCollection;
            });

            setTransmutedCard(resultCard);
            setIsTransmuting(false);
            setSelectedCards([]);
        }, 2000);
    };

    const resetAlchemy = () => {
        setTransmutedCard(null);
        setSelectedCards([]);
    };

    return (
        <div className="alchemy-container">
            <div className="alchemy-header glass-panel">
                <div className="header-title">
                    <Beaker className="icon-burn" />
                    <h2>The Orb</h2>
                </div>
                <div className="recipe-selector">
                    {ALCHEMY_RECIPES.map(recipe => (
                        <button
                            key={recipe.outputRarity}
                            className={`recipe-pill ${selectedRecipe.outputRarity === recipe.outputRarity ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedRecipe(recipe);
                                setSelectedCards([]);
                                setTransmutedCard(null);
                            }}
                            style={{ '--accent': recipe.color }}
                        >
                            {recipe.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="alchemy-main">
                {/* Left: Ingredient Selector */}
                <div className="ingredient-vault glass-panel">
                    <div className="vault-header">
                        <h3>Your {selectedRecipe.inputRarity}★ Collection</h3>
                        <span className="count-hint">Select {selectedRecipe.inputCount} cards</span>
                    </div>
                    <div className="ingredient-grid">
                        {availableCards.length === 0 ? (
                            <div className="empty-vault">
                                <AlertTriangle size={48} />
                                <p>No {selectedRecipe.inputRarity}-star cards available in your binder.</p>
                            </div>
                        ) : (
                            availableCards.map(card => {
                                const usedCount = selectedCards.filter(c => c.id === card.id).length;
                                const remaining = card.availableCount - usedCount;

                                return (
                                    <div
                                        key={card.id}
                                        className={`ingredient-item ${remaining === 0 ? 'exhausted' : ''}`}
                                        onClick={() => handleSelectCard(card)}
                                    >
                                        <div className="ingredient-preview">
                                            <img src={card.image} alt={card.name} />
                                            {remaining > 0 && <span className="remaining-badge">x{remaining}</span>}
                                        </div>
                                        <span className="ingredient-name">{card.name}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Center: The Altar */}
                <div className="alchemy-altar">
                    <div className="altar-platform">
                        <div className={`magic-circle ${isTransmuting ? 'spinning' : ''}`}>
                            <div className="selected-slots">
                                {[...Array(selectedRecipe.inputCount)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`slot ${selectedCards[i] ? 'filled' : ''}`}
                                        onClick={() => handleRemoveSelected(i)}
                                    >
                                        {selectedCards[i] ? (
                                            <img src={selectedCards[i].image} alt="selected" />
                                        ) : (
                                            <div className="slot-placeholder">
                                                <span>{i + 1}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="transmute-orb">
                                {isTransmuting ? (
                                    <div className="glow-effect"></div>
                                ) : transmutedCard ? (
                                    <div className="result-card-preview" onClick={resetAlchemy}>
                                        <Card card={transmutedCard} isRevealed={true} showDetails={false} />
                                        <div className="success-overlay">
                                            <ShieldCheck size={40} />
                                            <span>SUCCESS!</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className={`transmute-btn ${selectedCards.length === selectedRecipe.inputCount ? 'ready' : ''}`}
                                        disabled={selectedCards.length < selectedRecipe.inputCount || isTransmuting}
                                        onClick={handleTransmute}
                                    >
                                        <Sparkles size={32} />
                                        <span>TRANSMUTE</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="recipe-info glass-panel">
                        <div className="recipe-stat">
                            <span className="label">Input</span>
                            <span className="value">{selectedRecipe.inputCount}x {selectedRecipe.inputRarity}★</span>
                        </div>
                        <ArrowRight className="recipe-arrow" />
                        <div className="recipe-stat">
                            <span className="label">Output</span>
                            <span className="value">1x {selectedRecipe.outputRarity}★</span>
                        </div>
                    </div>
                </div>
            </div>

            {transmutedCard && (
                <div className="transmution-celebration" onClick={resetAlchemy}>
                    <div className="celebration-content" onClick={e => e.stopPropagation()}>
                        <Sparkles className="spark-1" />
                        <Sparkles className="spark-2" />
                        <h2>Alchemy Result</h2>
                        <div className="result-card-large">
                            <Card card={transmutedCard} isRevealed={true} />
                        </div>
                        <div className="result-info">
                            <h3>{transmutedCard.name}</h3>
                            <div className="stars">{'★'.repeat(transmutedCard.rarity)}</div>
                            <p>Successfully Transmuted from {selectedRecipe.inputCount} {selectedRecipe.inputRarity}★ cards!</p>
                            <button className="btn btn-primary" onClick={resetAlchemy}>Claim Card</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlchemySystem;
