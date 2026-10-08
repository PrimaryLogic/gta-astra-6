import "./style.css";
import * as THREE from "three";
import {
  createWorld,
  blocked,
  buildingFootprints,
  random,
  LIMIT,
} from "./world.js";
import { createCar, createPerson } from "./vehicles.js";

const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#c5d1ce");
scene.fog = new THREE.FogExp2("#c9cec0", 0.0021);
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1400, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color("#80b4d0") },
      bottom: { value: new THREE.Color("#f0d5b6") },
    },
    vertexShader:
      "varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:
      "uniform vec3 top;uniform vec3 bottom;varying vec3 vWorld;void main(){float h=normalize(vWorld).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.05,0.65,h)),1.0);}",
  }),
);
scene.add(sky);
const camera = new THREE.PerspectiveCamera(
  52,
  innerWidth / innerHeight,
  0.2,
  1700,
);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
} catch {
  $("loading").innerHTML =
    "<h2>This city needs WebGL.</h2><p>Enable hardware acceleration in your browser, then reload.</p>";
  throw new Error("WebGL unavailable");
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
$("world").appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight("#d8e7f5", "#958776", 2.6));
const sunlight = new THREE.DirectionalLight("#ffe0b9", 3.1);
sunlight.position.set(-120, 160, -90);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -110;
sunlight.shadow.camera.right = 110;
sunlight.shadow.camera.top = 110;
sunlight.shadow.camera.bottom = -110;
sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 450;
sunlight.shadow.normalBias = 0.08;
sunlight.shadow.bias = -0.0002;
scene.add(sunlight);
scene.add(sunlight.target);
createWorld(scene);
const playerCar = createCar("#dca875");
scene.add(playerCar);
playerCar.position.set(5, 0, 145);
playerCar.rotation.y = Math.PI;
const avatar = createPerson("#eee3c6");
avatar.visible = false;
scene.add(avatar);
const traffic = [];
const carColors = [
  "#8faaa8",
  "#ae6253",
  "#dbd3b7",
  "#4e6570",
  "#897968",
  "#a7ada5",
  "#636465",
];
for (let i = 0; i < 25; i++) {
  const axis = i % 2 ? "x" : "z",
    road = (Math.floor(random() * 7) - 3) * 100,
    dir = random() > 0.5 ? 1 : -1,
    pos = random() * 660 - 330;
  const car = createCar(carColors[i % carColors.length]);
  car.rotation.y =
    axis === "z"
      ? dir === 1
        ? 0
        : Math.PI
      : dir === 1
        ? Math.PI / 2
        : -Math.PI / 2;
  car.position.set(
    axis === "x" ? pos : road - dir * 5,
    0,
    axis === "z" ? pos : road + dir * 5,
  );
  scene.add(car);
  traffic.push({
    mesh: car,
    axis,
    road,
    dir,
    speed: 8 + random() * 6,
    cooldown: 0,
  });
}
const pedestrians = [];
for (let i = 0; i < 32; i++) {
  const p = createPerson(["#ba8067", "#617f84", "#ddcb99", "#768167"][i % 4]),
    x = (Math.floor(random() * 6) - 3) * 100 + 16,
    z = random() * 630 - 315;
  p.position.set(x, 0, z);
  p.rotation.y = i % 2 ? 0 : Math.PI;
  scene.add(p);
  pedestrians.push({ mesh: p, dir: i % 2 ? 1 : -1 });
}
const police = [];
for (let i = 0; i < 3; i++) {
  const mesh = createCar("#222a30", true);
  mesh.visible = false;
  scene.add(mesh);
  police.push({ mesh, speed: 17 + i * 2 });
}
const checkpoint = new THREE.Group();
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(6, 0.16, 8, 64),
  new THREE.MeshBasicMaterial({
    color: "#e4eea3",
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  }),
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.14;
checkpoint.add(ring);
const beam = new THREE.Mesh(
  new THREE.CylinderGeometry(5.9, 5.9, 13, 32, 1, true),
  new THREE.MeshBasicMaterial({
    color: "#d9e991",
    transparent: true,
    opacity: 0.075,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
beam.position.y = 6.5;
checkpoint.add(beam);
const diamond = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.85),
  new THREE.MeshBasicMaterial({ color: "#e4eea3" }),
);
diamond.position.y = 6;
checkpoint.add(diamond);
checkpoint.visible = false;
scene.add(checkpoint);
const waypointMesh = new THREE.Mesh(
  new THREE.ConeGeometry(0.8, 2, 4),
  new THREE.MeshBasicMaterial({ color: "#80c8df" }),
);
waypointMesh.rotation.z = Math.PI;
waypointMesh.visible = false;
scene.add(waypointMesh);
const keys = new Set();
let inCar = true,
  speed = 0,
  heading = Math.PI,
  health = 100,
  boost = 100,
  cameraMode = 0,
  cameraYaw = 0,
  paused = false,
  dialog = null,
  activeMission = null,
  missionIndex = 0,
  wanted = 0,
  escapeTime = 0,
  hitCooldown = 0,
  simulationTime = 0,
  waypoint = null,
  toastTimeout,
  dragging = false,
  previousPointer = 0;
let cash = 2500,
  completed = 0;
try {
  const save = JSON.parse(localStorage.getItem("sunset-city-save"));
  if (save && Number.isFinite(save.cash) && Number.isFinite(save.completed)) {
    cash = Math.max(0, save.cash);
    completed = Math.max(0, Math.floor(save.completed));
    missionIndex = completed % 3;
  }
} catch {}
const missions = [
  {
    title: "The first getaway",
    type: "STREET RACE",
    description:
      "A fast car. An open road. Make a name for yourself in the city.",
    reward: 1500,
    time: 180,
    route: [
      [5, 55],
      [5, -55],
      [5, -195],
      [95, -195],
      [195, -195],
      [205, -95],
      [205, 5],
    ],
    start: "Follow the green checkpoints. The city is your racetrack.",
  },
  {
    title: "Special delivery",
    type: "COURIER RUN",
    description:
      "An unmarked package. A client by the coast. Get there in one piece.",
    reward: 2500,
    time: 150,
    route: [
      [195, 5],
      [95, 5],
      [-5, 5],
      [-105, 5],
      [-205, 5],
      [-295, 5],
      [-305, 105],
    ],
    start: "Delivery started. Follow the route to the coast.",
  },
  {
    title: "Out of sight",
    type: "LOSE THE HEAT",
    description:
      "The LSPD is on your tail. Break away, stay out of sight, and keep the cash.",
    reward: 3500,
    time: 120,
    route: [],
    start: "Two stars. Keep moving and lose the police for 12 seconds.",
  },
];
function save() {
  try {
    localStorage.setItem(
      "sunset-city-save",
      JSON.stringify({ cash, completed }),
    );
  } catch {}
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $("toast").classList.remove("show"), 4300);
}
function position() {
  return inCar ? playerCar.position : avatar.position;
}
function renderMission() {
  const m = missions[missionIndex];
  $("mission-title").textContent = m.title;
  $("mission-tag").textContent = m.type;
  $("mission-description").textContent = m.description;
  $("mission-reward").innerHTML =
    `$ ${m.reward.toLocaleString()} <small>REWARD</small>`;
  $("mission-meta").textContent = `◷  ${Math.ceil(m.time / 60)} MIN`;
  $("mission-btn").innerHTML = "Start mission <span>↗</span>";
  $("mission-btn").hidden = false;
  $("mission-progress").hidden = true;
  $("mission-kicker").textContent = "A LITTLE AMBITION GOES A LONG WAY";
}
function startMission() {
  if (activeMission) {
    endMission(false, "Mission cancelled. The open road is still yours.");
    return;
  }
  if (!inCar) {
    toast("Get in your car first. Press F when you are nearby.");
    return;
  }
  const m = missions[missionIndex];
  activeMission = { ...m, index: 0, remaining: m.time };
  $("mission-kicker").textContent = "MISSION IN PROGRESS";
  $("mission-btn").innerHTML = "Abandon mission <span>×</span>";
  $("mission-progress").hidden = false;
  toast(m.start);
  if (m.route.length) {
    checkpoint.visible = true;
    checkpoint.position.set(m.route[0][0], 0, m.route[0][1]);
  } else raiseWanted(2);
}
function endMission(success, message) {
  const reward = activeMission?.reward || 0;
  activeMission = null;
  checkpoint.visible = false;
  if (success) {
    cash += reward;
    completed++;
    missionIndex = completed % 3;
    save();
    toast(`MISSION PASSED  •  +$${reward.toLocaleString()}  •  ${message}`);
    chime();
  } else toast(message);
  renderMission();
}
function raiseWanted(level = 1) {
  const old = wanted;
  wanted = Math.min(5, Math.max(wanted, level));
  escapeTime = 0;
  if (!old) {
    for (let i = 0; i < police.length; i++) {
      police[i].mesh.visible = i < Math.min(wanted + 1, 3);
      police[i].mesh.position.copy(playerCar.position);
      police[i].mesh.position.z = Math.min(
        335,
        playerCar.position.z + 55 + i * 14,
      );
      police[i].mesh.position.x = THREE.MathUtils.clamp(
        playerCar.position.x + i * 2,
        -335,
        335,
      );
    }
    toast("LSPD alerted. Break away to lose your wanted level.");
  }
}
function resetCar() {
  playerCar.position.set(5, 0, 145);
  heading = Math.PI;
  speed = 0;
  health = 100;
  boost = 100;
  playerCar.rotation.y = heading;
  inCar = true;
  avatar.visible = false;
  cameraYaw = 0;
  wanted = 0;
  police.forEach((p) => (p.mesh.visible = false));
  if (activeMission) endMission(false, "Mission reset. Ready for another run.");
  toast("Back on Vespucci Boulevard. Your car is repaired.");
  syncMode();
}
function syncMode() {
  $("move-hint").textContent = inCar ? "Drive" : "Move";
  $("enter-hint").textContent = inCar ? "Exit vehicle" : "Enter vehicle";
  $("vehicle-name").innerHTML = inCar
    ? "Comet S2<small>SPORTS CLASS</small>"
    : "On foot<small>EXPLORE THE CITY</small>";
}
function toggleVehicle() {
  if (inCar) {
    if (Math.abs(speed) > 3) {
      toast("Slow down before leaving your car.");
      return;
    }
    const p = playerCar.position;
    let exit = null;
    for (const side of [1, -1]) {
      const x = p.x + Math.cos(heading) * 2.7 * side,
        z = p.z - Math.sin(heading) * 2.7 * side;
      if (!blocked(x, z, 0.45)) {
        exit = { x, z };
        break;
      }
    }
    if (!exit) {
      toast("No room to exit here. Move into the open.");
      return;
    }
    avatar.position.set(exit.x, 0, exit.z);
    avatar.rotation.y = heading;
    avatar.visible = true;
    inCar = false;
    speed = 0;
    toast("Explore on foot. Press F near your Comet to get back in.");
  } else {
    if (avatar.position.distanceTo(playerCar.position) > 5) {
      toast("Move closer to your Comet to enter it.");
      return;
    }
    inCar = true;
    avatar.visible = false;
    heading = playerCar.rotation.y;
    toast("Comet S2. Yours for the taking.");
  }
  syncMode();
}

