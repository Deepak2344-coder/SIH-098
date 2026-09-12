"use strict";

const THREE = window.THREE;
const physics = window.physics;
if (!THREE || !physics) throw new Error("Missing dependencies (three.js / physics)");

const TANK_POS = { L: [-1.7, 0], R: [1.7, 0], B: [0, -1.7] };
const TANK_SIZE = 1.3;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f16);
scene.fog = new THREE.Fog(0x0b0f16, 26, 70);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(6.0, 2.6, 8.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("app").appendChild(renderer.domElement);

const orbitTarget = new THREE.Vector3(0, -0.5, 0);
const camOffset = camera.position.clone().sub(orbitTarget);
let orbitRadius = camOffset.length();
let orbitPhi = Math.acos(camOffset.y / orbitRadius);
let orbitTheta = Math.atan2(camOffset.z, camOffset.x);

function applyOrbit() {
  orbitPhi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitPhi));
  orbitRadius = Math.max(2.5, Math.min(42, orbitRadius));
  camera.position.set(
    orbitTarget.x + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta),
    orbitTarget.y + orbitRadius * Math.cos(orbitPhi),
    orbitTarget.z + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta)
  );
  camera.lookAt(orbitTarget);
}

const camEl = renderer.domElement;
let pointerDown = false;
let prevPX = 0;
let prevPY = 0;
camEl.addEventListener("pointerdown", function (e) {
  pointerDown = true;
  prevPX = e.clientX;
  prevPY = e.clientY;
  try {
    camEl.setPointerCapture(e.pointerId);
  } catch (err) {}
});
window.addEventListener("pointermove", function (e) {
  if (!pointerDown) return;
  const dx = e.clientX - prevPX;
  const dy = e.clientY - prevPY;
  prevPX = e.clientX;
  prevPY = e.clientY;
  orbitTheta -= dx * 0.006;
  orbitPhi -= dy * 0.006;
  applyOrbit();
});
window.addEventListener("pointerup", function () {
  pointerDown = false;
});
window.addEventListener("wheel", function (e) {
  e.preventDefault();
  orbitRadius *= Math.exp(e.deltaY * 0.0012);
  applyOrbit();
}, { passive: false });
applyOrbit();

const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x26303a, 1.25);
scene.add(hemi);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.9);
dirLight.position.set(6, 9, 5);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x8fb5ff, 0.6);
fillLight.position.set(-5, 3, -6);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xfff2d0, 0.45);
rimLight.position.set(2, -2, 8);
scene.add(rimLight);

const grid = new THREE.GridHelper(44, 44, 0x29405e, 0x16202e);
grid.position.y = -3.3;
scene.add(grid);

function glowTexture(color, center) {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, center);
  g.addColorStop(0.28, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

function glowSprite(color, size, center) {
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(color, center || "#ffffff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  sp.scale.setScalar(size);
  return sp;
}

function textSprite(text, color, size) {
  size = size || 64;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  ctx.font = 'bold ' + size + 'px "Segoe UI", system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  cv.width = Math.ceil(tw + size);
  cv.height = Math.ceil(size * 1.4);
  const c2 = cv.getContext("2d");
  c2.font = ctx.font;
  c2.textAlign = "center";
  c2.textBaseline = "middle";
  c2.shadowColor = color;
  c2.shadowBlur = size * 0.25;
  c2.fillStyle = color;
  c2.fillText(text, cv.width / 2, cv.height / 2);
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })
  );
  const aspect = cv.width / cv.height;
  const scale = (size / 64) * 0.9;
  sp.scale.set(aspect * scale, scale, 1);
  return sp;
}

function curvePts(arr) {
  const pts = [];
  for (let i = 0; i < arr.length; i++) pts.push(new THREE.Vector3(arr[i][0], arr[i][1], arr[i][2]));
  return new THREE.CatmullRomCurve3(pts);
}

