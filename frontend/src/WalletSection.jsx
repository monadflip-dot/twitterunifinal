import React, { useState } from 'react';

function WalletSection({ wallet, canChange: canChangeProp }) {
  const [walletInput, setWalletInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canChange = canChangeProp !== undefined ? canChangeProp : true;

  // Validación de wallet EVM
  const isValidEVMAddress = (address) => {
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;
    return evmRegex.test(address);
  };

  const handleSubmitWallet = async (e) => {
    e.preventDefault();
    if (!walletInput.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    if (!isValidEVMAddress(walletInput.trim())) {
      setError('Please enter a valid EVM wallet address (0x followed by 40 hexadecimal characters)');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      // Aquí deberías hacer el fetch para guardar el wallet si tienes endpoint
      setSuccess('Wallet saved (demo, implement backend POST if needed)');
      setWalletInput('');
    } catch (error) {
      setError('Failed to add wallet. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatWallet = (wallet) => {
    if (!wallet) return '';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (!wallet && !canChange) {
    return null;
  }

  return (
    <div className="wallet-container">
      {wallet ? (
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
