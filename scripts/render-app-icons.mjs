/**
 * Rasterizes scripts/app-icon-source.svg into PWA / iOS icon PNGs.
 * iOS App Store requires 1024×1024 with no alpha — all outputs are flattened RGB.
 * Run: node scripts/render-app-icons.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(__dirname, 'app-icon-source.svg');

/** Matches SVG base plate / gradient low end so corner flatten is invisible */
const FLATTEN_BG = '#040605';

const outs = [
  { size: 192, file: path.join(root, 'public', 'pwa-192x192.png') },
  { size: 512, file: path.join(root, 'public', 'pwa-512x512.png') },
  { size: 180, file: path.join(root, 'public', 'apple-touch-icon.png') },
  {
    size: 1024,
    file: path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'),
  },
];

for (const { size, file } of outs) {
  await sharp(source, { density: 320 })
    .resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .flatten({ background: FLATTEN_BG })
    .removeAlpha()
    .png({
      compressionLevel: 9,
      palette: false,
    })
    .toFile(file);

  const meta = await sharp(file).metadata();
  const rel = path.relative(root, file);
  const okDim = meta.width === size && meta.height === size;
  const okAlpha = meta.hasAlpha === false;
  console.log(
    `wrote ${rel} ${meta.width}x${meta.height} channels=${meta.channels} hasAlpha=${meta.hasAlpha} ok=${okDim && okAlpha}`,
  );
  if (!okDim) {
    throw new Error(`Bad dimensions for ${rel}: expected ${size}`);
  }
  if (!okAlpha) {
    throw new Error(`Alpha channel still present in ${rel} — cannot ship to App Store`);
  }
}

console.log('All icons: RGB only, no alpha, dimensions verified.');
