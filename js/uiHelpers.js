// js/uiHelpers.js

import { G } from './globals.js';

/**
 * Vytvoří HTML tag <img> z načteného uživatelského assetu.
 * @param {string} name - ID assetu.
 * @param {string} classes - CSS třídy pro obrázek.
 * @returns {string} - HTML string.
 */
export function getAssetImg(name, classes = 'icon') {
    // Prohledáváme G.loadedUserAssets, kde jsou již načtené obrázky
    const asset = G.loadedUserAssets[name];
    if (asset && asset.src) {
        return `<img src="${asset.src}" class="${classes}" alt="${name}" />`;
    }
    // Záložní zobrazení, pokud obrázek neexistuje
    return `<span class="${classes} text-red-500 font-bold">?</span>`;
}
