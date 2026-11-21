import * as THREE from "three";

const viewport = document.querySelector("#viewport");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05030e);
scene.fog = new THREE.Fog(0x05030e, 8, 22);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(4.1, 2.9, 5.2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
viewport.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9cecff, 0x170b2e, 2.2));

const keyLight = new THREE.DirectionalLight(0x8df8ff, 3.2);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xff3bd4, 1.8);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);

const device = new THREE.Group();
const droneBodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x25213d,
  metalness: 0.62,
  roughness: 0.32,
});
const droneDarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x0b0a18,
  metalness: 0.38,
  roughness: 0.48,
});
const droneGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0x47f4ff,
  emissive: 0x087e99,
  emissiveIntensity: 1.8,
  metalness: 0.2,
  roughness: 0.25,
});
const bladeMaterial = new THREE.MeshStandardMaterial({
  color: 0xff4edb,
  emissive: 0x7d0c72,
  emissiveIntensity: 1.5,
  metalness: 0.12,
  roughness: 0.3,
});
const armamentMaterial = new THREE.MeshStandardMaterial({
  color: 0xe7b44c,
  emissive: 0x5f260d,
  emissiveIntensity: 0.45,
  metalness: 0.72,
  roughness: 0.24,
});
const weaponGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0xff765c,
  emissive: 0xc32631,
  emissiveIntensity: 1.4,
});

const body = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.95, 0.34, 6),
  droneBodyMaterial,
);
body.rotation.y = Math.PI / 6;
body.position.y = 0.12;
body.castShadow = true;
body.receiveShadow = true;
device.add(body);

const topShell = new THREE.Mesh(
  new THREE.SphereGeometry(0.58, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2),
  droneDarkMaterial,
);
topShell.scale.y = 0.42;
topShell.position.y = 0.3;
device.add(topShell);

const cockpit = new THREE.Mesh(
  new THREE.BoxGeometry(0.34, 0.16, 0.52),
  droneGlowMaterial,
);
cockpit.rotation.y = Math.PI / 2;
cockpit.position.set(0.48, 0.3, 0);
cockpit.scale.z = 0.72;
device.add(cockpit);

const tailFin = new THREE.Mesh(
  new THREE.BoxGeometry(0.58, 0.42, 0.12),
  droneBodyMaterial,
);
tailFin.position.set(-0.42, 0.36, 0);
tailFin.rotation.z = -0.2;
device.add(tailFin);

const frontNose = new THREE.Mesh(
  new THREE.BoxGeometry(0.42, 0.2, 0.68),
  droneBodyMaterial,
);
frontNose.rotation.y = Math.PI / 2;
frontNose.position.set(0.56, 0.16, 0);
frontNose.scale.z = 0.72;
device.add(frontNose);

const frontCheekMaterial = new THREE.MeshStandardMaterial({
  color: 0x17132b,
  metalness: 0.68,
  roughness: 0.3,
});
for (const side of [-1, 1]) {
  const cheek = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.18, 0.24),
    frontCheekMaterial,
  );
  cheek.position.set(0.56, 0.13, side * 0.42);
  cheek.rotation.y = side * 0.22;
  cheek.castShadow = true;
  device.add(cheek);
}

const frontChevronMaterial = new THREE.MeshStandardMaterial({
  color: 0x47f4ff,
  emissive: 0x00bcd4,
  emissiveIntensity: 2.2,
  metalness: 0.15,
  roughness: 0.24,
});
const frontChevron = new THREE.Group();
frontChevron.position.set(0.67, 0.49, 0);
for (const side of [-1, 1]) {
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.035, 0.055),
    frontChevronMaterial,
  );
  marker.rotation.y = side * 0.62;
  frontChevron.add(marker);
}
device.add(frontChevron);

