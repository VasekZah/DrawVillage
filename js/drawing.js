import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { PIXEL_ASSETS } from './pixel-assets.js';

const spriteCache = new Map();
const imagePromises = new Map();

function loadImageFromDataURL(id, dataUrl) {
    if (imagePromises.has(id)) {
        return imagePromises.get(id);
    }
    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            spriteCache.set(id, img);
            resolve(img);
        };
        img.onerror = () => reject(`Failed to load image from data URL: ${id}`);
        img.src = dataUrl;
    });
    imagePromises.set(id, promise);
    return promise;
}

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
        const promises = [];
        for (const [id, dataUrl] of Object.entries(PIXEL_ASSETS)) {
            if (id === 'settler' || id === 'child') { // Načteme jen šablony
                 promises.push(loadImageFromDataURL(id, dataUrl));
            }
        }
        return Promise.all(promises);
    },

    draw(ctx, entity) {
        let spriteId = entity.type;
        if (entity.type === 'resource_pile') {
            spriteId = `${entity.resourceType}_pile`;
        } else if (entity.size) { // Je to budova
            spriteId = entity.type;
        }

        let spriteData = PIXEL_ASSETS[spriteId];
        if (!spriteData) return;

        let sprite = spriteCache.get(spriteId);
        if (!sprite) {
             const img = new Image();
             img.src = spriteData;
             spriteCache.set(spriteId, img);
             sprite = img;
        }

        if(!sprite.complete) return; // Pokud se obrázek ještě nenačetl, přeskočit
        
        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        if (entity instanceof Humanoid && entity.type === 'settler' && entity.job !== 'unemployed') {
            const jobColor = CONFIG.JOBS[entity.job]?.color;
            const templateSprite = spriteCache.get('settler');
            if (jobColor && templateSprite) {
                sprite = colorizeSprite(templateSprite, jobColor);
            }
        } else if (entity.type === 'child') {
            sprite = spriteCache.get('child');
        }
        
        const drawWidth = entity.radius * 2.5;
        const drawHeight = (sprite.height / sprite.width) * drawWidth;
        const drawY = -drawHeight + (entity.radius * 0.4);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, -drawWidth / 2, drawY, drawWidth, drawHeight);

        if (entity.task?.payload) {
            const payloadSpriteId = `${entity.task.payload.type}_carry`;
            const payloadSpriteData = PIXEL_ASSETS[payloadSpriteId];
            if (payloadSpriteData) {
                let payloadSprite = spriteCache.get(payloadSpriteId);
                if (!payloadSprite) {
                    const img = new Image();
                    img.src = payloadSpriteData;
                    spriteCache.set(payloadSpriteId, img);
                    payloadSprite = img;
                }
                if (payloadSprite.complete) {
                    const payloadWidth = drawWidth * 0.75;
                    const payloadHeight = (payloadSprite.height / payloadSprite.width) * payloadWidth;
                    ctx.drawImage(payloadSprite, -payloadWidth / 2, drawY - payloadHeight / 3, payloadWidth, payloadHeight);
                }
            }
        }
        ctx.restore();
    }
};
