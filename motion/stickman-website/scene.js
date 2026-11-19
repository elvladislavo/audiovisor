// BRIEF — "Strona krok po kroku" (a website, step by step). A cute, calm story: the elvladislavo character
// stands in front of a giant, empty browser window. At three forks two cards pop up beside him; he thinks
// (hand on chin), glances at both, points at the right one: the wrong card goes grey and crossed out, the
// right one turns green with a tick, and the page behind him improves. Then he tests it: the button is
// broken (a tiny bug sits on it), he gently picks the bug off, presses again, the form is sent, confetti.
// Costume details from the outfit photo are added in costume.js.
//
// POLISH TEXT (checked):
//   Jak zrobić dobrą stronę? (How do you make a good website?)
//   Dziesięć czcionek ✗ / Dwie czcionki ✓ (ten fonts / two fonts)
//   Wyraźny kontrast ✓ / Słaby kontrast ✗ (strong contrast / weak contrast)
//   Tylko na komputery ✗ / Także na telefony ✓ (desktop only / phones too)
//   Czy wszystko działa? (Does everything work?) · Przycisk nie działa → Przycisk działa ✓ · Formularz wysłany ✓
//   Dobre decyzje, dobra strona. (Good decisions, a good website.) · elvladislavo.com
//   On the page: Twoja strona · Start · O mnie · Kontakt · Prosto, szybko i czytelnie. · Z myślą o ludziach. ·
//   Twój e-mail · Wyślij · Błąd! · Wysłano ✓
// BEATS (s)
//   0–3     boots → face crane (croc shoes, stitching, cuffs, tie)
//   3–6     pull back: the empty browser window behind him; "Jak zrobić dobrą stronę?"; he scratches his head
//   6–11    fork 1 · fonts: chaotic headline → clean one, hero image appears
//   11–16   fork 2 · contrast: pale text → crisp text, the form appears
//   16–21   fork 3 · phones: a phone slides in with the mobile layout
//   21–28   test: walks to the button, press → bug + error, picks the bug off, press → sent, confetti
//   28–34   turns to camera, the photo pose (fists out); "Dobre decyzje, dobra strona." + elvladislavo.com
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-website/scene.js --width 1080 --height 1920 --out website.mp4
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';
import { dressUp } from '/assets/costume.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const bump = (t, a, b) => Math.sin(PI * Math.min(1, Math.max(0, (t - a) / (b - a))));
const T_END = 34;
export const meta = { duration: T_END, fps: 30, background: '#efe6f6' };

/* ───────────── layout ───────────── */
const BOARD = { x: 0, y: 2.1, z: -1.2, w: 3.2, h: 3.6 };            // the giant browser window
const CW = 1024, CH = 1152;                                          // its canvas
const cv2w = (cx, cy) => [BOARD.x - BOARD.w / 2 + cx / CW * BOARD.w, BOARD.y + BOARD.h / 2 - cy / CH * BOARD.h, BOARD.z + 0.03];
const BTN_C = [750, 850], BTN = cv2w(...BTN_C);
const PHONE = [-1.3, 1.45, -0.45];
const CARD_L = [-0.95, 1.45, 0.9], CARD_R = [0.95, 1.0, 0.9];

// fork timings: cards in, decision, cards out, which side is right
const FORKS = [
  { show: 6.0, fix: 8.7, out: 10.9, L: 'Dziesięć czcionek', R: 'Dwie czcionki', good: 'R' },
  { show: 11.2, fix: 13.8, out: 15.9, L: 'Wyraźny kontrast', R: 'Słaby kontrast', good: 'L' },
  { show: 16.3, fix: 18.9, out: 21.0, L: 'Tylko na komputery', R: 'Także na telefony', good: 'R' },
];
const T_FONT = 8.9, T_CONTRAST = 14.0, T_PHONE = 19.1;
const T_PRESS1 = 22.95, T_PICK = 24.2, T_RELEASE = 25.0, T_FIXED = 25.15, T_PRESS2 = 25.85, T_URL = 28.6;

/* ───────────── his path and poses ───────────── */
const HERO = {
  x: [[0, 0], [21.3, 0], [22.5, 0.58, E.inOutQuad], [26.75, 0.58], [27.9, 0.2, E.inOutQuad]],
  z: [[0, 0.6], [21.3, 0.6], [22.5, -0.55, E.inOutQuad], [26.75, -0.55], [27.9, 0.3, E.inOutQuad]],
  yaw: [[0, 0], [21.05, 0], [21.45, 2.67], [22.3, 2.67], [22.6, PI], [24.3, PI], [24.65, 1.25], [24.95, 1.25], [25.35, PI], [26.35, PI], [26.8, 2 * PI - 0.42], [27.85, 2 * PI - 0.42], [28.2, 2 * PI]],
};
const walk = (t, f = 1.6) => { const p = t * 2 * PI * f, q = Math.sin(p);
  return { hipsY: 0.94 + 0.015 * Math.abs(Math.cos(p)), spine: [0.04, 0, 0], head: [0.05, 0, 0], hipL: [-0.42 * q, 0, 0.02], hipR: [0.42 * q, 0, -0.02],
    kneeL: [0.12 + 0.55 * Math.max(0, Math.sin(p - 1.2)), 0, 0], kneeR: [0.12 + 0.55 * Math.max(0, Math.sin(p + PI - 1.2)), 0, 0],
    shoulderL: [0.3 * q, 0, 0.12], shoulderR: [-0.3 * q, 0, -0.12], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0] }; };
