const uiIconCache = new Map();

// Tato funkce nyní vrací data URL z cachovaného <canvas> elementu
export function getUiIcon(spriteCache, name, classes = 'icon') {
    if (uiIconCache.has(name)) {
        return `<img src="${uiIconCache.get(name)}" class="${classes}" alt="${name} icon" />`;
    }

    const canvas = spriteCache.get(name);
    if (canvas) {
        const dataUrl = canvas.toDataURL();
        uiIconCache.set(name, dataUrl);
        return `<img src="${dataUrl}" class="${classes}" alt="${name} icon" />`;
    }
    
    return `<span class="${classes}" style="background-color: #F87171; display: inline-block;"></span>`;
}
