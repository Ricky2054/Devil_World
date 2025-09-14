// Authored 8x8-tile maps for an open world. Tile legend aligns with App.js colors:
// 0 empty, 1 dirt/path, 2 sand, 3 grass, 4 bright grass, 5 stone, 6 deep water,
// 7 shallow water, 9..14 buildings, 15 trunk, 16 leaves, 18 logs, 22 magic, 23 neon

function makeTiles(width, height, fill = 0) {
	const tiles = Array(height).fill(0).map(() => Array(width).fill(fill));
	return tiles;
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function buildIsland() {
	const width = 960, height = 720;
	const tiles = makeTiles(width, height, 6);
	// huge island with varied terrain
	for (let r = 40; r < 680; r++) {
		for (let c = 20; c < 940; c++) {
			const d = Math.min(r - 40, 679 - r, c - 20, 939 - c);
			if (d < 0) continue;
			// varied beach/grass zones
			if (d < 4) tiles[r][c] = 2; // beach
			else if (d < 8) tiles[r][c] = Math.random() > 0.7 ? 2 : 4; // mixed beach/bright grass
			else if (d < 20) tiles[r][c] = 4; // bright grass
			else tiles[r][c] = 3; // grass
		}
	}
	// coastal road around island
	for (let c = 50; c < 910; c++) { tiles[70][c] = 1; tiles[71][c] = 1; }
	for (let c = 50; c < 910; c++) { tiles[650][c] = 1; tiles[651][c] = 1; }
	for (let r = 70; r < 650; r++) { tiles[r][50] = 1; tiles[r][51] = 1; }
	for (let r = 70; r < 650; r++) { tiles[r][910] = 1; tiles[r][911] = 1; }
	// cross roads
	for (let c = 50; c < 910; c++) { tiles[360][c] = 1; tiles[361][c] = 1; }
	for (let r = 70; r < 650; r++) { tiles[r][480] = 1; tiles[r][481] = 1; }
	// rock formations
	for (let i = 0; i < 50; i++) {
		const r = 100 + Math.floor(Math.random() * 520);
		const c = 100 + Math.floor(Math.random() * 760);
		if (tiles[r] && tiles[r][c] === 3) {
			for (let y = r; y < r + 2; y++) for (let x = c; x < c + 3; x++) if (tiles[y] && tiles[y][x]) tiles[y][x] = 5;
		}
	}
	// palm groves
	for (let i = 0; i < 300; i++) {
		const r = 80 + Math.floor(Math.random() * 560);
		const c = 80 + Math.floor(Math.random() * 800);
		if (tiles[r] && tiles[r][c] === 3 && tiles[r][c] !== 1) {
			for (let y = r; y < r + 3 && y < height; y++) for (let x = c; x < c + 2 && x < width; x++) tiles[y][x] = 15;
			for (let y = r - 2; y < r + 1 && y >= 0; y++) for (let x = c - 1; x < c + 3 && x >= 0 && x < width; x++) if (tiles[y] && tiles[y][x] === 0) tiles[y][x] = 16;
		}
	}
	// props - varied island structures
	const props = [
		// docks and bridges
		{ type: 'bridgeH', x: 480*8, y: 70*8, block: false },
		{ type: 'bridgeH', x: 480*8, y: 650*8, block: false },
		{ type: 'bridgeV', x: 50*8, y: 360*8, block: false },
		{ type: 'bridgeV', x: 910*8, y: 360*8, block: false },
		// beach huts
		{ type: 'house', x: 200*8, y: 100*8, block: true },
		{ type: 'house', x: 700*8, y: 150*8, block: true },
		{ type: 'house', x: 150*8, y: 600*8, block: true },
		{ type: 'house', x: 800*8, y: 580*8, block: true },
		// wells and barrels
		{ type: 'well', x: 300*8, y: 300*8, block: true },
		{ type: 'well', x: 600*8, y: 400*8, block: true }
	];
	// random flora
	for (let i = 0; i < 200; i++) {
		const types = ['treeMedium', 'treeSmall', 'bush', 'rock'];
		props.push({ type: types[Math.floor(Math.random() * types.length)], x: (100 + Math.floor(Math.random() * 760)) * 8, y: (100 + Math.floor(Math.random() * 520)) * 8, block: Math.random() > 0.3 });
	}
	// treasures
	const treasures = [];
	for (let i = 0; i < 30; i++) {
		treasures.push({ x: (200 + Math.floor(Math.random() * 560)) * 8, y: (200 + Math.floor(Math.random() * 320)) * 8, type: 'avax', collected: false, value: 0.01 + Math.random() * 0.02, name: `Treasure ${i+1}` });
	}
	// NPCs
	const npcs = [
		{ x: 120*8, y: 120*8, name: 'Marina', politicalAffiliation: 'Neutral', color: '#2F4F4F', dialogueTree: ['The tide brings fortune.', 'Careful with storms.'] },
		{ x: 300*8, y: 400*8, name: 'Fisher', politicalAffiliation: 'Guild', color: '#4682B4', dialogueTree: ['Good catch today!', 'The sea provides.'] },
		{ x: 600*8, y: 200*8, name: 'Hermit', politicalAffiliation: 'Free', color: '#8B4513', dialogueTree: ['Solitude is peace.', 'The island knows secrets.'] }
	];
	return {
		tiles, spawn: { x: 120 * 8, y: 120 * 8 }, name: 'Sunrise Island', description: 'Beaches, palms and gentle shores.', props, treasures, npcs
	};
}

function buildForest() {
	const width = 960, height = 720;
	const tiles = makeTiles(width, height, 3);
	// winding river system
	for (let r = 30; r < height - 20; r++) {
		for (let c = 100; c < 140; c++) tiles[r][c] = (c === 100 || c === 139) ? 7 : 6;
	}
	for (let r = 200; r < 500; r++) {
		for (let c = 400; c < 440; c++) tiles[r][c] = (c === 400 || c === 439) ? 7 : 6;
	}
	// forest road network
	for (let c = 16; c < width - 16; c++) { tiles[140][c] = 1; tiles[141][c] = 1; }
	for (let r = 40; r < 680; r++) { tiles[r][60] = 1; tiles[r][61] = 1; }
	for (let r = 200; r < 680; r++) { tiles[r][300] = 1; tiles[r][301] = 1; }
	for (let r = 300; r < 680; r++) { tiles[r][500] = 1; tiles[r][501] = 1; }
	// clearings
	for (let i = 0; i < 20; i++) {
		const cr = 100 + Math.floor(Math.random() * 520);
		const cc = 100 + Math.floor(Math.random() * 760);
		for (let r = cr; r < cr + 20; r++) for (let c = cc; c < cc + 20; c++) if (tiles[r] && tiles[r][c]) tiles[r][c] = 4;
	}
	// dense tree coverage
	for (let r = 50; r < 670; r += 6) for (let c = 20; c < 940; c += 6) if (Math.random() > 0.2 && tiles[r] && tiles[r][c] !== 1) tiles[r][c] = 15;
	// props - forest structures
	const props = [
		// ranger stations
		{ type: 'house', x: 150*8, y: 150*8, block: true },
		{ type: 'house', x: 400*8, y: 350*8, block: true },
		{ type: 'house', x: 700*8, y: 500*8, block: true },
		// watchtowers
		{ type: 'tower', x: 200*8, y: 200*8, block: true },
		{ type: 'tower', x: 600*8, y: 400*8, block: true },
		// bridges over rivers
		{ type: 'bridgeH', x: 120*8, y: 140*8, block: false },
		{ type: 'bridgeH', x: 420*8, y: 300*8, block: false },
		// camps
		{ type: 'tent', x: 300*8, y: 250*8, block: false },
		{ type: 'tent', x: 500*8, y: 450*8, block: false },
		{ type: 'barrel', x: 250*8, y: 200*8, block: false },
		{ type: 'chest', x: 450*8, y: 350*8, block: false }
	];
	// massive tree coverage
	for (let i = 0; i < 500; i++) {
		const types = ['treeMedium', 'treeSmall', 'bush', 'stump'];
		const x = Math.floor(Math.random() * 960) * 8;
		const y = Math.floor(Math.random() * 720) * 8;
		props.push({ type: types[Math.floor(Math.random() * types.length)], x, y, block: Math.random() > 0.2 });
	}
	// treasures
	const treasures = [];
	for (let i = 0; i < 25; i++) {
		treasures.push({ x: Math.floor(Math.random() * 960) * 8, y: Math.floor(Math.random() * 720) * 8, type: 'avax', collected: false, value: 0.01 + Math.random() * 0.02, name: `Forest Cache ${i+1}` });
	}
	// NPCs
	const npcs = [
		{ x: 56*8, y: 144*8, name: 'Ranger', politicalAffiliation: 'Green', color: '#228B22', dialogueTree: ['Respect the woods.', 'Have you seen the river stones?'] },
		{ x: 200*8, y: 300*8, name: 'Druid', politicalAffiliation: 'Nature', color: '#006400', dialogueTree: ['The forest speaks.', 'Ancient magic flows here.'] },
		{ x: 400*8, y: 500*8, name: 'Hunter', politicalAffiliation: 'Free', color: '#8B4513', dialogueTree: ['Track carefully.', 'The beasts grow restless.'] }
	];
	return {
		tiles, spawn: { x: 70 * 8, y: 144 * 8 }, name: 'Whispering Forest', description: 'Dense trees, narrow paths, and a quiet river.', props, treasures, npcs
	};
}

function buildMountains() {
	const width = 960, height = 720;
	const tiles = makeTiles(width, height, 4);
	// layered mountain terrain
	for (let r = 150; r < height; r++) for (let c = 0; c < width; c++) tiles[r][c] = 6; // base rock
	for (let r = 100; r < 150; r++) for (let c = 50; c < width-50; c++) if (Math.random() > 0.3) tiles[r][c] = 5; // stone
	// dramatic peaks
	for (let i = 0; i < 50; i++) {
		const cx = 60 + Math.floor(Math.random() * 840);
		const cy = 80 + Math.floor(Math.random() * 100);
		const size = 15 + Math.floor(Math.random() * 25);
		for (let r = cy; r < cy + size && r < height; r++) {
			for (let c = cx; c < cx + size && c < width; c++) {
				const dist = Math.sqrt((r-cy)*(r-cy) + (c-cx)*(c-cx));
				if (dist < size/2) tiles[r][c] = 7; // peak stone
			}
		}
	}
	// winding mountain roads
	for (let c = 20; c < width - 20; c += 2) if (c % 6 < 2) tiles[200][c] = 1;
	for (let r = 200; r < 600; r += 2) if (r % 8 < 2) tiles[r][300] = 1;
	for (let c = 300; c < width - 20; c += 2) if (c % 5 < 2) tiles[400][c] = 1;
	// mountain infrastructure
	const props = [
		// mining camps
		{ type: 'house', x: 150*8, y: 250*8, block: true },
		{ type: 'house', x: 400*8, y: 180*8, block: true },
		{ type: 'house', x: 700*8, y: 220*8, block: true },
		// watchtowers on peaks
		{ type: 'tower', x: 200*8, y: 100*8, block: true },
		{ type: 'tower', x: 500*8, y: 120*8, block: true },
		{ type: 'tower', x: 800*8, y: 90*8, block: true },
		// cave entrances (barrels as markers)
		{ type: 'barrel', x: 250*8, y: 300*8, block: false },
		{ type: 'barrel', x: 600*8, y: 350*8, block: false },
		{ type: 'chest', x: 450*8, y: 280*8, block: false }
	];
	// rocky terrain
	for (let i = 0; i < 400; i++) {
		props.push({ type: 'rock', x: Math.floor(Math.random() * 960) * 8, y: Math.floor(Math.random() * 720) * 8, block: Math.random() > 0.1 });
	}
	// treasures
	const treasures = [];
	for (let i = 0; i < 15; i++) {
		treasures.push({ x: Math.floor(Math.random() * 960) * 8, y: Math.floor(Math.random() * 720) * 8, type: 'avax', collected: false, value: 0.02 + Math.random() * 0.03, name: `Peak Relic ${i+1}` });
	}
	// NPCs
	const npcs = [
		{ x: 32*8, y: 144*8, name: 'Climber', politicalAffiliation: 'Free', color: '#9E9E9E', dialogueTree: ['The air is thin.', 'The view is worth it.'] },
		{ x: 300*8, y: 200*8, name: 'Miner', politicalAffiliation: 'Guild', color: '#8B4513', dialogueTree: ['Rich veins here.', 'Gold in them hills.'] },
		{ x: 600*8, y: 400*8, name: 'Hermit', politicalAffiliation: 'Mystic', color: '#483D8B', dialogueTree: ['Solitude teaches wisdom.', 'The peaks hold secrets.'] }
	];
	return {
		tiles, spawn: { x: 16 * 8, y: 140 * 8 }, name: 'Crypto Peaks', description: 'Windswept ridges and narrow passes.', props, treasures, npcs
	};
}

function buildVillage() {
	const width = 960, height = 720;
	const tiles = makeTiles(width, height, 4);
	// main village roads (wider)
	for (let r = 40; r < height; r += 60) {
		for (let c = 0; c < width; c++) { tiles[r][c] = 1; tiles[r+1][c] = 1; }
	}
	for (let c = 30; c < width; c += 80) {
		for (let r = 0; r < height; r++) { tiles[r][c] = 1; tiles[r][c+1] = 1; }
	}
	// market square (center)
	for (let r = 350; r < 370; r++) for (let c = 470; c < 490; c++) tiles[r][c] = 12;
	// village green areas
	for (let r = 100; r < 150; r++) for (let c = 100; c < 200; c++) tiles[r][c] = 4;
	for (let r = 500; r < 600; r++) for (let c = 700; c < 850; c++) tiles[r][c] = 4;
	// well-planned housing
	const props = [
		// town hall
		{ type: 'tower', x: 480*8, y: 360*8, block: true },
		// market buildings
		{ type: 'house', x: 450*8, y: 320*8, block: true },
		{ type: 'house', x: 510*8, y: 320*8, block: true },
		{ type: 'house', x: 450*8, y: 400*8, block: true },
		{ type: 'house', x: 510*8, y: 400*8, block: true },
		// windmill
		{ type: 'windmill', x: 200*8, y: 200*8, block: true }
	];
	// residential houses
	for (let r = 60; r < 680; r += 80) {
		for (let c = 50; c < 910; c += 100) {
			if (tiles[r] && tiles[r][c] !== 1) {
				props.push({ type: 'house', x: c*8, y: r*8, block: true });
				// gardens
				props.push({ type: 'bush', x: (c+5)*8, y: (r+5)*8, block: false });
			}
		}
	}
	// market infrastructure
	for (let i = 0; i < 80; i++) {
		const types = ['barrel', 'chest', 'well'];
		props.push({ type: types[Math.floor(Math.random() * types.length)], x: (100 + Math.floor(Math.random() * 760)) * 8, y: (100 + Math.floor(Math.random() * 520)) * 8, block: false });
	}
	// treasures
	const treasures = [];
	for (let i = 0; i < 20; i++) {
		treasures.push({ x: Math.floor(Math.random() * 960) * 8, y: Math.floor(Math.random() * 720) * 8, type: 'avax', collected: false, value: 0.01 + Math.random() * 0.015, name: `Village Coin ${i+1}` });
	}
	// NPCs
	const npcs = [
		{ x: 40*8, y: 44*8, name: 'Merchant', politicalAffiliation: 'Guild', color: '#B8860B', dialogueTree: ['Fine wares!', 'Bring me relics, get tokens.'] },
		{ x: 200*8, y: 200*8, name: 'Blacksmith', politicalAffiliation: 'Craft', color: '#696969', dialogueTree: ['Strong steel here.', 'What needs forging?'] },
		{ x: 400*8, y: 300*8, name: 'Baker', politicalAffiliation: 'Guild', color: '#DEB887', dialogueTree: ['Fresh bread daily!', 'Hungry traveler?'] },
		{ x: 600*8, y: 400*8, name: 'Mayor', politicalAffiliation: 'Order', color: '#4B0082', dialogueTree: ['Welcome to our village.', 'Peace and prosperity.'] }
	];
	return {
		tiles, spawn: { x: 36 * 8, y: 44 * 8 }, name: 'Harbor Village', description: 'Homes, market stalls, and friendly faces.', props, treasures, npcs
	};
}

function buildDowntown() {
	const width = 960, height = 720;
	const tiles = makeTiles(width, height, 4);
	// grid
	for (let r = 0; r < height; r++) {
		if (r % 24 === 0 || r % 24 === 1) {
			for (let c = 0; c < width; c++) tiles[r][c] = 1;
		}
	}
	for (let c = 0; c < width; c++) {
		if (c % 32 === 0 || c % 32 === 1) {
			for (let r = 0; r < height; r++) tiles[r][c] = 1;
		}
	}
	// sidewalks next to roads
	for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
		if (tiles[r][c] === 1) continue;
		if (tiles[r]?.[c-1] === 1 || tiles[r]?.[c+1] === 1 || tiles[r-1]?.[c] === 1 || tiles[r+1]?.[c] === 1) tiles[r][c] = 12;
	}
	return {
		tiles,
		spawn: { x: 20 * 8, y: 20 * 8 },
		name: 'Downtown Neon',
		description: 'Neon signs, blocks and asphalt.',
		// urban infrastructure
		props: (() => {
			const props = [
				// skyscrapers in center
				{ type: 'tower', x: 400*8, y: 300*8, block: true },
				{ type: 'tower', x: 500*8, y: 350*8, block: true },
				{ type: 'tower', x: 450*8, y: 400*8, block: true },
				// office buildings
				{ type: 'windmill', x: 200*8, y: 200*8, block: true }, // repurpose as office
				{ type: 'windmill', x: 700*8, y: 500*8, block: true }
			];
			// city blocks with mixed buildings
			for (let r = 60; r < 660; r += 60) {
				for (let c = 60; c < 900; c += 80) {
					if (tiles[r] && tiles[r][c] !== 1 && tiles[r][c] !== 12) {
						const buildingTypes = ['house', 'tower'];
						props.push({ type: buildingTypes[Math.floor(Math.random() * buildingTypes.length)], x: c*8, y: r*8, block: true });
						// street furniture
						if (Math.random() > 0.7) props.push({ type: 'barrel', x: (c+8)*8, y: (r+8)*8, block: false });
					}
				}
			}
			return props;
		})(),
		treasures: (() => {
			const treasures = [];
			for (let i = 0; i < 40; i++) {
				treasures.push({ x: Math.floor(Math.random() * 960) * 8, y: Math.floor(Math.random() * 720) * 8, type: 'avax', collected: false, value: 0.02 + Math.random() * 0.04, name: `Crypto Cache ${i+1}` });
			}
			return treasures;
		})(),
		npcs: [
			{ x: 32*8, y: 24*8, name: 'Hacker', politicalAffiliation: 'Cypher', color: '#4B0082', dialogueTree: ['Nodes hum at night.', 'Proofs or it didn\'t happen.'] },
			{ x: 200*8, y: 200*8, name: 'Trader', politicalAffiliation: 'Crypto', color: '#FFD700', dialogueTree: ['Buy low, sell high.', 'The market never sleeps.'] },
			{ x: 500*8, y: 300*8, name: 'Developer', politicalAffiliation: 'Tech', color: '#00CED1', dialogueTree: ['Code is law.', 'Decentralization is freedom.'] },
			{ x: 700*8, y: 500*8, name: 'Investor', politicalAffiliation: 'Capital', color: '#32CD32', dialogueTree: ['Diamond hands.', 'HODL forever.'] }
		]
	};
}

