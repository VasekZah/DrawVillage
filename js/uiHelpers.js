// js/uiHelpers.js

// Tato jednoduchá funkce vrací emoji pro daný typ suroviny.
export function getUiIcon(resourceType) {
    switch (resourceType) {
        case 'wood': return '🌲';
        case 'stone': return '💎';
        case 'food': return '🥩';
        default: return '';
    }
}