const rearMarkerMaterial = new THREE.MeshStandardMaterial({
  color: 0xff3bd4,
  emissive: 0xb0008c,
  emissiveIntensity: 2.3,
  metalness: 0.15,
  roughness: 0.24,
});
const rearMarker = new THREE.Mesh(
  new THREE.BoxGeometry(0.08, 0.055, 0.72),
  rearMarkerMaterial,
);
rearMarker.position.set(-0.72, 0.48, 0);
device.add(rearMarker);

const rearWing = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.08, 0.9),
  droneDarkMaterial,
);
rearWing.position.set(-0.56, 0.3, 0);
device.add(rearWing);

const morseAlphabet = {
  J: ".---",
  O: "---",
  Y: "-.--",
  D: "-..",
  I: "..",
  P: ".--",
};
const morseUnitSeconds = 0.14;
const morseTimeline = [];

"JOYDIP".split("").forEach((letter, letterIndex) => {
  morseAlphabet[letter].split("").forEach((symbol, symbolIndex, symbols) => {
    morseTimeline.push({
      on: true,
      duration: symbol === "." ? morseUnitSeconds : morseUnitSeconds * 3,
    });
    if (symbolIndex < symbols.length - 1) {
      morseTimeline.push({ on: false, duration: morseUnitSeconds });
    }
  });
  if (letterIndex < "JOYDIP".length - 1) {
    morseTimeline.push({ on: false, duration: morseUnitSeconds * 3 });
  }
});

const morseCycleDuration = morseTimeline.reduce(
  (total, segment) => total + segment.duration,
  0,
);
let morseTimelineIndex = 0;
let morseSegmentStart = 0;

function updateTailLight(timeSeconds) {
  const cycleTime = timeSeconds % morseCycleDuration;
  if (cycleTime < morseSegmentStart) {
    morseTimelineIndex = 0;
    morseSegmentStart = 0;
  }

  while (
    cycleTime >=
    morseSegmentStart + morseTimeline[morseTimelineIndex].duration
  ) {
    morseSegmentStart += morseTimeline[morseTimelineIndex].duration;
    morseTimelineIndex =
      (morseTimelineIndex + 1) % morseTimeline.length;
  }

  const isOn = morseTimeline[morseTimelineIndex].on;
  rearMarkerMaterial.emissiveIntensity = isOn ? 2.3 : 0.12;
  rearMarkerMaterial.color.setHex(isOn ? 0xff3bd4 : 0x3b123b);
}

const bladeRotors = [];
const rotorPositions = [
  [0.98, 0.98, 1],
  [0.98, -0.98, -1],
  [-0.98, 0.98, -1],
  [-0.98, -0.98, 1],
];

function addRotor(x, z, direction) {
  const rodLength = Math.hypot(x, z);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 1.25, 10),
    armamentMaterial,
  );
  rod.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(x, 0, z).normalize(),
  );
  rod.position.set(x / 2, 0.14, z / 2);
  rod.scale.y = rodLength / 1.25;
  device.add(rod);

  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.18, 0.24, 12),
    droneDarkMaterial,
  );
  motor.position.set(x, 0.25, z);
  device.add(motor);

  const motorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.035, 8, 18),
    droneGlowMaterial,
  );
  motorRing.rotation.x = Math.PI / 2;
  motorRing.position.set(x, 0.39, z);
  device.add(motorRing);

  const rotor = new THREE.Group();
  rotor.position.set(x, 0.43, z);
  for (let bladeIndex = 0; bladeIndex < 2; bladeIndex += 1) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.025, 0.1),
      bladeMaterial,
    );
    blade.rotation.y = bladeIndex * Math.PI / 2;
    blade.scale.x = bladeIndex === 0 ? 1 : direction;
    rotor.add(blade);
  }
  device.add(rotor);
  bladeRotors.push({ rotor, direction });
}

rotorPositions.forEach(([x, z, direction]) => addRotor(x, z, direction));

