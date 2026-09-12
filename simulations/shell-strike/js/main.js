"use strict";

const THREE = window.THREE;
const scenario = window.scenario;
if (!THREE || !scenario) throw new Error("Missing dependencies");
if (!THREE.GLTFLoader) throw new Error("Missing THREE.GLTFLoader");
if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

const HOW_X = scenario.HOW_X;
const PIVOT_H = scenario.PIVOT_H;
const BARREL_LEN = scenario.BARREL_LEN;
const ROAD_X = scenario.ROAD_X;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f16);
scene.fog = new THREE.Fog(0x0b0f16, 60, 160);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(-18, 13, 44);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById("app").appendChild(renderer.domElement);

const orbitTarget = new THREE.Vector3(-38, 2, 0);
const camOffset = camera.position.clone().sub(orbitTarget);
let orbitRadius = camOffset.length();
let orbitPhi = Math.acos(camOffset.y / orbitRadius);
let orbitTheta = Math.atan2(camOffset.z, camOffset.x);

function applyOrbit() {
  orbitPhi = Math.max(0.08, Math.min(Math.PI - 0.08, orbitPhi));
  orbitRadius = Math.max(3, Math.min(160, orbitRadius));
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

const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x26303a, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 1.5);
sun.position.set(-20, 30, 18);
scene.add(sun);
const fillLight = new THREE.DirectionalLight(0x8fb5ff, 0.45);
fillLight.position.set(30, 12, -25);
scene.add(fillLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(320, 200),
  new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const grid = new THREE.GridHelper(200, 50, 0x29405e, 0x16202e);
grid.position.y = 0.02;
scene.add(grid);

const roadMat = new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.9, metalness: 0 });
const road = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 130), roadMat);
road.position.set(ROAD_X, 0.04, 0);
scene.add(road);
const edgeMat = new THREE.MeshBasicMaterial({ color: 0x8a93a0 });
for (const ex of [ROAD_X - 2.0, ROAD_X + 2.0]) {
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 130), edgeMat);
  edge.position.set(ex, 0.05, 0);
  scene.add(edge);
}
const roadLabel = makeTextSprite("ROAD", "#8a93a0", 52);
roadLabel.position.set(ROAD_X, 0.6, -52);
scene.add(roadLabel);

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
  tx.encoding = THREE.sRGBEncoding;
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

function makeTextSprite(text, color, size) {
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
  tx.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })
  );
  const aspect = cv.width / cv.height;
  const scale = (size / 64) * 0.9;
  sp.scale.set(aspect * scale, scale, 1);
  return sp;
}

const armyMat = new THREE.MeshStandardMaterial({ color: 0x5a6b4a, roughness: 0.6, metalness: 0.3 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.5, metalness: 0.6 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x4b5320, roughness: 0.55, metalness: 0.25 });
const silverMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.28, metalness: 0.9 });

const howitzer = new THREE.Group();
howitzer.position.set(HOW_X, 0, 0);
scene.add(howitzer);

const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 0.25, 32), darkMetal);
platform.position.y = 0.12;
howitzer.add(platform);
for (const sz of [-1, 1]) {
  const trail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, 0.4), armyMat);
  trail.position.set(-3.2, 0.7, sz * 1.1);
  trail.rotation.y = sz * 0.28;
  howitzer.add(trail);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.45, 28), darkMetal);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(-0.6, 1.15, sz * 1.7);
  howitzer.add(wheel);
  const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 20), armyMat);
  hubcap.rotation.x = Math.PI / 2;
  hubcap.position.set(-0.6, 1.15, sz * 1.7);
  howitzer.add(hubcap);
}
const cradleBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.4), armyMat);
cradleBox.position.set(0, PIVOT_H, 0);
howitzer.add(cradleBox);

