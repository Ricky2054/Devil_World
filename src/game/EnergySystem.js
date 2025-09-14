// Handles hunger and life mechanics with seasonal modifiers
export function createEnergySystem() {
  let hunger = 0; // 0..1
  let life = 1;   // 0..1

  function feed(amount = 0.3) {
    hunger = Math.max(0, hunger - amount);
  }

  function tick(dtSeconds, modifiers = {}, inShelter = false) {
    // Hunger rises over time
    hunger = Math.min(1, hunger + 0.02 * dtSeconds);

    // Base seasonal drain
    const baseDrain = (modifiers.lifeDrainPerSec || 0) * (inShelter ? (modifiers.shelterFactor ?? 1) : 1);

    // Extra penalty when very hungry (in Summer, only drains when hungry)
    const hungryPenalty = hunger > (modifiers.hungerPenaltyThreshold ?? 0.7) ? 0.2 : 0;

    const totalDrain = baseDrain + hungryPenalty;
    life = Math.max(0, life - totalDrain * dtSeconds * 0.001);
  }

  function state() {
    return {
      hunger,
      life,
      alert: hunger < 0.5 ? 'green' : (hunger < 0.8 ? 'yellow' : 'red')
    };
  }

  return { feed, tick, state };
}


