/**
 * Rasterizes a 1200×630 Open Graph / Twitter share image (PNG, no SVG).
 * Run: node scripts/render-og-image.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconPath = path.join(root, "public", "pwa-512x512.png");
const outPath = path.join(root, "public", "og-image.png");

const WIDTH = 1200;
const HEIGHT = 630;
const ICON = 220;

const svg = Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c1a17"/>
      <stop offset="0.55" stop-color="#040605"/>
      <stop offset="1" stop-color="#07110f"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.18" cy="0.12" r="0.7">
      <stop offset="0" stop-color="#1a9587" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#040605" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <text x="520" y="268" fill="#f4faf8" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="72" font-weight="700" letter-spacing="-2">Reptilita</text>
  <text x="520" y="338" fill="#c5ddd7" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="32" font-weight="500">Reptile and amphibian care, organized</text>
  <text x="520" y="400" fill="#7aa8a0" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="24">Journal · schedules · Apple Watch · your collection</text>
</svg>
`);

const icon = await sharp(iconPath)
  .resize(ICON, ICON, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

await sharp(svg)
  .composite([{ input: icon, left: 236, top: Math.round((HEIGHT - ICON) / 2) }])
  .png({ compressionLevel: 9 })
  .toFile(outPath);

const meta = await sharp(outPath).metadata();
if (meta.width !== WIDTH || meta.height !== HEIGHT || meta.format !== "png") {
  throw new Error(`Unexpected OG image: ${meta.width}x${meta.height} ${meta.format}`);
}
console.log(`wrote public/og-image.png ${meta.width}x${meta.height} png`);
