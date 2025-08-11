import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';

const spriteCache = new Map();

function createColorizedSprite(sourceImage, color) {
    const cacheKey = `${sourceImage.id}-${color}`;
    if (spriteCache.has(cacheKey)) return spriteCache.get(cacheKey);

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
    ASSETS: {
        settler: 'img/settler.png',
        child: 'img/child.png',
        tree: 'img/tree.png',
        stone: 'img/stone.png',
        berryBush: 'img/berryBush.png',
        sapling: 'img/sapling.png',
        hut: 'img/hut.png',
        stockpile: 'img/stockpile.png',
        mine: 'img/mine.png',
        farm: 'img/farm.png',
        foresterLodge: 'img/foresterLodge.png',
        wood_pile: 'img/wood_pile.png',
        stone_pile: 'img/stone_pile.png',
        food_pile: 'img/food_pile.png',
        wood_carry: 'img/wood_carry.png',
        stone_carry: 'img/stone_carry.png',
        food_carry: 'img/food_carry.png'
    },

    loadAllSprites() {
        const promises = [];
        for (const [id, src] of Object.entries(this.ASSETS)) {
            const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.id = id;
                img.onload = () => {
                    spriteCache.set(id, img);
                    resolve(img);
                };
                img.onerror = () => reject(`[FAIL] Failed to load sprite: ${id} from ${src}`);
                img.src = src;
            });
            promises.push(promise);
        }
        
        return Promise.all(promises).then(() => {
            console.log("Base sprites loaded. Pre-rendering color variants...");
            const settlerTemplate = spriteCache.get('settler');
            if (settlerTemplate) {
                for (const jobId in CONFIG.JOBS) {
                    createColorizedSprite(settlerTemplate, CONFIG.JOBS[jobId].color);
                }
            }
        });
    },

    draw(ctx, entity) {
        let spriteId = entity.type;
        if (entity.type === 'resource_pile') {
            spriteId = `${entity.resourceType}_pile`;
        }

        let sprite = spriteCache.get(spriteId);
        if (!sprite) return;
        
        if (entity instanceof Humanoid && entity.type === 'settler' && entity.job !== 'unemployed') {
            const jobColor = CONFIG.JOBS[entity.job]?.color;
            const templateSprite = spriteCache.get('settler');
            if (jobColor && templateSprite) {
                sprite = createColorizedSprite(templateSprite, jobColor);
            }
        }
        
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
