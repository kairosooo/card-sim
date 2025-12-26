import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Beaker, Sparkles, ArrowRight, Info, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import Card from './Card';
import './AlchemySystem.css';

const ALCHEMY_RECIPES = [
    { inputRarity: 1, outputRarity: 2, maxSuccessRate: 90, label: '2★ Upgrade', color: '#2ecc71' },
    { inputRarity: 2, outputRarity: 3, maxSuccessRate: 70, label: '3★ Upgrade', color: '#3498db' },
    { inputRarity: 3, outputRarity: 4, maxSuccessRate: 50, label: '4★ Upgrade', color: '#9b59b6' },
    { inputRarity: 4, outputRarity: 5, maxSuccessRate: 25, label: '5★ Upgrade', color: '#f1c40f' },
];

// Sound effect helper
const playSound = (soundFile) => {
    try {
        const audio = new Audio(soundFile);
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
        console.log('Audio error:', err);
    }
};

const AlchemySystem = ({ collection, setCollection, masterSets, onCardClick }) => {
    const [selectedRecipe, setSelectedRecipe] = useState(ALCHEMY_RECIPES[0]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [isTransmuting, setIsTransmuting] = useState(false);
    const [transmutedCard, setTransmutedCard] = useState(null);
    const [alchemyResult, setAlchemyResult] = useState(null); // 'success' or 'failure'
    const [showFullscreenAnimation, setShowFullscreenAnimation] = useState(false);

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

    const successRate = useMemo(() => {
        if (selectedCards.length === 0) return 0;
        return (selectedCards.length / 5) * selectedRecipe.maxSuccessRate;
    }, [selectedCards, selectedRecipe]);

    const handleSelectCard = (card) => {
        // Count how many of this card are already selected
        const currentlySelectedCountForward = selectedCards.filter(c => c.id === card.id).length;

        if (currentlySelectedCountForward >= card.availableCount) {
            return; // Cannot select more than owned
        }

        if (selectedCards.length >= 5) {
            return; // Orb full
        }

        playSound('/sounds/cardlv1.mp3'); // Card selection sound
        setSelectedCards([...selectedCards, card]);
    };

    const handleRemoveSelected = (index) => {
        const newSelected = [...selectedCards];
        newSelected.splice(index, 1);
        setSelectedCards(newSelected);
    };

    const handleTransmute = () => {
        if (selectedCards.length === 0) return;

        playSound('/sounds/cardlv3.mp3'); // Activation sound
        setIsTransmuting(true);
        setAlchemyResult(null);
        setShowFullscreenAnimation(true);

        // Perform alchemy after animation
        setTimeout(() => {
            const roll = Math.random() * 100;
            const isSuccess = roll <= successRate;

            if (isSuccess) {
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
                    setShowFullscreenAnimation(false);
                    return;
                }

                const resultCard = possibleOutputs[Math.floor(Math.random() * possibleOutputs.length)];

                // Play success sound based on rarity
                const successSounds = [
                    '/sounds/cardlv1.mp3',
                    '/sounds/cardlv2.mp3',
                    '/sounds/cardlv3.mp3',
                    '/sounds/cardlv4.mp3',
                    '/sounds/cardlv5.mp3'
                ];
                playSound(successSounds[selectedRecipe.outputRarity - 1]);

                // Update collection (Consume selected + Add result)
                setCollection(prev => {
                    const newCollection = { ...prev };
                    selectedCards.forEach(card => {
                        newCollection[card.id] = Math.max(0, (newCollection[card.id] || 1) - 1);
                        if (newCollection[card.id] === 0) delete newCollection[card.id];
                    });
                    newCollection[resultCard.id] = (newCollection[resultCard.id] || 0) + 1;
                    return newCollection;
                });

                setTransmutedCard(resultCard);
                setAlchemyResult('success');
            } else {
                // Failure - still consume cards!
                playSound('/sounds/cardlv1.mp3'); // Failure sound (lower pitch)

                setCollection(prev => {
                    const newCollection = { ...prev };
                    selectedCards.forEach(card => {
                        newCollection[card.id] = Math.max(0, (newCollection[card.id] || 1) - 1);
                        if (newCollection[card.id] === 0) delete newCollection[card.id];
                    });
                    return newCollection;
                });
                setAlchemyResult('failure');
            }

            setIsTransmuting(false);
            setSelectedCards([]);

            // Hide fullscreen animation after showing result
            setTimeout(() => {
                setShowFullscreenAnimation(false);
            }, 3000);
        }, 3000); // Extended animation time
    };

    const resetAlchemy = () => {
        setTransmutedCard(null);
        setAlchemyResult(null);
        setSelectedCards([]);
        setShowFullscreenAnimation(false);
    };

    return (
        <div className="alchemy-container">
            <div className="alchemy-header glass-panel">
                <div className="header-title">
                    <div className="orb-icon-wrapper">
                        <div className="orb-inner-glow"></div>
                        <Beaker className="icon-burn" />
                    </div>
                    <div>
                        <h2>The Orb</h2>
                        <p className="orb-subtitle">Sacrifice cards for a chance at glory</p>
                    </div>
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
                                setAlchemyResult(null);
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
                        <span className="count-hint">Select up to 5 cards</span>
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
                                {[...Array(5)].map((_, i) => (
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
                                ) : alchemyResult === 'success' && transmutedCard ? (
                                    <div className="result-card-preview" onClick={resetAlchemy}>
                                        <Card card={transmutedCard} isRevealed={true} showDetails={false} />
                                        <div className="success-overlay">
                                            <ShieldCheck size={40} />
                                            <span>SUCCESS!</span>
                                        </div>
                                    </div>
                                ) : alchemyResult === 'failure' ? (
                                    <div className="failure-orb" onClick={resetAlchemy}>
                                        <AlertTriangle size={60} />
                                        <span>FAILED</span>
                                        <p>Cards Consumed</p>
                                    </div>
                                ) : (
                                    <button
                                        className={`transmute-btn ${selectedCards.length > 0 ? 'ready' : ''}`}
                                        disabled={selectedCards.length === 0 || isTransmuting}
                                        onClick={handleTransmute}
                                    >
                                        <div className="success-rate-display">
                                            <span className="rate-value">{successRate.toFixed(1)}%</span>
                                            <span className="rate-label">Success Chance</span>
                                        </div>
                                        <Sparkles size={32} />
                                        <span>ACTIVATE</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="recipe-info glass-panel">
                        <div className="recipe-stat">
                            <span className="label">Input</span>
                            <span className="value">{selectedCards.length}x {selectedRecipe.inputRarity}★</span>
                        </div>
                        <ArrowRight className="recipe-arrow" />
                        <div className="recipe-stat">
                            <span className="label">Target</span>
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

            {/* Full-screen Transmutation Animation */}
            {showFullscreenAnimation && (
                <div className="fullscreen-transmutation-overlay">
                    <div className="transmutation-background">
                        {/* Animated particles */}
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="particle"
                                style={{
                                    '--delay': `${Math.random() * 2}s`,
                                    '--x': `${Math.random() * 100}vw`,
                                    '--y': `${Math.random() * 100}vh`,
                                    '--duration': `${2 + Math.random() * 3}s`
                                }}
                            />
                        ))}

                        {/* Central orb animation */}
                        <div className="central-orb-container">
                            {isTransmuting && (
                                <div className="central-orb pulsing">
                                    <div className="orb-ring ring-1"></div>
                                    <div className="orb-ring ring-2"></div>
                                    <div className="orb-ring ring-3"></div>
                                    <div className="orb-core">
                                        <Zap size={80} />
                                    </div>
                                    <div className="orb-text">TRANSMUTING...</div>
                                </div>
                            )}

                            {!isTransmuting && alchemyResult === 'success' && transmutedCard && (
                                <div className="result-display success-result">
                                    <div className="result-burst"></div>
                                    <div className="result-card-showcase">
                                        <img src={transmutedCard.image} alt={transmutedCard.name} className="result-card-image" />
                                    </div>
                                    <div className="result-rarity">
                                        {'★'.repeat(transmutedCard.rarity)}
                                    </div>
                                    <p className="result-subtitle">{transmutedCard.name}</p>
                                </div>
                            )}

                            {!isTransmuting && alchemyResult === 'failure' && (
                                <div className="result-display failure-result">
                                    <div className="failure-shockwave"></div>
                                    <h1 className="result-title">FAILED</h1>
                                    <p className="result-subtitle">Cards were consumed...</p>
                                    <div className="failure-particles">
                                        {[...Array(20)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="failure-particle"
                                                style={{
                                                    '--angle': `${(360 / 20) * i}deg`,
                                                    '--delay': `${i * 0.05}s`
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlchemySystem;
