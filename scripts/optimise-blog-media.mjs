/**
 * Journal media pipeline — content/blog/uploads/* → public/img/blog/*.
 *
 * The CMS commits the owner's uploads RAW (a phone photo is 3–12MB; the booth
 * render arrived at 10.3MB). Nothing raw may ever ship, so this runs in
 * prebuild and every upload is shrunk on the way into public/:
 *
 *   images  → longest side capped at 1600px, recompressed, SAME filename —
 *             the markdown already references /img/blog/<name> (the CMS's
 *             public_folder), so names must survive exactly.
 *   .mp4    → capped at 1280px wide, H.264 Main + faststart, audio kept at
 *             AAC 96k (journal videos may talk, unlike the silent hero).
 *   other   → refused loudly. A .mov or .heic would ship raw or break the
 *             page, and the build telling the owner "convert this" beats a
 *             visitor's browser telling him nothing.
 *
 * Idempotent and incremental: an output newer than its input is skipped, so
 * repeat builds cost nothing.
 *
 * The pricing guard runs AFTER this in prebuild and scans public/ — so even a
 * pricelist uploaded through the CMS by accident still fails the build.
 */
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = 'content/blog/uploads';
const OUT = 'public/img/blog';

if (!existsSync(SRC)) process.exit(0);
mkdirSync(OUT, { recursive: true });

const IMAGE = /\.(jpe?g|png|webp|avif|gif)$/i;
const fresh = (inP, outP) =>
  existsSync(outP) && statSync(outP).mtimeMs >= statSync(inP).mtimeMs;

let failed = false;
for (const f of readdirSync(SRC)) {
  const inP = join(SRC, f);
  if (statSync(inP).isDirectory()) continue;
  // Housekeeping, not media: the folder's README and any dotfile.
  if (f.startsWith('.') || /^readme/i.test(f)) continue;
  const outP = join(OUT, f);
  if (fresh(inP, outP)) continue;

  const before = statSync(inP).size;

  if (IMAGE.test(f)) {
    // GIFs pass through sharp with animation preserved; everything else is
    // recompressed in its own format so the referenced extension stays true.
    await sharp(inP, { animated: /\.gif$/i.test(f) })
      .rotate() // honour phone EXIF orientation, then strip it
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .toFormat(extname(f).replace('.', '').replace('jpg', 'jpeg'), { quality: 80 })
      .toFile(outP);
  } else if (/\.mp4$/i.test(f)) {
    execFileSync(ffmpegPath, [
      '-y', '-i', inP,
      '-vf', "scale='min(1280,iw)':-2",
      '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', '26',
      '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart',
      outP,
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
  } else {
    console.error(
      `✗ content/blog/uploads/${f}: unsupported format. ` +
        `Images (jpg/png/webp/gif) and .mp4 video only — convert it and re-upload.`,
    );
    failed = true;
    continue;
  }

  const after = statSync(outP).size;
  console.log(
    `journal media: ${f}  ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`,
  );
}

if (failed) process.exit(1);