const P = {
  stand: t => ({ hipsY: 0.95 - 0.004 * Math.sin(t * 2.2), spine: [0.01 * Math.sin(t * 2.2), 0, 0], head: [0.04, 0, 0.03 * Math.sin(t * 0.9)],
    shoulderL: [0, 0, 0.1], shoulderR: [0, 0, -0.1], elbowL: [-0.18, 0, 0], elbowR: [-0.18, 0, 0], hipL: [0, 0, 0.04], hipR: [0, 0, -0.04] }),
  think: t => ({ hipsY: 0.95, spine: [0.03, 0, 0.03], head: [0.1, 0, 0.12], shoulderL: [-0.35, -1.0, -0.12], elbowL: [-1.55, 0, 0], shoulderR: [0, 0, -0.1], elbowR: [-0.2, 0, 0],
    hipL: [0, 0, 0.05], hipR: [0.05, 0, -0.08], kneeR: [0.12, 0, 0] }),
  walk: t => walk(t),
  flex: t => { const b = Math.max(0, Math.sin((t - 28.0) * 2 * PI * 1.1)) * sm(28.0, 28.3, t);   // the photo pose: arms out, fists, little bounce
    return { hipsY: 0.95 - 0.03 * b, spine: [-0.04, 0, 0], head: [-0.06, 0, 0.06 * Math.sin(t * 1.6)], shoulderL: [-0.25, 0, 0.78], elbowL: [-0.55, 0, 0], shoulderR: [-0.25, 0, -0.78], elbowR: [-0.55, 0, 0],
      hipL: [0, 0, 0.1], hipR: [0, 0, -0.1], kneeL: [0.06 * b, 0, 0], kneeR: [0.06 * b, 0, 0] }; },
};
const KEYS = [[0, P.stand], [6.0, P.stand], [6.35, P.think], [8.3, P.think], [8.6, P.stand], [11.2, P.stand], [11.55, P.think], [13.3, P.think], [13.6, P.stand],
  [16.3, P.stand], [16.65, P.think], [18.5, P.think], [18.8, P.stand], [21.1, P.stand], [21.35, P.walk], [22.35, P.walk], [22.6, P.stand],
  [26.55, P.stand], [26.8, P.walk], [27.75, P.walk], [28.1, P.flex], [T_END + 1, P.flex]];
