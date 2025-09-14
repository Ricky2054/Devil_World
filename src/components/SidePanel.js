import React from 'react';

const SidePanel = ({ playerStats, currentLocation, discoveredTreasures }) => {
  return (
    <div className="side-panel">
      <div className="story-section">
        <h3>📖 Story Progress</h3>
        <div className="story-content">
          <p>Welcome to Crypto Island! Years ago, world leaders left behind encrypted phones with valuable crypto wallets. Your mission: find them before others do!</p>
          {currentLocation && (
            <p>✅ Discovered a new location! Start digging for treasures.</p>
          )}
        </div>
      </div>

      <div className="hints-section">
        <h3>💡 Hints & Clues</h3>
        <div className="hints-content">
          {discoveredTreasures.length === 0 ? (
            <p>No active hints yet. Start exploring to find clues!</p>
          ) : (
            <p>You've discovered {discoveredTreasures.length} location(s). Look for glowing treasures!</p>
          )}
        </div>
      </div>

      <div className="inventory-section">
        <h3>🎒 Inventory</h3>
        <div className="inventory-content">
          <p>Coins: {Math.floor(playerStats.coins)}</p>
          <p>Energy: {playerStats.energy}/100</p>
          <p>Streak: {playerStats.streak}</p>
          <p>Points: {playerStats.points}</p>
        </div>
      </div>

      <div className="leaderboard-section">
        <h3>🏆 Leaderboard</h3>
        <div className="leaderboard-content">
          <div className="leaderboard-entry">
            <span className="rank">#1</span>
            <span className="player-name">You</span>
            <span className="points">{playerStats.points}</span>
          </div>
          <div className="leaderboard-entry">
            <span className="rank">#2</span>
            <span className="player-name">CryptoHunter</span>
            <span className="points">1200</span>
          </div>
          <div className="leaderboard-entry">
            <span className="rank">#3</span>
            <span className="player-name">TreasureSeeker</span>
            <span className="points">900</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
