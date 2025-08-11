import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { SPRITE_DATA, generateSprite } from './pixel-art-data.js';

const spriteCache = new Map();

function createColorizedSprite(sourceImage, color) {
    const cacheKey = `${sourceImage.id}-${color}`;
    if (spriteCache.has(cacheKey)) {
        return spriteCache.get(cacheKey);
    }
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceImage, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    spriteCache.set(cacheKey, canvas);
    return canvas;
}

export const SpriteDrawer = {
    loadAllSprites() {
        console.log("Generating all sprites from data...");
        for (const id in SPRITE_DATA) {
            const canvas = generateSprite(id);
            if(canvas) {
                canvas.id = id; // Přidáme ID pro snadnější cachování
                spriteCache.set(id, canvas);
            }
        }
        
        const settlerTemplate = spriteCache.get('settler');
        if (settlerTemplate) {
            for (const jobId in CONFIG.JOBS) {
                const job = CONFIG.JOBS[jobId];
                createColorizedSprite(settlerTemplate, job.color);
            }
        }
        console.log("All sprites generated and cached.");
        return Promise.resolve(); // Vracíme splněný Promise, načítání je okamžité
    },

    draw(ctx, entity) {
        let spriteId;

        if (entity.type === 'settler' && entity.job !== 'unemployed') {
            spriteId = `settler_${entity.job}`;
        } else if (entity.type === 'resource_pile') {
            spriteId = `${entity.resourceType}_pile`;
        } else {
            spriteId = entity.type;
        }
        
        const sprite = spriteCache.get(spriteId);
        
        if (!sprite) return;
        
        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        const drawWidth = entity.radius * 2.5;
        const drawHeight = (sprite.height / sprite.width) * drawWidth;
        const drawY = -drawHeight + (entity.radius * 0.4);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, -drawWidth / 2, drawY, drawWidth, drawHeight);

        if (entity.task?.payload) {
            const payloadSprite = spriteCache.get(`${entity.task.payload.type}_carry`);
            if (payloadSprite) {
                const payloadWidth = drawWidth * 0.75;
                const payloadHeight = (payloadSprite.height / payloadSprite.width) * payloadWidth;
                ctx.drawImage(payloadSprite, -payloadWidth / 2, drawY - payloadHeight / 3, payloadWidth, payloadHeight);
            }
        }
        ctx.restore();
    }
};
