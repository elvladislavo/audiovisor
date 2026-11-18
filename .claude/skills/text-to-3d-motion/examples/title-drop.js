// BRIEF: "Three glossy spheres drop onto a pedestal and bounce. The word MOTION rises
//         letter by letter in extruded 3D type with a springy stagger. Slow camera push-in,
//         warm studio light, 6 seconds."
//
// Render:  node scripts/render.mjs examples/title-drop.js --out title-drop.mp4
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ease, key, range, spring, stagger, wiggle } from '/lib/motion.js';

export const meta = { duration: 6, fps: 30, background: '#16120f' };

// Shot list (seconds)
const SHOT = { drop: [0.2, 1.6], type: [1.4, 3.2], hold: [3.2, 6] };

export async function setup({ THREE, renderer, scene, camera }) {
  // ── look ──
  renderer.toneMappingExposure = 1.1;
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  scene.fog = new THREE.Fog(meta.background, 14, 30);
  const key1 = new THREE.SpotLight(0xffc48a, 120, 30, 0.5, 0.6);
  key1.position.set(4, 8, 6); key1.castShadow = true; key1.shadow.mapSize.set(2048, 2048);
  const rim = new THREE.DirectionalLight(0x7fa8ff, 1.2); rim.position.set(-6, 3, -5);
  scene.add(key1, rim, new THREE.HemisphereLight(0xffe6cc, 0x221a14, 0.25));

  // ── set ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const pedestal = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.5, 2.4, 6, 0.2), new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: 0.4 }));
  pedestal.position.y = 0.25; pedestal.castShadow = pedestal.receiveShadow = true; scene.add(pedestal);

  const colors = [0xff6a3d, 0xffc23d, 0x3dd6ff];
  const balls = colors.map((c, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 32), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.12, clearcoat: 1 }));
    m.position.set(-2.2 + i * 2.2, 8, 0.6); m.castShadow = true; scene.add(m); return m;
  });

  const font = await new FontLoader().loadAsync('/three/examples/fonts/helvetiker_bold.typeface.json');
  const word = 'MOTION', mat = new THREE.MeshStandardMaterial({ color: 0xf4eee4, roughness: 0.3, metalness: 0.1 });
  let x = 0; const letters = [];
  for (const ch of word) {
    const g = new TextGeometry(ch, { font, size: 0.9, depth: 0.32, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4 });
    g.computeBoundingBox(); const w = g.boundingBox.max.x - g.boundingBox.min.x;
    g.translate(-w / 2, 0, -0.16);                       // pivot at bottom-centre so letters rotate up from the base
    const m = new THREE.Mesh(g, mat); m.castShadow = true;
    m.userData.x = x + w / 2; x += w + 0.08; letters.push(m); scene.add(m);
  }
  letters.forEach(m => { m.userData.x -= x / 2; });

  const target = new THREE.Vector3(0, 1.1, 0);
  return {
    update(t) {
      // spheres: fall with gravity-ish ease then bounce, staggered 0.15 s
      balls.forEach((b, i) => {
        const p = range(t, SHOT.drop[0] + i * 0.15, SHOT.drop[1] + i * 0.15);
        b.position.y = 0.92 + (8 - 0.92) * (1 - ease.outBounce(p));
        b.position.z = key(t, [[0, 0.6], [SHOT.type[0], 0.6], [SHOT.type[0] + 0.6, -0.7, ease.inOutCubic]]);
        const squash = p > 0.3 ? 1 - 0.12 * Math.abs(Math.sin(p * 18)) * (1 - p) : 1;
        b.scale.set(2 - squash, squash, 2 - squash);
      });
      // letters: rise + tip up with a spring, staggered
      letters.forEach((m, i) => {
        const s = spring(t, SHOT.type[0] + i * 0.09, { stiffness: 140, damping: 11 });
        m.position.set(m.userData.x, 0.5 + (s - 1) * 0.8, 0.5);
        m.rotation.x = (1 - s) * -1.4;
        m.scale.setScalar(Math.max(0.001, stagger(t, i, { start: SHOT.type[0], gap: 0.09, dur: 0.25 })));
      });
      // camera: slow push-in with a touch of handheld drift
      const push = ease.inOutCubic(range(t, 0, meta.duration));
      camera.position.set(1.0 - push * 0.9 + wiggle(t, 0.4, 1) * 0.04, 2.1 - push * 0.5, 9.2 - push * 1.7);
      camera.lookAt(target.x, target.y + wiggle(t, 0.3, 2) * 0.02, target.z);
    },
  };
}