export function getOpenWorld() {
	const island = buildIsland();
	const forest = buildForest();
	const mountains = buildMountains();
	const village = buildVillage();
	const downtown = buildDowntown();

	// Link neighbors (wrap for exploration in all directions)
	const areas = {
		island: { ...island, neighbors: { east: 'forest', west: 'mountains', south: 'village', north: 'downtown' } },
		forest: { ...forest, neighbors: { west: 'island', east: 'mountains', south: 'village', north: 'downtown' } },
		mountains: { ...mountains, neighbors: { east: 'island', west: 'forest', south: 'village', north: 'downtown' } },
		village: { ...village, neighbors: { north: 'island', east: 'forest', west: 'mountains', south: 'downtown' } },
		downtown: { ...downtown, neighbors: { south: 'island', east: 'forest', west: 'mountains', north: 'village' } }
	};

	return { startArea: 'island', areas };
}

// New function to get the Mother World (the large pixelated world)
export function getMotherWorldMap() {
	// Import the mother world function
	const { getMotherWorld } = require('./MotherWorldMap.js');
	const motherWorld = getMotherWorld();
	
	const areas = {
		motherworld: motherWorld
	};
	
	return { startArea: 'motherworld', areas };
}

// Back-compat simple presets
const PRESETS = {
	forest: buildForest(),
	river: buildIsland(),
	village: buildVillage(),
	mini: buildIsland(),
};

export function getPresetMap(name = 'forest') {
	return PRESETS[name] || PRESETS.forest;
}

