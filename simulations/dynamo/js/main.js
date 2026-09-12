"use strict";

const THREE = window.THREE;
const physics = window.physics;
if (!THREE || !physics) throw new Error("Missing dependencies (three.js / physics)");

const G = {
  drumX0: -3.5,
  drumX1: 0.5,
  drumR: 1.15,
  coilCx: 1.4,
  coilA: 0.5,
  coilB: 0.8,
  ringA: 2.32,
  ringB: 2.62,
  ringR: 0.3,
  magX: 1.45,
  magY: 2.15,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f16);
scene.fog = new THREE.Fog(0x0b0f16, 26, 70);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(8.2, 3.6, 9.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("app").appendChild(renderer.domElement);

const orbitTarget = new THREE.Vector3(1.5, 0, 0);
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
grid.position.y = -2.55;
scene.add(grid);

const platform = new THREE.Mesh(
  new THREE.BoxGeometry(3.6, 0.12, 2.4),
  new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.6, metalness: 0.15 })
);
platform.position.set(4.5, -1.44, 0);
scene.add(platform);

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
  const scale = (size / 64) * 1.0;
  sp.scale.set(aspect * scale, scale, 1);
  return sp;
}

function curvePts(arr) {
  const pts = [];
  for (let i = 0; i < arr.length; i++) pts.push(new THREE.Vector3(arr[i][0], arr[i][1], arr[i][2]));
  return new THREE.CatmullRomCurve3(pts);
}

function tube(curve, radius, color, opts) {
  opts = opts || {};
  const geo = new THREE.TubeGeometry(curve, 200, radius, 10, false);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: opts.roughness !== undefined ? opts.roughness : 0.35,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.7,
    emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
    emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 1,
  });
  return new THREE.Mesh(geo, mat);
}

const copperMat = new THREE.MeshStandardMaterial({ color: 0xe08b4d, roughness: 0.3, metalness: 0.7, emissive: 0x2a1400, emissiveIntensity: 0.4 });
const steelMat = new THREE.MeshStandardMaterial({ color: 0x8d98a4, roughness: 0.4, metalness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.5, metalness: 0.45 });

const rotor = new THREE.Group();
scene.add(rotor);

const drum = new THREE.Mesh(
  new THREE.CylinderGeometry(G.drumR, G.drumR, 4, 64, 8, true),
  new THREE.MeshStandardMaterial({ color: 0x8d98a4, roughness: 0.38, metalness: 0.6 })
);
drum.rotation.z = Math.PI / 2;
drum.position.x = (G.drumX0 + G.drumX1) / 2;
rotor.add(drum);

const endCap = new THREE.Mesh(new THREE.CircleGeometry(G.drumR, 64), steelMat);
endCap.rotation.y = Math.PI / 2;
endCap.position.x = G.drumX0;
rotor.add(endCap);

const rim = new THREE.Mesh(new THREE.TorusGeometry(G.drumR, 0.05, 12, 64), steelMat);
rim.rotation.y = Math.PI / 2;
rim.position.x = G.drumX1;
rotor.add(rim);

const stripeMat = new THREE.MeshStandardMaterial({ color: 0xb7342f, roughness: 0.45, metalness: 0.6 });
for (let si = 0; si < 4; si++) {
  const sx = [-2.7, -1.7, -0.7, 0.15][si];
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(G.drumR + 0.01, 0.055, 12, 64), stripeMat);
  stripe.rotation.y = Math.PI / 2;
  stripe.position.x = sx;
  rotor.add(stripe);
}

const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 7.0, 24), steelMat);
shaft.rotation.z = Math.PI / 2;
shaft.position.x = -0.6;
rotor.add(shaft);

function corner(k, xs, us) {
  const g = (k * Math.PI) / physics.nLoops;
  return new THREE.Vector3(
    G.coilCx + xs * G.coilA,
    us * G.coilB * Math.cos(g),
    us * G.coilB * Math.sin(g)
  );
}

function midP(p, q) {
  return p.clone().add(q).multiplyScalar(0.5);
}

