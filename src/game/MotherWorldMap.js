// Mother World Map - Based on the fantasy island image
// This creates a large pixelated world with detailed object placement

export function createMotherWorld() {
  // Base dimensions - 20x larger than original areas
  const width = 1920; // 96 * 20
  const height = 1440; // 72 * 20
  
  // Tile types
  const T = {
    empty: 0,
    dirt: 1,
    sand: 2,
    grass: 3,
    brightGrass: 4,
    rock: 5,
    deepWater: 6,
    shallowWater: 7,
    buildingDark: 9,
    stone: 5,
    log: 18,
    trunk: 15,
    leaves: 16,
    neon: 23,
    magic: 22,
    beach: 24,
    mountain: 25,
    river: 26,
    forest: 27,
    village: 28
  };

  // Initialize with deep water (ocean background)
  const tiles = Array(height).fill(null).map(() => Array(width).fill(T.deepWater));
  const objects = [];
  const npcs = [];
  const enemies = [];
  const treasures = [];
  const buildings = [];

  // Create the main island shape (central landmass)
  const centerX = width / 2;
  const centerY = height / 2;
  const islandRadius = Math.min(width, height) * 0.35;

  // Generate island coastline with organic shape
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Create organic island shape with noise
      const angle = Math.atan2(dy, dx);
      const noise = Math.sin(angle * 8) * 0.1 + Math.sin(angle * 3) * 0.2;
      const adjustedRadius = islandRadius * (1 + noise);
      
      if (distance < adjustedRadius) {
        // Determine terrain type based on distance from center and position
        const normalizedDistance = distance / adjustedRadius;
        
        if (normalizedDistance < 0.1) {
          // Central mountain area
          tiles[y][x] = T.mountain;
        } else if (normalizedDistance < 0.3) {
          // Inner hills and forests
          tiles[y][x] = Math.random() < 0.6 ? T.grass : T.forest;
        } else if (normalizedDistance < 0.7) {
          // Main land area
          tiles[y][x] = Math.random() < 0.8 ? T.grass : T.dirt;
        } else if (normalizedDistance < 0.85) {
          // Coastal area
          tiles[y][x] = T.sand;
        } else {
          // Beach/shallow water transition
          tiles[y][x] = Math.random() < 0.5 ? T.sand : T.shallowWater;
        }
      } else if (distance < adjustedRadius + 50) {
        // Shallow water around island
        tiles[y][x] = T.shallowWater;
      }
    }
  }

  // Add smaller islands around the main island
  const smallIslands = [
    { x: centerX - 600, y: centerY - 400, radius: 120 },
    { x: centerX + 500, y: centerY - 300, radius: 80 },
    { x: centerX - 400, y: centerY + 450, radius: 100 },
    { x: centerX + 400, y: centerY + 400, radius: 90 },
    { x: centerX + 700, y: centerY + 100, radius: 60 }
  ];

  smallIslands.forEach(island => {
    for (let y = island.y - island.radius; y < island.y + island.radius; y++) {
      for (let x = island.x - island.radius; x < island.x + island.radius; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const dx = x - island.x;
          const dy = y - island.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < island.radius) {
            const normalizedDistance = distance / island.radius;
            if (normalizedDistance < 0.7) {
              tiles[y][x] = Math.random() < 0.7 ? T.grass : T.forest;
            } else {
              tiles[y][x] = T.sand;
            }
          }
        }
      }
    }
  });

  // Add winding river through the main island
  const riverPath = [];
  let riverX = centerX - 200;
  let riverY = centerY - 300;
  
  while (riverY < centerY + 300) {
    riverPath.push({ x: riverX, y: riverY });
    riverX += (Math.random() - 0.5) * 40;
    riverY += 15 + Math.random() * 10;
    
    // Keep river within island bounds
    riverX = Math.max(centerX - 400, Math.min(centerX + 400, riverX));
  }

  // Draw river
  riverPath.forEach((point, index) => {
    const riverWidth = 8 + Math.sin(index * 0.1) * 3;
    for (let dy = -riverWidth; dy <= riverWidth; dy++) {
      for (let dx = -riverWidth; dx <= riverWidth; dx++) {
        const x = Math.floor(point.x + dx);
        const y = Math.floor(point.y + dy);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          if (dx * dx + dy * dy <= riverWidth * riverWidth) {
            tiles[y][x] = T.river;
          }
        }
      }
    }
  });

  // Add mountain ranges
  const mountains = [
    { x: centerX, y: centerY - 200, width: 200, height: 150 },
    { x: centerX - 300, y: centerY - 100, width: 150, height: 100 },
    { x: centerX + 250, y: centerY + 50, width: 180, height: 120 }
  ];

  mountains.forEach(mountain => {
    for (let y = mountain.y - mountain.height/2; y < mountain.y + mountain.height/2; y++) {
      for (let x = mountain.x - mountain.width/2; x < mountain.x + mountain.width/2; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const dx = x - mountain.x;
          const dy = y - mountain.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = Math.min(mountain.width, mountain.height) / 2;
          
          if (distance < maxDistance) {
            const height_factor = 1 - (distance / maxDistance);
            if (height_factor > 0.7) {
              tiles[y][x] = T.mountain;
            } else if (height_factor > 0.4) {
              tiles[y][x] = T.rock;
            } else if (height_factor > 0.2) {
              tiles[y][x] = T.stone;
            }
          }
        }
      }
    }
  });

  // Add dense forest areas
  const forests = [
    { x: centerX - 250, y: centerY + 150, radius: 120 },
    { x: centerX + 200, y: centerY - 50, radius: 100 },
    { x: centerX - 100, y: centerY + 250, radius: 80 },
    { x: centerX + 350, y: centerY + 200, radius: 90 }
  ];

  forests.forEach(forest => {
    for (let y = forest.y - forest.radius; y < forest.y + forest.radius; y++) {
      for (let x = forest.x - forest.radius; x < forest.x + forest.radius; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const dx = x - forest.x;
          const dy = y - forest.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < forest.radius && tiles[y][x] === T.grass) {
            if (Math.random() < 0.8) {
              tiles[y][x] = T.forest;
            }
          }
        }
      }
    }
  });

  // Add villages and settlements
  const villages = [
    { x: centerX - 150, y: centerY + 100, size: 60, name: "Riverside Village" },
    { x: centerX + 180, y: centerY + 150, size: 80, name: "Forest Town" },
    { x: centerX - 300, y: centerY + 200, size: 50, name: "Coastal Settlement" },
    { x: centerX + 100, y: centerY - 150, size: 70, name: "Mountain Outpost" }
  ];

  villages.forEach(village => {
    // Clear area for village
    for (let y = village.y - village.size; y < village.y + village.size; y++) {
      for (let x = village.x - village.size; x < village.x + village.size; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const dx = x - village.x;
          const dy = y - village.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < village.size) {
            tiles[y][x] = T.village;
          }
        }
      }
    }

    // Add buildings in village
    const buildingCount = Math.floor(village.size / 10);
    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const radius = 20 + Math.random() * (village.size - 30);
      const bx = village.x + Math.cos(angle) * radius;
      const by = village.y + Math.sin(angle) * radius;
      
      buildings.push({
        x: bx,
        y: by,
        width: 20 + Math.random() * 20,
        height: 20 + Math.random() * 20,
        type: Math.random() < 0.3 ? 'house' : Math.random() < 0.6 ? 'shop' : 'inn',
        village: village.name
      });
    }

    // Add NPCs in village
    for (let i = 0; i < 3 + Math.random() * 5; i++) {
      npcs.push({
        x: village.x + (Math.random() - 0.5) * village.size * 1.5,
        y: village.y + (Math.random() - 0.5) * village.size * 1.5,
        type: ['villager', 'merchant', 'guard', 'elder'][Math.floor(Math.random() * 4)],
        village: village.name
      });
    }
  });

  // Add roads connecting villages
  villages.forEach((village, index) => {
    if (index < villages.length - 1) {
      const nextVillage = villages[index + 1];
      const steps = Math.floor(Math.sqrt(
        Math.pow(nextVillage.x - village.x, 2) + 
        Math.pow(nextVillage.y - village.y, 2)
      ) / 10);
      
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = Math.floor(village.x + (nextVillage.x - village.x) * t);
        const y = Math.floor(village.y + (nextVillage.y - village.y) * t);
        
        // Create road
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const roadX = x + dx;
            const roadY = y + dy;
            if (roadX >= 0 && roadX < width && roadY >= 0 && roadY < height) {
              if (tiles[roadY][roadX] === T.grass || tiles[roadY][roadX] === T.dirt) {
                tiles[roadY][roadX] = T.dirt;
              }
            }
          }
        }
      }
    }
  });

  // Add treasures throughout the world
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    
    // Only place treasures on land
    if (tiles[Math.floor(y)] && tiles[Math.floor(y)][Math.floor(x)] && 
        [T.grass, T.dirt, T.forest, T.sand].includes(tiles[Math.floor(y)][Math.floor(x)])) {
      treasures.push({
        x: x,
        y: y,
        type: ['gold', 'crystal', 'artifact', 'potion'][Math.floor(Math.random() * 4)],
        value: 10 + Math.random() * 90,
        found: false
      });
    }
  }

  // Add enemies in various locations
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    
    // Place enemies away from villages
    let nearVillage = false;
    villages.forEach(village => {
      const distance = Math.sqrt(Math.pow(x - village.x, 2) + Math.pow(y - village.y, 2));
      if (distance < village.size + 50) {
        nearVillage = true;
      }
    });
    
    if (!nearVillage && tiles[Math.floor(y)] && tiles[Math.floor(y)][Math.floor(x)] && 
        [T.grass, T.dirt, T.forest].includes(tiles[Math.floor(y)][Math.floor(x)])) {
      
      const enemyTypes = ['goblin', 'orc', 'skeleton', 'wolf', 'bear', 'dragon'];
      const difficulty = ['easy', 'medium', 'hard'];
      
      enemies.push({
        x: x,
        y: y,
        type: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
        difficulty: difficulty[Math.floor(Math.random() * difficulty.length)],
        health: 30 + Math.random() * 70,
        maxHealth: 30 + Math.random() * 70,
        state: 'patrol',
        patrolRadius: 50 + Math.random() * 100
      });
    }
  }

  // Add special landmarks
  const landmarks = [
    { x: centerX, y: centerY - 250, type: 'ancient_temple', name: "Temple of the Ancients" },
    { x: centerX - 400, y: centerY - 200, type: 'wizard_tower', name: "Mystic Spire" },
    { x: centerX + 300, y: centerY + 300, type: 'dragon_lair', name: "Dragon's Den" },
    { x: centerX - 200, y: centerY + 350, type: 'ruins', name: "Lost Ruins" },
    { x: centerX + 450, y: centerY - 100, type: 'crystal_cave', name: "Crystal Caverns" }
  ];

  landmarks.forEach(landmark => {
    objects.push({
      x: landmark.x,
      y: landmark.y,
      type: landmark.type,
      name: landmark.name,
      width: 40 + Math.random() * 40,
      height: 40 + Math.random() * 40,
      interactive: true
    });
    
    // Add special treasure near landmarks
    treasures.push({
      x: landmark.x + (Math.random() - 0.5) * 100,
      y: landmark.y + (Math.random() - 0.5) * 100,
      type: 'legendary',
      value: 100 + Math.random() * 200,
      found: false
    });
  });

  // Add decorative objects throughout the world
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    
    if (tiles[Math.floor(y)] && tiles[Math.floor(y)][Math.floor(x)]) {
      const tileType = tiles[Math.floor(y)][Math.floor(x)];
      let objectType = null;
      
      if (tileType === T.forest) {
        objectType = ['tree', 'bush', 'mushroom'][Math.floor(Math.random() * 3)];
      } else if (tileType === T.grass) {
        objectType = ['flower', 'rock', 'bush'][Math.floor(Math.random() * 3)];
      } else if (tileType === T.sand) {
        objectType = ['palm_tree', 'shell', 'driftwood'][Math.floor(Math.random() * 3)];
      } else if (tileType === T.mountain || tileType === T.rock) {
        objectType = ['boulder', 'crystal', 'cave_entrance'][Math.floor(Math.random() * 3)];
      }
      
      if (objectType) {
        objects.push({
          x: x,
          y: y,
          type: objectType,
          width: 5 + Math.random() * 15,
          height: 5 + Math.random() * 15,
          interactive: objectType === 'cave_entrance'
        });
      }
    }
  }

  return {
    name: 'Mother World',
    width: width,
    height: height,
    tiles: tiles,
    objects: objects,
    npcs: npcs,
    enemies: enemies,
    treasures: treasures,
    buildings: buildings,
    landmarks: landmarks,
    villages: villages,
    spawn: { x: centerX, y: centerY + 200 }, // Spawn near the center-south
    description: "A vast fantasy world with islands, mountains, forests, villages, and ancient mysteries waiting to be discovered."
  };
}

// Export function to get the mother world
export function getMotherWorld() {
  return createMotherWorld();
}
