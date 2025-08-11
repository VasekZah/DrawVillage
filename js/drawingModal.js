import { G } from './globals.js';
import { CONFIG } from './config.js';

const assetList = [
    { id: 'settler', name: 'Settler' },
    { id: 'child', name: 'Child' },
    { id: 'wood', name: 'Resource: Wood' },
    { id: 'stone', name: 'Resource: Stone' },
    { id: 'food', name: 'Resource: Food' },
    { id: 'tree', name: 'Tree' },
    { id: 'sapling', name: 'Sapling' },
    { id: 'berryBush', name: 'Berry Bush' },
    ...Object.keys(CONFIG.BUILDING_INFO).map(id => ({ id, name: `Building: ${CONFIG.BUILDING_INFO[id].name}` }))
];

const iconList = [
    { id: 'icon_settler', name: 'Icon: Population' },
    { id: 'icon_day', name: 'Icon: Day' },
    { id: 'icon_time', name: 'Icon: Time' },
    { id: 'icon_idle', name: 'Icon: Idle' },
    { id: 'icon_builder', name: 'Icon: Builder' },
    { id: 'icon_lumberjack', name: 'Icon: Lumberjack' },
    { id: 'icon_gatherer', name: 'Icon: Gatherer' },
    { id: 'icon_miner', name: 'Icon: Miner' },
    { id: 'icon_farmer', name: 'Icon: Farmer' },
    { id: 'icon_forester', name: 'Icon: Forester' },
    { id: 'icon_pause', name: 'Icon: Pause' },
    { id: 'icon_play', name: 'Icon: Play' },
    { id: 'icon_ff2', name: 'Icon: 2x Speed' },
    { id: 'icon_ff4', name: 'Icon: 4x Speed' }
];

const fullAssetList = [...assetList, ...iconList];

let currentAssetIndex = 0;
let isDrawing = false;
let hasNewStrokes = false;

let modal, canvas, ctx, assetListElement, currentAssetNameElement, saveBtn, startBtn, clearBtn, exportBtn, importBtn, importFileInput;

function updateButtonStates() {
    const assetsDrawn = Object.keys(G.state.userAssets).length;
    const allAssetsDrawn = assetsDrawn >= fullAssetList.length;
    saveBtn.disabled = !hasNewStrokes;
    startBtn.disabled = !allAssetsDrawn;
}

function setupDrawingCanvas() {
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2d3748';

    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const event = e.touches ? e.touches[0] : e;
        return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const startDrawing = (e) => {
        e.preventDefault();
        if (!hasNewStrokes) {
            clearCanvas(true);
        }
        isDrawing = true;
        hasNewStrokes = true;
        updateButtonStates();
        const [x, y] = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const [x, y] = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
}

function renderAssetList() {
    assetListElement.innerHTML = '';
    fullAssetList.forEach((asset, index) => {
        const li = document.createElement('li');
        li.textContent = asset.name;
        li.dataset.index = index;
        if (index === currentAssetIndex) li.classList.add('active');
        if (G.state.userAssets[asset.id]) li.classList.add('drawn');
        assetListElement.appendChild(li);
    });
    if (fullAssetList[currentAssetIndex]) {
        currentAssetNameElement.textContent = `Drawing: ${fullAssetList[currentAssetIndex].name}`;
    }
}

function clearCanvas(isInternalCall = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isInternalCall) {
        hasNewStrokes = false;
        updateButtonStates();
    }
}

function showPreview(assetId) {
    const img = new Image();
    img.onload = () => {
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight, dx, dy;
        if (canvasAspect > imgAspect) {
            drawHeight = canvas.height * 0.9;
            drawWidth = drawHeight * imgAspect;
        } else {
            drawWidth = canvas.width * 0.9;
            drawHeight = drawWidth / imgAspect;
        }
        dx = (canvas.width - drawWidth) / 2;
        dy = (canvas.height - drawHeight) / 2;
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    };
    img.src = G.state.userAssets[assetId];
}

function selectAsset(index) {
    currentAssetIndex = index;
    clearCanvas(true);
    renderAssetList();
    const assetId = fullAssetList[currentAssetIndex]?.id;
    if (assetId && G.state.userAssets[assetId]) {
        showPreview(assetId);
        hasNewStrokes = false;
    } else {
        hasNewStrokes = false;
    }
    updateButtonStates();
}

