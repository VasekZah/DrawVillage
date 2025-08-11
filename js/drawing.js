import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { PIXEL_ASSETS } from './pixel-assets.js';

// Cache pro VŠECHNY finální sprity (včetně barevných variant)
const spriteCache = new Map();

// Pomocná funkce pro dobarvení, vrací nový <canvas> element
function createColorizedSprite(sourceImage, color) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceImage, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
}

export const SpriteDrawer = {
    // Načte VŠECHNY sprity a PŘEDEM VYTVOŘÍ barevné varianty
    loadAllSprites() {
        const promises = [];
        // 1. Načteme všechny základní sprity z PIXEL_ASSETS
        for (const [id, dataUrl] of Object.entries(PIXEL_ASSETS)) {
            const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    spriteCache.set(id, img);
                    resolve(img);
                };
                img.onerror = () => reject(`[FAIL] Failed to load sprite: ${id}`);
                img.src = dataUrl;
            });
            promises.push(promise);
        }

        // 2. Počkáme, až se všechny základní sprity načtou
        return Promise.all(promises).then(() => {
            console.log("Base sprites loaded. Now pre-rendering color variants...");
            // 3. Nyní, když máme základní 'settler' sprite, vytvoříme barevné varianty
            const settlerTemplate = spriteCache.get('settler');
            if (settlerTemplate) {
                for (const jobId in CONFIG.JOBS) {
                    const job = CONFIG.JOBS[jobId];
                    const colorizedSprite = createColorizedSprite(settlerTemplate, job.color);
                    // Uložíme je pod klíčem 'settler_builder', 'settler_lumberjack' atd.
                    spriteCache.set(`settler_${jobId}`, colorizedSprite);
                }
            }
            console.log("Color variants pre-rendered.");
        });
    },

    // Maximálně zjednodušená vykreslovací funkce
    draw(ctx, entity) {
        let spriteId;

        // Určíme, jaké ID má sprite, který chceme vykreslit
        if (entity.type === 'settler' && entity.job !== 'unemployed') {
            spriteId = `settler_${entity.job}`;
        } else if (entity.type === 'resource_pile') {
            spriteId = `${entity.resourceType}_pile`;
        } else {
            spriteId = entity.type;
        }
        
        const sprite = spriteCache.get(spriteId);
        
        if (!sprite) {
            return; // Pokud sprite neexistuje, nic nekreslíme
        }
        
        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        const drawWidth = entity.radius * 2.5;
        const drawHeight = (sprite.height / sprite.width) * drawWidth;
        const drawY = -drawHeight + (entity.radius * 0.4);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, -drawWidth / 2, drawY, drawWidth, drawHeight);

        // Vykreslení nákladu
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