const barrelGroup = new THREE.Group();
barrelGroup.position.set(0, PIVOT_H, 0);
howitzer.add(barrelGroup);
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, BARREL_LEN, 24), armyMat);
barrel.rotation.z = -Math.PI / 2;
barrel.position.x = BARREL_LEN / 2;
barrelGroup.add(barrel);
const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 24), darkMetal);
muzzleBrake.rotation.z = -Math.PI / 2;
muzzleBrake.position.x = BARREL_LEN - 0.4;
barrelGroup.add(muzzleBrake);
const breech = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.9), darkMetal);
breech.position.x = -0.5;
barrelGroup.add(breech);
const muzzleTip = new THREE.Object3D();
muzzleTip.position.set(BARREL_LEN + 0.1, 0, 0);
barrelGroup.add(muzzleTip);
window.syncHowitzer = function () {
  barrelGroup.rotation.z = (scenario.state.angleDeg * Math.PI) / 180;
};
window.syncHowitzer();
const howLabel = makeTextSprite("HOWITZER", "#aac4e8", 48);
howLabel.position.set(HOW_X, 4.6, 0);
scene.add(howLabel);

const muzzleFlash = glowSprite("#ffd9a0", 3.2);
muzzleFlash.visible = false;
scene.add(muzzleFlash);
const muzzleLight = new THREE.PointLight(0xffd9a0, 0, 25, 2);
scene.add(muzzleLight);
let flashT = -10;
let recoil = 0;

const shellGroup = new THREE.Group();
scene.add(shellGroup);
const shellInner = new THREE.Group();
shellGroup.add(shellInner);
let shellModel = null;
let shellRestY = 0.35;
let noseNodes = [];
let noseSaved = [];
const noseGroup = new THREE.Group();
scene.add(noseGroup);
const noseSim = { active: false, ax: 0, ay: 0, az: 0, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, wx: 0, wy: 0 };
let noseReport = "";

function hasWingName(obj) {
  let o = obj;
  while (o) {
    if (o.name && /wing/i.test(o.name)) return true;
    o = o.parent;
  }
  return false;
}

function loadShell() {
  let bytes;
  try {
    const bin = Uint8Array.from(atob(window.SHELL_GLB_BASE64), function (c) {
      return c.charCodeAt(0);
    });
    bytes = bin.buffer;
  } catch (err) {
    return;
  }
  new THREE.GLTFLoader().parse(
    bytes,
    "",
    function (gltf) {
      shellModel = gltf.scene;
      const names = [];
      shellModel.traverse(function (o) {
        if (o.isMesh) {
          o.material = hasWingName(o) ? silverMat : greenMat;
          names.push(o.name);
          if (o.name && /nose|tip/i.test(o.name)) noseNodes.push(o);
        }
      });
      const bbox = new THREE.Box3().setFromObject(shellModel);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const longAxis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
      const noseRoots = [];
      shellModel.traverse(function (o) {
        if (o.name && /nose|tip/i.test(o.name)) noseRoots.push(o);
      });
      noseNodes = [];
      const noseBox = new THREE.Box3();
      const tb = new THREE.Box3();
      let haveBox = false;
      for (let ri = 0; ri < noseRoots.length; ri++) {
        const r = noseRoots[ri];
        r.traverse(function (o) {
          if (o.isMesh && noseNodes.indexOf(o) === -1) noseNodes.push(o);
        });
        tb.setFromObject(r);
        if (!haveBox) {
          noseBox.copy(tb);
          haveBox = true;
        } else noseBox.union(tb);
      }
      const nd = new THREE.Vector3(1, 0, 0);
      if (haveBox && !noseBox.isEmpty()) {
        noseBox.getCenter(nd);
        nd.sub(center);
        if (nd.lengthSq() < 1e-10) nd.set(1, 0, 0);
        else nd.normalize();
      }
      const axisVec = new THREE.Vector3(longAxis === 0 ? 1 : 0, longAxis === 1 ? 1 : 0, longAxis === 2 ? 1 : 0);
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(nd, new THREE.Vector3(1, 0, 0));
      const s = 2.2 / maxDim;
      const centerer = new THREE.Group();
      centerer.position.copy(center).negate().applyQuaternion(q);
      centerer.quaternion.copy(q);
      centerer.add(shellModel);
      shellInner.add(centerer);
      shellInner.scale.setScalar(s);
      shellRestY = (Math.min(size.x, size.y, size.z) * s) / 2 + 0.05;
      const allNames = [];
      shellModel.traverse(function (o) {
        allNames.push((o.isMesh ? "M:" : "N:") + o.name);
      });
      noseReport =
        "noseDir=" + nd.x.toFixed(2) + "," + nd.y.toFixed(2) + "," + nd.z.toFixed(2) +
        " longAxis=" + ["x", "y", "z"][longAxis] +
        " align=" + Math.abs(nd.dot(axisVec)).toFixed(2) +
        " roots=" + noseRoots.map(function (r) { return r.name; }).join("+") +
        " meshes=" + noseNodes.length +
        " all=[" + allNames.join("|") + "]";
      const calibEl = document.getElementById("calib-out");
      if (calibEl) calibEl.textContent = noseReport;
      poseShellIdle();
    },
    function (err) {}
  );
}

