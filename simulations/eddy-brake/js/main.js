"use strict";

const THREE = window.THREE;
const physics = window.physics;
if (!THREE || !physics) throw new Error("Missing dependencies (three.js / physics)");

const G = {
  drumX0: -3.5,
  drumX1: 0.5,
  drumR: 1.15,
  ringX0: 0.5,
  ringX1: 0.73,
  ringRout: 1.15,
  ringRin: 0.92,
  ringMid: 1.035,
  magR: 1.09,
  magThick: 0.345,
  parkOffset: 1.8,
  gapVisScale: 0.138,
  mmPerUnit: 43.48,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f16);
scene.fog = new THREE.Fog(0x0b0f16, 26, 70);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(7.2, 3.4, 9.0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("app").appendChild(renderer.domElement);

const orbitTarget = new THREE.Vector3(1.0, 0, 0);
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

const steelMat = new THREE.MeshStandardMaterial({ color: 0x8d98a4, roughness: 0.4, metalness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.5, metalness: 0.45 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b3646, roughness: 0.55, metalness: 0.5 });
const slotMat = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.9, metalness: 0.2 });
const ringMat = new THREE.MeshStandardMaterial({
  color: 0xb9c1c9, roughness: 0.35, metalness: 0.6,
  emissive: 0xff4400, emissiveIntensity: 0,
});

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
const stripeX = [-2.7, -1.7, -0.7, 0.15];
for (let si = 0; si < stripeX.length; si++) {
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(G.drumR + 0.01, 0.055, 12, 64), stripeMat);
  stripe.rotation.y = Math.PI / 2;
  stripe.position.x = stripeX[si];
  rotor.add(stripe);
}

const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.8, 24), steelMat);
shaft.rotation.z = Math.PI / 2;
shaft.position.x = -1.7;
rotor.add(shaft);

const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.38, 32), steelMat);
hub.rotation.z = Math.PI / 2;
hub.position.x = 0.61;
rotor.add(hub);

function annulusShape(rOut, rIn) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

const ringGeo = new THREE.ExtrudeGeometry(annulusShape(G.ringRout, G.ringRin), {
  depth: G.ringX1 - G.ringX0,
  bevelEnabled: false,
  curveSegments: 96,
});
const ringMesh = new THREE.Mesh(ringGeo, ringMat);
ringMesh.rotation.y = Math.PI / 2;
ringMesh.position.x = G.ringX0;
rotor.add(ringMesh);

const N_SLOTS = 24;
const slotGeo = new THREE.BoxGeometry(0.184, 0.069, 0.161);
for (let k = 0; k < N_SLOTS; k++) {
  const a = (k * 2 * Math.PI) / N_SLOTS;
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.rotation.x = a;
  slot.position.set(0.64, G.ringMid * Math.cos(a), G.ringMid * Math.sin(a));
  rotor.add(slot);
}

const magnetGroup = new THREE.Group();
scene.add(magnetGroup);

const magBody = new THREE.Mesh(
  new THREE.CylinderGeometry(G.magR, G.magR, G.magThick, 64),
  new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.45, metalness: 0.5 })
);
magBody.rotation.z = Math.PI / 2;
magBody.position.x = G.magThick / 2;
magnetGroup.add(magBody);

const faceN = new THREE.Mesh(
  new THREE.CylinderGeometry(G.magR, G.magR, 0.02, 64),
  new THREE.MeshStandardMaterial({ color: 0x8a2f2f, roughness: 0.4, metalness: 0.4, emissive: 0x330a0a, emissiveIntensity: 0.7 })
);
faceN.rotation.z = Math.PI / 2;
faceN.position.x = -0.005;
magnetGroup.add(faceN);

const faceS = new THREE.Mesh(
  new THREE.CylinderGeometry(G.magR, G.magR, 0.02, 64),
  new THREE.MeshStandardMaterial({ color: 0x2f4d8a, roughness: 0.4, metalness: 0.4, emissive: 0x0a1233, emissiveIntensity: 0.7 })
);
faceS.rotation.z = Math.PI / 2;
faceS.position.x = G.magThick + 0.005;
magnetGroup.add(faceS);

const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 20), steelMat);
rod.rotation.z = Math.PI / 2;
rod.position.x = G.magThick + 1.1;
magnetGroup.add(rod);

