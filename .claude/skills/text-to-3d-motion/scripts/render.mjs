#!/usr/bin/env node
// render.mjs — render a three.js scene file to MP4 / GIF / PNG frames, frame-exact.
//
//   node render.mjs <scene.js> [--out out.mp4] [--width 1920] [--height 1080] [--fps 30]
//                   [--duration 6] [--from 0] [--to <duration>] [--still 2.5] [--crf 18]
//
// --still <sec>  renders one PNG at that time (fast previews / contact sheets)
// --out *.gif    makes a GIF (palette-optimised), *.mp4 an H.264 yuv420p video,
//      a directory path ending in / writes numbered PNGs
//
// Needs: node 18+, ffmpeg on PATH, `three` and `playwright` resolvable (npm i three playwright),
// plus a Chromium for Playwright (`npx playwright install chromium` if not preinstalled).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.error('usage: node render.mjs <scene.js> [--out out.mp4] [...]'); process.exit(2); }
const opt = (name, def) => { const i = args.indexOf('--' + name); return i > 0 ? args[i + 1] : def; };
const sceneFile = path.resolve(args[0]);

// Resolve three + playwright from the scene's folder first, then cwd, then this script.
const req = [path.dirname(sceneFile), process.cwd(), HERE].map(d => createRequire(path.join(d, 'x.js')));
const resolve = id => { for (const r of req) { try { return r.resolve(id); } catch {} } throw new Error(`Cannot find "${id}". Run: npm i ${id.split('/')[0]}`); };
const threeDir = path.resolve(path.dirname(resolve('three')), '..');   // .../node_modules/three
const pw = await import(resolve('playwright'));
const chromium = pw.chromium ?? pw.default.chromium;

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'application/octet-stream', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const sceneDir = path.dirname(sceneFile);
const routes = [['/three/', threeDir], ['/lib/', path.join(HERE, '..', 'lib')], ['/assets/', sceneDir]];
const server = http.createServer((q, r) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  let file = null;
  if (url === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(fs.readFileSync(path.join(HERE, 'harness.html'))); }
  if (url === '/scene.js') file = sceneFile;
  for (const [pre, dir] of routes) if (url.startsWith(pre)) file = path.join(dir, url.slice(pre.length));
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { r.writeHead(404); return r.end('not found: ' + url); }
  r.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(r);
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ args: ['--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const width = +opt('width', 1920), height = +opt('height', 1080);
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.text().startsWith('[scene]')) console.log(m.text()); });
await page.goto(base + `?w=${width}&h=${height}`);
try { await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 }); }
catch { errors.push('scene setup timed out after 60 s'); }
const setupErr = await page.evaluate(() => window.__error);
if (setupErr || errors.length) { console.error('Scene failed:\n' + [setupErr, ...errors].filter(Boolean).join('\n')); await browser.close(); server.close(); process.exit(1); }

const meta = await page.evaluate(() => window.__meta);
const fps = +opt('fps', meta.fps ?? 30);
const duration = +opt('duration', meta.duration ?? 5);
const from = +opt('from', 0), to = +opt('to', duration);
const still = opt('still', null);
const out = path.resolve(opt('out', still !== null ? sceneFile.replace(/\.m?js$/, `@${still}s.png`) : sceneFile.replace(/\.m?js$/, '.mp4')));

const grab = async t => {
  const b64 = await page.evaluate(t => window.__frame(t), t);
  return Buffer.from(b64.slice(b64.indexOf(',') + 1), 'base64');
};

if (still !== null) {
  fs.writeFileSync(out, await grab(+still));
  console.log(`still ${still}s → ${out}`);
} else {
  const frames = Math.round((to - from) * fps);
  let sink, done;
  const rawOut = opt('out', '');
  if (rawOut.endsWith('/') || rawOut.endsWith(path.sep)) {   // path.resolve drops the trailing slash, so test the raw flag
    fs.mkdirSync(out, { recursive: true });
    sink = { write: (buf, i) => fs.writeFileSync(path.join(out, `f${String(i).padStart(5, '0')}.png`), buf) };
    done = Promise.resolve();
  } else {
    const vf = out.endsWith('.gif')
      ? ['-vf', `fps=${Math.min(fps, 25)},scale=${Math.min(width, 800)}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`]
      : ['-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', '18'), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', ...vf, out], { stdio: ['pipe', 'inherit', 'inherit'] });
    done = new Promise((ok, no) => ff.on('close', c => (c ? no(new Error('ffmpeg exited ' + c)) : ok())));
    sink = { write: buf => new Promise(ok => (ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok))), end: () => ff.stdin.end() };
  }
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await sink.write(await grab(from + i / fps), i);
    if (i % fps === 0) process.stdout.write(`\rframe ${i}/${frames}`);
  }
  sink.end?.(); await done;
  console.log(`\r${frames} frames @ ${fps} fps (${(to - from).toFixed(2)} s) → ${out}  [${((Date.now() - t0) / 1000).toFixed(1)} s]`);
}
if (errors.length) console.warn('warnings:\n' + errors.join('\n'));
await browser.close(); server.close();
