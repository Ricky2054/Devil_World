// Procedural world generation with simple biomes and random props

export function generateWorld({ width = 200, height = 150, seed = Date.now() } = {}) {
  const rng = mulberry32(seed);

  // Tile codes (reuse existing color mapping in App.js)
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
  };

  const tiles = Array(height).fill(null).map(() => Array(width).fill(T.empty));
  const props = [];

  // Base ground: grass everywhere, add bands later
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles[y][x] = T.grass;

  // Coastal bands at top/bottom for variety
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < Math.floor(0.06 * height); y++) tiles[y][x] = T.deepWater;
    for (let y = Math.floor(0.06 * height); y < Math.floor(0.1 * height); y++) tiles[y][x] = T.shallowWater;
    for (let y = height - Math.floor(0.1 * height); y < height - Math.floor(0.06 * height); y++) tiles[y][x] = T.shallowWater;
    for (let y = height - Math.floor(0.06 * height); y < height; y++) tiles[y][x] = T.deepWater;
  }
  // Beaches
  for (let x = 0; x < width; x++) {
    if (tiles[Math.floor(0.1 * height)][x] === T.shallowWater) tiles[Math.floor(0.1 * height) + 1][x] = T.sand;
    if (tiles[height - Math.floor(0.1 * height)][x] === T.shallowWater) tiles[height - Math.floor(0.1 * height) - 1][x] = T.sand;
  }

  // Meandering rivers
  const riverMidY = carveRiver(tiles, rng, T);

  // Major clusters for forests, meadows, rocks, and a village
  placeForestClusters(tiles, rng, T, props, 14);
  placeMeadowFlowers(tiles, rng, T, 10);
  placeRockFields(tiles, rng, T, props, 8);
  const villageCenter = placeVillage(tiles, rng, T, props, riverMidY);

  // Random props: rocks, logs, treasure spots
  scatterProps(tiles, rng, T, props);

  // Try to add a few simple bridges across shallow water
  addBridges(tiles, rng, T, props);

  // Paths from spawn to village and river
  const spawnTile = { x: Math.floor(width * 0.5), y: Math.floor(height * 0.65) };
  if (villageCenter) drawPath(tiles, spawnTile, villageCenter, T);
  drawPath(tiles, spawnTile, { x: Math.floor(width * 0.25), y: riverMidY }, T);

  // Player spawn roughly center
  const spawn = { x: spawnTile.x * 8, y: spawnTile.y * 8 };

  return { tiles, spawn, props };
}

function carveRiver(tiles, rng, T) {
  const h = tiles.length, w = tiles[0].length;
  let x = Math.floor(w * (0.25 + rng() * 0.5));
  const midY = Math.floor(h / 2);
  for (let y = 0; y < h; y++) {
    const width = 2 + Math.floor(rng() * 2 + Math.abs(y - midY) / (h / 10));
    for (let dx = -width; dx <= width; dx++) {
      const xx = x + dx;
      if (xx >= 0 && xx < w) tiles[y][xx] = T.shallowWater;
    }
    x += Math.floor(rng() * 3) - 1; // drift
    x = Math.max(1, Math.min(w - 2, x));
  }
  return midY;
}

function placeForestClusters(tiles, rng, T, props, clusters) {
  const h = tiles.length, w = tiles[0].length;
  for (let i = 0; i < clusters; i++) {
    const cx = Math.floor(rng() * w), cy = Math.floor(rng() * h);
    const r = 8 + Math.floor(rng() * 14);
    for (let y = Math.max(1, cy - r); y < Math.min(h - 1, cy + r); y++) {
      for (let x = Math.max(1, cx - r); x < Math.min(w - 1, cx + r); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < r && (tiles[y][x] === T.grass || tiles[y][x] === T.brightGrass) && rng() < 0.55) {
          props.push({ x: x * 8, y: y * 8, type: rng() < 0.6 ? 'treeSmall' : 'treeMedium', block: true });
        }
      }
    }
  }
}

function scatterProps(tiles, rng, T, props) {
  const h = tiles.length, w = tiles[0].length;
  for (let i = 0; i < (w * h) / 80; i++) {
    const y = Math.floor(rng() * h);
    const x = Math.floor(rng() * w);
    if (tiles[y][x] === T.grass || tiles[y][x] === T.brightGrass) {
      const r = rng();
      if (r < 0.2) props.push({ x: x * 8, y: y * 8, type: 'rock', block: true });
      else if (r < 0.45) props.push({ x: x * 8, y: y * 8, type: 'bush', block: false });
      else if (r < 0.6) props.push({ x: x * 8, y: y * 8, type: 'stump', block: true });
      else if (r < 0.7) props.push({ x: x * 8, y: y * 8, type: 'barrel', block: true });
      else if (r < 0.8) props.push({ x: x * 8, y: y * 8, type: 'chest', block: true });
      else if (r < 0.9) props.push({ x: x * 8, y: y * 8, type: 'tent', block: true });
      else props.push({ x: x * 8, y: y * 8, type: 'house', block: true });
    }
  }
}

