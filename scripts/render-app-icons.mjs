/**
 * Rasterizes scripts/app-icon-source.svg into PWA / iOS icon PNGs.
 * Run: node scripts/render-app-icons.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(__dirname, 'app-icon-source.svg');

const outs = [
  { size: 192, file: path.join(root, 'public', 'pwa-192x192.png') },
  { size: 512, file: path.join(root, 'public', 'pwa-512x512.png') },
  { size: 180, file: path.join(root, 'public', 'apple-touch-icon.png') },
  {
    size: 1024,
    file: path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'),
  },
];

const svgBuf = await sharp(source, { density: 256 }).resize(1024, 1024).png({ compressionLevel: 9 }).toBuffer();

for (const { size, file } of outs) {
  await sharp(svgBuf)
    .resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log('wrote', path.relative(root, file), `${size}x${size}`);
}
