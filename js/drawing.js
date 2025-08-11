import { G } from './globals.js';
import { CONFIG } from './config.js';
import { Humanoid } from './classes.js';
import { PIXEL_ASSETS } from './pixel-assets.js';

// Cache pro již načtené obrázky a jejich barevné varianty
const spriteCache = new Map();

// Funkce, která vezme šedý obrázek a dobarví ho danou barvou.
// Vrací nový <canvas> element, který se dá vykreslit.
function colorizeSprite(sourceImage, color) {
    // Klíč pro cachování barevných variant
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
    // Tato funkce načte VŠECHNY sprity z pixel-assets.js PŘEDEM.
    loadAllSprites() {
        const promises = [];
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
        return Promise.all(promises);
    },

    // Zjednodušená a opravená vykreslovací funkce
    draw(ctx, entity) {
        let spriteId = entity.type;

        // Správné určení ID spritu pro různé typy entit
        if (entity.type === 'resource_pile') {
            spriteId = `${entity.resourceType}_pile`;
        }
        
        let sprite = spriteCache.get(spriteId);
        
        // Pokud sprite z nějakého důvodu neexistuje, nic nekreslíme.
        if (!sprite) {
            return;
        }
        
        // Dobarvení osadníka podle profese
        if (entity instanceof Humanoid && entity.type === 'settler' && entity.job !== 'unemployed') {
            const jobColor = CONFIG.JOBS[entity.job]?.color;
            const templateSprite = spriteCache.get('settler');
            if (jobColor && templateSprite) {
                sprite = colorizeSprite(templateSprite, jobColor);
            }
        }

        // Uložíme aktuální stav kontextu (jako pozice, rotace atd.)
        ctx.save();
        
        // Přesuneme se na pozici entity
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        const drawWidth = entity.radius * 2.5;
        const drawHeight = (sprite.height / sprite.width) * drawWidth;
        const drawY = -drawHeight + (entity.radius * 0.4);

        // Vypneme vyhlazování, aby byl pixel-art ostrý
        ctx.imageSmoothingEnabled = false;
        
        // Vykreslíme finální sprite
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
        
        // Vrátíme kontext do původního stavu
        ctx.restore();
    }
};