// Synthesized engine and an original, quiet four-chord radio loop. No external audio files.
let audioContext = null,
  engine = null,
  engineGain = null,
  master = null,
  sound = false,
  volume = 0.28,
  nextNote = 0,
  noteIndex = 0;
function enableAudio() {
  if (!audioContext) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {
      toast("Audio is unavailable in this browser.");
      return;
    }
    audioContext = new Audio();
    master = audioContext.createGain();
    master.gain.value = volume;
    master.connect(audioContext.destination);
    engine = audioContext.createOscillator();
    engine.type = "sawtooth";
    engineGain = audioContext.createGain();
    engineGain.gain.value = 0.018;
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 170;
    engine.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engine.start();
  }
  sound = !sound;
  audioContext.resume();
  master.gain.setTargetAtTime(
    sound ? volume : 0,
    audioContext.currentTime,
    0.1,
  );
  $("sound-btn").setAttribute(
    "aria-label",
    sound ? "Mute sound" : "Enable sound",
  );
  $("sound-btn").innerHTML = sound
    ? "♪"
    : '♪<span class="sound-slash">╱</span>';
  $("radio-subtitle").textContent = sound
    ? "LIVE • SUNSET SESSIONS"
    : "GOOD VIBES. GOLDEN HOUR.";
  nextNote = 0;
}
function chime() {
  if (!audioContext || !sound) return;
  [440, 554, 659].forEach((freq, i) => {
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(master);
    const t = audioContext.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.start(t);
    osc.stop(t + 0.6);
  });
}
function audioUpdate() {
  if (!audioContext || !sound) return;
  engine.frequency.setTargetAtTime(
    inCar ? 36 + Math.abs(speed) * 2 : 20,
    audioContext.currentTime,
    0.12,
  );
  engineGain.gain.setTargetAtTime(
    paused || !inCar ? 0 : 0.018,
    audioContext.currentTime,
    0.2,
  );
  if (!paused && audioContext.currentTime > nextNote) {
    const notes = [
      130.81, 164.81, 196, 246.94, 110, 130.81, 164.81, 196, 87.31, 110, 130.81,
      174.61, 98, 123.47, 146.83, 196,
    ];
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.value = notes[noteIndex++ % notes.length];
    osc.connect(gain);
    gain.connect(master);
    const t = audioContext.currentTime;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.095, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.start(t);
    osc.stop(t + 0.6);
    nextNote = t + 0.29;
  }
}