const coilPts = [];
coilPts.push(new THREE.Vector3(G.ringA, G.ringR, 0));
coilPts.push(new THREE.Vector3(1.85, 0.2, -0.05));
coilPts.push(new THREE.Vector3(1.3, -0.12, -0.02));
for (let k = 0; k < physics.nLoops; k++) {
  const A = corner(k, -1, -1);
  const B = corner(k, -1, 1);
  const C = corner(k, 1, 1);
  const D = corner(k, 1, -1);
  coilPts.push(A);
  coilPts.push(midP(A, B));
  coilPts.push(B);
  coilPts.push(midP(B, C));
  coilPts.push(C);
  coilPts.push(midP(C, D));
  coilPts.push(D);
}
coilPts.push(new THREE.Vector3(2.12, 0.12, -0.18));
coilPts.push(new THREE.Vector3(2.48, 0.26, -0.08));
coilPts.push(new THREE.Vector3(G.ringB, G.ringR, 0));

const coilCurve = new THREE.CatmullRomCurve3(coilPts);
const coilMesh = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 420, 0.032, 10, false), copperMat);
rotor.add(coilMesh);

for (let ri = 0; ri < 2; ri++) {
  const rx = [G.ringA, G.ringB][ri];
  const ring = new THREE.Mesh(new THREE.TorusGeometry(G.ringR, 0.028, 12, 48), copperMat);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = rx;
  rotor.add(ring);
}

const windowPlaneMat = new THREE.MeshBasicMaterial({
  color: 0xffd94a,
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const windowPlane = new THREE.Mesh(new THREE.PlaneGeometry(G.coilA * 2, G.coilB * 2), windowPlaneMat);
windowPlane.position.x = G.coilCx;
windowPlane.renderOrder = 1;
rotor.add(windowPlane);

const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b3646, roughness: 0.55, metalness: 0.5 });
const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 0.14), frameMat);
topBeam.position.set(1.72, 2.35, -1.35);
scene.add(topBeam);
const botBeam = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 0.14), frameMat);
botBeam.position.set(1.72, -2.35, -1.35);
scene.add(botBeam);
for (let pi = 0; pi < 2; pi++) {
  const px = [0.3, 3.15][pi];
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.7, 0.14), frameMat);
  post.position.set(px, 0, -1.35);
  scene.add(post);
}

const magnetN = new THREE.Mesh(
  new THREE.BoxGeometry(2.0, 0.5, 1.1),
  new THREE.MeshStandardMaterial({ color: 0xd84848, roughness: 0.4, metalness: 0.3, emissive: 0x2a0505, emissiveIntensity: 0.6 })
);
magnetN.position.set(G.magX, G.magY, 0);
scene.add(magnetN);

const magnetS = new THREE.Mesh(
  new THREE.BoxGeometry(2.0, 0.5, 1.1),
  new THREE.MeshStandardMaterial({ color: 0x3d66c8, roughness: 0.4, metalness: 0.3, emissive: 0x060d2a, emissiveIntensity: 0.6 })
);
magnetS.position.set(G.magX, -G.magY, 0);
scene.add(magnetS);

for (let bi = 0; bi < 2; bi++) {
  const bracketY = [2.24, -2.24][bi];
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), frameMat);
  bracket.position.set(G.magX, bracketY, -0.95);
  scene.add(bracket);
}

const nLabel = textSprite("N", "#ff8080", 72);
nLabel.position.set(G.magX, G.magY + 0.55, 0);
scene.add(nLabel);
const sLabel = textSprite("S", "#7fa8ff", 72);
sLabel.position.set(G.magX, -G.magY - 0.55, 0);
scene.add(sLabel);

const fieldGroup = new THREE.Group();
scene.add(fieldGroup);

const fieldOrbs = [];
const fieldXS = [1.05, 1.25, 1.45, 1.65];
const fieldZS = [0, 0.42, -0.42];
const fieldMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.3 });

