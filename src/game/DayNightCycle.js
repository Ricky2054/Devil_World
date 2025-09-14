// Day/Night Cycle System for Fantasy Knight Adventure
export class DayNightCycle {
  constructor() {
    this.timeOfDay = 0; // 0-24 hours (0 = midnight, 12 = noon)
    this.dayDuration = 300000; // 5 minutes = 1 full day cycle (300 seconds)
    this.startTime = Date.now();
    this.isNight = false;
    this.previousIsNight = false;
    this.nightDangerMultiplier = 2.5; // Enemies are 2.5x more dangerous at night
    this.nightSpawnMultiplier = 1.8; // 80% more enemy spawns at night
    this.transitionDuration = 30000; // 30 seconds for sunrise/sunset transition
  }

  update() {
    const elapsed = Date.now() - this.startTime;
    const cycleProgress = (elapsed % this.dayDuration) / this.dayDuration;
    this.timeOfDay = cycleProgress * 24; // Convert to 0-24 hour format
    
    this.previousIsNight = this.isNight;
    this.isNight = this.timeOfDay >= 20 || this.timeOfDay < 6; // Night from 8 PM to 6 AM
    
    // Detect day/night transitions
    if (this.isNight !== this.previousIsNight) {
      return this.isNight ? 'nightfall' : 'dawn';
    }
    return null;
  }

  getTimeString() {
    const hours = Math.floor(this.timeOfDay);
    const minutes = Math.floor((this.timeOfDay - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  getSkyColor() {
    const hour = this.timeOfDay;
    
    // Define color points throughout the day
    if (hour >= 6 && hour < 7) {
      // Dawn (6-7 AM) - Orange/Pink
      const progress = (hour - 6);
      return this.interpolateColor('#1a0033', '#ff6600', progress);
    } else if (hour >= 7 && hour < 8) {
      // Early Morning (7-8 AM) - Orange to Blue
      const progress = (hour - 7);
      return this.interpolateColor('#ff6600', '#87CEEB', progress);
    } else if (hour >= 8 && hour < 18) {
      // Day (8 AM - 6 PM) - Blue sky
      return '#87CEEB';
    } else if (hour >= 18 && hour < 19) {
      // Sunset (6-7 PM) - Blue to Orange
      const progress = (hour - 18);
      return this.interpolateColor('#87CEEB', '#ff4500', progress);
    } else if (hour >= 19 && hour < 20) {
      // Dusk (7-8 PM) - Orange to Dark
      const progress = (hour - 19);
      return this.interpolateColor('#ff4500', '#1a0033', progress);
    } else {
      // Night (8 PM - 6 AM) - Dark purple/blue
      return '#1a0033';
    }
  }

  getLightLevel() {
    const hour = this.timeOfDay;
    
    if (hour >= 6 && hour < 8) {
      // Dawn transition (6-8 AM)
      return Math.min(1, (hour - 6) / 2);
    } else if (hour >= 8 && hour < 18) {
      // Full daylight (8 AM - 6 PM)
      return 1;
    } else if (hour >= 18 && hour < 20) {
      // Dusk transition (6-8 PM)
      return Math.max(0.2, 1 - ((hour - 18) / 2));
    } else {
      // Night (8 PM - 6 AM)
      return 0.2; // Very dim but not completely black
    }
  }

  getEnemyDangerMultiplier() {
    if (this.isNight) {
      return this.nightDangerMultiplier;
    }
    return 1;
  }

  getEnemySpawnMultiplier() {
    if (this.isNight) {
      return this.nightSpawnMultiplier;
    }
    return 1;
  }

  // Interpolate between two hex colors
  interpolateColor(color1, color2, factor) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Get atmospheric effects based on time
  getAtmosphericEffects() {
    const effects = [];
    const hour = this.timeOfDay;
    
    if (this.isNight) {
      // Add stars and moon at night
      effects.push('stars', 'moon');
      
      // Add fog during late night/early morning
      if (hour >= 2 && hour < 6) {
        effects.push('fog');
      }
    } else {
      // Add sun during day
      effects.push('sun');
      
      // Add clouds during day
      if (Math.random() < 0.3) {
        effects.push('clouds');
      }
    }
    
    return effects;
  }

  // Get ambient sound recommendations
  getAmbientSounds() {
    if (this.isNight) {
      return ['night_crickets', 'owl_hoots', 'wind_howl'];
    } else {
      return ['birds_chirping', 'wind_gentle', 'nature_ambient'];
    }
  }

  // Check if it's a dangerous time (affects enemy behavior)
  isDangerousTime() {
    return this.isNight;
  }

  // Get visibility range (affects how far player can see)
  getVisibilityRange() {
    const lightLevel = this.getLightLevel();
    return Math.floor(100 + (lightLevel * 200)); // 100-300 pixel visibility range
  }

  // Reset cycle (for new game)
  reset(startAtTime = 8) {
    this.startTime = Date.now() - ((startAtTime / 24) * this.dayDuration);
    this.timeOfDay = startAtTime;
    this.isNight = startAtTime >= 20 || startAtTime < 6;
    this.previousIsNight = this.isNight;
  }
}