const steelMat = new THREE.MeshStandardMaterial({ color: 0x8d98a4, roughness: 0.4, metalness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.5, metalness: 0.45 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b3646, roughness: 0.55, metalness: 0.5 });
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x5a6b7d, roughness: 0.35, metalness: 0.7 });
const liquidMat = new THREE.MeshStandardMaterial({
  color: 0x2f9df0, roughness: 0.15, metalness: 0.1,
  transparent: true, opacity: 0.8, emissive: 0x0a2a44, emissiveIntensity: 0.5,
});

const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.0, 24), steelMat);
axle.rotation.x = Math.PI / 2;
scene.add(axle);

const standPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.3, 0.18), frameMat);
standPost.position.set(0, -1.6, -1.6);
scene.add(standPost);
const standArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.7), frameMat);
standArm.position.set(0, 0, -0.8);
scene.add(standArm);
const standPlate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), frameMat);
standPlate.position.set(0, -3.2, -1.6);
scene.add(standPlate);

const rodLabel = textSprite("CENTRE ROD", "#aac4e8", 44);
rodLabel.position.set(0, 0.55, 1.1);
scene.add(rodLabel);

const cradle = new THREE.Group();
scene.add(cradle);

const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 12, 32), darkMat);
cradle.add(collar);

const glassGeo = new THREE.BoxGeometry(TANK_SIZE, TANK_SIZE, 1.0);
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xcfe4ff, transparent: true, opacity: 0.18, roughness: 0.08, metalness: 0.05,
});
const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a4a5c });
const liquidGeo = new THREE.BoxGeometry(1.14, 1, 0.86);
const liquidMeshes = {};

for (const key of ["L", "R", "B"]) {
  const tx = TANK_POS[key][0];
  const ty = TANK_POS[key][1];
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(tx, ty, 0);
  cradle.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeo), edgeMat);
  edges.position.set(tx, ty, 0);
  cradle.add(edges);
  const liq = new THREE.Mesh(liquidGeo, liquidMat);
  liq.position.set(tx, ty - 0.6, 0);
  cradle.add(liq);
  liquidMeshes[key] = liq;
}

const keel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), darkMat);
keel.position.set(0, -2.0, 0);
cradle.add(keel);

const tubeDefs = [
  { key: "LB", pts: [[-1.2, -0.55, 0], [-1.05, -1.0, 0], [-0.55, -1.2, 0]], pump: [-1.05, -1.0, 0] },
  { key: "RB", pts: [[1.2, -0.55, 0], [1.05, -1.0, 0], [0.55, -1.2, 0]], pump: [1.05, -1.0, 0] },
  { key: "LR", pts: [[-1.05, 0.35, 0], [-0.7, -0.35, -0.55], [0.7, -0.35, -0.55], [1.05, 0.35, 0]], pump: [0, -0.4, -0.55] },
];
const tubeCurves = {};
const pumpLeds = {};
for (let i = 0; i < tubeDefs.length; i++) {
  const d = tubeDefs[i];
  const curve = curvePts(d.pts);
  tubeCurves[d.key] = curve;
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.055, 10, false), pipeMat);
  cradle.add(mesh);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), darkMat);
  block.position.set(d.pump[0], d.pump[1], d.pump[2]);
  cradle.add(block);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x3fa9f5, emissive: 0x3fa9f5, emissiveIntensity: 0.1 })
  );
  led.position.set(d.pump[0], d.pump[1] + 0.19, d.pump[2]);
  cradle.add(led);
  pumpLeds[d.key] = led;
  for (let j = 0; j < d.pts.length; j += d.pts.length - 1) {
    const port = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), steelMat);
    port.position.set(d.pts[j][0], d.pts[j][1], d.pts[j][2]);
    cradle.add(port);
  }
}

const packetGroup = new THREE.Group();
cradle.add(packetGroup);
const packets = [];
function addPackets(key, count) {
  for (let i = 0; i < count; i++) {
    const sp = glowSprite("#3fa9f5", 0.15, "#c8ecff");
    packetGroup.add(sp);
    packets.push({ sprite: sp, key: key, u: Math.random() });
  }
}
addPackets("LB", 4);
addPackets("RB", 4);
addPackets("LR", 4);