const controlPairs = [
  ["Drive / move", "W A S D"],
  ["Also move", "↑ ← ↓ →"],
  ["Handbrake", "SPACE"],
  ["Nitro / sprint", "SHIFT"],
  ["Enter / exit car", "F"],
  ["Change camera", "C"],
  ["World map", "M"],
  ["Pause / resume", "ESC"],
  ["Recover & repair", "R"],
  ["Sound on / off", "N"],
];
let returnFocus = null;
function closeDialog() {
  if (!dialog) return;
  dialog = null;
  paused = false;
  $("overlay").hidden = true;
  keys.clear();
  $("pause-btn").textContent = "Ⅱ";
  $("pause-btn").setAttribute("aria-label", "Pause game");
  if (returnFocus?.isConnected) returnFocus.focus();
  else $("world").focus();
}
function openDialog(type) {
  returnFocus = document.activeElement;
  dialog = type;
  paused = true;
  keys.clear();
  $("overlay").hidden = false;
  $("modal").classList.toggle("map-modal", type === "map");
  $("pause-btn").textContent = "▷";
  $("pause-btn").setAttribute("aria-label", "Resume game");
  if (type === "controls")
    $("modal-content").innerHTML =
      `<div class="eyebrow">GET TO KNOW THE STREETS</div><h2 id="modal-title">You're in control.</h2><p>Take the wheel, find your own route, and make a little trouble.</p><div class="control-grid">${controlPairs.map(([name, key]) => `<div><span>${name}</span><kbd>${key}</kbd></div>`).join("")}</div><p class="modal-note">Drag the world to look around. Click the map to set a waypoint.<br>On mobile, use the on-screen steering, brake, and accelerator.</p><button class="primary-button" id="resume-button">Let's drive <span>↗</span></button>`;
  if (type === "pause")
    $("modal-content").innerHTML =
      '<div class="eyebrow">TAKE A BREATHER</div><h2 id="modal-title">The city can wait.</h2><p>Your mission and the world are paused. Pick up right where you left off.</p><button class="primary-button" id="resume-button">Back to the streets <span>↗</span></button><button class="secondary-button" id="pause-controls">View controls</button><button class="secondary-button" id="recover-button">Recover & repair car</button>';
  if (type === "settings") {
    $("modal-content").innerHTML =
      `<div class="eyebrow">YOUR CITY. YOUR WAY.</div><h2 id="modal-title">Set the mood.</h2><p>Make yourself comfortable before you hit the road.</p><label class="settings-row">Engine & radio audio<input id="audio-toggle" type="checkbox" ${sound ? "checked" : ""}></label><label class="settings-row">Volume<input id="volume" type="range" min="0" max="1" step=".01" value="${volume}"></label><label class="settings-row">Graphics quality<select id="quality"><option value="high">High</option><option value="low">Performance</option></select></label><label class="settings-row">Camera view<select id="camera-select"><option value="0">Chase</option><option value="1">Wide</option><option value="2">Hood</option></select></label><button class="primary-button" id="resume-button">Back to the city <span>↗</span></button><p class="modal-note">Mission rewards save automatically on this device.</p>`;
    $("quality").value = renderer.shadowMap.enabled ? "high" : "low";
    $("camera-select").value = String(cameraMode);
    $("audio-toggle").onchange = enableAudio;
    $("volume").oninput = (e) => {
      volume = Number(e.target.value);
      if (master) master.gain.value = sound ? volume : 0;
    };
    $("quality").onchange = (e) => {
      const high = e.target.value === "high";
      renderer.shadowMap.enabled = high;
      renderer.setPixelRatio(high ? Math.min(devicePixelRatio, 1.65) : 1);
      scene.traverse((o) => {
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => (m.needsUpdate = true));
        }
      });
    };
    $("camera-select").onchange = (e) => {
      cameraMode = Number(e.target.value);
      cameraYaw = 0;
    };
  }
  if (type === "map") {
    $("modal-content").innerHTML =
      '<div class="eyebrow">SAN ANDREAS / CITY ATLAS</div><h2 id="modal-title">Know your playground.</h2><p class="map-instruction">Click anywhere to set a waypoint. The world pauses while you plan your route.</p><canvas id="full-map" width="1000" height="620" aria-label="City map. Click to set waypoint."></canvas><div class="map-legend"><span><i></i>You are here</span><span><i></i>Mission checkpoint</span><span><i></i>Your waypoint</span></div><button class="secondary-button" id="clear-waypoint">Clear waypoint</button>';
    $("full-map").onclick = (e) => {
      const rect = e.target.getBoundingClientRect();
      waypoint = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 790,
        z: ((e.clientY - rect.top) / rect.height - 0.5) * 790,
      };
      waypointMesh.position.set(waypoint.x, 5, waypoint.z);
      waypointMesh.visible = true;
      toast("Waypoint set. Follow the blue marker on your map.");
      drawMap($("full-map"), true);
    };
    $("clear-waypoint").onclick = () => {
      waypoint = null;
      waypointMesh.visible = false;
      drawMap($("full-map"), true);
    };
    drawMap($("full-map"), true);
  }
  if ($("resume-button")) $("resume-button").onclick = closeDialog;
  if ($("pause-controls"))
    $("pause-controls").onclick = () => openDialog("controls");
  if ($("recover-button"))
    $("recover-button").onclick = () => {
      resetCar();
      closeDialog();
    };
  $("close-modal").focus();
}
$("map-btn").onclick = () => openDialog("map");
$("expand-map").onclick = () => openDialog("map");
$("minimap").onclick = () => openDialog("map");
$("controls-btn").onclick = $("all-controls").onclick = () =>
  openDialog("controls");
