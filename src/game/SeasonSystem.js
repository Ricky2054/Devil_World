// Minimal season cycle system for 2D game
export const Season = { Summer: 'Summer', Winter: 'Winter', Rain: 'Rain' };

export function createSeasonSystem(options = {}) {
  const cycleSeconds = options.cycleSeconds ?? 180; // total time per season
  const order = [Season.Summer, Season.Winter, Season.Rain];
  let elapsed = 0;
  let activeIdx = 0;

  function getSeason() {
    return order[activeIdx];
  }

  function getModifiers() {
    const season = getSeason();
    if (season === Season.Summer) {
      return { lifeDrainPerSec: 0, hungerPenaltyThreshold: 0.7, foodBonus: 1.2 };
    }
    if (season === Season.Winter) {
      return { lifeDrainPerSec: 0.8, shelterFactor: 0.3, foodBonus: 1.0 };
    }
    // Rain
    return { lifeDrainPerSec: 0.4, lightning: true, foodBonus: 1.1 };
  }

  return {
    tick(dtSeconds) {
      elapsed += dtSeconds;
      if (elapsed >= cycleSeconds) {
        elapsed = 0;
        activeIdx = (activeIdx + 1) % order.length;
      }
    },
    get: getSeason,
    modifiers: getModifiers,
    progress() {
      return Math.min(1, elapsed / cycleSeconds);
    }
  };
}


