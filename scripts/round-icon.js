import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function roundCorners() {
    try {
        const imagePath = 'build/icon.png';
        const image = await loadImage(imagePath);
        const width = image.width;
        const height = image.height;
        const radius = width * 0.225; // Standard iOS/macOS curvature

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Create rounded rectangle clipping path
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.quadraticCurveTo(width, 0, width, radius);
        ctx.lineTo(width, height - radius);
        ctx.quadraticCurveTo(width, height, width - radius, height);
        ctx.lineTo(radius, height);
        ctx.quadraticCurveTo(0, height, 0, height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();

        // Clip and draw image
        ctx.clip();
        ctx.drawImage(image, 0, 0, width, height);

        // Convert back to buffer and save
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);

        console.log('Successfully applied rounded corners to build/icon.png');
    } catch (e) {
        console.error('Failed to round corners:', e);
    }
}

roundCorners();