for (let xi = 0; xi < fieldXS.length; xi++) {
  for (let zi = 0; zi < fieldZS.length; zi++) {
    const fx = fieldXS[xi];
    const fz = fieldZS[zi];
    const p0 = new THREE.Vector3(fx, 1.9, fz);
    const p1 = new THREE.Vector3(fx, 0, fz);
    const p2 = new THREE.Vector3(fx, -1.9, fz);
    const lineCurve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    const lineMesh = new THREE.Mesh(new THREE.TubeGeometry(lineCurve, 40, 0.014, 6, false), fieldMat);
    fieldGroup.add(lineMesh);
    const mover = glowSprite("#4fc3f7", 0.2, "#c8f2ff");
    fieldGroup.add(mover);
    fieldOrbs.push({ sprite: mover, curve: lineCurve, t: Math.random() });
  }
}

const retCurves = [
  [[1.45, -1.9, 0.75], [1.45, -2.4, 1.6], [1.45, -2.5, 2.6], [1.45, 0, 2.9], [1.45, 2.5, 2.6], [1.45, 2.4, 1.6], [1.45, 1.9, 0.75]],
  [[1.45, -1.9, -0.75], [1.45, -2.4, -1.6], [1.45, -2.5, -2.6], [1.45, 0, -2.9], [1.45, 2.5, -2.6], [1.45, 2.4, -1.6], [1.45, 1.9, -0.75]],
];
const retMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.14 });
for (let ri = 0; ri < retCurves.length; ri++) {
  const c = curvePts(retCurves[ri]);
  fieldGroup.add(new THREE.Mesh(new THREE.TubeGeometry(c, 120, 0.012, 6, false), retMat));
}

for (let bi = 0; bi < 2; bi++) {
  const bx = [G.ringA, G.ringB][bi];
  const brush = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), darkMat);
  brush.position.set(bx, 0.42, 0);
  scene.add(brush);
}

const wireDefs = [
  { key: "ac1", pts: [[2.32, 0.42, 0], [2.62, 0.36, 0.05], [3.05, 0.02, 0.15], [3.2, -1.0, 0.12]], color: 0xe08b4d, dc: false },
  { key: "ac2", pts: [[2.62, 0.42, 0], [2.92, 0.26, -0.02], [3.15, -0.28, -0.12], [3.2, -1.0, -0.12]], color: 0xe08b4d, dc: false },
  { key: "dc1", pts: [[3.92, -1.12, 0.1], [4.2, -1.18, 0.06], [4.55, -1.14, 0.02], [4.86, -1.18, 0]], color: 0xff5a50, dc: true },
  { key: "dc2", pts: [[3.92, -1.12, -0.1], [4.2, -1.24, -0.05], [4.55, -1.2, -0.02], [4.86, -1.18, 0]], color: 0x39424f, dc: true },
];

const wireCurves = {};
for (let wi = 0; wi < wireDefs.length; wi++) {
  const d = wireDefs[wi];
  const c = curvePts(d.pts);
  wireCurves[d.key] = c;
  scene.add(tube(c, 0.035, d.color, { roughness: 0.3, metalness: d.dc ? 0.4 : 0.7 }));
}

for (let ti = 0; ti < 2; ti++) {
  const tz = [0.12, -0.12][ti];
  const term = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), copperMat);
  term.position.set(3.18, -1.0, tz);
  scene.add(term);
}
for (let ti = 0; ti < 2; ti++) {
  const tz = [0.1, -0.1][ti];
  const term = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), darkMat);
  term.position.set(3.94, -1.12, tz);
  scene.add(term);
}

const rectBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.55, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x2e3b47, roughness: 0.45, metalness: 0.55 })
);
rectBody.position.set(3.55, -1.08, 0);
scene.add(rectBody);
const rectLabel = textSprite("AC → DC", "#ffd94a", 56);
rectLabel.position.set(3.55, -0.32, 0);
scene.add(rectLabel);

const bulbLabel = textSprite("BULB", "#aac4e8", 44);
bulbLabel.position.set(5.0, -1.78, 0);
scene.add(bulbLabel);

const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 24), darkMat);
baseCyl.position.set(5.0, -1.17, 0);
scene.add(baseCyl);

