import { G } from './globals.js';

export function getAssetImg(name, classes = 'icon') {
    const asset = G.state.loadedUserAssets[name];
    if (asset && asset.src) {
        return `<img src="${asset.src}" class="${classes}" alt="${name}" />`;
    }
    return `<span class="${classes} text-red-500 font-bold">?</span>`;
}
