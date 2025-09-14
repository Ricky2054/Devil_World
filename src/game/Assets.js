// Lightweight image loader with graceful fallback
// Tries public paths first; if not found, falls back to solid-color drawing

export async function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadFirstAvailable(paths) {
  for (const p of paths) {
    const img = await loadImage(p);
    if (img) return img;
  }
  return null;
}

export async function loadGameAssets() {
  // Try multiple public paths for each asset name. Put your images in public/assets/... to be picked up
  const candidates = {
    tileset: [
      '/assets/tiles/Tiles.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/Tiles.png'
    ],
    ground: [
      '/assets/tiles/ground.png',
      '/Legacy-Fantasy - High Forest 2.3/Background/Background.png'
    ],
    treeSmall: [
      '/assets/props/tree_small.png',
      '/Legacy-Fantasy - High Forest 2.3/Trees/Green-Tree.png'
    ],
    treeMedium: [
      '/assets/props/tree_medium.png',
      '/Legacy-Fantasy - High Forest 2.3/Trees/Dark-Tree.png'
    ],
    rock: [
      '/assets/props/rock.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/Props-Rocks.png'
    ],
    bush: [
      '/assets/props/bush.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/bush.png'
    ],
    stump: [
      '/assets/props/stump.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/stump.png'
    ],
    house: [
      '/assets/buildings/house.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/Buildings.png'
    ],
    well: [
      '/assets/props/well.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/well.png'
    ],
    bridgeH: [
      '/assets/props/bridge_horizontal.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/bridge_horizontal.png'
    ],
    bridgeV: [
      '/assets/props/bridge_vertical.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/bridge_vertical.png'
    ],
    fenceH: [
      '/assets/props/fence_horizontal.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/fence_horizontal.png'
    ],
    fenceV: [
      '/assets/props/fence_vertical.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/fence_vertical.png'
    ],
    tent: [
      '/assets/props/tent.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/tent.png'
    ],
    windmill: [
      '/assets/buildings/windmill.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/windmill.png'
    ],
    tower: [
      '/assets/buildings/tower.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/tower.png'
    ],
    barrel: [
      '/assets/props/barrel.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/barrel.png'
    ],
    chest: [
      '/assets/props/chest.png',
      '/Legacy-Fantasy - High Forest 2.3/Assets/chest.png'
    ],
    npc: [
      '/assets/characters/npc.png',
      '/Legacy-Fantasy - High Forest 2.3/Character/Idle/Idle-Sheet.png'
    ],
    enemy: [
      '/assets/characters/enemy.png',
      '/Legacy-Fantasy - High Forest 2.3/Mob/Boar/Idle/Idle-Sheet.png'
    ],
    boar: [
      '/assets/mobs/boar.png',
      '/Legacy-Fantasy - High Forest 2.3/Mob/Boar/Idle/Idle-Sheet.png'
    ],
    bee: [
      '/assets/mobs/bee.png',
      '/Legacy-Fantasy - High Forest 2.3/Mob/Small Bee/Fly/Fly-Sheet.png'
    ],
    snail: [
      '/assets/mobs/snail.png',
      '/Legacy-Fantasy - High Forest 2.3/Mob/Snail/walk-Sheet.png'
    ]
  };

  // Main Character Knight from provided assets (120x80 sprite sheets)
  const knightBasePath = '/Main_character/Colour1/NoOutline/120x80_PNGSheets';
  const knightPaths = {
    idle: `${knightBasePath}/_Idle.png`,
    run: `${knightBasePath}/_Run.png`,
    attack: `${knightBasePath}/_Attack.png`,
    attack2: `${knightBasePath}/_Attack2.png`,
    attackCombo: `${knightBasePath}/_AttackCombo.png`,
    defend: `${knightBasePath}/_Crouch.png`,
    crouchAttack: `${knightBasePath}/_CrouchAttack.png`,
    hit: `${knightBasePath}/_Hit.png`,
    death: `${knightBasePath}/_Death.png`,
    roll: `${knightBasePath}/_Roll.png`,
    dash: `${knightBasePath}/_Dash.png`,
    jump: `${knightBasePath}/_Jump.png`,
    fall: `${knightBasePath}/_Fall.png`
  };
  
  console.log('🏰 Loading Knight Assets from:', knightBasePath);

  const [ground, tileset, treeSmall, treeMedium, rock, bush, stump, house, well, bridgeH, bridgeV, fenceH, fenceV, tent, windmill, tower, barrel, chest, npc, enemy, boar, bee, snail, knightIdle, knightRun, knightAttack, knightAttack2, knightAttackCombo, knightDefend, knightCrouchAttack, knightHit, knightDeath, knightRoll, knightDash, knightJump, knightFall] = await Promise.all([
    loadFirstAvailable(candidates.ground),
    loadFirstAvailable(candidates.tileset),
    loadFirstAvailable(candidates.treeSmall),
    loadFirstAvailable(candidates.treeMedium),
    loadFirstAvailable(candidates.rock),
    loadFirstAvailable(candidates.bush),
    loadFirstAvailable(candidates.stump),
    loadFirstAvailable(candidates.house),
    loadFirstAvailable(candidates.well),
    loadFirstAvailable(candidates.bridgeH),
    loadFirstAvailable(candidates.bridgeV),
    loadFirstAvailable(candidates.fenceH),
    loadFirstAvailable(candidates.fenceV),
    loadFirstAvailable(candidates.tent),
    loadFirstAvailable(candidates.windmill),
    loadFirstAvailable(candidates.tower),
    loadFirstAvailable(candidates.barrel),
    loadFirstAvailable(candidates.chest),
    loadFirstAvailable(candidates.npc),
    loadFirstAvailable(candidates.enemy),
    loadFirstAvailable(candidates.boar),
    loadFirstAvailable(candidates.bee),
    loadFirstAvailable(candidates.snail),
    loadImage(knightPaths.idle).then(img => { console.log('✅ Knight Idle loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.run).then(img => { console.log('✅ Knight Run loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.attack).then(img => { console.log('✅ Knight Attack loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.attack2).then(img => { console.log('✅ Knight Attack2 loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.attackCombo).then(img => { console.log('✅ Knight AttackCombo loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.defend).then(img => { console.log('✅ Knight Defend loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.crouchAttack).then(img => { console.log('✅ Knight CrouchAttack loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.hit).then(img => { console.log('✅ Knight Hit loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.death).then(img => { console.log('✅ Knight Death loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.roll).then(img => { console.log('✅ Knight Roll loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.dash).then(img => { console.log('✅ Knight Dash loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.jump).then(img => { console.log('✅ Knight Jump loaded:', img.width, 'x', img.height); return img; }),
    loadImage(knightPaths.fall).then(img => { console.log('✅ Knight Fall loaded:', img.width, 'x', img.height); return img; })
  ]);

  console.log('🎮 All assets loaded successfully!');
  
  return { ground, tileset, treeSmall, treeMedium, tree: treeMedium || treeSmall, rock, bush, stump, house, well, bridgeH, bridgeV, fenceH, fenceV, tent, windmill, tower, barrel, chest, npc, enemy, boar, bee, snail,
    knight: { 
      idle: knightIdle, 
      run: knightRun, 
      attack: knightAttack, 
      attack2: knightAttack2,
      attackCombo: knightAttackCombo,
      defend: knightDefend, 
      crouchAttack: knightCrouchAttack,
      hit: knightHit, 
      death: knightDeath,
      roll: knightRoll,
      dash: knightDash,
      jump: knightJump,
      fall: knightFall
    }
  };
}


