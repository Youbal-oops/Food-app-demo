import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** All dimensions are in dish-sized world units. No network or DOM assets are used. */
export interface FoodLayer extends THREE.Group {
  userData: { baseY: number; explodeOffset: number; [key: string]: unknown };
}

export const FOOD_NAMES: Readonly<Record<string, string>> = {
  m1: 'Butter Chicken', m2: 'Paneer Tikka', m4: 'Chicken Biryani',
};

type Random = () => number;
const TAU = Math.PI * 2;

function seeded(seed: number): Random {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function layer(root: THREE.Group, name: string, explodeOffset: number): FoodLayer {
  const group = new THREE.Group() as FoodLayer;
  group.name = name;
  group.userData.baseY = group.position.y;
  group.userData.explodeOffset = explodeOffset;
  root.add(group);
  (root.userData.layers as FoodLayer[]).push(group);
  return group;
}

function mesh<G extends THREE.BufferGeometry>(
  parent: THREE.Object3D, geometry: G, material: THREE.Material,
  x = 0, y = 0, z = 0,
): THREE.Mesh<G> {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

/** Small repeatable microtexture: roughness and bump, rather than a painted food image. */
function microtexture(seed: number, size = 64): THREE.DataTexture {
  const random = seeded(seed);
  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = Math.round(115 + random() * 110);
    pixels.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Seamless roast mottling with visible toasted patches and fine spice speckles. */
function roastTexture(seed: number): THREE.DataTexture {
  const size = 128;
  const random = seeded(seed);
  const patches = Array.from({ length: 27 }, () => ({
    x: random(), y: random(), radius: .025 + random() * .065,
  }));
  const pixels = new Uint8Array(size * size * 4);
  const light = new THREE.Color('#f9d58c');
  const toast = new THREE.Color('#713218');
  const color = new THREE.Color();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let burn = 0;
      for (const p of patches) {
        const dx = Math.min(Math.abs(x / size - p.x), 1 - Math.abs(x / size - p.x));
        const dy = Math.min(Math.abs(y / size - p.y), 1 - Math.abs(y / size - p.y));
        burn = Math.max(burn, Math.exp(-(dx * dx + dy * dy) / (p.radius * p.radius)));
      }
      color.copy(light).lerp(toast, Math.min(1, burn * 1.3 + random() * .11));
      if (random() > .978) color.multiplyScalar(.42);
      // Color values are encoded in sRGB for a color texture.
      color.convertLinearToSRGB();
      pixels.set([color.r * 255, color.g * 255, color.b * 255, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function tube(parent: THREE.Object3D, points: THREE.Vector3[], radius: number,
  material: THREE.Material, segments = 48): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 7, false), material);
}

function ring(parent: THREE.Object3D, radius: number, thickness: number, y: number,
  material: THREE.Material): THREE.Mesh {
  const object = mesh(parent, new THREE.TorusGeometry(radius, thickness, 12, 128), material, 0, y);
  object.rotation.x = Math.PI / 2;
  return object;
}

function vessel(parent: THREE.Group, copper: boolean, wide = false): void {
  const ceramicTexture = microtexture(56);
  ceramicTexture.repeat.set(5, 2);
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: '#efe6d2', roughness: .27, metalness: 0, clearcoat: .48,
    clearcoatRoughness: .2, bumpMap: ceramicTexture, bumpScale: .007,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: '#b96c3d', metalness: .84, roughness: .3,
    bumpMap: microtexture(72), bumpScale: .014,
  });
  const gold = new THREE.MeshStandardMaterial({ color: '#d2a06b', metalness: .85, roughness: .25 });
  const radius = wide ? 1.87 : 1.65;
  const profile = wide
    ? [[0, .08], [1.05, .08], [1.16, .1], [1.45, .16], [1.77, .25], [radius, .28],
      [radius, .32], [1.78, .33], [1.45, .22], [1.15, .16], [0, .16]]
    : [[0, .07], [.83, .07], [1, .1], [1.22, .22], [1.48, .42], [radius, .62],
      [radius, .67], [1.59, .68], [1.49, .55], [1.29, .35], [.94, .22], [0, .22]];
  mesh(parent, new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 128), copper ? metal : ceramic);
  ring(parent, radius - .025, .026, wide ? .31 : .66, copper ? gold : ceramic);
  ring(parent, wide ? 1.68 : 1.48, .01, wide ? .283 : .48, copper ? gold : new THREE.MeshStandardMaterial({ color: '#697657', roughness: .5 }));
  ring(parent, .84, .045, .07, copper ? metal : ceramic);
  if (copper) {
    ceramic.dispose();
    ceramicTexture.dispose();
    // Hammer marks sit on the outer wall and catch the studio reflections.
    const marks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), metal, 144);
    const transform = new THREE.Object3D();
    for (let i = 0; i < 144; i++) {
      const row = Math.floor(i / 48);
      const angle = (i % 48) / 48 * TAU + row * .06;
      const r = 1.28 + row * .105;
      transform.position.set(Math.cos(angle) * r, .27 + row * .09, Math.sin(angle) * r);
      transform.rotation.set(0, -angle, .65);
      transform.scale.set(.027, .037, .012);
      transform.updateMatrix();
      marks.setMatrixAt(i, transform.matrix);
    }
    marks.receiveShadow = true;
    parent.add(marks);
    for (const sign of [-1, 1]) {
      const handle = mesh(parent, new THREE.TorusGeometry(.255, .048, 12, 48), gold,
        sign * 1.72, .49, 0);
      handle.rotation.y = Math.PI / 2;
      handle.scale.set(1, .67, 1);
      mesh(parent, new THREE.SphereGeometry(.085, 12, 8), metal, sign * 1.57, .5, -.17);
      mesh(parent, new THREE.SphereGeometry(.085, 12, 8), metal, sign * 1.57, .5, .17);
    }
  } else {
    // Fine concentric glazing lines read as a handmade ceramic rim.
    for (let i = 0; i < 3; i++) ring(parent, radius - .11 - i * .035, .004, wide ? .30 - i * .01 : .63 - i * .035, ceramic);
    metal.dispose();
    metal.bumpMap?.dispose();
    gold.dispose();
  }
}

