"use strict";

const THREE = window.THREE;
if (!THREE) throw new Error("Missing three.js");
if (!THREE.GLTFLoader) throw new Error("Missing THREE.GLTFLoader");
if (!window.SHELL_GLB_BASE64) throw new Error("Missing embedded model data");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f16);
scene.fog = new THREE.Fog(0x0b0f16, 26, 70);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
const HOME_POS = new THREE.Vector3(3.4, 1.9, 4.4);
const HOME_TGT = new THREE.Vector3(0, 0.1, 0);
camera.position.copy(HOME_POS);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById("app").appendChild(renderer.domElement);

const orbitTarget = HOME_TGT.clone();
const camOffset = camera.position.clone().sub(orbitTarget);
let orbitRadius = camOffset.length();
let orbitPhi = Math.acos(camOffset.y / orbitRadius);
let orbitTheta = Math.atan2(camOffset.z, camOffset.x);

function applyOrbit() {
  orbitPhi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitPhi));
  orbitRadius = Math.max(1.2, Math.min(42, orbitRadius));
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

const hemi = new THREE.HemisphereLight(0xd8e4ff, 0x26303a, 1.1);
scene.add(hemi);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(5, 8, 4);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8fb5ff, 0.55);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xfff2d0, 0.7);
rimLight.position.set(-2, 4, 7);
scene.add(rimLight);

const grid = new THREE.GridHelper(20, 20, 0x29405e, 0x16202e);
grid.position.y = -1.9;
scene.add(grid);

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
  tx.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })
  );
  const aspect = cv.width / cv.height;
  const scale = (size / 64) * 0.55;
  sp.scale.set(aspect * scale, scale, 1);
  return sp;
}

const greenMat = new THREE.MeshStandardMaterial({
  color: 0x4b5320, roughness: 0.55, metalness: 0.25,
});
const silverMat = new THREE.MeshStandardMaterial({
  color: 0xc8ccd2, roughness: 0.28, metalness: 0.9,
});

const turnGroup = new THREE.Group();
scene.add(turnGroup);
const labelGroup = new THREE.Group();
turnGroup.add(labelGroup);

let turntableOn = true;
let meshCount = 0;

function hasWingName(obj) {
  let o = obj;
  while (o) {
    if (o.name && /wing/i.test(o.name)) return true;
    o = o.parent;
  }
  return false;
}

function findByName(root, pattern) {
  let found = null;
  root.traverse(function (o) {
    if (!found && o.name && pattern.test(o.name)) found = o;
  });
  return found;
}

function addLabel(text, target, below, color) {
  if (!target) return;
  const box = new THREE.Box3().setFromObject(target);
  if (box.isEmpty()) return;
  const c = new THREE.Vector3();
  box.getCenter(c);
  const lp = turnGroup.worldToLocal(c.clone());
  const half = (box.max.y - box.min.y) / 2;
  const sp = textSprite(text, color || "#dce6f5", 56);
  sp.position.set(lp.x, lp.y + (below ? -(half + 0.3) : half + 0.3), lp.z);
  labelGroup.add(sp);
}

function loadModel() {
  const note = document.getElementById("load-note");
  let bytes;
  try {
    const bin = Uint8Array.from(atob(window.SHELL_GLB_BASE64), function (c) {
      return c.charCodeAt(0);
    });
    bytes = bin.buffer;
  } catch (err) {
    note.textContent = "Failed to decode embedded model.";
    return;
  }
  new THREE.GLTFLoader().parse(
    bytes,
    "",
    function (gltf) {
      const model = gltf.scene;
      model.traverse(function (o) {
        if (o.isMesh) {
          o.material = hasWingName(o) ? silverMat : greenMat;
          meshCount++;
        }
      });
      const bbox = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const s = 3.2 / maxDim;
      model.scale.setScalar(s);
      model.position.sub(center.clone().multiplyScalar(s));
      turnGroup.add(model);
      turnGroup.updateMatrixWorld(true);

      const minY = (bbox.min.y - center.y) * s;
      grid.position.y = minY - 0.25;

      addLabel("TIP", findByName(model, /tip/i), false, "#ffd94a");
      addLabel("NOSE", findByName(model, /nose/i), false, "#dce6f5");
      addLabel("BODY", findByName(model, /^body$/i), false, "#dce6f5");
      addLabel("WINGS", findByName(model, /wing/i), false, "#7fd4ff");
      addLabel("BASE RING", findByName(model, /base_ring/i), true, "#dce6f5");

      note.textContent = "Model loaded: " + meshCount + " meshes, military-green hull, silver wings.";
    },
    function (err) {
      note.textContent = "Failed to parse model.";
    }
  );
}

document.getElementById("chk-turn").addEventListener("change", function (e) {
  turntableOn = e.target.checked;
});
document.getElementById("chk-labels").addEventListener("change", function (e) {
  labelGroup.visible = e.target.checked;
});
document.getElementById("btn-reset").addEventListener("click", function () {
  camera.position.copy(HOME_POS);
  orbitTarget.copy(HOME_TGT);
  const off = camera.position.clone().sub(orbitTarget);
  orbitRadius = off.length();
  orbitPhi = Math.acos(off.y / orbitRadius);
  orbitTheta = Math.atan2(off.z, off.x);
  applyOrbit();
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(function () {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (turntableOn) turnGroup.rotation.y += dt * 0.5;
  renderer.render(scene, camera);
});

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loadModel();