function addWeaponPod(x, z) {
  const pod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.62, 8),
    armamentMaterial,
  );
  pod.rotation.z = Math.PI / 2;
  pod.position.set(x, -0.08, z);
  device.add(pod);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.2, 8),
    weaponGlowMaterial,
  );
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(x + 0.4, -0.08, z);
  device.add(nose);
}

addWeaponPod(0.24, 0.36);
addWeaponPod(0.24, -0.36);

const sensorEye = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 12, 8),
  weaponGlowMaterial,
);
sensorEye.position.set(0.68, 0.19, 0);
device.add(sensorEye);

const navigationLight = new THREE.PointLight(0xff3bd4, 1.8, 3);
navigationLight.position.set(-0.5, 0.35, 0);
device.add(navigationLight);

const droneScale = 1.18;
device.scale.setScalar(droneScale);
scene.add(device);
const ambientGrid = new THREE.GridHelper(18, 30, 0xff3bd4, 0x25135f);
ambientGrid.position.set(0, -1.15, 0);
ambientGrid.material.transparent = true;
ambientGrid.material.opacity = 0.28;
ambientGrid.material.depthWrite = false;
scene.add(ambientGrid);

const horizonGrid = new THREE.GridHelper(14, 12, 0x47f4ff, 0x101d4f);
horizonGrid.rotation.x = Math.PI / 2;
horizonGrid.position.set(0, 1.5, -5.5);
horizonGrid.material.transparent = true;
horizonGrid.material.opacity = 0.16;
horizonGrid.material.depthWrite = false;
scene.add(horizonGrid);

const targetingRingMaterials = [
  new THREE.MeshBasicMaterial({
    color: 0x47f4ff,
    transparent: true,
    opacity: 0.22,
  }),
  new THREE.MeshBasicMaterial({
    color: 0xff3bd4,
    transparent: true,
    opacity: 0.18,
  }),
  new THREE.MeshBasicMaterial({
    color: 0x8d5cff,
    transparent: true,
    opacity: 0.14,
  }),
];
[
  [2.5, targetingRingMaterials[0]],
  [3.7, targetingRingMaterials[1]],
  [5.1, targetingRingMaterials[2]],
].forEach(([radius, material]) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.012, 4, 48),
    material,
  );
  ring.position.set(0, 0.8, -5.35);
  scene.add(ring);
});

const ambientSpotGeometry = new THREE.PlaneGeometry(0.16, 0.16);
const ambientSpots = [];

function resetAmbientSpot(spot, initial = false) {
  spot.duration = 1.6 + Math.random() * 2.6;
  spot.age = initial ? Math.random() * spot.duration : 0;
  spot.mesh.position.set(
    -5.4 + Math.random() * 10.8,
    -3.1 + Math.random() * 6.2,
    -2.2,
  );
}