// --- UPDATED --- Automatically fills the drawing with a gray color
function cropAndSave() {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] > 0) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    if (maxX < minX) return null;
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width, maxX + padding);
    maxY = Math.min(canvas.height, maxY + padding);
    const width = maxX - minX;
    const height = maxY - minY;

    // Create a temporary canvas with the cropped drawing
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = width;
    cropCanvas.height = height;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

    // Create a final canvas to add the fill color
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = height;
    const finalCtx = finalCanvas.getContext('2d');

    // 1. Draw the gray fill
    finalCtx.fillStyle = '#E5E7EB'; // A light gray color
    finalCtx.fillRect(0, 0, width, height);

    // 2. Use the outline as a mask
    finalCtx.globalCompositeOperation = 'destination-in';
    finalCtx.drawImage(cropCanvas, 0, 0);

    // 3. Draw the black outline back on top
    finalCtx.globalCompositeOperation = 'source-over';
    finalCtx.drawImage(cropCanvas, 0, 0);

    return finalCanvas.toDataURL();
}

function handleExport() {
    if (Object.keys(G.state.userAssets).length === 0) {
        alert("Nothing to export. Draw something first.");
        return;
    }
    const dataStr = JSON.stringify(G.state.userAssets, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = 'my_drawings.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error("Invalid file format.");
            }
            Object.assign(G.state.userAssets, importedData);
            alert(`${Object.keys(importedData).length} drawings were imported!`);
            const firstUndrawnIndex = fullAssetList.findIndex(asset => !G.state.userAssets[asset.id]);
            selectAsset(firstUndrawnIndex !== -1 ? firstUndrawnIndex : 0);
            updateButtonStates();
        } catch (error) {
            alert("Error during import: " + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = null;
}

export function initDrawingModal(startGameCallback) {
    modal = document.getElementById('drawing-modal');
    canvas = document.getElementById('drawing-canvas');
    assetListElement = document.getElementById('asset-list');
    currentAssetNameElement = document.getElementById('current-asset-name');
    clearBtn = document.getElementById('clear-drawing-btn');
    saveBtn = document.getElementById('save-drawing-btn');
    startBtn = document.getElementById('start-game-btn');
    exportBtn = document.getElementById('export-btn');
    importBtn = document.getElementById('import-btn');
    importFileInput = document.getElementById('import-file-input');
    ctx = canvas.getContext('2d');
    renderAssetList();
    setupDrawingCanvas();
    updateButtonStates();
    assetListElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') selectAsset(parseInt(e.target.dataset.index));
    });
    clearBtn.addEventListener('click', () => clearCanvas(false));
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImport);
    saveBtn.addEventListener('click', () => {
        if (!hasNewStrokes) return;
        const croppedDataUrl = cropAndSave();
        if (!croppedDataUrl) return;
        const currentAsset = fullAssetList[currentAssetIndex];
        G.state.userAssets[currentAsset.id] = croppedDataUrl;
        let nextIndex = -1;
        for (let i = 1; i <= fullAssetList.length; i++) {
            const potentialIndex = (currentAssetIndex + i) % fullAssetList.length;
            if (!G.state.userAssets[fullAssetList[potentialIndex].id]) {
                nextIndex = potentialIndex;
                break;
            }
        }
        if (nextIndex !== -1) {
            selectAsset(nextIndex);
        } else {
            renderAssetList();
            currentAssetNameElement.textContent = "All done! You can start the game.";
            clearCanvas(true);
            hasNewStrokes = false;
            updateButtonStates();
        }
    });
    startBtn.addEventListener('click', () => {
        if (startBtn.disabled) return;
        modal.style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        const promises = Object.entries(G.state.userAssets).map(([id, dataUrl]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    G.state.loadedUserAssets[id] = img;
                    resolve();
                };
                img.onerror = reject;
                img.src = dataUrl;
            });
        });
        Promise.all(promises).then(startGameCallback).catch(err => {
            console.error("Failed to load one or more user assets.", err);
            alert("Error: Failed to load all of your drawings.");
        });
    });
}