// head yaw: + turns his face toward +x (screen right while he faces the camera)
const LOOK = [[0, 0], [6.3, 0], [6.6, -0.42], [7.3, -0.42], [7.6, 0.42], [8.3, 0.42], [8.6, 0.3], [9.8, 0.3], [10.2, 0],
  [11.5, 0], [11.8, 0.42], [12.5, 0.42], [12.8, -0.42], [13.4, -0.42], [13.7, -0.3], [14.9, -0.3], [15.3, 0],
  [16.6, 0], [16.9, -0.42], [17.6, -0.42], [17.9, 0.42], [18.6, 0.42], [18.9, 0.3], [20.0, 0.3], [20.4, 0], [T_END, 0]];

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 55 : 40; camera.near = 0.02; camera.far = 200; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.0;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const tagFont = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`), titleFont = new FontFace('Title', `url(${asset('Fruktur.ttf')})`);
  await Promise.all([tagFont.load(), titleFont.load()]); document.fonts.add(tagFont); document.fonts.add(titleFont);

  /* pastel studio: lavender → peach sky, cream floor with a design-canvas dot grid */
  { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#c9b8f0'); gr.addColorStop(0.55, '#f1dff3'); gr.addColorStop(1, '#ffe6cf'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
  scene.fog = new THREE.Fog(0xf6e6ee, 14, 40);
  scene.add(new THREE.HemisphereLight(0xfff5f0, 0xb9a6d6, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0dd, 2.0); sun.position.set(-4, 8, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun); const rim = new THREE.DirectionalLight(0xd8c8ff, 0.8); rim.position.set(3, 4, -6); scene.add(rim);

  const man = dressUp(buildStickman({ seed: 7 })); scene.add(man.system);
  const { J } = man, ramp = man.ramp, ink = man.outlineMat;
  const toon = (c, x = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...x });
  const inked = (geo, mat, p = [0, 0, 0], parent = scene, outline = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (outline) m.add(new THREE.Mesh(geo, ink)); return m; };
  const ctex = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };

  const dots = ctex(128, 128, (g, w, h) => { g.fillStyle = '#f7f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9cbe8'; g.beginPath(); g.arc(64, 64, 5, 0, 7); g.fill(); }, 40, 40);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshToonMaterial({ map: dots, gradientMap: ramp })); floor.rotation.x = -PI / 2; floor.receiveShadow = true; scene.add(floor);

  /* floating UI décor behind the window: shapes, a cursor, colour swatches, an "Aa" card */
  const deco = [];
  const pastel = [0xffb3c7, 0xb8e0ff, 0xffe08a, 0xc5f0c8, 0xd6c2ff, 0xffc9a8];
  const decoAdd = (mesh, base, amp, ph) => { deco.push({ mesh, base: V3(...base), amp, ph }); return mesh; };
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, x = side * (2.0 + rnd() * 2.2), y = 0.6 + rnd() * 4.6, z = -2.4 - rnd() * 3.5;
    const kind = i % 3, col = toon(pastel[i % pastel.length]);
    const geo = kind === 0 ? new RoundedBoxGeometry(0.55, 0.55, 0.12, 3, 0.1) : kind === 1 ? new THREE.SphereGeometry(0.28, 20, 14) : new THREE.TorusGeometry(0.24, 0.08, 10, 24);
    const m = inked(geo, col, [x, y, z]); m.rotation.set(rnd() * 0.6, rnd() * 0.8, rnd() * 0.6); decoAdd(m, [x, y, z], 0.08 + rnd() * 0.06, rnd() * 6);
  }
  { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, -0.62); sh.lineTo(0.15, -0.48); sh.lineTo(0.26, -0.72); sh.lineTo(0.35, -0.68); sh.lineTo(0.24, -0.45); sh.lineTo(0.44, -0.45); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    const cur = inked(g, toon(0xffffff), [2.25, 4.1, -1.9]); cur.rotation.set(0, -0.3, -0.25); decoAdd(cur, [2.25, 4.1, -1.9], 0.1, 1.3); }
  { const tx = ctex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(0, 0, w, h, 36); g.fill(); g.fillStyle = '#3b2f5c'; g.font = '130px Title'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Aa', w / 2, h / 2 + 6); });
    const aa = inked(new THREE.BoxGeometry(0.8, 0.8, 0.06), [toon(0xffffff), toon(0xffffff), toon(0xffffff), toon(0xffffff), new THREE.MeshToonMaterial({ map: tx, gradientMap: ramp }), toon(0xffffff)], [-2.35, 3.7, -2.0]);
    aa.rotation.set(0.05, 0.35, 0.12); decoAdd(aa, [-2.35, 3.7, -2.0], 0.09, 2.7); }
  { const sw = new THREE.Group(); sw.position.set(-2.3, 1.2, -2.2); sw.rotation.set(0, 0.4, 0.1); scene.add(sw);
    [0xff5c8a, 0x3b2f5c, 0x22a35a, 0xffe08a].forEach((c, i) => inked(new RoundedBoxGeometry(0.26, 0.26, 0.06, 2, 0.05), toon(c), [0, i * 0.3, 0], sw)); decoAdd(sw, [-2.3, 1.2, -2.2], 0.07, 4.1); }

  /* the browser window: bezel, stand, live canvas page */
  const pageCanvas = document.createElement('canvas'); pageCanvas.width = CW; pageCanvas.height = CH;
  const pageTex = new THREE.CanvasTexture(pageCanvas); pageTex.colorSpace = THREE.SRGBColorSpace; pageTex.anisotropy = 8;
  const bezelM = toon(0x3b2f5c);
  inked(new RoundedBoxGeometry(BOARD.w + 0.16, BOARD.h + 0.16, 0.1, 3, 0.06), bezelM, [BOARD.x, BOARD.y, BOARD.z - 0.04]);
  for (const sx of [-1, 1]) inked(new THREE.BoxGeometry(0.1, 0.4, 0.1), bezelM, [sx * 1.1, 0.15, BOARD.z - 0.04]);
  inked(new RoundedBoxGeometry(2.8, 0.06, 0.6, 2, 0.02), bezelM, [0, 0.03, BOARD.z - 0.04]);
  const pagePlane = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), new THREE.MeshBasicMaterial({ map: pageTex, toneMapped: false }));
  pagePlane.position.set(BOARD.x, BOARD.y, BOARD.z + 0.015); scene.add(pagePlane);

  /* the phone (slides in at fork 3) */
  const phoneCanvas = document.createElement('canvas'); phoneCanvas.width = 480; phoneCanvas.height = 960;
  const phoneTex = new THREE.CanvasTexture(phoneCanvas); phoneTex.colorSpace = THREE.SRGBColorSpace; phoneTex.anisotropy = 8;
  const phone = new THREE.Group(); phone.scale.setScalar(1.25); scene.add(phone);
  inked(new RoundedBoxGeometry(0.95, 1.85, 0.09, 4, 0.12), bezelM, [0, 0, -0.03], phone);
  { const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.64), new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false })); scr.position.z = 0.018; phone.add(scr); }
  inked(new THREE.BoxGeometry(0.5, 0.06, 0.3), bezelM, [0, -0.95, 0.0], phone);

  /* page drawing — everything a function of t (redrawn every frame) */
  const INK = '#262433', PINK = '#ff5c8a', GREEN = '#22a35a', RED = '#e5484d';
  const CHAOS = ['Title', 'serif', 'monospace', 'Tag', 'cursive', 'fantasy', 'Georgia', 'Courier New'];
  const CHAOS_C = ['#e5484d', '#2f6fde', '#22a35a', '#a64dff', '#ff9a1f', '#262433'];
  function btnState(t) {
    if (t >= T_PRESS2 + 0.08) return 'ok';
    if (t >= T_PRESS1 + 0.08 && t < T_FIXED) return 'err';
    return 'idle';
  }
  function drawPage(g, W, H, t, mobile) {
    const s = W / CW;                                           // scale for the phone
    const fontOn = t >= T_FONT, bodyOn = t >= FORKS[1].show, contrast = sm(T_CONTRAST - 0.15, T_CONTRAST + 0.35, t), formOn = t >= T_CONTRAST;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    // chrome
    const top = mobile ? 70 : 110;
    g.fillStyle = '#ece6f5'; g.fillRect(0, 0, W, top);
    if (!mobile) [['#ff6159', 50], ['#ffbd2e', 92], ['#28c941', 134]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 55, 15, 0, 7); g.fill(); });
    const ux = mobile ? 24 : 180, uw = W - ux - (mobile ? 24 : 40), uh = mobile ? 44 : 62, uy = (top - uh) / 2;
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(ux, uy, uw, uh, uh / 2); g.fill();
    g.fillStyle = '#8a80a6'; g.font = `${mobile ? 24 : 32}px Tag`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText((t >= T_URL ? 'elvladislavo.com' : 'twojastrona.pl'), ux + 24, uy + uh / 2 + 2);
    const ghost = (x, y, w, h) => { g.save(); g.setLineDash([14, 10]); g.lineWidth = 4; g.strokeStyle = '#d6cfe6'; g.beginPath(); g.roundRect(x, y, w, h, 18); g.stroke(); g.restore(); };
    const glow = (x, y, w, h, t0) => { const a = 1 - range(t, t0, t0 + 1.6); if (a <= 0 || t < t0) return; g.save(); g.globalAlpha = a; g.lineWidth = 10; g.strokeStyle = GREEN; g.beginPath(); g.roundRect(x, y, w, h, 22); g.stroke(); g.restore(); };
    if (mobile) {                                               // stacked mobile layout (always the finished design)
      g.fillStyle = INK; g.font = '22px Tag'; g.fillText('☰', 24, 112); g.fillStyle = PINK; g.beginPath(); g.arc(W - 40, 112, 16, 0, 7); g.fill();
      g.fillStyle = INK; g.font = '64px Tag'; g.textAlign = 'left'; g.fillText('Twoja', 28, 210); g.fillText('strona', 28, 280);
      g.font = '28px sans-serif'; g.fillStyle = '#4a4560'; g.fillText('Prosto, szybko', 28, 345); g.fillText('i czytelnie.', 28, 382);
      heroArt(g, 28, 420, W - 56, 260);
      g.strokeStyle = '#cfc7e2'; g.lineWidth = 4; g.beginPath(); g.roundRect(28, 712, W - 56, 76, 20); g.stroke();
      g.fillStyle = '#9a93ad'; g.font = '28px sans-serif'; g.fillText('Twój e-mail', 52, 752);
      button(g, 28, 812, W - 56, 90, btnState(t), 34, 0);
      return;
    }
    // nav
    g.fillStyle = fontOn ? PINK : '#e6e0f0'; g.beginPath(); g.arc(80, 160, 26, 0, 7); g.fill();
    if (fontOn) { g.fillStyle = INK; g.font = '30px Tag'; g.textAlign = 'right'; g.fillText('Start     O mnie     Kontakt', W - 50, 162); }
    else [560, 720, 860].forEach(x => { g.fillStyle = '#ebe6f3'; g.beginPath(); g.roundRect(x, 148, 110, 24, 12); g.fill(); });
    g.fillStyle = '#efeaf6'; g.fillRect(0, 214, W, 4);
    // headline
    if (t < FORKS[0].show) {
      ghost(70, 250, 620, 120);
      if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = INK; g.fillRect(96, 270, 8, 80); }   // blinking cursor
    } else if (!fontOn) {
      const word = 'Twoja strona', k = Math.floor(t * 6); let x = 76;
      for (let i = 0; i < word.length; i++) {
        const f = CHAOS[(i * 3 + k) % CHAOS.length], size = 70 + ((i * 7 + k * 3) % 5) * 12;
        g.font = `${size}px ${f}`; g.fillStyle = CHAOS_C[(i + k) % CHAOS_C.length]; g.textAlign = 'left';
        g.save(); g.translate(x, 318); g.rotate(((i * 5 + k) % 5 - 2) * 0.06); g.fillText(word[i], 0, 0); g.restore();
        x += g.measureText(word[i]).width + 2;
      }
    } else { g.fillStyle = INK; g.font = '104px Tag'; g.textAlign = 'left'; g.fillText('Twoja strona', 70, 318); }
    glow(50, 236, 924, 150, T_FONT);
    // body copy
    if (!bodyOn) { ghost(70, 400, 700, 50); ghost(70, 462, 520, 50); }
    else {
      const c = new THREE.Color('#e4e0ea').lerp(new THREE.Color('#4a4560'), contrast);
      g.fillStyle = '#' + c.getHexString(); g.font = '44px sans-serif'; g.textAlign = 'left';
      g.fillText('Prosto, szybko i czytelnie.', 72, 428); g.fillText('Z myślą o ludziach.', 72, 488);
    }
    glow(50, 386, 924, 132, T_CONTRAST);
    // hero image
    if (!fontOn) ghost(70, 540, 884, 220); else heroArt(g, 70, 540, 884, 220);
    // form
    if (!formOn) { ghost(70, 800, 500, 100); ghost(600, 800, 300, 100); }
    else {
      g.strokeStyle = '#cfc7e2'; g.lineWidth = 5; g.beginPath(); g.roundRect(70, 800, 500, 100, 26); g.stroke();
      g.fillStyle = '#9a93ad'; g.font = '38px sans-serif'; g.textAlign = 'left'; g.fillText('Twój e-mail', 104, 852);
      const st = btnState(t), shake = st === 'err' ? Math.sin(t * 45) * 8 * (1 - sm(T_PRESS1, T_PRESS1 + 0.9, t) * 0.7) : 0;
      const press = 1 - 0.06 * (bump(t, T_PRESS1 - 0.1, T_PRESS1 + 0.15) + bump(t, T_PRESS2 - 0.1, T_PRESS2 + 0.15));
      g.save(); g.translate(BTN_C[0] + shake, BTN_C[1]); g.scale(press, press); button(g, -150, -50, 300, 100, st, 42, t); g.restore();
    }
    // footer
    g.fillStyle = '#f4f0fa'; g.fillRect(0, H - 90, W, 90); g.fillStyle = '#b4abc9'; g.font = '28px Tag'; g.textAlign = 'center';
    g.fillText(t >= T_URL ? '© 2026 elvladislavo.com' : '© 2026', W / 2, H - 42);
  }
  function button(g, x, y, w, h, st, fs) {
    g.fillStyle = st === 'ok' ? GREEN : st === 'err' ? RED : PINK;
    g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = `${fs}px Tag`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(st === 'ok' ? 'Wysłano ✓' : st === 'err' ? 'Błąd!' : 'Wyślij', x + w / 2, y + h / 2 + 3);
  }
  function heroArt(g, x, y, w, h) {
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, 26); g.clip();
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#bfe3ff'); gr.addColorStop(1, '#ffe2f0'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = '#ffd05a'; g.beginPath(); g.arc(x + w * 0.78, y + h * 0.35, h * 0.17, 0, 7); g.fill();
    g.fillStyle = '#9fd8a8'; g.beginPath(); g.ellipse(x + w * 0.25, y + h * 1.05, w * 0.4, h * 0.5, 0, 0, 7); g.fill();
    g.fillStyle = '#7cc48b'; g.beginPath(); g.ellipse(x + w * 0.75, y + h * 1.12, w * 0.45, h * 0.5, 0, 0, 7); g.fill();
    g.restore();
  }

  /* the little bug on the button */
  const bug = new THREE.Group(); scene.add(bug);
  { const bodyM = toon(0x8f5cf2);
    const b = inked(new THREE.SphereGeometry(0.06, 18, 14), bodyM, [0, 0, 0], bug); b.scale.set(1, 0.9, 0.85);
    for (const sx of [1, -1]) {
      inked(new THREE.SphereGeometry(0.02, 12, 10), toon(0xffffff), [sx * 0.024, 0.016, 0.046], bug);
      inked(new THREE.SphereGeometry(0.009, 8, 6), toon(0x111111), [sx * 0.024, 0.016, 0.064], bug, false);
      const a = inked(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 5), toon(0x2a1a4a), [sx * 0.022, 0.07, 0.01], bug, false); a.rotation.z = -sx * 0.4;
      inked(new THREE.SphereGeometry(0.01, 8, 6), toon(0xff5c8a), [sx * 0.034, 0.1, 0.01], bug, false);
      for (let i = 0; i < 3; i++) { const l = inked(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 4), toon(0x2a1a4a), [sx * 0.055, -0.03, -0.02 + i * 0.02], bug, false); l.rotation.z = sx * 0.9; }
    }
    for (const sx of [1, -1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.045, 14), new THREE.MeshToonMaterial({ color: 0xe8f4ff, gradientMap: ramp, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
      const pv = new THREE.Group(); pv.position.set(sx * 0.02, 0.04, -0.035); pv.add(w); w.position.x = sx * 0.045; pv.userData.sx = sx; bug.add(pv); }
  }
  const bugWings = bug.children.filter(o => o.userData.sx);

  /* confetti: a burst from the button, then a gentle rain at the end */
  const CONF = 320, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.045, 0.028), new THREE.MeshToonMaterial({ gradientMap: ramp, side: THREE.DoubleSide }), CONF);
  conf.frustumCulled = false; scene.add(conf);
  const confCols = [0xff5c8a, 0xffd05a, 0x22a35a, 0x5aa9ff, 0xa64dff, 0xffffff];
  const parts = [];
  for (let i = 0; i < CONF; i++) {
    conf.setColorAt(i, new THREE.Color(confCols[i % confCols.length]));
    if (i < 90) { const a = rnd() * 2 * PI, s = 0.6 + rnd() * 1.4;
      parts.push({ t0: T_PRESS2 + rnd() * 0.08, p: [BTN[0], BTN[1], BTN[2] + 0.05], v: [Math.cos(a) * s, 1.6 + rnd() * 2.0, 0.6 + rnd() * 1.4 + Math.sin(a) * 0.3], g: 5.0, ph: rnd() * 6, spin: 4 + rnd() * 8 }); }
    else parts.push({ t0: 28.9 + rnd() * 2.5, p: [(rnd() - 0.5) * 5, 5.6 + rnd() * 0.5, -1 + rnd() * 3.5], v: [0, -(0.55 + rnd() * 0.5), 0], g: 0, ph: rnd() * 6, spin: 2 + rnd() * 5 });
  }
  const dummy = new THREE.Object3D();

  /* tags + captions */
  const STY = {
    open: { bg: '#fbfaf5', fg: '#2b3440', icon: '?', ic: '#7a5cf0' },
    wrong: { bg: '#cfccd6', fg: '#77737f', icon: '✗', ic: '#77737f', strike: true },
    right: { bg: '#22a35a', fg: '#ffffff', icon: '✓', ic: '#ffffff' },
    alert: { bg: '#e5484d', fg: '#ffffff', icon: '!', ic: '#ffffff' },
  };
  function tagTex(text, style) {                          // canvas sized to the card, so `frac` is the card's own screen width
    const S = STY[style], H = 200, g0 = document.createElement('canvas').getContext('2d');
    g0.font = '96px Tag'; const tw = g0.measureText(text).width, W = Math.ceil(tw + 210);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = 'rgba(40,20,70,0.2)'; g.beginPath(); g.roundRect(6, 16, W - 8, H - 20, (H - 20) / 2); g.fill();
    g.fillStyle = S.bg; g.beginPath(); g.roundRect(2, 6, W - 10, H - 22, (H - 22) / 2); g.fill();
    const ix = 82, iy = 95;
    if (S.icon === '✓') { g.strokeStyle = S.ic; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(ix - 28, iy + 2); g.lineTo(ix - 6, iy + 24); g.lineTo(ix + 30, iy - 20); g.stroke(); }
    else if (S.icon === '✗') { g.strokeStyle = S.ic; g.lineWidth = 15; g.lineCap = 'round'; g.beginPath(); g.moveTo(ix - 22, iy - 22); g.lineTo(ix + 22, iy + 22); g.moveTo(ix + 22, iy - 22); g.lineTo(ix - 22, iy + 22); g.stroke(); }
    else { g.fillStyle = S.ic; g.font = '96px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.icon, ix, iy + 6); }
    g.font = '96px Tag'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = S.fg; g.fillText(text, 150, iy + 4);
    if (S.strike) { g.strokeStyle = '#5d5966'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(140, iy + 2); g.lineTo(160 + tw, iy - 2); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.aspect = H / W; return t;
  }
  function captionTex(text) {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 240; const g = c.getContext('2d');
    g.font = '96px Tag'; const fs = Math.min(96, 96 * 1180 / g.measureText(text).width); g.font = `${fs}px Tag`;
    const w = g.measureText(text).width + 120, x0 = (1400 - w) / 2;
    g.fillStyle = '#3b2f5c'; g.beginPath(); g.roundRect(x0, 30, w, 180, 90); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 700, 124);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  function urlTex() {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 300; const g = c.getContext('2d');
    g.font = '200px Title'; const fs = Math.min(200, 200 * 1260 / g.measureText('elvladislavo.com').width); g.font = `${fs}px Title`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.strokeStyle = '#000000'; g.lineWidth = 26; g.strokeText('elvladislavo.com', 700, 160);
    g.fillStyle = '#ffffff'; g.fillText('elvladislavo.com', 700, 160);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const mkSprite = (tex, aspect) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0 }));
    s.renderOrder = 10; s.userData.aspect = aspect ?? tex.userData.aspect; scene.add(s); return s; };
  const forkTags = FORKS.map(f => ({
    f,
    L: { open: mkSprite(tagTex(f.L, 'open')), res: mkSprite(tagTex(f.L, f.good === 'L' ? 'right' : 'wrong')), good: f.good === 'L' },
    R: { open: mkSprite(tagTex(f.R, 'open')), res: mkSprite(tagTex(f.R, f.good === 'R' ? 'right' : 'wrong')), good: f.good === 'R' },
  }));
  const testTags = {
    alert: mkSprite(tagTex('Przycisk nie działa', 'alert')), fixed: mkSprite(tagTex('Przycisk działa', 'right')),
    sent: mkSprite(tagTex('Formularz wysłany', 'right')),
  };
  const caps = {
    how: mkSprite(captionTex('Jak zrobić dobrą stronę?'), 240 / 1400), works: mkSprite(captionTex('Czy wszystko działa?'), 240 / 1400),
    good: mkSprite(captionTex('Dobre decyzje, dobra strona.'), 240 / 1400), url: mkSprite(urlTex(), 300 / 1400),
  };
  const hTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (width / height), vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const camDir = new THREE.Vector3();
  function fitTag(sprite, pos, frac) {
    const d = Math.max(0.3, pos.clone().sub(camera.position).dot(camera.getWorldDirection(camDir)));
    const w = frac * 2 * d * hTan; sprite.scale.set(w, w * sprite.userData.aspect, 1);
    const v = pos.clone().project(camera), lim = Math.max(0, 1 - frac * 0.97 - 0.02), raw = v.x, front = v.z < 1;
    v.x = Math.max(-lim, Math.min(lim, v.x)); v.y = Math.min(0.86, Math.max(-0.86, v.y)); sprite.position.copy(v.unproject(camera));
    return (1 - sm(1.0, 1.3, Math.abs(raw))) * (front ? 1 : 0);
  }
  const hudR = new THREE.Vector3(), hudU = new THREE.Vector3(), hudF = new THREE.Vector3();
  function hud(sprite, nx, ny, frac) {                         // fixed screen position (NDC), 1 m in front of the camera
    camera.matrixWorld.extractBasis(hudR, hudU, hudF);
    sprite.position.copy(camera.position).addScaledVector(hudF, -1).addScaledVector(hudR, nx * hTan).addScaledVector(hudU, ny * vTan);
    const w = frac * 2 * hTan; sprite.scale.set(w, w * sprite.userData.aspect, 1);
  }

  /* post */
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());

  /* two-bone IK for either arm toward a world point, blended with the pose; the elbow points toward `pole` */
  const L1 = 0.3, L2 = 0.3;
  function reachTo(side, target, pole, w) {
    if (w <= 0.001) return;
    const sh = J['shoulder' + side], el = J['elbow' + side];
    const q0 = sh.quaternion.clone(), e0 = el.rotation.x;
    const tg = J.spine.worldToLocal(target.clone()), d = tg.sub(sh.position);
    const dist = Math.min(d.length(), (L1 + L2) * 0.999); d.normalize();
    const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    const n = new THREE.Vector3().crossVectors(d, pole).normalize(), perp = new THREE.Vector3().crossVectors(n, d).normalize();
    const u = d.clone().multiplyScalar(Math.cos(a)).addScaledVector(perp, Math.sin(a)).normalize();
    const X = n.clone(), Y = u.clone().negate(), Z = new THREE.Vector3().crossVectors(X, Y).normalize(); X.crossVectors(Y, Z).normalize();
    const qIK = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const f = d.clone().multiplyScalar(dist).addScaledVector(u, -L1).normalize();
    sh.quaternion.copy(q0).slerp(qIK, w); el.rotation.set(lerp(e0, Math.atan2(-f.dot(Z), -f.dot(Y)), w), 0, 0);
  }
  const lerpV = (a, b, k) => a.clone().lerp(b, k);
  const chin = () => J.head.localToWorld(V3(-0.005, 0.035, 0.2));
  const headSide = t => J.head.localToWorld(V3(-0.13, 0.27 + 0.02 * Math.sin(t * 22), 0.0));
  const nearFace = () => J.head.localToWorld(V3(0.0, 0.08, 0.36));
  const pointAt = (side, card) => { const s = J['shoulder' + side].getWorldPosition(V3(0, 0, 0)); return s.clone().add(V3(...card).sub(s).normalize().multiplyScalar(0.59)); };
  const POLE_R = V3(-1, -0.6, -0.4), POLE_L = V3(1, -0.6, -0.4), POLE_CHIN = V3(-0.3, -1, 0.35), POLE_UP = V3(-1, 0.3, -0.2);
  const bugPerch = V3(BTN[0] + 0.1, BTN[1] + 0.09, BTN[2] + 0.06);
  // arm plans: [from, to, side, t => ({ p, pole })]; weight ramps in/out over 0.4 s at the ends
  const ARM = [
    [3.9, 5.75, 'R', t => ({ p: headSide(t), pole: POLE_UP })],                                                            // scratches his head
    [6.2, 8.55, 'R', () => ({ p: chin(), pole: POLE_CHIN })],                                                              // fork 1: think…
    [8.35, 9.95, 'L', () => ({ p: pointAt('L', CARD_R), pole: POLE_L })],                                                  // …point right
    [11.4, 15.0, 'R', t => { const k = sm(13.25, 13.75, t); return { p: lerpV(chin(), pointAt('R', CARD_L), k), pole: lerpV(POLE_CHIN, POLE_R, k) }; }],   // fork 2: think → point left
    [16.5, 18.85, 'R', () => ({ p: chin(), pole: POLE_CHIN })],                                                            // fork 3: think…
    [18.65, 20.1, 'L', () => ({ p: pointAt('L', CARD_R), pole: POLE_L })],                                                 // …point right
    [22.35, 23.5, 'R', t => ({ p: V3(BTN[0] - 0.06, BTN[1], BTN[2] + 0.1 - 0.08 * bump(t, T_PRESS1 - 0.2, T_PRESS1 + 0.2)), pole: POLE_R })],   // press 1
    [23.75, 26.3, 'R', t => {                                                                                              // pick the bug, hold it up, let it go, press again
      const k1 = sm(T_PICK + 0.15, T_PICK + 0.55, t), k2 = sm(T_RELEASE + 0.1, T_RELEASE + 0.55, t);
      const btn = V3(BTN[0] - 0.06, BTN[1], BTN[2] + 0.1 - 0.08 * bump(t, T_PRESS2 - 0.2, T_PRESS2 + 0.2));
      return { p: lerpV(lerpV(bugPerch.clone().add(V3(-0.02, 0, 0.03)), nearFace(), k1), btn, k2), pole: POLE_R }; }],
  ];
  const armStates = t => ARM.filter(([a, b]) => t > a && t < b).map(([a, b, side, f]) => ({ side, w: sm(a, a + 0.4, t) * (1 - sm(b - 0.4, b, t)), ...f(t) }));

  /* camera */
  const MAIN = { pos: V3(0, 1.75, 4.9), look: V3(0, 1.95, -1.2) }, WIDE3 = { pos: V3(-0.3, 1.75, 5.3), look: V3(-0.3, 1.9, -1.2) };
  const heroCom = V3(), handR = V3();
  const SHOTS = [
    [0, 3.0, t => { const u = E.inOutCubic(range(t, 0.15, 2.7));
      return { pos: V3(lerp(0.4, 0.12, u), lerp(0.24, 1.72, u), lerp(1.6, 1.85, u)), look: V3(lerp(0.05, 0, u), lerp(0.1, 1.72, u), 0.6) }; }],
    [3.0, 21.3, t => { const u = E.inOutCubic(range(t, 3.0, 5.3)), w = sm(18.9, 20.2, t);
      const face = { pos: V3(0.12, 1.72, 1.85), look: V3(0, 1.72, 0.6) };
      const base = { pos: lerpV(MAIN.pos, WIDE3.pos, w), look: lerpV(MAIN.look, WIDE3.look, w) };
      return { pos: lerpV(face.pos, base.pos, u), look: lerpV(face.look, base.look, u) }; }],
    [21.3, 27.3, t => { const k = sm(24.0, 24.6, t) * (1 - sm(25.15, 25.65, t));
      const side = { pos: V3(2.7, 1.75, 2.4), look: V3(0.4, 1.35, -0.9) }, close = { pos: V3(2.0, 1.7, 1.25), look: V3(0.55, 1.6, -0.45) };
      return { pos: lerpV(side.pos, close.pos, k), look: lerpV(side.look, close.look, k) }; }],
    [27.3, T_END + 1, t => { const u = E.inOutCubic(range(t, 27.3, 30.0)), v = E.inOutCubic(range(t, 30.0, T_END));
      return { pos: lerpV(lerpV(V3(1.5, 1.6, 3.4), V3(0, 1.55, 5.7), u), V3(0, 1.6, 5.3), v), look: lerpV(V3(0.2, 1.4, 0), V3(0, 1.95, -1.2), u) }; }],
  ];
  const BLEND = 0.35;

  console.log('[scene] button at', BTN.map(v => v.toFixed(2)).join(', '));

  return {
    update(t) {
      /* him */
      man.system.position.set(key(t, HERO.x), 0, key(t, HERO.z)); man.system.rotation.set(0, key(t, HERO.yaw), 0);
      man.applyPose(KEYS, t);
      J.head.rotation.y += key(t, LOOK);
      J.head.rotation.x += 0.16 * (bump(t, FORKS[0].fix - 0.1, FORKS[0].fix + 0.4) + bump(t, FORKS[1].fix - 0.1, FORKS[1].fix + 0.4) + bump(t, FORKS[2].fix - 0.1, FORKS[2].fix + 0.4));   // a nod at each decision
      man.system.updateMatrixWorld(true);
      for (const a of armStates(t)) { reachTo(a.side, a.p, a.pole, a.w); man.system.updateMatrixWorld(true); }
      heroCom.set(0, 1, 0).applyMatrix4(man.system.matrixWorld); handR.copy(J.elbowR.localToWorld(V3(0, -0.3, 0)));

      /* page + phone */
      drawPage(pageCanvas.getContext('2d'), CW, CH, t, false); pageTex.needsUpdate = true;
      const ph = E.outBack(range(t, T_PHONE, T_PHONE + 0.8));
      phone.visible = t > T_PHONE;
      if (phone.visible) { drawPage(phoneCanvas.getContext('2d'), 480, 960, t, true); phoneTex.needsUpdate = true; }
      phone.position.set(lerp(-3.6, PHONE[0], ph), PHONE[1], PHONE[2]); phone.rotation.set(0, lerp(0.9, 0.18, ph), lerp(0.4, 0, ph));

      /* the bug: pops out of the button, sits on it, picked up, held, flies away */
      const pop = E.outBack(range(t, T_PRESS1 + 0.1, T_PRESS1 + 0.5));
      bug.visible = t > T_PRESS1 + 0.1 && t < T_RELEASE + 3;
      bug.scale.setScalar(Math.max(0.001, pop) * 1.0);
      const flap = (amp) => bugWings.forEach(w => (w.rotation.y = w.userData.sx * (0.3 + amp * Math.abs(Math.sin(t * 50)))));
      if (t < T_PICK + 0.15) { bug.position.copy(bugPerch).add(V3(0, 0.015 * Math.abs(Math.sin(t * 9)), 0)); bug.rotation.set(0, 0.5 * Math.sin(t * 3), 0); flap(0.4); }
      else if (t < T_RELEASE) { bug.position.copy(handR).add(V3(0, 0.07, 0)); bug.rotation.set(0, 0.4 + 0.3 * Math.sin(t * 4), 0); flap(0.15); }
      else { const u = t - T_RELEASE, st = (armStates(T_RELEASE)[0]?.p || handR).clone().add(V3(0, 0.07, 0));
        bug.position.set(st.x + 0.9 * u + 0.1 * Math.sin(u * 6), st.y + 0.6 * u * (0.6 + 0.6 * u) + 0.06 * Math.sin(u * 9), st.z + 0.5 * u); bug.rotation.set(-0.3, 0.9, 0); flap(1.2); }

      /* floating décor */
      deco.forEach(d => { d.mesh.position.copy(d.base).add(V3(0, d.amp * Math.sin(t * 1.1 + d.ph), 0)); });

      /* confetti */
      parts.forEach((p, i) => {
        const u = t - p.t0; let x, y, z;
        if (u < 0 || u > 7) { dummy.scale.setScalar(0); }
        else {
          if (p.g) { let uu = u; const tl = (p.v[1] + Math.sqrt(p.v[1] ** 2 + 2 * p.g * (p.p[1] - 0.01))) / p.g; uu = Math.min(u, tl);
            x = p.p[0] + p.v[0] * uu; y = p.p[1] + p.v[1] * uu - 0.5 * p.g * uu * uu; z = p.p[2] + p.v[2] * uu; }
          else { const tl = (p.p[1] - 0.01) / -p.v[1], uu = Math.min(u, tl); x = p.p[0] + 0.15 * Math.sin(uu * 2.5 + p.ph); y = p.p[1] + p.v[1] * uu; z = p.p[2] + 0.15 * Math.cos(uu * 2 + p.ph); }
          const landed = y <= 0.011;
          dummy.position.set(x, Math.max(0.01, y), z);
          if (landed) dummy.rotation.set(-PI / 2, 0, p.ph); else dummy.rotation.set(u * p.spin + p.ph, u * p.spin * 0.7, p.ph);
          dummy.scale.setScalar(1);
        }
        dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix);
      });
      conf.instanceMatrix.needsUpdate = true;

      /* camera */
      let pos = null, look = null, wsum = 0;
      SHOTS.forEach(([a, b, f], i) => {
        if (t < a - BLEND || t > b + BLEND) return;
        const w = (i === 0 ? 1 : sm(a - BLEND, a + BLEND, t)) * (i === SHOTS.length - 1 ? 1 : 1 - sm(b - BLEND, b + BLEND, t)); if (w <= 0) return;
        const s = f(t); if (!pos) { pos = s.pos.multiplyScalar(w); look = s.look.multiplyScalar(w); } else { pos.addScaledVector(s.pos, w); look.addScaledVector(s.look, w); } wsum += w;
      });
      pos.multiplyScalar(1 / wsum); look.multiplyScalar(1 / wsum);
      pos.x += wiggle(t, 0.3, 3) * 0.012; pos.y += wiggle(t, 0.25, 5) * 0.01;
      camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld(true);

      /* fork cards: pop in, then wrong → grey + crossed out, right → green ✓ */
      forkTags.forEach(({ f, L, R }) => {
        for (const [c, anchor, i] of [[L, CARD_L, 0], [R, CARD_R, 1]]) {
          const tin = f.show + i * 0.15, inA = sm(tin, tin + 0.3, t), fx = sm(f.fix, f.fix + 0.2, t);
          const outA = 1 - sm(f.out - 0.35, f.out, t) - (c.good ? 0 : 0.35 * sm(f.fix + 1.2, f.fix + 1.6, t));
          const popIn = 0.6 + 0.4 * E.outBack(range(t, tin, tin + 0.35));
          const popFix = t > f.fix ? 1 + (c.good ? 0.14 : -0.06) * Math.exp(-5 * (t - f.fix)) * Math.cos((t - f.fix) * 12) : 1;
          const frac = 0.43 * popIn * (c.good ? 1 : 1 - 0.08 * fx);
          const vis1 = fitTag(c.open, V3(...anchor), frac), vis2 = fitTag(c.res, V3(...anchor), frac * popFix);
          c.open.material.opacity = inA * (1 - fx) * outA * vis1; c.res.material.opacity = fx * Math.max(0, outA) * vis2;
        }
      });
      /* test tags (above the button) */
      const tAnchor = V3(BTN[0] - 0.1, BTN[1] + 1.0, BTN[2] + 0.4);
      { const a = sm(T_PRESS1 + 0.2, T_PRESS1 + 0.45, t) * (1 - sm(T_FIXED, T_FIXED + 0.2, t));
        const b = sm(T_FIXED, T_FIXED + 0.2, t) * (1 - sm(T_PRESS2 - 0.05, T_PRESS2 + 0.2, t));
        const c = sm(T_PRESS2 + 0.15, T_PRESS2 + 0.4, t) * (1 - sm(27.1, 27.45, t));
        const p2 = t > T_FIXED ? 1 + 0.14 * Math.exp(-5 * (t - T_FIXED)) * Math.cos((t - T_FIXED) * 12) : 1;
        const p3 = t > T_PRESS2 + 0.15 ? 1 + 0.14 * Math.exp(-5 * (t - T_PRESS2 - 0.15)) * Math.cos((t - T_PRESS2 - 0.15) * 12) : 1;
        testTags.alert.material.opacity = a * fitTag(testTags.alert, tAnchor, 0.62 * (0.7 + 0.3 * E.outBack(range(t, T_PRESS1 + 0.2, T_PRESS1 + 0.55))));
        testTags.fixed.material.opacity = b * fitTag(testTags.fixed, tAnchor, 0.56 * p2);
        testTags.sent.material.opacity = c * fitTag(testTags.sent, tAnchor, 0.6 * p3); }
      /* captions */
      hud(caps.how, 0, 0.8, 0.86); caps.how.material.opacity = sm(3.6, 3.95, t) * (1 - sm(5.85, 6.1, t));
      hud(caps.works, 0, 0.8, 0.8); caps.works.material.opacity = sm(21.0, 21.35, t) * (1 - sm(22.85, 23.1, t));
      hud(caps.good, 0, 0.8, 0.9 * (0.85 + 0.15 * E.outBack(range(t, 29.0, 29.4)))); caps.good.material.opacity = sm(29.0, 29.3, t);
      hud(caps.url, 0, 0.6, 0.94 * (0.8 + 0.2 * E.outBack(range(t, 29.6, 30.1)))); caps.url.material.opacity = sm(29.6, 29.9, t);
    },
    render() { composer.render(); },
  };
}