const X_AXIS = new THREE.Vector3(1, 0, 0);
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v1 = new THREE.Vector3();

function poseShellIdle() {
  barrelGroup.updateWorldMatrix(true, false);
  _v1.set(BARREL_LEN - 1.6, 0, 0).applyMatrix4(barrelGroup.matrixWorld);
  shellGroup.position.copy(_v1);
  barrelGroup.getWorldQuaternion(shellGroup.quaternion);
}

function detachNose() {
  if (!shellModel || noseNodes.length === 0) return;
  const anchor = new THREE.Vector3(shellGroup.position.x, shellGroup.position.y + 0.4, shellGroup.position.z);
  noseGroup.position.copy(anchor);
  noseGroup.rotation.set(0, 0, 0);
  noseSaved = [];
  for (let i = 0; i < noseNodes.length; i++) {
    const o = noseNodes[i];
    noseSaved.push({ obj: o, parent: o.parent, pos: o.position.clone(), quat: o.quaternion.clone(), scl: o.scale.clone() });
    noseGroup.attach(o);
  }
  const s = scenario.state.shell;
  noseSim.active = true;
  noseSim.ax = noseGroup.position.x;
  noseSim.ay = noseGroup.position.y;
  noseSim.az = noseGroup.position.z;
  noseSim.px = 0; noseSim.py = 0; noseSim.pz = 0;
  noseSim.vx = s.vx * 0.2 + (Math.random() - 0.5) * 2;
  noseSim.vy = Math.abs(s.vy) * 0.2 + 2.5;
  noseSim.vz = (Math.random() - 0.5) * 3;
  noseSim.rx = 0; noseSim.ry = 0;
  noseSim.wx = (Math.random() - 0.5) * 10;
  noseSim.wy = (Math.random() - 0.5) * 10;
}

function restoreNose() {
  for (let i = 0; i < noseSaved.length; i++) {
    const r = noseSaved[i];
    r.parent.add(r.obj);
    r.obj.position.copy(r.pos);
    r.obj.quaternion.copy(r.quat);
    r.obj.scale.copy(r.scl);
  }
  noseSaved = [];
  noseSim.active = false;
  noseGroup.position.set(0, 0, 0);
  noseGroup.rotation.set(0, 0, 0);
}

function updateNose(dt) {
  if (!noseSim.active) return;
  noseSim.vy -= 9.81 * dt;
  noseSim.px += noseSim.vx * dt;
  noseSim.py += noseSim.vy * dt;
  noseSim.pz += noseSim.vz * dt;
  noseSim.rx += noseSim.wx * dt;
  noseSim.ry += noseSim.wy * dt;
  if (noseSim.ay + noseSim.py < 0.25) {
    noseSim.py = 0.25 - noseSim.ay;
    noseSim.active = false;
    noseSim.vx = noseSim.vy = noseSim.vz = 0;
    noseSim.wx = noseSim.wy = 0;
  }
  noseGroup.position.set(noseSim.ax + noseSim.px, noseSim.ay + noseSim.py, noseSim.az + noseSim.pz);
  noseGroup.rotation.x = noseSim.rx;
  noseGroup.rotation.y = noseSim.ry;
}

