// Karma and XP tracker
export function createKarmaSystem() {
  let xp = 0;
  let karma = 0;

  function log(eventType) {
    const delta = { help: +5, shelter: +2, ignore_hunger: -3, greed: -2 }[eventType] ?? 0;
    karma += delta;
  }

  function daySurvived() {
    xp += 10;
    karma += 1;
  }

  function get() { return { xp, karma }; }

  return { log, daySurvived, get };
}


