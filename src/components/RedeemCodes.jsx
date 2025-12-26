
import React, { useState } from 'react';
import { Ticket, CheckCircle, AlertCircle } from 'lucide-react';
import { VALID_CODES } from '../data/codes';
import './RedeemCodes.css';

export default function RedeemCodes({ goldCoins, setGoldCoins, claimedCodes, setClaimedCodes }) {
    const [inputCode, setInputCode] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });

    const processRedeem = (e) => {
        e.preventDefault();
        const code = inputCode.trim();

        if (!code) return;

        // 1. Validation: Check if inputCode exists in validCodes and is NOT in claimedCodes
        if (!VALID_CODES[code]) {
            setStatus({ type: 'error', message: 'Invalid Secret Key!' });
            return;
        }

        if (claimedCodes.includes(code)) {
            setStatus({ type: 'error', message: 'This key has already been claimed.' });
            return;
        }

        // 2. Tier Identification
        let amount = 0;
        if (code.startsWith('BRNZ-')) {
            amount = 50;
        } else if (code.startsWith('SLVR-')) {
            amount = 500;
        } else if (code.startsWith('GOLD-')) {
            amount = 1000;
        } else {
            setStatus({ type: 'error', message: 'Invalid code format!' });
            return;
        }

        // 3. Logic execution
        setGoldCoins(prev => prev + amount);
        setClaimedCodes(prev => [...prev, code]);

        // 4. Feedback
        setStatus({ type: 'success', message: `Success! Added ${amount} Gold Coins.` });
        setInputCode('');

        // Clear status after 3 seconds
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    };

    return (
        <div className="redeem-container glass-panel">
            <div className="redeem-header">
                <Ticket size={32} className="redeem-icon" />
                <h2>Redeem Rewards</h2>
                <p>Enter your secret key below to claim your rewards.</p>
            </div>

            <div className="balance-display">
                <span className="label">Current Balance</span>
                <span className="value">🟡 {goldCoins}</span>
            </div>

            <form onSubmit={processRedeem} className="redeem-form">
                <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Enter Secret Key (e.g. GOLD-XXXX)"
                    className="redeem-input"
                />
                <button type="submit" className="btn btn-primary redeem-btn">
                    Redeem Key
                </button>
            </form>

            {status.message && (
                <div className={`status-bubble ${status.type}`}>
                    {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{status.message}</span>
                </div>
            )}

            <div className="code-tips">
                <h4>Code Tiers</h4>
                <div className="tier-grid">
                    <div className="tier-item brnz"><strong>BRNZ-</strong> 50 Coins</div>
                    <div className="tier-item slvr"><strong>SLVR-</strong> 500 Coins</div>
                    <div className="tier-item gold"><strong>GOLD-</strong> 1000 Coins</div>
                </div>
            </div>
        </div>
    );
}
