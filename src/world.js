import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const ROAD = 100;
export const LIMIT = 345;
export const colliders = [];
export const buildingFootprints = [];
let seed = 425;
export function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const materials = new Map();
export function material(color, roughness = 0.8, metalness = 0) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
  return materials.get(key);
}
const batches = new Map();
function addStatic(geometry, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(1, 1, 1),
  );
  geometry.applyMatrix4(matrix);
  if (!batches.has(mat)) batches.set(mat, []);
  batches.get(mat).push(geometry);
}
function box(w, h, d, x, y, z, mat, ry = 0) {
  addStatic(new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry);
}
function cylinder(r1, r2, h, x, y, z, mat, segments = 8) {
  addStatic(new THREE.CylinderGeometry(r1, r2, h, segments), mat, x, y, z);
}
function makeFacade(base, glass, rows, cols) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 512);
  const cw = 256 / cols,
    ch = 512 / rows;
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = random() > 0.93 ? "#dec497" : glass;
      ctx.fillRect(
        col * cw + cw * 0.17,
        r * ch + ch * 0.19,
        cw * 0.67,
        ch * 0.66,
      );
      ctx.fillStyle = "#ffffff16";
      ctx.fillRect(col * cw + cw * 0.17, r * ch + ch * 0.19, cw * 0.67, 2);
      ctx.fillStyle = "#1e303921";
      ctx.fillRect(col * cw + cw * 0.49, r * ch + ch * 0.19, 1, ch * 0.66);
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 });
}
function label(
  scene,
  text,
  x,
  y,
  z,
  width = 12,
  color = "#ece3c4",
  bg = "#354b49",
  rotation = 0,
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 47px sans-serif";
  ctx.fillText(text, 256, 67, 466);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
  m.position.set(x, y, z);
  m.rotation.y = rotation;
  scene.add(m);
}
function palm(x, z, height = 15) {
  const trunk = material("#907c59");
  const leaf = material("#56654b");
  cylinder(0.24, 0.52, height, x, height / 2, z, trunk, 7);
  for (let j = 0; j < 7; j++) {
    const a = (j * Math.PI * 2) / 7 + random() * 0.3,
      len = 5 + random() * 2;
    const g = new THREE.BufferGeometry();
    const verts = [];
    const points = [
      [0, 0, 0],
      [Math.sin(a) * len * 0.4, 1.2, Math.cos(a) * len * 0.4],
      [Math.sin(a) * len * 0.8, 0.4, Math.cos(a) * len * 0.8],
      [Math.sin(a) * len, -1.6, Math.cos(a) * len],
    ];
    for (let k = 0; k < 3; k++) {
      const p = points[k],
        q = points[k + 1],
        w = k === 0 ? 0.45 : k === 1 ? 0.9 : 0.4;
      const dx = Math.cos(a) * w,
        dz = -Math.sin(a) * w;
      verts.push(
        p[0] - dx,
        p[1],
        p[2] - dz,
        p[0] + dx,
        p[1],
        p[2] + dz,
        q[0],
        q[1],
        q[2],
      );
      verts.push(
        q[0],
        q[1],
        q[2],
        p[0] + dx,
        p[1],
        p[2] + dz,
        p[0] - dx,
        p[1],
        p[2] - dz,
      );
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    addStatic(g, leaf, x, height, z);
  }
  cylinder(0.8, 0.65, 0.6, x, height - 0.1, z, material("#68704f"));
}
function tree(x, z) {
  cylinder(0.22, 0.4, 5, x, 2.5, z, material("#72614e"));
  addStatic(
    new THREE.IcosahedronGeometry(3.8, 1),
    material("#617856"),
    x,
    6.5,
    z,
  );
}

export function createWorld(scene) {
  const ground = material("#b5ac95"),
    asphalt = material("#535c60"),
    sidewalk = material("#bcb6a1"),
    curb = material("#d0c7ae"),
    line = material("#dccba0"),
    white = material("#dcd8c3"),
    dark = material("#485153");
  box(740, 1, 740, 0, -0.61, 0, ground);
  // A road grid with continuous double center lines, lane markers, and crossings.
  for (let n = -3; n <= 3; n++) {
    const p = n * ROAD;
    box(27, 0.09, 708, p, -0.035, 0, asphalt);
    box(708, 0.09, 27, 0, -0.03, p, asphalt);
    for (let k = -350; k < 350; k += 10) {
      if (Math.abs(k % 100) < 19 || Math.abs(k % 100) > 81) continue;
      for (const v of [-0.24, 0.24]) {
        box(0.13, 0.018, 7, p + v, 0.035, k, line);
        box(7, 0.018, 0.13, k, 0.037, p + v, line);
      }
      for (const v of [-7, 7]) {
        box(0.13, 0.018, 3, p + v, 0.039, k, white);
        box(3, 0.018, 0.13, k, 0.039, p + v, white);
      }
    }
    for (let j = -3; j <= 3; j++)
      for (let stripe = -10; stripe <= 10; stripe += 2.8) {
        box(1.4, 0.025, 3, p + stripe, 0.04, j * 100 - 17, white);
        box(1.4, 0.025, 3, p + stripe, 0.04, j * 100 + 17, white);
        box(3, 0.025, 1.4, p - 17, 0.04, j * 100 + stripe, white);
        box(3, 0.025, 1.4, p + 17, 0.04, j * 100 + stripe, white);
      }
  }
  const facadeColors = [
    ["#bdbaa9", "#607379"],
    ["#d8c3a9", "#7d8987"],
    ["#9dada9", "#526c75"],
    ["#b8aa99", "#697675"],
    ["#d0c5ac", "#6c8686"],
    ["#94a6a3", "#4c646e"],
    ["#c7b7a3", "#87918b"],
  ];
  const facades = facadeColors.map(([b, g]) => makeFacade(b, g, 18, 7));
  const shortFacades = facadeColors.map(([b, g]) => makeFacade(b, g, 6, 6));
  for (let bx = -3; bx < 3; bx++)
    for (let bz = -3; bz < 3; bz++) {
      const cx = bx * 100 + 50,
        cz = bz * 100 + 50;
      box(73, 0.38, 73, cx, 0.09, cz, sidewalk);
      box(74, 0.18, 74, cx, 0.035, cz, curb);
      const park =
        (bx === -2 && bz === 1) ||
        (bx === 1 && bz === 1) ||
        (bx === -3 && bz === -2);
      if (park) {
        box(62, 0.05, 62, cx, 0.31, cz, material("#879373"));
        box(5, 0.055, 62, cx, 0.35, cz, material("#c5b69a"));
        box(62, 0.055, 5, cx, 0.35, cz, material("#c5b69a"));
        cylinder(7, 7, 0.7, cx, 0.8, cz, curb, 24);
        cylinder(6.2, 6.2, 0.7, cx, 1, cz, material("#86b4b0"), 24);
        for (let i = 0; i < 10; i++)
          tree(cx - 27 + random() * 54, cz - 27 + random() * 54);
      } else {
        for (let ix = 0; ix < 2; ix++)
          for (let iz = 0; iz < 2; iz++) {
            const x = cx + (ix - 0.5) * 34,
              z = cz + (iz - 0.5) * 34,
              w = 23 + random() * 8,
              d = 23 + random() * 8;
            const downtown = Math.abs(cx) < 170 && cz < 20;
            let h = downtown ? 34 + random() * 78 : 8 + random() * 18;
            if (bx === 0 && bz === 0) h = 13 + random() * 14;
            const style = Math.floor(random() * facades.length),
              facade = h < 35 ? shortFacades[style] : facades[style];
            const roof = material(facadeColors[style][0]);
            // Side facades use correctly oriented texture coordinates; roofs stay solid.
            addStatic(
              new THREE.PlaneGeometry(w, h),
              facade,
              x,
              h / 2 + 0.3,
              z + d / 2,
            );
            addStatic(
              new THREE.PlaneGeometry(w, h),
              facade,
              x,
              h / 2 + 0.3,
              z - d / 2,
              0,
              Math.PI,
            );
            addStatic(
              new THREE.PlaneGeometry(d, h),
              facade,
              x + w / 2,
              h / 2 + 0.3,
              z,
              0,
              Math.PI / 2,
            );
            addStatic(
              new THREE.PlaneGeometry(d, h),
              facade,
              x - w / 2,
              h / 2 + 0.3,
              z,
              0,
              -Math.PI / 2,
            );
            box(w + 0.7, 0.65, d + 0.7, x, h + 0.55, z, roof);
            box(w * 0.55, 1.1, d * 0.45, x, h + 1.2, z, material("#9b9d92"));
            if (h > 50) {
              box(w * 0.8, 3, d * 0.8, x, h + 1.8, z, roof);
              box(w * 0.45, 3, d * 0.45, x, h + 4, z, material("#9da9a4"));
              cylinder(0.12, 0.15, 8, x, h + 9, z, dark);
            } else {
              box(3, 1.2, 3, x + 4, h + 1.3, z + 4, dark);
              box(3, 1.2, 3, x - 4, h + 1.3, z + 4, dark);
            }
            box(w + 0.2, 2, d + 0.2, x, 1.35, z, material("#969d94"));
            // Street-level shop glass and awnings.
            for (let s = -1; s <= 1; s++) {
              box(
                w * 0.24,
                2.4,
                0.16,
                x + s * w * 0.3,
                2,
                z + d / 2 + 0.12,
                material("#405c60", 0.3, 0.2),
              );
              box(
                w * 0.26,
                0.18,
                2,
                x + s * w * 0.3,
                3.5,
                z + d / 2 + 0.7,
                material(style % 2 ? "#b27b59" : "#617c72"),
              );
            }
            const collider = { x, z, w: w / 2 + 0.4, d: d / 2 + 0.4 };
            colliders.push(collider);
            buildingFootprints.push({ ...collider, height: h });
          }
      }
      // Palm-lined corners and the long, bright boulevards.
      for (const [px, pz] of [
        [cx - 32, cz - 32],
        [cx + 32, cz + 32],
        [cx - 32, cz + 32],
        [cx + 32, cz - 32],
      ])
        palm(px, pz, 12 + random() * 7);
      for (const dz of [-18, 18]) {
        palm(cx - 33, cz + dz, 14 + random() * 3);
        palm(cx + 33, cz + dz, 14 + random() * 3);
      }
      for (const [sx, sz] of [
        [cx - 34, cz],
        [cx + 34, cz],
      ]) {
        cylinder(0.13, 0.2, 8, sx, 4, sz, dark);
        box(2.7, 0.16, 0.25, sx + 1, 8, sz, dark);
        box(1, 0.16, 0.55, sx + 2, 7.9, sz, material("#e6dabb"));
        box(0.5, 0.8, 0.5, sx, 0.55, sz + 3, material("#576f65")); // street bins
      }
      for (const [sx, sz] of [
        [cx - 31, cz - 35],
        [cx + 31, cz + 35],
      ]) {
        box(3, 0.2, 0.8, sx, 0.85, sz, material("#926d4f"));
        box(3, 0.7, 0.15, sx, 1.2, sz + 0.4, material("#926d4f"));
        box(0.18, 0.7, 0.8, sx - 1, 0.4, sz, dark);
        box(0.18, 0.7, 0.8, sx + 1, 0.4, sz, dark);
      }
    }
  // Signals and readable road names at intersections.
  for (let x = -200; x <= 200; x += 100)
    for (let z = -200; z <= 200; z += 100) {
      cylinder(0.15, 0.18, 7, x + 15, 3.5, z + 16, dark);
      box(11, 0.2, 0.2, x + 9.6, 7, z + 16, dark);
      box(0.7, 1.8, 0.6, x + 4.5, 6.6, z + 16, dark);
      for (let i = 0; i < 3; i++)
        box(
          0.4,
          0.4,
          0.06,
          x + 4.5,
          7.1 - i * 0.52,
          z + 16.34,
          material(i === 2 ? "#a7d88f" : i === 0 ? "#89554c" : "#b08e50"),
        );
    }
  label(scene, "VESPUCCI BLVD", 14.8, 5.5, 114, 6, "#e3e6d4", "#3e6257");
  label(scene, "PACIFIC STANDARD", 52, 13, 32.1, 21, "#e5debb", "#566768");
  label(scene, "SUNSET MOTEL", -50, 11, 132, 19, "#f0c196", "#815a50");
  label(scene, "24 / 7", 151, 8, 133, 12, "#ecdca6", "#536b52");
  // Pacific coast, boardwalk, a distant island ridge and a low sun.
  box(24, 0.3, 730, -371, -0.02, 0, material("#d2c3a1"));
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2500, 2500),
    new THREE.MeshStandardMaterial({
      color: "#719d9e",
      roughness: 0.3,
      metalness: 0.25,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-1630, -0.65, 0);
  scene.add(water);
  for (let i = 0; i < 50; i++)
    box(
      25 + random() * 80,
      0.015,
      0.3,
      -395 - random() * 650,
      -0.6,
      -800 + random() * 1600,
      material("#afc4b8"),
    );
  for (let i = 0; i < 25; i++) {
    const h = 40 + random() * 110;
    const mountain = new THREE.ConeGeometry(75 + random() * 80, h, 5);
    addStatic(
      mountain,
      material("#939e91"),
      -850 + i * 80,
      h / 2 - 20,
      -620 - random() * 200,
      0,
      random() * 3,
    );
  }
  for (let i = 0; i < 20; i++) palm(-358, i * 35 - 330, 16);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(32, 24, 24),
    new THREE.MeshBasicMaterial({ color: "#ffe7b6", fog: false }),
  );
  sun.position.set(-650, 220, -800);
  scene.add(sun);
  // Merge small static street details into a handful of draw calls.
  for (const [mat, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
  batches.clear();
}

export function blocked(x, z, r = 1.4) {
  if (Math.abs(x) > LIMIT || Math.abs(z) > LIMIT) return true;
  return colliders.some(
    (b) => Math.abs(x - b.x) < b.w + r && Math.abs(z - b.z) < b.d + r,
  );
}
