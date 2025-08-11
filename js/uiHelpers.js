import { PIXEL_ASSETS } from './pixel-assets.js';

export function getUiIcon(name, classes = 'icon') {
    const iconSrc = PIXEL_ASSETS[name];
    if (iconSrc) {
        return `<img src="${iconSrc}" class="${classes}" alt="${name} icon" />`;
    }
    // Záložní zobrazení, pokud ikona chybí
    return `<span class="${classes}" style="background-color: #F87171; display: inline-block;"></span>`;
}
