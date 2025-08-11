export function getUiIcon(name, classes = 'icon') {
    // Ikony bereme ze speciální složky, abychom je oddělili od herních spritů
    const src = `img/icons/${name}.png`;
    return `<img src="${src}" class="${classes}" alt="${name} icon" />`;
}
