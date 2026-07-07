/**
 * One-off: generate index-compressed showcase assets (run with `node tools/resize-index-showcase.mjs`).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

async function resizeDir({ srcDir, dstDir, width, height, quality = 42, inPlace = false }) {
  fs.mkdirSync(dstDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter((f) => /\.avif$/i.test(f));
  await Promise.all(files.map(async (file) => {
    const src = path.join(srcDir, file);
    const dst = path.join(dstDir, file);
    const tmp = inPlace ? `${dst}.tmp` : dst;
    await sharp(src)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .avif({ quality, effort: 6 })
      .toFile(tmp);
    if (inPlace) fs.renameSync(tmp, dst);
    const { size: srcSize } = fs.statSync(src);
    const { size: dstSize } = fs.statSync(dst);
    console.log(`${file}: ${Math.round(srcSize / 1024)}KiB → ${Math.round(dstSize / 1024)}KiB (${width}×${height})`);
  }));
}

async function resizeHero() {
  const src = path.join(root, 'assets/images/index/home-hero-img.webp');
  const dst = path.join(root, 'assets/images/index/home-hero-index.webp');
  await sharp(src)
    .resize(960, 540, { fit: 'cover', position: 'centre' })
    .webp({ quality: 72 })
    .toFile(dst);
  const { size } = fs.statSync(dst);
  console.log(`home-hero-index.webp: ${Math.round(size / 1024)}KiB (960×540)`);
}

await resizeDir({
  srcDir: path.join(root, 'assets/images/events/compressed-events'),
  dstDir: path.join(root, 'assets/images/events/index-compressed'),
  width: 768,
  height: 432,
});

await resizeDir({
  srcDir: path.join(root, 'assets/images/clubs/index-compressed'),
  dstDir: path.join(root, 'assets/images/clubs/index-compressed'),
  width: 764,
  height: 509,
  inPlace: true,
});

await resizeHero();

console.log('Done.');
