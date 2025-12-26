import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { ArrowLeft } from 'lucide-react';
import Card from './Card';
import { SETS, RARITIES } from '../data/sets';
import './PackOpener.css';

const PackOpener = ({ set, onComplete, onAddCards, packSize = 10, onReplay, onCardClick }) => {
    const [packCards, setPackCards] = useState([]);
    const [revealedCount, setRevealedCount] = useState(0);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isDone, setIsDone] = useState(false);

    // Sounds
    // Sounds
    const [playRip] = useSound('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', { volume: 0.8 }); // Placeholder for rip
    // Rarity Sounds
    const [playLv1] = useSound('/sounds/cardlv1.mp3', { volume: 0.5 });
    const [playLv2] = useSound('/sounds/cardlv2.mp3', { volume: 0.5 });
    const [playLv3] = useSound('/sounds/cardlv3.mp3', { volume: 0.6 });
    const [playLv4] = useSound('/sounds/cardlv4.mp3', { volume: 0.7 });
    const [playLv5] = useSound('/sounds/cardlv5.mp3', { volume: 0.8 });

    // Animation Stages: 'pack-entry' -> 'tear-interaction' -> 'ripping' -> 'dealing' -> 'review'
    const [animationStage, setAnimationStage] = useState('pack-entry');

    useEffect(() => {
        generatePack();
    }, [set]);

    // Initial Entry
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimationStage('tear-interaction');
        }, 1000); // Enter animation
        return () => clearTimeout(timer);
    }, []);

    const generatePack = () => {
        const cards = [];

        // Updated Weights based on user request
        // 5 star 1%, 4 star 5%, 3 star 20%, 2 star 30%, 1 star 44%
        const getRarityFromRoll = () => {
            const roll = Math.random() * 100;
            if (roll < 1) return 5;       // 1%
            if (roll < 6) return 4;       // 1+5 = 6%
            if (roll < 26) return 3;      // 6+20 = 26%
            if (roll < 56) return 2;      // 26+30 = 56%
            return 1;                     // Remainder (44%)
        };

        // Helper to get cards by rarity or fallback to lower
        const getCardsByPool = (targetRarity) => {
            const pool = set.cards.filter(c => c.rarity === targetRarity);
            if (pool.length > 0) return pool;

            // Fallback strategy: try lower rarities, then higher
            for (let r = targetRarity - 1; r >= 1; r--) {
                const lowerPool = set.cards.filter(c => c.rarity === r);
                if (lowerPool.length > 0) return lowerPool;
            }
            for (let r = targetRarity + 1; r <= 5; r++) {
                const higherPool = set.cards.filter(c => c.rarity === r);
                if (higherPool.length > 0) return higherPool;
            }
            return set.cards; // Return everything if nothing else works
        };

        const generateCard = () => {
            const rarity = getRarityFromRoll();
            const pool = getCardsByPool(rarity);
            return pool[Math.floor(Math.random() * pool.length)];
        };

        const isGodPack = Math.random() < 0.0005; // 1 in 2000 

        if (isGodPack && packSize > 1) {
            console.log("GOD PACK TRIGGERED!");
            const topTierPool = [...set.cards.filter(c => c.rarity >= 4)];
            const finalPool = topTierPool.length > 0 ? topTierPool : set.cards;
            for (let i = 0; i < packSize; i++) {
                cards.push(finalPool[Math.floor(Math.random() * finalPool.length)]);
            }
        } else {
            for (let i = 0; i < packSize; i++) {
                cards.push(generateCard());
            }
        }

        setPackCards(cards);
    };

    // --- PHYSICS & INTERACTION STATE ---
    const [dragState, setDragState] = useState({
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        type: null // 'rip' or 'card'
    });

    // Refs for direct DOM manipulation (Performance)
    const stripRef = React.useRef(null);
    const stackRef = React.useRef(null);
    const topCardRef = React.useRef(null);

    const [hasStartedReveal, setHasStartedReveal] = useState(false);
    const [activeCardRevealed, setActiveCardRevealed] = useState(false); // Used for "sliding away" animation now

    // --- GESTURE HANDLERS ---
    const handleInputStart = (e, type) => {
        if (isDone) return;

        // Only allow interactions in correct stages
        if (type === 'rip' && animationStage !== 'tear-interaction') return;
        if (type === 'card' && animationStage !== 'dealing') return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setDragState({
            active: true,
            startX: clientX,
            startY: clientY,
            currentX: clientX,
            currentY: clientY,
            type: type
        });
    };

    const handleInputMove = (e) => {
        if (!dragState.active) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragState.startX;
        const deltaY = clientY - dragState.startY;

        // --- TYPE: RIP (Horizontal Swipe) ---
        if (dragState.type === 'rip') {
            if (deltaX < 0) return; // Can't rip backwards
            const maxRipDistance = 200;
            const progress = Math.min(deltaX / maxRipDistance, 1.2); // Allow slight over-drag

            if (stripRef.current) {
                // Map progress to rotation and tearing separation
                // Illusion: Strip bends back (-Z rotation) and moves right
                stripRef.current.style.transform = `
                    translateX(${progress * 50}px) 
                    rotateZ(${progress * 10}deg) 
                    rotateY(${progress * -30}deg)
                `;
                stripRef.current.style.opacity = `${1 - (progress * 0.2)}`; // Fade slightly at extreme stress
            }
        }

        // --- TYPE: CARD ---
        if (dragState.type === 'card' && !activeCardRevealed) {
            // Logic differs if we are just starting or already revealing
            if (!hasStartedReveal) {
                // Dragging to flip the WHOLE STACK
                if (stackRef.current) {
                    const rotateY = Math.min(Math.max(deltaX * 0.5, 0), 180); // 0 to 180 flip
                    stackRef.current.style.transform = `perspective(1000px) rotateY(${rotateY}deg)`;
                }
            } else {
                // Sliding the TOP CARD to reveal next
                if (topCardRef.current) {
                    const translateX = deltaX;
                    const translateY = deltaY;
                    const rotateZ = deltaX * 0.05;
                    // Rotate Y to show thickness (edge) when dragging sideways
                    // Max rotation limited to prevent weird flipping
                    const rotateY = Math.max(Math.min(deltaX * 0.1, 45), -45);
                    topCardRef.current.style.transform = `translate(${translateX}px, ${translateY}px) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg)`;
                }
            }
        }
    };

    // To fix the "InputEnd" data access issue, we'll use a Ref for mutable drag values
    const dragValues = React.useRef({ x: 0, y: 0 });

    const handleInputMoveRef = (e) => {
        if (!dragState.active) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragValues.current = {
            x: clientX - dragState.startX,
            y: clientY - dragState.startY
        };
        handleInputMove(e); // Update visuals
    };

    const handleInputEndRef = () => {
        if (!dragState.active) return;
        const finalX = dragValues.current.x;
        const finalY = dragValues.current.y;

        // --- LOGIC: RIP COMMIT ---
        if (dragState.type === 'rip') {
            // Threshold: 150px
            if (finalX > 150) {
                // SUCCESS
                setAnimationStage('ripping');
                playRip();
                setTimeout(() => {
                    setAnimationStage('dealing');
                }, 800);
            } else {
                // SNAP BACK
                if (stripRef.current) {
                    stripRef.current.style.transition = 'transform 0.3s ease';
                    stripRef.current.style.transform = 'none';
                    stripRef.current.style.opacity = '1'; // Reset opacity
                    setTimeout(() => { if (stripRef.current) stripRef.current.style.transition = ''; }, 300);
                }
            }
        }

        // --- TYPE: CARD ---
        if (dragState.type === 'card' && !activeCardRevealed) {
            const isClick = Math.abs(finalX) < 10 && Math.abs(finalY) < 10;
            const isSwipe = finalX > 80;

            if (!hasStartedReveal) {
                // Action: FLIP STACK TO REVEAL FIRST CARD
                if (isClick || isSwipe) {
                    setHasStartedReveal(true);
                    // Play sound for first card immediately
                    playCardSound(0);
                    if (stackRef.current) {
                        stackRef.current.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
                        stackRef.current.style.transform = 'perspective(1000px) rotateY(180deg) scaleX(-1)'; // Flip stack and correct mirror
                    }
                } else {
                    // Reset
                    if (stackRef.current) {
                        stackRef.current.style.transition = 'transform 0.3s ease';
                        stackRef.current.style.transform = 'none';
                        setTimeout(() => { if (stackRef.current) stackRef.current.style.transition = ''; }, 300);
                    }
                }
            } else {
                // Action: SLIDE CARD TO REVEAL NEXT
                const isSwipe = Math.abs(finalX) > 60 || Math.abs(finalY) > 60;

                if (isSwipe) {
                    // Send it flying in the direction of the swipe
                    triggerRevealSequence(false, finalX, finalY);
                } else if (isClick) {
                    // Do nothing here, allow onClick on the Card component to handle zooming
                } else {
                    // Reset Slide
                    if (topCardRef.current) {
                        topCardRef.current.style.transition = 'transform 0.3s ease';
                        topCardRef.current.style.transform = 'none';
                        setTimeout(() => { if (topCardRef.current) topCardRef.current.style.transition = ''; }, 300);
                    }
                }
            }
        }

        setDragState(prev => ({ ...prev, active: false }));
        dragValues.current = { x: 0, y: 0 };
    };

    const playCardSound = (index) => {
        const card = packCards[index];
        if (!card) { playLv1(); return; }
        switch (card.rarity) {
            case 1: playLv1(); break;
            case 2: playLv2(); break;
            case 3: playLv3(); break;
            case 4: playLv4(); break;
            case 5: playLv5(); break;
            default: playLv1();
        }
    };

    const timerRef = React.useRef(null);
    const isSkippingRef = React.useRef(false);

    const triggerRevealSequence = (instant = false, vx = 400, vy = 0) => {
        // If already revealing and user clicks again -> FAST FORWARD current card
        if (activeCardRevealed && !instant) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                // Immediately finish current card
                finalizeCardReveal();
            }
            return;
        }

        if (activeCardRevealed) return;

        // Mark current card as sliding away
        setActiveCardRevealed(true);

        // Apply dynamic fly-off if we have coordinates
        if (topCardRef.current && !instant) {
            const el = topCardRef.current;
            const magnitude = Math.sqrt(vx * vx + vy * vy) || 400;
            const dirX = vx / magnitude;
            const dirY = vy / magnitude;

            const targetX = dirX * 1000;
            const targetY = dirY * 1000;
            const rotate = dirX * 30;

            el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.4s ease';
            el.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${rotate}deg)`;
            el.style.opacity = '0';
        }

        // Calculate next card index
        const nextIndex = currentCardIndex + 1;

        // Play sound for the NEXT card (the one appearing underneath)
        if (nextIndex < 10 && !isSkippingRef.current) {
            setTimeout(() => playCardSound(nextIndex), 100);
        }

        const duration = instant ? 100 : 500;

        timerRef.current = setTimeout(() => {
            finalizeCardReveal(instant);
        }, duration);
    };

    const finalizeCardReveal = (continueSkipping = false) => {
        // Move to kept pile 
        setCurrentCardIndex(prev => {
            const next = prev + 1;
            // Check completion *inside* the state update to ensure sync, 
            // but we need side effects. Rely on useEffect or check new value.
            return next;
        });

        setRevealedCount(prev => {
            const next = prev + 1;
            if (next === packCards.length) {
                setTimeout(() => {
                    setAnimationStage('review');
                    setIsDone(true);
                    onAddCards(packCards);
                }, 500);
            } else if (continueSkipping || isSkippingRef.current) {
                // If we are in "Reveal All" mode or just finished a fast-forward, trigger next immediately
                // Small delay to allow React render cycle to update 'currentCardIndex' keys
                setTimeout(() => {
                    setActiveCardRevealed(false);
                    // Create a microtask to ensure state update propagated? 
                    // Actually, we just need to reset activeRevealed, then trigger next.
                    // But triggerRevealSequence checks activeCardRevealed.
                    triggerRevealSequence(true);
                }, 50);
                return next;
            }
            return next;
        });

        // Reset if not skipping (skipping logic handled above)
        if (!continueSkipping && !isSkippingRef.current) {
            setActiveCardRevealed(false);
        }
    };

    const handleRevealAll = (e) => {
        e.stopPropagation(); // Prevent triggering other gestures
        isSkippingRef.current = true;
        triggerRevealSequence(true); // Start the chain
    };


    return (
        <div
            className="pack-opener-overlay"
            onMouseMove={handleInputMoveRef}
            onMouseUp={handleInputEndRef}
            onMouseLeave={handleInputEndRef}
            onTouchMove={handleInputMoveRef}
            onTouchEnd={handleInputEndRef}
        >
            {/* BACK BUTTON */}
            {(animationStage === 'pack-entry' || animationStage === 'tear-interaction') && (
                <button
                    className="close-pack-btn"
                    onClick={onComplete}
                    style={{
                        position: 'absolute',
                        top: '40px',
                        left: '40px',
                        zIndex: 2000,
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backdropFilter: 'blur(5px)',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <ArrowLeft size={20} /> Back
                </button>
            )}

            <div className="pack-opener-content">

                {/* STAGE 1 & 2: PACK INTERACTION */}
                {(animationStage === 'pack-entry' || animationStage === 'tear-interaction' || animationStage === 'ripping') && (
                    <div
                        className="pack-interaction-container"
                        onMouseDown={(e) => handleInputStart(e, 'rip')}
                        onTouchStart={(e) => handleInputStart(e, 'rip')}
                    >
                        <div className={`booster-pack-model ${animationStage}`}>
                            <div
                                className={`pack-top-strip ${animationStage === 'ripping' ? 'flying-off' : ''}`}
                                style={{ '--set-color': set.color }}
                                ref={stripRef}
                            >
                                <div className="crimp-texture"></div>
                            </div>
                            <div className="pack-body" style={{ '--set-color': set.color }}>
                                <div className="set-symbol">{set.symbol}</div>
                                <h3>{set.name}</h3>
                                {animationStage === 'tear-interaction' && (
                                    <div className="swipe-hint">SWIPE TO RIP ➔</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STAGE 3: STACKED DEALING */}
                {animationStage === 'dealing' && (
                    <div
                        className="dealing-scene"
                        onMouseDown={(e) => handleInputStart(e, 'card')}
                        onTouchStart={(e) => handleInputStart(e, 'card')}
                    >
                        <div className="active-card-stack large-stack" ref={stackRef}>
                            {packCards.map((card, index) => {
                                if (index < currentCardIndex) return null;

                                const isTop = index === currentCardIndex;
                                const offset = (index - currentCardIndex) * 2;

                                return (
                                    <div
                                        key={card.id + index}
                                        ref={isTop ? topCardRef : null}
                                        className={`stack-card ${isTop ? 'top-card' : 'stacked-card'}`}
                                        style={{
                                            zIndex: 20 - index,
                                            transform: isTop ? 'none' : `scale(${1 - offset / 100}) translateY(-${offset}px)`
                                        }}
                                    >
                                        <Card
                                            card={card}
                                            isRevealed={hasStartedReveal}
                                            showDetails={false}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <button className="reveal-all-btn" onClick={handleRevealAll}>SKIP</button>
                    </div>
                )}

                {/* STAGE 4: REVIEW / OVERVIEW */}
                {animationStage === 'review' && (
                    <div className="review-scene">
                        <h2>New Cards Added!</h2>
                        <div className="pack-horizontal-scroll fade-in-grid">
                            {(() => {
                                const uniqueCardsMap = packCards.reduce((acc, card) => {
                                    const existing = acc.find(c => c.card.id === card.id);
                                    if (existing) {
                                        existing.count++;
                                    } else {
                                        acc.push({ card, count: 1 });
                                    }
                                    return acc;
                                }, []);

                                return uniqueCardsMap.map(({ card, count }, index) => (
                                    <div key={card.id} className="card-wrapper" style={{ animationDelay: `${index * 0.1}s` }}>
                                        <Card card={card} isRevealed={true} showDetails={false} />
                                        {count > 1 && (
                                            <div className="card-count-badge">x{count}</div>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                        <div className="pack-actions">
                            <button className="btn" onClick={onComplete}>Back to Sets</button>
                            <button className="btn btn-secondary" onClick={onReplay}>Open Another</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PackOpener;
