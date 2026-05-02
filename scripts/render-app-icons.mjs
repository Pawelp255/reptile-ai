/**
 * Rasterizes scripts/app-icon-source.svg into PWA / iOS icon PNGs and iOS launch splash (2732²).
 * iOS App Store / launch screens: no alpha — all outputs are flattened RGB.
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

/** LaunchScreen.storyboard uses Splash.imageset — centered reptile-eye on opaque #040605 */
const SPLASH_SIZE = 2732;
/** ~38% canvas so mark reads bold on tall phones without feeling cramped */
const SPLASH_ICON = Math.round(SPLASH_SIZE * 0.38);
const splashDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const splashOuts = [
  path.join(splashDir, 'splash-2732x2732-2.png'),
  path.join(splashDir, 'splash-2732x2732-1.png'),
  path.join(splashDir, 'splash-2732x2732.png'),
];

const splashIconBuf = await sharp(source, { density: 400 })
  .resize(SPLASH_ICON, SPLASH_ICON, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
  .flatten({ background: FLATTEN_BG })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toBuffer();

const splashLeft = Math.floor((SPLASH_SIZE - SPLASH_ICON) / 2);
const splashTop = Math.floor((SPLASH_SIZE - SPLASH_ICON) / 2);

const splashBuf = await sharp({
  create: {
    width: SPLASH_SIZE,
    height: SPLASH_SIZE,
    channels: 3,
    background: FLATTEN_BG,
  },
})
  .composite([{ input: splashIconBuf, left: splashLeft, top: splashTop }])
  .flatten({ background: FLATTEN_BG })
  .removeAlpha()
  .png({ compressionLevel: 9, palette: false })
  .toBuffer();

for (const file of splashOuts) {
  await sharp(splashBuf).toFile(file);
  const meta = await sharp(file).metadata();
  const rel = path.relative(root, file);
  const ok =
    meta.width === SPLASH_SIZE &&
    meta.height === SPLASH_SIZE &&
    meta.hasAlpha === false &&
    meta.channels === 3;
  console.log(`wrote ${rel} ${meta.width}x${meta.height} channels=${meta.channels} hasAlpha=${meta.hasAlpha} ok=${ok}`);
  if (!ok) {
    throw new Error(`Splash asset invalid: ${rel}`);
  }
}

console.log('Splash (2732²): RGB only, no alpha, matches app icon artwork.');
