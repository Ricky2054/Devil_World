// Inventory and Infrastructure System for Fantasy Knight Adventure
export class InventorySystem {
  constructor() {
    this.inventory = {
      weapons: [],
      tools: [],
      objects: [],
      consumables: [],
      materials: []
    };
    
    this.maxSlots = {
      weapons: 10,
      tools: 8,
      objects: 20,
      consumables: 15,
      materials: 25
    };
    
    this.equippedItems = {
      weapon: null,
      tool: null,
      armor: null
    };
  }

  // Add item to inventory
  addItem(item) {
    const category = item.category;
    if (!this.inventory[category]) {
      console.warn(`Unknown category: ${category}`);
      return false;
    }

    // Check if inventory has space
    if (this.inventory[category].length >= this.maxSlots[category]) {
      return { success: false, reason: 'Inventory full' };
    }

    // Check if item already exists (for stackable items)
    const existingItem = this.inventory[category].find(invItem => 
      invItem.id === item.id && invItem.stackable
    );

    if (existingItem) {
      existingItem.quantity += item.quantity || 1;
    } else {
      this.inventory[category].push({
        ...item,
        quantity: item.quantity || 1,
        dateAcquired: new Date().toISOString()
      });
    }

    return { success: true, item };
  }

  // Remove item from inventory
  removeItem(itemId, quantity = 1) {
    for (const category in this.inventory) {
      const itemIndex = this.inventory[category].findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        const item = this.inventory[category][itemIndex];
        
        if (item.quantity > quantity) {
          item.quantity -= quantity;
          return { success: true, item, remaining: item.quantity };
        } else {
          this.inventory[category].splice(itemIndex, 1);
          return { success: true, item, remaining: 0 };
        }
      }
    }
    return { success: false, reason: 'Item not found' };
  }

  // Equip item
  equipItem(itemId) {
    const item = this.findItem(itemId);
    if (!item) return { success: false, reason: 'Item not found' };

    const equipSlot = this.getEquipSlot(item.type);
    if (!equipSlot) return { success: false, reason: 'Item cannot be equipped' };

    // Unequip current item if any
    if (this.equippedItems[equipSlot]) {
      this.unequipItem(equipSlot);
    }

    this.equippedItems[equipSlot] = item;
    return { success: true, item, slot: equipSlot };
  }

  // Unequip item
  unequipItem(slot) {
    if (this.equippedItems[slot]) {
      const item = this.equippedItems[slot];
      this.equippedItems[slot] = null;
      return { success: true, item };
    }
    return { success: false, reason: 'No item equipped in slot' };
  }

  // Find item by ID
  findItem(itemId) {
    for (const category in this.inventory) {
      const item = this.inventory[category].find(item => item.id === itemId);
      if (item) return item;
    }
    return null;
  }

  // Get equipment slot for item type
  getEquipSlot(itemType) {
    const slotMap = {
      'sword': 'weapon',
      'bow': 'weapon',
      'staff': 'weapon',
      'pickaxe': 'tool',
      'axe': 'tool',
      'shovel': 'tool',
      'helmet': 'armor',
      'chestplate': 'armor',
      'boots': 'armor'
    };
    return slotMap[itemType] || null;
  }

  // Get total inventory count
  getTotalItems() {
    let total = 0;
    for (const category in this.inventory) {
      total += this.inventory[category].reduce((sum, item) => sum + item.quantity, 0);
    }
    return total;
  }

  // Save inventory to localStorage
  save() {
    const data = {
      inventory: this.inventory,
      equippedItems: this.equippedItems,
      maxSlots: this.maxSlots
    };
    localStorage.setItem('fantasyKnightInventory', JSON.stringify(data));
  }

  // Load inventory from localStorage
  load() {
    const saved = localStorage.getItem('fantasyKnightInventory');
    if (saved) {
      const data = JSON.parse(saved);
      this.inventory = data.inventory || this.inventory;
      this.equippedItems = data.equippedItems || this.equippedItems;
      this.maxSlots = data.maxSlots || this.maxSlots;
    }
  }
}