/** A real radial surface, with gently uneven height and no overlapping sphere blobs. */
function radialSurface(radius: number, height: (r: number, theta: number) => number,
  rings = 28, segments = 128): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const r = j / rings * radius;
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * TAU;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      positions.push(x, height(r, angle), z);
      uvs.push(.5 + x / (radius * 2), .5 + z / (radius * 2));
      if (j < rings && i < segments) {
        const a = j * (segments + 1) + i;
        indices.push(a, a + 1, a + segments + 1, a + 1, a + segments + 2, a + segments + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function organicCube(seed: number, width: number, height: number, depth: number): THREE.BufferGeometry {
  const geometry = new RoundedBoxGeometry(width, height, depth, 4, Math.min(width, height, depth) * .14);
  const positions = geometry.getAttribute('position');
  const phase = seeded(seed)() * 10;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    // Continuous deformation preserves coincident face vertices and soft edges.
    const n = Math.sin(x * 16 + phase) * Math.cos(z * 13 - phase) * Math.sin(y * 15 + phase);
    positions.setXYZ(i, x * (1 + n * .075), y * (1 + n * .09), z * (1 + n * .075));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function leafGeometry(length = .28, width = .14): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const halfWidth = Math.pow(Math.sin(Math.PI * t), .8) * width / 2 * (1 + .08 * Math.sin(t * 80));
    for (let j = 0; j < 3; j++) {
      positions.push((j - 1) * halfWidth, Math.sin(t * Math.PI) * .045 - Math.abs(j - 1) * .018,
        t * length);
      uvs.push(j / 2, t);
      if (i < segments && j < 2) {
        const a = i * 3 + j;
        indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function mint(parent: THREE.Object3D, x: number, y: number, z: number, random: Random, count = 6): void {
  const green = new THREE.MeshPhysicalMaterial({ color: '#397b31', roughness: .66, side: THREE.DoubleSide, clearcoat: .12 });
  const vein = new THREE.MeshStandardMaterial({ color: '#91a454', roughness: .8 });
  const geometry = leafGeometry();
  for (let i = 0; i < count; i++) {
    const sprig = new THREE.Group();
    sprig.position.set(x + (random() - .5) * .11, y + i * .013, z + (random() - .5) * .1);
    sprig.rotation.set((random() - .5) * .35, i * 2.4 + random() * .3, (random() - .5) * .4);
    const size = .75 + random() * .45;
    sprig.scale.setScalar(size);
    parent.add(sprig);
    mesh(sprig, geometry, green);
    tube(sprig, [new THREE.Vector3(0, .005, 0), new THREE.Vector3(0, .05, .14), new THREE.Vector3(0, .002, .275)], .0025, vein, 12);
    for (let j = 1; j < 5; j++) {
      const t = j / 6;
      for (const side of [-1, 1]) tube(sprig, [
        new THREE.Vector3(0, Math.sin(t * Math.PI) * .045 + .002, t * .28),
        new THREE.Vector3(side * Math.sin(t * Math.PI) * .055, .025, t * .28 + .033),
      ], .0013, vein, 3);
    }
  }
}

function herbFlakes(parent: THREE.Object3D, random: Random, count: number, radius: number,
  height: (x: number, z: number) => number): void {
  const flakes = new THREE.InstancedMesh(leafGeometry(.034, .021),
    new THREE.MeshStandardMaterial({ color: '#486132', roughness: .9, side: THREE.DoubleSide }), count);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(random()) * radius, a = random() * TAU;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    transform.position.set(x, height(x, z), z);
    transform.rotation.set(random() * .6, random() * TAU, random() * .5);
    transform.scale.setScalar(.6 + random() * .9);
    transform.updateMatrix();
    flakes.setMatrixAt(i, transform.matrix);
    color.setHSL(.21 + random() * .07, .35, .12 + random() * .1);
    flakes.setColorAt(i, color);
  }
  flakes.castShadow = true;
  parent.add(flakes);
}

function butterChicken(root: THREE.Group): void {
  const random = seeded(104729);
  vessel(layer(root, 'Copper serving bowl', 0), true);
  const sauce = layer(root, 'Silky tomato and butter sauce', .32);
  const sauceMaterial = new THREE.MeshPhysicalMaterial({
    color: '#c95318', roughness: .26, metalness: 0, clearcoat: .6,
    clearcoatRoughness: .19, bumpMap: microtexture(22), bumpScale: .009,
  });
  const sauceHeight = (r: number, a: number) => .586 + .008 * Math.sin(r * 24 + a * 3) + .005 * Math.cos(a * 7 + r * 19);
  mesh(sauce, radialSurface(1.49, sauceHeight), sauceMaterial);
  const pieces = layer(root, 'Tandoori chicken', .78);
  const chickenMaterial = new THREE.MeshPhysicalMaterial({
    color: '#cf6b27', map: roastTexture(29), roughness: .43, clearcoat: .35,
    clearcoatRoughness: .26, bumpMap: microtexture(24), bumpScale: .017,
  });
  const geometries = Array.from({ length: 4 }, (_, i) => organicCube(i + 4, .42, .29, .37));
  const chickenTops: { x: number; z: number; y: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + .4) / 15) * 1.17;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const piece = mesh(pieces, geometries[i % 4], chickenMaterial, x, .635 + random() * .07, z);
    piece.rotation.set((random() - .5) * .6, random() * TAU, (random() - .5) * .5);
    piece.scale.set(.9 + random() * .32, .8 + random() * .35, .85 + random() * .3);
    chickenTops.push({ x, z, y: piece.position.y + .145 * piece.scale.y });
    // A glossy sauce collar hugs each submerged piece.
    const collar = mesh(sauce, new THREE.TorusGeometry(.22, .017, 6, 28), sauceMaterial, x, .59, z);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1, .83, .45);
  }
  const garnish = layer(root, 'Cream spiral and kasuri methi', 1.22);
  const cream = new THREE.MeshPhysicalMaterial({ color: '#ffe9ba', roughness: .25, clearcoat: .35 });
  const garnishHeight = (x: number, z: number) => {
    let y = .606;
    for (const piece of chickenTops) {
      const distance = ((x - piece.x) / .26) ** 2 + ((z - piece.z) / .23) ** 2;
      if (distance < 1.3) y = Math.max(y, .606 + (piece.y - .59) * Math.pow(Math.max(0, 1 - distance / 1.3), .22));
    }
    return y;
  };
  const spiral: THREE.Vector3[] = [];
  for (let i = 0; i <= 180; i++) {
    const t = i / 180, a = t * TAU * 2.1 + .3, r = .11 + t * 1.12;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    spiral.push(new THREE.Vector3(x, garnishHeight(x, z) + .008, z));
  }
  tube(garnish, spiral, .018, cream, 180);
  herbFlakes(garnish, random, 115, 1.29, (x, z) => garnishHeight(x, z) + .009);
  mint(garnish, -.27, garnishHeight(-.27, -.09) + .022, -.09, random, 5);
}

/** Pepper rings are extruded, lobed, hollow cross-sections, not solid blocks. */
function pepperGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  for (let i = 0; i <= 48; i++) {
    const a = i / 48 * TAU;
    const r = .22 * (1 + .15 * Math.cos(4 * a));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
    const innerAngle = -a;
    const innerR = .157 * (1 + .12 * Math.cos(4 * innerAngle));
    const hx = Math.cos(innerAngle) * innerR, hy = Math.sin(innerAngle) * innerR;
    if (!i) hole.moveTo(hx, hy); else hole.lineTo(hx, hy);
  }
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .11, bevelEnabled: true, bevelThickness: .015, bevelSize: .012, bevelSegments: 2, steps: 1 });
  geometry.translate(0, 0, -.055);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

