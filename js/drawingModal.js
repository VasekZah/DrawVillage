import { userAssets, loadedUserAssets, CONFIG } from './config.js';

const assetList = [
    { id: 'settler', name: 'Osadník' },
    { id: 'child', name: 'Dítě' },
    { id: 'wood', name: 'Surovina: Dřevo' },
    { id: 'stone', name: 'Surovina: Kámen' },
    { id: 'food', name: 'Surovina: Jídlo' },
    { id: 'tree', name: 'Strom' },
    { id: 'sapling', name: 'Sazenice' },
    { id: 'berryBush', name: 'Keř s bobulemi' },
    ...Object.keys(CONFIG.BUILDING_INFO).map(id => ({ id, name: `Budova: ${CONFIG.BUILDING_INFO[id].name}` }))
];

const iconList = [
    { id: 'icon_settler', name: 'Ikona: Populace' },
    { id: 'icon_day', name: 'Ikona: Den' },
    { id: 'icon_time', name: 'Ikona: Čas' },
    { id: 'icon_idle', name: 'Ikona: Nezaměstnaní' },
    { id: 'icon_builder', name: 'Ikona: Stavitel' },
    { id: 'icon_lumberjack', name: 'Ikona: Dřevorubec' },
    { id: 'icon_gatherer', name: 'Ikona: Sběrač' },
    { id: 'icon_miner', name: 'Ikona: Horník' },
    { id: 'icon_farmer', name: 'Ikona: Farmář' },
    { id: 'icon_forester', name: 'Ikona: Lesník' },
    { id: 'icon_pause', name: 'Ikona: Pauza' },
    { id: 'icon_play', name: 'Ikona: Play' },
    { id: 'icon_ff2', name: 'Ikona: 2x Rychlost' },
    { id: 'icon_ff4', name: 'Ikona: 4x Rychlost' }
];

const fullAssetList = [...assetList, ...iconList];

let currentAssetIndex = 0;
let isDrawing = false;
let isCanvasDirty = false;
let lastX = 0;
let lastY = 0;

const modal = document.getElementById('drawing-modal');
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const assetListElement = document.getElementById('asset-list');
const currentAssetNameElement = document.getElementById('current-asset-name');
const saveBtn = document.getElementById('save-drawing-btn');
const startBtn = document.getElementById('start-game-btn');

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

function updateButtonStates() {
    saveBtn.disabled = !isCanvasDirty;
    startBtn.disabled = Object.keys(userAssets).length < fullAssetList.length;
}

function setupDrawingCanvas() {
    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const event = e.touches ? e.touches[0] : e;
        return [event.clientX - rect.left, event.clientY - rect.top];
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        isCanvasDirty = true;
        [lastX, lastY] = getCoords(e);
        updateButtonStates();
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const [currentX, currentY] = getCoords(e);
        drawLine(lastX, lastY, currentX, currentY);
        [lastX, lastY] = [currentX, currentY];
    }

    function stopDrawing() {
        isDrawing = false;
    }
    
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
        if (index === currentAssetIndex) {
            li.classList.add('active');
        }
        if (userAssets[asset.id]) {
            li.classList.add('drawn');
        }
        assetListElement.appendChild(li);
    });
    currentAssetNameElement.textContent = `Kreslení: ${fullAssetList[currentAssetIndex].name}`;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isCanvasDirty = false;
    updateButtonStates();
}

function selectAsset(index) {
    currentAssetIndex = index;
    clearCanvas();
    renderAssetList();
}

export function initDrawingModal(startGameCallback) {
    renderAssetList();
    setupDrawingCanvas();
    updateButtonStates();

    assetListElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            selectAsset(parseInt(e.target.dataset.index));
        }
    });

    document.getElementById('clear-drawing-btn').addEventListener('click', clearCanvas);

    saveBtn.addEventListener('click', () => {
        if (!isCanvasDirty) return;
        const currentAsset = fullAssetList[currentAssetIndex];
        userAssets[currentAsset.id] = canvas.toDataURL();
        
        let nextIndex = (currentAssetIndex + 1) % fullAssetList.length;
        while(userAssets[fullAssetList[nextIndex].id] && nextIndex !== currentAssetIndex) {
            nextIndex = (nextIndex + 1) % fullAssetList.length;
        }
        selectAsset(nextIndex);
        updateButtonStates();
    });

    startBtn.addEventListener('click', () => {
        if (Object.keys(userAssets).length < fullAssetList.length) return;

        modal.style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        
        const promises = Object.entries(userAssets).map(([id, dataUrl]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    loadedUserAssets[id] = img;
                    resolve();
                };
                img.src = dataUrl;
            });
        });

        Promise.all(promises).then(() => {
            startGameCallback();
        });
    });
}
