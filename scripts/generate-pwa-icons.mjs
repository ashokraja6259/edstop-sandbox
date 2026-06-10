import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const iconsDir = path.join(root, 'public', 'icons');

fs.mkdirSync(iconsDir, { recursive: true });

const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  <text
    x="50%"
    y="55%"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${size * 0.46}"
    font-weight="800"
    fill="#ffffff"
  >
    E
  </text>
</svg>
`;

async function generateIcon(size, outputPath) {
  await sharp(Buffer.from(createSvg(size)))
    .png()
    .resize(size, size)
    .toFile(outputPath);
}

await generateIcon(192, path.join(iconsDir, 'icon-192.png'));
await generateIcon(512, path.join(iconsDir, 'icon-512.png'));
await generateIcon(180, path.join(root, 'public', 'apple-touch-icon.png'));

console.log('PWA icons generated successfully.');