function onionPetalGeometry(radius: number, arc: number): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [];
  const segments = 20;
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * arc - arc / 2;
    for (let j = 0; j < 2; j++) {
      positions.push(Math.sin(angle) * radius, (j - .5) * .21, Math.cos(angle) * radius);
      if (i < segments && j === 0) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function lime(parent: THREE.Object3D, x: number, y: number, z: number): void {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.set(.2, -.5, -.12);
  parent.add(group);
  const skin = new THREE.MeshPhysicalMaterial({ color: '#8b9b26', roughness: .58, bumpMap: microtexture(70), bumpScale: .012 });
  const pith = new THREE.MeshStandardMaterial({ color: '#fff1bc', roughness: .62 });
  const pulp = new THREE.MeshPhysicalMaterial({ color: '#d8df70', roughness: .38, clearcoat: .35 });
  mesh(group, new THREE.CylinderGeometry(.25, .25, .12, 48, 1, false, 0, Math.PI), skin);
  const cut = mesh(group, new THREE.CircleGeometry(.235, 48, 0, Math.PI), pith, 0, .064);
  cut.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const segment = mesh(group, new THREE.CircleGeometry(.212, 10, i / 5 * Math.PI + .035, Math.PI / 5 - .07), pulp, 0, .067);
    segment.rotation.x = -Math.PI / 2;
  }
}

