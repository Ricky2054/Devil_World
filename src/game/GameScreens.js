// Retro-style game screens for Fantasy Knight Adventure
export class GameScreenManager {
  constructor() {
    this.currentScreen = 'title'; // title, playing, gameOver, scoreboard
    this.titleAnimationTime = 0;
    this.gameOverAnimationTime = 0;
    this.scoreboardData = [];
    this.playerName = '';
    this.finalScore = 0;
    this.retryCount = 0;
  }

  // Draw retro-style title screen
  drawTitleScreen(ctx, canvas) {
    // Retro gradient background
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    backgroundGradient.addColorStop(0, '#1a0033');
    backgroundGradient.addColorStop(0.5, '#330066');
    backgroundGradient.addColorStop(1, '#000011');
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animated stars background (reduced density for performance)
    this.drawStarField(ctx, canvas, 40);

    // Main title with colorful custom font effect
    ctx.save();
    ctx.textAlign = 'center';
    
    // Multi-layered colorful title effect
    const titleY = canvas.height * 0.25;
    const titleText = '👹 DEVIL\'S WORLD 👹';
    
    // Shadow layers for depth
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 52px "Dracutaz", "Courier New", fantasy';
    ctx.fillText(titleText, canvas.width / 2 + 4, titleY + 4);
    
    // Outer glow - Red
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 50px "Dracutaz", "Courier New", fantasy';
    ctx.fillText(titleText, canvas.width / 2, titleY);
    
    // Middle glow - Orange
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff6600';
    ctx.fillText(titleText, canvas.width / 2, titleY);
    
    // Inner glow - Yellow
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffff00';
    ctx.fillText(titleText, canvas.width / 2, titleY);
    
    // Core text - White with gold
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(titleText, canvas.width / 2, titleY);
    
    // Final highlight - Gold
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffd700';
    ctx.fillText(titleText, canvas.width / 2, titleY);
    
    // Subtitle with gradient effect
    ctx.shadowBlur = 15;
    const subtitleGradient = ctx.createLinearGradient(0, titleY + 40, 0, titleY + 80);
    subtitleGradient.addColorStop(0, '#ff6600');
    subtitleGradient.addColorStop(0.5, '#ffff00');
    subtitleGradient.addColorStop(1, '#ff6600');
    ctx.fillStyle = subtitleGradient;
    ctx.font = 'bold 36px "Dracutaz", "Courier New", fantasy';
    ctx.fillText('ADVENTURE', canvas.width / 2, titleY + 70);

    // Animated subtitle
    const pulseAlpha = 0.5 + 0.5 * Math.sin(this.titleAnimationTime * 0.05);
    ctx.globalAlpha = pulseAlpha;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('🏔️ Powered by Avalanche Blockchain 🏔️', canvas.width / 2, titleY + 100);
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Menu options
    const menuY = canvas.height * 0.6;
    const menuOptions = [
      '🎮 PRESS ENTER TO START',
      '🏆 PRESS S FOR SCOREBOARD', 
      '🔗 PRESS C TO CONNECT WALLET',
      '❓ PRESS H FOR HELP',
      '🎵 PRESS M TO TOGGLE MUSIC'
    ];

    menuOptions.forEach((option, index) => {
      const y = menuY + (index * 40);
      const alpha = 0.7 + 0.3 * Math.sin(this.titleAnimationTime * 0.03 + index);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(option, canvas.width / 2, y);
    });

    // Version and credits
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#888888';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('v1.0 - Built with React & Ethers.js', canvas.width / 2, canvas.height - 40);
    ctx.fillText('© 2024 Fantasy Knight Adventure', canvas.width / 2, canvas.height - 20);

    ctx.restore();
    this.titleAnimationTime++;
  }

