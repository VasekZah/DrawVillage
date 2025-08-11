import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { SPRITE_GENERATORS } from './graphics.js';

const spriteCache = new Map();

function colorizeSprite(sourceCanvas, color) {
    const cacheKey = `${sourceCanvas.id}-${color}`;
    if (spriteCache.has(cacheKey)) return spriteCache.get(cacheKey);

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    spriteCache.set(cacheKey, canvas);
    return canvas;
}

export const SpriteDrawer = {
    // Vygeneruje všechny sprity podle receptů a uloží je do cache
    generateAndCacheSprites() {
        console.log("Generating all sprites from data...");
        for (const id in SPRITE_GENERATORS) {
            if (id.startsWith('_')) continue;

            const size = SPRITE_GENERATORS._canvasSize[id] || SPRITE_GENERATORS._canvasSize.default;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            canvas.id = id;
            
            const generatorFn = SPRITE_GENERATORS[id];
            generatorFn(canvas.getContext('2d'));

            spriteCache.set(id, canvas);
        }
        
        const settlerTemplate = spriteCache.get('settler');
        if (settlerTemplate) {
            for (const jobId in CONFIG.JOBS) {
                const job = CONFIG.JOBS[jobId];
                colorizeSprite(settlerTemplate, job.color);
            }
        }
        console.log("All sprites generated and cached.");
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
        const drawY = -drawHeight + (entity.radius * 0.4);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, -drawWidth / 2, drawY, drawWidth, drawHeight);

        // Zde by byla logika pro nošení věcí atd.
        
        ctx.restore();
    }
};
