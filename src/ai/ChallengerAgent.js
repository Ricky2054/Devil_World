// Minimal challenger AI that sometimes spawns a hazard (e.g., lightning)
// decideHazard returns null or { type: 'lightning', x, y }

export function createChallengerAgent() {
  let cooldown = 0;
  return {
    step(dtSeconds, state) {
      cooldown = Math.max(0, cooldown - dtSeconds);
      const difficulty = Math.min(1, (state.minutesPlayed ?? 0) / 10);
      if (state.season === 'Rain' && cooldown <= 0) {
        // 10% base chance each second, scaled by difficulty
        const chance = 0.1 * (0.5 + difficulty);
        if (Math.random() < chance * dtSeconds) {
          cooldown = 3; // seconds between hazards
          // Spawn near player but offset
          const x = state.player.x + (Math.random() * 200 - 100);
          const y = state.player.y + (Math.random() * 120 - 60);
          return { type: 'lightning', x, y };
        }
      }
      return null;
    }
  };
}