const sensorGroup = new THREE.Group();
scene.add(sensorGroup);
let sensorsBuilt = false;
const puckMat = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.5, metalness: 0.6 });
const puckLedMat = new THREE.MeshStandardMaterial({ color: 0x4dd8ff, emissive: 0x4dd8ff, emissiveIntensity: 1.5 });
const pulseMat = new THREE.MeshBasicMaterial({
  color: 0x4dd8ff, transparent: true, opacity: 0.4,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
const pulseRings = [];
function buildSensors() {
  const list = scenario.state.sensors;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const puck = new THREE.Group();
    puck.position.set(p.x, 0.12, p.z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.22, 20), puckMat);
    puck.add(body);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), puckLedMat.clone());
    led.position.y = 0.16;
    puck.add(led);
    puck.userData.led = led;
    sensorGroup.add(puck);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 48), pulseMat.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.06, p.z);
    sensorGroup.add(ring);
    pulseRings.push({ mesh: ring, off: (i / list.length) * 3 });
  }
  const zone = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1.0, 64),
    new THREE.MeshBasicMaterial({ color: 0xff5a50, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(scenario.state.impact.x, 0.05, scenario.state.impact.z);
  sensorGroup.add(zone);
  sensorGroup.userData.zone = zone;
  sensorsBuilt = true;
}

function clearSensors() {
  while (sensorGroup.children.length > 0) {
    const c = sensorGroup.children.pop();
    sensorGroup.remove(c);
  }
  pulseRings.length = 0;
  sensorsBuilt = false;
}

const truck = new THREE.Group();
scene.add(truck);
const truckMats = [];
function truckMat(color) {
  const m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.3 });
  truckMats.push({ mat: m, base: color });
  return m;
}
const tGreen = truckMat(0x5a6b4a);
const tDark = truckMat(0x2b3038);
const tGlass = truckMat(0x10151c);
(function buildTruck() {
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 4.4), tDark);
  chassis.position.y = 0.85;
  truck.add(chassis);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 2.4), tGreen);
  bed.position.set(0, 1.5, -0.8);
  truck.add(bed);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 1.4), tGreen);
  cab.position.set(0, 1.65, 1.3);
  truck.add(cab);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.1), tGlass);
  shield.position.set(0, 1.8, 2.02);
  truck.add(shield);
})();
const wheels = [];
(function buildWheels() {
  const wg = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 20);
  for (const sx of [-0.95, 0.95]) {
    for (const sz of [-1.4, 0.1, 1.5]) {
      const w = new THREE.Mesh(wg, tDark);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx, 0.45, sz);
      truck.add(w);
      wheels.push(w);
    }
  }
})();
const truckFire = glowSprite("#ff8c3a", 1.6);
truckFire.position.set(0, 2.2, 1.3);
truckFire.visible = false;
truck.add(truckFire);
truck.position.set(ROAD_X, 0, -48);
truck.visible = false;

const boomLight = new THREE.PointLight(0xffe0b0, 0, 60, 2);
scene.add(boomLight);
const explosion = { active: false, t: 0, fire: [], smoke: [], debris: [], ring: null, scorch: null };
const dustPuffs = [];

function spawnDust(x, y, z, n, color) {
  for (let i = 0; i < n; i++) {
    const sp = glowSprite(color || "#8a7f6a", 1.2 + Math.random());
    sp.position.set(x + (Math.random() - 0.5) * 1.5, y + Math.random() * 0.5, z + (Math.random() - 0.5) * 1.5);
    sp.material.opacity = 0.55;
    scene.add(sp);
    dustPuffs.push({ sp: sp, life: 0, max: 1.2 + Math.random() * 0.8 });
  }
}

