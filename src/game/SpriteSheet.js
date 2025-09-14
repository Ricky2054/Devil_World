// Sprite sheet animation handler for Main Character
export class SpriteSheet {
  constructor(image, frameWidth, frameHeight, framesPerRow = 10) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.framesPerRow = framesPerRow;
    this.currentFrame = 0;
    this.animationSpeed = 0.15;
    this.animationTimer = 0;
  }

  // Get frame coordinates from sprite sheet
  getFrameCoords(frameIndex) {
    const row = Math.floor(frameIndex / this.framesPerRow);
    const col = frameIndex % this.framesPerRow;
    return {
      x: col * this.frameWidth,
      y: row * this.frameHeight,
      width: this.frameWidth,
      height: this.frameHeight
    };
  }

  // Update animation frame
  update(deltaTime = 1) {
    this.animationTimer += deltaTime * this.animationSpeed;
    if (this.animationTimer >= 1) {
      this.currentFrame++;
      this.animationTimer = 0;
    }
  }

  // Draw current frame
  draw(ctx, x, y, width, height, frameIndex = null, flipX = false) {
    if (!this.image) return;
    
    const frame = frameIndex !== null ? frameIndex : this.currentFrame;
    const coords = this.getFrameCoords(frame);
    
    ctx.save();
    if (flipX) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.image,
        coords.x, coords.y, coords.width, coords.height,
        -x - width, y, width, height
      );
    } else {
      ctx.drawImage(
        this.image,
        coords.x, coords.y, coords.width, coords.height,
        x, y, width, height
      );
    }
    ctx.restore();
  }

  // Reset animation
  reset() {
    this.currentFrame = 0;
    this.animationTimer = 0;
  }
}
