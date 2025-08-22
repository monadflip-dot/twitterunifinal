import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || '';

function WalletSection() {
  const [wallet, setWallet] = useState(null);
  const [canChange, setCanChange] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [walletInput, setWalletInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${API_URL}/api/user/wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWallet(data.wallet);
        setCanChange(data.canChange);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validación de wallet EVM
  const isValidEVMAddress = (address) => {
    // Debe empezar con 0x y tener 42 caracteres (0x + 40 caracteres hex)
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;
    return evmRegex.test(address);
  };

  const handleSubmitWallet = async (e) => {
    e.preventDefault();
    
    if (!walletInput.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    // Validar formato EVM
    if (!isValidEVMAddress(walletInput.trim())) {
      setError('Please enter a valid EVM wallet address (0x followed by 40 hexadecimal characters)');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${API_URL}/api/user/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ wallet: walletInput.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setWallet(data.wallet);
        setCanChange(false);
        setSuccess(data.message);
        setWalletInput('');
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Error adding wallet:', error);
      setError('Failed to add wallet. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatWallet = (wallet) => {
    if (!wallet) return '';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="wallet-container">
        <div className="loading-spinner"></div>
        <p>Loading wallet information...</p>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      {wallet ? (
        // Wallet already added - show info
        <div className="wallet-info">
          <div className="wallet-status">
            <div className="wallet-icon">
              <i className="fas fa-wallet"></i>
            </div>
            <div className="wallet-details">
              <h4>Wallet Connected</h4>
              <p className="wallet-address">{formatWallet(wallet)}</p>
              <p className="wallet-note">
                <i className="fas fa-info-circle"></i>
                Your wallet is connected and ready for NFT minting
              </p>
            </div>
          </div>
          <div className="wallet-locked">
            <i className="fas fa-lock"></i>
            <span>Wallet address cannot be changed</span>
          </div>
        </div>
      ) : (
        // No wallet - show form
        <div className="wallet-form">
          <div className="wallet-description">
            <p>
              <i className="fas fa-info-circle"></i>
              Add your AGW wallet address to access NFT minting once you complete missions
            </p>
          </div>
          
          <form onSubmit={handleSubmitWallet}>
            <div className="input-group">
              <input
                type="text"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="Enter Abstract AGW wallet address (0x...)"
                className="wallet-input"
                disabled={submitting}
              />
              <button 
                type="submit" 
                className="add-wallet-btn"
                disabled={submitting || !walletInput.trim()}
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus"></i>
                    AGW Wallet
                  </>
                )}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WalletSection;
