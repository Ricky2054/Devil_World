import React, { useState } from 'react';

const Modals = ({ isConnected, onConnectWallet, onEnableDemo }) => {
  const [showStakingModal, setShowStakingModal] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);

  const handleStake = (amount) => {
    setShowStakingModal(false);
    alert(`Staked ${amount} coins! Game started!`);
  };

  const handleMint = (type) => {
    setShowMintModal(false);
    alert(`Minted ${type} NFT!`);
  };

  return (
    <>
      {/* Staking Modal */}
      {showStakingModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowStakingModal(false)}>&times;</span>
            <h3>💰 Stake Coins</h3>
            <p>Stake coins to gain entry to the island and start your treasure hunt!</p>
            <div className="staking-options">
              <button className="stake-option" onClick={() => handleStake(10)}>
                Stake 10 Coins
              </button>
              <button className="stake-option" onClick={() => handleStake(50)}>
                Stake 50 Coins
              </button>
              <button className="stake-option" onClick={() => handleStake(100)}>
                Stake 100 Coins
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mint Modal */}
      {showMintModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowMintModal(false)}>&times;</span>
            <h3>🎨 Mint NFT</h3>
            <p>Mint a unique NFT to commemorate your treasure hunt adventure!</p>
            <div className="mint-options">
              <button className="mint-btn" onClick={() => handleMint('Treasure')}>
                Mint Treasure NFT (50 Coins)
              </button>
              <button className="mint-btn" onClick={() => handleMint('Achievement')}>
                Mint Achievement NFT (25 Coins)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Modals;
