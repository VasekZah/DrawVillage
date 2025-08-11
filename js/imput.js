// input.js

function setupInputHandlers(canvas, gameState) {
    let placingWall = false;

    canvas.addEventListener("mousedown", (e) => {
        const { col, row } = getMouseTile(e, gameState.tileSize);
        if (e.shiftKey) {
            gameState.start = { col, row };
        } else if (e.altKey) {
            gameState.end = { col, row };
        } else {
            placingWall = true;
            toggleWall(gameState.tiles, col, row);
        }
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!placingWall) return;
        const { col, row } = getMouseTile(e, gameState.tileSize);
        toggleWall(gameState.tiles, col, row);
    });

    canvas.addEventListener("mouseup", () => {
        placingWall = false;
    });
}

function getMouseTile(event, tileSize) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return {
        col: Math.floor(x / tileSize),
        row: Math.floor(y / tileSize)
    };
}

function toggleWall(tiles, col, row) {
    if (tiles[row] && tiles[row][col]) {
        tiles[row][col].isWall = !tiles[row][col].isWall;
    }
}
