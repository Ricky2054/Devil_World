import React, { useRef, useEffect, useState } from 'react';
import { detectEthereumProvider } from '@metamask/detect-provider';
import { BrowserProvider, formatEther } from 'ethers';
import { contractService } from './services/contractService.js';
import './App.css';
import './utils/walletTest.js';
import { createSeasonSystem, Season } from './game/SeasonSystem.js';
import { createEnergySystem } from './game/EnergySystem.js';
import { createKarmaSystem } from './game/KarmaSystem.js';
import { nextHint as guideHint } from './ai/GuideAgent.js';
import { createChallengerAgent } from './ai/ChallengerAgent.js';
import { loadGameAssets } from './game/Assets.js';
import { getPresetMap, getOpenWorld, getMotherWorldMap } from './game/TileMaps.js';
import { AudioManager } from './game/Audio.js';
import { SpriteSheet } from './game/SpriteSheet.js';
import { BlockchainManager, GamePointSystem } from './game/BlockchainIntegration.js';
import { InventorySystem, InfrastructureSystem, GAME_ITEMS } from './game/InventorySystem.js';
import { GameScreenManager } from './game/GameScreens.js';
import { DayNightCycle } from './game/DayNightCycle.js';
import { MusicManager } from './game/MusicManager.js';

function App() {
  const canvasRef = useRef(null);
  const [playerStats, setPlayerStats] = useState({
    energy: 100,
    streak: 0,
    points: 0,
    avax: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');
  // Real-time points system
  const [realtimeStats, setRealtimeStats] = useState({
    lastUpdate: Date.now(),
    pointsPerSecond: 0.0001,
    stakingMultiplier: 1,
    activityMultiplier: 1,
    totalPointsEarned: 0
  });

  // New: season/energy/karma systems
  const seasonSystemRef = useRef(createSeasonSystem({ cycleSeconds: 120 }));
  const energySystemRef = useRef(createEnergySystem());
  const karmaSystemRef = useRef(createKarmaSystem());
  const [seasonUI, setSeasonUI] = useState({ season: Season.Summer, progress: 0 });
  const [hint, setHint] = useState('');
  const minutesPlayedRef = useRef(0);
  const challengerRef = useRef(createChallengerAgent());
  const prevSeasonRef = useRef(Season.Summer);
  const lastUIUpdateRef = useRef(0);
  const rafRef = useRef(0);
  const [hud, setHud] = useState({ hunger: 0, life: 1, xp: 0, karma: 0 });
  const [hazards, setHazards] = useState([]); // {type:'lightning',x,y,ttl}

  // Force refresh UI to ensure updates are visible
  const forceRefreshUI = () => {
    // Force a re-render by updating a dummy state
    setRealtimeStats(prev => ({ ...prev, lastUpdate: Date.now() }));
  };

  // Update real-time stats immediately when player stats change
  const updateRealtimeStatsImmediately = () => {
    const basePoints = 0.0001;
    const stakingMultiplier = playerStats.avax > 0 ? 2 : 1;
    const activityMultiplier = 1 + (playerStats.streak * 0.1) + (playerStats.energy / 1000);
    
    setRealtimeStats(prev => ({
      ...prev,
      pointsPerSecond: basePoints * stakingMultiplier * activityMultiplier,
      stakingMultiplier,
      activityMultiplier,
      lastUpdate: Date.now()
    }));
    
    // quiet: avoid console spam in production
  };

  // Initialize real-time stats and point system on component mount
  useEffect(() => {
    forceRefreshUI();
    
    // Initialize Fantasy Knight Adventure systems
    if (!pointSystem.current) {
      pointSystem.current = new GamePointSystem(blockchainManager.current);
      pointSystem.current.load(); // Load saved progress
      setGamePoints(pointSystem.current.points);
      setAchievements(pointSystem.current.points.achievements);
      
      // Initialize inventory system
      inventorySystem.current = new InventorySystem();
      inventorySystem.current.load();
      
      // Initialize infrastructure system
      infrastructureSystem.current = new InfrastructureSystem(pointSystem.current);
      infrastructureSystem.current.load();
      
      // Add some starting materials
      if (!pointSystem.current.points.materials) {
        pointSystem.current.points.materials = 5;
        inventorySystem.current.addItem({...GAME_ITEMS.wood, quantity: 10});
        inventorySystem.current.addItem({...GAME_ITEMS.stone, quantity: 5});
        inventorySystem.current.addItem({...GAME_ITEMS.ironSword, quantity: 1});
        inventorySystem.current.save();
      }
      
      console.log('✅ Fantasy Knight Adventure systems initialized');
    }
  }, []);

  // Real-time points calculation
  const calculateRealtimePoints = () => {
    const now = Date.now();
    const timeDiff = (now - realtimeStats.lastUpdate) / 1000; // seconds
    
    if (timeDiff >= 1) { // Update every second
      let pointsToAdd = 0;
      
      // Base points per second (0.0001 AVAX per second)
      const basePoints = 0.0001;
      
      // Staking multiplier (2x if staking)
      const stakingMultiplier = playerStats.avax > 0 ? 2 : 1;
      
      // Activity multiplier (based on energy and streak) - Updated to be more responsive
      const activityMultiplier = 1 + (playerStats.streak * 0.1) + (playerStats.energy / 1000);
      
      // Calculate points to add
      pointsToAdd = basePoints * stakingMultiplier * activityMultiplier * timeDiff;
      
      // Update player stats
      setPlayerStats(prev => {
        const newStats = {
          ...prev,
          points: prev.points + pointsToAdd,
          avax: prev.avax + pointsToAdd
        };
        return newStats;
      });
      
      // Update realtime stats - Force recalculation of multipliers
      setRealtimeStats(prev => {
        const newRealtimeStats = {
          ...prev,
          lastUpdate: now,
          pointsPerSecond: basePoints * stakingMultiplier * activityMultiplier,
          stakingMultiplier,
          activityMultiplier,
          totalPointsEarned: prev.totalPointsEarned + pointsToAdd
        };
        return newRealtimeStats;
      });
      
      // Update leaderboard if connected
      if (isConnected && contractService.isInitialized()) {
        contractService.getCurrentAddress().then(address => {
          updateLeaderboard(address, pointsToAdd);
        }).catch(console.error);
      }
    }
  };

  const [leaderboard, setLeaderboard] = useState([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [avaxBalance, setAvaxBalance] = useState('0');
  const [gamePoints, setGamePoints] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  
  // Blockchain integration
  const blockchainManager = useRef(new BlockchainManager());
  const pointSystem = useRef(null);
  const inventorySystem = useRef(null);
  const infrastructureSystem = useRef(null);
  const screenManager = useRef(new GameScreenManager());
  const dayNightCycle = useRef(new DayNightCycle());
  const musicManager = useRef(new MusicManager());
  
  // UI state for inventory and building
  const [showInventory, setShowInventory] = useState(false);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [buildingMode, setBuildingMode] = useState(false);
  
  // Game state management
  const [gameState, setGameState] = useState('title'); // title, playing, paused, gameOver, scoreboard, help
  const gameStateRef = useRef('title');
  const setScreenState = (next) => { gameStateRef.current = next; setGameState(next); };
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameStats, setGameStats] = useState({
    level: 1,
    enemiesKilled: 0,
    goldCollected: 0,
    buildingsBuilt: 0,
    achievementsUnlocked: 0,
    timePlayed: 0,
    totalScore: 0
  });
  
  // Day/Night cycle state
  const [timeOfDay, setTimeOfDay] = useState('8:00 AM');
  const [isNight, setIsNight] = useState(false);
  const [skyColor, setSkyColor] = useState('#87CEEB');

  // Connect wallet function
  const connectWallet = async () => {
    try {
      const result = await blockchainManager.current.connectWallet();
      setWalletConnected(true);
      setWalletAddress(result.address);
      await updateBalance();
      
      setModalContent(`🔗 Wallet Connected!\nAddress: ${result.address.substring(0, 6)}...${result.address.substring(38)}\nNetwork: ${result.network}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
    } catch (error) {
      setModalContent(`❌ Wallet connection failed: ${error.message}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
    }
  };

  // Update AVAX balance
  const updateBalance = async () => {
    if (blockchainManager.current.isConnected) {
      const balance = await blockchainManager.current.getBalance();
      setAvaxBalance(balance);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    blockchainManager.current.disconnect();
    setWalletConnected(false);
    setWalletAddress('');
    setAvaxBalance('0');
  };

  // Handle screen manager actions
  const handleScreenAction = (action) => {
    switch (action) {
      case 'startGame':
        setScreenState('playing');
        setGameStartTime(Date.now());
        resetGame();
        // Resume audio context and start gameplay music
        musicManager.current.resume();
        screenManager.current.currentScreen = 'playing';
        musicManager.current.playTrack(isNight ? 'gameplay_night' : 'gameplay_day');
        break;
      case 'restartGame':
        setScreenState('playing');
        setGameStartTime(Date.now());
        resetGame();
        break;
      case 'showTitle':
        setScreenState('title');
        screenManager.current.currentScreen = 'title';
        musicManager.current.playTrack('title');
        break;
      case 'showScoreboard':
        setScreenState('scoreboard');
        screenManager.current.currentScreen = 'scoreboard';
        break;
      case 'showHelp':
        setScreenState('help');
        screenManager.current.currentScreen = 'help';
        break;
      case 'connectWallet':
        connectWallet();
        break;
    }
  };

  // Reset game for new playthrough
  const resetGame = () => {
    // Reset player
    const spawn = motherWorldRef.current?.spawn || { x: 512, y: 600 };
    gameWorldState.current.player.x = spawn.x;
    gameWorldState.current.player.y = spawn.y;
    gameWorldState.current.player.health = 100;
    gameWorldState.current.player.state = 'idle';
    
    // Reset camera
    gameWorldState.current.camera.x = 200;
    gameWorldState.current.camera.y = 150;
    
    // Reset game stats
    setGameStats({
      level: 1,
      enemiesKilled: 0,
      goldCollected: 0,
      buildingsBuilt: 0,
      achievementsUnlocked: 0,
      timePlayed: 0,
      totalScore: 0
    });
    
    // Reset point system
    if (pointSystem.current) {
      pointSystem.current.points = {
        experience: 0,
        gold: 0,
        crystals: 0,
        materials: 5,
        achievements: [],
        stats: {
          enemiesDefeated: 0,
          treasuresFound: 0,
          areasExplored: 0,
          questsCompleted: 0,
          timePlayedMinutes: 0
        }
      };
      setGamePoints(pointSystem.current.points);
    }
    
    screenManager.current.resetForNewGame();
    
    // Reset day/night cycle to morning
    dayNightCycle.current.reset(8); // Start at 8 AM
    setTimeOfDay(dayNightCycle.current.getTimeString());
    setIsNight(false);
    setSkyColor(dayNightCycle.current.getSkyColor());
    
    // Start gameplay music
    musicManager.current.playTrack('gameplay_day');
  };

  // Trigger game over
  const triggerGameOver = () => {
    const finalStats = {
      ...gameStats,
      timePlayed: gameStartTime ? (Date.now() - gameStartTime) / 1000 : 0,
      experience: pointSystem.current?.points.experience || 0,
      gold: pointSystem.current?.points.gold || 0,
      crystals: pointSystem.current?.points.crystals || 0,
      level: pointSystem.current?.getLevel() || 1
    };
    
    setGameStats(finalStats);
    setGameState('gameOver');
    screenManager.current.gameOver(finalStats);
    
    // Play game over music
    musicManager.current.playTrack('gameOver', false);
  };

  // Handle canvas click for building placement
  const handleCanvasClick = (e) => {
    // If on title screen, treat any click as Start (canvas or overlay)
    if (gameState === 'title') {
      handleScreenAction('startGame');
      e.stopPropagation();
      return;
    }
    if (!buildingMode || !selectedBuildingType || !infrastructureSystem.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert screen coordinates to world coordinates
    const zoomScale = gameWorldState.current.zoomScale || 1.5;
    const camera = gameWorldState.current.camera;
    const worldX = (clickX / zoomScale) + camera.x;
    const worldY = (clickY / zoomScale) + camera.y;
    
    // Attempt to build
    const result = infrastructureSystem.current.startBuilding(selectedBuildingType, worldX, worldY);
    
    if (result.success) {
      setModalContent(`🏗️ ${infrastructureSystem.current.buildingTypes[selectedBuildingType].name} construction started!`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 2000);
      
      // Update points display and building stats
      setGamePoints({...pointSystem.current.points});
      setGameStats(prev => ({
        ...prev,
        buildingsBuilt: prev.buildingsBuilt + 1
      }));
      pointSystem.current.save();
      infrastructureSystem.current.save();
      
      // Exit building mode
      setBuildingMode(false);
      setSelectedBuildingType(null);
    } else {
      setModalContent(`❌ ${result.reason}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 2000);
    }
  };

  // Game world state
  const gameWorldState = useRef({
    zoomScale: 1.5, // 1.5x zoom - reasonable size
    gameTitle: 'Devil\'s World Adventure', // Changed from crypto island
    showWeatherEffects: false,
    player: {
      x: 400, // Start more centered
      y: 300, // Start more centered  
      width: 32,
      height: 32,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      facingRight: true,
      animFrame: 0,
      animTimer: 0,
      animSpeed: 0.08, // Slower animation for smoother look
      health: 100,
      maxHealth: 100,
      state: 'idle', // idle, run, attack, attack2, attackCombo, defend, crouchAttack, hit, death, roll, dash
      attackCooldown: 0,
      defendCooldown: 0,
      invulnerable: 0,
      attackComboCount: 0,
      lastAttackTime: 0,
      isEating: false,
      eatTimer: 0
    },
    camera: {
      x: 200, // Start camera centered on player
      y: 150
    },
    keys: {},
    level: 1,
    treasures: [],
    enemies: [],
    combatMode: false,
    questsCompleted: 0,
    areasVisited: new Set(),
    particles: [],
    soundEnabled: true
  });

  // Audio context
  const audioContext = useRef(null);
  const audioMgr = useRef(new AudioManager());

  // Initialize audio
  const initAudio = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // Sound effects
  // GTA 1-style sound effects system
  const playSound = (soundName, frequency = 440, duration = 0.1, type = 'sine') => {
    if (!gameWorldState.current.soundEnabled || !audioContext.current) return;
    
    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    const filter = audioContext.current.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    
    // GTA 1-style sound effects
    switch(soundName) {
      case 'walk':
        oscillator.frequency.setValueAtTime(200 + Math.random() * 100, audioContext.current.currentTime);
        oscillator.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioContext.current.currentTime);
        break;
      case 'collect':
        oscillator.frequency.setValueAtTime(800, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.current.currentTime + 0.1);
        oscillator.type = 'square';
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(400, audioContext.current.currentTime);
        break;
      case 'stake':
        oscillator.frequency.setValueAtTime(300, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.current.currentTime + 0.2);
        oscillator.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, audioContext.current.currentTime);
        break;
      case 'mint':
        oscillator.frequency.setValueAtTime(1000, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(2000, audioContext.current.currentTime + 0.3);
        oscillator.type = 'sine';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, audioContext.current.currentTime);
        break;
      case 'connect':
        oscillator.frequency.setValueAtTime(440, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.current.currentTime + 0.5);
        oscillator.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioContext.current.currentTime);
        break;
      case 'talk':
        oscillator.frequency.setValueAtTime(150 + Math.random() * 200, audioContext.current.currentTime);
        oscillator.type = 'square';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, audioContext.current.currentTime);
        break;
      case 'attack':
        oscillator.frequency.setValueAtTime(200, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.current.currentTime + 0.1);
        oscillator.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioContext.current.currentTime);
        break;
      case 'defend':
        oscillator.frequency.setValueAtTime(300, audioContext.current.currentTime);
        oscillator.type = 'triangle';
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(400, audioContext.current.currentTime);
        break;
      case 'hit':
        oscillator.frequency.setValueAtTime(150, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.current.currentTime + 0.2);
        oscillator.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, audioContext.current.currentTime);
        break;
      case 'enemyHit':
        oscillator.frequency.setValueAtTime(400, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.current.currentTime + 0.15);
        oscillator.type = 'square';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, audioContext.current.currentTime);
        break;
      case 'heal':
        oscillator.frequency.setValueAtTime(500, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.current.currentTime + 0.4);
        oscillator.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, audioContext.current.currentTime);
        break;
      case 'dash':
        oscillator.frequency.setValueAtTime(250, audioContext.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.current.currentTime + 0.2);
        oscillator.type = 'sawtooth';
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(200, audioContext.current.currentTime);
        break;
      default:
        oscillator.frequency.setValueAtTime(frequency, audioContext.current.currentTime);
        oscillator.type = type;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, audioContext.current.currentTime);
    }
    
    gainNode.gain.setValueAtTime(0.1, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration);
    
    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + duration);
  };

  // 16-bit SNES-Style Color Palette (Chrono Trigger / Zelda inspired)
  const colors = {
    0: 'transparent', // Empty space
    // Ground & Paths
    1: '#8B4513', // Dirt Path (Saddle Brown)
    2: '#D2B48C', // Sand/Beach (Tan)
    3: '#228B22', // Grass (Forest Green)
    4: '#32CD32', // Bright Grass (Lime Green)
    5: '#696969', // Stone/Rock (Dim Gray)
    
    // Water & Liquids
    6: '#4169E1', // Deep Water (Royal Blue)
    7: '#87CEEB', // Shallow Water (Sky Blue)
    8: '#00CED1', // Crystal Water (Dark Turquoise)
    
    // Buildings & Structures
    9: '#2F4F4F', // Dark Building (Dark Slate Gray)
    10: '#708090', // Medium Building (Slate Gray)
    11: '#A9A9A9', // Light Building (Dark Gray)
    12: '#D3D3D3', // Bright Building (Light Gray)
    13: '#8B0000', // Red Brick (Dark Red)
    14: '#B22222', // Bright Brick (Fire Brick)
    
    // Nature Elements
    15: '#654321', // Tree Trunk (Dark Brown)
    16: '#228B22', // Tree Leaves (Forest Green)
    17: '#32CD32', // Bright Leaves (Lime Green)
    18: '#8B4513', // Wood/Logs (Saddle Brown)
    19: '#FFD700', // Gold/Yellow Leaves (Gold)
    
    // Special Elements
    20: '#FFD700', // Treasure (Gold)
    21: '#DC143C', // Danger/Enemy (Crimson)
    22: '#4B0082', // Magic/Purple (Indigo)
    23: '#FF1493', // Pink/Neon (Deep Pink)
    24: '#00FF00', // Success/Green (Lime)
    25: '#FF4500', // Orange/Fire (Orange Red)
    
    // Character Colors
    26: '#F4A460', // Skin Tone (Sandy Brown)
    27: '#8B4513', // Hair Brown (Saddle Brown)
    28: '#000000', // Black (Hair/Clothes)
    29: '#FFFFFF', // White (Clothes/Highlights)
    30: '#FF0000', // Red (Clothes/Accents)
    31: '#0000FF', // Blue (Clothes/Accents)
    32: '#00FF00', // Green (Clothes/Accents)
    
    // UI Elements
    33: '#2F2F2F', // UI Background (Dark Gray)
    34: '#FFD700', // UI Accent (Gold)
    35: '#FFFFFF', // UI Text (White)
    36: '#000000'  // UI Border (Black)
  };

  // Draw pixel art sprite
  const drawSprite = (ctx, sprite, x, y, scale = 1, flipX = false) => {
    const width = sprite[0].length;
    const height = sprite.length;
    
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const pixel = flipX ? sprite[row][width - 1 - col] : sprite[row][col];
        if (pixel !== 0) {
          ctx.fillStyle = colors[pixel] || '#000000';
          ctx.fillRect(
            x + col * scale,
            y + row * scale,
            scale,
            scale
          );
        }
      }
    }
  };

  // Generate 16-bit SNES-style maps for each area
  function generateBeachMap() {
    const tiles = Array(80).fill().map(() => Array(200).fill(0));
    
    // Beach sand floor (SNES-style tan)
    for (let row = 60; row < 80; row++) {
      for (let col = 0; col < 200; col++) {
        tiles[row][col] = 2; // Sand (Tan)
      }
    }
    
    // Ocean water (SNES-style blue gradient)
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 200; col++) {
        tiles[row][col] = 6; // Deep Water (Royal Blue)
      }
    }
    
    // Shallow water near shore
    for (let row = 20; row < 30; row++) {
      for (let col = 0; col < 200; col++) {
        if (Math.random() > 0.3) {
          tiles[row][col] = 7; // Shallow Water (Sky Blue)
        }
      }
    }
    
    // Ancient stone ruins (SNES-style stone)
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(Math.random() * 180) + 10;
      const y = 50 + Math.floor(Math.random() * 20);
      for (let row = y; row < y + 4; row++) {
        for (let col = x; col < x + 8; col++) {
          if (row >= 0 && row < 80 && col >= 0 && col < 200) {
            tiles[row][col] = 5; // Stone (Dim Gray)
          }
        }
      }
    }
    
    // Palm trees (SNES-style with trunk and leaves)
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * 180) + 10;
      const y = 55 + Math.floor(Math.random() * 15);
      // Tree trunk
      for (let row = y; row < y + 3; row++) {
        for (let col = x; col < x + 2; col++) {
          if (row >= 0 && row < 80 && col >= 0 && col < 200) {
            tiles[row][col] = 15; // Tree Trunk (Dark Brown)
          }
        }
      }
      // Tree leaves
      for (let row = y - 2; row < y + 1; row++) {
        for (let col = x - 1; col < x + 3; col++) {
          if (row >= 0 && row < 80 && col >= 0 && col < 200 && tiles[row][col] === 0) {
            tiles[row][col] = 16; // Tree Leaves (Forest Green)
          }
        }
      }
    }
    
    // Beach rocks and shells
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(Math.random() * 190) + 5;
      const y = 60 + Math.floor(Math.random() * 15);
      if (tiles[y][x] === 0) {
        tiles[y][x] = 5; // Small rocks
      }
    }
    
    return tiles;
  }

  function generateForestMap() {
    const tiles = Array(80).fill().map(() => Array(200).fill(0));
    
    // Forest floor (SNES-style grass)
    for (let row = 60; row < 80; row++) {
      for (let col = 0; col < 200; col++) {
        tiles[row][col] = 3; // Grass (Forest Green)
      }
    }
    
    // Dense forest trees (SNES-style with proper layering)
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(Math.random() * 180) + 10;
      const y = Math.floor(Math.random() * 50) + 10;
      
      // Tree trunk (larger for SNES style)
      for (let row = y; row < y + 5; row++) {
        for (let col = x; col < x + 4; col++) {
          if (row >= 0 && row < 80 && col >= 0 && col < 200) {
            tiles[row][col] = 15; // Tree Trunk (Dark Brown)
          }
        }
      }
      
      // Tree canopy (SNES-style layered leaves)
      for (let row = y - 3; row < y + 2; row++) {
        for (let col = x - 2; col < x + 6; col++) {
          if (row >= 0 && row < 80 && col >= 0 && col < 200 && tiles[row][col] === 0) {
            tiles[row][col] = 16; // Tree Leaves (Forest Green)
          }
        }
      }
    }
    
    // Forest paths (SNES-style dirt paths)
    for (let i = 0; i < 4; i++) {
      const startX = Math.floor(Math.random() * 180) + 10;
      for (let col = startX; col < startX + 25; col++) {
        if (col < 200) {
          tiles[65][col] = 1; // Dirt Path (Saddle Brown)
        }
      }
    }
    
    // Fallen logs and stumps
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * 190) + 5;
      const y = 60 + Math.floor(Math.random() * 15);
      if (tiles[y][x] === 0) {
        tiles[y][x] = 18; // Wood/Logs (Saddle Brown)
      }
    }
    
    // Mushrooms and forest details
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 190) + 5;
      const y = 60 + Math.floor(Math.random() * 15);
      if (tiles[y][x] === 0) {
        tiles[y][x] = 22; // Magic/Purple (Mushrooms)
      }
    }
    
    return tiles;
  }

  function generateMountainMap() {
    const tiles = Array(80).fill().map(() => Array(200).fill(0));
    
    // Mountain base - much larger
    for (let row = 50; row < 80; row++) {
      for (let col = 0; col < 200; col++) {
        tiles[row][col] = 6; // Rock
      }
    }
    
    // Mountain peaks - more varied
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(Math.random() * 150) + 20;
      const y = 20 + Math.floor(Math.random() * 20);
      const height = 10 + Math.floor(Math.random() * 20);
      const width = 8 + Math.floor(Math.random() * 12);
      
      for (let row = y; row < y + height; row++) {
        for (let col = x; col < x + width; col++) {
          if (row >= 0 && row < 80 && col >= 0 && col < 200) {
            tiles[row][col] = 7; // Mountain peak
          }
        }
      }
    }
    
    // Mountain paths
    for (let i = 0; i < 3; i++) {
      const startX = Math.floor(Math.random() * 150) + 20;
      for (let col = startX; col < startX + 30; col++) {
        if (col < 200) {
          tiles[55][col] = 0; // Clear path
        }
      }
    }
    
    return tiles;
  }

  function generateDowntownMap() {
    const tiles = Array(150).fill().map(() => Array(200).fill(0));
    
    // City streets - SNES-style grid pattern
    for (let row = 0; row < 150; row++) {
      for (let col = 0; col < 200; col++) {
        // Main horizontal streets (SNES-style asphalt)
        if (row % 40 === 0 || row % 40 === 1) {
          tiles[row][col] = 1; // Dirt Path (asphalt streets)
        }
        // Main vertical streets
        if (col % 50 === 0 || col % 50 === 1) {
          tiles[row][col] = 1; // Dirt Path (asphalt streets)
        }
        // Sidewalks (SNES-style concrete)
        if ((row % 40 === 2 || row % 40 === 3) && col % 50 !== 0 && col % 50 !== 1) {
          tiles[row][col] = 12; // Bright Building (concrete sidewalks)
        }
        if ((col % 50 === 2 || col % 50 === 3) && row % 40 !== 0 && row % 40 !== 1) {
          tiles[row][col] = 12; // Bright Building (concrete sidewalks)
        }
      }
    }
    
    // Skyscrapers - SNES-style tall buildings
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(Math.random() * 175) + 12;
      const y = Math.floor(Math.random() * 100) + 12;
      const width = 10 + Math.floor(Math.random() * 12);
      const height = 15 + Math.floor(Math.random() * 20);
      
      for (let row = y; row < y + height && row < 150; row++) {
        for (let col = x; col < x + width && col < 200; col++) {
          if (row >= 0 && row < 150 && col >= 0 && col < 200) {
            tiles[row][col] = 9; // Dark Building (skyscraper base)
          }
        }
      }
      
      // Add windows to skyscrapers (SNES-style)
      for (let row = y + 2; row < y + height - 2 && row < 150; row += 3) {
        for (let col = x + 2; col < x + width - 2 && col < 200; col += 3) {
          if (tiles[row][col] === 9) {
            tiles[row][col] = 11; // Light Building (windows)
          }
        }
      }
    }
    
    // Medium buildings (SNES-style office buildings)
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * 185) + 7;
      const y = Math.floor(Math.random() * 120) + 7;
      const width = 6 + Math.floor(Math.random() * 8);
      const height = 8 + Math.floor(Math.random() * 12);
      
      for (let row = y; row < y + height && row < 150; row++) {
        for (let col = x; col < x + width && col < 200; col++) {
          if (row >= 0 && row < 150 && col >= 0 && col < 200) {
            tiles[row][col] = 10; // Medium Building (office buildings)
          }
        }
      }
    }
    
    // Small shops and houses (SNES-style residential)
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(Math.random() * 190) + 5;
      const y = Math.floor(Math.random() * 130) + 5;
      const width = 4 + Math.floor(Math.random() * 6);
      const height = 5 + Math.floor(Math.random() * 8);
      
      for (let row = y; row < y + height && row < 150; row++) {
        for (let col = x; col < x + width && col < 200; col++) {
          if (row >= 0 && row < 150 && col >= 0 && col < 200) {
            tiles[row][col] = 13; // Red Brick (residential buildings)
          }
        }
      }
    }
    
    // City parks (SNES-style green spaces)
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(Math.random() * 175) + 12;
      const y = Math.floor(Math.random() * 120) + 12;
      const width = 8 + Math.floor(Math.random() * 10);
      const height = 6 + Math.floor(Math.random() * 8);
      
      for (let row = y; row < y + height && row < 150; row++) {
        for (let col = x; col < x + width && col < 200; col++) {
          if (row >= 0 && row < 150 && col >= 0 && col < 200) {
            tiles[row][col] = 4; // Bright Grass (city parks)
          }
        }
      }
      
      // Add trees to parks
      for (let j = 0; j < 3; j++) {
        const treeX = x + Math.floor(Math.random() * width);
        const treeY = y + Math.floor(Math.random() * height);
        if (treeX < 200 && treeY < 150) {
          tiles[treeY][treeX] = 15; // Tree Trunk
          if (treeY > 0) tiles[treeY - 1][treeX] = 16; // Tree Leaves
        }
      }
    }
    
    // Neon signs and crypto decorations (SNES-style)
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(Math.random() * 195) + 2;
      const y = Math.floor(Math.random() * 145) + 2;
      if (tiles[y][x] === 0) {
        tiles[y][x] = 23; // Pink/Neon (crypto signs)
      }
    }
    
    // Crypto ATMs and blockchain nodes
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 195) + 2;
      const y = Math.floor(Math.random() * 145) + 2;
      if (tiles[y][x] === 0) {
        tiles[y][x] = 22; // Magic/Purple (blockchain nodes)
      }
    }
    
    return tiles;
  }

  function generateVillageMap() {
    const tiles = Array(150).fill().map(() => Array(200).fill(0));
    
    // Village ground
    for (let row = 100; row < 150; row++) {
      for (let col = 0; col < 200; col++) {
        tiles[row][col] = 4; // Grass
      }
    }
    
    // Houses (reduced count for performance)
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(Math.random() * 175) + 12;
      const y = 75 + Math.floor(Math.random() * 50);
      for (let row = y; row < y + 6; row++) {
        for (let col = x; col < x + 8; col++) {
          if (row >= 0 && row < 150 && col >= 0 && col < 200) {
            tiles[row][col] = 3; // House
          }
        }
      }
    }
    
    // Village paths
    for (let row = 110; row < 150; row++) {
      for (let col = 0; col < 200; col++) {
        if (col % 15 < 3) {
          tiles[row][col] = 0; // Path
        }
      }
    }
    
    return tiles;
  }

  // Load Mother World from external JSON (public/mother_world_map.json)
  const motherWorldRef = useRef(null);

  // Seeded PRNG for deterministic generation
  const makeRng = (seed = 1337) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  };

  // Lightweight value-noise function using hash-based interpolation
  function noise2D(x, y, rng) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const h = (i, j) => {
      const n = Math.sin((xi + i) * 127.1 + (yi + j) * 311.7) * 43758.5453123;
      return n - Math.floor(n);
    };
    const n00 = h(0, 0), n10 = h(1, 0), n01 = h(0, 1), n11 = h(1, 1);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    return nx0 * (1 - v) + nx1 * v;
  }

  // Generate a natural island-like Mother World when JSON is empty
  function generateNaturalMotherWorld(width = 640, height = 480, seed = 424242) {
    const T = { empty: 0, dirt: 1, sand: 2, grass: 3, rock: 5, deepWater: 6, shallowWater: 7, mountain: 25, river: 26, forest: 27, village: 28 };
    const tiles = Array(height).fill(null).map(() => Array(width).fill(T.deepWater));
    const props = [];
    const rng = makeRng(seed);

    // Island mask using radial falloff + fBm noise
    const cx = width / 2, cy = height / 2;
    const scale = Math.min(width, height) / 180;
    const fbm = (x, y) => {
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let o = 0; o < 4; o++) {
        sum += noise2D(x * freq, y * freq, rng) * amp;
        norm += amp; amp *= 0.5; freq *= 1.9;
      }
      return sum / norm;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / (width * 0.55);
        const dy = (y - cy) / (height * 0.55);
        const r = Math.sqrt(dx * dx + dy * dy);
        const n = fbm(x / 64, y / 64);
        const mask = 0.65 - r + (n - 0.5) * 0.25; // island threshold
        if (mask > 0) tiles[y][x] = T.grass; else tiles[y][x] = T.deepWater;
      }
    }

    // Coast classification: shallow water and beach sand
    const inB = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
    const hasLandNeighbor = (x, y) => {
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        if (!i && !j) continue; const nx = x + i, ny = y + j;
        if (inB(nx, ny) && tiles[ny][nx] === T.grass) return true;
      }
      return false;
    };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (tiles[y][x] === T.deepWater && hasLandNeighbor(x, y)) tiles[y][x] = T.shallowWater;
    }
    const nearWater = (x, y) => {
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const nx = x + i, ny = y + j; if (!inB(nx, ny)) continue;
        const t = tiles[ny][nx]; if (t === T.deepWater || t === T.shallowWater) return true;
      } return false;
    };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (tiles[y][x] === T.grass && nearWater(x, y)) tiles[y][x] = T.sand;
    }

    // Forest clusters
    const forestSeeds = 18;
    for (let k = 0; k < forestSeeds; k++) {
      const fx = Math.floor(rng() * width), fy = Math.floor(rng() * height);
      const radius = 6 + Math.floor(rng() * 16);
      for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
        const nx = fx + x, ny = fy + y; if (!inB(nx, ny)) continue;
        if (tiles[ny][nx] === T.grass && (x * x + y * y) <= radius * radius && rng() > 0.25) tiles[ny][nx] = T.forest;
      }
    }

    // Mountains
    const mountainSeeds = 10;
    for (let k = 0; k < mountainSeeds; k++) {
      const mx = Math.floor(rng() * width), my = Math.floor(rng() * height);
      const radius = 8 + Math.floor(rng() * 18);
      for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
        const nx = mx + x, ny = my + y; if (!inB(nx, ny)) continue;
        const d2 = x * x + y * y; if (tiles[ny][nx] === T.grass && d2 <= radius * radius) {
          tiles[ny][nx] = d2 < (radius * radius * 0.35) ? T.mountain : (rng() > 0.7 ? T.rock : tiles[ny][nx]);
        }
      }
    }

    // A winding river from north to south
    let rx = Math.floor(width * (0.3 + rng() * 0.4));
    for (let y = 0; y < height; y++) {
      const meander = Math.floor(Math.sin(y / 35) * 6 + Math.sin(y / 11) * 3);
      rx = Math.max(4, Math.min(width - 5, rx + meander + (rng() < 0.5 ? -1 : 1)));
      for (let w = -1; w <= 1; w++) {
        const nx = rx + w; if (!inB(nx, y)) continue;
        if (tiles[y][nx] !== T.deepWater && tiles[y][nx] !== T.shallowWater) tiles[y][nx] = T.river;
      }
      // sand banks
      for (let w = -2; w <= 2; w += 2) {
        const nx = rx + w; if (inB(nx, y) && tiles[y][nx] === T.grass) tiles[y][nx] = T.sand;
      }
    }

    // Villages: 5 clusters deep inland (not near water)
    const villages = [];
    const farFromWater = (x, y) => {
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
        const nx = x + i, ny = y + j; if (!inB(nx, ny)) return false;
        const t = tiles[ny][nx]; if (t === T.deepWater || t === T.shallowWater || t === T.river || t === T.sand) return false;
      } return true;
    };
    let tries = 0; while (villages.length < 5 && tries++ < 4000) {
      const x = Math.floor(rng() * width), y = Math.floor(rng() * height);
      if (tiles[y][x] !== T.grass && tiles[y][x] !== T.forest) continue;
      if (!farFromWater(x, y)) continue;
      villages.push({ x, y });
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
        const nx = x + i, ny = y + j; if (!inB(nx, ny)) continue;
        if (Math.abs(i) <= 2 && Math.abs(j) <= 2) tiles[ny][nx] = T.village; else if (tiles[ny][nx] === T.forest) tiles[ny][nx] = T.grass;
      }
    }

    // Dirt paths linking villages with river mouth
    const link = (ax, ay, bx, by) => {
      let x = ax, y = ay; const steps = Math.max(1, Math.abs(ax - bx) + Math.abs(ay - by));
      for (let s = 0; s < steps; s++) {
        const dx = Math.sign(bx - x), dy = Math.sign(by - y);
        const prevX = x, prevY = y;
        if (rng() < 0.6) x += dx; else y += dy;
        if (inB(x, y) && tiles[y][x] !== T.deepWater && tiles[y][x] !== T.shallowWater) {
          // Path tile (thickened)
          tiles[y][x] = T.dirt;
          if (inB(x + 1, y) && tiles[y][x + 1] === T.grass && rng() < 0.5) tiles[y][x + 1] = T.dirt;
          if (inB(x, y + 1) && tiles[y + 1][x] === T.grass && rng() < 0.3) tiles[y + 1][x] = T.dirt;
          // Bridge where path crosses river
          const crossesRiver = near(x, y, t => t === T.river) || tiles[y][x] === T.river;
          if (crossesRiver) {
            const px = x * 8, py = y * 8;
            const horiz = dx !== 0 && dy === 0;
            props.push({ type: horiz ? 'bridgeH' : 'bridgeV', x: px, y: py, block: false });
          }
        }
      }
    };
    for (let i = 1; i < villages.length; i++) link(villages[i - 1].x, villages[i - 1].y, villages[i].x, villages[i].y);
    if (villages.length) link(villages[0].x, villages[0].y, rx, Math.floor(height * 0.6));

    // Entities
    const npcs = villages.map((v, i) => ({ x: v.x * 8, y: v.y * 8, type: 'villager', village: `Village ${i + 1}` }));
    const treasures = Array.from({ length: 20 }, (_, i) => ({ x: Math.floor(rng() * width) * 8, y: Math.floor(rng() * height) * 8, type: 'gold', value: 1 + Math.floor(rng() * 50), collected: false }));
    const enemies = Array.from({ length: 30 }, () => ({ x: Math.floor(rng() * width) * 8, y: Math.floor(rng() * height) * 8, width: 16, height: 16, type: rng() < 0.5 ? 'boar' : (rng() < 0.5 ? 'bee' : 'snail'), difficulty: rng() < 0.2 ? 'hard' : rng() < 0.6 ? 'medium' : 'easy', facingRight: rng() < 0.5, health: 100, maxHealth: 100 }));

    // Spawn near middle village or center
    const spawnVillage = villages[0] || { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    const spawn = { x: spawnVillage.x * 8, y: (spawnVillage.y + 2) * 8 };

    return { name: 'Mother World', width, height, tiles, npcs, enemies, treasures, spawn };
  }

  // Build world from a high-level spec (climates, features, settlements)
  function buildWorldFromSpec(spec) {
    // Tileset IDs
    const T = { empty: 0, dirt: 1, sand: 2, grass: 3, rock: 5, deepWater: 6, shallowWater: 7, mountain: 25, river: 26, forest: 27, village: 28 };
    const width = spec.width || 768;
    const height = spec.height || 576;
    const seed = spec.seed || 1337;
    const rng = makeRng(seed);
    const tiles = Array(height).fill(null).map(() => Array(width).fill(T.deepWater));

    // Island mask
    const cx = width / 2, cy = height / 2;
    const radiusX = (spec.island?.radiusX || 0.48) * width;
    const radiusY = (spec.island?.radiusY || 0.48) * height;
    const fbm = (x, y) => {
      let a = 1, f = 1, s = 0, n = 0;
      for (let o = 0; o < 4; o++) { s += noise2D(x * f, y * f, rng) * a; n += a; a *= 0.5; f *= 1.9; }
      return s / n;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / radiusX;
        const dy = (y - cy) / radiusY;
        const r = Math.sqrt(dx * dx + dy * dy);
        const n = fbm(x / 64, y / 64);
        if (r + (0.25 - n * 0.35) < 0.98) tiles[y][x] = T.grass;
      }
    }

    // Shallows and beaches
    const inB = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
    const near = (x, y, pred) => {
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        if (!i && !j) continue; const nx = x + i, ny = y + j; if (inB(nx, ny) && pred(tiles[ny][nx])) return true;
      }
      return false;
    };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (tiles[y][x] === T.deepWater && near(x, y, t => t === T.grass)) tiles[y][x] = T.shallowWater;
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (tiles[y][x] === T.grass && near(x, y, t => t === T.shallowWater || t === T.deepWater)) tiles[y][x] = T.sand;
    }

    // Climate bands
    const climates = spec.climates || [
      { name: 'tropical', y0: 0.55, y1: 0.95, forest: 0.6 },
      { name: 'temperate', y0: 0.25, y1: 0.55, forest: 0.45 },
      { name: 'alpine', y0: 0.0, y1: 0.25, forest: 0.25 }
    ];
    climates.forEach(c => {
      const y0 = Math.floor(height * c.y0), y1 = Math.floor(height * c.y1);
      for (let y = y0; y < y1; y++) for (let x = 0; x < width; x++) {
        if (tiles[y][x] === T.grass && rng() < c.forest * 0.4) tiles[y][x] = T.forest;
      }
    });

    // Mountains
    const m = spec.mountains || { count: 10, minR: 12, maxR: 28 };
    for (let k = 0; k < m.count; k++) {
      const mx = Math.floor(rng() * width), my = Math.floor(rng() * height);
      const r = Math.floor(m.minR + rng() * (m.maxR - m.minR));
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const nx = mx + i, ny = my + j; if (!inB(nx, ny)) continue;
        const d2 = i * i + j * j; if (tiles[ny][nx] === T.grass && d2 <= r * r) {
          tiles[ny][nx] = d2 < (r * r * 0.35) ? T.mountain : (rng() > 0.7 ? T.rock : tiles[ny][nx]);
        }
      }
    }

    // Rivers
    (spec.rivers || [{ fromX: 0.3, toX: 0.7 }]).forEach(riv => {
      let rx = Math.floor(width * (riv.fromX + rng() * 0.1));
      for (let y = 0; y < height; y++) {
        const meander = Math.floor(Math.sin(y / 40) * 5 + Math.sin(y / 13) * 3);
        rx = Math.max(3, Math.min(width - 4, rx + meander + (rng() < 0.5 ? -1 : 1)));
        for (let w = -1; w <= 1; w++) {
          const nx = rx + w; if (!inB(nx, y)) continue;
          const t = tiles[y][nx]; if (t !== T.deepWater && t !== T.shallowWater) tiles[y][nx] = T.river;
        }
        if (inB(rx - 2, y) && tiles[y][rx - 2] === T.grass) tiles[y][rx - 2] = T.sand;
        if (inB(rx + 2, y) && tiles[y][rx + 2] === T.grass) tiles[y][rx + 2] = T.sand;
      }
    });

    // Villages
    const villages = [];
    const vSpec = spec.villages || { count: 5, minDistWater: 3 };
    const farFromWater = (x, y) => {
      for (let j = -vSpec.minDistWater; j <= vSpec.minDistWater; j++) for (let i = -vSpec.minDistWater; i <= vSpec.minDistWater; i++) {
        const nx = x + i, ny = y + j; if (!inB(nx, ny)) return false;
        const t = tiles[ny][nx]; if (t === T.deepWater || t === T.shallowWater || t === T.river || t === T.sand) return false;
      } return true;
    };
    let tries = 0; while (villages.length < vSpec.count && tries++ < 5000) {
      const x = Math.floor(rng() * width), y = Math.floor(rng() * height);
      if (!(tiles[y][x] === T.grass || tiles[y][x] === T.forest)) continue;
      if (!farFromWater(x, y)) continue;
      villages.push({ x, y });
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
        const nx = x + i, ny = y + j; if (!inB(nx, ny)) continue;
        if (Math.abs(i) <= 2 && Math.abs(j) <= 2) tiles[ny][nx] = T.village; else if (tiles[ny][nx] === T.forest) tiles[ny][nx] = T.grass;
      }
    }

    // Paths linking villages
    const link = (ax, ay, bx, by) => {
      let x = ax, y = ay; const steps = Math.max(1, Math.abs(ax - bx) + Math.abs(ay - by));
      for (let s = 0; s < steps; s++) {
        const dx = Math.sign(bx - x), dy = Math.sign(by - y);
        if (rng() < 0.6) x += dx; else y += dy;
        if (inB(x, y) && tiles[y][x] !== T.deepWater && tiles[y][x] !== T.shallowWater && tiles[y][x] !== T.river) tiles[y][x] = T.dirt;
      }
    };
    for (let i = 1; i < villages.length; i++) link(villages[i - 1].x, villages[i - 1].y, villages[i].x, villages[i].y);

    // Entities from spec or defaults
    const npcs = villages.map((v, i) => ({ x: v.x * 8, y: v.y * 8, type: 'villager', village: spec.villageNames?.[i] || `Village ${i + 1}` }));
    // Place buildings around each village center
    villages.forEach((v, i) => {
      const name = spec.villageNames?.[i] || `Village ${i + 1}`;
      const baseX = v.x * 8, baseY = v.y * 8;
      const layout = [
        { dx: -16, dy: -12 }, { dx: 16, dy: -12 }, { dx: -16, dy: 12 }, { dx: 16, dy: 12 },
        { dx: 0, dy: -20 }, { dx: 0, dy: 20 }
      ];
      layout.forEach(p => props.push({ type: 'house', x: baseX + p.dx, y: baseY + p.dy, block: true }));
      props.push({ type: 'well', x: baseX - 4, y: baseY - 4, block: false });
      if (rng() < 0.5) props.push({ type: 'barrel', x: baseX + 10, y: baseY + 6, block: false });
      // Clear a plaza
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
        const tx = v.x + ox, ty = v.y + oy; if (!inB(tx, ty)) continue; if (tiles[ty][tx] !== T.deepWater) tiles[ty][tx] = (Math.abs(ox) + Math.abs(oy)) <= 2 ? T.dirt : tiles[ty][tx];
      }
    });
    const treasures = (spec.treasures || []).map(t => ({ ...t }));
    while (treasures.length < (spec.autoTreasures || 30)) {
      treasures.push({ x: Math.floor(rng() * width) * 8, y: Math.floor(rng() * height) * 8, type: 'gold', value: 1 + Math.floor(rng() * 50), collected: false });
    }
    const enemies = (spec.enemies || []).map(e => ({ ...e }));
    while (enemies.length < (spec.autoEnemies || 40)) {
      enemies.push({ x: Math.floor(rng() * width) * 8, y: Math.floor(rng() * height) * 8, width: 16, height: 16, type: rng() < 0.5 ? 'boar' : (rng() < 0.5 ? 'bee' : 'snail'), difficulty: rng() < 0.2 ? 'hard' : rng() < 0.6 ? 'medium' : 'easy', facingRight: rng() < 0.5, health: 100, maxHealth: 100 });
    }

    // Spawn
    const spawn = spec.spawn || { x: Math.floor(width / 2) * 8, y: Math.floor(height / 2) * 8 };
    return { name: spec.name || 'Mother World', width, height, tiles, npcs, enemies, treasures, spawn, props };
  }
  const gameMap = {
    get width() { return motherWorldRef.current?.width || 1024; },
    get height() { return motherWorldRef.current?.height || 768; },
    currentArea: 'motherworld',
    areas: { get motherworld() { return motherWorldRef.current || { tiles: [[0]], npcs: [], treasures: [], enemies: [], spawn: { x: 512, y: 600 } }; } }
  };
  // player spawn will be applied once during initGame

  // Initialize treasures from Mother World
  const initTreasures = () => {
    const world = motherWorldRef.current;
    gameWorldState.current.treasures = [...(world?.treasures || [])];
    console.log(`🏆 Loaded ${gameWorldState.current.treasures.length} treasures from Mother World`);
  };

  // Initialize enemies from Mother World
  const initEnemies = () => {
    // Base enemies from Mother World
    const world = motherWorldRef.current;
    let list = [...(world?.enemies || [])];
    // Night boost: if starting at night, add extra spawns
    if (dayNightCycle.current && dayNightCycle.current.isNight) {
      const extra = Math.floor(list.length * 0.3);
      for (let i = 0; i < extra; i++) {
        const e = list[(i * 7) % Math.max(1,list.length)];
        list.push({ ...e, x: e.x + (Math.random() * 80 - 40), y: e.y + (Math.random() * 80 - 40) });
      }
    }
    gameWorldState.current.enemies = list;
    console.log(`👹 Loaded ${list.length} enemies (night boost applied if night)`);
  };

  // Game functions are defined below

  // Game utility functions

  // Collision detection
  const checkCollision = (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  // Utility
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // Viewport sizing: centered rectangle window (16:10 aspect)
  const computeViewportSize = () => {
    const availableW = window.innerWidth - 120;
    const availableH = window.innerHeight - 180;
    const w = clamp(Math.floor(availableW * 0.8), 960, 1280);
    const h = clamp(Math.floor(w * 0.625), 600, 800); // 16:10 ratio
    return { width: w - (w % 8), height: h - (h % 8) };
  };

  // Enhanced tile collision detection for SNES-style tiles
  const checkTileCollision = (x, y, width, height) => {
    const tileSize = 8; // SNES-style 8x8 tiles
    const left = Math.floor(x / tileSize);
    const right = Math.floor((x + width) / tileSize);
    const top = Math.floor(y / tileSize);
    const bottom = Math.floor((y + height) / tileSize);
    const currentArea = gameMap.areas[gameMap.currentArea];

    const mw = motherWorldRef.current;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (row >= 0 && row < gameMap.height && col >= 0 && col < gameMap.width) {
          const tileType = mw?.tiles?.[row]?.[col] ?? 0;
          
          // SNES-style collision detection
          // Buildings, trees, rocks, and structures block movement
          if (tileType === 5 || // Stone/Rock
              tileType === 9 || // Dark Building
              tileType === 10 || // Medium Building
              tileType === 11 || // Light Building
              tileType === 12 || // Bright Building
              tileType === 13 || // Red Brick
              tileType === 14 || // Bright Brick
              tileType === 15 || // Tree Trunk
              tileType === 18 || // Wood/Logs
              tileType === 22 || // Magic/Purple (blockchain nodes)
              tileType === 23) { // Pink/Neon (crypto signs)
            return true;
          }
        }
      }
    }
    // Prop collisions (houses, rocks, stumps, trees if marked block)
    if (currentArea.props) {
      for (const p of currentArea.props) {
        if (!p.block) continue;
        const pw = p.type === 'house' ? 24 : 16;
        const ph = p.type === 'house' ? 20 : 16;
        if (x < p.x + pw && x + width > p.x && y < p.y + ph && y + height > p.y) {
          return true;
        }
      }
    }
    return false;
  };

  // Enhanced area transitions for larger world
  const checkAreaTransition = (nextX, nextY) => {
    const player = gameWorldState.current.player;
    const area = gameMap.areas[gameMap.currentArea];
    const tileSize = 8;
    const worldW = (area && area.tiles && area.tiles[0]) ? area.tiles[0].length * tileSize : (motherWorldRef.current?.width || 0);
    const worldH = (area && area.tiles) ? area.tiles.length * tileSize : (motherWorldRef.current?.height || 0);
    const atLeft = nextX <= 0;
    const atRight = nextX + player.width >= worldW;
    const atTop = nextY <= 0;
    const atBottom = nextY + player.height >= worldH;

    let target = null;
    if (atLeft && area.neighbors && area.neighbors.west) target = area.neighbors.west;
    if (atRight && area.neighbors && area.neighbors.east) target = area.neighbors.east;
    if (atTop && area.neighbors && area.neighbors.north) target = area.neighbors.north;
    if (atBottom && area.neighbors && area.neighbors.south) target = area.neighbors.south;
    if (!target) return;

    gameMap.currentArea = target;
    const nextArea = gameMap.areas[target];
    // place near opposite edge spawn
    const margin = 12;
    if (atLeft && nextArea && nextArea.tiles && nextArea.tiles[0]) {
      player.x = nextArea.tiles[0].length * tileSize - player.width - margin;
      player.y = clamp(player.y, margin, nextArea.tiles.length * tileSize - player.height - margin);
    } else if (atRight && nextArea && nextArea.tiles) {
      player.x = margin;
      player.y = clamp(player.y, margin, nextArea.tiles.length * tileSize - player.height - margin);
    } else if (atTop && nextArea && nextArea.tiles && nextArea.tiles[0]) {
      player.y = nextArea.tiles.length * tileSize - player.height - margin;
      player.x = clamp(player.x, margin, nextArea.tiles[0].length * tileSize - player.width - margin);
    } else if (atBottom && nextArea && nextArea.tiles && nextArea.tiles[0]) {
      player.y = margin;
      player.x = clamp(player.x, margin, nextArea.tiles[0].length * tileSize - player.width - margin);
    }

    // Respawn enemies for new area
    initEnemies();

    playSound('transition', 600, 0.25);
    setModalContent(`Entering ${nextArea.name}...`);
      setShowModal(true);
    setTimeout(() => setShowModal(false), 1600);
  };

  // Enhanced 8-directional RPG movement system
  const updatePlayer = () => {
    const player = gameWorldState.current.player;
    const keys = gameWorldState.current.keys;

    // 8-directional movement with diagonal support
    const isPressed = (names) => names.some((n) => !!keys[n]);
    let moveX = 0;
    let moveY = 0;
    const moveSpeed = 3;

    // Check for game over condition
    if (player.health <= 0 && gameState === 'playing') {
      triggerGameOver();
      return;
    }
    
    // Only move if not in combat animation or eating
    if ((player.state === 'idle' || player.state === 'run') && !player.isEating) {
    // Horizontal movement
      if (isPressed(['ArrowLeft','a','A','KeyA'])) {
      moveX = -moveSpeed;
      player.facingRight = false;
    }
      if (isPressed(['ArrowRight','d','D','KeyD'])) {
      moveX = moveSpeed;
      player.facingRight = true;
    }

    // Vertical movement (RPG-style, no gravity)
      if (isPressed(['ArrowUp','w','W','KeyW'])) {
      moveY = -moveSpeed;
    }
      if (isPressed(['ArrowDown','s','S','KeyS'])) {
      moveY = moveSpeed;
      }
    }

    // Diagonal movement (normalize for consistent speed)
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707; // 1/sqrt(2) for diagonal normalization
      moveY *= 0.707;
    }

    // Apply movement
    player.velocityX = moveX;
    player.velocityY = moveY;

    // Update position
    const newX = player.x + player.velocityX;
    const newY = player.y + player.velocityY;

    // Check area transitions
    checkAreaTransition(newX, newY);

    // Enhanced collision detection for 8-directional movement
    let canMoveX = true;
    let canMoveY = true;

    // Check horizontal collision
    if (checkTileCollision(newX, player.y, player.width, player.height)) {
      canMoveX = false;
    }

    // Check vertical collision
    if (checkTileCollision(player.x, newY, player.width, player.height)) {
      canMoveY = false;
    }

    // Apply movement if no collision
    if (canMoveX) {
      player.x = newX;
    }
    if (canMoveY) {
      player.y = newY;
    }

    // Keep player in bounds
    player.x = Math.max(0, Math.min(player.x, gameMap.width * 8 - player.width));
    player.y = Math.max(0, Math.min(player.y, gameMap.height * 8 - player.height));

    // Enhanced camera following with smooth interpolation
    const canvas = canvasRef.current;
    const zoomScale = gameWorldState.current.zoomScale || 1.5;
    const targetCameraX = player.x - (canvas ? canvas.width : 800) / (2 * zoomScale);
    const targetCameraY = player.y - (canvas ? canvas.height : 600) / (2 * zoomScale);
    
    gameWorldState.current.camera.x += (targetCameraX - gameWorldState.current.camera.x) * 0.1;
    gameWorldState.current.camera.y += (targetCameraY - gameWorldState.current.camera.y) * 0.1;

    // Clamp camera so we never see beyond world bounds
    const maxX = gameMap.width * 8 - (canvas ? canvas.width : 800) / zoomScale;
    const maxY = gameMap.height * 8 - (canvas ? canvas.height : 600) / zoomScale;
    gameWorldState.current.camera.x = Math.max(0, Math.min(maxX, gameWorldState.current.camera.x));
    gameWorldState.current.camera.y = Math.max(0, Math.min(maxY, gameWorldState.current.camera.y));

    // Update player timers
    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.defendCooldown > 0) player.defendCooldown--;
    if (player.invulnerable > 0) player.invulnerable--;
    if (player.eatTimer > 0) {
      player.eatTimer--;
      if (player.eatTimer <= 0) {
        player.isEating = false;
        player.health = Math.min(player.maxHealth, player.health + 20);
        energySystemRef.current.feed(0.3);
        setModalContent('You ate food. Health and hunger restored.');
        
        // Play heal sound effect
        musicManager.current.playSFX('heal', 400, 0.4);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 1500);
      }
    }
    
    // Reset combo if too much time passed
    if (Date.now() - player.lastAttackTime > 1500) {
      player.attackComboCount = 0;
    }
    
    // State transitions
    if (player.state === 'attack' && player.attackCooldown <= 0) player.state = 'idle';
    if (player.state === 'attack2' && player.attackCooldown <= 0) player.state = 'idle';
    if (player.state === 'attackCombo' && player.attackCooldown <= 0) player.state = 'idle';
    if (player.state === 'defend' && player.defendCooldown <= 0 && !player.isEating) player.state = 'idle';
    if (player.state === 'roll' && player.invulnerable <= 0) player.state = 'idle';
    if (player.state === 'hit' && player.invulnerable <= 0) player.state = 'idle';
    
    // Movement state (only if not in special states)
    const canMove = !['attack', 'attack2', 'attackCombo', 'defend', 'roll', 'hit', 'death'].includes(player.state) && !player.isEating;
    if (canMove) {
    if (Math.abs(player.velocityX) > 0.1 || Math.abs(player.velocityY) > 0.1) {
        if (player.state === 'idle') player.state = 'run';
      player.animTimer += 0.2;
      if (player.animTimer >= 1) {
          player.animFrame = (player.animFrame + 1) % 8; // 8-frame run animation
        player.animTimer = 0;
      }
        try { if (Math.random() < 0.2) audioMgr.current.playFootstep(); } catch (_) {}
    } else {
        if (player.state === 'run') player.state = 'idle';
        player.animTimer += 0.15;
        if (player.animTimer >= 1) {
          player.animFrame = (player.animFrame + 1) % 10; // 10-frame idle animation
          player.animTimer = 0;
        }
      }
    }
  };

  // Update enemies with AI
  const updateEnemies = () => {
    const player = gameWorldState.current.player;
    const enemies = gameWorldState.current.enemies;
    
    // Check if any enemies are in combat range for music
    const enemiesInCombat = enemies.some(enemy => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 150 && (enemy.state === 'chase' || enemy.state === 'attack');
    });
    
    // Switch to combat music if enemies are chasing/attacking
    if (enemiesInCombat && musicManager.current.currentTrack?.name !== 'combat') {
      musicManager.current.playTrack('combat');
    } else if (!enemiesInCombat && musicManager.current.currentTrack?.name === 'combat') {
      // Switch back to appropriate background music
      const backgroundTrack = isNight ? 'gameplay_night' : 'gameplay_day';
      musicManager.current.playTrack(backgroundTrack);
    }
    
    gameWorldState.current.enemies.forEach(enemy => {
      if (enemy.health <= 0) return;
      
      // Calculate distance to player
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // AI behavior based on difficulty and distance
      if (distance < 200) { // Detection range
        gameWorldState.current.combatMode = true;
        
        // Move towards player
        const moveSpeed = enemy.speed * (enemy.difficulty === 'hard' ? 1.5 : enemy.difficulty === 'medium' ? 1.2 : 1);
        if (distance > 40) { // Chase
          const moveX = (dx / distance) * moveSpeed;
          const moveY = (dy / distance) * moveSpeed;
          
          const newX = enemy.x + moveX;
          const newY = enemy.y + moveY;
          
          if (!checkTileCollision(newX, enemy.y, enemy.width, enemy.height)) enemy.x = newX;
          if (!checkTileCollision(enemy.x, newY, enemy.width, enemy.height)) enemy.y = newY;
          
          enemy.facingRight = dx > 0;
          enemy.state = 'chase';
        } else { // Attack range
          if (enemy.attackCooldown <= 0) {
            enemy.state = 'attack';
            enemy.attackCooldown = enemy.difficulty === 'hard' ? 30 : enemy.difficulty === 'medium' ? 45 : 60;
            
            // Damage player if not defending
            if (player.invulnerable <= 0) {
              const damage = enemy.difficulty === 'hard' ? 20 : enemy.difficulty === 'medium' ? 15 : 10;
              if (player.state !== 'defend') {
                player.health = Math.max(0, player.health - damage);
                player.state = 'hit';
                player.invulnerable = 30;
                playSound('hit', 300, 0.3);
                if (player.health <= 0) player.state = 'death';
              } else {
                playSound('defend', 500, 0.2);
              }
            }
          }
        }
      } else {
        // Patrol behavior
        enemy.x += enemy.direction * enemy.speed * 0.5;
        
        if (checkTileCollision(enemy.x, enemy.y, enemy.width, enemy.height) || Math.random() < 0.01) {
        enemy.direction *= -1;
        }
        enemy.state = 'patrol';
      }
      
      // Update enemy timers
      if (enemy.attackCooldown > 0) enemy.attackCooldown--;
      
      // Check if player attacks enemy
      if (player.state === 'attack' && player.attackCooldown > 20 && distance < 50) {
        const damage = 25;
        enemy.health = Math.max(0, enemy.health - damage);
        enemy.state = 'hit';
        musicManager.current.playSFX('hit', 350, 0.2);
      }
    });
    
    // Remove dead enemies
    gameWorldState.current.enemies = gameWorldState.current.enemies.filter(e => e.health > 0);
  };

  // Update treasures
  const updateTreasures = () => {
    const player = gameWorldState.current.player;
    const currentArea = gameMap.areas[gameMap.currentArea];
    
    (currentArea.treasures || []).forEach(treasure => {
      if (!treasure.collected && checkCollision(player, { x: treasure.x, y: treasure.y, width: 20, height: 20 })) {
        treasure.collected = true;
        playSound('collect', 600, 0.2);
        
        // Update player stats - only AVAX
        setPlayerStats(prev => ({
          ...prev,
          points: prev.points + treasure.value, // Add AVAX points
          avax: prev.avax + treasure.value // Add to AVAX balance
        }));

        // Chance to drop apple (food)
        if (Math.random() < 0.5) {
          energySystemRef.current.feed(0.4);
        }
        
        // Immediately update real-time stats to reflect changes
        setTimeout(() => {
          updateRealtimeStatsImmediately();
        }, 100); // Small delay to ensure state is updated
        
        // Show collection message
        setModalContent(`Found ${treasure.name}! +${treasure.value} AVAX Points`);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
      }
    });
  };

  // Atmospheric drawing functions
  const drawStars = (ctx, canvas) => {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (i * 123.456) % canvas.width;
      const y = (i * 234.567) % canvas.height;
      const brightness = 0.3 + 0.7 * Math.sin(Date.now() * 0.001 + i);
      ctx.globalAlpha = brightness;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  };

  const drawMoon = (ctx, canvas) => {
    const moonX = canvas.width * 0.8;
    const moonY = canvas.height * 0.2;
    const moonRadius = 30;
    
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Moon glow
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const drawSun = (ctx, canvas) => {
    const sunX = canvas.width * 0.8;
    const sunY = canvas.height * 0.2;
    const sunRadius = 40;
    
    // Sun rays
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rayLength = 60;
      ctx.beginPath();
      ctx.moveTo(
        sunX + Math.cos(angle) * (sunRadius + 10),
        sunY + Math.sin(angle) * (sunRadius + 10)
      );
      ctx.lineTo(
        sunX + Math.cos(angle) * (sunRadius + rayLength),
        sunY + Math.sin(angle) * (sunRadius + rayLength)
      );
      ctx.stroke();
    }
    
    // Sun body
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Sun glow
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  // Enhanced render function with rich environments
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const ctx = canvas.getContext('2d');
      
      // Handle different game screens
      if (gameStateRef.current === 'title') {
        screenManager.current.drawTitleScreen(ctx, canvas);
        return;
      } else if (gameStateRef.current === 'gameOver') {
        screenManager.current.drawGameOverScreen(ctx, canvas, gameStats);
        return;
      } else if (gameStateRef.current === 'scoreboard') {
        const scores = screenManager.current.loadScores();
        screenManager.current.drawScoreboard(ctx, canvas, scores);
        return;
      } else if (gameStateRef.current === 'help') {
        screenManager.current.drawHelpScreen(ctx, canvas);
        return;
      }
      
      // Only render game if in playing or paused state
      if (gameStateRef.current !== 'playing' && gameStateRef.current !== 'paused') return;
      
      const camera = gameWorldState.current.camera;
      
      // Debug: Check if gameMap is properly initialized
      if (!gameMap || !gameMap.areas) {
        console.error('Game map not initialized:', gameMap);
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px monospace';
        ctx.fillText('Map Loading Error - Check Console', 50, 50);
        return;
      }
      
      const currentArea = gameMap.areas[gameMap.currentArea];
      
      if (!currentArea) {
        console.error('Current area not found:', gameMap.currentArea, 'Available areas:', Object.keys(gameMap.areas));
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px monospace';
        ctx.fillText(`Area "${gameMap.currentArea}" not found`, 50, 50);
        return;
      }
    
      // Dynamic sky color based on time of day
      let baseSkyColor = '#87CEEB'; // Default sky blue for Mother World
    
    // Override with day/night cycle color if more dramatic
    ctx.fillStyle = skyColor !== '#87CEEB' ? skyColor : baseSkyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Subtle global darkening at night (no sun/moon icons)
    if (isNight) {
      const darkness = Math.max(0.35, 0.8 - dayNightCycle.current.getLightLevel() * 0.8);
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Save context and apply zoom
    ctx.save();
    const zoomScale = gameWorldState.current.zoomScale || 1.5;
    ctx.scale(zoomScale, zoomScale);
    // Snap to integer pixels to avoid seam/grid artifacts
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));
    // Disable smoothing for crisp pixels
    if (typeof ctx.imageSmoothingEnabled === 'boolean') ctx.imageSmoothingEnabled = false;
    
    // Draw SNES-style tiles with proper layering and effects for Mother World
    const tileSize = 8; // SNES-style 8x8 tiles
    // Reduce overdraw margins for performance (-2/+2 instead of -5/+5)
    const startRow = Math.max(0, Math.floor(camera.y / (tileSize * zoomScale)) - 2);
    const endRow = Math.min(gameMap.height, Math.floor((camera.y + canvas.height) / (tileSize * zoomScale)) + 2);
    const startCol = Math.max(0, Math.floor(camera.x / (tileSize * zoomScale)) - 2);
    const endCol = Math.min(gameMap.width, Math.floor((camera.x + canvas.width) / (tileSize * zoomScale)) + 2);
    
    const assets = gameWorldState.current.assets || {};
    const tilesetImg = assets.tileset;
    // Heuristic tileset grid size detection (prefers 32px, then 16px)
    const tilesetTileSize = (() => {
      if (!tilesetImg) return 32;
      if (tilesetImg.width % 32 === 0 && tilesetImg.height % 32 === 0) return 32;
      if (tilesetImg.width % 16 === 0 && tilesetImg.height % 16 === 0) return 16;
      if (tilesetImg.width % 24 === 0 && tilesetImg.height % 24 === 0) return 24;
      return 32;
    })();

    // Colorful mapping with simple variants to reduce repetition
    const tilesetVariants = {
      6: [[0,0],[1,1],[2,1]],           // deep water variants
      7: [[1,0],[2,0],[3,0]],           // shallow water variants
      2: [[2,0],[2,1],[2,2],[3,2]],     // sand variants
      1: [[3,0],[3,1],[4,1]],           // dirt/path variants
      3: [[4,0],[4,1],[5,1],[5,0]],     // grass variants
      5: [[5,0],[6,1]],                 // rock/stone floor
      25:[[6,0],[6,1],[7,1]],           // mountain variants
      26:[[1,0],[2,0],[3,0]],           // river use shallow water variants
      27:[[4,0],[5,0],[4,1]],           // forest base -> grass family
      28:[[3,1],[4,2],[5,2]]            // village/cobble/road
    };

    const drawTilesetCell = (img, col, row, dx, dy, size) => {
      const ts = tilesetTileSize;
      const sx = col * ts;
      const sy = row * ts;
      if (sx + ts <= img.width && sy + ts <= img.height) {
        ctx.drawImage(img, sx, sy, ts, ts, dx, dy, size, size);
      }
    };

    const tileColor = (t) => {
      switch (t) {
        case 6: return '#0f2a4d';
        case 7: return '#2f74c0';
        case 2: return '#e8c27a';
        case 1: return '#8b5e3b';
        case 3: return '#3a8e41';
        case 27: return '#1f6b2a';
        case 5: return '#6b6b6b';
        case 25: return '#8a7f70';
        case 26: return '#2b80ff';
        case 28: return '#a56b2b';
        default: return '#000000';
      }
    };
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        const mw = motherWorldRef.current;
        const tileType = mw?.tiles?.[row]?.[col] ?? 0;
        
        // Prefer colorful tileset when available; fall back to solid colors/assets
        const variantList = tilesetImg ? tilesetVariants[tileType] : null;
        if (tilesetImg && variantList && variantList.length) {
          const h = (((row * 73856093) ^ (col * 19349663)) >>> 0) % variantList.length;
          const [cv, rv] = variantList[h];
          drawTilesetCell(tilesetImg, cv, rv, x, y, tileSize);
        } else if ((tileType === 3 || tileType === 4) && assets.ground) {
          ctx.drawImage(assets.ground, x, y, tileSize, tileSize);
        } else {
          // Clean fallback fills for water to reduce noise
          if (tileType === 6) { ctx.fillStyle = '#14406f'; ctx.fillRect(x, y, tileSize, tileSize); }
          else if (tileType === 7 || tileType === 26) { ctx.fillStyle = '#4ea4e5'; ctx.fillRect(x, y, tileSize, tileSize); }
          else { ctx.fillStyle = tileColor(tileType); ctx.fillRect(x, y, tileSize, tileSize); }
        }

        // Overlays to add richness
        if (tileType === 27 && assets.tree) {
          // forest: sprinkle trees and occasional bushes
          if ((((row * 73856093) ^ (col * 19349663)) & 7) !== 0) {
            ctx.drawImage(assets.tree, x - 2, y - 10, tileSize + 4, tileSize + 12);
          }
          if (assets.bush && (((row * 2654435761 + col) >>> 0) % 11 === 0)) {
            ctx.drawImage(assets.bush, x, y, tileSize, tileSize);
          }
        } else if (tileType === 25 && assets.rock) {
          // mountain: rocks
          if (((row * 83492791) ^ (col * 2971215073)) & 1) {
            ctx.drawImage(assets.rock, x, y, tileSize, tileSize);
          }
        } else if (tileType === 28 && assets.house) {
          // village: occasional house footprint
          if (!((row + col) % 7)) {
            ctx.drawImage(assets.house, x - 4, y - 12, tileSize + 8, tileSize + 16);
          }
          if (assets.well && (((row + 3 * col) >>> 0) % 19 === 0)) {
            ctx.drawImage(assets.well, x, y - 6, tileSize, tileSize + 6);
          }
          if (assets.barrel && (((5 * row + col) >>> 0) % 23 === 0)) {
            ctx.drawImage(assets.barrel, x, y, tileSize, tileSize);
          }
        } else if (tileType === 3) {
          // grass: occasional decor to reduce flat look
          if (assets.bush && (((row + col * 7) >>> 0) % 31 === 0)) {
            ctx.drawImage(assets.bush, x, y, tileSize, tileSize);
          } else if (assets.stump && (((row * 13 + col) >>> 0) % 37) === 0) {
            ctx.drawImage(assets.stump, x, y, tileSize, tileSize);
          }
        } else if (tileType === 15 && assets.tree) {
          // explicit tree trunk tiles
          ctx.drawImage(assets.tree, x - 2, y - 10, tileSize + 4, tileSize + 12);
        } else if (tileType === 5 && assets.rock) {
          ctx.drawImage(assets.rock, x, y, tileSize, tileSize);
        }
      }
    }

    // Draw props (bridges, houses, bushes, rocks, trees)
    if (currentArea.props && currentArea.props.length) {
      currentArea.props.forEach(p => {
        const img = assets[p.type];
        if (img) {
          const w = (p.type === 'treeMedium') ? 24 : (p.type === 'bridgeH') ? 28 : 16;
          const h = (p.type === 'treeMedium') ? 28 : (p.type === 'bridgeH') ? 8 : 16;
          const dx = p.type.startsWith('tree') ? -4 : 0;
          const dy = p.type.startsWith('tree') ? -12 : 0;
          ctx.drawImage(img, p.x + dx, p.y + dy, w, h);
        }
      });
    }
    
    // Draw NPCs using assets if available. Many NPC sheets contain multiple frames;
    // crop the top-left frame to avoid drawing the entire spritesheet.
    currentArea.npcs?.forEach(npc => {
      const npcImg = assets['villager'] || assets['npc'];
      if (npcImg && npcImg.width && npcImg.height) {
        // Heuristically infer grid to crop one frame instead of scaling the whole sheet
        const ratio = npcImg.width / npcImg.height;
        let cols = 1, rows = 1;
        if (ratio >= 1.5) { cols = Math.min(8, Math.max(2, Math.round(ratio))); rows = 1; }
        else if ((1/ratio) >= 1.5) { rows = Math.min(8, Math.max(2, Math.round(1/ratio))); cols = 1; }
        const frameW = Math.floor(npcImg.width / cols);
        const frameH = Math.floor(npcImg.height / rows);
        const destW = 24; const destH = 32;
        ctx.drawImage(npcImg, 0, 0, frameW, frameH, npc.x - Math.floor(destW/2), npc.y - destH, destW, destH);
      } else {
      ctx.fillStyle = npc.color || '#8B4513';
        ctx.fillRect(npc.x - 12, npc.y - 32, 24, 32);
      }
      // Show label only when close to player to reduce clutter
      const player = gameWorldState.current.player;
      const dx = (npc.x - player.x);
      const dy = (npc.y - player.y);
      if ((dx*dx + dy*dy) < (120*120)) {
        const label = npc.type || npc.village || '';
        if (label) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
          ctx.fillText(label, npc.x - 12, npc.y - 32);
        }
      }
    });
    
    // Draw treasures
    currentArea.treasures?.forEach(treasure => {
      if (!treasure.collected) {
        ctx.fillStyle = '#E84142'; // AVAX red color for all treasures
        ctx.fillRect(treasure.x, treasure.y, 20, 20);
        
        // Draw sparkle effect
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(treasure.x + 6, treasure.y + 6, 3, 3);
        ctx.fillRect(treasure.x + 12, treasure.y + 12, 3, 3);
        
        // Optional label using type
        const tLabel = treasure.type ? String(treasure.type) : '';
        if (tLabel) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
          ctx.fillText(tLabel, treasure.x - 5, treasure.y - 5);
        }
      }
    });
    
    // Draw enemies by type and state
    gameWorldState.current.enemies.forEach(enemy => {
      let enemyImg = null;
      if (enemy.type === 'boar') enemyImg = assets['boar'] || assets['enemy'];
      else if (enemy.type === 'bee') enemyImg = assets['bee'] || assets['enemy'];
      else if (enemy.type === 'snail') enemyImg = assets['snail'] || assets['enemy'];
      else enemyImg = assets['enemy'];
      
      // Difficulty color tint
      if (enemy.state === 'hit') {
        ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      
      if (enemyImg) {
        // Flip sprite based on facing direction
        ctx.save();
        if (!enemy.facingRight) {
          ctx.scale(-1, 1);
          ctx.drawImage(enemyImg, -enemy.x - enemy.width, enemy.y, enemy.width, enemy.height);
        } else {
          ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
        }
        ctx.restore();
      } else {
        // Fallback colors by type and difficulty
        let baseColor;
        if (enemy.type === 'boar') baseColor = '#8B4513';
        else if (enemy.type === 'bee') baseColor = '#FFD700';
        else if (enemy.type === 'snail') baseColor = '#90EE90';
        else baseColor = '#E74C3C';
        
        // Difficulty border
        if (enemy.difficulty === 'hard') {
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(enemy.x - 2, enemy.y - 2, enemy.width + 4, enemy.height + 4);
        } else if (enemy.difficulty === 'medium') {
          ctx.fillStyle = '#FFA500';
          ctx.fillRect(enemy.x - 1, enemy.y - 1, enemy.width + 2, enemy.height + 2);
        }
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      
      // Health bar
      const healthPercent = enemy.health / enemy.maxHealth;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
      ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
      ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * healthPercent, 4);
    });
    
    // Weather overlays disabled unless explicitly enabled (remove falling dots effect)
    if (gameWorldState.current.showWeatherEffects) {
      const areaPx = canvas.width * canvas.height;
      if (seasonUI.season === Season.Rain) {
        ctx.fillStyle = 'rgba(100,100,255,0.12)';
        const rainCount = Math.max(20, Math.floor(areaPx / 3200));
        for (let i = 0; i < rainCount; i++) {
          const rx = (Math.random() * canvas.width) + camera.x;
          const ry = (Math.random() * canvas.height) + camera.y;
          ctx.fillRect(rx, ry, 1, 6);
        }
      } else if (seasonUI.season === Season.Winter) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        const snowCount = Math.max(10, Math.floor(areaPx / 6400));
        for (let i = 0; i < snowCount; i++) {
          const rx = (Math.random() * canvas.width) + camera.x;
          const ry = (Math.random() * canvas.height) + camera.y;
          ctx.fillRect(rx, ry, 2, 2);
        }
      }
    }

    // Hazards (lightning flashes)
    hazards.forEach(h => {
      if (h.type === 'lightning') {
        const alpha = Math.max(0, h.ttl);
        ctx.fillStyle = `rgba(255,255,200,${alpha})`;
        ctx.fillRect(h.x - 2, h.y - 100, 4, 120);
      }
    });

    // Draw knight with proper sprite sheet animations
    const player = gameWorldState.current.player;
    const knightAssets = assets.knight || {};
    
    // Debug: Log available knight assets and force visibility
    if (!window.knightAssetsLogged) {
      console.log('🏰 Available Knight Assets:', Object.keys(knightAssets));
      Object.entries(knightAssets).forEach(([key, img]) => {
        if (img) console.log(`  ${key}: ${img.width}x${img.height}`);
        else console.log(`  ${key}: FAILED TO LOAD`);
      });
      console.log('🎮 Player position:', player.x, player.y);
      console.log('📷 Camera position:', gameWorldState.current.camera.x, gameWorldState.current.camera.y);
      window.knightAssetsLogged = true;
    }
    
    let spriteSheet = null;
    let frameCount = 10; // default frame count
    let currentFrame = player.animFrame;
    
    // Select appropriate sprite sheet based on state
    if (player.state === 'attack' && knightAssets.attack) {
      spriteSheet = knightAssets.attack;
      frameCount = 6; // Attack animation frames
      currentFrame = Math.floor((30 - player.attackCooldown) / 5) % frameCount;
    } else if (player.state === 'attack2' && knightAssets.attack2) {
      spriteSheet = knightAssets.attack2;
      frameCount = 6;
      currentFrame = Math.floor((35 - player.attackCooldown) / 6) % frameCount;
    } else if (player.state === 'attackCombo' && knightAssets.attackCombo) {
      spriteSheet = knightAssets.attackCombo;
      frameCount = 10;
      currentFrame = Math.floor((45 - player.attackCooldown) / 4.5) % frameCount;
    } else if ((player.state === 'defend' || player.isEating) && knightAssets.defend) {
      spriteSheet = knightAssets.defend;
      frameCount = 4;
      currentFrame = player.isEating ? Math.floor(player.eatTimer / 15) % frameCount : 0;
    } else if (player.state === 'roll' && knightAssets.roll) {
      spriteSheet = knightAssets.roll;
      frameCount = 7;
      currentFrame = Math.floor((20 - player.invulnerable) / 3) % frameCount;
    } else if (player.state === 'hit' && knightAssets.hit) {
      spriteSheet = knightAssets.hit;
      frameCount = 3;
      currentFrame = Math.floor((30 - player.invulnerable) / 10) % frameCount;
    } else if (player.state === 'death' && knightAssets.death) {
      spriteSheet = knightAssets.death;
      frameCount = 10;
      currentFrame = Math.min(9, Math.floor(player.animFrame));
    } else if (player.state === 'run' && knightAssets.run) {
      spriteSheet = knightAssets.run;
      frameCount = 8;
    } else if (knightAssets.idle) {
      spriteSheet = knightAssets.idle;
      frameCount = 10;
    }
    
    // Remove excessive logging
    // console.log('🎯 Drawing knight at:', player.x, player.y, 'State:', player.state, 'Frame:', currentFrame);
    
    if (spriteSheet && spriteSheet.width > 0) {
      // Each frame is 120x80 pixels in the sprite sheet
      const frameWidth = 120;
      const frameHeight = 80;
      const framesPerRow = 10;
      
      const row = Math.floor(currentFrame / framesPerRow);
      const col = currentFrame % framesPerRow;
      const srcX = col * frameWidth;
      const srcY = row * frameHeight;
      
      // Draw knight sprite (proper size)
      const drawWidth = 64;
      const drawHeight = 64;
      const drawX = player.x - 16;
      const drawY = player.y - 32;
      
      ctx.save();
      
      // Add invulnerability flashing
      if (player.invulnerable > 0 && Math.floor(Date.now() / 100) % 2) {
        ctx.globalAlpha = 0.5;
      }
      
      // Remove debug border for clean look
      // ctx.strokeStyle = '#00FF00';
      // ctx.lineWidth = 3;
      // ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
      
      if (!player.facingRight) {
        ctx.scale(-1, 1);
        ctx.drawImage(
          spriteSheet,
          srcX, srcY, frameWidth, frameHeight,
          -drawX - drawWidth, drawY, drawWidth, drawHeight
        );
      } else {
        ctx.drawImage(
          spriteSheet,
          srcX, srcY, frameWidth, frameHeight,
          drawX, drawY, drawWidth, drawHeight
        );
      }
    ctx.restore();
      
      // Remove debug text for clean look
      // ctx.fillStyle = '#FFFFFF';
      // ctx.font = '16px Arial';
      // ctx.fillText(`${player.state} F:${currentFrame}`, player.x - 30, player.y - 70);
    } else {
      // Enhanced fallback knight representation (LARGER)
      console.warn('🚨 Knight sprite not loaded, using fallback');
      
      // Knight body (normal size)
      ctx.fillStyle = player.invulnerable > 0 ? '#FF6B6B' : '#4A4A4A';
      ctx.fillRect(player.x - 16, player.y - 16, 48, 48);
      
      // Knight helmet (normal size)
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(player.x - 8, player.y - 32, 32, 20);
      
      // Knight sword (if attacking) - normal size
      if (player.state.includes('attack')) {
    ctx.fillStyle = '#FFD700';
        const swordX = player.facingRight ? player.x + 32 : player.x - 16;
        ctx.fillRect(swordX, player.y - 8, 8, 32);
      }
      
      // Debug text - normal size
    ctx.fillStyle = '#FF0000';
      ctx.font = '12px Arial';
      // Hide fallback debug labels in production
    }
    
    // Player health bar
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(player.x - 8, player.y - 20, 48, 6);
    ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillRect(player.x - 8, player.y - 20, 48 * healthPercent, 6);
    
    // Draw buildings before restoring context (so they're affected by zoom)
    if (infrastructureSystem.current) {
      infrastructureSystem.current.buildings.forEach(building => {
        const buildingType = infrastructureSystem.current.buildingTypes[building.type];
        
        // Building base
        ctx.fillStyle = building.completed ? '#8B4513' : '#654321';
        ctx.fillRect(building.x - 20, building.y - 20, 40, 40);
        
        // Building icon/type indicator
        ctx.fillStyle = building.completed ? '#FFD700' : '#FFA500';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        const icons = {
          house: '🏠', blacksmith: '⚒️', farm: '🌾', 
          mine: '⛏️', tower: '🗼', portal: '🌀'
        };
        ctx.fillText(icons[building.type] || '🏗️', building.x, building.y + 5);
        
        // Construction progress bar
        if (!building.completed) {
          const progress = infrastructureSystem.current.getBuildingProgress(building.id);
          if (progress) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(building.x - 25, building.y - 35, 50, 8);
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(building.x - 25, building.y - 35, (50 * progress.progress) / 100, 8);
            
            // Progress text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Arial';
            ctx.fillText(`${Math.floor(progress.progress)}%`, building.x, building.y - 40);
          }
        }
        
        // Building level indicator
        if (building.completed && building.level > 1) {
          ctx.fillStyle = '#FFD700';
          ctx.font = '12px Arial';
          ctx.fillText(`Lv.${building.level}`, building.x, building.y + 25);
        }
        
        ctx.textAlign = 'start';
      });
    }
    
    // Restore context (removes zoom and translation)
    ctx.restore();
    
    // UI elements are drawn in screen space (not zoomed)
    
      // Draw UI
      drawUI(ctx);
    } catch (error) {
      console.error('Render error:', error);
      // Fallback rendering
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.fillText('Render Error - Please refresh', 50, 50);
    }
  };

  // Minimal HUD with non-overlapping rows
  const drawUI = (ctx) => {
    const canvas = canvasRef.current;
    const area = gameMap.areas[gameMap.currentArea];
    const row1Y = 18;
    const row2Y = 34;
    // Background bar
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, canvas.width, 42);
    // Row 1: area + stats + points
    ctx.textAlign = 'start';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${area?.name || 'World'}`, 10, row1Y);
    ctx.fillStyle = '#FF5555';
    ctx.fillText(`LIFE ${String((hud.life*100)|0).padStart(3,' ')}%`, 160, row1Y);
    ctx.fillStyle = '#A0FF64';
    ctx.fillText(`HUNGER ${String(Math.round(hud.hunger*100)).padStart(3,' ')}%`, 300, row1Y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`PTS ${playerStats.points.toFixed(4)}`, canvas.width - 10, row1Y);
    // Row 2: controls
    ctx.textAlign = 'start';
    ctx.fillStyle = '#9ad1ff';
      ctx.font = 'bold 11px monospace';
    ctx.fillText('WASD Move | J Attack | K Defend | L Roll | E Talk | F Eat | I Inventory | B Build', 10, row2Y);
  };

  // Game loop
  // Frame throttle to reduce CPU/GPU load
  const targetFps = 50;
  const frameIntervalMs = 1000 / targetFps;
  const lastFrameTimeRef = useRef(0);

  const gameLoop = () => {
    // Tick core systems (assume ~60fps)
    const nowMs = performance.now();
    if (nowMs - lastFrameTimeRef.current < frameIntervalMs) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    lastFrameTimeRef.current = nowMs;
    const dt = 1 / targetFps;
    minutesPlayedRef.current += dt / 60;
    seasonSystemRef.current.tick(dt);
    energySystemRef.current.tick(dt, seasonSystemRef.current.modifiers(), false);
    const s = seasonSystemRef.current.get();
    const now = performance.now();
    if (now - lastUIUpdateRef.current > 50) {
      lastUIUpdateRef.current = now;
      setSeasonUI({ season: s, progress: seasonSystemRef.current.progress() });
      const energy = energySystemRef.current.state();
      setHud(prev => ({ ...prev, hunger: energy.hunger, life: energy.life, xp: karmaSystemRef.current.get().xp, karma: karmaSystemRef.current.get().karma }));
      setHint(guideHint({
        energy,
        season: s,
        inShelter: false,
        thunderNearby: s === Season.Rain,
        nearbyFood: false
      }));
    }
    // Season ambience change
    if (prevSeasonRef.current !== s) {
      try { audioMgr.current.ambienceSeason(s); } catch (_) {}
      prevSeasonRef.current = s;
    }

    // Challenger hazards
    const decision = challengerRef.current.step(dt, { season: s, player: gameWorldState.current.player, minutesPlayed: minutesPlayedRef.current });
    if (decision) {
      setHazards((list) => [...list, { ...decision, ttl: 1.0 }]);
      if (decision.type === 'lightning') { try { audioMgr.current.lightning(); } catch (_) {} }
    }

    // Update hazards ttl
    setHazards((list) => list.map(h => ({ ...h, ttl: h.ttl - dt })).filter(h => h.ttl > 0));

    // Update day/night cycle - only when not paused
    if (gameState === 'playing') {
      const transition = dayNightCycle.current.update();
      setTimeOfDay(dayNightCycle.current.getTimeString());
      setIsNight(dayNightCycle.current.isNight);
      setSkyColor(dayNightCycle.current.getSkyColor());
      
      // Handle day/night transitions
      if (transition === 'nightfall') {
        setModalContent('🌙 Night falls... Enemies grow stronger and more numerous!');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
        playSound('ambient', 200, 0.3);
        // Switch to night music
        musicManager.current.playTrack('gameplay_night');
        // Add night ambient sounds
        musicManager.current.playAmbient('night_crickets');
        musicManager.current.playAmbient('wind');
      } else if (transition === 'dawn') {
        setModalContent('🌅 Dawn breaks! The danger subsides with the morning light.');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
        playSound('ambient', 400, 0.3);
        // Switch back to day music
        musicManager.current.playTrack('gameplay_day');
        // Add forest ambient sounds
        musicManager.current.playAmbient('forest');
      }
    }
    
    // Only update game logic when playing (not paused)
    if (gameStateRef.current === 'playing') {
    updatePlayer();
    updateEnemies();
    updateTreasures();
    }
    
    // Always render (to show pause screen)
    render();
    rafRef.current = requestAnimationFrame(gameLoop);
  };

  // Initialize game with error handling
  const initGame = async () => {
    try {
      initAudio();
      initTreasures();
      initEnemies();
      
      // Initialize music manager
      await musicManager.current.initialize();
      console.log('🎵 Music system initialized');
      
      const assets = await loadGameAssets();
      gameWorldState.current.assets = assets;
      // Fetch external mother world JSON (enforced)
      try {
        const res = await fetch('/mother_world.json');
        const json = await res.json();
        if (json && Array.isArray(json.tiles) && json.tiles.length) {
          motherWorldRef.current = json;
        } else if (json && json.spec) {
          motherWorldRef.current = buildWorldFromSpec(json.spec);
        } else {
          throw new Error('mother_world.json missing tiles/spec');
        }
        console.log('🌍 Mother World ready', { size: motherWorldRef.current.width + 'x' + motherWorldRef.current.height });
      } catch (e) {
        console.error('Failed to load mother_world.json:', e);
        setModalContent('Map load failed: place a valid mother_world.json in public/ and reload.');
        setShowModal(true);
        return; // Abort init until a valid map is provided
      }
      // place player at spawn of starting area
      const spawn = motherWorldRef.current?.spawn || { x: 512, y: 600 };
      if (spawn) {
        gameWorldState.current.player.x = spawn.x;
        gameWorldState.current.player.y = spawn.y;
      }
      
      // Start title music after a brief delay; also retry once if AudioContext was suspended
      const startTitle = async () => {
        if (!musicManager.current || !musicManager.current.initialized) return;
        try {
          await musicManager.current.resume();
          musicManager.current.playTrack('title');
          console.log('🎵 Title music started');
        } catch (e) {
          console.warn('Title music play deferred, will retry on first key/click');
        }
      };
      setTimeout(startTitle, 800);
      
      gameLoop();
    } catch (error) {
      console.error('Game initialization error:', error);
      setModalContent('Game initialization failed. Please refresh the page.');
      setShowModal(true);
    }
  };

  // Event handlers
  const handleKeyDown = (e) => {
    const key = e.key;
    const code = e.code;
    gameWorldState.current.keys[key] = true;
    gameWorldState.current.keys[code] = true;
    if (typeof key === 'string') gameWorldState.current.keys[key.toLowerCase()] = true;
    const isGameKey = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','A','d','D','w','W','s','S','e','E','f','F','r','R','Enter','Escape','j','J','k','K','l','L','i','I','b','B','m','M'].includes(e.key);
    if (isGameKey) e.preventDefault();
    
    // Ensure audio context is resumed on first user interaction
    if (musicManager.current && musicManager.current.audioContext) {
      musicManager.current.resume();
      if (gameState === 'title' && !musicManager.current.isPlaying) {
        musicManager.current.playTrack('title');
      }
    }
    
    // Debug: Log key presses to console (remove in production)
    console.log(`🎮 Key pressed: ${e.key}, Code: ${e.code}, Game State: ${gameState}`);
    
    // Handle refresh key
    if (e.key === 'r' || e.key === 'R') {
      forceRefreshUI();
      console.log('UI refreshed manually');
    }
    
    // Combat controls
    if (e.key === 'j' || e.key === 'J') {
      // Attack with combo system
      const player = gameWorldState.current.player;
      const currentTime = Date.now();
      
      if (player.attackCooldown <= 0 && player.state !== 'death' && !player.isEating) {
        // Combo system: if attacked within 1 second, do combo
        if (currentTime - player.lastAttackTime < 1000 && player.attackComboCount < 3) {
          player.attackComboCount++;
          if (player.attackComboCount === 2) {
            player.state = 'attack2';
            player.attackCooldown = 35;
          } else if (player.attackComboCount === 3) {
            player.state = 'attackCombo';
            player.attackCooldown = 45;
          }
        } else {
          // First attack
          player.state = 'attack';
          player.attackCooldown = 30;
          player.attackComboCount = 1;
        }
        
        player.lastAttackTime = currentTime;
        musicManager.current.playSFX('attack', 400, 0.2);
      }
    }
    
    if (e.key === 'k' || e.key === 'K') {
      // Defend/Crouch
      const player = gameWorldState.current.player;
      if (player.defendCooldown <= 0 && player.state !== 'death' && !player.isEating) {
        player.state = 'defend';
        player.defendCooldown = 30;
        player.isDefending = true;
        player.invulnerable = 15; // Brief invulnerability frames
        
        // Play defend sound effect
        musicManager.current.playSFX('defend', 250, 0.3);
        
        setTimeout(() => {
          if (gameWorldState.current.player) {
            gameWorldState.current.player.isDefending = false;
          }
        }, 800);
      }
    }
    
    if (e.key === 'l' || e.key === 'L') {
      // Roll/Dash
      const player = gameWorldState.current.player;
      if (player.state === 'idle' || player.state === 'run') {
        player.state = 'roll';
        player.invulnerable = 20; // Brief invulnerability during roll
        musicManager.current.playSFX('attack', 350, 0.3);
      }
    }
    
    // Enhanced NPC interaction with dialogue trees
    if (e.key === 'e' || e.key === 'E') {
      const player = gameWorldState.current.player;
      const currentArea = gameMap.areas[gameMap.currentArea];
      
      (currentArea?.npcs || []).forEach(npc => {
        if (checkCollision(player, { x: npc.x, y: npc.y, width: 24, height: 32 })) {
          playSound('talk', 500, 0.2);
          
          // Enhanced dialogue with political themes
          const dialogueIndex = Math.floor(Math.random() * npc.dialogueTree.length);
          const selectedDialogue = npc.dialogueTree[dialogueIndex];
          
          setModalContent(`${npc.name} (${npc.politicalAffiliation}): "${selectedDialogue}"`);
          setShowModal(true);
          setTimeout(() => setShowModal(false), 5000);
          
          // Give bonus points for political interactions
          setPlayerStats(prev => ({
            ...prev,
            points: prev.points + 50,
            streak: prev.streak + 1
          }));
        }
      });
    }
    
    // Eat food shortcut with animation
    if (e.key === 'f' || e.key === 'F') {
      const player = gameWorldState.current.player;
      if (player.health < player.maxHealth && !player.isEating && player.state === 'idle') {
        player.isEating = true;
        player.eatTimer = 60; // 1 second at 60fps
        player.state = 'defend'; // Use crouch animation for eating
        playSound('heal', 600, 0.3);
      }
    }
    
    // Inventory controls
    if (e.key === 'i' || e.key === 'I') {
      setShowInventory(!showInventory);
    }
    
    // Building menu
    if (e.key === 'b' || e.key === 'B') {
      setShowBuildMenu(!showBuildMenu);
    }
    
    // Handle Escape key for pause/navigation
    if (e.key === 'Escape') {
      if (gameState === 'playing') {
        setGameState('paused');
        console.log('Game paused');
      } else if (gameState === 'paused') {
        setGameState('playing');
        console.log('Game resumed');
      } else {
        setBuildingMode(false);
        setSelectedBuildingType(null);
      }
    }
    
    // Quit to menu when paused
    if (e.key === 'q' || e.key === 'Q') {
      if (gameState === 'paused') {
        setGameState('title');
        screenManager.current.currentScreen = 'title';
        musicManager.current.playTrack('title');
        console.log('Quit to main menu');
      }
    }
    
    // Restart game when paused
    if (e.key === 'r' || e.key === 'R') {
      if (gameState === 'paused') {
        setGameState('playing');
        resetGame();
        console.log('Game restarted');
      }
    }
    
    // Music controls
    if (e.key === 'm' || e.key === 'M') {
      // Toggle music
      if (musicManager.current.isPlaying) {
        musicManager.current.stopCurrentTrack();
      } else {
        const track = gameState === 'title' ? 'title' : 
                     gameState === 'playing' ? (isNight ? 'gameplay_night' : 'gameplay_day') : 
                     'title';
        musicManager.current.playTrack(track);
      }
    }
    
    if (e.key === '=' || e.key === '+') {
      // Increase volume
      const currentVol = musicManager.current.musicVolume;
      musicManager.current.setMusicVolume(Math.min(1, currentVol + 0.1));
    }
    
    if (e.key === '-' || e.key === '_') {
      // Decrease volume
      const currentVol = musicManager.current.musicVolume;
      musicManager.current.setMusicVolume(Math.max(0, currentVol - 0.1));
    }
    
    // Handle screen manager input using ref to avoid stale state
    if (gameStateRef.current !== 'playing') {
      const action = screenManager.current.handleInput(e.key);
      if (action) {
        handleScreenAction(action);
        // After consuming a title/help/scoreboard action, swallow key and stop further handling
    e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    
  };

  const handleKeyUp = (e) => {
    const key = e.key;
    const code = e.code;
    gameWorldState.current.keys[key] = false;
    gameWorldState.current.keys[code] = false;
    if (typeof key === 'string') gameWorldState.current.keys[key.toLowerCase()] = false;
    const isGameKey = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','A','d','D','w','W','s','S','e','E','f','F','r','R'].includes(e.key);
    if (isGameKey) e.preventDefault();
  };

  // Enhanced Ethers.js MetaMask integration with Avalanche L1 - REMOVED DUPLICATE
  const connectWalletLegacy = async () => {
    try {
      // Check if we're running on localhost or file protocol
      if (window.location.protocol === 'file:') {
        setModalContent('Please run this game from a web server (localhost) for wallet connection to work properly.');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
        return;
      }

      // Check if MetaMask is available
      if (typeof window.ethereum !== 'undefined') {
        const provider = window.ethereum;
        
        // Check if MetaMask is properly initialized
        if (!provider.isMetaMask) {
          setModalContent('Please use MetaMask wallet. Other wallets are not supported.');
          setShowModal(true);
          setTimeout(() => setShowModal(false), 3000);
          return;
        }
        
        // First, try to get accounts (this will work if already connected)
        let accounts = [];
        try {
          accounts = await provider.request({ method: 'eth_accounts' });
        } catch (error) {
          console.log('No existing connection, will request new connection');
        }
        
        // If no accounts, request connection
        if (accounts.length === 0) {
          try {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          } catch (error) {
            if (error.code === 4001) {
              setModalContent('Connection rejected. Please try again and approve the connection in MetaMask.');
              setShowModal(true);
              setTimeout(() => setShowModal(false), 4000);
              return;
            }
            throw error;
          }
        }
        
        if (accounts.length === 0) {
          setModalContent('No accounts found. Please unlock MetaMask and try again.');
          setShowModal(true);
          setTimeout(() => setShowModal(false), 3000);
          return;
        }
        
        // Support both Hardhat (31337) and Avalanche Local (1337)
        const CHAINS = [
          { id: '0x7A69', name: 'Hardhat Local', rpc: 'http://127.0.0.1:8545', currency: { name: 'ETH', symbol: 'ETH', decimals: 18 } },
          { id: '0x539',  name: 'Avalanche Local', rpc: 'http://127.0.0.1:9650/ext/bc/C/rpc', currency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 } },
        ];

        const trySwitchOrAdd = async (chain) => {
          try {
            await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chain.id }] });
            return true;
          } catch (err) {
            if (err.code === 4902) {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{ chainId: chain.id, chainName: chain.name, rpcUrls: [chain.rpc], nativeCurrency: chain.currency }],
              });
              return true;
            }
            return false;
          }
        };

        // If already on a supported chain, keep it; else prefer Hardhat, then Avalanche Local
        const currentChain = await provider.request({ method: 'eth_chainId' }).catch(() => null);
        const isSupported = CHAINS.some(c => c.id === currentChain);
        if (!isSupported) {
          const okHardhat = await trySwitchOrAdd(CHAINS[0]);
          if (!okHardhat) {
            const okAvalanche = await trySwitchOrAdd(CHAINS[1]);
            if (!okAvalanche) {
              setModalContent('Please add Hardhat (31337) or Avalanche Local (1337) network in MetaMask.');
              setShowModal(true);
              setTimeout(() => setShowModal(false), 5000);
              return;
            }
          }
        }
        
        // Connection successful
        setIsConnected(true);
        playSound('connect', 440, 0.3);
        
        // Initialize contract service
        console.log('Initializing contract service...');
        try {
          const initialized = await contractService.initialize();
          console.log('Contract service initialized:', initialized);
          
          if (!initialized) {
            throw new Error('Contract service failed to initialize');
          }
        } catch (error) {
          console.error('Contract service initialization error:', error);
          setModalContent(`Failed to initialize contract service: ${error.message}`);
          setShowModal(true);
          setTimeout(() => setShowModal(false), 5000);
          return;
        }
        
        // Get account balance using contract service
        const balance = await contractService.getAccountBalance(accounts[0]);
        
        setModalContent(`✅ Connected to Avalanche Local Network!\nAddress: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}\nBalance: ${balance} AVAX\n\n🎮 Ready for local blockchain transactions!`);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 5000);
        
      } else {
        setModalContent('MetaMask not detected! Please install MetaMask from https://metamask.io/');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
        return;
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setModalContent(`Failed to connect wallet: ${error.message}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 5000);
    }
  };

  // Real-time leaderboard synchronization
  const syncLeaderboardWithBlockchain = async () => {
    if (!isConnected || !contractService.isInitialized()) return;
    
    try {
      const address = await contractService.getCurrentAddress();
      const balance = await contractService.getAccountBalance(address);
      const nftBalance = await contractService.getNFTBalance(address);
      let stakerInfo = null;
      
      try {
        stakerInfo = await contractService.getStakerInfo(address);
      } catch (error) {
        console.log('No staking info available');
      }

      const stakedAmount = stakerInfo ? parseFloat(stakerInfo.stakedAmount) : 0;
      
      // Update leaderboard with current blockchain data
      setLeaderboard(prev => {
        const newLeaderboard = [...prev];
        
        // Find existing user entry
        const userAddress = address.slice(0, 6) + '...' + address.slice(-4);
        const existingIndex = newLeaderboard.findIndex(entry => 
          entry.address === userAddress
        );

        if (existingIndex !== -1) {
          // Update existing entry with current blockchain data
          newLeaderboard[existingIndex].staked = stakedAmount;
          newLeaderboard[existingIndex].nfts = nftBalance;
          // Keep current points (they're calculated in real-time)
        } else {
          // Add new entry
          newLeaderboard.push({
            address: userAddress,
            avaxPoints: playerStats.points,
            staked: stakedAmount,
            nfts: nftBalance,
            rank: 0
          });
        }

        // Sort by AVAX points and update ranks
        newLeaderboard.sort((a, b) => b.avaxPoints - a.avaxPoints);
        newLeaderboard.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        return newLeaderboard.slice(0, 10);
      });
    } catch (error) {
      console.error('Error syncing leaderboard:', error);
    }
  };
  // Update leaderboard with user AVAX points (enhanced for real-time)
  const updateLeaderboard = async (userAddress, avaxPointsToAdd) => {
    try {
      // Get current user info
      const userBalance = await contractService.getAccountBalance(userAddress);
      const userNFTs = await contractService.getNFTBalance(userAddress);
      let stakerInfo = null;
      try {
        stakerInfo = await contractService.getStakerInfo(userAddress);
      } catch (error) {
        console.log('No staking info available');
      }

      const stakedAmount = stakerInfo ? parseFloat(stakerInfo.stakedAmount) : 0;
      
      // Find or create user entry
      const userEntry = {
        address: userAddress.slice(0, 6) + '...' + userAddress.slice(-4),
        avaxPoints: avaxPointsToAdd,
        staked: stakedAmount,
        nfts: userNFTs,
        rank: 0
      };

      // Update leaderboard
      setLeaderboard(prev => {
        const newLeaderboard = [...prev];
        
        // Find existing user entry
        const existingIndex = newLeaderboard.findIndex(entry => 
          entry.address === userEntry.address
        );

        if (existingIndex !== -1) {
          // Update existing entry
          newLeaderboard[existingIndex].avaxPoints += avaxPointsToAdd;
          newLeaderboard[existingIndex].staked = stakedAmount;
          newLeaderboard[existingIndex].nfts = userNFTs;
        } else {
          // Add new entry
          newLeaderboard.push(userEntry);
        }

        // Sort by AVAX points and update ranks
        newLeaderboard.sort((a, b) => b.avaxPoints - a.avaxPoints);
        newLeaderboard.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        // Keep only top 10
        return newLeaderboard.slice(0, 10);
      });
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  };

  // Account balance function
  const showAccountBalance = async () => {
    if (!isConnected || !contractService.isInitialized()) {
      setModalContent('Please connect your wallet first!');
      setShowModal(true);
      return;
    }

    try {
      const address = await contractService.getCurrentAddress();
      const balance = await contractService.getAccountBalance(address);
      const balanceInAVAX = parseFloat(balance);
      
      // Get staker info if available
      let stakerInfo = null;
      try {
        stakerInfo = await contractService.getStakerInfo(address);
      } catch (error) {
        console.log('No staking info available');
      }

      // Get NFT balance
      const nftBalance = await contractService.getNFTBalance(address);

      let balanceText = `💰 Account Balance\n\n`;
      balanceText += `📍 Address: ${address.slice(0, 6)}...${address.slice(-4)}\n`;
      balanceText += `🪙 AVAX Balance: ${balanceInAVAX.toFixed(4)} AVAX\n`;
      balanceText += `🎨 NFTs Owned: ${nftBalance}\n\n`;
      
      if (stakerInfo && stakerInfo.isStaking) {
        balanceText += `📊 Staking Info:\n`;
        balanceText += `• Staked: ${stakerInfo.stakedAmount} AVAX\n`;
        balanceText += `• Pending Rewards: ${stakerInfo.pendingRewards} AVAX\n`;
        balanceText += `• Staking Since: ${new Date(stakerInfo.stakingTimestamp * 1000).toLocaleDateString()}\n\n`;
      }
      
      balanceText += `🎮 Game Stats:\n`;
      balanceText += `• Energy: ${playerStats.energy}/100\n`;
      balanceText += `• Streak: ${playerStats.streak}\n`;
      balanceText += `• AVAX Points: ${playerStats.points.toFixed(4)} AVAX\n`;
      balanceText += `• AVAX Balance: ${playerStats.avax.toFixed(4)} AVAX\n\n`;
      
      balanceText += `⚡ Real-Time Stats:\n`;
      balanceText += `• Points/sec: ${realtimeStats.pointsPerSecond.toFixed(6)} AVAX\n`;
      balanceText += `• Staking Multiplier: ${realtimeStats.stakingMultiplier}x\n`;
      balanceText += `• Activity Multiplier: ${realtimeStats.activityMultiplier.toFixed(2)}x\n`;
      balanceText += `• Total Earned: ${realtimeStats.totalPointsEarned.toFixed(4)} AVAX`;

      setModalContent(balanceText);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 8000);
    } catch (error) {
      console.error('Error getting account balance:', error);
      setModalContent('Error getting account balance. Please try again.');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
    }
  };

  // Duplicate disconnectWallet function removed - using blockchain integration version

  // Enhanced Ethers.js account balance function
  const getAccountBalance = async (address) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      return formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0.0';
    }
  };

  // Enhanced real-time balance update using contract service
  const updateRealTimeBalance = async () => {
    if (isConnected && contractService.isInitialized()) {
      try {
        const address = await contractService.getCurrentAddress();
        const balance = await contractService.getAccountBalance(address);
        
        // Update player stats with real balance
        setPlayerStats(prev => ({
          ...prev,
          avax: parseFloat(balance)
        }));
      } catch (error) {
        console.error('Error updating balance:', error);
      }
    }
  };

  // Enhanced Ethers.js transaction status checker
  const checkTransactionStatus = async (txHash) => {
    try {
        const provider = new BrowserProvider(window.ethereum);
      const receipt = await provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      console.error('Error checking transaction:', error);
      return null;
    }
  };

  // Enhanced staking functionality using contract service
  const stakeCoins = async () => {
    console.log('Stake coins called. Connected:', isConnected, 'Contract initialized:', contractService.isInitialized());
    if (!isConnected || !contractService.isInitialized()) {
      setModalContent('Please connect your wallet first!');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
      return;
    }
    
    try {
      const address = await contractService.getCurrentAddress();
      
      // Get current balance using contract service
      const balance = await contractService.getAccountBalance(address);
      const balanceInAVAX = parseFloat(balance);
      
      if (balanceInAVAX < 0.01) {
        setModalContent('Insufficient AVAX balance! You need at least 0.01 AVAX to stake.\n\n💡 Get free testnet AVAX from: https://faucet.avax.network/');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 6000);
        return;
      }
      
      setModalContent('Confirming stake transaction... Please check MetaMask.');
      setShowModal(true);
      
      // Stake using contract service
      const tx = await contractService.stakeAVAX(0.01);
      
      setModalContent(`Staking transaction sent! TX: ${tx.hash}\nWaiting for confirmation...`);
      setShowModal(true);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        playSound('stake', 300, 0.2);
        setPlayerStats(prev => ({
          ...prev,
          energy: Math.min(100, prev.energy + 20),
          streak: prev.streak + 1,
          avax: prev.avax + 0.01, // Add staked amount to game balance
          points: prev.points + 0.01 // Add AVAX points
        }));
        
        // Immediately update real-time stats to reflect new energy/streak
        setTimeout(() => {
          updateRealtimeStatsImmediately();
        }, 100); // Small delay to ensure state is updated
        
        // Update leaderboard with AVAX points
        await updateLeaderboard(address, 0.01); // 0.01 AVAX points for staking
        
        setModalContent(`✅ Staked 0.01 AVAX successfully!\nTX: ${tx.hash}\nContract: ${contractService.stakingContract.address}\nEnergy +20, Streak +1, AVAX Points +0.01`);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 5000);
      } else {
        setModalContent('Staking transaction failed! Please try again.');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 4000);
      }
      
    } catch (error) {
      console.error('Staking error:', error);
      setModalContent(`Staking failed: ${error.message}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 4000);
    }
  };

  // Unstake AVAX using contract service
  const unstakeCoins = async () => {
    if (!isConnected || !contractService.isInitialized()) {
      setModalContent('Please connect your wallet first!');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
      return;
    }
    
    try {
      setModalContent('Unstaking AVAX... Please check MetaMask.');
      setShowModal(true);
      
      // Unstake using contract service
      const tx = await contractService.unstakeAVAX();
      
      setModalContent(`Unstaking transaction sent! TX: ${tx.hash}\nWaiting for confirmation...`);
      setShowModal(true);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        playSound('stake', 300, 0.2);
        setPlayerStats(prev => ({
          ...prev,
          energy: Math.min(100, prev.energy + 10),
          streak: prev.streak + 1
        }));
        
        setModalContent(`✅ Unstaked successfully!\nTX: ${tx.hash}\nContract: ${contractService.stakingContract.address}\nEnergy +10, Streak +1`);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 5000);
      } else {
        setModalContent('Unstaking transaction failed! Please try again.');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 4000);
      }
      
    } catch (error) {
      console.error('Unstaking error:', error);
      setModalContent(`Unstaking failed: ${error.message}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 4000);
    }
  };

  // Claim rewards using contract service
  const claimRewards = async () => {
    if (!isConnected || !contractService.isInitialized()) {
      setModalContent('Please connect your wallet first!');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
      return;
    }
    
    try {
      setModalContent('Claiming rewards... Please check MetaMask.');
      setShowModal(true);
      
      // Claim rewards using contract service
      const tx = await contractService.claimRewards();
      
      setModalContent(`Claim rewards transaction sent! TX: ${tx.hash}\nWaiting for confirmation...`);
      setShowModal(true);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        playSound('collect', 600, 0.2);
        setPlayerStats(prev => ({
          ...prev,
          points: prev.points + 200,
          streak: prev.streak + 1
        }));
        
        setModalContent(`✅ Rewards claimed successfully!\nTX: ${tx.hash}\nContract: ${contractService.stakingContract.address}\n+200 Points, Streak +1`);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 5000);
      } else {
        setModalContent('Claim rewards transaction failed! Please try again.');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 4000);
      }
      
    } catch (error) {
      console.error('Claim rewards error:', error);
      setModalContent(`Claim rewards failed: ${error.message}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 4000);
    }
  };

  // Enhanced NFT minting functionality using contract service
  const mintNFT = async () => {
    if (!isConnected || !contractService.isInitialized()) {
      setModalContent('Please connect your wallet first!');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
      return;
    }
    
    try {
      const address = await contractService.getCurrentAddress();
      
      // Get current balance using contract service
      const balance = await contractService.getAccountBalance(address);
      const balanceInAVAX = parseFloat(balance);
      
      if (balanceInAVAX < 0.0005) {
        setModalContent('Insufficient AVAX balance! You need at least 0.0005 AVAX to mint NFT.\n\n💡 Get free testnet AVAX from: https://faucet.avax.network/');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 6000);
        return;
      }
      
      setModalContent('Minting NFT... Please check MetaMask for transaction confirmation.');
      setShowModal(true);
      
      // Mint NFT using contract service
      const tx = await contractService.mintNFT();
      
      setModalContent(`NFT minting transaction sent! TX: ${tx.hash}\nWaiting for confirmation...`);
      setShowModal(true);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        playSound('mint', 500, 0.3);
        setPlayerStats(prev => ({
          ...prev,
          points: prev.points + 0.005, // Add AVAX points
          avax: prev.avax + 0.005 // Add minted amount to game balance
        }));
        
        // Immediately update real-time stats to reflect changes
        setTimeout(() => {
          updateRealtimeStatsImmediately();
        }, 100); // Small delay to ensure state is updated
        
        // Update leaderboard with AVAX points
        await updateLeaderboard(address, 0.005); // 0.005 AVAX points for minting NFT
        
        setModalContent(`✅ NFT Minted successfully!\nTX: ${tx.hash}\nContract: ${contractService.nftContract.address}\n+0.005 AVAX Points, +0.0005 AVAX`);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 5000);
      } else {
        setModalContent('NFT minting transaction failed! Please try again.');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 4000);
      }
      
    } catch (error) {
      console.error('Minting error:', error);
      setModalContent(`Minting failed: ${error.message}`);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 4000);
    }
  };

  // Check wallet connection status on app load
  const checkWalletConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = window.ethereum;
        const accounts = await provider.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          // Wallet is connected, initialize contract service
          await contractService.initialize();
          const balance = await contractService.getAccountBalance(accounts[0]);
          setIsConnected(true);
          setPlayerStats(prev => ({
            ...prev,
            avax: parseFloat(balance)
          }));
          
          // Check if we're on the correct network
          const chainId = await provider.request({ method: 'eth_chainId' });
          // Accept both Hardhat (0x7A69) and Avalanche Local (0x539)
          if (chainId !== '0x7A69' && chainId !== '0x539') {
            try {
              await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x7A69' }] });
            } catch (_) {
              try {
                await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x539' }] });
              } catch (__) {
                // leave as-is; UI will prompt
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Wallet not connected:', error);
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      initGame();
      
      // Check wallet connection on app load
      checkWalletConnection();
      
      // Focus the canvas for keyboard input
      canvasRef.current.focus();
      
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('click', handleCanvasClick);
      
      // Add canvas-specific click handler for audio context
      const handleCanvasClickForAudio = (e) => {
        if (musicManager.current && musicManager.current.audioContext) {
          musicManager.current.resume();
        }
        canvasRef.current.focus(); // Ensure canvas stays focused
      };
      
      canvasRef.current.addEventListener('click', handleCanvasClickForAudio);
      const onResize = () => {
        const c = canvasRef.current;
        if (!c) return;
        const { width, height } = computeViewportSize();
        c.width = width;
        c.height = height;
      };
      window.addEventListener('resize', onResize);
      onResize();
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('click', handleCanvasClick);
        window.removeEventListener('resize', onResize);
        if (canvasRef.current) {
          canvasRef.current.removeEventListener('click', handleCanvasClickForAudio);
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, []);

  // Auto-update real-time stats when player stats change
  useEffect(() => {
    updateRealtimeStatsImmediately();
  }, [playerStats.energy, playerStats.streak, playerStats.avax]);

  // Real-time points calculation and balance updates
  useEffect(() => {
    const interval = setInterval(() => {
      calculateRealtimePoints();
      
      if (isConnected) {
        updateRealTimeBalance();
        // Sync leaderboard every 10 seconds
        if (Date.now() % 10000 < 1000) {
          syncLeaderboardWithBlockchain();
        }
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isConnected, realtimeStats.lastUpdate, playerStats.avax, playerStats.streak, playerStats.energy]);

  // Handle MetaMask account changes and disconnections
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected
          setIsConnected(false);
          setModalContent('Wallet disconnected. Please reconnect to continue.');
          setShowModal(true);
          setTimeout(() => setShowModal(false), 3000);
        } else {
          // User switched accounts
          setIsConnected(true);
          updateRealTimeBalance();
        }
      };

      const handleChainChanged = (chainId) => {
        const ok = chainId === '0x7A69' || chainId === '0x539';
        if (!ok) {
          setModalContent('Please switch to Hardhat (31337) or Avalanche Local (1337).');
          setShowModal(true);
          setTimeout(() => setShowModal(false), 5000);
        }
      };

      // Add event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  return (
    <div className="app">
      
      <div className="game-container">
        <canvas
          ref={canvasRef}
          width={computeViewportSize().width}
          height={computeViewportSize().height}
          className="game-canvas"
          tabIndex="0"
          style={{ outline: 'none' }}
        />
      </div>
      
      {hint && (
        <div className="hint-bubble">💡 {hint}</div>
      )}
      
      {/* Click to focus instruction */}
      {gameState === 'title' && (
        <div onClick={() => handleScreenAction('startGame')} role="button" aria-label="Start Game" style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffffff',
          fontSize: '14px',
          textAlign: 'center',
          opacity: 0.8,
          animation: 'pulse 2s infinite',
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 1001
        }}>
          👆 Click game screen first, then press keys to play
          <br />
          🎮 ENTER to start | S for scoreboard | H for help | M for music
        </div>
      )}
      
      {/* Game ready indicator */}
      {gameState === 'playing' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          color: '#00ff00',
          fontSize: '12px',
          opacity: 0.7
        }}>
          🟢 Game Active
        </div>
      )}
      
      {/* Pause indicator */}
      {gameState === 'paused' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          color: '#ffff00',
          fontSize: '12px',
          opacity: 0.7
        }}>
          ⏸️ Paused
        </div>
      )}
      
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{modalContent}</p>
          </div>
        </div>
      )}
      
      {/* Achievement Popup */}
      {showAchievement && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #FFD700, #FFA500)',
          color: '#000',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
          zIndex: 1001,
          minWidth: '250px'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>🏆 Achievement Unlocked!</div>
          <div style={{ fontSize: '14px', marginTop: '5px' }}>{showAchievement.title}</div>
          <div style={{ fontSize: '12px', marginTop: '3px', opacity: 0.8 }}>{showAchievement.description}</div>
        </div>
      )}
      
      {/* Game UI Panel - Only show during gameplay and pause */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          minWidth: '200px',
          fontSize: '12px',
          zIndex: 1000
        }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#FFD700' }}>
          👹 Devil's World Adventure
        </div>
        
        {!walletConnected ? (
          <button 
            onClick={connectWallet}
            style={{
              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔗 Connect Wallet
          </button>
        ) : (
          <div>
            <div style={{ marginBottom: '5px' }}>
              👤 {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
            </div>
            <div style={{ marginBottom: '5px' }}>
              💰 {parseFloat(avaxBalance).toFixed(4)} AVAX
            </div>
            <button 
              onClick={disconnectWallet}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Disconnect
            </button>
          </div>
        )}
        
        {gamePoints && (
          <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
            <div>📊 Level: {pointSystem.current?.getLevel() || 1}</div>
            <div>⭐ XP: {gamePoints.experience}</div>
            <div>🪙 Gold: {gamePoints.gold}</div>
            <div>💎 Crystals: {gamePoints.crystals}</div>
            <div>🧱 Materials: {gamePoints.materials || 0}</div>
            <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>
              🏆 Achievements: {achievements.length}
            </div>
            <div style={{ fontSize: '10px', marginTop: '5px', borderTop: '1px solid #444', paddingTop: '5px' }}>
              <div>⏰ {timeOfDay} {isNight ? '🌙' : '☀️'}</div>
              <div>🎵 Music: M to toggle | +/- volume</div>
              <div>I - Inventory | B - Build</div>
            </div>
          </div>
        )}
        </div>
      )}
      
      {/* Inventory UI - Only show during active gameplay */}
      {gameState === 'playing' && showInventory && inventorySystem.current && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          minWidth: '400px',
          maxHeight: '500px',
          overflowY: 'auto',
          zIndex: 1002
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#FFD700' }}>🎒 Inventory</h3>
            <button onClick={() => setShowInventory(false)} style={{
              background: '#f44336', color: 'white', border: 'none', 
              padding: '5px 10px', borderRadius: '3px', cursor: 'pointer'
            }}>✕</button>
          </div>
          
          {Object.entries(inventorySystem.current.inventory).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#87CEEB', textTransform: 'capitalize' }}>
                {category} ({items.length}/{inventorySystem.current.maxSlots[category]})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '5px' }}>
                {items.map((item, index) => (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '8px',
                    borderRadius: '5px',
                    textAlign: 'center',
                    fontSize: '10px',
                    border: item.rarity === 'legendary' ? '2px solid #FFD700' : 
                           item.rarity === 'rare' ? '2px solid #9932CC' :
                           item.rarity === 'uncommon' ? '2px solid #32CD32' : '1px solid #666'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    {item.quantity > 1 && <div>x{item.quantity}</div>}
                    <div style={{ opacity: 0.7 }}>{item.value}g</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div style={{ marginTop: '15px', fontSize: '12px', opacity: 0.7 }}>
            Total Items: {inventorySystem.current.getTotalItems()}
          </div>
        </div>
      )}
      
      {/* Building Menu - Only show during active gameplay */}
      {gameState === 'playing' && showBuildMenu && infrastructureSystem.current && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '250px',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          minWidth: '300px',
          zIndex: 1002
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#FFD700' }}>🏗️ Build Infrastructure</h3>
            <button onClick={() => setShowBuildMenu(false)} style={{
              background: '#f44336', color: 'white', border: 'none', 
              padding: '5px 10px', borderRadius: '3px', cursor: 'pointer'
            }}>✕</button>
          </div>
          
          {Object.entries(infrastructureSystem.current.buildingTypes).map(([type, building]) => {
            const canAfford = infrastructureSystem.current.canAfford(type);
            return (
              <div key={type} style={{
                background: canAfford.canAfford ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '5px',
                border: canAfford.canAfford ? '1px solid #4CAF50' : '1px solid #f44336'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{building.name}</div>
                <div style={{ fontSize: '11px', marginBottom: '5px' }}>{building.description}</div>
                <div style={{ fontSize: '10px', marginBottom: '5px' }}>
                  Cost: {Object.entries(building.cost).map(([resource, amount]) => 
                    `${amount} ${resource}`
                  ).join(', ')}
                </div>
                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                  Build Time: {Math.floor(building.buildTime / 1000)}s
                </div>
                <button 
                  onClick={() => {
                    if (canAfford.canAfford) {
                      setSelectedBuildingType(type);
                      setBuildingMode(true);
                      setShowBuildMenu(false);
                    }
                  }}
                  disabled={!canAfford.canAfford}
                  style={{
                    background: canAfford.canAfford ? '#4CAF50' : '#666',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '3px',
                    cursor: canAfford.canAfford ? 'pointer' : 'not-allowed',
                    fontSize: '10px'
                  }}
                >
                  {canAfford.canAfford ? 'Select' : `Need ${canAfford.missing}`}
                </button>
              </div>
            );
          })}
          
          <div style={{ marginTop: '15px', fontSize: '11px', opacity: 0.7 }}>
            Buildings: {infrastructureSystem.current.buildings.length}
          </div>
        </div>
      )}
      
      {/* Building Mode Indicator - Only show during active gameplay */}
      {gameState === 'playing' && buildingMode && selectedBuildingType && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 165, 0, 0.9)',
          color: 'black',
          padding: '10px 20px',
          borderRadius: '20px',
          fontWeight: 'bold',
          zIndex: 1002
        }}>
          🏗️ Click to place {infrastructureSystem.current.buildingTypes[selectedBuildingType].name} | ESC to cancel
        </div>
      )}
    </div>
  );
}

export default App;