$("settings-btn").onclick = () => openDialog("settings");
$("pause-btn").onclick = () => (dialog ? closeDialog() : openDialog("pause"));
$("close-modal").onclick = closeDialog;
$("overlay").onclick = (e) => {
  if (e.target === $("overlay")) closeDialog();
};
$("mission-btn").onclick = startMission;
$("sound-btn").onclick = enableAudio;
const keyMap = {
  ArrowUp: "w",
  ArrowDown: "s",
  ArrowLeft: "a",
  ArrowRight: "d",
  " ": "space",
  Shift: "shift",
};
function action(key) {
  if (key === "Escape") {
    dialog ? closeDialog() : openDialog("pause");
    return;
  }
  if (dialog) return;
  switch (key.toLowerCase()) {
    case "f":
      toggleVehicle();
      break;
    case "c":
      cameraMode = (cameraMode + 1) % 3;
      cameraYaw = 0;
      toast(["Chase camera", "Wide camera", "Hood camera"][cameraMode]);
      break;
    case "m":
      openDialog("map");
      break;
    case "h":
      openDialog("controls");
      break;
    case "r":
      resetCar();
      break;
    case "n":
      enableAudio();
      break;
  }
}
window.addEventListener("keydown", (e) => {
  if (dialog && e.key === "Tab") {
    const els = [...$("modal").querySelectorAll("button,input,select")],
      first = els[0],
      last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
    return;
  }
  if (["INPUT", "SELECT"].includes(e.target.tagName) && e.key !== "Escape")
    return;
  const k = keyMap[e.key] || e.key.toLowerCase();
  if (["w", "a", "s", "d", "space", "shift"].includes(k)) {
    if (!dialog) {
      e.preventDefault();
      keys.add(k);
    }
  }
  if (!e.repeat) action(e.key);
});
window.addEventListener("keyup", (e) =>
  keys.delete(keyMap[e.key] || e.key.toLowerCase()),
);
window.addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => {
  keys.clear();
  if (document.hidden && !dialog) openDialog("pause");
});
for (const b of document.querySelectorAll("[data-key]")) {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    if (b.dataset.key === "f") toggleVehicle();
    else keys.add(b.dataset.key);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => keys.delete(b.dataset.key));
}
renderer.domElement.addEventListener("pointerdown", (e) => {
  dragging = true;
  previousPointer = e.clientX;
  renderer.domElement.setPointerCapture(e.pointerId);
  $("world").focus();
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (dragging) {
    cameraYaw -= (e.clientX - previousPointer) * 0.006;
    previousPointer = e.clientX;
  }
});
renderer.domElement.addEventListener("pointerup", () => (dragging = false));
renderer.domElement.addEventListener("pointercancel", () => (dragging = false));

