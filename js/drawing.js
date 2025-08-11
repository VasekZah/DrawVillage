import { G } from './globals.js';

export const OutlineDrawer = {
    colors: {
        fill: '#f7fafc',
        stroke: '#2d3748',
        ground: '#e2e8f0',
        groundDetail: '#edf2f7',
        placeholder: '#f56565'
    },
    createGrassPattern(ctx) {
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d');
        patternCanvas.width = 32;
        patternCanvas.height = 32;
        patternCtx.fillStyle = this.colors.ground;
        patternCtx.fillRect(0,0,32,32);
        patternCtx.strokeStyle = this.colors.groundDetail;
        patternCtx.lineWidth = 1;
        for(let i=0; i<20; i++){
            const x = Math.random()*32; const y = Math.random()*32;
            patternCtx.beginPath();
            patternCtx.moveTo(x, y);
            patternCtx.lineTo(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);
            patternCtx.stroke();
        }
        G.state.grassPattern = ctx.createPattern(patternCanvas, 'repeat');
    },
    draw(ctx, entity) {
        ctx.save();
        ctx.translate(Math.floor(entity.x), Math.floor(entity.y));

        const assetKey = entity.type === 'resource_pile' ? entity.resourceType : entity.type;
        const img = G.state.loadedUserAssets[assetKey];

        if (img) {
            const drawWidth = entity.radius * 2.5;
            // The height is calculated based on the new, cropped aspect ratio
            const drawHeight = (img.height / img.width) * drawWidth;
            // The drawing is now tight in the image, so we place the bottom of the image
            // near the entity's y-origin to make it look like it's standing on the ground.
            // A small positive offset to radius makes it sit nicely on the 'ground line'.
            ctx.drawImage(img, -drawWidth / 2, -drawHeight + (entity.radius * 0.2), drawWidth, drawHeight);
        } else {
            // Fallback display if an image is missing
            ctx.strokeStyle = this.colors.placeholder;
            ctx.fillStyle = this.colors.placeholder;
            ctx.lineWidth = 2;
            const r = entity.radius;
            ctx.strokeRect(-r, -r, r * 2, r * 2);
            ctx.font = `${r}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', 0, 0);
        }
        ctx.restore();
    }
};