  // Draw retro-style game over screen
  drawGameOverScreen(ctx, canvas, gameStats) {
    // Dark red gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#330000');
    gradient.addColorStop(0.5, '#660000');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Flickering effect
    const flicker = Math.random() > 0.9 ? 0.3 : 1.0;
    ctx.globalAlpha = flicker;

    ctx.save();
    ctx.textAlign = 'center';

    // Game Over title with dramatic effect
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 56px "Courier New", monospace';
    const titleY = canvas.height * 0.2;
    ctx.fillText('💀 GAME OVER 💀', canvas.width / 2, titleY);

    // Subtitle
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillText('Your adventure has ended...', canvas.width / 2, titleY + 60);

    // Stats display
    const statsY = canvas.height * 0.45;
    const stats = [
      `⭐ Final Score: ${gameStats.totalScore || 0}`,
      `🏆 Level Reached: ${gameStats.level || 1}`,
      `⚔️ Enemies Defeated: ${gameStats.enemiesKilled || 0}`,
      `💰 Gold Collected: ${gameStats.goldCollected || 0}`,
      `🏗️ Buildings Built: ${gameStats.buildingsBuilt || 0}`,
      `⏱️ Time Played: ${this.formatTime(gameStats.timePlayed || 0)}`
    ];

    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Courier New", monospace';
    
    stats.forEach((stat, index) => {
      const y = statsY + (index * 30);
      ctx.fillText(stat, canvas.width / 2, y);
    });

    // Action buttons
    const buttonY = canvas.height * 0.8;
    const pulseAlpha = 0.6 + 0.4 * Math.sin(this.gameOverAnimationTime * 0.08);
    
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('🔄 PRESS R TO RESTART', canvas.width / 2, buttonY);
    
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('🏆 PRESS S FOR SCOREBOARD', canvas.width / 2, buttonY + 35);
    
    ctx.fillStyle = '#ff6600';
    ctx.fillText('🏠 PRESS ESC FOR MAIN MENU', canvas.width / 2, buttonY + 60);

    ctx.restore();
    this.gameOverAnimationTime++;
  }

  // Draw retro-style scoreboard
  drawScoreboard(ctx, canvas, scores) {
    // Purple gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a0066');
    gradient.addColorStop(0.5, '#330099');
    gradient.addColorStop(1, '#000033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animated background pattern
    this.drawRetroGrid(ctx, canvas);

    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillText('🏆 HIGH SCORES 🏆', canvas.width / 2, 80);

    // Scoreboard header
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left';
    
    const headerY = 140;
    const leftX = canvas.width * 0.15;
    ctx.fillText('RANK', leftX, headerY);
    ctx.fillText('PLAYER', leftX + 80, headerY);
    ctx.fillText('SCORE', leftX + 250, headerY);
    ctx.fillText('LEVEL', leftX + 350, headerY);
    ctx.fillText('TIME', leftX + 450, headerY);

    // Draw line under header
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX, headerY + 10);
    ctx.lineTo(canvas.width * 0.85, headerY + 10);
    ctx.stroke();

    // Score entries
    const topScores = scores.slice(0, 10); // Top 10 scores
    topScores.forEach((score, index) => {
      const y = headerY + 50 + (index * 35);
      const rank = index + 1;
      
      // Highlight colors for top 3
      let color = '#ffffff';
      if (rank === 1) color = '#ffff00'; // Gold
      else if (rank === 2) color = '#c0c0c0'; // Silver
      else if (rank === 3) color = '#cd7f32'; // Bronze
      
      ctx.fillStyle = color;
      ctx.font = 'bold 14px "Courier New", monospace';
      
      // Add crown emoji for top 3
      const crown = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
      
      ctx.fillText(`${crown}${rank}`, leftX, y);
      ctx.fillText(score.playerName || 'Anonymous', leftX + 80, y);
      ctx.fillText(score.score.toLocaleString(), leftX + 250, y);
      ctx.fillText(`${score.level}`, leftX + 350, y);
      ctx.fillText(this.formatTime(score.timePlayed), leftX + 450, y);
    });

    // No scores message
    if (topScores.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#888888';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillText('No scores yet! Be the first to play!', canvas.width / 2, canvas.height / 2);
    }

    // Back button
    ctx.textAlign = 'center';
    const pulseAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText('🏠 PRESS ESC TO RETURN', canvas.width / 2, canvas.height - 50);

    ctx.restore();
  }

  // Draw help screen
  drawHelpScreen(ctx, canvas) {
    // Blue gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#001133');
    gradient.addColorStop(0.5, '#002266');
    gradient.addColorStop(1, '#000011');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillText('❓ HOW TO PLAY ❓', canvas.width / 2, 60);

    // Instructions
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'left';
    
    const instructions = [
      '🎮 CONTROLS:',
      '  WASD - Move your knight',
      '  J - Attack enemies',
      '  K - Defend/Block',
      '  L - Roll/Dash',
      '  I - Open inventory',
      '  B - Build structures',
      '  F - Eat food/heal',
      '',
      '🎯 OBJECTIVES:',
      '  • Defeat enemies to gain XP and gold',
      '  • Explore 5 different areas',
      '  • Collect treasures and materials',
      '  • Build infrastructure for passive income',
      '  • Unlock achievements for AVAX rewards',
      '',
      '🏗️ BUILDINGS:',
      '  • House - Health regen + gold income',
      '  • Blacksmith - Weapon upgrades',
      '  • Farm - Food production',
      '  • Mine - Material generation',
      '  • Tower - Map reveal + crystals',
      '  • Portal - Fast travel + AVAX rewards',
      '',
      '🔗 BLOCKCHAIN:',
      '  • Connect MetaMask wallet',
      '  • Earn real AVAX for achievements',
      '  • Progress saved on blockchain'
    ];

    const startY = 120;
    const leftX = canvas.width * 0.1;
    
    instructions.forEach((instruction, index) => {
      const y = startY + (index * 20);
      ctx.fillText(instruction, leftX, y);
    });

    // Back button
    ctx.textAlign = 'center';
    const pulseAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText('🏠 PRESS ESC TO RETURN', canvas.width / 2, canvas.height - 30);

    ctx.restore();
  }

