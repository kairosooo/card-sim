
import React, { useState } from 'react';
import useSound from 'use-sound';
import { CARD_BACK } from '../data/sets';
import './Card.css';

const Card = ({ card, isRevealed, onReveal, showDetails = true, onClick }) => {
    const [flipped, setFlipped] = useState(isRevealed);
    const [isRevealing, setIsRevealing] = useState(false);

    // Sync state with prop to trigger animation sequence
    React.useEffect(() => {
        if (isRevealed && !flipped) {
            // Start Reveal Animation
            setIsRevealing(true);

            // Wait for lift/particle effect before flipping
            const timer = setTimeout(() => {
                setFlipped(true);
            }, 300);

            return () => clearTimeout(timer);
        } else if (!isRevealed) {
            setFlipped(false);
            setIsRevealing(false);
        }
    }, [isRevealed]);

    // Parallax Logic using Ref (Performance optimization)
    const cardRef = React.useRef(null);

    // Mouse handlers for parallax - Direct DOM manipulation to avoid Re-renders
    const handleMouseMove = (e) => {
        if (!flipped || !cardRef.current) return;

        const cardRect = e.currentTarget.getBoundingClientRect();
        const cardWidth = cardRect.width;
        const cardHeight = cardRect.height;
        const centerX = cardRect.left + cardWidth / 2;
        const centerY = cardRect.top + cardHeight / 2;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        // Calculate rotation (max 15 degrees)
        const rotateX = (mouseY / (cardHeight / 2)) * -15;
        const rotateY = (mouseX / (cardWidth / 2)) * 15;

        // Calculate glare position (0% to 100%)
        const glareX = 50 + (mouseX / (cardWidth / 2)) * 50;
        const glareY = 50 + (mouseY / (cardHeight / 2)) * 50;

        // Apply styles directly
        const el = cardRef.current;
        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        el.style.setProperty('--mx', `${glareX}%`);
        el.style.setProperty('--my', `${glareY}%`);
        el.style.transition = 'none';
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        const el = cardRef.current;

        el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        el.style.setProperty('--mx', '50%');
        el.style.setProperty('--my', '50%');
        el.style.transition = 'transform 0.5s ease';
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 0; i < 5; i++) {
            stars.push(
                <span key={i} className={`star ${i < card.rarity ? 'active' : ''}`}>★</span>
            );
        }
        return stars;
    };

    const rarityClass = `rarity-${card.rarity}`;

    // Generate random particles
    const particles = [];
    if (isRevealing) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * 360;
            const distance = 80 + Math.random() * 100;
            const tx = Math.cos(angle * Math.PI / 180) * distance;
            const ty = Math.sin(angle * Math.PI / 180) * distance;
            particles.push(
                <div
                    key={i}
                    className={`particle ${rarityClass}`}
                    style={{ '--tx': `${tx}px`, '--ty': `${ty}px` }}
                />
            );
        }
    }

    const handleCardClick = (e) => {
        // Only prevent default/stop propagation if we are actually handling it
        if (onClick) {
            e.stopPropagation();
            // In the pack opener, only zoom if revealed. In other places, always zoom.
            if (flipped) {
                onClick(card);
            }
        }
    };

    return (
        <div
            ref={cardRef}
            className={`card-container ${flipped ? 'flipped' : 'unflipped'} ${isRevealing ? 'revealing' : ''} ${!showDetails ? 'full-art' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCardClick}
            style={{ cursor: flipped && onClick ? 'zoom-in' : 'default' }}
        >
            <div className="particles-container">
                {particles}
            </div>
            <div className="card-inner">
                <div className="card-front glass-panel">
                    {/* Holographic Sheen Layer */}
                    <div className={`holo-overlay ${card.holoPattern ? `holo-${card.holoPattern}` : ''}`}></div>

                    <div className={`card-glow ${rarityClass}`}></div>
                    <div className="card-content">
                        {showDetails && (
                            <div className="card-header">
                                <span className="card-name">{card.name}</span>
                            </div>
                        )}
                        <div className="card-image-container">
                            <img src={card.image} alt={card.name} className="card-image" />
                        </div>
                        {showDetails && (
                            <div className="card-footer">
                                <p className="card-desc">{card.description}</p>
                                <div className="card-rarity-stars">
                                    {renderStars()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card-back">
                    <div className="card-back-glow"></div>
                </div>
            </div>
        </div>
    );
};

export default Card;