function addBridges(tiles, rng, T, props) {
  const h = tiles.length, w = tiles[0].length;
  for (let n = 0; n < 6; n++) {
    const y = Math.floor(rng() * h);
    for (let x = 2; x < w - 2; x++) {
      if (tiles[y][x] === T.shallowWater && (tiles[y][x - 1] === T.grass || tiles[y][x - 1] === T.sand) && (tiles[y][x + 1] === T.grass || tiles[y][x + 1] === T.sand)) {
        props.push({ x: x * 8 - 12, y: y * 8 - 2, type: 'bridgeH', block: false });
        break;
      }
    }
  }
}

function placeMeadowFlowers(tiles, rng, T, patches) {
  const h = tiles.length, w = tiles[0].length;
  for (let i = 0; i < patches; i++) {
    const cx = Math.floor(rng() * w), cy = Math.floor(rng() * h);
    const r = 4 + Math.floor(rng() * 8);
    for (let y = Math.max(1, cy - r); y < Math.min(h - 1, cy + r); y++) {
      for (let x = Math.max(1, cx - r); x < Math.min(w - 1, cx + r); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < r && (tiles[y][x] === T.grass || tiles[y][x] === T.brightGrass) && rng() < 0.2) tiles[y][x] = T.magic;
      }
    }
  }
}

function placeRockFields(tiles, rng, T, props, fields) {
  const h = tiles.length, w = tiles[0].length;
  for (let i = 0; i < fields; i++) {
    const cx = Math.floor(rng() * w), cy = Math.floor(rng() * h);
    const r = 5 + Math.floor(rng() * 10);
    for (let y = Math.max(1, cy - r); y < Math.min(h - 1, cy + r); y++) {
      for (let x = Math.max(1, cx - r); x < Math.min(w - 1, cx + r); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < r && (tiles[y][x] === T.grass || tiles[y][x] === T.brightGrass) && rng() < 0.4) props.push({ x: x * 8, y: y * 8, type: 'rock', block: true });
      }
    }
  }
}

function placeVillage(tiles, rng, T, props, riverMidY) {
  const h = tiles.length, w = tiles[0].length;
  // Choose side of river for village
  const cx = Math.floor(w * (rng() < 0.5 ? 0.75 : 0.25));
  const cy = Math.max(10, Math.min(h - 10, riverMidY + (rng() * 40 - 20)));
  const width = 6 + Math.floor(rng() * 4);
  const height = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const x = cx + i, y = cy + j;
      if (x >= 0 && x < w && y >= 0 && y < h) {
        if (tiles[y] && tiles[y][x] !== T.shallowWater) tiles[y][x] = T.brightGrass;
      }
    }
  }
  // Houses & well
  for (let i = 0; i < 4 + Math.floor(rng() * 3); i++) props.push({ x: (cx + 1 + i) * 8, y: (cy + 1 + (i % 2)) * 8, type: 'house', block: true });
  props.push({ x: (cx + Math.floor(width / 2)) * 8, y: (cy + Math.floor(height / 2)) * 8, type: 'well', block: true });
  // Fences around
  for (let i = 0; i < width; i++) props.push({ x: (cx + i) * 8, y: cy * 8, type: 'fenceH', block: true });
  for (let i = 0; i < width; i++) props.push({ x: (cx + i) * 8, y: (cy + height) * 8, type: 'fenceH', block: true });
  for (let j = 0; j < height; j++) props.push({ x: cx * 8, y: (cy + j) * 8, type: 'fenceV', block: true });
  for (let j = 0; j < height; j++) props.push({ x: (cx + width) * 8, y: (cy + j) * 8, type: 'fenceV', block: true });
  // Landmark
  props.push({ x: (cx + width + 2) * 8, y: (cy + 1) * 8, type: 'windmill', block: true });
  return { x: cx, y: cy };
}

function drawPath(tiles, a, b, T) {
  const points = bresenham(a.x, a.y, b.x, b.y);
  for (const [x, y] of points) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) tiles[y][x] = T.dirt;
  }
}

function bresenham(x0, y0, x1, y1) {
  const points = [];
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return points;
}

// small PRNG for repeatable maps
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