function drawMap(canvas, full = false) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height,
    p = position(),
    range = full ? 790 : 235,
    sx = w / range,
    sz = full ? h / range : w / range,
    cx = full ? 0 : p.x,
    cz = full ? 0 : p.z;
  const tx = (x) => (x - cx) * sx + w / 2,
    tz = (z) => (z - cz) * sz + h / 2;
  ctx.fillStyle = "#293a3d";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#2c5059";
  ctx.fillRect(0, 0, tx(-369), h);
  ctx.fillStyle = "#35494a";
  for (const b of buildingFootprints)
    ctx.fillRect(tx(b.x - b.w), tz(b.z - b.d), b.w * 2 * sx, b.d * 2 * sz);
  ctx.strokeStyle = "#738282";
  ctx.lineWidth = full ? 12 : 16;
  for (let n = -3; n <= 3; n++) {
    ctx.beginPath();
    ctx.moveTo(tx(n * 100), tz(-355));
    ctx.lineTo(tx(n * 100), tz(355));
    ctx.moveTo(tx(-355), tz(n * 100));
    ctx.lineTo(tx(355), tz(n * 100));
    ctx.stroke();
  }
  ctx.strokeStyle = "#526366";
  ctx.lineWidth = full ? 8 : 12;
  for (let n = -3; n <= 3; n++) {
    ctx.beginPath();
    ctx.moveTo(tx(n * 100), tz(-355));
    ctx.lineTo(tx(n * 100), tz(355));
    ctx.moveTo(tx(-355), tz(n * 100));
    ctx.lineTo(tx(355), tz(n * 100));
    ctx.stroke();
  }
  ctx.fillStyle = "#486453";
  for (const [x, z] of [
    [-150, 150],
    [150, 150],
    [-250, -150],
  ])
    ctx.fillRect(tx(x - 31), tz(z - 31), 62 * sx, 62 * sz);
  if (activeMission?.route.length) {
    ctx.strokeStyle = "#d1e899";
    ctx.lineWidth = full ? 3 : 4;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(tx(p.x), tz(p.z));
    for (let i = activeMission.index; i < activeMission.route.length; i++) {
      const [x, z] = activeMission.route[i];
      ctx.lineTo(tx(x), tz(z));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const [x, z] = activeMission.route[activeMission.index];
    ctx.fillStyle = "#d7ed9f";
    ctx.beginPath();
    ctx.arc(tx(x), tz(z), full ? 8 : 9, 0, Math.PI * 2);
    ctx.fill();
  }
  if (waypoint) {
    ctx.strokeStyle = "#7fcde1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx(waypoint.x), tz(waypoint.z), 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#7fcde1";
    ctx.beginPath();
    ctx.arc(tx(waypoint.x), tz(waypoint.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (wanted)
    for (const cop of police.filter((c) => c.mesh.visible)) {
      ctx.fillStyle = "#f08579";
      ctx.beginPath();
      ctx.arc(
        tx(cop.mesh.position.x),
        tz(cop.mesh.position.z),
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  if (!inCar) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(
      tx(playerCar.position.x) - 3,
      tz(playerCar.position.z) - 3,
      6,
      6,
    );
  }
  ctx.save();
  ctx.translate(tx(p.x), tz(p.z));
  ctx.rotate(-(inCar ? heading : avatar.rotation.y));
  ctx.shadowColor = "#e7a477";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#f5b181";
  ctx.strokeStyle = "#18282d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.lineTo(-7, -7);
  ctx.lineTo(0, -3);
  ctx.lineTo(7, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (full) {
    ctx.font = "600 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#b6c7bd";
    for (const [name, x, z] of [
      ["DOWNTOWN", 50, -130],
      ["PILLBOX HILL", 50, 80],
      ["VESPUCCI", -250, 220],
      ["ROCKFORD HILLS", 180, 240],
    ])
      ctx.fillText(name, tx(x), tz(z));
    ctx.fillStyle = "#9ab6b7";
    ctx.font = "italic 17px serif";
    ctx.save();
    ctx.translate(tx(-375), tz(0));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("PACIFIC OCEAN", 0, 0);
    ctx.restore();
  }
}
function district(p) {
  return p.x < -170
    ? ["Vespucci Beach", "VESPUCCI", "Bay City Avenue"]
    : p.z < -80
      ? ["Downtown Los Santos", "DOWNTOWN", "San Andreas Avenue"]
      : p.x > 150
        ? ["Rockford Hills", "ROCKFORD HILLS", "Portola Drive"]
        : ["Downtown Los Santos", "PILLBOX HILL", "Vespucci Boulevard"];
}
const vCamera = new THREE.Vector3(),
  vLook = new THREE.Vector3(),
  clock = new THREE.Clock();
let uiTime = 0;
function update(dt) {
  simulationTime += dt;
  hitCooldown = Math.max(0, hitCooldown - dt);
  if (inCar) {
    const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0),
      nitro = keys.has("shift") && boost > 0 && speed > 2;
    if (throttle) {
      speed += throttle * (speed * throttle < 0 ? 34 : 18) * dt;
    } else speed *= Math.exp(-0.75 * dt);
    if (keys.has("space")) speed *= Math.exp(-3.4 * dt);
    if (nitro) {
      speed += 22 * dt;
      boost = Math.max(0, boost - 24 * dt);
    } else boost = Math.min(100, boost + 9 * dt);
    speed = THREE.MathUtils.clamp(speed, -13, nitro ? 66 : 46);
    if (Math.abs(speed) < 0.06) speed = 0;
    const steering = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
    heading +=
      steering *
      dt *
      Math.min(Math.abs(speed) * 0.11, 1.62) *
      Math.sign(speed) *
      (keys.has("space") ? 1.55 : 1);
    const nx = playerCar.position.x + Math.sin(heading) * speed * dt,
      nz = playerCar.position.z + Math.cos(heading) * speed * dt;
    if (!blocked(nx, nz, 1.45)) {
      playerCar.position.x = nx;
      playerCar.position.z = nz;
    } else {
      if (Math.abs(speed) > 7 && hitCooldown === 0) {
        health = Math.max(0, health - Math.abs(speed) * 0.65);
        hitCooldown = 0.9;
        toast(
          health < 25
            ? "Your car needs repairs. Press R to recover."
            : "Watch the paintwork. Brake into the corners.",
        );
      }
      speed *= -0.28;
    }
    playerCar.rotation.y = heading;
    playerCar.rotation.z = THREE.MathUtils.lerp(
      playerCar.rotation.z,
      -steering * Math.min(Math.abs(speed) * 0.0009, 0.03),
      dt * 5,
    );
    playerCar.userData.wheels.forEach((w, i) => {
      w.rotation.x += speed * dt * 2;
      if (i % 2 === 1) w.rotation.y = steering * 0.25;
    });
  } else {
    let dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
      dz = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
    const len = Math.hypot(dx, dz);
    speed = len ? (keys.has("shift") ? 8 : 4.6) : 0;
    if (len) {
      dx /= len;
      dz /= len;
      const nx = avatar.position.x + dx * speed * dt,
        nz = avatar.position.z + dz * speed * dt;
      if (!blocked(nx, avatar.position.z, 0.45)) avatar.position.x = nx;
      if (!blocked(avatar.position.x, nz, 0.45)) avatar.position.z = nz;
      avatar.rotation.y = Math.atan2(dx, dz);
      avatar.userData.legs.forEach(
        (l, i) =>
          (l.rotation.x =
            Math.sin(simulationTime * speed * 2 + i * Math.PI) * 0.5),
      );
    } else avatar.userData.legs.forEach((l) => (l.rotation.x = 0));
  }
  for (const t of traffic) {
    t.cooldown = Math.max(0, t.cooldown - dt);
    let near = false;
    for (const other of traffic) {
      if (
        other === t ||
        other.axis !== t.axis ||
        other.road !== t.road ||
        other.dir !== t.dir
      )
        continue;
      const gap =
        (other.mesh.position[t.axis] - t.mesh.position[t.axis]) * t.dir;
      if (gap > 0 && gap < 8) {
        near = true;
        break;
      }
    }
    if (!near) t.mesh.position[t.axis] += t.speed * t.dir * dt;
    if (Math.abs(t.mesh.position[t.axis]) > 348)
      t.mesh.position[t.axis] = -348 * t.dir;
    if (
      inCar &&
      t.mesh.position.distanceTo(playerCar.position) < 3 &&
      t.cooldown === 0
    ) {
      t.cooldown = 2;
      if (Math.abs(speed) > 8) {
        health = Math.max(0, health - 8);
        raiseWanted(Math.min(5, wanted + 1));
      }
      speed *= -0.25;
      const away = playerCar.position
        .clone()
        .sub(t.mesh.position)
        .normalize()
        .multiplyScalar(1.8);
      const candidate = playerCar.position.clone().add(away);
      if (!blocked(candidate.x, candidate.z))
        playerCar.position.copy(candidate);
    }
  }
  for (const p of pedestrians) {
    p.mesh.position.z += p.dir * 0.85 * dt;
    if (Math.abs(p.mesh.position.z) > 332) p.dir *= -1;
    p.mesh.rotation.y = p.dir === 1 ? 0 : Math.PI;
    p.mesh.userData.legs.forEach(
      (l, i) =>
        (l.rotation.x = Math.sin(simulationTime * 5 + i * Math.PI) * 0.3),
    );
  }
  if (wanted) {
    let nearest = Infinity;
    for (let i = 0; i < police.length; i++) {
      const cop = police[i];
      cop.mesh.visible = i < Math.min(wanted + 1, 3);
      if (!cop.mesh.visible) continue;
      const p = position(),
        cp = cop.mesh.position,
        dist = cp.distanceTo(p);
      nearest = Math.min(nearest, dist);
      const angle = Math.atan2(p.x - cp.x, p.z - cp.z);
      cop.mesh.rotation.y = angle;
      let nx = cp.x + Math.sin(angle) * cop.speed * dt,
        nz = cp.z + Math.cos(angle) * cop.speed * dt;
      if (!blocked(nx, nz, 1.2)) {
        cp.x = nx;
        cp.z = nz;
      } else if (!blocked(nx, cp.z, 1.2)) cp.x = nx;
      else if (!blocked(cp.x, nz, 1.2)) cp.z = nz;
      cop.mesh.userData.lights.forEach(
        (l, j) => (l.visible = (Math.floor(simulationTime * 8) + j) % 2 === 0),
      );
      if (dist < 3.4 && hitCooldown === 0) {
        health = Math.max(0, health - 12);
        hitCooldown = 1;
        speed *= 0.7;
      }
    }
    if (nearest > 68) {
      escapeTime += dt;
      if (escapeTime > 12) {
        wanted = 0;
        police.forEach((c) => (c.mesh.visible = false));
        toast("WANTED LEVEL CLEARED  •  You lost the cops.");
        if (activeMission && !activeMission.route.length)
          endMission(true, "Clean getaway.");
      }
    } else escapeTime = 0;
  }
  if (activeMission) {
    activeMission.remaining -= dt;
    if (activeMission.remaining <= 0) {
      endMission(false, "Time is up. Give it another shot.");
    } else if (activeMission.route.length) {
      const goal = activeMission.route[activeMission.index];
      if (
        inCar &&
        Math.hypot(
          playerCar.position.x - goal[0],
          playerCar.position.z - goal[1],
        ) < 10
      ) {
        activeMission.index++;
        chime();
        if (activeMission.index >= activeMission.route.length)
          endMission(true, "A name worth remembering.");
        else {
          const next = activeMission.route[activeMission.index];
          checkpoint.position.set(next[0], 0, next[1]);
          toast(
            `Checkpoint ${activeMission.index} / ${activeMission.route.length}  •  Keep it moving.`,
          );
        }
      }
    }
  }
  if (health <= 0) {
    cash = Math.max(0, cash - 250);
    save();
    resetCar();
    toast("WRECKED  •  $250 repair bill. Back on the road.");
  }
  if (
    waypoint &&
    Math.hypot(position().x - waypoint.x, position().z - waypoint.z) < 10
  ) {
    waypoint = null;
    waypointMesh.visible = false;
    toast("You reached your waypoint. Where to next?");
  }
  diamond.rotation.y += dt;
  diamond.position.y = 6 + Math.sin(simulationTime * 2) * 0.4;
  waypointMesh.position.y = 5 + Math.sin(simulationTime * 2) * 0.5;
}
function updateCamera(dt, instant = false) {
  const p = position(),
    angle = (inCar ? heading : Math.PI) + cameraYaw;
  let distance = inCar
      ? cameraMode === 1
        ? 19
        : cameraMode === 2
          ? -0.5
          : 11.5
      : 7,
    height = inCar
      ? cameraMode === 1
        ? 9
        : cameraMode === 2
          ? 1.9
          : 5.2
      : 4.2;
  const fov = cameraMode === 2 ? 68 : 52 + Math.max(0, speed - 28) * 0.24;
  camera.fov = THREE.MathUtils.lerp(camera.fov, fov, 0.05);
  camera.updateProjectionMatrix();
  vCamera.set(
    p.x - Math.sin(angle) * distance,
    p.y + height,
    p.z - Math.cos(angle) * distance,
  );
  vLook.set(
    p.x + Math.sin(angle) * (inCar ? 10 : 3),
    inCar ? 1.7 : 1.4,
    p.z + Math.cos(angle) * (inCar ? 10 : 3),
  );
  camera.position.lerp(vCamera, instant ? 1 : 1 - Math.exp(-6 * dt));
  camera.lookAt(vLook);
  sunlight.position.set(p.x - 100, 150, p.z - 85);
  sunlight.target.position.set(p.x, 0, p.z);
  sunlight.target.updateMatrixWorld();
}
function updateUI() {
  const kph = Math.round(Math.abs(speed) * 3.6);
  $("speed").textContent = String(kph).padStart(3, "0");
  $("speed-bar").style.width = `${(kph / 238) * 100}%`;
  $("gear").textContent = !inCar
    ? "–"
    : speed < -0.4
      ? "R"
      : kph < 2
        ? "N"
        : Math.min(6, Math.floor(kph / 36) + 1);
  $("vehicle-condition").innerHTML = `${Math.ceil(health)}<small>%</small>`;
  $("health-bar").style.width = `${health}%`;
  $("boost-bar").style.width = `${boost}%`;
  $("money").textContent = `$ ${cash.toLocaleString()}`;
  document
    .querySelectorAll(".wanted span")
    .forEach((star, i) => star.classList.toggle("active", i < wanted));
  $("pursuit-label").textContent = wanted
    ? escapeTime > 0
      ? `LOSING HEAT · ${Math.max(0, Math.ceil(12 - escapeTime))}s`
      : "LSPD IN PURSUIT"
    : "";
  const d = district(position());
  $("district").textContent = d[0];
  $("map-district").textContent = d[1];
  $("map-street").textContent = waypoint
    ? `Waypoint · ${Math.round(Math.hypot(position().x - waypoint.x, position().z - waypoint.z))} m`
    : d[2];
  const mins = 18 * 60 + 42 + Math.floor(simulationTime / 12);
  $("clock").textContent =
    `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  if (activeMission) {
    $("mission-meta").textContent =
      `◷  ${Math.floor(activeMission.remaining / 60)}:${String(Math.floor(activeMission.remaining % 60)).padStart(2, "0")}`;
    const progress = activeMission.route.length
      ? activeMission.index / activeMission.route.length
      : escapeTime / 12;
    $("mission-bar").style.width = `${progress * 100}%`;
    $("mission-counter").textContent = activeMission.route.length
      ? `${activeMission.index} / ${activeMission.route.length} checkpoints  •  Follow the green route`
      : "Lose the cops and stay clear for 12 seconds";
  }
  drawMap($("minimap"));
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) update(dt);
  updateCamera(dt);
  audioUpdate();
  if (!paused) renderer.render(scene, camera);
  uiTime += dt;
  if (uiTime > 0.09) {
    updateUI();
    uiTime = 0;
  }
}
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
Object.defineProperty(window, "gameState", {
  get: () => ({
    position: { x: position().x, z: position().z },
    heading,
    speed,
    health,
    boost,
    inCar,
    wanted,
    escapeTime,
    paused,
    cash,
    completed,
    cameraMode,
    mission: activeMission
      ? {
          title: activeMission.title,
          checkpoint: activeMission.index,
          total: activeMission.route.length,
          remaining: activeMission.remaining,
        }
      : null,
    waypoint,
    traffic: traffic.length,
  }),
});
renderMission();
updateCamera(0, true);
updateUI();
animate();
requestAnimationFrame(() => {
  $("loading").classList.add("hidden");
  setTimeout(() => $("loading").remove(), 600);
});
