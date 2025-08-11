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

        return Promise.all(promises).then(() => {
            const settlerTemplate = spriteCache.get('settler');
            if (settlerTemplate) {
                for (const jobId in CONFIG.JOBS) {
                    const job = CONFIG.JOBS[jobId];
                    const colorizedSprite = createColorizedSprite(settlerTemplate, job.color);
                    spriteCache.set(`settler_${jobId}`, colorizedSprite);
                }
            }
        });
    },

    // --- TESTOVACÍ VYKRESLOVACÍ FUNKCE ---
    draw(ctx, entity) {
        // Tento kód se teď spustí pro každou entitu ve hře.
        // Ignoruje pozici entity a kreslí vždy do levého horního rohu.

        // TEST 1: Vykreslíme jednoduchý tvar
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 32, 32);

        // TEST 2: Pokusíme se vykreslit načtený sprite
        const treeSprite = spriteCache.get('tree');
        if (treeSprite && treeSprite.complete) {
            ctx.imageSmoothingEnabled = false;
            // Vykreslíme strom hned vedle čtverce, zvětšený, aby byl vidět
            ctx.drawImage(treeSprite, 50, 10, 32, 32); 
        } else {
            // Pokud by se sprite nenašel, vykreslíme modrý čtverec
            ctx.fillStyle = 'blue';
            ctx.fillRect(50, 10, 32, 32);
        }
    }
};