function explode(x, y, z) {
  explosion.active = true;
  explosion.t = 0;
  boomLight.position.set(x, y + 1.5, z);
  for (let i = 0; i < 8; i++) {
    const sp = glowSprite(i % 2 ? "#ff5a2a" : "#ffd9a0", 2 + Math.random() * 2);
    sp.position.set(x, y + 0.5, z);
    scene.add(sp);
    explosion.fire.push({
      sp: sp,
      vx: (Math.random() - 0.5) * 6,
      vy: 3 + Math.random() * 5,
      vz: (Math.random() - 0.5) * 6,
      life: 0,
      max: 1.0 + Math.random() * 0.5,
    });
  }
  for (let i = 0; i < 12; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#555555", "#999999"),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    sp.position.set(x, y + 1, z);
    sp.scale.setScalar(2 + Math.random() * 2);
    scene.add(sp);
    explosion.smoke.push({
      sp: sp,
      vx: (Math.random() - 0.5) * 2,
      vy: 1.5 + Math.random() * 2,
      vz: (Math.random() - 0.5) * 2,
      life: 0,
      max: 3 + Math.random() * 2,
    });
  }
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.15 + Math.random() * 0.2, 0.15 + Math.random() * 0.2, 0.15 + Math.random() * 0.2),
      new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.7, metalness: 0.4, transparent: true })
    );
    m.position.set(x, y + 0.5, z);
    scene.add(m);
    explosion.debris.push({
      m: m,
      vx: (Math.random() - 0.5) * 16,
      vy: 5 + Math.random() * 10,
      vz: (Math.random() - 0.5) * 16,
      rx: (Math.random() - 0.5) * 12,
      rz: (Math.random() - 0.5) * 12,
      life: 0,
      max: 2.5 + Math.random(),
    });
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.0, 64),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.15, z);
  scene.add(ring);
  explosion.ring = { m: ring, life: 0 };
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(4, 32),
    new THREE.MeshBasicMaterial({ color: 0x090909, transparent: true, opacity: 0 })
  );
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.set(x, 0.03, z);
  scene.add(scorch);
  explosion.scorch = scorch;
}

function updateExplosion(dt) {
  if (!explosion.active) return;
  explosion.t += dt;
  boomLight.intensity = Math.max(0, 300 * (1 - explosion.t / 0.5));
  let alive = false;
  for (const f of explosion.fire) {
    f.life += dt;
    if (f.life < f.max) {
      alive = true;
      f.sp.position.x += f.vx * dt;
      f.sp.position.y += f.vy * dt;
      f.sp.position.z += f.vz * dt;
      f.sp.scale.setScalar(f.sp.scale.x + dt * 5);
      f.sp.material.opacity = 1 - f.life / f.max;
    } else f.sp.visible = false;
  }
  for (const s of explosion.smoke) {
    s.life += dt;
    if (s.life < s.max) {
      alive = true;
      s.sp.position.x += s.vx * dt;
      s.sp.position.y += s.vy * dt;
      s.sp.position.z += s.vz * dt;
      s.sp.scale.setScalar(s.sp.scale.x + dt * 1.5);
      s.sp.material.opacity = 0.5 * (1 - s.life / s.max);
    } else s.sp.visible = false;
  }
  for (const d of explosion.debris) {
    d.life += dt;
    if (d.life < d.max) {
      alive = true;
      d.vy -= 9.81 * dt;
      d.m.position.x += d.vx * dt;
      d.m.position.y += d.vy * dt;
      d.m.position.z += d.vz * dt;
      d.m.rotation.x += d.rx * dt;
      d.m.rotation.z += d.rz * dt;
      if (d.m.position.y < 0.1) {
        d.m.position.y = 0.1;
        d.vy *= -0.35;
        d.vx *= 0.6;
        d.vz *= 0.6;
      }
      d.m.material.opacity = 1 - d.life / d.max;
    } else d.m.visible = false;
  }
  if (explosion.ring) {
    const r = explosion.ring;
    r.life += dt;
    const k = r.life / 0.9;
    if (k < 1) {
      alive = true;
      r.m.scale.setScalar(1 + k * 20);
      r.m.material.opacity = 0.8 * (1 - k);
    } else r.m.visible = false;
  }
  if (explosion.scorch) explosion.scorch.material.opacity = Math.min(0.85, explosion.scorch.material.opacity + dt * 1.2);
  if (!alive && explosion.t > 6) explosion.active = false;
}

