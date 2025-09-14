import React from 'react';

const GameHeader = ({ playerStats, isConnected, account, onConnectWallet }) => {
  return (
    <header className="game-header">
      <div className="player-stats">
        <div className="stat-item">
          <span className="stat-icon">💰</span>
          <span>{Math.floor(playerStats.coins)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">⚡</span>
          <span className={playerStats.energy < 20 ? 'energy-low' : ''}>
            {playerStats.energy}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🔥</span>
          <span>{playerStats.streak}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🏆</span>
          <span>{playerStats.points}</span>
        </div>
      </div>
      
      <div className="wallet-section">
        {!isConnected ? (
          <button className="wallet-btn" onClick={onConnectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <span>
              {account === 'demo-account' 
                ? 'Demo Mode' 
                : `${account.slice(0, 6)}...${account.slice(-4)}`
              }
            </span>
            <button className="disconnect-btn">
              Disconnect
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default GameHeader;
