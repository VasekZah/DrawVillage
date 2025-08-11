import { G } from './globals.js';
import { CONFIG } from './config.js';

export const PixelDrawer = {
    draw: (ctx, entity) => {
        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));
        const drawer = PixelDrawer[entity.type] || (entity.isChild ? PixelDrawer.child : (entity.job ? PixelDrawer.settler : null));
        if (drawer) drawer(ctx, entity);
        ctx.restore();
    },
    settler: (ctx, entity) => {
        const bob = Math.sin(Date.now() * 0.01 * (entity.path?.length > 0 ? 2 : 1)) * (entity.path?.length > 0 ? 1 : 0);
        ctx.fillStyle = '#fbeee4'; ctx.fillRect(-2, -8 + bob, 4, 4);
        ctx.fillStyle = entity.job === 'laborer' ? '#795548' : entity.job ? CONFIG.JOBS[entity.job].color : '#795548';
        ctx.fillRect(-3, -4 + bob, 6, 4);
        ctx.fillStyle = '#455A64'; ctx.fillRect(-2, 0 + bob, 4, 3);
    },
    child: (ctx, entity) => {
        const bob = Math.sin(Date.now() * 0.015) * 1;
        ctx.fillStyle = '#fbeee4'; ctx.fillRect(-1, -6 + bob, 3, 3);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(-2, -3 + bob, 4, 3);
    },
    tree: (ctx) => {
        ctx.fillStyle = '#5d4037'; ctx.fillRect(-2, 0, 4, 8);
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(-10, -12, 20, 8);
        ctx.fillStyle = '#388e3c'; ctx.fillRect(-8, -16, 16, 8);
        ctx.fillStyle = '#4caf50'; ctx.fillRect(-5, -20, 10, 8);
    },
    sapling: (ctx) => {
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-1, -4, 2, 8);
        ctx.fillStyle = '#689f38'; ctx.fillRect(-2, -6, 4, 3);
    },
    stone: (ctx) => {
        ctx.fillStyle = '#78909c'; ctx.fillRect(-6, -5, 12, 10);
        ctx.fillStyle = '#546e7a'; ctx.fillRect(-5, -4, 10, 8);
        ctx.fillStyle = '#b0bec5'; ctx.fillRect(-4, -5, 3, 3);
    },
    bush: (ctx) => {
        ctx.fillStyle = '#689f38'; ctx.fillRect(-6, -4, 12, 6);
        ctx.fillStyle = '#c2185b'; ctx.fillRect(1, -1, 2, 2); ctx.fillRect(-3, 0, 2, 2);
    },
    stump: (ctx) => { ctx.fillStyle = '#8d6e63'; ctx.fillRect(-3, 4, 6, 4); },
    hut: (ctx) => {
        ctx.fillStyle = '#a1887f'; ctx.fillRect(-15, -15, 30, 30);
        ctx.fillStyle = '#795548'; ctx.fillRect(-17, -17, 34, 10);
        ctx.fillStyle = '#5d4037'; ctx.fillRect(-17, -17, 34, 2);
        ctx.fillStyle = '#4e342e'; ctx.fillRect(-8, 0, 6, 15);
        ctx.fillStyle = '#b0bec5'; ctx.fillRect(5, -5, 4, 4);
        ctx.fillStyle = '#616161'; ctx.fillRect(8, -22, 5, 8);
    },
    stone_house: (ctx) => {
        ctx.fillStyle = '#b0bec5'; ctx.fillRect(-16, -16, 32, 32);
        ctx.fillStyle = '#78909c'; ctx.fillRect(-18, -18, 36, 12);
        ctx.fillStyle = '#546e7a'; ctx.fillRect(-18, -18, 36, 2);
        ctx.fillStyle = '#4e342e'; ctx.fillRect(-8, 0, 8, 16);
        ctx.fillStyle = '#616161'; ctx.fillRect(9, -24, 5, 10);
    },
    stockpile: (ctx) => {
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-25, 20, 50, 5);
        ctx.fillStyle = '#bcaaa4'; ctx.fillRect(-20, -10, 15, 15);
        ctx.fillStyle = '#a1887f'; ctx.fillRect(-22, -12, 19, 19);
        ctx.fillStyle = '#bcaaa4'; ctx.fillRect(5, -15, 15, 25);
    },
    farm: (ctx, entity) => {
        ctx.fillStyle = '#6d4c41'; ctx.fillRect(-30, -20, 60, 40);
        if (entity.farmState === 'growing' || entity.farmState === 'harvestable') {
            ctx.fillStyle = entity.farmState === 'growing' ? '#aed581' : '#fbc02d';
            for(let i = 0; i < 5; i++) ctx.fillRect(-25 + i * 10, -15, 5, 30 * entity.growth);
        }
    },
    forestersHut: (ctx) => {
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-15, -15, 30, 30);
        ctx.fillStyle = '#4caf50'; ctx.fillRect(-17, -17, 34, 8);
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(5, 0, 6, 15);
    },
    huntersLodge: (ctx) => {
        ctx.fillStyle = '#6d4c41'; ctx.fillRect(-20, -15, 40, 30);
        ctx.fillStyle = '#4e342e'; ctx.fillRect(-22, -17, 44, 8);
        ctx.fillStyle = '#cfd8dc'; ctx.fillRect(-10, -20, 2, 6); ctx.fillRect(8, -20, 2, 6);
    },
    well: (ctx) => {
        ctx.fillStyle = '#90a4ae'; ctx.fillRect(-10, 0, 20, 10);
        ctx.fillStyle = '#607d8b'; ctx.fillRect(-8, 2, 16, 8);
        ctx.fillStyle = '#5d4037'; ctx.fillRect(-10, -10, 4, 12); ctx.fillRect(6, -10, 4, 12);
        ctx.fillStyle = '#4e342e'; ctx.fillRect(-12, -12, 24, 4);
    },
    deer: (ctx) => {
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-4, -5, 8, 10);
        ctx.fillStyle = '#6d4c41'; ctx.fillRect(-2, -10, 4, 6);
        ctx.fillRect(-6, -12, 2, 4); ctx.fillRect(4, -12, 2, 4);
    },
    rabbit: (ctx) => {
        ctx.fillStyle = '#efebe9'; ctx.fillRect(-3, -4, 6, 5);
        ctx.fillStyle = '#d7ccc8'; ctx.fillRect(-1, -7, 2, 4);
    },
    wood_pile: (ctx) => {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-5, 0, 10, 3); ctx.fillRect(-4, -3, 8, 3); ctx.fillRect(-2, -6, 4, 3);
    },
    stone_pile: (ctx) => {
        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(-5, 0, 5, 4); ctx.fillRect(0, -2, 4, 6); ctx.fillRect(-3, -4, 6, 4);
    },
    food_pile: (ctx) => {
        ctx.fillStyle = '#c2185b'; ctx.fillRect(-4, 0, 8, 4);
        ctx.fillStyle = '#ad1457'; ctx.fillRect(-3, -2, 6, 2);
    },
    carcass: (ctx) => {
        ctx.fillStyle = '#5d4037'; ctx.fillRect(-5, 0, 10, 4);
        ctx.fillStyle = '#795548'; ctx.fillRect(-4, -2, 8, 2);
    },
    arrow: (ctx, entity) => {
        ctx.rotate(entity.angle);
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, -1, 10, 2);
        ctx.fillStyle = '#efebe9'; ctx.fillRect(8, -2, 4, 4);
    }
};