// Infrastructure Building System
export class InfrastructureSystem {
  constructor(pointSystem) {
    this.pointSystem = pointSystem;
    this.buildings = [];
    this.buildingTypes = {
      house: {
        name: 'House',
        cost: { gold: 500, materials: 10 },
        buildTime: 30000, // 30 seconds
        benefits: { healthRegen: 2, goldPerHour: 5 },
        description: 'A cozy house that provides health regeneration and passive gold income'
      },
      blacksmith: {
        name: 'Blacksmith',
        cost: { gold: 1000, materials: 20 },
        buildTime: 60000, // 1 minute
        benefits: { weaponUpgrade: true, repairDiscount: 0.5 },
        description: 'Upgrade weapons and repair equipment at half cost'
      },
      farm: {
        name: 'Farm',
        cost: { gold: 300, materials: 15 },
        buildTime: 45000, // 45 seconds
        benefits: { foodProduction: 3, healthPotions: 1 },
        description: 'Produces food and health potions over time'
      },
      mine: {
        name: 'Mine',
        cost: { gold: 800, materials: 25 },
        buildTime: 90000, // 1.5 minutes
        benefits: { materialsPerHour: 5, rareOres: true },
        description: 'Generates materials and rare ores for crafting'
      },
      tower: {
        name: 'Watch Tower',
        cost: { gold: 1500, materials: 30 },
        buildTime: 120000, // 2 minutes
        benefits: { mapReveal: true, enemyWarning: true, crystalsPerHour: 1 },
        description: 'Reveals map areas, warns of enemies, and generates crystals'
      },
      portal: {
        name: 'Magic Portal',
        cost: { gold: 5000, materials: 100, crystals: 50 },
        buildTime: 300000, // 5 minutes
        benefits: { fastTravel: true, avaxReward: 0.1 },
        description: 'Enables fast travel and grants AVAX rewards'
      }
    };
  }

  // Check if player can afford building
  canAfford(buildingType) {
    const cost = this.buildingTypes[buildingType].cost;
    const points = this.pointSystem.points;
    
    for (const resource in cost) {
      if (points[resource] < cost[resource]) {
        return { canAfford: false, missing: resource, needed: cost[resource], have: points[resource] };
      }
    }
    return { canAfford: true };
  }

  // Start building construction
  startBuilding(buildingType, x, y) {
    const affordCheck = this.canAfford(buildingType);
    if (!affordCheck.canAfford) {
      return { 
        success: false, 
        reason: `Not enough ${affordCheck.missing}. Need ${affordCheck.needed}, have ${affordCheck.have}` 
      };
    }

    // Check if location is valid (not too close to other buildings)
    const tooClose = this.buildings.some(building => {
      const distance = Math.sqrt(Math.pow(building.x - x, 2) + Math.pow(building.y - y, 2));
      return distance < 100; // Minimum 100 pixels apart
    });

    if (tooClose) {
      return { success: false, reason: 'Too close to another building' };
    }

    // Deduct costs
    const cost = this.buildingTypes[buildingType].cost;
    for (const resource in cost) {
      this.pointSystem.points[resource] -= cost[resource];
    }

    // Create building
    const building = {
      id: Date.now().toString(),
      type: buildingType,
      x, y,
      startTime: Date.now(),
      buildTime: this.buildingTypes[buildingType].buildTime,
      completed: false,
      level: 1
    };

    this.buildings.push(building);
    this.pointSystem.save();

    return { success: true, building };
  }

  // Update building construction progress
  updateBuildings() {
    const now = Date.now();
    let completedBuildings = [];

    this.buildings.forEach(building => {
      if (!building.completed) {
        const elapsed = now - building.startTime;
        if (elapsed >= building.buildTime) {
          building.completed = true;
          building.completedAt = now;
          completedBuildings.push(building);
        }
      }
    });

    // Apply benefits from completed buildings
    this.applyBuildingBenefits();

    return completedBuildings;
  }

  // Apply passive benefits from buildings
  applyBuildingBenefits() {
    const now = Date.now();
    
    this.buildings.forEach(building => {
      if (!building.completed) return;
      
      const buildingType = this.buildingTypes[building.type];
      const benefits = buildingType.benefits;
      
      // Apply hourly benefits (check every minute)
      if (!building.lastBenefitTime || now - building.lastBenefitTime >= 60000) {
        building.lastBenefitTime = now;
        
        if (benefits.goldPerHour) {
          this.pointSystem.points.gold += Math.floor(benefits.goldPerHour / 60);
        }
        
        if (benefits.materialsPerHour) {
          this.pointSystem.points.materials = (this.pointSystem.points.materials || 0) + Math.floor(benefits.materialsPerHour / 60);
        }
        
        if (benefits.crystalsPerHour) {
          this.pointSystem.points.crystals += Math.floor(benefits.crystalsPerHour / 60);
        }
      }
    });
  }