  // Draw animated star field
  drawStarField(ctx, canvas, count = 100) {
    const time = Date.now() * 0.001;
    const n = count; // configurable density
    for (let i = 0; i < n; i++) {
      const x = (i * 123.456) % canvas.width;
      const y = (i * 234.567 + time * 20) % canvas.height;
      // Reduce per-frame alpha math to prevent heavy sin calls
      const alpha = 0.5 + 0.5 * Math.sin((i * 0.2) + (Math.floor(time * 2) * 0.5));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Draw retro grid pattern
  drawRetroGrid(ctx, canvas) {
    const time = Date.now() * 0.001;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(time + x * 0.01) * 5, 0);
      ctx.lineTo(x + Math.sin(time + x * 0.01) * 5, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.cos(time + y * 0.01) * 3);
      ctx.lineTo(canvas.width, y + Math.cos(time + y * 0.01) * 3);
      ctx.stroke();
    }
  }

  // Format time in MM:SS format
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Calculate final score
  calculateFinalScore(gameStats) {
    const score = 
      (gameStats.experience || 0) * 1 +
      (gameStats.gold || 0) * 2 +
      (gameStats.crystals || 0) * 100 +
      (gameStats.enemiesKilled || 0) * 50 +
      (gameStats.buildingsBuilt || 0) * 200 +
      (gameStats.achievementsUnlocked || 0) * 500;
    
    return Math.floor(score);
  }

  // Save score to localStorage
  saveScore(playerName, score, level, timePlayed, gameStats) {
    const scoreEntry = {
      playerName: playerName || 'Anonymous',
      score,
      level,
      timePlayed,
      date: new Date().toISOString(),
      gameStats
    };

    let scores = JSON.parse(localStorage.getItem('fantasyKnightScores') || '[]');
    scores.push(scoreEntry);
    
    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    // Keep only top 50 scores
    scores = scores.slice(0, 50);
    
    localStorage.setItem('fantasyKnightScores', JSON.stringify(scores));
    return scores;
  }

  // Load scores from localStorage
  loadScores() {
    return JSON.parse(localStorage.getItem('fantasyKnightScores') || '[]');
  }

  // Handle keyboard input for screens
  handleInput(key) {
    switch (this.currentScreen) {
      case 'title':
        if (key === 'Enter') {
          this.currentScreen = 'playing';
          return 'startGame';
        } else if (key === 's' || key === 'S') {
          this.currentScreen = 'scoreboard';
          return 'showScoreboard';
        } else if (key === 'c' || key === 'C') {
          return 'connectWallet';
        } else if (key === 'h' || key === 'H') {
          this.currentScreen = 'help';
          return 'showHelp';
        }
        break;
        
      case 'gameOver':
        if (key === 'r' || key === 'R') {
          this.currentScreen = 'playing';
          this.retryCount++;
          return 'restartGame';
        } else if (key === 's' || key === 'S') {
          this.currentScreen = 'scoreboard';
          return 'showScoreboard';
        } else if (key === 'Escape') {
          this.currentScreen = 'title';
          return 'showTitle';
        }
        break;
        
      case 'scoreboard':
      case 'help':
        if (key === 'Escape') {
          this.currentScreen = 'title';
          return 'showTitle';
        }
        break;
    }
    return null;
  }

  // Trigger game over
  gameOver(gameStats) {
    this.currentScreen = 'gameOver';
    this.finalScore = this.calculateFinalScore(gameStats);
    this.gameOverAnimationTime = 0;
    
    // Save the score
    this.saveScore(
      this.playerName || 'Anonymous',
      this.finalScore,
      gameStats.level || 1,
      gameStats.timePlayed || 0,
      gameStats
    );
  }

  // Reset for new game
  resetForNewGame() {
    this.gameOverAnimationTime = 0;
    this.finalScore = 0;
  }
}
