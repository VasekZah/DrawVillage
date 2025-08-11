import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { PIXEL_ASSETS } from './pixel-assets.js';

const spriteCache = new Map();

function colorizeSprite(sourceImage, color) {
    const cacheKey = `${sourceImage.src.substring(22, 52)}-${color}`;
    if (spriteCache.has(cacheKey)) {
        return spriteCache.get(cacheKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(sourceImage, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    spriteCache.set(cacheKey, canvas);
    return canvas;
}

export const SpriteDrawer = {
    loadAllSprites() {
        console.log("--- Starting sprite loading ---");
        const promises = [];
        for (const [id, dataUrl] of Object.entries(PIXEL_ASSETS)) {
            const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    spriteCache.set(id, img);
                    // console.log(`[OK] Sprite loaded: ${id}`);
                    resolve(img);
                };
                img.onerror = () => reject(`[FAIL] Failed to load sprite: ${id}`);
                img.src = dataUrl;
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    },

    draw(ctx, entity) {
        // --- DIAGNOSTIC LOG ---
        console.log(`--- Attempting to draw entity: ${entity.type} (ID: ${entity.id}) ---`);
        
        let spriteId = entity.type;
        if (entity.type === 'resource_pile') {
            spriteId = `${entity.resourceType}_pile`;
        } else if (entity.size) { 
            spriteId = entity.type;
        }

        console.log(`Resolved spriteId to: '${spriteId}'`);

        let sprite = spriteCache.get(spriteId);
        
        if (!sprite) {
            console.error(`Sprite NOT FOUND in cache for spriteId: '${spriteId}'`);
            return;
        }

        // --- DIAGNOSTIC LOG ---
        console.log(`Sprite found in cache. Type: ${sprite.constructor.name}, Dimensions: ${sprite.width}x${sprite.height}`);

        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        if (entity instanceof Humanoid && entity.type === 'settler' && entity.job !== 'unemployed') {
            const jobColor = CONFIG.JOBS[entity.job]?.color;
            const templateSprite = spriteCache.get('settler');
            if (jobColor && templateSprite) {
                // --- DIAGNOSTIC LOG ---
                console.log(`Colorizing settler with job '${entity.job}' and color '${jobColor}'`);
                sprite = colorizeSprite(templateSprite, jobColor);
            }
        }
        
        const drawWidth = entity.radius * 2.5;
        const drawHeight = (sprite.height / sprite.width) * drawWidth;
        const drawY = -drawHeight + (entity.radius * 0.4);

        if (isNaN(drawWidth) || isNaN(drawHeight)) {
            console.error("drawWidth or drawHeight is NaN! Halting draw.", {drawWidth, drawHeight, entityRadius: entity.radius, spriteH: sprite.height, spriteW: sprite.width});
            ctx.restore();
            return;
        }
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, -drawWidth / 2, drawY, drawWidth, drawHeight);

        if (entity.task?.payload) {
            const payloadSpriteId = `${entity.task.payload.type}_carry`;
            const payloadSprite = spriteCache.get(payloadSpriteId);
            if (payloadSprite) {
                // ... drawing payload ...
            }
        }
        ctx.restore();
    }
};