  // Get building construction progress
  getBuildingProgress(buildingId) {
    const building = this.buildings.find(b => b.id === buildingId);
    if (!building) return null;
    
    if (building.completed) return { progress: 100, completed: true };
    
    const elapsed = Date.now() - building.startTime;
    const progress = Math.min(100, (elapsed / building.buildTime) * 100);
    
    return { progress, completed: false, timeRemaining: building.buildTime - elapsed };
  }

  // Upgrade building
  upgradeBuilding(buildingId) {
    const building = this.buildings.find(b => b.id === buildingId);
    if (!building || !building.completed) {
      return { success: false, reason: 'Building not found or not completed' };
    }

    const upgradeCost = {
      gold: 200 * building.level,
      materials: 5 * building.level
    };

    // Check if can afford upgrade
    for (const resource in upgradeCost) {
      if (this.pointSystem.points[resource] < upgradeCost[resource]) {
        return { success: false, reason: `Not enough ${resource} for upgrade` };
      }
    }

    // Deduct costs and upgrade
    for (const resource in upgradeCost) {
      this.pointSystem.points[resource] -= upgradeCost[resource];
    }

    building.level++;
    this.pointSystem.save();

    return { success: true, building, newLevel: building.level };
  }

  // Save buildings to localStorage
  save() {
    localStorage.setItem('fantasyKnightBuildings', JSON.stringify(this.buildings));
  }

  // Load buildings from localStorage
  load() {
    const saved = localStorage.getItem('fantasyKnightBuildings');
    if (saved) {
      this.buildings = JSON.parse(saved);
    }
  }
}

// Item definitions for the game
export const GAME_ITEMS = {
  // Weapons
  ironSword: {
    id: 'ironSword',
    name: 'Iron Sword',
    type: 'sword',
    category: 'weapons',
    damage: 25,
    durability: 100,
    value: 50,
    rarity: 'common',
    description: 'A sturdy iron sword for basic combat'
  },
  steelSword: {
    id: 'steelSword',
    name: 'Steel Sword',
    type: 'sword',
    category: 'weapons',
    damage: 40,
    durability: 150,
    value: 150,
    rarity: 'uncommon',
    description: 'A well-crafted steel sword with improved damage'
  },
  enchantedBow: {
    id: 'enchantedBow',
    name: 'Enchanted Bow',
    type: 'bow',
    category: 'weapons',
    damage: 35,
    durability: 120,
    value: 200,
    rarity: 'rare',
    description: 'A magical bow that never misses its target'
  },

  // Tools
  ironPickaxe: {
    id: 'ironPickaxe',
    name: 'Iron Pickaxe',
    type: 'pickaxe',
    category: 'tools',
    efficiency: 2,
    durability: 80,
    value: 30,
    description: 'Mine stone and ore more efficiently'
  },
  steelAxe: {
    id: 'steelAxe',
    name: 'Steel Axe',
    type: 'axe',
    category: 'tools',
    efficiency: 3,
    durability: 120,
    value: 75,
    description: 'Chop wood faster and gather more materials'
  },

  // Consumables
  healthPotion: {
    id: 'healthPotion',
    name: 'Health Potion',
    type: 'potion',
    category: 'consumables',
    healing: 50,
    value: 25,
    stackable: true,
    description: 'Restores 50 health points'
  },
  manaPotion: {
    id: 'manaPotion',
    name: 'Mana Potion',
    type: 'potion',
    category: 'consumables',
    manaRestore: 30,
    value: 20,
    stackable: true,
    description: 'Restores 30 mana points'
  },

  // Materials
  wood: {
    id: 'wood',
    name: 'Wood',
    type: 'material',
    category: 'materials',
    value: 2,
    stackable: true,
    description: 'Basic building material from trees'
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    type: 'material',
    category: 'materials',
    value: 3,
    stackable: true,
    description: 'Sturdy material for construction'
  },
  ironOre: {
    id: 'ironOre',
    name: 'Iron Ore',
    type: 'material',
    category: 'materials',
    value: 8,
    stackable: true,
    description: 'Raw iron ore for crafting weapons'
  },

  // Objects/Treasures
  goldCoin: {
    id: 'goldCoin',
    name: 'Gold Coin',
    type: 'currency',
    category: 'objects',
    value: 10,
    stackable: true,
    description: 'Standard currency of the realm'
  },
  ancientRelic: {
    id: 'ancientRelic',
    name: 'Ancient Relic',
    type: 'artifact',
    category: 'objects',
    value: 500,
    rarity: 'legendary',
    description: 'A mysterious artifact from ancient times'
  }
};
