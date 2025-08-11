import { generateSprite } from './pixel-art-data.js';

const uiIconCache = new Map();

export function getUiIcon(name, classes = 'icon') {
    if (uiIconCache.has(name)) {
        const iconSrc = uiIconCache.get(name);
        return `<img src="${iconSrc}" class="${classes}" alt="${name} icon" />`;
    }

    const canvas = generateSprite(name);
    if (canvas) {
        const dataUrl = canvas.toDataURL();
        uiIconCache.set(name, dataUrl);
        return `<img src="${dataUrl}" class="${classes}" alt="${name} icon" />`;
    }
    
    return `<span class="${classes}" style="background-color: #F87171; display: inline-block;"></span>`;
}
