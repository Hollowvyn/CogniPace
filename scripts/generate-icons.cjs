// Rasterizes public/icons/icon.svg to the PNG sizes Chrome MV3 requires
// (16, 48, 128). Source of truth is the SVG; PNGs are generated artifacts.
// Run via `npm run icons` or as part of `npm run build`.

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'icons', 'icon.svg');
const OUT_DIR = path.join(ROOT, 'public', 'icons');
const SIZES = [16, 48, 128];

async function main() {
  if (!fs.existsSync(SRC)) {
    throw new Error(`Source SVG not found at ${SRC}`);
  }

  const svg = fs.readFileSync(SRC);

  await Promise.all(
    SIZES.map(async (size) => {
      const out = path.join(OUT_DIR, `icon-${size}.png`);
      await sharp(svg, { density: Math.max(384, size * 8) })
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9 })
        .toFile(out);
      const { size: bytes } = fs.statSync(out);
      console.log(`  icon-${size}.png  ${size}x${size}  ${bytes} bytes`);
    })
  );
}

main().catch((err) => {
  console.error('[generate-icons] failed:', err);
  process.exit(1);
});
