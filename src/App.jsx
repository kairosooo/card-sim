import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { SETS } from './data/sets';
import { db, migrateFromLocalStorage } from './utils/db';
import PackOpener from './components/PackOpener';

import CardBuilder from './components/CardBuilder';
import AdminPanel from './components/AdminPanel';
import RedeemCodes from './components/RedeemCodes';
import Card from './components/Card';
import AlchemySystem from './components/AlchemySystem';
import './App.css';

function App() {
  const [activeSet, setActiveSet] = useState(null);
  const [packInstanceId, setPackInstanceId] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initial states start empty/default, populated via Async Effect
  // No persistent state read synchronously from localStorage anymore
  const [collection, setCollection] = useState({});
  const [view, setView] = useState('sets');
  const [masterSets, setMasterSets] = useState(SETS);
  const [goldCoins, setGoldCoins] = useState(500);
  const [claimedCodes, setClaimedCodes] = useState([]);
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  const [zoomedCard, setZoomedCard] = useState(null);
  const [viewingSetCards, setViewingSetCards] = useState(null);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Binder filters
  const [rarityFilter, setRarityFilter] = useState('all'); // 'all', '1', '2', '3', '4', '5'
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // 'all', 'owned', 'missing'

  // Fixed baseline for collection tracking - based on initial SETS data
  // Dynamic total cards based on current masterSets state
  const totalDatabaseCards = React.useMemo(() => {
    // Only count UNIQUE cards across all sets
    const uniqueIds = new Set();
    masterSets.forEach(set => {
      // Exclude "Custom Creations" / Inventory from the Global Database count
      // Only cards explicitly added to a "Real" Expansion Pack count towards completion.
      if (set.id === 'set-custom') return;

      if (set.cards) {
        set.cards.forEach(card => uniqueIds.add(card.id));
      }
    });
    return uniqueIds.size;
  }, [masterSets]);

  // Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Run migration first (checks for localStorage data)
        await migrateFromLocalStorage();

        // Load all data from IDB
        const storedSets = await db.get('master-sets');
        if (storedSets) {
          // Validate and potentially restore default sets if corrupted/empty
          const totalCards = storedSets.reduce((acc, s) => acc + (s.cards || []).length, 0);
          const defaultTotalCards = SETS.reduce((acc, s) => acc + (s.cards || []).length, 0);
          if (totalCards === 0 && defaultTotalCards > 0) {
            setMasterSets(SETS);
          } else {
            setMasterSets(storedSets);
          }
        } else {
          setMasterSets(SETS);
        }

        const storedCollection = await db.get('card-collection');
        if (storedCollection) setCollection(storedCollection);

        const storedCoins = await db.get('gold-coins');
        if (storedCoins !== undefined) setGoldCoins(storedCoins);

        const storedCodes = await db.get('claimed-codes');
        if (storedCodes) setClaimedCodes(storedCodes);

      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistence Effects (Now Async)
  useEffect(() => {
    if (!isLoading) db.set('card-collection', collection);
  }, [collection, isLoading]);

  useEffect(() => {
    if (!isLoading) db.set('gold-coins', goldCoins);
  }, [goldCoins, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      db.set('master-sets', masterSets).catch(err => {
        console.error('Failed to save master-sets to IndexedDB:', err);
        // IndexedDB quota error is rarer
      });
    }
  }, [masterSets, isLoading]);

  useEffect(() => {
    if (!isLoading) db.set('claimed-codes', claimedCodes);
  }, [claimedCodes, isLoading]);

  const handleUpdateMasterSets = (newSets) => {
    setMasterSets(newSets);
  };

  const handleCardClick = (card) => {
    setZoomedCard(card);
  };

  const handleOpenPack = (set, count, cost) => {
    if (goldCoins < cost) {
      alert(`Not enough Gold Coins! You need ${cost} coins.`);
      return;
    }
    setGoldCoins(prev => prev - cost);
    setActiveSet({ ...set, packSize: count, cost: cost });
  };

  const handleReplay = () => {
    if (!activeSet) return;
    const cost = activeSet.cost || 0;
    if (goldCoins < cost) {
      alert(`Not enough Gold Coins! You need ${cost} coins.`);
      return;
    }
    setGoldCoins(prev => prev - cost);
    setPackInstanceId(prev => prev + 1);
  };

  const handleAddCards = (cards) => {
    setCollection(prev => {
      const newCollection = { ...prev };
      cards.forEach(card => {
        newCollection[card.id] = (newCollection[card.id] || 0) + 1;
      });
      return newCollection;
    });
  };

  const handleCreateCard = (cardOrCards) => {
    const cardsToAdd = Array.isArray(cardOrCards) ? cardOrCards : [cardOrCards];

    setMasterSets(prevSets => {
      let newSets = [...prevSets];
      let customSetIndex = newSets.findIndex(s => s.id === 'set-custom');

      if (customSetIndex === -1) {
        // Create 'Custom Creations' set if it doesn't exist
        const customSet = {
          id: 'set-custom',
          name: 'Custom Creations',
          symbol: '✨',
          color: '#e67e22',
          cards: [...cardsToAdd]
        };
        newSets.push(customSet);
      } else {
        // Add cards to existing set
        newSets[customSetIndex] = {
          ...newSets[customSetIndex],
          cards: [...newSets[customSetIndex].cards, ...cardsToAdd]
        };
      }
      return newSets;
    });
  };

  const uniqueOwned = Object.keys(collection).length;
  const completionRate = totalDatabaseCards > 0
    ? ((uniqueOwned / totalDatabaseCards) * 100).toFixed(1)
    : '0.0';

  const handleAdminLogin = () => {
    if (adminPasswordInput === '1234qwer') {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
    } else {
      alert('Incorrect Password');
    }
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <div className="logo" style={{ fontSize: '3rem', marginBottom: '20px' }}>
          <span className="logo-icon">✨</span>
        </div>
        <h2>Loading CardSim...</h2>
        <p style={{ color: '#888' }}>Migrating database & assets</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header glass-panel">
        <div className="header-top-row">
          <div className="logo">
            <span className="logo-icon">✨</span>
            <h1>CardSim</h1>
          </div>
          <div className="stats">
            <div className="stat-group">
              <div className="stat-item">
                <span className="stat-label">Gold</span>
                <span className="stat-value" style={{ color: '#f1c40f' }}>🟡 {goldCoins}</span>
              </div>
              <button className="gold-plus-btn" onClick={() => setShowRedeemModal(true)}>
                <Plus size={16} color="#000" strokeWidth={4} />
              </button>
            </div>
            <div className="stat-item">
              <span className="stat-label">Collected</span>
              <span className="stat-value">{uniqueOwned} / {totalDatabaseCards}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completion</span>
              <span className="stat-value">{completionRate}%</span>
            </div>
          </div>
        </div>
        <nav className="nav-btns">
          <button className={`btn ${view === 'sets' ? '' : 'btn-secondary'}`} onClick={() => setView('sets')}>PACK SHOP</button>
          <button className={`btn ${view === 'collection' ? '' : 'btn-secondary'}`} onClick={() => setView('collection')}>My Collection</button>
          <button className={`btn ${view === 'builder' ? '' : 'btn-secondary'}`} onClick={() => setView('builder')}>Card & Pack Upload</button>
          <button className={`btn ${view === 'admin' ? '' : 'btn-secondary'}`} onClick={() => setView('admin')}>Admin</button>
          <button className={`btn ${view === 'alchemy' ? '' : 'btn-secondary'}`} onClick={() => setView('alchemy')}>Orb</button>
        </nav>
      </header>

      <main className="content">
        {view === 'sets' && (
          <div className="sets-grid">
            {masterSets.length === 0 ? (
              <div className="empty-state-full glass-panel">
                <h2>No Expansions Found</h2>
                <p>Go to the <strong>Expansion Pack Management</strong> tab to create your first set!</p>
                <button className="btn btn-primary" onClick={() => setView('admin')}>Go to Management</button>
              </div>
            ) : masterSets.map(set => (
              <div key={set.id} className="set-card glass-panel" style={{ '--set-color': set.color }}>
                {set.image ? (
                  <div className="set-pack-art" onClick={() => setViewingSetCards(set)}>
                    <img src={set.image} alt={set.name} />
                    <div className="pack-art-overlay">
                      <span>View Cards</span>
                    </div>
                  </div>
                ) : (
                  <div className="set-symbol-fallback" onClick={() => setViewingSetCards(set)}>{set.symbol}</div>
                )}

                <div className="set-details-bottom">
                  <div className="set-info-row">
                    <span className="set-mini-symbol">{set.symbol}</span>
                    <h3>{set.name}</h3>
                  </div>
                  <p className="card-count-text">{(set.cards || []).length} Cards</p>

                  <div className="buy-in-options">
                    <button className="btn buy-btn" onClick={() => handleOpenPack(set, 1, set.price || 10)}>
                      1 Draw<br /><span className="cost-tag">{set.price || 10} 🟡</span>
                    </button>
                    <button className="btn buy-btn" onClick={() => handleOpenPack(set, 10, (set.price || 10) * 10)}>
                      10 Draws<br /><span className="cost-tag">{(set.price || 10) * 10} 🟡</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'collection' && (
          <div className="collection-view">
            <div className="collection-header">
              <h2>Your Collection</h2>
              <div className="collection-filters">
                <div className="filter-group">
                  <label>Rarity:</label>
                  <div className="filter-buttons">
                    <button
                      className={`filter-btn ${rarityFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setRarityFilter('all')}
                    >
                      All
                    </button>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        className={`filter-btn ${rarityFilter === star.toString() ? 'active' : ''}`}
                        onClick={() => setRarityFilter(star.toString())}
                      >
                        {'★'.repeat(star)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <label>Status:</label>
                  <div className="filter-buttons">
                    <button
                      className={`filter-btn ${ownershipFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setOwnershipFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`filter-btn ${ownershipFilter === 'owned' ? 'active' : ''}`}
                      onClick={() => setOwnershipFilter('owned')}
                    >
                      Owned
                    </button>
                    <button
                      className={`filter-btn ${ownershipFilter === 'missing' ? 'active' : ''}`}
                      onClick={() => setOwnershipFilter('missing')}
                    >
                      Missing
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="binder-grid">
              {masterSets.filter(s => s.id !== 'set-custom').map(set => {
                // Filter cards based on selected filters
                const filteredCards = set.cards.filter(card => {
                  const count = collection[card.id] || 0;
                  const isOwned = count > 0;

                  // Apply rarity filter
                  const passesRarityFilter = rarityFilter === 'all' || card.rarity.toString() === rarityFilter;

                  // Apply ownership filter
                  const passesOwnershipFilter =
                    ownershipFilter === 'all' ||
                    (ownershipFilter === 'owned' && isOwned) ||
                    (ownershipFilter === 'missing' && !isOwned);

                  return passesRarityFilter && passesOwnershipFilter;
                });

                // Only show set section if it has cards matching the filter
                if (filteredCards.length === 0) return null;

                return (
                  <div key={set.id} className="set-section">
                    <h3 className="set-title">{set.name} ({filteredCards.length})</h3>
                    <div className="cards-grid">
                      {filteredCards.map(card => {
                        const count = collection[card.id] || 0;
                        return (
                          <div
                            key={card.id}
                            className={`binder-card ${count > 0 ? 'owned' : 'missing'}`}
                            onClick={(e) => {
                              if (count > 0) {
                                e.stopPropagation();
                                handleCardClick(card);
                              }
                            }}
                            style={{ cursor: count > 0 ? 'zoom-in' : 'default' }}
                          >
                            <img src={card.image} alt={card.name} />
                            {count > 1 && <span className="card-count">x{count}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'builder' && (
          <CardBuilder
            onCreateCard={handleCreateCard}
            masterSets={masterSets}
            onUpdateMasterSets={handleUpdateMasterSets}
            onCardClick={handleCardClick}
          />
        )}

        {view === 'admin' && !isAdminAuthenticated && (
          <div className="admin-lock-screen glass-panel" style={{ maxWidth: '400px', margin: '100px auto', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ fontSize: '3rem' }}>🔒</div>
            <h2>Restricted Access</h2>
            <p>Enter password to manage expansion packs.</p>
            <input
              type="password"
              placeholder="Enter Password"
              className="admin-password-input"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdminLogin();
              }}
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
            />
            <button className="btn btn-primary" onClick={handleAdminLogin}>Unlock</button>
          </div>
        )}

        {view === 'admin' && isAdminAuthenticated && (
          <AdminPanel
            masterSets={masterSets}
            onUpdateMasterSets={handleUpdateMasterSets}
            onCardClick={handleCardClick}
            onResetCollection={() => setCollection({})}
          />
        )}



        {view === 'alchemy' && (
          <AlchemySystem
            collection={collection}
            setCollection={setCollection}
            masterSets={masterSets}
            onCardClick={handleCardClick}
          />
        )}
      </main>

      {
        activeSet && (
          <PackOpener
            key={`${activeSet.id}-${packInstanceId}`}
            set={activeSet}
            packSize={activeSet.packSize || 10}
            onComplete={() => {
              setActiveSet(null);
            }}
            onAddCards={handleAddCards}
            onReplay={handleReplay}
            onCardClick={handleCardClick}
          />
        )
      }

      {
        viewingSetCards && (
          <div className="set-contents-overlay" onClick={() => setViewingSetCards(null)}>
            <div className="set-contents-modal glass-panel" onClick={e => e.stopPropagation()}>
              <div className="set-contents-header">
                <div className="set-header-info">
                  <span className="set-mini-symbol">{viewingSetCards.symbol}</span>
                  <h2>{viewingSetCards.name} - Contents</h2>
                </div>
                <button className="close-contents-btn" onClick={() => setViewingSetCards(null)}>✕</button>
              </div>
              <div className="set-cards-list">
                {[...(viewingSetCards.cards || [])].sort((a, b) => a.rarity - b.rarity).map(card => (
                  <div key={card.id} className="set-content-card" onClick={() => handleCardClick(card)}>
                    <div className="card-rarity-badge">
                      {'★'.repeat(card.rarity)}
                    </div>
                    <img src={card.image} alt={card.name} />
                    <div className="card-name-label">{card.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {
        zoomedCard && (
          <div className="card-zoom-overlay" onClick={() => setZoomedCard(null)}>
            <div className="zoomed-card-wrapper" onClick={e => e.stopPropagation()}>
              <Card card={zoomedCard} isRevealed={true} showDetails={false} onClick={() => setZoomedCard(null)} />
            </div>
          </div>
        )
      }

      {
        showRedeemModal && (
          <div className="redeem-modal-overlay" onClick={() => setShowRedeemModal(false)}>
            <div className="redeem-modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-redeem-btn" onClick={() => setShowRedeemModal(false)}>
                <X size={20} />
              </button>
              <RedeemCodes
                goldCoins={goldCoins}
                setGoldCoins={setGoldCoins}
                claimedCodes={claimedCodes}
                setClaimedCodes={setClaimedCodes}
              />
            </div>
          </div>
        )
      }
    </div >
  );
}

export default App;
