// BRIEF — 3D vertical remake of "mullet chef" (the 30 s 2D cartoon). The MC walks a night street, hungry, slips into
// the corner shop with a cat, picks tomatoes, pasta and basil, swaps a "hej!" with a girl by the fridge (hearts),
// pays at the till, then cooks at home: flames, steam, humming. The girl comes in, the plate lands: "SMACZNEGO!".
// Same three sets and beat timing as the original so its soundtrack can be laid back on.
//
// POLISH TEXT (checked): głodny… · pomidory · makaron · bazylia · hej! · hej! · Dziękuję! · dzyń! · 24 zł ·
//   SMACZNEGO! · Mmm, pyszne! · signs: SKLEP · OTWARTE · ŚWIEŻE · end: elvladislavo.com
// BEATS (s)
//   0–2.4    street: crane from his croc shoes up to the night street; the cat sits by the shop window
//   1.6–4.4  "głodny…": he stops, rubs his belly, head down
//   4.2–9.3  walks on, the cat trots in first, the door swings open, he steps into the light · fade
//   9.8–12.6 shop: the cat trots in, sits by the fridge, poof (smoke + sparkles): the cat turns into the girl
//   9.8–14.4 shop: walks in with a red basket; list "pomidory · makaron · bazylia"; picks the three off the shelf
//   14.4–17  the girl by the fridge: "hej!" — he turns, "hej!", hearts
//   17–19.3  to the till: "dzyń!", 24 zł on the display, cashier "Dziękuję!" · fade
//   19.6–26  kitchen: walks behind the island, tosses the tomato in the pan, stirs over flames, steam, music notes
//   25.4–27  the girl walks in; the plate of spaghetti pops onto the counter
//   27.3–32  he punches the air, "SMACZNEGO!", her "Mmm, pyszne!", hearts · elvladislavo.com from 29.6
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/mullet-chef-3d/scene.js --width 1080 --height 1920 --out mullet-chef-3d.mp4
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';
import { dressUp } from '/assets/costume.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const T_END = 32;
export const meta = { duration: T_END, fps: 30, background: '#000000' };

const T_SHOP = 9.75, T_KIT = 19.6;
const OX = { street: 0, shop: 40, kitchen: 80 };              // each set lives at its own x offset
const setAt = t => (t < T_SHOP ? 'street' : t < T_KIT ? 'shop' : 'kitchen');

/* ───────────── paths (set-local x/z) and facing ───────────── */
const MC_X = [[0, -2.6], [2.0, -1.55, E.linear], [4.2, -1.55], [7.4, 1.4, E.linear], [7.5, 1.4], [T_SHOP - 0.001, 1.4],
  [T_SHOP, -2.4], [11.5, 0.05, E.outQuad], [17.0, 0.05], [18.0, 0.55, E.inOutQuad], [T_KIT, 0.55],
  [T_KIT + 0.001, -1.9], [21.0, 0.15, E.outQuad]];
const MC_Z = [[0, 0.3], [7.55, 0.3], [9.3, -1.6, E.inQuad], [T_SHOP - 0.001, -1.6],
  [T_SHOP, -0.3], [17.0, -0.3], [18.0, 0.3, E.inOutQuad], [T_KIT, 0.3], [T_KIT + 0.001, -0.95]];
const MC_YAW = [[0, PI / 2], [7.4, PI / 2], [7.8, PI], [T_SHOP - 0.01, PI], [T_SHOP, PI / 2], [11.2, PI / 2], [11.7, 2.75],
  [14.2, 2.75], [14.55, 0.25], [14.9, -0.85], [16.9, -0.85], [17.2, PI / 2], [17.9, PI / 2], [18.2, 1.75], [T_KIT - 0.01, 1.75],
  [T_KIT, PI / 2], [20.8, PI / 2], [21.2, 0]];
const LADY_X = [[0, -0.95], [T_KIT, -0.95], [T_KIT + 0.001, 2.6], [25.4, 2.6], [27.0, 1.55, E.outQuad]];
const LADY_Z = [[0, 0.7], [T_KIT, 0.55], [T_KIT + 0.001, -0.25]];
const T_MORPH = 11.9;   // the cat turns into the girl
const LADY_YAW = [[0, 0.15], [12.9, 0.15], [13.3, PI + 0.35], [14.1, PI + 0.35], [14.5, 1.15], [T_KIT, 1.15], [T_KIT + 0.001, -PI / 2], [26.8, -PI / 2], [27.2, -0.55]];
const STRIDE = 1.3;   // metres per full walk cycle

// shop picks: [reach start, grab, into basket]
const PICKS = [[11.8, 12.2, 12.65], [12.75, 13.1, 13.5], [13.6, 13.95, 14.3]];
const T_HEJ1 = 14.6, T_HEJ2 = 15.55, T_DING = 18.2;
const T_TOSS = 21.6, T_STIR0 = 22.3, T_STIR1 = 26.0, T_PLATE = 26.2, T_CHEER = 27.3, T_TITLE = 27.6, T_PYSZNE = 28.1, T_URL = 29.6;

/* ───────────── poses ───────────── */
const walkPh = (p, a = 0.38, basket = false) => { const q = Math.sin(p), s = a / 0.42;
  return { hipsY: 0.94 + 0.015 * Math.abs(Math.cos(p)), spine: [0.05, 0, 0], head: [0.04, 0, 0], hipL: [-a * q, 0, 0.02], hipR: [a * q, 0, -0.02],
    kneeL: [0.12 + 0.6 * Math.max(0, Math.sin(p - 1.2)), 0, 0], kneeR: [0.12 + 0.6 * Math.max(0, Math.sin(p + PI - 1.2)), 0, 0],
    shoulderL: basket ? [0.06 * q, 0, 0.2] : [0.3 * s * q, 0, 0.12], shoulderR: [-0.3 * s * q, 0, -0.12], elbowL: [basket ? -0.12 : -0.35, 0, 0], elbowR: [-0.35, 0, 0] }; };
const stand = (t, basket = false) => ({ hipsY: 0.95 - 0.004 * Math.sin(t * 2.2), spine: [0.01 * Math.sin(t * 2.2), 0, 0], head: [0.04, 0, 0.03 * Math.sin(t * 0.9)],
  shoulderL: [0, 0, basket ? 0.2 : 0.1], shoulderR: [0, 0, -0.1], elbowL: [basket ? -0.12 : -0.18, 0, 0], elbowR: [-0.18, 0, 0], hipL: [0, 0, 0.04], hipR: [0, 0, -0.04] });
