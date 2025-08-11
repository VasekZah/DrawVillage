// drawing.js

function drawGrid(ctx, cols, rows, tileSize) {
    ctx.strokeStyle = "#ccc";
    for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileSize, 0);
        ctx.lineTo(x * tileSize, rows * tileSize);
        ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileSize);
        ctx.lineTo(cols * tileSize, y * tileSize);
        ctx.stroke();
    }
}

function drawTiles(ctx, tiles, tileSize) {
    for (let row = 0; row < tiles.length; row++) {
        for (let col = 0; col < tiles[row].length; col++) {
            const tile = tiles[row][col];
            if (tile.isWall) {
                ctx.fillStyle = "#000";
                ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            }
        }
    }
}

function drawPath(ctx, path, tileSize) {
    if (!path) return;
    ctx.fillStyle = "rgba(0,255,0,0.5)";
    for (const node of path) {
        ctx.fillRect(node.col * tileSize, node.row * tileSize, tileSize, tileSize);
    }
}

function drawStartEnd(ctx, start, end, tileSize) {
    if (start) {
        ctx.fillStyle = "blue";
        ctx.fillRect(start.col * tileSize, start.row * tileSize, tileSize, tileSize);
    }
    if (end) {
        ctx.fillStyle = "red";
        ctx.fillRect(end.col * tileSize, end.row * tileSize, tileSize, tileSize);
    }
}
