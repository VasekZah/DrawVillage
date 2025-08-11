import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { PIXEL_ASSETS } from './pixel-assets.js';

// Cache pro již načtené a dobarvené sprity
const spriteCache = new Map();

// Funkce, která vezme šedý obrázek a dobarví ho danou barvou
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
    // --- OPRAVENO --- Načte VŠECHNY sprity z pixel-assets.js předem
    loadAllSprites() {
        const promises = [];
        for (const [id, dataUrl] of Object.entries(PIXEL_ASSETS)) {
            const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    spriteCache.set(id, img);
                    resolve(img);
                };
                img.onerror = () => reject(`Failed to load sprite: ${id}`);
                img.src = dataUrl;
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    },

    // --- ZJEDNODUŠENO --- Nyní pouze kreslí předem načtené sprity
    draw(ctx, entity) {
        let spriteId = entity.type;
        if (entity.type === 'resource_pile') {
            spriteId = `${entity.resourceType}_pile`;
        } else if (entity.size) { // Je to budova
            spriteId = entity.type;
        }

        let sprite = spriteCache.get(spriteId);
        if (!sprite) return; // Sprite se z nějakého důvodu nenašel
        
        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        // Dobarvení osadníka podle profese
        if (entity instanceof Humanoid && entity.type === 'settler' && entity.job !== 'unemployed') {
            const jobColor = CONFIG.JOBS[entity.job]?.color;
            const templateSprite = spriteCache.get('settler');
            if (jobColor && templateSprite) {
                sprite = colorizeSprite(templateSprite, jobColor);
            }
        }
        
        const drawWidth = entity.radius * 2.5;
        const drawHeight = (sprite.height / sprite.width) * drawWidth;
        const drawY = -drawHeight + (entity.radius * 0.4);

        ctx.imageSmoothingEnabled = false; // Pro ostrý pixel-art
        ctx.drawImage(sprite, -drawWidth / 2, drawY, drawWidth, drawHeight);

        // Vykreslení nákladu, pokud nějaký nese
        if (entity.task?.payload) {
            const payloadSpriteId = `${entity.task.payload.type}_carry`;
            const payloadSprite = spriteCache.get(payloadSpriteId);
            if (payloadSprite) {
                const payloadWidth = drawWidth * 0.75;
                const payloadHeight = (payloadSprite.height / payloadSprite.width) * payloadWidth;
                ctx.drawImage(payloadSprite, -payloadWidth / 2, drawY - payloadHeight / 3, payloadWidth, payloadHeight);
            }
        }
        ctx.restore();
    }
};
