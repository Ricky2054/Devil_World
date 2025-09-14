import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h1>🏝️ Crypto Island Treasure Hunt</h1>
        <p>Loading the legendary island...</p>
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