const P = {
  belly: t => { const r = Math.sin(t * 5);
    return { hipsY: 0.92, spine: [0.2, 0, 0], head: [0.38, 0, 0.05], shoulderL: [-0.55, 0.1 * r, 0.2], elbowL: [-1.55, 0, 0], shoulderR: [-0.5, -0.1 * r, -0.2], elbowR: [-1.6, 0, 0],
      hipL: [0, 0, 0.05], hipR: [0.05, 0, -0.06], kneeL: [0.1, 0, 0], kneeR: [0.18, 0, 0] }; },
  reachHi: t => ({ ...stand(t, true), spine: [-0.06, 0, -0.05], head: [-0.25, 0, 0], shoulderR: [-2.55, 0, -0.15], elbowR: [-0.15, 0, 0] }),
  reachMid: t => ({ ...stand(t, true), spine: [0.08, 0, 0], head: [0.05, 0, 0], shoulderR: [-1.5, 0, -0.1], elbowR: [-0.2, 0, 0] }),
  reachLo: t => ({ ...stand(t, true), hipsY: 0.8, spine: [0.35, 0, 0], head: [0.15, 0, 0], shoulderR: [-1.0, 0, -0.1], elbowR: [-0.15, 0, 0],
    hipL: [-0.5, 0, 0.05], kneeL: [0.9, 0, 0], hipR: [-0.35, 0, -0.05], kneeR: [0.7, 0, 0] }),
  wave: t => ({ ...stand(t, true), head: [-0.04, 0, 0.1], shoulderR: [-0.3, 0, -2.45 + 0.28 * Math.sin(t * 13)], elbowR: [-0.55, 0, 0] }),
  pay: t => ({ ...stand(t, true), spine: [0.06, 0, 0], shoulderR: [-1.25, 0, -0.05], elbowR: [-0.35, 0, 0] }),
  pickBoard: t => ({ ...stand(t), spine: [0.18, 0, 0.06], head: [0.25, 0, 0], shoulderL: [-1.05, 0, 0.55], elbowL: [-0.25, 0, 0] }),
  toss: t => ({ ...stand(t), spine: [0.12, 0, -0.04], head: [0.2, 0, 0], shoulderL: [-1.45, 0, 0.05], elbowL: [-0.5, 0, 0] }),
  stir: t => { const w = t * 7;
    return { ...stand(t), hipsY: 0.95 + 0.012 * Math.sin(t * 6.4), spine: [0.14, 0, 0.03 * Math.sin(t * 3.2)], head: [0.12, 0.12 * Math.sin(t * 3.2), 0.1 * Math.sin(t * 3.2)],
      shoulderR: [-1.0 + 0.1 * Math.sin(w), 0.18 * Math.cos(w), -0.05], elbowR: [-0.55 + 0.12 * Math.cos(w), 0, 0],
      shoulderL: [-0.75, 0, 0.18], elbowL: [-0.55, 0, 0] }; },
  present: t => ({ ...stand(t), spine: [-0.04, 0, 0], head: [-0.06, 0, 0], shoulderL: [-0.9, 0, 0.75], elbowL: [-0.3, 0, 0], shoulderR: [-0.9, 0, -0.75], elbowR: [-0.3, 0, 0] }),
  cheer: t => { const b = Math.max(0, Math.sin((t - T_CHEER) * 2 * PI * 1.2));
    return { ...stand(t), hipsY: 0.95 - 0.035 * b, spine: [-0.06, 0, 0.04], head: [-0.12, 0, 0.08], shoulderR: [-0.15, 0, -2.85 - 0.1 * b], elbowR: [-0.25, 0, 0],
      shoulderL: [0.1, 0, 0.35], elbowL: [-1.3, 0, 0], kneeL: [0.08 * b, 0, 0], kneeR: [0.08 * b, 0, 0] }; },
};

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 55 : 40; camera.near = 0.05; camera.far = 200; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.05;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const tagFont = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`), titleFont = new FontFace('Title', `url(${asset('Fruktur.ttf')})`);
  await Promise.all([tagFont.load(), titleFont.load()]); document.fonts.add(tagFont); document.fonts.add(titleFont);

  /* ── characters ── */
  const man = dressUp(buildStickman({ seed: 7 })); scene.add(man.system);
  const ramp = man.ramp, ink = man.outlineMat;
  const toon = (c, x = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...x });
  const glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const add = (geo, mat, p = [0, 0, 0], parent = scene, outline = true, rot) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    if (outline) m.add(new THREE.Mesh(geo, ink)); return m; };
  const rbox = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, r);
  const ctex = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };
  const noiseTex = (base, spots, n, rx, ry, extra) => ctex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = spots[i % spots.length]; g.globalAlpha = 0.08 + rnd() * 0.12; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 9, 0, 7); g.fill(); }
    g.globalAlpha = 1; if (extra) extra(g, w, h); }, rx, ry);
  const textTex = (text, { w = 512, h = 128, bg = null, fg = '#fff', font = 'Tag', size = 80, stroke = null, radius = 0 } = {}) => ctex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, radius); g.fill(); }
    g.font = `${size}px ${font}`; const fs = Math.min(size, size * (w * 0.88) / g.measureText(text).width); g.font = `${fs}px ${font}`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = fs * 0.16; g.strokeText(text, w / 2, h / 2 + fs * 0.05); }
    g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + fs * 0.05); });
  const signPlane = (tex, w, h, p, parent, basic = false) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }) : new THREE.MeshToonMaterial({ map: tex, gradientMap: ramp, transparent: true })); m.position.set(...p); parent.add(m); return m; };

  // slim oval wraparound shades (both photos): dark glossy lenses, thin silver frame
  const shadesOn = (g, head) => { const sh = new THREE.Group(); sh.position.set(0, 0.182, 0.15); head.add(sh);
    const lensM = new THREE.MeshStandardMaterial({ color: 0x0a0a0d, metalness: 0.75, roughness: 0.12 }), frameM = toon(0xb9bcc4);
    for (const sx of [1, -1]) { const l = new THREE.Mesh(new RoundedBoxGeometry(0.082, 0.034, 0.012, 3, 0.016), lensM); l.position.set(sx * 0.047, 0, 0); l.rotation.y = -sx * 0.18;
      l.add(new THREE.Mesh(l.geometry, g.outlineMat)); sh.add(l);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.15), frameM); arm.position.set(sx * 0.09, 0.006, -0.072); sh.add(arm); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.006, 0.008), frameM); br.position.set(0, 0.01, 0.004); sh.add(br); return sh; };
  shadesOn(man, man.J.head);
  const isUnder = (o, joints) => { for (let p = o.parent; p; p = p.parent) if (joints.includes(p)) return true; return false; };

  /* the MC from photo 2: long camel double-breasted coat over the suit, white shirt, red tie, one white stripe on the
     trousers, red croc shoes, blue shopping bag on a black strap over his right shoulder */
  { const { M, J } = man;
    const coatTex = noiseTex('#b4a58e', ['#9c8d76', '#c8baa3', '#8a7c66'], 1400, 3, 3);
    M.blazer.color.set(0xffffff); M.blazer.map = coatTex; M.blazer.needsUpdate = true;
    M.shirt.color.set(0xf6f4ef);
    man.system.traverse(o => { if (!o.isMesh || o.material !== M.stripe) return;
      if (isUnder(o, [J.shoulderL, J.shoulderR, J.elbowL, J.elbowR]) || Math.abs(o.position.z) > 0.01) o.visible = false; });
    const coatM = M.blazer;
    // long skirt of the coat, open at the front so the trousers and belt show
    const skirt = new THREE.CylinderGeometry(0.155, 0.245, 0.66, 28, 1, true, PI / 2 + 0.38, 2 * PI - 0.76);
    add(skirt, new THREE.MeshToonMaterial({ map: coatTex, gradientMap: ramp, side: THREE.DoubleSide }), [0, -0.27, 0], J.hips, true);
    for (const sx of [1, -1]) {                         // front edges with a turned-back facing
      const e = add(new THREE.BoxGeometry(0.03, 0.62, 0.02), coatM, [sx * 0.07, -0.28, 0.17], J.hips, true); e.rotation.set(-0.16, 0, -sx * 0.1); }
    // wide peak lapels and the double-breasted button stance
    for (const sx of [1, -1]) {
      const lap = add(new THREE.BoxGeometry(0.075, 0.24, 0.012), coatM, [sx * 0.07, 0.34, 0.083], J.spine, true); lap.rotation.z = sx * 0.28;
      for (const y of [0.1, 0.19]) add(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 12), toon(0x2a221b), [sx * 0.05, y, 0.1], J.spine, false, [PI / 2, 0, 0]);
    }
    add(new THREE.BoxGeometry(0.15, 0.2, 0.012), coatM, [0, 0.11, 0.092], J.spine, false);       // coat crossed over below the tie
    // blue shopping bag on his right side, black strap over the right shoulder
    const bag = add(rbox(0.07, 0.36, 0.34, 0.02), toon(0x1f4fd6), [-0.2, -0.05, 0.02], J.spine, true); bag.rotation.z = 0.08;
    add(new THREE.BoxGeometry(0.075, 0.05, 0.35), toon(0xf2c93a), [-0.2, 0.08, 0.02], J.spine, false).rotation.z = 0.08;
    const strap = add(new THREE.BoxGeometry(0.012, 0.42, 0.02), toon(0x111114), [-0.165, 0.29, 0.06], J.spine, false); strap.rotation.z = -0.12;
  }

  // re-dress the same rig for the girl and the cashier (as makeGoon does in stickman-fight-30)
  function redress(g, map) {
    const M = g.M;
    g.system.traverse(o => { if (!o.isMesh || o.material === g.outlineMat) return;
      for (const [mats, to] of map) if (mats.some(n => o.material === M[n])) { if (to === null) o.visible = false; else o.material = to; break; } });
  }
  const lady = buildStickman({ seed: 21 }); scene.add(lady.system); lady.system.scale.setScalar(0.92);
  /* the girl from photo 1: brown suede halter mini dress with a plunging V, pleated skirt, wide suede belt with a big
     silver square buckle, sheer dark tights, gold bangles, drop earrings, dark curly updo with loose tendrils,
     sunglasses pushed up on her head, smoky eyes, dark lips */
  { const { M, J } = lady;
    const suedeTex = noiseTex('#6e5644', ['#5a4535', '#866c58', '#4b3a2d'], 1600, 3, 3);
    const suede = new THREE.MeshToonMaterial({ map: suedeTex, gradientMap: ramp }), suedeD = toon(0x5a4536), skin = M.skin;
    lady.system.traverse(o => { if (o.isMesh && o.material === M.blazer && isUnder(o, [J.shoulderL, J.shoulderR, J.elbowL, J.elbowR])) o.material = skin; });  // bare arms
    redress(lady, [[['blazer'], suede], [['shirt'], skin], [['tie', 'tieKnot', 'beard', 'stripe'], null], [['trousers'], toon(0x3b3034)],
      [['hair'], toon(0x2e1c14)], [['hairLight'], toon(0x4a2e20)], [['shoe', 'sole'], toon(0x1a1416)], [['belt'], suedeD], [['buckle'], toon(0xd7dae0)]]);
    J.head.children.forEach(o => { if (o.isMesh && (o.material === M.hair || o.material === M.hairLight) && o.position.y < 0.1 && o.position.z < -0.07) o.visible = false; });  // no mullet: updo
    // pleated mini skirt: alternate hem vertices pushed out
    const sk = new THREE.CylinderGeometry(0.15, 0.25, 0.3, 36, 1, true), pa = sk.attributes.position;
    for (let i = 0; i < pa.count; i++) if (pa.getY(i) < 0 && (i % 2)) { pa.setX(i, pa.getX(i) * 1.09); pa.setZ(i, pa.getZ(i) * 1.09); }
    sk.computeVertexNormals();
    add(sk, new THREE.MeshToonMaterial({ map: suedeTex, gradientMap: ramp, side: THREE.DoubleSide }), [0, -0.17, 0], J.hips, true);
    // wide belt + big square silver buckle with eyelets
    add(new THREE.CylinderGeometry(0.152, 0.152, 0.08, 28, 1, true), suedeD, [0, 0.0, 0], J.hips, true);
    const silver = toon(0xdfe2e8);
    for (const [w, h, x, y] of [[0.1, 0.014, 0, 0.035], [0.1, 0.014, 0, -0.035], [0.014, 0.084, 0.046, 0], [0.014, 0.084, -0.046, 0]]) add(new THREE.BoxGeometry(w, h, 0.012), silver, [x, y, 0.156], J.hips, true);
    for (const x of [0.07, 0.095]) add(new THREE.TorusGeometry(0.008, 0.003, 6, 10), silver, [x, 0, 0.146], J.hips, false, [0, 0.5, 0]);
    // halter strap round the neck
    add(new THREE.TorusGeometry(0.05, 0.012, 6, 16, PI * 1.2), suede, [0, 0.5, 0.0], J.spine, false, [-1.2, 0, -0.3]);
    // gold bangles, drop earrings
    const gold = toon(0xd9aa45);
    for (const el of [J.elbowL, J.elbowR]) { add(new THREE.TorusGeometry(0.037, 0.009, 8, 18), gold, [0, -0.215, 0], el, true, [PI / 2, 0, 0]); add(new THREE.TorusGeometry(0.036, 0.006, 8, 18), gold, [0, -0.19, 0], el, false, [PI / 2, 0, 0]); }
    for (const sx of [1, -1]) { add(new THREE.ConeGeometry(0.012, 0.05, 6), silver, [sx * 0.165, 0.06, 0.02], J.head, false, [PI, 0, 0]); }
    // updo: bun on top, loose tendrils by the temples and ears
    const hairM = toon(0x2e1c14);
    add(new THREE.SphereGeometry(0.085, 16, 12), hairM, [0, 0.31, -0.06], J.head, true);
    for (const [x, y, z] of [[0.03, 0.36, -0.02], [-0.04, 0.35, -0.08], [0.05, 0.32, -0.11]]) add(new THREE.SphereGeometry(0.045, 10, 8), toon(0x4a2e20), [x, y, z], J.head, true);
    for (const sx of [1, -1]) for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.014, 0.0045, 5, 10), hairM, [sx * (0.128 + i * 0.006), 0.16 - i * 0.026, 0.07], J.head, false, [0, PI / 2, i]);
    // smoky eyes, dark lips
    for (const sx of [1, -1]) add(new THREE.SphereGeometry(0.026, 12, 8), toon(0x4c3c44), [sx * 0.05, 0.183, 0.128], J.head, false).scale.set(1.2, 0.75, 0.5);
    J.head.children.forEach(o => { if (o.isMesh && o.geometry.type === 'TorusGeometry' && o.material === M.dark) o.material = toon(0x5e343e); });
    // sunglasses pushed up into the hair
    const up = shadesOn(lady, J.head); up.position.set(0, 0.3, 0.075); up.rotation.x = -0.75; }
  const cashier = buildStickman({ seed: 33 }); scene.add(cashier.system); cashier.system.scale.setScalar(0.95);
  redress(cashier, [[['blazer', 'shirt'], toon(0x2f8a4a)], [['tie', 'tieKnot', 'beard', 'stripe'], null], [['hair'], toon(0xd9a441)], [['hairLight'], toon(0xeec66a)]]);

  // the black cat
  const cat = new THREE.Group(); scene.add(cat);
  const catM = toon(0x141418), catLegs = [];
  { add(new THREE.SphereGeometry(0.13, 16, 12), catM, [0, 0.2, 0], cat).scale.set(0.8, 0.75, 1.5);
    add(new THREE.SphereGeometry(0.085, 16, 12), catM, [0, 0.31, 0.2], cat);
    for (const sx of [1, -1]) { add(new THREE.ConeGeometry(0.032, 0.07, 4), catM, [sx * 0.045, 0.39, 0.2], cat, true, [0, 0, -sx * 0.25]);
      add(new THREE.SphereGeometry(0.015, 8, 6), glow(0xffd43b), [sx * 0.032, 0.32, 0.27], cat, false); }
    for (const [x, z] of [[0.06, 0.1], [-0.06, 0.1], [0.06, -0.1], [-0.06, -0.1]]) { const l = add(new THREE.CylinderGeometry(0.018, 0.016, 0.14, 6), catM, [x, 0.07, z], cat); catLegs.push(l); }
    const pts = []; for (let i = 0; i <= 10; i++) pts.push(V3(0, 0.22 + i * 0.025, -0.17 - Math.sin(i / 10 * PI * 0.6) * 0.1));
    cat.userData.tail = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.016, 6), catM, [0, 0, 0], cat); }

  /* ── sets ── */
  const sets = {}; for (const k in OX) { sets[k] = new THREE.Group(); sets[k].position.x = OX[k]; scene.add(sets[k]); }

  // STREET (night)
  const S = sets.street, leaves = [];
  let door, streetLight;
  {
    const sky = ctex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0d1226'); gr.addColorStop(1, '#2a3354'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); });
    signPlane(sky, 60, 30, [0, 12, -14], S, true);
    const starsG = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 90; i++) sp.push((rnd() - 0.5) * 30, 5.5 + rnd() * 12, -13.5);
    starsG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    S.add(new THREE.Points(starsG, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.06, toneMapped: false })));
    const moonT = ctex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,244,214,0.35)'); gr.addColorStop(1, 'rgba(255,244,214,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = '#f3e7c6'; g.beginPath(); g.arc(128, 128, 62, 0, 7); g.fill();
      g.fillStyle = 'rgba(180,165,130,0.45)'; for (const [x, y, r] of [[105, 110, 12], [150, 140, 9], [120, 158, 7]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
    signPlane(moonT, 2.2, 2.2, [-1.6, 8.6, -13], S, true);

    const wallT = noiseTex('#6b625b', ['#4d4640', '#857b72', '#3e3934'], 900, 4, 2, (g, w, h) => { g.strokeStyle = 'rgba(40,34,30,0.35)'; g.lineWidth = 2;
      for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } });
    add(new THREE.BoxGeometry(16, 4.6, 0.3), new THREE.MeshToonMaterial({ map: wallT, gradientMap: ramp }), [0, 2.3, -1.4], S, false);
    add(new THREE.BoxGeometry(16.2, 0.22, 0.5), toon(0x2c2a30), [0, 4.6, -1.3], S, false);
    add(new THREE.BoxGeometry(16, 0.25, 0.4), toon(0x3a3532), [0, 0.12, -1.3], S, false);
    for (const [x, lit] of [[-3.4, 1], [-1.7, 0], [0.0, 1], [1.7, 0], [3.4, 1]]) {
      add(rbox(0.75, 0.62, 0.06, 0.02), toon(0x1f1c22), [x, 3.75, -1.24], S, false);
      add(new THREE.PlaneGeometry(0.62, 0.5), lit ? glow(0xf3c56a) : toon(0x2b3d66), [x, 3.75, -1.2], S, false);
    }
    add(rbox(1.5, 1.15, 0.08), toon(0x1c1a20), [-2.1, 1.75, -1.24], S);
    add(new THREE.PlaneGeometry(1.3, 0.95), toon(0x22365e), [-2.1, 1.75, -1.19], S, false);
    add(new THREE.CylinderGeometry(0.04, 0.04, 4.4, 8), toon(0x8a2a22), [-0.75, 2.25, -1.2], S);
    add(rbox(0.38, 0.55, 0.38), toon(0x2f6b45), [-0.2, 0.52, -0.95], S);
    // shop front
    add(rbox(1.95, 0.46, 0.16, 0.04), toon(0x237a4b), [1.85, 3.05, -1.15], S);
    signPlane(textTex('SKLEP', { w: 512, h: 120, size: 96 }), 1.7, 0.4, [1.85, 3.05, -1.06], S, true);
    add(rbox(1.08, 2.22, 0.1), toon(0x3b2a1e), [1.4, 1.11, -1.22], S);
    add(new THREE.PlaneGeometry(0.92, 2.08), glow(0xffd98a), [1.4, 1.04, -1.25], S, false);
    door = new THREE.Group(); door.position.set(0.94, 0, -1.16); S.add(door);
    add(new THREE.BoxGeometry(0.92, 2.06, 0.05), toon(0xe9c77e), [0.46, 1.04, 0], door);
    add(new THREE.PlaneGeometry(0.62, 1.0), glow(0xfff0c4), [0.46, 1.35, 0.03], door, false);
    signPlane(textTex('OTWARTE', { w: 512, h: 128, bg: '#fff7e2', fg: '#237a4b', size: 80, radius: 18 }), 0.5, 0.13, [0.46, 1.72, 0.04], door, true);
    add(rbox(0.72, 1.0, 0.1), toon(0x3b2a1e), [2.6, 1.3, -1.22], S);
    add(new THREE.PlaneGeometry(0.6, 0.88), glow(0xffe2a0), [2.6, 1.3, -1.19], S, false);
    for (const [x, y] of [[2.48, 1.0], [2.64, 1.0], [2.56, 1.13], [2.73, 1.02]]) add(new THREE.SphereGeometry(0.07, 12, 10), toon(0xd8312a), [x, y, -1.12], S);
    // light pool from the shop on the pavement
    const pool = ctex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,214,140,0.55)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    const pm = signPlane(pool, 3.2, 2.4, [1.6, 0.012, -0.3], S, true); pm.rotation.x = -PI / 2; pm.material.depthWrite = false; pm.material.blending = THREE.AdditiveBlending;
    // pavement, kerb, road
    const paveT = noiseTex('#55524f', ['#3f3d3b', '#6a6663'], 700, 8, 3, (g, w, h) => { g.strokeStyle = 'rgba(30,28,26,0.5)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    const pave = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.9), new THREE.MeshToonMaterial({ map: paveT, gradientMap: ramp })); pave.rotation.x = -PI / 2; pave.position.set(0, 0, 0.2); pave.receiveShadow = true; S.add(pave);
    add(new THREE.BoxGeometry(16, 0.12, 0.2), toon(0x77726c), [0, 0.0, 1.7], S, false);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), toon(0x24262c)); road.rotation.x = -PI / 2; road.position.set(0, -0.06, 7.8); road.receiveShadow = true; S.add(road);
    // street lamp
    add(new THREE.CylinderGeometry(0.045, 0.06, 3.3, 10), toon(0x1c1c22), [3.35, 1.65, 0.95], S);
    add(new THREE.CylinderGeometry(0.11, 0.07, 0.18, 10), toon(0x1c1c22), [3.35, 3.35, 0.95], S);
    add(new THREE.SphereGeometry(0.08, 12, 10), glow(0xffe7b0), [3.35, 3.24, 0.95], S, false);
    streetLight = new THREE.PointLight(0xffc98a, 5, 7, 1.6); streetLight.position.set(3.35, 3.1, 0.95); S.add(streetLight);
    const doorL = new THREE.PointLight(0xffc070, 7, 6, 1.5); doorL.position.set(1.5, 1.4, -0.5); S.add(doorL);
    S.add(new THREE.HemisphereLight(0x6577b0, 0x2a2628, 1.25));
    const moonL = new THREE.DirectionalLight(0xaebdff, 1.1); moonL.position.set(-4, 7, 6); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048);
    Object.assign(moonL.shadow.camera, { left: -6, right: 6, top: 5, bottom: -3, near: 1, far: 30 }); moonL.shadow.bias = -0.0005; moonL.shadow.normalBias = 0.02;
    S.add(moonL, moonL.target); moonL.target.position.set(0, 0, 0);
    const leafM = new THREE.MeshBasicMaterial({ color: 0xd98a2b, side: THREE.DoubleSide });
    for (let i = 0; i < 26; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.045), leafM); S.add(l);
      leaves.push({ m: l, x: -3 + rnd() * 6.5, z: -0.9 + rnd() * 2.6, ph: rnd(), sp: 0.12 + rnd() * 0.08, sw: rnd() * 6 }); }
  }

  // SHOP
  const B = sets.shop, picks = [];
  let clockHand, clockHand2, dingDisplay;
  {
    const floorT = ctex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#d8c7a0' : '#efe3c6'; g.fillRect(x * 64, y * 64, 64, 64); } }, 6, 4);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshToonMaterial({ map: floorT, gradientMap: ramp })); fl.rotation.x = -PI / 2; fl.position.z = 2.5; fl.receiveShadow = true; B.add(fl);
    const wallT = noiseTex('#eadcbc', ['#d6c59f', '#f6ecd6'], 700, 3, 2);
    add(new THREE.BoxGeometry(12, 6, 0.2), new THREE.MeshToonMaterial({ map: wallT, gradientMap: ramp }), [0, 3, -1.3], B, false);
    add(new THREE.BoxGeometry(12, 0.18, 0.06), toon(0xb89a6a), [0, 0.09, -1.18], B, false);
    // fridge with drinks
    add(rbox(0.9, 2.1, 0.62), toon(0xe9eef2), [-1.45, 1.05, -0.9], B);
    add(new THREE.PlaneGeometry(0.72, 1.85), glow(0xd8ecff), [-1.45, 1.07, -0.585], B, false);
    const cols = [0xd23a3a, 0x2f5fd0, 0xf0c53c, 0x3aa35a];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) add(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), toon(cols[(c + r) % 4]), [-1.7 + c * 0.165, 0.38 + r * 0.44, -0.66], B, false);
    add(new THREE.BoxGeometry(0.03, 0.5, 0.04), toon(0x9aa4ad), [-1.12, 1.15, -0.56], B, false);
    // shelf
    const wood = toon(0x7a5232), woodD = toon(0x5e3e24);
    add(new THREE.BoxGeometry(1.5, 1.45, 0.06), woodD, [0.15, 1.55, -1.17], B);
    for (const y of [0.95, 1.45, 1.95]) add(new THREE.BoxGeometry(1.5, 0.05, 0.34), wood, [0.15, y, -1.0], B);
    for (const x of [-0.6, 0.9]) add(new THREE.BoxGeometry(0.05, 1.45, 0.34), wood, [x, 1.55, -1.0], B);
    const tomM = toon(0xd8312a), pastaM = toon(0xf0c53c), potM = toon(0xb5653a), basilM = toon(0x3e9a3a), breadM = toon(0xd59a4e);
    const mkTomato = (p, parent = B) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); add(new THREE.SphereGeometry(0.075, 14, 10), tomM, [0, 0, 0], g); add(new THREE.ConeGeometry(0.03, 0.03, 5), basilM, [0, 0.075, 0], g, false); return g; };
    const mkPasta = (p, parent = B) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); add(rbox(0.12, 0.2, 0.06, 0.01), pastaM, [0, 0, 0], g); add(new THREE.PlaneGeometry(0.07, 0.07), toon(0x2f5fd0), [0, 0.02, 0.031], g, false); return g; };
    const mkBasil = (p, parent = B) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); add(new THREE.CylinderGeometry(0.06, 0.045, 0.09, 10), potM, [0, 0, 0], g);
      for (const [x, y, z] of [[0, 0.09, 0], [0.04, 0.07, 0.02], [-0.04, 0.075, -0.01], [0.01, 0.11, -0.03]]) add(new THREE.SphereGeometry(0.04, 10, 8), basilM, [x, y, z], g); return g; };
    for (let i = 0; i < 6; i++) mkTomato([-0.45 + i * 0.12 + (i > 2 ? 0.55 : 0), 2.05, -0.98]);
    for (let i = 0; i < 5; i++) mkPasta([-0.45 + i * 0.14 + (i > 1 ? 0.4 : 0), 1.58, -1.03]);
    for (let i = 0; i < 3; i++) mkBasil([-0.45 + i * 0.16 + (i > 0 ? 0.5 : 0), 1.02, -0.98]);
    add(new THREE.CapsuleGeometry(0.06, 0.16, 4, 10), breadM, [0.7, 1.04, -0.98], B, true, [0, 0, PI / 2]);
    picks.push({ m: mkTomato([0.1, 2.05, -0.98]), from: V3(0.1, 2.05, -0.98), slot: V3(-0.04, 0.0, 0.02) },
      { m: mkPasta([0.25, 1.58, -1.03]), from: V3(0.25, 1.58, -1.03), slot: V3(0.04, 0.03, -0.02) },
      { m: mkBasil([0.0, 1.02, -0.98]), from: V3(0.0, 1.02, -0.98), slot: V3(0.0, 0.0, 0.03) });
    // sign, clock, lamp
    add(rbox(0.7, 0.62, 0.06, 0.03), toon(0x237a4b), [1.2, 2.75, -1.17], B);
    signPlane(ctex(256, 256, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 86, 54, 0, 7); g.fill(); g.fillStyle = '#3aa35a';
      g.beginPath(); g.ellipse(112, 86, 18, 36, -0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(146, 86, 18, 36, 0.5, 0, 7); g.fill();
      g.font = '58px Tag'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('ŚWIEŻE', 128, 212); }), 0.6, 0.6, [1.2, 2.75, -1.13], B, true);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 28), toon(0xf6f1e6), [1.5, 3.4, -1.17], B, true, [PI / 2, 0, 0]);
    clockHand = add(new THREE.BoxGeometry(0.02, 0.15, 0.01), toon(0x222222), [1.5, 3.4, -1.13], B, false); clockHand.geometry.translate(0, 0.07, 0);
    clockHand2 = add(new THREE.BoxGeometry(0.025, 0.1, 0.01), toon(0x222222), [1.5, 3.4, -1.125], B, false); clockHand2.geometry.translate(0, 0.045, 0);
    add(new THREE.CylinderGeometry(0.006, 0.006, 1.0, 6), toon(0x222222), [0.15, 3.9, -0.4], B, false);
    add(new THREE.ConeGeometry(0.26, 0.2, 18, 1, true), toon(0x237a4b, { side: THREE.DoubleSide }), [0.15, 3.35, -0.4], B);
    add(new THREE.SphereGeometry(0.07, 10, 8), glow(0xfff0c4), [0.15, 3.25, -0.4], B, false);
    // till
    add(rbox(0.95, 0.95, 0.6), toon(0x4a5566), [1.45, 0.475, -0.4], B);
    add(rbox(0.36, 0.2, 0.3), toon(0x2a2d33), [1.6, 1.05, -0.45], B);
    const dispOff = textTex('', { w: 256, h: 96, bg: '#14261b' }), dispOn = textTex('24 zł', { w: 256, h: 96, bg: '#14261b', fg: '#62ff8e', size: 70 });
    dingDisplay = signPlane(dispOff, 0.3, 0.11, [1.6, 1.24, -0.38], B, true); dingDisplay.userData = { dispOff, dispOn };
    add(new THREE.BoxGeometry(0.05, 0.18, 0.05), toon(0x2a2d33), [1.6, 1.17, -0.45], B, false);
    for (let i = 0; i < 3; i++) add(rbox(0.42, 0.16, 0.3, 0.02), toon(0xc8141e), [-0.85, 0.08 + i * 0.12, -0.9], B, true);
    B.add(new THREE.HemisphereLight(0xfff3dd, 0x9a8a6a, 1.6));
    const key1 = new THREE.DirectionalLight(0xfff0d8, 1.7); key1.position.set(-2, 6, 6); key1.castShadow = true; key1.shadow.mapSize.set(2048, 2048);
    Object.assign(key1.shadow.camera, { left: -4, right: 4, top: 5, bottom: -2, near: 1, far: 25 }); key1.shadow.bias = -0.0005; key1.shadow.normalBias = 0.02;
    B.add(key1, key1.target);
    const lampL = new THREE.PointLight(0xffe2b0, 4, 5, 1.6); lampL.position.set(0.15, 3.1, -0.4); B.add(lampL);
  }
  // the red basket in his left hand (shop only)
  const basket = new THREE.Group(); man.J.elbowL.add(basket);
  { add(rbox(0.3, 0.16, 0.2, 0.02), toon(0xc8141e), [0, -0.52, 0.0], basket);
    add(new THREE.TorusGeometry(0.1, 0.012, 6, 16, PI), toon(0x8a0d14), [0, -0.44, 0], basket, false); }

  // KITCHEN
  const K = sets.kitchen;
  let flames = [], steam = [], panTomato, plate, spoon;
  {
    const floorT = noiseTex('#7a5636', ['#5e4128', '#946a44'], 500, 6, 4, (g, w, h) => { g.strokeStyle = 'rgba(40,26,14,0.55)'; g.lineWidth = 3; for (let y = 0; y <= h; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshToonMaterial({ map: floorT, gradientMap: ramp })); fl.rotation.x = -PI / 2; fl.position.z = 2.4; fl.receiveShadow = true; K.add(fl);
    const wallT = noiseTex('#cfe0db', ['#b9cec8', '#e2eeea'], 600, 3, 2);
    add(new THREE.BoxGeometry(12, 6, 0.2), new THREE.MeshToonMaterial({ map: wallT, gradientMap: ramp }), [0, 3, -1.7], K, false);
    const tileT = ctex(256, 256, (g, w, h) => { g.fillStyle = '#f4f7f6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c4d2ce'; g.lineWidth = 4; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, 12, 2);
    add(new THREE.PlaneGeometry(12, 1.1), new THREE.MeshToonMaterial({ map: tileT, gradientMap: ramp }), [0, 1.45, -1.59], K, false);
    const cabM = toon(0xd9c39a);
    for (let i = 0; i < 3; i++) { add(rbox(0.62, 0.7, 0.35, 0.02), cabM, [-0.85 + i * 0.66, 2.75, -1.42], K); add(new THREE.SphereGeometry(0.02, 8, 6), toon(0x444444), [-0.62 + i * 0.66, 2.5, -1.24], K, false); }
    add(rbox(0.95, 0.8, 0.06), toon(0xf1f1ee), [1.55, 2.45, -1.58], K);
    add(new THREE.PlaneGeometry(0.82, 0.67), toon(0x1c2b4e), [1.55, 2.45, -1.54], K, false);
    add(new THREE.CircleGeometry(0.08, 20), glow(0xf3e7c6), [1.75, 2.62, -1.53], K, false);
    add(new THREE.BoxGeometry(0.14, 0.95, 0.04), toon(0xc8141e), [2.1, 2.45, -1.53], K);
    add(new THREE.CylinderGeometry(0.06, 0.045, 0.1, 10), toon(0xb5653a), [1.3, 2.11, -1.5], K);
    for (const [x, y] of [[1.3, 2.2], [1.33, 2.25], [1.27, 2.24]]) add(new THREE.SphereGeometry(0.04, 8, 6), toon(0x3e9a3a), [x, y, -1.5], K);
    add(rbox(0.85, 1.95, 0.65), toon(0xf4f4f2), [-1.7, 0.975, -1.3], K);
    add(new THREE.BoxGeometry(0.85, 0.02, 0.01), toon(0xbfbfbf), [-1.7, 1.3, -0.97], K, false);
    add(new THREE.PlaneGeometry(0.16, 0.16), toon(0xffd84a), [-1.55, 1.55, -0.965], K, false);
    add(new THREE.SphereGeometry(0.02, 8, 6), toon(0x2f5fd0), [-1.85, 0.9, -0.96], K, false);
    // island
    add(rbox(2.0, 0.88, 0.62), toon(0x4a5566), [0.4, 0.44, -0.3], K);
    add(rbox(2.08, 0.05, 0.68, 0.015), toon(0x2a2d33), [0.4, 0.905, -0.3], K);
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 24), toon(0x111114), [0.1, 0.935, -0.32], K, false);
    const pan = new THREE.Group(); pan.position.set(0.1, 0.96, -0.32); K.add(pan);
    add(new THREE.CylinderGeometry(0.17, 0.14, 0.05, 24), toon(0x1a1a1e), [0, 0, 0], pan);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 24), toon(0xd8312a), [0, 0.02, 0], pan, false).userData.sauce = true;
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 8), toon(0x1a1a1e), [-0.3, 0.02, 0.06], pan, true, [0, 0, PI / 2 + 0.1]).rotation.y = -0.3;
    pan.userData.sauce = pan.children.find(c => c.userData.sauce);
    add(rbox(0.38, 0.03, 0.26, 0.01), toon(0xc9955a), [0.78, 0.94, -0.32], K);
    panTomato = add(new THREE.SphereGeometry(0.06, 14, 10), toon(0xd8312a), [0.75, 0.99, -0.3], K);
    for (const [x, z] of [[0.86, -0.36], [0.9, -0.28], [0.83, -0.25]]) add(new THREE.SphereGeometry(0.025, 8, 6), toon(0x3e9a3a), [x, 0.965, z], K, false);
    add(new THREE.BoxGeometry(0.16, 0.005, 0.025), toon(0xcfd6dc), [0.72, 0.96, -0.42], K, false);
    // plate of spaghetti (pops in)
    plate = new THREE.Group(); plate.position.set(1.12, 0.94, -0.22); K.add(plate);
    add(new THREE.CylinderGeometry(0.17, 0.13, 0.025, 28), toon(0xffffff), [0, 0, 0], plate);
    const pastaG = new THREE.Group(); plate.add(pastaG);
    for (let i = 0; i < 14; i++) { const a = rnd() * PI * 2, r = 0.03 + rnd() * 0.06;
      add(new THREE.TorusGeometry(0.035 + rnd() * 0.02, 0.008, 6, 18), toon(0xf2cf6a), [Math.cos(a) * r, 0.03 + rnd() * 0.02, Math.sin(a) * r], pastaG, false, [PI / 2 + (rnd() - 0.5) * 0.6, 0, rnd() * 3]); }
    add(new THREE.SphereGeometry(0.06, 14, 10), toon(0xd23a2a), [0, 0.06, 0], plate, true).scale.y = 0.6;
    add(new THREE.SphereGeometry(0.025, 8, 6), toon(0x3e9a3a), [0.025, 0.1, 0.0], plate, false).scale.set(1, 0.4, 1.6);
    // spoon in his right hand
    spoon = new THREE.Group(); man.J.elbowR.add(spoon); spoon.position.set(0, -0.3, 0.02);
    add(new THREE.CylinderGeometry(0.009, 0.009, 0.36, 8), toon(0xb98552), [0, -0.12, 0.04], spoon, true, [0.5, 0, 0]);
    add(new THREE.SphereGeometry(0.03, 10, 8), toon(0xb98552), [0, -0.27, 0.13], spoon, true).scale.set(1, 0.5, 1.4);
    // fire + steam sprites
    const fireT = ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.35, 'rgba(255,150,40,0.9)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const steamT = ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); K.add(s);
      const a = i / 14 * PI * 2; flames.push({ s, x: 0.1 + Math.cos(a) * 0.15, z: -0.32 + Math.sin(a) * 0.15, ph: rnd() * 10 }); }
    for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamT, depthWrite: false, transparent: true })); K.add(s); steam.push({ s, ph: i / 10, dx: (rnd() - 0.5) * 0.14 }); }
    flames.light = new THREE.PointLight(0xff8a3a, 0, 2.5, 1.6); flames.light.position.set(0.1, 1.05, -0.2); K.add(flames.light);
    K.add(new THREE.HemisphereLight(0xf6fbff, 0x8a8f8a, 1.55));
    const key2 = new THREE.DirectionalLight(0xfff4e6, 1.6); key2.position.set(-3, 6, 6); key2.castShadow = true; key2.shadow.mapSize.set(2048, 2048);
    Object.assign(key2.shadow.camera, { left: -4, right: 4, top: 5, bottom: -2, near: 1, far: 25 }); key2.shadow.bias = -0.0005; key2.shadow.normalBias = 0.02;
    K.add(key2, key2.target);
  }

  /* ── text: bubbles, captions, title, url, hearts, notes, black fade ── */
  const sprite = (tex, aspect, order = 10) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0 }));
    s.renderOrder = order; s.userData.aspect = aspect; scene.add(s); return s; };
  const bubbleTex = (text, tail = 'left') => ctex(512, 300, (g, w, h) => {
    g.font = '96px Tag'; const fs = Math.min(96, 96 * 380 / g.measureText(text).width); g.font = `${fs}px Tag`;
    const bw = Math.min(480, g.measureText(text).width + 90), x0 = (w - bw) / 2;
    g.lineWidth = 12; g.strokeStyle = '#111'; g.fillStyle = '#fff';
    const tx = tail === 'left' ? x0 + bw * 0.28 : x0 + bw * 0.72;
    g.beginPath(); g.roundRect(x0, 18, bw, 190, 95); g.moveTo(tx - 26, 200); g.lineTo(tx + (tail === 'left' ? -40 : 40), 285); g.lineTo(tx + 26, 200); g.closePath();
    g.stroke(); g.fill(); g.beginPath(); g.roundRect(x0, 18, bw, 190, 95); g.fill();
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 116); });
  const captionTex = text => ctex(1400, 240, (g) => { g.font = '96px Tag'; const fs = Math.min(96, 96 * 1180 / g.measureText(text).width); g.font = `${fs}px Tag`;
    const w = g.measureText(text).width + 120, x0 = (1400 - w) / 2; g.fillStyle = 'rgba(20,18,28,0.85)'; g.beginPath(); g.roundRect(x0, 30, w, 180, 90); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 700, 124); });
  const heartTex = ctex(128, 128, (g) => { g.fillStyle = '#ff3d6e'; g.strokeStyle = '#111'; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 108);
    g.bezierCurveTo(10, 70, 10, 20, 40, 20); g.bezierCurveTo(56, 20, 64, 34, 64, 42); g.bezierCurveTo(64, 34, 72, 20, 88, 20); g.bezierCurveTo(118, 20, 118, 70, 64, 108); g.closePath(); g.stroke(); g.fill(); });
  const noteTex = ctex(128, 128, (g) => { g.fillStyle = '#1b1b22'; g.beginPath(); g.ellipse(38, 98, 20, 14, -0.4, 0, 7); g.fill(); g.beginPath(); g.ellipse(92, 86, 20, 14, -0.4, 0, 7); g.fill();
    g.fillRect(52, 20, 8, 78); g.fillRect(106, 8, 8, 78); g.beginPath(); g.moveTo(52, 20); g.lineTo(114, 8); g.lineTo(114, 26); g.lineTo(52, 38); g.closePath(); g.fill(); });
  const T = {
    glodny: sprite(captionTex('głodny…'), 240 / 1400), list: sprite(captionTex('pomidory · makaron · bazylia'), 240 / 1400),
    hej1: sprite(bubbleTex('hej!', 'right'), 300 / 512), hej2: sprite(bubbleTex('hej!', 'left'), 300 / 512),
    dzien: sprite(bubbleTex('Dziękuję!', 'right'), 300 / 512), dzyn: sprite(textTex('dzyń!', { w: 512, h: 160, fg: '#c8141e', size: 110, stroke: '#ffffff' }), 160 / 512),
    pyszne: sprite(bubbleTex('Mmm, pyszne!', 'right'), 300 / 512),
    title: sprite(textTex('SMACZNEGO!', { w: 1400, h: 300, fg: '#d4142a', size: 230, stroke: '#ffffff' }), 300 / 1400),
    url: sprite(textTex('elvladislavo.com', { w: 1400, h: 300, fg: '#ffffff', font: 'Title', size: 200, stroke: '#000000' }), 300 / 1400),
  };
  const hearts = Array.from({ length: 10 }, (_, i) => ({ s: sprite(heartTex, 1, 11), ph: rnd(), dx: (rnd() - 0.5) * 0.5, side: i % 2 }));
  const notes = Array.from({ length: 6 }, (_, i) => ({ s: sprite(noteTex, 1, 11), ph: i / 6, dx: (rnd() - 0.5) * 0.3 }));
  const poof = { smoke: [], stars: [] };
  { const smokeT = ctex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(240,236,250,0.85)'); gr.addColorStop(1, 'rgba(240,236,250,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const starT = ctex(128, 128, (g) => { g.fillStyle = '#ffe27a'; g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 22 : 56; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); g.stroke(); g.fill(); });
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; poof.smoke.push({ s: sprite(smokeT, 1, 12), d: V3(Math.cos(a), Math.sin(a) * 0.8 + 0.3, 0.2), r: 0.5 + rnd() * 0.3 }); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2 + 0.3; poof.stars.push({ s: sprite(starT, 1, 13), d: V3(Math.cos(a), Math.sin(a) + 0.2, 0.1) }); } }
  const black = sprite(ctex(4, 4, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 4, 4); }), 1, 50);

  const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), hTan = vTan * (width / height);
  const hudR = V3(), hudU = V3(), hudF = V3();
  function hud(s, nx, ny, frac) { camera.matrixWorld.extractBasis(hudR, hudU, hudF);
    s.position.copy(camera.position).addScaledVector(hudF, -1).addScaledVector(hudR, nx * hTan).addScaledVector(hudU, ny * vTan);
    const w = frac * 2 * hTan; s.scale.set(w, w * s.userData.aspect, 1); }
  const world = (s, p, w) => { s.position.copy(p); s.scale.set(w, w * s.userData.aspect, 1); };
  const popIn = (t, a, b, out = 0.25) => E.outBack(range(t, a, a + 0.35)) * (1 - range(t, b - out, b));
  const headTop = (g, up = 0.62) => g.J.head.getWorldPosition(V3()).add(V3(0, up, 0));

  /* ── walk phase from path length (precomputed, deterministic) ── */
  function pathPhase(XK, ZK, t0s) {
    const dt = 1 / 240, n = Math.ceil(T_END / dt) + 1, s = new Float32Array(n);
    let px = key(0, XK), pz = key(0, ZK), acc = 0;
    for (let i = 1; i < n; i++) { const t = i * dt, x = key(t, XK), z = key(t, ZK);
      const d = Math.hypot(x - px, z - pz); if (!t0s.some(c => t - dt < c && t >= c)) acc += d; s[i] = acc; px = x; pz = z; }
    return t => { const i = Math.min(n - 1, Math.max(0, Math.round(t / dt))); return s[i] / STRIDE * 2 * PI; };
  }
  const mcPh = pathPhase(MC_X, MC_Z, [T_SHOP, T_KIT + 0.001]);
  const ladyPh = pathPhase(LADY_X, LADY_Z, [T_KIT + 0.001]);
  const W = (bk = false) => t => walkPh(mcPh(t), 0.38, bk);
  const WS = t => walkPh(mcPh(t), 0.3);            // slow, hungry street walk
  const MC_KEYS = [
    [0, WS], [1.9, WS], [2.3, P.belly], [3.9, P.belly], [4.25, WS], [9.4, WS], [T_SHOP - 0.01, WS],
    [T_SHOP, W(true)], [11.45, W(true)], [11.8, t => stand(t, true)],
    [PICKS[0][0], t => stand(t, true)], [12.1, P.reachHi], [12.3, P.reachHi], [12.6, t => stand(t, true)],
    [12.95, P.reachMid], [13.2, P.reachMid], [13.45, t => stand(t, true)], [13.8, P.reachLo], [14.05, P.reachLo], [14.35, t => stand(t, true)],
    [15.45, t => stand(t, true)], [15.75, P.wave], [16.85, P.wave], [17.1, W(true)], [17.9, W(true)], [18.2, P.pay], [19.0, P.pay], [T_KIT - 0.01, P.pay],
    [T_KIT, W()], [20.95, W()], [21.2, t => stand(t)], [21.35, P.pickBoard], [21.6, P.pickBoard], [21.85, P.toss], [22.05, P.toss],
    [22.45, P.stir], [T_STIR1, P.stir], [26.35, P.present], [27.1, P.present], [27.45, P.cheer], [T_END + 1, P.cheer],
  ];
  const LW = t => walkPh(ladyPh(t), 0.34);
  const ladyWave = t => ({ ...stand(t), head: [-0.05, 0, -0.12], shoulderL: [-0.3, 0, 2.45 - 0.28 * Math.sin(t * 13)], elbowL: [-0.55, 0, 0] });
  const ladyClasp = t => ({ ...stand(t), head: [-0.05, 0, 0.12 * Math.sin(t * 1.5)], shoulderL: [-0.7, 0, -0.1], elbowL: [-1.2, 0, 0], shoulderR: [-0.7, 0, 0.1], elbowR: [-1.2, 0, 0], hipR: [0.08, 0, -0.08], kneeR: [0.15, 0, 0] });
  const ladyBrowse = t => ({ ...stand(t), head: [0.1, 0.15 * Math.sin(t * 0.8), 0], shoulderR: [-0.9, 0, -0.05], elbowR: [-0.9, 0, 0] });
  const ladyTada = t => ({ ...stand(t), head: [-0.08, 0, 0.1], shoulderL: [-0.2, 0, 1.9], elbowL: [-0.3, 0, 0], shoulderR: [-0.2, 0, -1.9], elbowR: [-0.3, 0, 0], hipR: [-0.12, 0, -0.1], kneeR: [0.25, 0, 0] });
  const LADY_KEYS = [[0, ladyTada], [12.85, ladyTada], [13.2, ladyBrowse], [14.1, ladyBrowse], [14.45, t => stand(t)], [T_HEJ1, ladyWave], [15.9, ladyWave], [16.2, ladyClasp], [T_KIT - 0.01, ladyClasp],
    [T_KIT, LW], [26.85, LW], [27.2, t => stand(t)], [T_PYSZNE - 0.2, t => stand(t)], [T_PYSZNE + 0.1, ladyClasp], [T_END + 1, ladyClasp]];
  const cashStand = t => ({ ...stand(t), shoulderL: [-0.5, 0, 0.1], elbowL: [-1.0, 0, 0], shoulderR: [-0.5, 0, -0.1], elbowR: [-1.0, 0, 0] });
  const cashWave = t => ({ ...cashStand(t), shoulderR: [-0.3, 0, -2.3 + 0.25 * Math.sin(t * 12)], elbowR: [-0.5, 0, 0] });
  const CASH_KEYS = [[0, cashStand], [18.3, cashStand], [18.55, cashWave], [T_END, cashWave]];

  const camLook = V3();
  return {
    update(t) {
      const at = setAt(t);
      for (const k in sets) sets[k].visible = k === at;
      const ox = OX[at];

      /* MC */
      man.system.position.set(ox + key(t, MC_X), 0, key(t, MC_Z));
      man.system.rotation.y = key(t, MC_YAW);
      man.applyPose(MC_KEYS, t);
      man.system.visible = !(at === 'street' && t > 9.25);
      basket.visible = at === 'shop'; spoon.visible = at === 'kitchen' && t > 22.1 && t < 26.2;

      /* the girl */
      lady.system.visible = at === 'kitchen' || (at === 'shop' && t > T_MORPH);
      lady.system.scale.setScalar(at === 'shop' ? 0.92 * Math.max(0.001, E.outBack(range(t, T_MORPH + 0.05, T_MORPH + 0.5))) : 0.92);
      lady.system.position.set(ox + key(t, LADY_X), 0, key(t, LADY_Z)); lady.system.rotation.y = key(t, LADY_YAW);
      lady.applyPose(LADY_KEYS, t);
      cashier.system.visible = at === 'shop';
      cashier.system.position.set(OX.shop + 1.5, 0, -0.95); cashier.system.rotation.y = -0.25;
      cashier.applyPose(CASH_KEYS, t);

      /* cat: sits by the shop window, trots in ahead of him */
      cat.visible = (at === 'street' && t < 8.1) || (at === 'shop' && t < T_MORPH + 0.25);
      if (at === 'street') { cat.scale.setScalar(1); const walkK = range(t, 6.4, 7.5), inK = range(t, 7.5, 8.1);
        const x = lerp(2.75, 1.45, E.inOutQuad(walkK)), z = lerp(-0.55, lerp(-0.4, -1.5, inK), 1);
        cat.position.set(OX.street + x, 0, walkK < 1 ? lerp(-0.55, -0.4, walkK) : z);
        cat.rotation.y = t < 6.3 ? 0.4 : walkK < 1 ? -PI / 2 : PI;
        const moving = t > 6.4 && t < 8.1;
        catLegs.forEach((l, i) => l.rotation.x = moving ? Math.sin(t * 16 + (i % 2) * PI + (i > 1 ? PI : 0)) * 0.5 : 0);
        cat.userData.tail.rotation.y = Math.sin(t * 2.5) * 0.35; }
      else if (at === 'shop') {          // trots in ahead of him, sits by the fridge facing us, shrinks into the poof
        const k = range(t, T_SHOP + 0.1, 11.2);
        cat.position.set(OX.shop + lerp(-2.4, -0.95, E.outQuad(k)), 0, 0.7);
        cat.rotation.y = t < 11.25 ? PI / 2 : lerp(PI / 2, 0, E.inOutCubic(range(t, 11.25, 11.5)));
        cat.scale.setScalar(Math.max(0.001, 1 - E.inBack(range(t, T_MORPH - 0.05, T_MORPH + 0.2))));
        const moving = k > 0 && k < 1;
        catLegs.forEach((l, i) => l.rotation.x = moving ? Math.sin(t * 16 + (i % 2) * PI + (i > 1 ? PI : 0)) * 0.5 : 0);
        cat.userData.tail.rotation.y = Math.sin(t * 3) * 0.4; }
      { // the poof: smoke puffs swell and fade, sparkles fly out
        const pc = V3(OX.shop - 0.95, 0.5 + 0.35 * range(t, T_MORPH, T_MORPH + 0.6), 0.75), on = at === 'shop';
        poof.smoke.forEach((m, i) => { const k = range(t, T_MORPH - 0.15 + i * 0.015, T_MORPH + 0.95);
          m.s.position.copy(pc).add(m.d.clone().multiplyScalar(0.35 * E.outCubic(k))); m.s.scale.setScalar((0.5 + 0.9 * E.outCubic(k)) * m.r);
          m.s.material.opacity = on && k > 0 && k < 1 ? 0.9 * (1 - k) : 0; });
        poof.stars.forEach((m, i) => { const k = range(t, T_MORPH, T_MORPH + 0.8);
          m.s.position.copy(pc).add(m.d.clone().multiplyScalar(0.9 * E.outCubic(k))); m.s.scale.setScalar(0.12 * (1 - k * 0.6));
          m.s.material.rotation = t * 6 + i; m.s.material.opacity = on && k > 0 && k < 1 ? 1 - k * k : 0; }); }

      /* street extras */
      door.rotation.y = 1.55 * E.inOutCubic(range(t, 7.35, 7.95)) * (1 - E.inOutCubic(range(t, 9.2, 9.7)));
      for (const l of leaves) { const p = (t * l.sp + l.ph) % 1;
        l.m.position.set(l.x + Math.sin(t * 1.3 + l.sw) * 0.35 + p * 0.6, 4.3 - p * 4.3, l.z); l.m.rotation.set(t * 2 + l.sw, t * 3 + l.sw, t + l.sw); }
      streetLight.intensity = 5 + Math.sin(t * 37) * 0.25;

      /* shop extras: picks fly from shelf to hand, then drop into the basket */
      const hand = V3(), bpos = V3();
      PICKS.forEach(([r0, g, inB], i) => {
        const pk = picks[i]; man.J.elbowR.localToWorld(hand.set(0, -0.32, 0.03)); basket.localToWorld(bpos.set(0, -0.48, 0).add(pk.slot));
        const shelf = pk.from.clone().add(V3(OX.shop, 0, 0));
        let p = shelf;
        if (t > g - 0.12 && t <= inB) p = shelf.clone().lerp(hand, E.outCubic(range(t, g - 0.12, g)));
        if (t > inB - 0.3) p = hand.clone().lerp(bpos, E.inOutCubic(range(t, inB - 0.3, inB)));
        pk.m.position.copy(p).sub(B.position); pk.m.visible = t < T_KIT;
      });
      clockHand.rotation.z = -t * 0.9; clockHand2.rotation.z = -t * 0.08;
      dingDisplay.material.map = t > T_DING ? dingDisplay.userData.dispOn : dingDisplay.userData.dispOff;

      /* kitchen extras */
      { const fire = sm(21.9, 22.3, t) * (1 - sm(26.0, 26.6, t));
        flames.forEach((f, i) => { const fl = 0.75 + 0.25 * Math.sin(t * 23 + f.ph) + 0.15 * wiggle(t, 6, i);
          f.s.position.set(f.x, 0.94 + 0.03 * fl, f.z); f.s.scale.setScalar(0.11 * fl * fire); f.s.material.opacity = fire; });
        flames.light.intensity = 3 * fire * (0.85 + 0.15 * Math.sin(t * 19));
        const st = sm(22.6, 23.4, t) * (1 - sm(26.2, 27.0, t));
        steam.forEach((s, i) => { const p = (t * 0.45 + s.ph) % 1; s.s.position.set(0.1 + s.dx + Math.sin(t * 2 + i) * 0.05, 1.05 + p * 0.9, -0.32);
          s.s.scale.setScalar(0.12 + p * 0.25); s.s.material.opacity = st * 0.55 * Math.sin(p * PI); });
        // tomato: board → hand → arc into the pan, then gone into the sauce
        const handL = man.J.elbowL.localToWorld(V3(0, -0.32, 0.03)).sub(K.position);
        let tp = V3(0.75, 0.99, -0.3);
        if (t > 21.5) tp = tp.lerp(handL, E.outCubic(range(t, 21.5, 21.7)));
        if (t > 21.85) { const k = range(t, 21.85, 22.25); tp = handL.clone().lerp(V3(0.1, 0.99, -0.32), k); tp.y += Math.sin(k * PI) * 0.25; }
        panTomato.position.copy(tp); panTomato.visible = t < 22.3;
        const pk = range(t, T_PLATE, T_PLATE + 0.45); plate.scale.setScalar(Math.max(0.001, E.outBack(pk))); plate.visible = pk > 0; }

      /* camera */
      if (at === 'street') { cat.scale.setScalar(1);
        const mx = key(t, MC_X), cx = lerp(-1.4, 1.35, sm(-2.6, 1.4, mx)) * 0.9 + 0.12, k = E.inOutCubic(range(t, 0.2, 2.6));
        camera.position.set(lerp(mx + 0.55, cx, k), lerp(0.32, 1.95, k), lerp(1.9, 6.4, k));
        camLook.set(lerp(mx, cx, k), lerp(0.22, 1.85, k), lerp(0.3, -0.6, k));
        const push = E.inOutCubic(range(t, 7.2, 9.6)); camera.position.z -= push * 1.0; camera.position.y -= push * 0.15;
      } else if (at === 'shop') {
        const k = range(t, T_SHOP, T_KIT); camera.position.set(key(t, [[T_SHOP, -0.2], [16.9, -0.25], [18.1, 0.35]]), 1.95, lerp(6.1, 5.6, k));
        camLook.set(camera.position.x, 1.6, -0.6);
      } else {
        const k = range(t, T_KIT, T_END); camera.position.set(0.5, 1.8, lerp(5.2, 4.2, E.inOutQuad(k)));
        camLook.set(0.5, 1.5, -0.6);
      }
      camera.position.x += wiggle(t, 0.35, 1) * 0.02; camera.position.y += wiggle(t, 0.3, 2) * 0.015;
      camera.position.x += ox; camLook.x += ox;
      camera.lookAt(camLook); camera.updateMatrixWorld();

      /* text */
      for (const k in T) T[k].material.opacity = 0;
      T.glodny.material.opacity = sm(1.6, 1.9, t) * (1 - sm(4.2, 4.5, t)); hud(T.glodny, 0, -0.62, 0.55);
      T.list.material.opacity = sm(10.4, 10.7, t) * (1 - sm(13.6, 13.9, t)); hud(T.list, 0, 0.78, 0.9);
      { const a = popIn(t, T_HEJ1, 16.4); T.hej1.material.opacity = Math.min(1, a * 1.5); world(T.hej1, headTop(lady), 0.62 * Math.max(0.01, a)); }
      { const a = popIn(t, T_HEJ2, 17.0); T.hej2.material.opacity = Math.min(1, a * 1.5); world(T.hej2, headTop(man), 0.62 * Math.max(0.01, a)); }
      { const a = popIn(t, T_DING, 19.35); T.dzyn.material.opacity = Math.min(1, a * 1.5); world(T.dzyn, V3(OX.shop + 1.85, 1.38, 0.2), 0.62 * Math.max(0.01, a));
        const b = popIn(t, T_DING + 0.25, 19.4); T.dzien.material.opacity = Math.min(1, b * 1.5); world(T.dzien, headTop(cashier, 0.55), 0.72 * Math.max(0.01, b)); }
      { const a = popIn(t, T_PYSZNE, T_END + 1); T.pyszne.material.opacity = Math.min(1, a * 1.5); const p = headTop(lady, 0.6); p.x -= 0.5; world(T.pyszne, p, 0.85 * Math.max(0.01, a)); }
      { const a = E.outBack(range(t, T_TITLE, T_TITLE + 0.5)); T.title.material.opacity = range(t, T_TITLE, T_TITLE + 0.15); hud(T.title, 0, 0.7, 0.95 * Math.max(0.01, a));
        T.title.material.rotation = -0.06; }
      T.url.material.opacity = sm(T_URL, T_URL + 0.5, t); hud(T.url, 0, -0.78, 0.85);

      /* hearts (shop hej, kitchen ending) and humming notes */
      hearts.forEach((h, i) => {
        let a = 0, base;
        if (t > 15.6 && t < 17.8) { const p = range(t, 15.6 + h.ph * 0.6, 17.8); a = Math.sin(p * PI); base = (h.side ? headTop(man, 0.3) : headTop(lady, 0.3)); base.y += p * 0.6; base.x += h.dx * 0.5; }
        else if (t > 28.0) { const p = ((t - 28 + h.ph * 2) / 2) % 1; a = Math.sin(p * PI) * sm(28, 28.4, t); base = V3(OX.kitchen + 1.12, 1.05, -0.22); base.y += p * 0.8; base.x += h.dx * 0.5; }
        h.s.material.opacity = a; if (base) world(h.s, base, 0.13 + 0.04 * Math.sin(t * 6 + i)); });
      const hum = sm(22.8, 23.2, t) * (1 - sm(25.8, 26.2, t));
      notes.forEach((n, i) => { const p = (t * 0.5 + n.ph) % 1, b = headTop(man, 0.25); b.x += n.dx + p * 0.35; b.y += p * 0.6;
        n.s.material.opacity = hum * Math.sin(p * PI); world(n.s, b, 0.14); n.s.material.rotation = Math.sin(t * 4 + i) * 0.3; });

      /* fades between sets */
      const f = Math.max(sm(9.15, 9.75, t) * (1 - sm(9.75, 10.3, t)), sm(19.05, 19.6, t) * (1 - sm(19.6, 20.15, t)), 1 - sm(0, 0.4, t));
      black.material.opacity = f; hud(black, 0, 0, 2.2); black.scale.y = black.scale.x * 2;
    },
  };
}
