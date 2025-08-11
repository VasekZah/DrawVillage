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
let hasNewStrokes = false; // Tracks if a new drawing has been made on the canvas

let modal, canvas, ctx, assetListElement, currentAssetNameElement, saveBtn, startBtn, clearBtn, exportBtn, importBtn, importFileInput;

function updateButtonStates() {
    const assetsDrawn = Object.keys(G.state.userAssets).length;
    const allAssetsDrawn = assetsDrawn >= fullAssetList.length;
    saveBtn.disabled = !hasNewStrokes;
    startBtn.disabled = !allAssetsDrawn;
}

// Rewritten drawing logic for smoother and thicker lines
function setupDrawingCanvas() {
    ctx.lineWidth = 8; // Increased pen size for better visibility
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2d3748';

    let points = [];

    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const event = e.touches ? e.touches[0] : e;
        return [event.clientX - rect.left, event.clientY - rect.top];
    }

    const startDrawing = (e) => {
        e.preventDefault();
        // If the canvas was showing a preview, clear it before starting a new drawing.
        if (!hasNewStrokes) {
            clearCanvas(true);
        }
        isDrawing = true;
        hasNewStrokes = true;
        points = [getCoords(e)];
        updateButtonStates();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        points.push(getCoords(e));

        // Redraw the entire line smoothly for a better feel
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        if (points.length < 2) return;

        ctx.moveTo(points[0][0], points[0][1]);

        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i][0] + points[i + 1][0]) / 2;
            const yc = (points[i][1] + points[i + 1][1]) / 2;
            ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
        }
        if (points.length > 2) {
             ctx.quadraticCurveTo(
                points[points.length - 2][0],
                points[points.length - 2][1],
                points[points.length - 1][0],
                points[points.length - 1][1]
            );
        } else if (points.length > 1) {
            ctx.lineTo(points[points.length-1][0], points[points.length-1][1]);
        }
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;
        points = []; // Clear points after drawing stroke
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
        const li = document.createElement('li'); li.textContent = asset.name; li.dataset.index = index;
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

// --- NEW --- Shows a preview of the saved drawing
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

// --- NEW --- Crops the drawing to its content before saving
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

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
    return tempCanvas.toDataURL();
}


export function initDrawingModal(startGameCallback) {
    modal = document.getElementById('drawing-modal'); canvas = document.getElementById('drawing-canvas');
    assetListElement = document.getElementById('asset-list'); currentAssetNameElement = document.getElementById('current-asset-name');
    clearBtn = document.getElementById('clear-drawing-btn'); saveBtn = document.getElementById('save-drawing-btn');
    startBtn = document.getElementById('start-game-btn'); exportBtn = document.getElementById('export-btn');
    importBtn = document.getElementById('import-btn'); importFileInput = document.getElementById('import-file-input');
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
                img.onload = () => { G.state.loadedUserAssets[id] = img; resolve(); };
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
// handleImport needs to call selectAsset to show a preview of the first undrawn item.
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
