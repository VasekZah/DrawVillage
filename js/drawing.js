import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { SPRITE_GENERATORS } from './graphics.js';

export const spriteCache = new Map();

// ... (colorizeSprite funkce zůstává stejná)

export const SpriteDrawer = {
    generateAndCacheSprites() {
        // ... (tato funkce zůstává stejná)
    },

    draw(ctx, entity) {
        let spriteId;
        if (entity.type === 'settler' && entity.job !== 'unemployed') {
            spriteId = `settler_${entity.job}`;
        } else {
            spriteId = entity.type;
        }
        
        const sprite = spriteCache.get(spriteId);
        if (!sprite) return;
        
        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        const drawWidth = entity.radius * 2.5;
        const drawHeight = (sprite.height / sprite.width) * drawWidth;
        let drawY = -drawHeight + (entity.radius * 0.4);

        // Aplikace animace poskakování při chůzi
        if (entity instanceof Humanoid && entity.isMoving) {
            const bounceHeight = entity.radius * 0.2;
            const bounceSpeed = 250;
            drawY -= Math.abs(Math.sin(entity.walkCycleTimer / bounceSpeed)) * bounceHeight;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, -drawWidth / 2, drawY, drawWidth, drawHeight);

        // ... (vykreslení nákladu)
        
        ctx.restore();
    }
};
