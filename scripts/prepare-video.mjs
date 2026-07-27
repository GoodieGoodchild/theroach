/**
 * Hero video pipeline: trim → seamless loop → mobile-safe encode.
 *
 * WHY THIS EXISTS. The source is 1440×1440, H.264 **High profile @ Level 4.0**,
 * 24fps, 4.3MB, with a stereo AAC track. On desktop that plays fine. On phones
 * it frequently does not:
 *   · 1440² is 8100 macroblocks — right at the Level 4.0 ceiling, and plenty of
 *     mid-range mobile decoders refuse High profile at that size.
 *   · 4.3MB with preload=auto is brutal on South African mobile data, and the
 *     element can sit blank for a long time before it ever decodes.
 *   · The audio track is dead weight in a muted loop.
 * So we re-encode to 720², **Main profile @ Level 3.1**, no audio, faststart —
 * the combination virtually every mobile decoder handles.
 *
 * SEAMLESS LOOP. Cutting at a round number leaves a visible jump when the video
 * wraps. Instead we take the frame at t=0 as the reference, score every candidate
 * frame in a window around the requested cut, and cut at the frame that most
 * closely matches the start. The clip then wraps onto itself invisibly.
 *
 * Run: npm run video
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const SRC = 'logoassets/roachsmokejoint.mp4';
const OUT_DIR = 'public/video';
const OUT = join(OUT_DIR, 'roach.mp4');
const POSTER = 'public/img/roach-poster.webp';

/**
 * Rather than assume a cut point, score the whole back half of the clip against
 * frame 0 and take the best match. A source authored to loop has its true seam
 * at (or very near) the end, but not always exactly — and hard-coding a number
 * would cut mid-rotation on a clip of a different length.
 */
const SEARCH_FROM_FRACTION = 0.55;
const EDGE = 720; // plenty: the stage renders at most ~840px

const ff = (args) => execFileSync(ffmpegPath, ['-y', '-v', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
const probe = (args) => JSON.parse(execFileSync(ffprobeStatic.path, ['-v', 'quiet', '-print_format', 'json', ...args]).toString());

const meta = probe(['-show_format', '-show_streams', SRC]);
const vs = meta.streams.find((s) => s.codec_type === 'video');
const fps = eval(vs.r_frame_rate);
const duration = +meta.format.duration;

console.log(
  `source: ${vs.width}x${vs.height} ${vs.codec_name} ${vs.profile} L${vs.level} ` +
    `${fps.toFixed(2)}fps ${duration.toFixed(2)}s ${(meta.format.size / 1048576).toFixed(2)}MB ` +
    `${meta.streams.some((s) => s.codec_type === 'audio') ? '+audio' : 'no audio'}`,
);

const tmp = mkdtempSync(join(tmpdir(), 'roachvid-'));
try {
  // ── 1. Reference frame (t=0), downscaled to a comparison thumbnail ──
  ff(['-i', SRC, '-vf', 'scale=96:96', '-frames:v', '1', join(tmp, 'ref.png')]);
  const ref = await sharp(join(tmp, 'ref.png')).greyscale().raw().toBuffer();

  // ── 2. Score every candidate cut point in the back of the clip ──
  const from = Math.max(0.5, duration * SEARCH_FROM_FRACTION);
  const to = duration;
  ff([
    '-ss', String(from), '-i', SRC, '-t', String(to - from),
    '-vf', 'scale=96:96', '-vsync', '0',
    join(tmp, 'c-%04d.png'),
  ]);

  const nFrames = Math.round((to - from) * fps);
  let best = { t: duration, diff: Infinity };
  const scores = [];
  for (let i = 1; i <= nFrames; i++) {
    const p = join(tmp, `c-${String(i).padStart(4, '0')}.png`);
    let buf;
    try {
      buf = await sharp(p).greyscale().raw().toBuffer();
    } catch {
      continue;
    }
    let sum = 0;
    for (let k = 0; k < ref.length; k++) sum += Math.abs(ref[k] - buf[k]);
    const diff = sum / ref.length;
    // (i-1) because candidate 1 IS the frame at `from`.
    const t = from + (i - 1) / fps;
    scores.push({ t, diff });
    if (diff < best.diff) best = { t, diff };
  }

  scores.sort((x, y) => x.diff - y.diff);
  console.log(
    'top loop candidates: ' +
      scores.slice(0, 4).map((s) => `${s.t.toFixed(3)}s (Δ${s.diff.toFixed(1)})`).join('  '),
  );

  // Cut ON the matching frame: that frame becomes frame 0 of the next pass, so
  // the clip must end one frame earlier for the wrap to be invisible.
  const cut = Math.max(0.5, best.t - 1 / fps);
  console.log(
    `loop seam: best match to frame 0 at ${best.t.toFixed(3)}s ` +
      `(mean |Δ| ${best.diff.toFixed(1)}/255) → cutting at ${cut.toFixed(3)}s`,
  );
  if (best.diff > 18) {
    console.warn(
      '  ⚠ seam is not a close match — the loop may show a visible jump. ' +
        'That is a property of the source, not the encode.',
    );
  }

  // ── 3. Encode: mobile-safe H.264 ──
  mkdirSync(OUT_DIR, { recursive: true });
  ff([
    '-i', SRC,
    '-t', String(cut),
    '-an',                                   // drop audio: it is a muted loop
    '-vf', `scale=${EDGE}:${EDGE}:flags=lanczos`,
    '-c:v', 'libx264',
    '-profile:v', 'main', '-level:v', '3.1', // the broad-compatibility sweet spot
    '-pix_fmt', 'yuv420p',
    '-crf', '27',
    '-preset', 'slow',
    // Loop-friendly encode. B-frames need reordering, which adds decoder latency
    // exactly at the wrap; frequent keyframes make the seek back to 0 cheap.
    '-bf', '0',
    '-g', '24', '-keyint_min', '24',
    '-movflags', '+faststart',               // moov atom first → starts before full download
    '-avoid_negative_ts', 'make_zero',       // no edit list to offset playback
    '-video_track_timescale', '12288',
    OUT,
  ]);

  // ── 4. Poster from frame 0 — identical to the video's first frame, so there
  //       is no visible swap when playback finally starts. ──
  ff(['-i', SRC, '-frames:v', '1', join(tmp, 'poster.png')]);
  await sharp(join(tmp, 'poster.png')).resize(EDGE, EDGE).webp({ quality: 82 }).toFile(POSTER);

  const outMeta = probe(['-show_format', '-show_streams', OUT]);
  const ov = outMeta.streams.find((s) => s.codec_type === 'video');
  console.log(
    `\noutput: ${ov.width}x${ov.height} ${ov.codec_name} ${ov.profile} L${ov.level} ` +
      `${(+outMeta.format.duration).toFixed(3)}s ${(outMeta.format.size / 1024).toFixed(0)}KB ` +
      `(was ${(meta.format.size / 1048576).toFixed(2)}MB — ` +
      `${(100 - (outMeta.format.size / meta.format.size) * 100).toFixed(0)}% smaller)`,
  );
  console.log(`poster: ${POSTER} (${(statSync(POSTER).size / 1024).toFixed(0)}KB)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