const labelGroup = new THREE.Group();
cradle.add(labelGroup);
function addCradleLabel(text, x, y, color) {
  const sp = textSprite(text, color || "#aac4e8", 44);
  sp.position.set(x, y, 0);
  labelGroup.add(sp);
}
addCradleLabel("LEFT", -1.7, 1.0);
addCradleLabel("RIGHT", 1.7, 1.0);
addCradleLabel("BOTTOM", -1.05, -2.62);
addCradleLabel("KEEL", 0.62, -2.0);

const comMarker = new THREE.Group();
scene.add(comMarker);
const comBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0xffd94a, emissiveIntensity: 1.2 })
);
comMarker.add(comBall);
const ring1 = new THREE.Mesh(
  new THREE.TorusGeometry(0.17, 0.015, 8, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.8 })
);
comMarker.add(ring1);
const ring2 = new THREE.Mesh(
  new THREE.TorusGeometry(0.24, 0.012, 8, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.45 })
);
comMarker.add(ring2);

const gravArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 0),
  2,
  0xff5a50,
  0.35,
  0.2
);
scene.add(gravArrow);
const mgLabel = textSprite("mg", "#ff8a7a", 56);
scene.add(mgLabel);

function tubeActive(key) {
  const s = physics.state;
  if (!s.flowing || !s.target) return 0;
  const T = s.target;
  if (key === "LB") {
    if (T === "B" && s.V.L > 0.01) return 1;
    if (T === "L" && s.V.B > 0.01) return -1;
  }
  if (key === "RB") {
    if (T === "B" && s.V.R > 0.01) return 1;
    if (T === "R" && s.V.B > 0.01) return -1;
  }
  if (key === "LR") {
    if (T === "R" && s.V.L > 0.01) return 1;
    if (T === "L" && s.V.R > 0.01) return -1;
  }
  return 0;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function animateSim(dt) {
  const s = physics.state;

  cradle.rotation.z = s.theta;

  for (const key of ["L", "R", "B"]) {
    const fill = s.V[key] / physics.CAP;
    const h = Math.max(0.001, fill * 1.2);
    const m = liquidMeshes[key];
    m.scale.y = h;
    m.position.y = TANK_POS[key][1] - 0.6 + h / 2;
  }

  for (const key of ["LB", "RB", "LR"]) {
    pumpLeds[key].material.emissiveIntensity = tubeActive(key) !== 0 ? 2.2 : 0.1;
  }

  const speed = 0.9;
  for (let i = 0; i < packets.length; i++) {
    const p = packets[i];
    const dir = tubeActive(p.key);
    p.sprite.visible = dir !== 0;
    if (dir === 0) continue;
    p.u += dir * dt * speed;
    if (p.u > 1) p.u -= 1;
    if (p.u < 0) p.u += 1;
    p.sprite.position.copy(tubeCurves[p.key].getPointAt(clamp01(p.u)));
  }

  const w = physics.comWorld();
  comMarker.position.set(w.x, w.y, 0.85);
  ring1.rotation.z += dt * 1.5;
  ring2.rotation.z -= dt * 1.0;

  const weight = s.massTotal * 9.81;
  const len = Math.max(1, Math.min(3, 1 + weight * 0.008));
  gravArrow.position.set(w.x, w.y, 0.85);
  gravArrow.setLength(len, 0.35, 0.2);
  mgLabel.position.set(w.x + 0.45, w.y - len * 0.55, 0.85);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(function () {
  const dt = Math.min(clock.getDelta(), 0.05);
  physics.advance(dt);
  physics.pushHistory();
  animateSim(dt);
  ui.frame(physics.state);
  renderer.render(scene, camera);
});

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

ui.init({
  packetGroup: packetGroup,
  labelGroup: labelGroup,
});