function paneerTikka(root: THREE.Group): void {
  const random = seeded(130363);
  vessel(layer(root, 'Glazed ceramic platter', 0), false, true);
  const skewers = layer(root, 'Bamboo skewers', .22);
  const paneer = layer(root, 'Charred tandoori paneer', .7);
  const vegetables = layer(root, 'Roasted peppers and onion petals', 1.09);
  const garnish = layer(root, 'Fresh herbs and lime', 1.46);
  const bamboo = new THREE.MeshStandardMaterial({ color: '#a48048', roughness: .68 });
  const cheese = new THREE.MeshPhysicalMaterial({
    color: '#ffd18d', map: roastTexture(111), roughness: .57,
    bumpMap: microtexture(39), bumpScale: .016, clearcoat: .12,
  });
  const char = new THREE.MeshStandardMaterial({ color: '#45251a', roughness: .95 });
  const pepperMaterials = ['#963522', '#506b24', '#d99427'].map(color => new THREE.MeshPhysicalMaterial({
    color, roughness: .36, clearcoat: .42, clearcoatRoughness: .27,
    bumpMap: microtexture(90), bumpScale: .009,
  }));
  const onionMaterials = ['#e9c6cc', '#a66280', '#f5e0cb'].map(color => new THREE.MeshPhysicalMaterial({ color, roughness: .37, side: THREE.DoubleSide, clearcoat: .25 }));
  const cubes = Array.from({ length: 3 }, (_, i) => organicCube(70 + i, .45, .43, .44));
  const pepper = pepperGeometry();
  const charGeometry = new THREE.SphereGeometry(1, 7, 5);
  for (let row = 0; row < 3; row++) {
    const z = (row - 1) * .64;
    const stick = mesh(skewers, new THREE.CylinderGeometry(.019, .014, 3.18, 8), bamboo, .04, .39, z);
    stick.rotation.z = Math.PI / 2;
    for (let col = 0; col < 4; col++) {
      const x = (col - 1.5) * .66;
      const pieceGroup = new THREE.Group();
      pieceGroup.position.set(x, .456, z);
      pieceGroup.rotation.set((random() - .5) * .17, (random() - .5) * .3, (random() - .5) * .18);
      paneer.add(pieceGroup);
      mesh(pieceGroup, cubes[(row + col) % 3], cheese);
      // Broken grill marks follow the exposed top, with tiny char blisters.
      for (let stripe = 0; stripe < 3; stripe++) {
        const zz = (stripe - 1) * .108;
        tube(pieceGroup, [new THREE.Vector3(-.15, .216, zz), new THREE.Vector3(0, .226, zz + .017), new THREE.Vector3(.13, .214, zz + .01)], .007 + random() * .005, char, 8);
      }
      for (let k = 0; k < 5; k++) {
        const blister = mesh(pieceGroup, charGeometry, char, (random() - .5) * .34, .219, (random() - .5) * .33);
        blister.scale.set(.012 + random() * .026, .004, .009 + random() * .018);
        blister.rotation.y = random() * TAU;
      }
      if (col < 3) {
        const vegX = x + .325;
        const pepperRing = mesh(vegetables, pepper, pepperMaterials[(row + col) % 3], vegX, .446, z);
        pepperRing.rotation.x = random() * TAU;
        for (let shell = 0; shell < 3; shell++) {
          const petal = mesh(vegetables, onionPetalGeometry(.16 + shell * .017, 2.25), onionMaterials[shell], vegX + .025, .44, z);
          petal.rotation.set(.3, Math.PI / 2, .8 + row * .6);
        }
      }
    }
  }
  lime(garnish, 1.15, .255, .92);
  mint(garnish, -.93, .195, .95, random, 7);
  mint(garnish, .33, .69, 0, random, 4);
  // Fine red onion rings on the free edge of the platter.
  const onionRingMaterial = new THREE.MeshPhysicalMaterial({ color: '#c7879c', roughness: .36, clearcoat: .35 });
  for (let i = 0; i < 4; i++) {
    const onion = ring(garnish, .21 - i * .018, .009, .26 + i * .015, onionRingMaterial);
    onion.position.x = -.65 + i * .04;
    onion.position.z = -1.24;
    onion.rotation.z = .16;
  }
  herbFlakes(garnish, random, 70, 1.3, (x, z) => {
    const onPaneer = [-.64, 0, .64].some(row => Math.abs(z - row) < .21)
      && [-.99, -.33, .33, .99].some(col => Math.abs(x - col) < .21);
    return onPaneer ? .687 : .177 + Math.max(0, Math.hypot(x, z) - 1.15) * .17;
  });
}

