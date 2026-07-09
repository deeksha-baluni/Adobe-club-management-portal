/**
 * Generate /home poster assets + avatar thumbs (run: npx sharp tools/resize-home-assets.mjs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

async function resizeDir({ srcDir, dstDir, width, height, quality = 42 }) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`Skip — missing ${srcDir}`);
    return;
  }
  fs.mkdirSync(dstDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter((f) => /\.avif$/i.test(f));
  await Promise.all(files.map(async (file) => {
    const src = path.join(srcDir, file);
    const dst = path.join(dstDir, file);
    await sharp(src)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .avif({ quality, effort: 6 })
      .toFile(dst);
    const { size: srcSize } = fs.statSync(src);
    const { size: dstSize } = fs.statSync(dst);
    console.log(`${file}: ${Math.round(srcSize / 1024)}KiB → ${Math.round(dstSize / 1024)}KiB (${width}×${height})`);
  }));
}

async function resizeAvatars() {
  const srcDir = path.join(root, 'assets/images/avatar');
  const dstDir = path.join(root, 'assets/images/avatar/thumbs');
  if (!fs.existsSync(srcDir)) {
    console.warn('Skip — missing avatar dir');
    return;
  }
  fs.mkdirSync(dstDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  await Promise.all(files.map(async (file) => {
    const src = path.join(srcDir, file);
    const base = file.replace(/\.(jpe?g|png|webp)$/i, '');
    const dst = path.join(dstDir, `${base}.webp`);
    await sharp(src)
      .resize(96, 96, { fit: 'cover', position: 'centre' })
      .webp({ quality: 78 })
      .toFile(dst);
    const { size: srcSize } = fs.statSync(src);
    const { size: dstSize } = fs.statSync(dst);
    console.log(`avatar ${file}: ${Math.round(srcSize / 1024)}KiB → thumbs/${base}.webp ${Math.round(dstSize / 1024)}KiB`);
  }));
}

await resizeDir({
  srcDir: path.join(root, 'assets/images/clubs/compressed-clubs'),
  dstDir: path.join(root, 'assets/images/clubs/home-compressed'),
  width: 600,
  height: 400,
});

await resizeDir({
  srcDir: path.join(root, 'assets/images/events/compressed-events'),
  dstDir: path.join(root, 'assets/images/events/home-compressed'),
  width: 600,
  height: 338,
});

await resizeAvatars();

console.log('Done — home poster + avatar thumbs generated.');