for (let index = 0; index < 14; index += 1) {
  const spot = new THREE.Mesh(
    ambientSpotGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x47f4ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const state = { mesh: spot, age: 0, duration: 2 };
  resetAmbientSpot(state, true);
  ambientSpots.push(state);
  scene.add(spot);
}

const orientationStatus = document.querySelector("#orientation-status");
const orientationButtons = document.querySelectorAll("[data-orientation]");
const connectionForm = document.querySelector("#connection-form");
const esp32HostInput = document.querySelector("#esp32-host");
const connectionState = document.querySelector("#connection-state");
const connectionToggle = document.querySelector("#connection-toggle");
const connectionPanel = document.querySelector("#connection-panel");
const quaternionReadout = document.querySelector("#quaternion-readout");
const recenterButton = document.querySelector("#recenter-button");
const musicToggle = document.querySelector("#music-toggle");
const backgroundMusic = document.querySelector("#background-music");
const queryHost = new URLSearchParams(window.location.search).get("esp32");
let socket;
let reconnectTimer;
let latestQuaternion = { w: 1, x: 0, y: 0, z: 0 };
const liveThreeQuaternion = new THREE.Quaternion();
const referenceQuaternion = new THREE.Quaternion();
const relativeQuaternion = new THREE.Quaternion();
const renderedQuaternion = new THREE.Quaternion();
let liveMode = false;
const LIVE_SMOOTHING = 0.18;

function setMusicState(isPlaying) {
  musicToggle.classList.toggle("is-playing", isPlaying);
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggle.setAttribute(
    "aria-label",
    isPlaying ? "Pause background music" : "Play background music",
  );
}

musicToggle.addEventListener("click", async () => {
  if (backgroundMusic.paused) {
    try {
      await backgroundMusic.play();
      setMusicState(true);
    } catch {
      setMusicState(false);
    }
  } else {
    backgroundMusic.pause();
    setMusicState(false);
  }
});

backgroundMusic.addEventListener("pause", () => setMusicState(false));
backgroundMusic.addEventListener("play", () => setMusicState(true));
setMusicState(false);
backgroundMusic
  .play()
  .then(() => setMusicState(true))
  .catch(() => setMusicState(false));

const sensorToThreeFrame = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  Math.PI / 2,
);
const threeToSensorFrame = sensorToThreeFrame.clone().invert();
const threeDirectionCorrection = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  Math.PI,
);
const inverseDirectionCorrection = threeDirectionCorrection.clone().invert();
const sensorQuaternionScratch = new THREE.Quaternion();

function mapSensorQuaternionToThreeQuaternion({ w, x, y, z }, target) {
  sensorQuaternionScratch.set(x, y, z, w).normalize();
  target
    .copy(sensorToThreeFrame)
    .multiply(sensorQuaternionScratch)
    .multiply(threeToSensorFrame)
    .premultiply(threeDirectionCorrection)
    .multiply(inverseDirectionCorrection)
    .normalize();
}

function createTestQuaternion(axis, angle) {
  const axisVector = new THREE.Vector3(...axis);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(axisVector, angle);
  return { w: quaternion.w, x: quaternion.x, y: quaternion.y, z: quaternion.z };
}

const testOrientations = {
  identity: { w: 1, x: 0, y: 0, z: 0 },
  x: createTestQuaternion([1, 0, 0], Math.PI / 2),
  y: createTestQuaternion([0, 1, 0], Math.PI / 2),
  z: createTestQuaternion([0, 0, 1], Math.PI / 2),
};

function applyOrientation(orientation, label) {
  device.quaternion.set(
    orientation.x,
    orientation.y,
    orientation.z,
    orientation.w,
  );
  device.quaternion.normalize();
  orientationButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.orientation === label),
    );
  });
  orientationStatus.value =
    label === "identity" ? "Identity" : `${label.toUpperCase()} +90°`;
}

function selectOrientation(label) {
  liveMode = false;
  applyOrientation(testOrientations[label], label);
}

function selectLiveOrientation() {
  liveMode = true;
  orientationButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.orientation === "live"),
    );
  });
  orientationStatus.value = "Live ESP32";
}

function updateRelativeOrientation() {
  relativeQuaternion.copy(referenceQuaternion).invert();
  relativeQuaternion.multiply(liveThreeQuaternion).normalize();
}

function recenterOrientation() {
  if (!liveMode) {
    return;
  }

  mapSensorQuaternionToThreeQuaternion(latestQuaternion, referenceQuaternion);
  updateRelativeOrientation();
}

function setConnectionState(state) {
  connectionState.dataset.state = state;
  connectionState.textContent = `WebSocket: ${state.toUpperCase()}`;
  connectionToggle.dataset.state = state;
  if (state === "connected") {
    setConnectionPanelVisible(false);
  } else {
    setConnectionPanelVisible(true);
  }
}

function setConnectionPanelVisible(visible) {
  connectionPanel.classList.toggle("is-hidden", !visible);
  connectionToggle.setAttribute("aria-expanded", String(visible));
}