function updateDust(dt) {
  for (let i = dustPuffs.length - 1; i >= 0; i--) {
    const d = dustPuffs[i];
    d.life += dt;
    if (d.life >= d.max) {
      scene.remove(d.sp);
      d.sp.material.map.dispose();
      d.sp.material.dispose();
      dustPuffs.splice(i, 1);
    } else {
      d.sp.scale.setScalar(d.sp.scale.x + dt * 2.2);
      d.sp.material.opacity = 0.55 * (1 - d.life / d.max);
    }
  }
}

let shake = 0;
let truckBurnT = 0;

function destroyTruck() {
  truck.rotation.z = 0.12;
  for (const t of truckMats) t.mat.color.setHex(0x1e2126);
  truckFire.visible = true;
}

function restoreTruck() {
  truck.rotation.z = 0;
  for (const t of truckMats) t.mat.color.setHex(t.base);
  truckFire.visible = false;
  truck.visible = false;
  truck.position.set(ROAD_X, 0, -48);
  truckBurnT = 0;
}

let eventIdx = 0;
function consumeEvents() {
  const evs = scenario.state.events;
  while (eventIdx < evs.length) {
    const e = evs[eventIdx++];
    if (e.type === "fired") {
      muzzleTip.getWorldPosition(_v1);
      muzzleFlash.position.copy(_v1);
      muzzleLight.position.copy(_v1);
      muzzleFlash.visible = true;
      muzzleFlash.scale.setScalar(3.2);
      flashT = 0;
      recoil = 0.9;
      window.audio.fire();
      spawnDust(_v1.x - 1, 1.2, _v1.z, 4, "#6a6a6a");
    } else if (e.type === "impact") {
      const im = scenario.state.impact;
      spawnDust(im.x, 0.4, im.z, 8);
      window.audio.thud();
      detachNose();
      shake = Math.max(shake, 0.25);
    } else if (e.type === "detected") {
      window.audio.alarm();
      for (const c of sensorGroup.children) {
        if (c.userData && c.userData.led) {
          c.userData.led.material.emissive.setHex(0xff2222);
          c.userData.led.material.color.setHex(0xff2222);
        }
      }
      for (const p of pulseRings) p.mesh.material.color.setHex(0xff5a50);
    } else if (e.type === "boom") {
      const s = scenario.state.shell;
      explode(s.x, Math.max(0.6, s.y), s.z);
      window.audio.boom();
      destroyTruck();
      shake = 1.0;
    }
  }
}

window.resetVisuals = function () {
  restoreNose();
  clearSensors();
  restoreTruck();
  recoil = 0;
  flashT = -10;
  muzzleFlash.visible = false;
  muzzleLight.intensity = 0;
  shake = 0;
  eventIdx = 0;
  for (const f of explosion.fire) scene.remove(f.sp);
  for (const s of explosion.smoke) scene.remove(s.sp);
  for (const d of explosion.debris) scene.remove(d.m);
  if (explosion.ring) scene.remove(explosion.ring.m);
  if (explosion.scorch) scene.remove(explosion.scorch);
  explosion.active = false;
  explosion.t = 0;
  explosion.fire = [];
  explosion.smoke = [];
  explosion.debris = [];
  explosion.ring = null;
  explosion.scorch = null;
  for (let i = dustPuffs.length - 1; i >= 0; i--) scene.remove(dustPuffs[i].sp);
  dustPuffs.length = 0;
  boomLight.intensity = 0;
  poseShellIdle();
};

const _restQ = new THREE.Quaternion();
_restQ.setFromEuler(new THREE.Euler(0, 0, -0.12));

