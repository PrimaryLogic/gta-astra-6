import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { material } from "./world.js";
function part(group, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}
function cube(g, w, h, d, x, y, z, m) {
  return part(g, new THREE.BoxGeometry(w, h, d), m, x, y, z);
}
// Beveled coachwork gives the car real shoulders, a low nose, and a wide rear.
function bodyGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.93, -2.1);
  shape.lineTo(0.93, -2.1);
  shape.quadraticCurveTo(1.1, -2.1, 1.1, -1.75);
  shape.lineTo(1.08, 1.5);
  shape.quadraticCurveTo(1.05, 2.15, 0.7, 2.2);
  shape.lineTo(-0.7, 2.2);
  shape.quadraticCurveTo(-1.05, 2.15, -1.08, 1.5);
  shape.lineTo(-1.1, -1.75);
  shape.quadraticCurveTo(-1.1, -2.1, -0.93, -2.1);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.43,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.13,
    bevelThickness: 0.13,
  });
  geo.rotateX(Math.PI / 2);
  return geo;
}
export function createCar(color = "#d98455", police = false) {
  const g = new THREE.Group(),
    paint = material(color, 0.28, 0.48),
    black = material("#17272e", 0.35, 0.25),
    glass = material("#334e59", 0.12, 0.65),
    rubber = material("#202529"),
    chrome = material("#b8c1bf", 0.25, 0.8);
  const body = part(g, bodyGeometry(), paint, 0, 1.05, 0);
  cube(g, 1.93, 0.15, 4.45, 0, 0.51, 0, black);
  // Windshield and fastback cabin.
  const cabin = new THREE.CylinderGeometry(1, 1, 1, 4, 1);
  cabin.rotateY(Math.PI / 4);
  cabin.scale(1.23, 0.59, 1.65);
  part(g, cabin, glass, 0, 1.35, -0.16);
  cube(g, 1.56, 0.1, 1.35, 0, 1.67, -0.38, paint);
  const windshield = cube(g, 1.57, 0.58, 0.06, 0, 1.37, 0.74, glass);
  windshield.rotation.x = -0.47;
  const rearGlass = cube(g, 1.57, 0.49, 0.07, 0, 1.37, -1.1, glass);
  rearGlass.rotation.x = 0.6;
  cube(g, 0.08, 0.6, 1.8, -0.82, 1.35, -0.1, paint);
  cube(g, 0.08, 0.6, 1.8, 0.82, 1.35, -0.1, paint);
  cube(g, 1.83, 0.11, 1.1, 0, 1.03, 1.53, paint);
  cube(g, 0.08, 0.025, 1.0, -0.37, 1.1, 1.5, black);
  cube(g, 0.08, 0.025, 1.0, 0.37, 1.1, 1.5, black);
  cube(g, 1.84, 0.12, 0.33, 0, 1.15, -1.94, black);
  cube(g, 0.1, 0.23, 0.1, -0.67, 1.01, -1.94, black);
  cube(g, 0.1, 0.23, 0.1, 0.67, 1.01, -1.94, black);
  for (const x of [-1, 1]) {
    cube(g, 0.29, 0.16, 0.35, x * 1.18, 1.25, 0.27, paint);
    cube(g, 0.16, 0.07, 0.15, x * 1.13, 1.22, 0.21, black);
    cube(g, 0.08, 0.07, 0.3, x * 1.09, 1.06, -0.4, chrome);
  }
  const wheels = [];
  for (const x of [-1.04, 1.04])
    for (const z of [-1.4, 1.4]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.51, z);
      const tire = part(
        wheel,
        new THREE.CylinderGeometry(0.45, 0.45, 0.32, 20),
        rubber,
        0,
        0,
        0,
      );
      tire.rotation.z = Math.PI / 2;
      const rim = part(
        wheel,
        new THREE.CylinderGeometry(0.29, 0.29, 0.335, 12),
        chrome,
        0,
        0,
        0,
      );
      rim.rotation.z = Math.PI / 2;
      const hub = part(
        wheel,
        new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12),
        black,
        0,
        0,
        0,
      );
      hub.rotation.z = Math.PI / 2;
      g.add(wheel);
      wheels.push(wheel);
    }
  const headMat = new THREE.MeshStandardMaterial({
    color: "#fff5d4",
    emissive: "#fff0bd",
    emissiveIntensity: 0.8,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: "#d64435",
    emissive: "#e53f28",
    emissiveIntensity: 0.7,
  });
  for (const x of [-0.74, 0.74]) {
    cube(g, 0.47, 0.13, 0.08, x, 0.95, 2.2, headMat);
    cube(g, 0.62, 0.1, 0.08, x, 0.94, -2.22, tailMat);
    cube(g, 0.23, 0.1, 0.15, x, 0.46, -2.23, chrome);
  }
  cube(g, 0.57, 0.19, 0.04, 0, 0.68, -2.25, material("#d4d6c7"));
  cube(g, 1.05, 0.16, 0.1, 0, 0.68, 2.24, black);
  // Soft contact shadow remains visible beyond the directional shadow range.
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d"),
    grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, "#0009");
  grad.addColorStop(1, "#0000");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const shadow = part(
    g,
    new THREE.PlaneGeometry(4.7, 7),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
    0,
    0.025,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  const lights = [];
  if (police) {
    cube(g, 1.8, 0.33, 3.7, 0, 0.89, 0, material("#dedfd7"));
    cube(g, 1.25, 0.16, 0.35, 0, 1.82, -0.2, black);
    for (const x of [-0.4, 0.4])
      lights.push(
        cube(
          g,
          0.46,
          0.2,
          0.3,
          x,
          1.95,
          -0.2,
          new THREE.MeshBasicMaterial({ color: x < 0 ? "#fc473c" : "#5398ff" }),
        ),
      );
  }
  const batches = new Map();
  for (const child of [...g.children]) {
    if (!child.isMesh || child.material.transparent || lights.includes(child))
      continue;
    child.updateMatrix();
    const geo = (
      child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone()
    ).applyMatrix4(child.matrix);
    if (!batches.has(child.material)) batches.set(child.material, []);
    batches.get(child.material).push(geo);
    g.remove(child);
    child.geometry.dispose();
  }
  for (const [mat, geos] of batches) {
    const merged = new THREE.Mesh(mergeGeometries(geos, false), mat);
    merged.castShadow = true;
    merged.receiveShadow = true;
    g.add(merged);
    geos.forEach((geo) => geo.dispose());
  }
  g.userData = { wheels, lights, paint };
  return g;
}
export function createPerson(color = "#bd7856") {
  const g = new THREE.Group(),
    shirt = material(color),
    pants = material("#303e49"),
    skin = material("#c39575");
  cube(g, 0.56, 0.7, 0.32, 0, 1.1, 0, shirt);
  part(g, new THREE.SphereGeometry(0.22, 8, 8), skin, 0, 1.69, 0);
  cube(g, 0.42, 0.12, 0.36, 0, 1.82, 0, material("#323b38"));
  const legs = [];
  for (const x of [-0.16, 0.16]) {
    const leg = cube(g, 0.22, 0.64, 0.24, x, 0.44, 0, pants);
    legs.push(leg);
    cube(g, 0.2, 0.62, 0.21, x * 2.4, 1.1, 0, skin);
  }
  g.userData.legs = legs;
  return g;
}