function returnLoop(sign) {
  const pts = [
    new THREE.Vector3(0, sign * G.magR * 0.98, 0),
    new THREE.Vector3(0.1, sign * (G.magR + 0.45), 0),
    new THREE.Vector3(G.magThick + 0.1, sign * (G.magR + 0.5), 0),
    new THREE.Vector3(G.magThick + 0.35, sign * (G.magR + 0.28), 0),
    new THREE.Vector3(G.magThick, sign * G.magR * 0.98, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, 60, 0.012, 6, false),
    new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.35 })
  );
}
const loopA = returnLoop(1);
magnetGroup.add(loopA);
const loopB = returnLoop(-1);
magnetGroup.add(loopB);
const loopC = returnLoop(1);
loopC.rotation.x = Math.PI / 2;
magnetGroup.add(loopC);
const loopD = returnLoop(-1);
loopD.rotation.x = Math.PI / 2;
magnetGroup.add(loopD);

const nPoleLabel = textSprite("N", "#ff8080", 72);
nPoleLabel.position.set(-0.12, 0.78, 0);
magnetGroup.add(nPoleLabel);
const sPoleLabel = textSprite("S", "#7fa8ff", 72);
sPoleLabel.position.set(G.magThick + 0.12, -0.78, 0);
magnetGroup.add(sPoleLabel);

const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 12, 32), frameMat);
collar.rotation.y = Math.PI / 2;
collar.position.set(3.1, 0, 0);
scene.add(collar);

const standPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), frameMat);
standPost.position.set(3.1, -1.3, -1.0);
scene.add(standPost);
const standArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.05), frameMat);
standArm.position.set(3.1, -0.08, -0.5);
scene.add(standArm);
const standPlate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), frameMat);
standPlate.position.set(3.1, -2.5, -1.0);
scene.add(standPlate);

const fieldGroup = new THREE.Group();
scene.add(fieldGroup);

const THREADS = 6;
const THREAD_PTS = 6;
const threadMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.55 });
const threads = [];
for (let k = 0; k < THREADS; k++) {
  const a = (k * 2 * Math.PI) / THREADS;
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(THREAD_PTS * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const line = new THREE.Line(geo, threadMat);
  line.userData.angle = a;
  fieldGroup.add(line);
  threads.push(line);
}

function updateThreads(faceX) {
  for (let k = 0; k < threads.length; k++) {
    const line = threads[k];
    const a = line.userData.angle;
    const y = G.ringMid * Math.cos(a);
    const z = G.ringMid * Math.sin(a);
    const pos = line.geometry.attributes.position;
    for (let i = 0; i < THREAD_PTS; i++) {
      const u = i / (THREAD_PTS - 1);
      const x = faceX + 0.01 + (0.7 - (faceX + 0.01)) * u;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }
}

const eddyGroup = new THREE.Group();
scene.add(eddyGroup);

const eddyMat = new THREE.MeshBasicMaterial({
  color: 0xff8c3a,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
for (let k = 0; k < 5; k++) {
  const arc = new THREE.Mesh(new THREE.TorusGeometry(G.ringMid, 0.032, 8, 32, 1.15), eddyMat);
  arc.rotation.y = Math.PI / 2;
  arc.rotation.x = (k * 2 * Math.PI) / 5;
  arc.position.x = 0.745;
  eddyGroup.add(arc);
}

const eddyLight = new THREE.PointLight(0xff7a2a, 0, 12, 2);
eddyLight.position.set(1.0, 0.9, 0.5);
scene.add(eddyLight);

let gapLabel = null;
function updateGapLabel() {
  if (gapLabel) {
    scene.remove(gapLabel);
    gapLabel.material.map.dispose();
    gapLabel.material.dispose();
  }
  gapLabel = textSprite("gap " + physics.state.gapMm.toFixed(1) + " mm", "#7fd4ff", 48);
  scene.add(gapLabel);
}
updateGapLabel();

function smooth01(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}

function faceXNow() {
  const s = physics.state;
  const gapVis = s.gapMm * G.gapVisScale;
  return G.ringX1 + (G.parkOffset + (gapVis - G.parkOffset) * smooth01(s.magnetPos));
}

function animateSim() {
  const s = physics.state;

  rotor.rotation.x = s.theta;

  const fx = faceXNow();
  magnetGroup.position.x = fx;

  const gapVis = s.gapMm * G.gapVisScale;
  gapLabel.position.set(fx + gapVis / 2, 1.5, 0);

  updateThreads(fx);

  const heat = Math.max(0, Math.min(1, (s.temp - physics.T_AMBIENT) / 200));
  ringMat.emissiveIntensity = heat * 0.85;

  eddyMat.opacity = 0.05 + 0.9 * Math.min(1, s.eddyN);
  eddyLight.intensity = s.eddyN * 26 + heat * 10;
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(function () {
  const dt = Math.min(clock.getDelta(), 0.05);
  physics.advance(dt);
  physics.pushHistory();
  animateSim();
  ui.frame(physics.state);
  renderer.render(scene, camera);
});

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

ui.init({
  fieldGroup: fieldGroup,
  eddyGroup: eddyGroup,
  updateGapLabel: updateGapLabel,
});