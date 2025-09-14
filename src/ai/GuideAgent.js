// Simple rule-based mentor hints
export function nextHint(state) {
  const { hunger, life } = state.energy;
  const { season } = state;
  const { inShelter, thunderNearby, nearbyFood } = state;

  if (hunger > 0.85) return 'Find food immediately (apples in forests).';
  if (season === 'Winter' && !inShelter) return 'Seek a hut or cave to reduce cold.';
  if (season === 'Rain' && thunderNearby) return 'Avoid open fields; lightning strikes ahead!';
  if (nearbyFood) return 'Pick those apples to restore energy.';
  if (life < 0.3) return 'Rest in shelter to stabilize.';
  return 'Explore forests for food, caves for shelter, and watch the skies.';
}