const bulbStroke = new THREE.Mesh(
  new THREE.CylinderGeometry(0.13, 0.15, 0.14, 24),
  new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.3, metalness: 0.6 })
);
bulbStroke.position.set(5.0, -0.93, 0);
scene.add(bulbStroke);

const bulbGlass = new THREE.Mesh(
  new THREE.SphereGeometry(0.26, 32, 24),
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.28,
    roughness: 0.06,
    metalness: 0.05,
    emissive: 0x000000,
  })
);
bulbGlass.position.set(5.0, -0.6, 0);
scene.add(bulbGlass);

const filamentMat = new THREE.MeshStandardMaterial({
  color: 0xffd9a0,
  emissive: 0xffd9a0,
  emissiveIntensity: 0.02,
});
const filament = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.16, 6, 12), filamentMat);
filament.rotation.z = Math.PI / 2;
filament.position.set(5.0, -0.6, 0);
scene.add(filament);

const bulbLight = new THREE.PointLight(0xffe9b8, 0, 14, 2);
bulbLight.position.set(5.0, -0.6, 0);
scene.add(bulbLight);

const bulbGlow = glowSprite("#ffd94a", 0.5);
bulbGlow.position.set(5.0, -0.6, 0);
scene.add(bulbGlow);

const packetGroup = new THREE.Group();
scene.add(packetGroup);

const packetEntries = [];
function addPackets(key, count, dc) {
  const curve = wireCurves[key];
  for (let i = 0; i < count; i++) {
    const sp = glowSprite("#ffd94a", 0.16);
    sp.position.set(0, 0, 0);
    packetGroup.add(sp);
    packetEntries.push({ sprite: sp, curve: curve, u: Math.random(), dc: dc });
  }
}
addPackets("ac1", 4, false);
addPackets("ac2", 4, false);
addPackets("dc1", 4, true);
addPackets("dc2", 4, true);

function resetPackets() {
  for (let i = 0; i < packetEntries.length; i++) packetEntries[i].u = Math.random();
}

const sceneAPI = {
  fieldGroup: fieldGroup,
  packetGroup: packetGroup,
  resetPackets: resetPackets,
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function animateSim(dt) {
  const s = physics.state;

  rotor.rotation.x = s.theta;

  const winPeak = Math.max(1e-9, s.fieldT * (G.coilA * G.coilB));
  const winOp = Math.min(0.9, Math.abs(s.windowFlux) / winPeak);
  windowPlaneMat.opacity = winOp;
  windowPlaneMat.color.set(s.windowFlux >= 0 ? 0xffd94a : 0x4dd8ff);

  for (let i = 0; i < fieldOrbs.length; i++) {
    const o = fieldOrbs[i];
    o.t += dt * 0.22;
    if (o.t > 1) o.t -= 1;
    o.sprite.position.copy(o.curve.getPointAt(o.t));
  }

  const mag = s.emfPeak > 1e-9 ? Math.abs(s.emf) / s.emfPeak : 0;
  const pk = Math.min(1, mag);
  const dir = Math.sign(s.emf) || 1;

  for (let i = 0; i < packetEntries.length; i++) {
    const p = packetEntries[i];
    if (p.dc) {
      p.u += dt * 2.2 * pk;
      if (p.u > 1) p.u -= 1;
    } else {
      p.u += dt * 2.2 * pk * dir;
      p.u = clamp01(p.u);
    }
    p.sprite.position.copy(p.curve.getPointAt(p.u));
  }

  const P = s.running ? Math.pow(pk, 0.72) : 0;
  filamentMat.emissiveIntensity = 0.02 + P * 7;
  bulbGlass.material.emissive.setRGB(P * 0.4, P * 0.34, P * 0.18);
  bulbLight.intensity = P * 26;
  bulbGlow.scale.setScalar(0.35 + P * 2.1);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(function () {
  const dt = Math.min(clock.getDelta(), 0.05);
  physics.step(dt);
  animateSim(dt);
  ui.frame(physics.state);
  renderer.render(scene, camera);
});

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

ui.init(sceneAPI);