function riceGeometry(): THREE.BufferGeometry {
  // Tapered, subtly bent basmati grains, with a longitudinal crease.
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    points.push(new THREE.Vector2(.014 * Math.pow(Math.sin(t * Math.PI), .68), (t - .5) * .125));
  }
  const geometry = new THREE.LatheGeometry(points, 7);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i), x = positions.getX(i);
    positions.setXYZ(i, x + .008 * Math.cos(y / .125 * Math.PI), y,
      positions.getZ(i) * .72);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function biryani(root: THREE.Group): void {
  const random = seeded(15485863);
  vessel(layer(root, 'Handmade biryani bowl', 0), false);
  const rice = layer(root, 'Saffron and white basmati rice', .57);
  const chicken = layer(root, 'Roasted chicken and whole spices', .96);
  const garnish = layer(root, 'Caramelized onions and mint', 1.42);
  const moundHeight = (r: number) => .65 + .48 * Math.pow(Math.max(0, 1 - (r / 1.49) ** 2), .85);
  mesh(rice, radialSurface(1.49, (r, a) => moundHeight(r) - .045 + .012 * Math.sin(a * 5 + r * 15)),
    new THREE.MeshStandardMaterial({ color: '#cba34e', roughness: .9 }));
  const count = 5800;
  const grains = new THREE.InstancedMesh(riceGeometry(), new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: .56, clearcoat: .12, clearcoatRoughness: .5,
  }), count);
  const transform = new THREE.Object3D();
  const ivory = new THREE.Color('#fff1c9'), saffron = new THREE.Color('#edaa28');
  const amber = new THREE.Color('#bf751e'), color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = random() * TAU, r = Math.sqrt(random()) * 1.46;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    transform.position.set(x, moundHeight(r) + (random() - .4) * .075, z);
    transform.rotation.set(Math.PI / 2 + (random() - .5) * .7, random() * TAU, (random() - .5) * .6);
    transform.scale.set(.8 + random() * .5, .76 + random() * .55, .85 + random() * .35);
    transform.updateMatrix();
    grains.setMatrixAt(i, transform.matrix);
    // Saffron follows irregular pockets, with white grains scattered through them.
    const pocket = Math.sin(x * 4 + .7) + Math.cos(z * 5 - x * 2);
    color.copy(random() > .42 + pocket * .19 ? ivory : saffron).lerp(amber, random() * .14);
    grains.setColorAt(i, color);
  }
  grains.instanceMatrix.needsUpdate = true;
  if (grains.instanceColor) grains.instanceColor.needsUpdate = true;
  grains.castShadow = true;
  grains.receiveShadow = true;
  grains.computeBoundingSphere();
  rice.add(grains);
  const roast = new THREE.MeshPhysicalMaterial({
    color: '#cf8b44', map: roastTexture(80), roughness: .48, clearcoat: .24,
    bumpMap: microtexture(84), bumpScale: .025,
  });
  const positions = [[-.79, -.33], [.67, -.38], [.32, .8], [-.52, .65]];
  positions.forEach(([x, z], i) => {
    const piece = mesh(chicken, organicCube(140 + i, .48, .31, .52), roast, x, moundHeight(Math.hypot(x, z)) + .075, z);
    piece.rotation.set(.12, i * 1.9, -.13);
    // Crisp, irregular folds in the tandoori crust.
    for (let k = 0; k < 3; k++) {
      const ridge = mesh(piece, organicCube(170 + k, .075, .042, .37), roast, (k - 1) * .12, .145, 0);
      ridge.rotation.y = .3;
    }
  });
  const onionMaterial = new THREE.MeshPhysicalMaterial({ color: '#71381b', roughness: .55, clearcoat: .14 });
  const goldenOnion = new THREE.MeshPhysicalMaterial({ color: '#b06b27', roughness: .5, clearcoat: .2 });
  for (let i = 0; i < 46; i++) {
    const a = random() * TAU, r = Math.sqrt(random()) * 1.3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = moundHeight(r) + .075;
    const curl = new THREE.Group();
    curl.position.set(x, y, z);
    curl.rotation.y = random() * TAU;
    garnish.add(curl);
    const points: THREE.Vector3[] = [];
    const bend = 1.7 + random() * 2.6;
    const size = .04 + random() * .08;
    for (let j = 0; j <= 14; j++) {
      const angle = j / 14 * bend;
      points.push(new THREE.Vector3(Math.cos(angle) * size, Math.sin(j / 14 * Math.PI) * .026,
        Math.sin(angle) * size * .68));
    }
    const strip = tube(curl, points, .012, i % 3 ? onionMaterial : goldenOnion, 14);
    strip.scale.y = .42;
  }
  const spiceMaterial = new THREE.MeshStandardMaterial({ color: '#624025', roughness: .88 });
  for (let i = 0; i < 8; i++) {
    const a = random() * TAU, r = .4 + random() * .8;
    const spice = mesh(chicken, organicCube(300 + i, .06, .04, .12), spiceMaterial,
      Math.cos(a) * r, moundHeight(r) + .08, Math.sin(a) * r);
    spice.rotation.y = random() * TAU;
  }
  mint(garnish, -.14, 1.25, -.14, random, 8);
  mint(garnish, .82, .98, .44, random, 4);
  herbFlakes(garnish, random, 80, 1.3, (x, z) => moundHeight(Math.hypot(x, z)) + .09);
}

/** Ingredient groups expose baseY and explodeOffset for the viewer or parent annotations. */
export function createFoodModel(id: string): THREE.Group {
  const root = new THREE.Group();
  root.name = FOOD_NAMES[id] ?? FOOD_NAMES.m1;
  root.userData.dishId = id;
  root.userData.layers = [] as FoodLayer[];
  if (id === 'm2') paneerTikka(root);
  else if (id === 'm4') biryani(root);
  else butterChicken(root);
  root.userData.radius = id === 'm2' ? 1.94 : 2.02;
  return root;
}

/** Disposes shared resources once, including instancing buffers and procedural textures. */
export function disposeFoodModel(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach(material => materials.add(material));
      if (object instanceof THREE.InstancedMesh) object.dispose();
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    material.dispose();
  }
  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => texture.dispose());
  root.removeFromParent();
  root.clear();
}
