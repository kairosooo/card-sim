
import React, { useState, useEffect } from 'react';
import { SETS } from './data/sets';
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
  const [collection, setCollection] = useState(() => {
    const saved = localStorage.getItem('card-collection');
    return saved ? JSON.parse(saved) : {};
  });
  const [view, setView] = useState('sets'); // 'sets', 'collection', 'builder', or 'admin'
  const [masterSets, setMasterSets] = useState(() => {
    const saved = localStorage.getItem('master-sets');
    return saved ? JSON.parse(saved) : SETS;
  });

  const [goldCoins, setGoldCoins] = useState(() => {
    const saved = localStorage.getItem('gold-coins');
    return saved ? parseInt(saved) : 500;
  });

  const [claimedCodes, setClaimedCodes] = useState(() => {
    const saved = localStorage.getItem('claimed-codes');
    return saved ? JSON.parse(saved) : [];
  });

  const [zoomedCard, setZoomedCard] = useState(null);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  useEffect(() => {
    localStorage.setItem('card-collection', JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    localStorage.setItem('gold-coins', goldCoins);
  }, [goldCoins]);

  useEffect(() => {
    localStorage.setItem('master-sets', JSON.stringify(masterSets));
  }, [masterSets]);

  useEffect(() => {
    localStorage.setItem('claimed-codes', JSON.stringify(claimedCodes));
  }, [claimedCodes]);

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
    setPackInstanceId(prev => prev + 1);
  };

  const handleReplay = () => {
    if (!activeSet) return;
    handleOpenPack(activeSet, activeSet.packSize, activeSet.cost || 100);
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

  const totalCardsInSets = masterSets.reduce((acc, set) => acc + set.cards.length, 0);
  const uniqueOwned = Object.keys(collection).length;
  const completionRate = ((uniqueOwned / totalCardsInSets) * 100).toFixed(1);

  const handleAdminLogin = () => {
    if (adminPasswordInput === '1234qwer') {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
    } else {
      alert('Incorrect Password');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header glass-panel">
        <div className="header-top-row">
          <div className="logo">
            <span className="logo-icon">✨</span>
            <h1>CardSim</h1>
          </div>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">Gold</span>
              <span className="stat-value" style={{ color: '#f1c40f' }}>🟡 {goldCoins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Collection</span>
              <span className="stat-value">{uniqueOwned} / {totalCardsInSets}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completion</span>
              <span className="stat-value">{completionRate}%</span>
            </div>
          </div>
        </div>
        <nav className="nav-btns">
          <button className={`btn ${view === 'sets' ? '' : 'btn-secondary'}`} onClick={() => setView('sets')}>Sets</button>
          <button className={`btn ${view === 'collection' ? '' : 'btn-secondary'}`} onClick={() => setView('collection')}>My Binder</button>
          <button className={`btn ${view === 'builder' ? '' : 'btn-secondary'}`} onClick={() => setView('builder')}>Card Building & Inventory</button>
          <button className={`btn ${view === 'admin' ? '' : 'btn-secondary'}`} onClick={() => setView('admin')}>Expansion Pack Management</button>
          <button className={`btn ${view === 'redeem' ? '' : 'btn-secondary'}`} onClick={() => setView('redeem')}>Redeem Code</button>
          <button className={`btn ${view === 'alchemy' ? '' : 'btn-secondary'}`} onClick={() => setView('alchemy')}>The Orb</button>
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
                <div className="set-symbol">{set.symbol}</div>
                <h3>{set.name}</h3>
                <p>{set.cards.length} Cards</p>
                <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', marginTop: 'auto', zIndex: 2 }}>
                  <button className="btn" style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }} onClick={() => handleOpenPack(set, 1, 10)}>
                    1 Draw<br /><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>(10 🟡)</span>
                  </button>
                  <button className="btn" style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }} onClick={() => handleOpenPack(set, 10, 100)}>
                    10 Draws<br /><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>(100 🟡)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'collection' && (
          <div className="collection-view">
            <h2>Your Collection</h2>
            <div className="binder-grid">
              {masterSets.map(set => (
                <div key={set.id} className="set-section">
                  <h3 className="set-title">{set.name}</h3>
                  <div className="cards-grid">
                    {set.cards.map(card => {
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
              ))}
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
          <AdminPanel masterSets={masterSets} onUpdateMasterSets={handleUpdateMasterSets} onCardClick={handleCardClick} />
        )}

        {view === 'redeem' && (
          <RedeemCodes
            goldCoins={goldCoins}
            setGoldCoins={setGoldCoins}
            claimedCodes={claimedCodes}
            setClaimedCodes={setClaimedCodes}
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

      {activeSet && (
        <PackOpener
          key={`${activeSet.id}-${packInstanceId}`}
          set={activeSet}
          packSize={activeSet.packSize || 10}
          onComplete={() => setActiveSet(null)}
          onAddCards={handleAddCards}
          onReplay={handleReplay}
          onCardClick={handleCardClick}
        />
      )}

      {zoomedCard && (
        <div className="card-zoom-overlay" onClick={() => setZoomedCard(null)}>
          <div className="zoomed-card-wrapper" onClick={e => e.stopPropagation()}>
            <Card card={zoomedCard} isRevealed={true} />
            <div className="zoomed-card-info glass-panel">
              <h3>{zoomedCard.name}</h3>
              <div className="rarity-stars">
                {'★'.repeat(zoomedCard.rarity)}
              </div>
              <p>{zoomedCard.description}</p>
              <button className="btn btn-primary close-zoom-btn" onClick={() => setZoomedCard(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