function updateQuaternionReadout() {
  const { w, x, y, z } = latestQuaternion;
  quaternionReadout.textContent = `W: ${w.toFixed(6)} | X: ${x.toFixed(6)} | Y: ${y.toFixed(6)} | Z: ${z.toFixed(6)}`;
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectWebSocket, 3000);
}

function connectWebSocket() {
  const host = esp32HostInput.value.trim();
  clearTimeout(reconnectTimer);

  if (!host) {
    setConnectionState("disconnected");
    return;
  }

  if (socket) {
    socket.close();
  }

  setConnectionState("connecting");
  const currentSocket = new WebSocket(`ws://${host}:81/`);
  socket = currentSocket;

  currentSocket.addEventListener("open", () => {
    if (socket !== currentSocket) return;
    setConnectionState("connected");
    selectLiveOrientation();
  });
  currentSocket.addEventListener("message", (event) => {
    try {
      const packet = JSON.parse(event.data);
      if (
        packet.type !== "orientation" ||
        !Number.isFinite(packet.w) ||
        !Number.isFinite(packet.x) ||
        !Number.isFinite(packet.y) ||
        !Number.isFinite(packet.z)
      ) {
        return;
      }
      latestQuaternion.w = packet.w;
      latestQuaternion.x = packet.x;
      latestQuaternion.y = packet.y;
      latestQuaternion.z = packet.z;
      mapSensorQuaternionToThreeQuaternion(
        latestQuaternion,
        liveThreeQuaternion,
      );
      updateRelativeOrientation();
      updateQuaternionReadout();
    } catch {
      return;
    }
  });
  currentSocket.addEventListener("error", () => currentSocket.close());
  currentSocket.addEventListener("close", () => {
    if (socket !== currentSocket) return;
    socket = undefined;
    setConnectionState("disconnected");
    scheduleReconnect();
  });
}

orientationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.orientation === "live") {
      selectLiveOrientation();
    } else {
      selectOrientation(button.dataset.orientation);
    }
  });
});

connectionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  connectWebSocket();
});

connectionToggle.addEventListener("click", () => {
  setConnectionPanelVisible(connectionPanel.classList.contains("is-hidden"));
});

viewport.addEventListener("click", (event) => {
  if (!connectionPanel.contains(event.target)) {
    setConnectionPanelVisible(false);
  }
});

recenterButton.addEventListener("click", recenterOrientation);

window.addEventListener("keydown", (event) => {
  const keyMap = { 1: "identity", 2: "x", 3: "y", 4: "z" };
  const label = keyMap[event.key];
  if (label) {
    selectOrientation(label);
  }
});

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function updateAmbientSpots(deltaTime) {
  ambientSpots.forEach((spot) => {
    spot.age += deltaTime;
    if (spot.age >= spot.duration) {
      resetAmbientSpot(spot);
    }

    const progress = spot.age / spot.duration;
    spot.mesh.material.opacity = 0.075 * Math.sin(Math.PI * progress);
  });
}

let previousAnimationTime;

function animate(time) {
  const deltaTime =
    previousAnimationTime === undefined
      ? 0
      : Math.min((time - previousAnimationTime) / 1000, 0.1);
  previousAnimationTime = time;
  updateAmbientSpots(deltaTime);
  bladeRotors.forEach(({ rotor, direction }) => {
    rotor.rotation.y += deltaTime * 18 * direction;
  });
  updateTailLight(time / 1000);

  if (liveMode) {
    renderedQuaternion.slerp(relativeQuaternion, LIVE_SMOOTHING);
    device.quaternion.copy(renderedQuaternion);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
resize();
selectOrientation("identity");
renderedQuaternion.identity();
referenceQuaternion.identity();
if (queryHost) {
  esp32HostInput.value = queryHost;
  connectWebSocket();
} else {
  setConnectionState("disconnected");
}
requestAnimationFrame(animate);