function animateShell(dt) {
  const s = scenario.state;
  if (s.phase === "IDLE") {
    poseShellIdle();
  } else if (s.phase === "FLIGHT") {
    shellGroup.position.set(s.shell.x, s.shell.y, s.shell.z);
    _v1.set(s.shell.vx, s.shell.vy, s.shell.vz).normalize();
    _q1.setFromUnitVectors(X_AXIS, _v1);
    _q2.setFromAxisAngle(X_AXIS, s.shell.spin);
    shellGroup.quaternion.copy(_q1).multiply(_q2);
  } else if (s.phase === "SETTLE") {
    shellGroup.position.y += (shellRestY - shellGroup.position.y) * Math.min(1, 5 * dt);
    shellGroup.quaternion.slerp(_restQ, Math.min(1, 4 * dt));
    shellGroup.position.x = s.shell.x;
    shellGroup.position.z = s.shell.z;
  }
}

const clock = new THREE.Clock();
const focusPt = new THREE.Vector3();
renderer.setAnimationLoop(function () {
  const dt = Math.min(clock.getDelta(), 0.05);
  scenario.advance(dt);
  consumeEvents();
  updateNose(dt);

  const s = scenario.state;

  if (flashT < 1) {
    flashT += dt;
    const k = Math.min(1, flashT / 0.22);
    muzzleFlash.material.opacity = 1 - k;
    muzzleFlash.scale.setScalar(3.2 + k * 2);
    muzzleLight.intensity = 60 * (1 - k);
    if (k >= 1) muzzleFlash.visible = false;
  }
  if (recoil > 0) {
    recoil = Math.max(0, recoil - dt * 1.4);
    barrelGroup.position.x = -recoil;
  }

  animateShell(dt);

  if (sensorsBuilt) {
    const t = s.time;
    for (let i = 0; i < pulseRings.length; i++) {
      const p = pulseRings[i];
      const ph = (t * 1.2 + p.off) % 3;
      p.mesh.scale.setScalar(0.5 + ph);
      p.mesh.material.opacity = 0.4 * (1 - ph / 3);
    }
    const zone = sensorGroup.userData.zone;
    if (zone) {
      zone.scale.setScalar(s.sensorRadius);
      zone.material.opacity = 0.16 + 0.08 * Math.sin(t * 3);
    }
  } else if (s.sensors.length > 0) {
    buildSensors();
  }

  const v = s.vehicle;
  truck.visible = v.active;
  if (v.active && !v.destroyed) {
    truck.position.set(ROAD_X, 0, v.z);
    for (const w of wheels) w.rotation.x += (7 / 0.45) * dt;
  }
  if (v.destroyed) {
    truckBurnT += dt;
    truckFire.material.opacity = Math.max(0.25, 0.8 - truckBurnT * 0.05);
    truckFire.scale.setScalar(1.6 + 0.3 * Math.sin(truckBurnT * 9));
    if (Math.random() < dt * 6) spawnDust(truck.position.x, 2.2, truck.position.z, 1, "#3a3a3a");
  }

  updateExplosion(dt);
  updateDust(dt);

  if (window.ui.isFollowCam()) {
    if (s.phase === "FLIGHT") focusPt.set(s.shell.x, s.shell.y, s.shell.z);
    else if (s.phase === "IDLE") focusPt.set(-38, 2, 0);
    else if (s.impact) focusPt.set(s.impact.x, 1, s.impact.z);
    orbitTarget.lerp(focusPt, 1 - Math.exp(-3 * dt));
    applyOrbit();
  }

  if (shake > 0.003) {
    camera.position.x += (Math.random() - 0.5) * 0.7 * shake;
    camera.position.y += (Math.random() - 0.5) * 0.7 * shake;
    camera.position.z += (Math.random() - 0.5) * 0.7 * shake;
    renderer.render(scene, camera);
    camera.position.x -= (Math.random() - 0.5) * 0.7 * shake;
    camera.position.y -= (Math.random() - 0.5) * 0.7 * shake;
    camera.position.z -= (Math.random() - 0.5) * 0.7 * shake;
    shake *= Math.exp(-2.2 * dt);
  } else {
    renderer.render(scene, camera);
  }

  window.ui.frame(s);
});

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loadShell();
window.ui.init();
