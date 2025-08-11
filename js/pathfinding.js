import { G } from './globals.js';
import { CONFIG } from './config.js';
import { getNeighbors } from './helpers.js';

// --- PATHFINDING A* ---
export function findPath(startNode, endNode) {
    let openSet = [startNode]; const closedSet = new Set(); const cameFrom = new Map();
    const gScore = new Map(); gScore.set(startNode, 0);
    const fScore = new Map(); fScore.set(startNode, Math.hypot(startNode.x - endNode.x, startNode.y - endNode.y));

    while (openSet.length > 0) {
        let current = openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity)).shift();

        if (current.x === endNode.x && current.y === endNode.y) {
            const path = []; while (current) { path.push(current); current = cameFrom.get(current); }
            return path.reverse();
        }

        closedSet.add(current);

        for (let neighbor of getNeighbors(current)) {
            if (closedSet.has(neighbor) || !neighbor.walkable) continue;

            const moveCost = Math.hypot(current.x - neighbor.x, current.y - neighbor.y);
            const pathCost = moveCost / (1 + CONFIG.PATH_SPEED_BONUS * (neighbor.wear || 0));
            const tentativeGScore = (gScore.get(current) || 0) + pathCost;

            if (tentativeGScore < (gScore.get(neighbor) || Infinity)) {
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeGScore);
                fScore.set(neighbor, tentativeGScore + Math.hypot(neighbor.x - endNode.x, neighbor.y - endNode.y));
                if (!openSet.some(node => node === neighbor)) openSet.push(neighbor);
            }
        }
    }
    return null;
}
