export function getUiIcon(resourceType) {
    // Tato jednoduchá funkce vrací emoji pro daný typ suroviny v tooltipech.
    switch (resourceType) {
        case 'wood': return '🌲';
        case 'stone': return '💎';
        case 'food': return '🥩';
        default: return '';
    }
}
