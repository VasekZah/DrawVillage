import { spriteCache } from './drawing.js';

const uiIconCache = new Map();

export function getUiIcon(name, classes = 'icon') {
    if (uiIconCache.has(name)) {
        return `<img src="${uiIconCache.get(name)}" class="${classes}" alt="${name} icon" />`;
    }

    const canvas = spriteCache.get(name);
    if (canvas) {
        const dataUrl = canvas.toDataURL();
        uiIconCache.set(name, dataUrl);
        return `<img src="${dataUrl}" class="${classes}" alt="${name} icon" />`;
    }
    
    // Záložní zobrazení, pokud sprite chybí
    return `<span class="${classes}" style="background-color: #F87171; display: inline-block;"></span>`;
}
