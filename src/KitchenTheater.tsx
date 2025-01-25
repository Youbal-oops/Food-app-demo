import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './kitchen-theater.css';

interface Props { phase: number; progress: number; dishes: string[]; paused: boolean }
interface Inputs extends Props { heat: boolean; clocheOpen: boolean; toss: number; reset: number }
interface Theater { invalidate: () => void; dispose: () => void }

const names = ['THE PASS', 'THE PREPARATION', 'THE FLAME', 'THE FINISH', 'THE HANDOFF', 'YOUR TABLE'];
const titles = ['Into the kitchen.', 'Fresh beginnings.', 'Feel the flame.', 'A finishing touch.', 'Ready to roll.', 'Make yourself home.'];
const captions = ['A fresh ticket. A beautiful beginning.', 'Cut with care. Made with intention.', 'A little heat changes everything.', 'The details are the whole point.', 'Sealed with care. Sent with love.', 'Finally, the moment that matters.'];
const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// All visible objects are meshes. Canvas textures are used only for surface grain and printed paper.
function makeKitchen(host: HTMLDivElement, inputs: { current: Inputs }, unavailable: () => void, interact: (kind: 'pan' | 'lid') => void): Theater {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ede6d9');
  const geometries = new Map<string, THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const lights: THREE.Light[] = [];
  const disposables: (() => void)[] = [];
  let renderer: THREE.WebGLRenderer | undefined;
  let controls: OrbitControls | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let observer: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let raf = 0;
  let disposed = false;
  let visible = true;
  let contextLost = false;
  let lastTime = 0;
  let time = 0;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;
  const camera = new THREE.OrthographicCamera(-6, 6, 5, -5, .1, 80);
  let width = 1;
  let height = 1;
  let framing = 10.6;
  let userOrbit = false;
  let lastPhase = -1;
  let lastReset = inputs.current.reset;
  let lastToss = inputs.current.toss;
  let tossStart = -100;
  let phaseStart = 0;
  let arrivalStart = 0;
  let lidPosition = 0;
  let lastCloche = inputs.current.clocheOpen;
  let lastDishes = '';

  const physical = (color: string, options: THREE.MeshPhysicalMaterialParameters = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: .65, ...options });
    materials.add(m); return m;
  };
  const cream = physical('#e6dcc8', { roughness: .86 });
  const stone = physical('#f2eadc', { roughness: .45, clearcoat: .16 });
  const olive = physical('#404c38', { roughness: .42, clearcoat: .3 });
  const oliveDark = physical('#263325');
  const terracotta = physical('#b9694c');
  const brass = physical('#c5a366', { metalness: .82, roughness: .24 });
  const copper = physical('#b9754d', { metalness: .9, roughness: .27, clearcoat: .25 });
  const steel = physical('#b9c0b8', { metalness: .94, roughness: .23 });
  const black = physical('#20231f', { roughness: .35 });
  const oak = physical('#b88956', { roughness: .67 });
  const ceramic = physical('#fff5e5', { roughness: .21, clearcoat: .7, clearcoatRoughness: .24 });
  const green = physical('#526b35', { roughness: .53 });
  const leafGreen = physical('#668846', { roughness: .47, side: THREE.DoubleSide });
  const tomato = physical('#ce4e2d', { roughness: .35, clearcoat: .6 });
  const carrot = physical('#dc8e38', { roughness: .48 });
  const bread = physical('#dca95e', { roughness: .84 });
  const char = physical('#895730', { roughness: .9 });
  const food = physical('#d79243', { roughness: .42, clearcoat: .25 });
  const sauce = physical('#bc572d', { roughness: .3, clearcoat: .7 });
  const linen = physical('#ddccb0', { roughness: 1 });
  const paper = physical('#ead3ab', { roughness: .92 });
  const wine = physical('#762d23', { roughness: .19, clearcoat: 1 });
  const glass = physical('#dbe4ce', { metalness: .05, roughness: .1, transparent: true, opacity: .32, depthWrite: false });
  const glow = physical('#ffdf9b', { emissive: '#ffd186', emissiveIntensity: 2.5, roughness: .4 });

  function grain(kind: 'stone' | 'wood') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = kind === 'stone' ? '#f0e7d9' : '#bd955f'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 850; i++) {
      const x = seed(i + 1) * 256; const y = seed(i + 800) * 256;
      ctx.strokeStyle = kind === 'stone' ? `rgba(113,101,80,${.025 + seed(i) * .045})` : `rgba(74,44,21,${.02 + seed(i) * .08})`;
      ctx.lineWidth = .3 + seed(i + 9) * .9; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 12, y + 5, x + 30, y - 4, x + (kind === 'stone' ? 45 : 160), y + (kind === 'stone' ? 65 : 3)); ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 2); textures.add(texture); return texture;
  }
  stone.map = grain('stone') ?? null; oak.map = grain('wood') ?? null;

  function geometry(key: string, create: () => THREE.BufferGeometry) {
    if (!geometries.has(key)) geometries.set(key, create()); return geometries.get(key)!;
  }
  function mesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = scene, position: [number, number, number] = [0, 0, 0]) {
    const object = new THREE.Mesh(g, m); object.position.set(...position); object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  }
  function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene, radius = .035) {
    const r = Math.min(radius, w / 3, h / 3, d / 3);
    return mesh(geometry(`box${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r)), m, parent, [x, y, z]);
  }
  function cylinder(top: number, bottom: number, h: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene, segments = 32) {
    return mesh(geometry(`cyl${top},${bottom},${h},${segments}`, () => new THREE.CylinderGeometry(top, bottom, h, segments)), m, parent, [x, y, z]);
  }
  function sphere(r: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
    return mesh(geometry(`sphere${r}`, () => new THREE.SphereGeometry(r, 20, 12)), m, parent, [x, y, z]);
  }
  function ring(r: number, tube: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
    const object = mesh(geometry(`ring${r},${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 48)), m, parent, [x, y, z]); object.rotation.x = Math.PI / 2; return object;
  }
  function lathe(points: [number, number][], m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
    const key = `lathe${JSON.stringify(points)}`;
    return mesh(geometry(key, () => new THREE.LatheGeometry(points.map(([a, b]) => new THREE.Vector2(a, b)), 48)), m, parent, [x, y, z]);
  }
  function tube(points: [number, number, number][], radius: number, m: THREE.Material, parent: THREE.Object3D = scene) {
    const key = `tube${JSON.stringify(points)},${radius}`;
    return mesh(geometry(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 8, false)), m, parent);
  }
  function group(x = 0, y = 0, z = 0, parent: THREE.Object3D = scene) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
  }
  function instances(g: THREE.BufferGeometry, m: THREE.Material, count: number, position: (i: number, obj: THREE.Object3D) => void, parent: THREE.Object3D = scene, colors?: (i: number) => THREE.Color) {
    const inst = new THREE.InstancedMesh(g, m, count); const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) { dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); position(i, dummy); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); if (colors) inst.setColorAt(i, colors(i)); }
    inst.castShadow = inst.receiveShadow = true; parent.add(inst); return inst;
  }
  function leaf(x: number, y: number, z: number, scale = 1, parent: THREE.Object3D = scene, angle = 0) {
    const g = group(x, y, z, parent); g.rotation.y = angle;
    const l = sphere(.1, leafGreen, 0, .02, 0, g); l.scale.set(.65 * scale, .11 * scale, 1.55 * scale); l.rotation.z = .18;
    tube([[0, .035, -.11 * scale], [0, .047, 0], [0, .035, .12 * scale]], .006 * scale, green, g); return g;
  }
  function herbPot(x: number, y: number, z: number, s = 1) {
    const p = group(x, y, z); p.scale.setScalar(s);
    lathe([[0, 0], [.17, 0], [.21, .3], [.23, .31], [.23, .35], [.2, .35], [.18, .05], [0, .05]], terracotta, 0, 0, 0, p);
    cylinder(.18, .18, .02, char, 0, .32, 0, p);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4; const h = .47 + seed(i) * .32;
      tube([[0, .31, 0], [Math.cos(a) * .07, h - .08, Math.sin(a) * .07], [Math.cos(a) * .18, h, Math.sin(a) * .18]], .01, green, p);
      const l = leaf(Math.cos(a) * .16, h, Math.sin(a) * .16, .95, p, -a); l.rotation.z = .3;
      leaf(Math.cos(a) * .08, h - .14, Math.sin(a) * .08, .8, p, a);
    }
  }
  function plate(x: number, y: number, z: number, parent: THREE.Object3D = scene, s = 1) {
    const g = group(x, y, z, parent); g.scale.setScalar(s);
    lathe([[0, .025], [.4, .025], [.49, .04], [.65, .095], [.69, .12], [.69, .14], [.65, .155], [.49, .08], [0, .07]], ceramic, 0, 0, 0, g);
    ring(.654, .008, brass, 0, .147, 0, g); return g;
  }
  function meal(parent: THREE.Object3D) {
    const g = group(0, .08, 0, parent);
    cylinder(.425, .41, .035, sauce, 0, .025, 0, g);
    const chunks = instances(geometry('food-chunk', () => new RoundedBoxGeometry(.16, .12, .15, 3, .035)), food, 17, (i, o) => {
      const a = i * 2.399; const r = .32 * Math.sqrt((i + .5) / 17);
      o.position.set(Math.cos(a) * r, .07 + seed(i + 54) * .035, Math.sin(a) * r); o.rotation.set(seed(i) * .25, a, seed(i + 4) * .2); o.scale.setScalar(.85 + seed(i + 22) * .3);
    }, g);
    for (let i = 0; i < 7; i++) leaf(Math.cos(i * 2.4) * .27, .17, Math.sin(i * 2.4) * .27, .65, g, i);
    // Cream is a real curved tube laid on top of the sauce.
    tube([[-.27, .135, .12], [-.18, .16, -.07], [.02, .15, -.18], [.22, .155, -.03], [.12, .16, .15], [-.05, .155, .08]], .011, ceramic, g);
    const rice = riceGrains(g, .38, 180); rice.visible = false;
    return { group: g, chunks, rice };
  }
  function riceGrains(parent: THREE.Object3D, radius: number, count: number) {
    return instances(geometry('rice-kernel', () => new THREE.SphereGeometry(.017, 8, 5)), bread, count, (i, o) => {
      const a = i * 2.399; const r = radius * Math.sqrt(seed(i + 480));
      o.position.set(Math.cos(a) * r, .08 + (1 - r / radius) * .12 + seed(i + 820) * .055, Math.sin(a) * r);
      o.rotation.y = a; o.rotation.z = (seed(i + 500) - .5) * .6; o.scale.set(.53, .45, 1.8);
    }, parent, i => new THREE.Color(i % 8 === 0 ? '#d18b33' : i % 3 === 0 ? '#f3d39a' : '#f1dfbb'));
  }

  const dispose = () => {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf); raf = 0;
    observer?.disconnect(); resizeObserver?.disconnect(); disposables.forEach(fn => fn()); controls?.dispose();
    // Sets avoid double-disposing the shared, cached geometry and materials.
    scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    lights.forEach(l => { if (l instanceof THREE.DirectionalLight || l instanceof THREE.SpotLight || l instanceof THREE.PointLight) l.shadow.dispose(); });
    environment?.dispose(); scene.clear(); renderer?.renderLists.dispose(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
  };

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.23;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'kt-canvas';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D kitchen. Drag to orbit. Click the copper pan to toss, or the table lid to serve.');
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; scene.environmentIntensity = .55; room.dispose(); pmrem.dispose();

    const hemi = new THREE.HemisphereLight('#fff1d7', '#7b7763', 2.25); scene.add(hemi); lights.push(hemi);
    const sun = new THREE.DirectionalLight('#ffe6bc', 4.2); sun.position.set(-3, 10, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -7; sun.shadow.camera.right = 7; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7; sun.shadow.camera.far = 25;
    sun.shadow.normalBias = .035; sun.shadow.bias = -.0003; sun.shadow.blurSamples = 6; scene.add(sun); lights.push(sun);
    const rim = new THREE.DirectionalLight('#e4efe1', 1.8); rim.position.set(4, 6, -3); scene.add(rim); lights.push(rim);
    const cookingLight = new THREE.PointLight('#ff9a43', 0, 2.8, 2); cookingLight.position.set(0, 1.75, .25); scene.add(cookingLight); lights.push(cookingLight);

    // Architectural shell: a cutaway atelier on a chamfered stone plinth.
    box(10, .3, 8.4, cream, 0, -.27, .35, scene, .14);
    box(10.1, .07, 8.5, stone, 0, -.43, .35, scene, .03);
    box(9.7, .07, 8.1, cream, 0, -.065, .35);
    const floorTiles = instances(geometry('floor-tile', () => new RoundedBoxGeometry(.59, .045, .59, 2, .012)), terracotta, 16 * 13, (i, o) => {
      const x = i % 16; const z = Math.floor(i / 16); o.position.set((x - 7.5) * .6, -.015, (z - 6) * .6 + .35);
    }, scene, i => new THREE.Color(['#b97357', '#be8063', '#c68b6b', '#b3785c', '#cf9375'][Math.floor(seed(i) * 5)]));
    floorTiles.castShadow = false;
    box(9.85, 3.7, .18, cream, 0, 1.85, -3.55, scene, .04);
    box(.18, 3.7, 5.9, cream, -4.85, 1.85, -.6, scene, .04);
    box(9.65, .14, .09, oak, 0, .14, -3.41);
    box(.09, .14, 5.7, oak, -4.73, .14, -.6);
    box(9.9, .1, .25, stone, 0, 3.7, -3.55);
    box(.25, .1, 5.95, stone, -4.85, 3.7, -.6);
    // Individually glazed backsplash tiles, with real grout gaps.
    const wallTiles = instances(geometry('wall-tile', () => new RoundedBoxGeometry(.39, .19, .04, 2, .01)), ceramic, 24 * 7, (i, o) => {
      o.position.set(-4.6 + (i % 24) * .4 + (Math.floor(i / 24) % 2) * .025, 1.35 + Math.floor(i / 24) * .2, -3.435);
    }, scene, i => new THREE.Color(['#e8dfcb', '#f4ebda', '#e0d8c2'][i % 3]));
    wallTiles.castShadow = false;

    // Arched glazed recess; thick geometry frames it like a masonry window.
    const arch = new THREE.Shape(); arch.moveTo(-.78, 0); arch.lineTo(.78, 0); arch.lineTo(.78, 1.32); arch.absarc(0, 1.32, .78, 0, Math.PI, false); arch.lineTo(-.78, 0);
    const windowMaterial = physical('#a4b49c', { roughness: .2, emissive: '#b9cbae', emissiveIntensity: .25 });
    const archMesh = mesh(geometry('arch', () => new THREE.ExtrudeGeometry(arch, { depth: .025, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 32 })), windowMaterial, scene, [-3.3, 1.3, -3.405]);
    archMesh.castShadow = false;
    const archPoints: [number, number, number][] = [[-4.1, 1.29, -3.32], [-4.1, 2.63, -3.32]];
    for (let i = 0; i <= 24; i++) { const a = Math.PI - i / 24 * Math.PI; archPoints.push([-3.3 + Math.cos(a) * .8, 2.63 + Math.sin(a) * .8, -3.32]); }
    archPoints.push([-2.5, 1.29, -3.32]); tube(archPoints, .065, stone);
    box(1.75, .12, .32, stone, -3.3, 1.29, -3.25);
    box(.035, 1.99, .04, brass, -3.3, 2.29, -3.32);
    box(1.55, .035, .04, brass, -3.3, 2.55, -3.32);
    box(1.55, .035, .04, brass, -3.3, 1.86, -3.32);

    // Rear joinery: raised-panel dark olive cupboards and brass hardware.
    box(9.1, 1.12, .95, oliveDark, 0, .62, -2.9);
    box(9.4, .15, 1.13, stone, 0, 1.25, -2.87, scene, .05);
    for (let i = 0; i < 10; i++) {
      const x = -4.08 + i * .91;
      box(.85, .93, .075, olive, x, .68, -2.386);
      box(.69, .74, .025, oliveDark, x, .68, -2.335);
      box(.62, .67, .025, olive, x, .68, -2.315);
      box(.26, .025, .04, brass, x, 1.015, -2.285, scene, .012);
    }
    box(8.98, .12, .08, black, 0, .12, -2.39);
    // Sink, inset basin, arched brass tap and a ribbed drainboard.
    box(1.28, .035, .74, steel, -3.22, 1.337, -2.82, scene, .08);
    box(.94, .018, .57, oliveDark, -3.26, 1.36, -2.83, scene, .08);
    box(.79, .016, .42, steel, -3.26, 1.37, -2.83, scene, .07);
    cylinder(.065, .065, .016, black, -3.26, 1.386, -2.83);
    tube([[-3.27, 1.35, -3.17], [-3.27, 1.86, -3.17], [-3.27, 2.01, -2.98], [-3.27, 1.88, -2.77]], .035, brass);
    cylinder(.067, .067, .07, brass, -3.27, 1.39, -3.17);
    box(.2, .03, .03, brass, -3.03, 1.47, -3.16);
    for (let i = 0; i < 8; i++) box(.022, .02, .5, steel, -2.55 + i * .044, 1.345, -2.85);
    herbPot(-4.02, 1.33, -3.01, .8);

    // Floating oak shelves, bottles, spice jars, stacked porcelain and a cookbook.
    for (const y of [2.32, 3.03]) {
      box(3.7, .095, .39, oak, 2.7, y, -3.17);
      for (const x of [1.16, 4.18]) { box(.035, .24, .035, brass, x, y - .15, -3.36); box(.035, .035, .31, brass, x, y - .065, -3.22); }
    }
    for (let i = 0; i < 8; i++) {
      const x = 1.15 + i * .39; const y = i < 4 ? 2.37 : 3.08;
      const body = i % 3 === 0 ? terracotta : i % 3 === 1 ? green : paper;
      lathe([[0, 0], [.1, 0], [.11, .05], [.105, .28 + (i % 2) * .07], [.07, .32 + (i % 2) * .07], [0, .32 + (i % 2) * .07]], body, x, y, -3.15);
      cylinder(.09, .09, .035, oak, x, y + .34 + (i % 2) * .07, -3.15);
      box(.125, .1, .013, cream, x, y + .17, -3.04, scene, .006);
      box(.065, .012, .014, olive, x, y + .18, -3.027, scene, .003);
    }
    for (let i = 0; i < 4; i++) plate(3.08, 2.37 + i * .05, -3.15, scene, .38);
    for (let i = 0; i < 3; i++) { const b = box(.09, .37 + i * .035, .25, [terracotta, olive, paper][i], 3.67 + i * .12, 2.59, -3.16); b.rotation.z = i === 2 ? -.13 : 0; }
    herbPot(1, 3.08, -3.16, .62);
    for (let i = 0; i < 2; i++) {
      lathe([[0, 0], [.115, 0], [.13, .12], [.115, .22], [.05, .27], [.05, .4], [0, .4]], olive, -1.73 + i * .35, 1.34, -3.02);
      cylinder(.055, .055, .06, brass, -1.73 + i * .35, 1.76, -3.02);
    }

    // Cookware rail: hooks, a copper sauté pan, a stockpot lid, whisk and ladle.
    tube([[-1.76, 2.5, -3.2], [.44, 2.5, -3.2]], .027, brass);
    for (let i = 0; i < 5; i++) {
      const x = -1.55 + i * .43;
      tube([[x, 2.54, -3.2], [x, 2.56, -3.12], [x, 2.42, -3.08]], .012, brass);
      if (i < 2) {
        const p = group(x, 2.06, -3.05); p.rotation.x = Math.PI / 2;
        lathe([[0, 0], [.21, 0], [.26, .055], [.28, .09], [.265, .105], [.235, .055], [0, .018]], i === 0 ? copper : steel, 0, 0, 0, p);
        box(.065, .035, .34, black, 0, .035, -.39, p);
      } else if (i === 2) {
        tube([[x, 2.42, -3.08], [x, 1.96, -3.08]], .018, brass);
        const bowl = sphere(.1, brass, x, 1.9, -3.06); bowl.scale.set(1, 1.3, .36);
      } else if (i === 3) {
        box(.04, .39, .045, oak, x, 2.22, -3.06);
        for (let j = 0; j < 4; j++) { const a = j * Math.PI / 4; tube([[x, 2.05, -3.06], [x + Math.cos(a) * .065, 1.88, -3.06 + Math.sin(a) * .065], [x, 1.77, -3.06], [x - Math.cos(a) * .065, 1.88, -3.06 - Math.sin(a) * .065], [x, 2.05, -3.06]], .006, steel); }
      } else { box(.055, .35, .025, oak, x, 2.23, -3.05); box(.13, .16, .025, oak, x, 1.985, -3.05); }
    }

    // Working island, fluted oak end panels, recessed oven and warm marble top.
    box(5.75, 1.12, 1.85, oliveDark, 0, .66, .2, scene, .075);
    box(5.95, .16, 2.06, stone, 0, 1.3, .2, scene, .065);
    box(5.6, .1, 1.68, black, 0, .105, .2);
    for (let i = 0; i < 4; i++) {
      const x = -2.1 + i * 1.4;
      box(1.31, .98, .06, olive, x, .69, 1.157);
      box(1.14, .78, .025, oliveDark, x, .69, 1.199);
      box(1.07, .71, .026, olive, x, .69, 1.22);
      box(.36, .03, .055, brass, x, 1.025, 1.263, scene, .013);
    }
    for (const x of [-2.894, 2.894]) for (let i = 0; i < 16; i++) cylinder(.021, .021, .97, oak, x, .68, -.6 + i * .1, scene, 8);
    box(1.08, .66, .055, black, -.05, .6, 1.27, scene, .06);
    box(.85, .43, .012, physical('#343e35', { metalness: .3, roughness: .15, clearcoat: 1 }), -.05, .59, 1.306, scene, .035);
    box(.83, .035, .095, brass, -.05, .9, 1.345);
    for (const x of [-.42, .31]) { const knob = cylinder(.065, .065, .042, steel, x, 1.045, 1.313); knob.rotation.x = Math.PI / 2; }
    // A folded striped chef's cloth, modeled with soft beveled layers.
    const towel = box(.45, .018, .69, linen, -2.33, 1.407, .92); towel.rotation.y = -.13;
    box(.45, .28, .022, linen, -2.3, 1.26, 1.252);
    for (let i = 0; i < 3; i++) box(.018, .25, .026, terracotta, -2.46 + i * .065, 1.265, 1.267);

    // Preparation: end-grain board, chef's knife, cut cucumber, tomato and roots.
    const prep = group(-1.85, 1.39, .27); prep.name = 'prep-station';
    box(1.3, .065, 1.04, oak, 0, .04, 0, prep, .075);
    box(.13, .025, .28, oak, -.7, .04, .12, prep, .035);
    for (let i = 0; i < 8; i++) box(.009, .002, .9, char, -.54 + i * .16, .075, 0, prep, .001);
    const cucumber = cylinder(.105, .105, .48, green, -.03, .19, -.04, prep); cucumber.rotation.z = Math.PI / 2;
    const cucumberInside = physical('#c6d79a', { roughness: .61 });
    for (let i = 0; i < 6; i++) {
      const s = cylinder(.104, .104, .035, green, -.34 - i * .034, .12, .12 + i * .015, prep); s.rotation.z = Math.PI / 2 - .16;
      const inside = cylinder(.083, .083, .037, cucumberInside, -.34 - i * .034, .12, .12 + i * .015, prep); inside.rotation.copy(s.rotation);
      for (let j = 0; j < 3; j++) sphere(.008, ceramic, -.36 - i * .034, .127 + Math.cos(j * 2.1) * .045, .12 + i * .015 + Math.sin(j * 2.1) * .045, prep);
    }
    const knife = group(-.23, .23, -.075, prep); knife.name = 'chef-knife';
    const bladeShape = new THREE.Shape(); bladeShape.moveTo(-.32, 0); bladeShape.lineTo(.22, 0); bladeShape.lineTo(.27, .19); bladeShape.lineTo(-.26, .19); bladeShape.quadraticCurveTo(-.33, .11, -.32, 0);
    const blade = mesh(geometry('knife-blade', () => new THREE.ExtrudeGeometry(bladeShape, { depth: .012, bevelEnabled: true, bevelSegments: 2, bevelSize: .006, bevelThickness: .004, steps: 1 })), steel, knife);
    blade.position.z = -.007;
    box(.35, .07, .066, oliveDark, .43, .15, 0, knife, .025);
    for (const x of [.34, .45, .54]) { const rivet = cylinder(.009, .009, .069, brass, x, .15, 0, knife, 8); rivet.rotation.x = Math.PI / 2; }
    for (let i = 0; i < 3; i++) { sphere(.11, tomato, .3 + i * .1, .18, -.3 + i * .1, prep); leaf(.3 + i * .1, .29, -.3 + i * .1, .5, prep, i); }
    const root = cylinder(.05, .095, .43, carrot, .24, .13, .33, prep); root.rotation.z = Math.PI / 2; root.rotation.y = -.2;
    for (let i = 0; i < 3; i++) leaf(.46, .14, .3 + i * .045, .75, prep, .7 + i * .4);
    const onion = sphere(.115, paper, .49, .17, .02, prep); onion.scale.set(1, .8, 1); cylinder(.025, .01, .035, char, .49, .27, .02, prep);
    // Small mis-en-place bowls of salt, spice and chopped herbs.
    for (let i = 0; i < 3; i++) {
      lathe([[0, 0], [.1, 0], [.15, .12], [.16, .15], [.14, .15], [.09, .035], [0, .03]], ceramic, -2.3 + i * .37, 1.39, -.54);
      cylinder(.117, .08, .035, [cream, carrot, green][i], -2.3 + i * .37, 1.49, -.54);
    }

    // Four gas rings, cast iron trivets, copper pan and a working burner.
    box(1.49, .055, 1.3, black, -.02, 1.411, .2, scene, .04);
    const flames = group(0, 1.475, .47);
    const flameMaterial = physical('#ffbf53', { emissive: '#ff7d27', emissiveIntensity: 2, transparent: true, opacity: .85, depthWrite: false });
    for (const x of [-.38, .37]) for (const z of [-.16, .52]) {
      cylinder(.22, .22, .032, steel, x, 1.451, z);
      ring(.16, .018, black, x, 1.48, z);
      for (let j = 0; j < 4; j++) { const a = j * Math.PI / 2; const trivet = box(.035, .065, .2, black, x + Math.sin(a) * .18, 1.496, z + Math.cos(a) * .18); trivet.rotation.y = a; }
    }
    const flameMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8; const f = sphere(.045, flameMaterial, Math.cos(a) * .34, .055, Math.sin(a) * .34, flames); f.scale.set(.63, 2.5, .63); flameMeshes.push(f);
      const blue = physical('#70b9ee', { emissive: '#298de6', emissiveIntensity: 2.3, roughness: .45 });
      const core = sphere(.026, blue, Math.cos(a) * .34, .012, Math.sin(a) * .34, flames); core.scale.set(.7, 1.7, .7);
    }
    const pan = group(0, 1.535, .47); pan.name = 'copper-pan';
    lathe([[0, 0], [.36, 0], [.45, .025], [.55, .12], [.57, .18], [.565, .2], [.54, .2], [.51, .13], [.43, .055], [0, .05]], copper, 0, 0, 0, pan);
    lathe([[0, .051], [.42, .051], [.5, .13], [.539, .198]], black, 0, 0, 0, pan);
    ring(.565, .012, brass, 0, .198, 0, pan);
    box(.2, .052, .09, copper, .62, .155, 0, pan);
    const handle = box(.65, .072, .12, oliveDark, 1, .2, 0, pan, .045); handle.rotation.z = .1;
    for (const x of [.81, 1.05]) cylinder(.016, .016, .08, brass, x, .206, 0, pan, 12);
    const panFood = group(0, .055, 0, pan);
    cylinder(.435, .41, .035, sauce, 0, .023, 0, panFood);
    const flyingFood: { mesh: THREE.Mesh; x: number; y: number; z: number; angle: number }[] = [];
    for (let i = 0; i < 19; i++) {
      const a = i * 2.399; const r = .38 * Math.sqrt((i + .5) / 19); const x = Math.cos(a) * r; const z = Math.sin(a) * r; const y = .055 + seed(i + 31) * .04;
      const m = box(.145, .11, .14, i % 4 === 0 ? tomato : food, x, y, z, panFood, .03); m.rotation.y = a; flyingFood.push({ mesh: m, x, y, z, angle: a });
      if (i % 4 === 0) leaf(x, .125, z, .7, panFood, a);
    }
    const panRice = riceGrains(panFood, .38, 180); panRice.visible = false;
    // Fine translucent steam is volumetric mesh geometry, never a billboard.
    const steamMaterial = physical('#f7f5e5', { transparent: true, opacity: .045, depthWrite: false, roughness: 1 });
    const steam = group(0, 1.9, .47); steam.name = 'cooking-steam'; const steamPuffs: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) { const puff = sphere(.095, steamMaterial, 0, 0, 0, steam); puff.castShadow = puff.receiveShadow = false; steamPuffs.push(puff); }

    // Suspended sculptural hood; open front reveals the working island.
    box(1.36, .1, 1.05, brass, -.05, 2.88, .08, scene, .04);
    box(1.48, .38, 1.15, cream, -.05, 3.12, .08, scene, .07);
    box(.65, .48, .56, cream, -.05, 3.54, -.01, scene, .04);
    box(1.27, .025, .83, oliveDark, -.05, 2.817, .08);
    for (let i = 0; i < 8; i++) box(.8, .02, .018, steel, -.05, 2.798, -.25 + i * .09);
    for (const x of [-.5, .4]) cylinder(.05, .05, .018, glow, x, 2.8, .39);
    const hoodLight = new THREE.PointLight('#ffe3aa', 3.5, 4, 2); hoodLight.position.set(-.05, 2.72, .16); scene.add(hoodLight); lights.push(hoodLight);
    for (const x of [-2.3, 2.65]) {
      cylinder(.009, .009, .52, black, x, 3.78, .22, scene, 8);
      lathe([[0, 0], [.34, 0], [.3, .14], [.2, .29], [.055, .36], [0, .36]], olive, x, 3.18, .22);
      cylinder(.29, .29, .015, glow, x, 3.177, .22);
      const light = new THREE.PointLight('#ffd39a', 5, 4, 2); light.position.set(x, 3.11, .22); scene.add(light); lights.push(light);
    }

    // The pass: porcelain, warm flatbread, a ramekin, oil and finishing herbs.
    const plating = plate(1.98, 1.395, .38);
    const platedMeal = meal(plating);
    plate(2.37, 1.399, -.52, scene, .58);
    const naan = sphere(.22, bread, 2.38, 1.525, -.51); naan.scale.set(1, .16, 1.25); naan.rotation.y = .4;
    for (let i = 0; i < 12; i++) { const a = i * 2.4; const r = .17 * seed(i + 50); const spot = sphere(.018 + seed(i) * .012, char, 2.38 + Math.cos(a) * r, 1.558, -.51 + Math.sin(a) * r); spot.scale.y = .11; }
    lathe([[0, 0], [.09, 0], [.115, .18], [.11, .2], [.095, .2], [.085, .03], [0, .03]], ceramic, 1.55, 1.39, -.46);
    cylinder(.085, .085, .01, green, 1.55, 1.565, -.46);
    const garnish = group(1.97, 1.68, .38);
    for (let i = 0; i < 5; i++) leaf(Math.cos(i * 2.4) * .25, 0, Math.sin(i * 2.4) * .23, .7, garnish, i * 2);
    herbPot(2.75, 1.39, -.61, .65);
    cylinder(.08, .095, .32, oliveDark, 1.16, 1.55, -.5);
    cylinder(.028, .028, .09, brass, 1.16, 1.745, -.5);
    tube([[1.16, 1.785, -.5], [1.22, 1.81, -.5], [1.29, 1.79, -.5]], .014, brass);

    // Ticket is a textured physical sheet clipped to the pass rail.
    const ticketGroup = group(-.15, 1.37, -2.76); ticketGroup.rotation.x = -.2;
    const ticketCanvas = document.createElement('canvas'); ticketCanvas.width = 384; ticketCanvas.height = 512;
    const ticketTexture = new THREE.CanvasTexture(ticketCanvas); ticketTexture.colorSpace = THREE.SRGBColorSpace; textures.add(ticketTexture);
    const ticketMaterial = physical('#fff9e9', { map: ticketTexture, roughness: .94, side: THREE.DoubleSide });
    const ticket = box(.64, .87, .012, ticketMaterial, 0, .61, 0, ticketGroup, .008);
    box(.14, .09, .042, brass, 0, 1.05, .008, ticketGroup, .01);
    tube([[-.6, 1.1, -.02], [.6, 1.1, -.02]], .017, brass, ticketGroup);
    const bell = group(.62, 1.33, -2.62);
    cylinder(.2, .21, .035, black, 0, .025, 0, bell);
    lathe([[0, .035], [.19, .035], [.175, .12], [.11, .2], [0, .22]], brass, 0, 0, 0, bell);
    cylinder(.025, .025, .04, brass, 0, .24, 0, bell); sphere(.038, brass, 0, .27, 0, bell);

    // Packing station: rounded kraft carton with a hinged lid, paper bag and seal.
    const packing = group(2.85, 1.34, -2.86);
    box(1.24, .04, .82, oak, -.13, .02, .1, packing, .04);
    const carton = group(-.35, .045, .15, packing);
    box(.72, .04, .6, paper, 0, .03, 0, carton);
    for (const x of [-.345, .345]) box(.03, .21, .6, paper, x, .135, 0, carton);
    for (const z of [-.285, .285]) box(.72, .21, .03, paper, 0, .135, z, carton);
    cylinder(.235, .235, .095, sauce, 0, .115, 0, carton);
    const packingLid = group(0, .24, -.3, carton); packingLid.name = 'packing-lid';
    box(.76, .045, .64, paper, 0, .02, .3, packingLid, .025);
    box(.08, .008, .6, terracotta, 0, .049, .3, packingLid, .003);
    const seal = cylinder(.065, .065, .007, cream, 0, .057, .3, packingLid); seal.rotation.y = .2;
    const bag = group(.62, 0, -.04, packing);
    box(.52, .73, .36, terracotta, 0, .365, 0, bag, .025);
    box(.48, .025, .34, paper, 0, .74, 0, bag);
    for (const z of [-.12, .12]) tube([[-.15, .72, z], [-.15, .95, z], [0, 1.015, z], [.15, .95, z], [.15, .72, z]], .017, paper, bag);
    box(.33, .23, .01, cream, 0, .43, .187, bag, .015);
    box(.2, .025, .012, olive, 0, .46, .199, bag);
    box(.12, .015, .012, terracotta, 0, .4, .199, bag);
    for (let i = 0; i < 3; i++) box(.48, .035, .35, paper, 1.24, .03 + i * .04, .04, packing, .015);

    // Dining alcove: travertine table, upholstered chairs, water and candlelight.
    const dining = group(2.96, 0, 2.79);
    cylinder(.95, 1.02, .11, stone, 0, 1.03, 0, dining, 64);
    cylinder(.18, .27, .91, brass, 0, .49, 0, dining);
    cylinder(.49, .51, .065, oliveDark, 0, .06, 0, dining);
    const runner = box(1.5, .012, .44, linen, 0, 1.092, 0, dining, .018); runner.rotation.y = -.28;
    function chair(x: number, z: number, a: number) {
      const g = group(x, 0, z, dining); g.rotation.y = a;
      box(.66, .12, .61, olive, 0, .55, 0, g, .1);
      box(.69, .49, .11, olive, 0, .83, .29, g, .08);
      for (const cx of [-.25, .25]) for (const cz of [-.22, .22]) { const leg = cylinder(.019, .026, .51, brass, cx, .27, cz, g, 12); leg.rotation.z = cx > 0 ? -.08 : .08; }
      tube([[-.3, .64, .29], [-.32, .97, .29], [0, 1.07, .29], [.32, .97, .29], [.3, .64, .29]], .017, brass, g);
    }
    chair(-1.2, .22, -Math.PI / 2); chair(.9, -.9, Math.PI / 4);
    const servedPlate = plate(0, 1.105, .03, dining, .86); servedPlate.name = 'served-plate'; const servedMeal = meal(servedPlate);
    const lid = group(0, .16, 0, servedPlate); lid.name = 'table-lid';
    lathe([[0, .56], [.08, .555], [.22, .51], [.4, .4], [.55, .22], [.66, .065], [.67, .035], [.65, .02], [.62, .05], [.52, .21], [.38, .38], [.2, .49], [0, .525]], steel, 0, 0, 0, lid);
    ring(.655, .02, brass, 0, .036, 0, lid);
    cylinder(.02, .025, .055, brass, 0, .583, 0, lid); sphere(.065, brass, 0, .639, 0, lid).scale.set(1, .45, 1);
    const napkin = box(.23, .025, .5, olive, -.62, 1.119, .08, dining, .02); napkin.rotation.y = -.15;
    ring(.085, .012, brass, -.62, 1.14, .08, dining).rotation.x = 0;
    for (const x of [-.79, .74]) {
      box(.018, .013, .41, brass, x, 1.123, .05, dining, .005);
      if (x < 0) for (let i = 0; i < 4; i++) box(.008, .01, .08, brass, x - .028 + i * .018, 1.123, -.17, dining, .003);
      else { const spoon = sphere(.052, brass, x, 1.128, -.16, dining); spoon.scale.set(.7, .13, 1.2); }
    }
    lathe([[0, 0], [.09, 0], [.11, .02], [.12, .3], [.115, .31], [.105, .31], [.095, .035], [0, .035]], glass, .55, 1.1, -.4, dining);
    cylinder(.1, .09, .15, physical('#c3d2bb', { transparent: true, opacity: .42, roughness: .1, depthWrite: false }), .55, 1.19, -.4, dining);
    cylinder(.09, .12, .08, brass, -.39, 1.14, -.49, dining);
    cylinder(.036, .036, .21, brass, -.39, 1.28, -.49, dining);
    cylinder(.065, .065, .22, cream, -.39, 1.485, -.49, dining);
    const candleFlame = sphere(.026, glow, -.39, 1.628, -.49, dining); candleFlame.scale.set(.65, 2, .65);
    const candleLight = new THREE.PointLight('#ffdca0', 1.2, 2, 2); candleLight.position.set(2.57, 1.65, 2.3); scene.add(candleLight); lights.push(candleLight);
    // Sideboard espresso corner and a wool kitchen runner finish the lived-in room.
    box(.73, .07, 1.7, linen, -3.9, .035, .56, scene, .06);
    for (let i = 0; i < 11; i++) box(.58, .006, .013, terracotta, -3.9, .074, -.17 + i * .145);
    box(.62, .53, .41, olive, -4.02, 1.605, -2.77, scene, .045);
    box(.48, .16, .12, black, -4.02, 1.495, -2.52);
    cylinder(.05, .05, .018, brass, -3.86, 1.74, -2.545).rotation.x = Math.PI / 2;
    lathe([[0, 0], [.075, 0], [.1, .13], [.1, .16], [.085, .16], [.06, .025], [0, .025]], ceramic, -4.01, 1.36, -2.43);
    const mugHandle = ring(.04, .009, ceramic, -3.91, 1.45, -2.43); mugHandle.rotation.set(0, Math.PI / 2, 0);
    cylinder(.082, .08, .006, wine, -4.01, 1.507, -2.43);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = false; controls.rotateSpeed = .65;
    controls.minPolarAngle = .48; controls.maxPolarAngle = 1.3;
    controls.minAzimuthAngle = -.18; controls.maxAzimuthAngle = 1.43;
    controls.minZoom = .78; controls.maxZoom = 1.65; controls.zoomSpeed = .65;
    controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

    const views = [
      { target: [0, 1.2, .05], offset: [10, 9, 12], size: 10.6 },
      { target: [-.9, 1.25, .15], offset: [9, 9, 12], size: 8.5 },
      { target: [.05, 1.4, .1], offset: [10, 9.5, 12], size: 8.2 },
      { target: [1.15, 1.3, .4], offset: [10, 9.5, 12], size: 7.8 },
      { target: [1.9, 1.55, -1.7], offset: [9, 8, 12], size: 7.7 },
      { target: [2.73, 1, 2.55], offset: [9, 9, 12], size: 6.5 },
    ];
    const target = new THREE.Vector3(); const cameraGoal = new THREE.Vector3();
    function projection() {
      const aspect = width / height;
      // Keep the entire island visible in portrait cards without stretching the canvas.
      const extent = framing * (aspect < 1 ? 1 / Math.max(aspect, .68) : 1);
      camera.left = -extent * aspect / 2; camera.right = extent * aspect / 2; camera.top = extent / 2; camera.bottom = -extent / 2; camera.updateProjectionMatrix();
    }
    function drawTicket(dishes: string[]) {
      const ctx = ticketCanvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = '#fff7e5'; ctx.fillRect(0, 0, 384, 512);
      ctx.fillStyle = '#394231'; ctx.font = 'italic 40px Georgia'; ctx.fillText('A little joy.', 35, 91);
      ctx.font = '13px sans-serif'; ctx.fillStyle = '#aa6345'; ctx.fillText('DELIVR ATELIER  /  FRESH TICKET', 35, 122);
      ctx.strokeStyle = '#c6b89c'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(35, 150); ctx.lineTo(349, 150); ctx.stroke();
      ctx.font = '19px sans-serif'; ctx.fillStyle = '#555447';
      (dishes.length ? dishes : ['Made fresh for you']).slice(0, 5).forEach((dish, i) => {
        const line = dish.length > 27 ? `${dish.slice(0, 26)}…` : dish; ctx.fillText(line, 35, 195 + i * 43);
      });
      ctx.font = '14px sans-serif'; ctx.fillStyle = '#aa6345'; ctx.fillText('MAKE IT BEAUTIFUL.', 35, 450); ticketTexture.needsUpdate = true;
    }
    function animate(timestamp: number) {
      raf = 0; if (disposed || contextLost || !visible || document.hidden || !renderer || !controls) return;
      const state = inputs.current; const p = Math.floor(clamp(state.phase, 0, 5)); const moving = !state.paused && !reduced;
      // Smaller cards run at 30 fps; controls and state changes still share the same frame scheduler.
      if (moving && width < 560 && lastTime && timestamp - lastTime < 31) { invalidate(); return; }
      const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : 0; lastTime = timestamp;
      if (moving) time += dt;
      const phaseChanged = p !== lastPhase;
      if (phaseChanged) { lastPhase = p; phaseStart = time; arrivalStart = moving ? time : time - 1.3; userOrbit = false; }
      const reset = lastReset !== state.reset;
      if (reset) { lastReset = state.reset; userOrbit = false; camera.zoom = 1; }
      if (phaseChanged || reset || !userOrbit) {
        const view = views[p]; target.set(view.target[0], view.target[1], view.target[2]); cameraGoal.set(view.offset[0], view.offset[1], view.offset[2]).add(target);
        const amount = reduced || reset || dt === 0 || phaseChanged && state.paused ? 1 : moving ? 1 - Math.exp(-dt * 3.3) : 0;
        if (!userOrbit) { controls.target.lerp(target, amount); camera.position.lerp(cameraGoal, amount); framing = THREE.MathUtils.lerp(framing, view.size, amount); projection(); }
      }
      const dishKey = state.dishes.join('|');
      if (lastDishes !== dishKey || !lastDishes) {
        lastDishes = dishKey; drawTicket(state.dishes);
        const isRice = /biryani|rice/i.test(dishKey); const isPaneer = /paneer/i.test(dishKey);
        food.color.set(isPaneer ? '#ebc584' : isRice ? '#e5b663' : '#d78c42'); sauce.color.set(isPaneer ? '#be6439' : isRice ? '#bc9351' : '#b64d28');
        platedMeal.chunks.scale.y = isRice ? .65 : 1;
        platedMeal.rice.visible = servedMeal.rice.visible = panRice.visible = isRice;
        servedMeal.chunks.scale.y = isRice ? .65 : 1;
      }
      if (state.toss !== lastToss) { lastToss = state.toss; tossStart = time; }
      const automaticToss = p === 2 ? Math.max(0, Math.sin((time - phaseStart) * 1.35 - 1.7)) ** 8 : 0;
      const tossAge = time - tossStart; const manualToss = tossAge >= 0 && tossAge < 1.15 ? Math.sin(tossAge / 1.15 * Math.PI) : 0;
      const tossAmount = reduced ? 0 : Math.max(automaticToss, manualToss);
      pan.position.y = 1.535 + tossAmount * .22; pan.rotation.z = -tossAmount * .2; pan.rotation.x = tossAmount * .09;
      flyingFood.forEach(({ mesh: m, x, y, z, angle }, i) => {
        m.position.set(x - tossAmount * .09, y + tossAmount * (.38 + seed(i) * .35), z + Math.sin(i) * tossAmount * .065); m.rotation.set(tossAmount * .9, angle + tossAmount * .9, tossAmount * .7);
      });
      panRice.position.y = tossAmount * .45; panRice.rotation.z = tossAmount * .4;
      flames.visible = p === 2; steam.visible = p === 2 || p === 3 || p === 5 && state.clocheOpen;
      steam.position.set(p === 5 ? 2.96 : p === 3 ? 1.98 : 0, p === 5 ? 1.5 : 1.9, p === 5 ? 2.82 : p === 3 ? .38 : .47);
      flameMeshes.forEach((f, i) => { f.scale.y = (state.heat ? 4.4 : 2.5) * (1 + Math.sin(time * 11 + i * 2) * .21); });
      cookingLight.intensity = p === 2 ? (state.heat ? 6 : 3) * (1 + Math.sin(time * 12) * .07) : 0;
      steamPuffs.forEach((puff, i) => { const t = (time * .3 + i / 9) % 1; puff.position.set(Math.sin(i * 2.4 + t * 3) * (.14 + t * .12), t * .9, Math.cos(i * 2.4) * .15); puff.scale.setScalar(.4 + Math.sin(t * Math.PI) * .9); puff.scale.y *= 1.8; });
      knife.position.y = .13 + (p === 1 && !reduced ? (1 - Math.cos(time * 10)) * .12 : .02); knife.rotation.z = p === 1 && !reduced ? Math.sin(time * 10) * .09 : -.06;
      ticket.rotation.z = p === 0 && !reduced ? Math.sin(time * 1.8) * .025 : -.035;
      bell.rotation.z = p === 0 && !reduced ? Math.sin(time * 7) * Math.max(0, 1 - (time - phaseStart) / 1.4) * .08 : 0;
      platedMeal.group.visible = p >= 3; garnish.visible = p === 3;
      garnish.position.y = 1.62 + (1 - ease(state.progress)) * .55; garnish.rotation.y = reduced ? 0 : time * .3;
      packingLid.rotation.x = -Math.PI * .48 * (1 - ease(p === 4 ? state.progress : p > 4 ? 1 : .12));
      bag.position.y = p === 4 && !reduced ? Math.sin(time * 2) * .015 : 0;
      servedPlate.visible = p === 5;
      const arrival = reduced ? 1 : ease((time - arrivalStart) / 1.3);
      servedPlate.position.z = .03 + (p === 5 ? (1 - arrival) * .45 : 0);
      const lidGoal = state.clocheOpen ? 1 : 0;
      const lidChanged = state.clocheOpen !== lastCloche; lastCloche = state.clocheOpen;
      lidPosition = reduced || !moving && lidChanged ? lidGoal : moving ? THREE.MathUtils.lerp(lidPosition, lidGoal, 1 - Math.exp(-dt * 4)) : lidPosition;
      lid.position.y = .16 + lidPosition * .85; lid.position.x = lidPosition * .55; lid.rotation.z = -lidPosition * .24;
      candleFlame.scale.y = 2 + (reduced ? 0 : Math.sin(time * 5) * .2);
      controls.update(); renderer.render(scene, camera);
      if (moving) invalidate();
    }
    function invalidate() { if (!raf && !disposed && !contextLost && visible && !document.hidden) raf = requestAnimationFrame(animate); }
    function resize() {
      if (!renderer || disposed) return; width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(width, height, false); projection(); lastTime = 0; invalidate();
    }
    const onOrbit = () => { userOrbit = true; };
    controls.addEventListener('start', onOrbit); controls.addEventListener('change', invalidate);
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down: { x: number; y: number } | undefined;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || !renderer) { down = undefined; return; } down = undefined;
      const rect = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(scene.children, true)[0]; if (!hit) return;
      let node: THREE.Object3D | null = hit.object;
      while (node) { if (node === pan && inputs.current.phase === 2 && !inputs.current.paused) { interact('pan'); break; } if ((node === lid || node === servedPlate) && inputs.current.phase === 5) { interact('lid'); break; } node = node.parent; }
    };
    renderer.domElement.addEventListener('pointerdown', onDown); renderer.domElement.addEventListener('pointerup', onUp);
    const onLoss = (e: Event) => { e.preventDefault(); contextLost = true; cancelAnimationFrame(raf); raf = 0; unavailable(); dispose(); };
    renderer.domElement.addEventListener('webglcontextlost', onLoss);
    const onVisibility = () => { lastTime = 0; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else invalidate(); };
    const onMotion = () => { reduced = motion.matches; lastTime = 0; invalidate(); };
    document.addEventListener('visibilitychange', onVisibility); motion.addEventListener('change', onMotion);
    disposables.push(() => { renderer?.domElement.removeEventListener('pointerdown', onDown); renderer?.domElement.removeEventListener('pointerup', onUp); renderer?.domElement.removeEventListener('webglcontextlost', onLoss); document.removeEventListener('visibilitychange', onVisibility); motion.removeEventListener('change', onMotion); });
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; lastTime = 0; if (visible) invalidate(); else { cancelAnimationFrame(raf); raf = 0; } }, { threshold: .01 }); observer.observe(host);
    }
    if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); }
    else { window.addEventListener('resize', resize); disposables.push(() => window.removeEventListener('resize', resize)); }
    resize(); return { invalidate, dispose };
  } catch {
    dispose(); unavailable(); return { invalidate: () => {}, dispose };
  }
}

export default function KitchenTheater({ phase, progress, dishes, paused }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const theater = useRef<Theater | null>(null);
  const [heat, setHeat] = useState(false);
  const [toss, setToss] = useState(0);
  const [clocheOpen, setClocheOpen] = useState(false);
  const [reset, setReset] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const p = Math.floor(clamp(phase, 0, 5)); const completion = clamp(progress);
  const inputs = useRef<Inputs>({ phase: p, progress: completion, dishes, paused, heat, toss, clocheOpen, reset });
  inputs.current = { phase: p, progress: completion, dishes, paused, heat, toss, clocheOpen, reset };
  useEffect(() => {
    if (!host.current) return;
    const engine = makeKitchen(host.current, inputs, () => setFallback(true), kind => {
      if (kind === 'pan') { setToss(value => value + 1); setAnnouncement('Pan tossed.'); }
      else setClocheOpen(value => !value);
    });
    theater.current = engine; return () => { engine.dispose(); theater.current = null; };
  }, []);
  useEffect(() => { theater.current?.invalidate(); }, [p, completion, dishes, paused, heat, toss, clocheOpen, reset]);
  const fallbackFood = /paneer/i.test(dishes[0] || '') ? 'hero-paneer.png' : /biryani/i.test(dishes[0] || '') ? 'hero-biryani.png' : 'hero-butter-chicken.png';
  // Resolve against the current deployment base without depending on parent domain/catalog code.
  const photo = new URL(fallbackFood, document.baseURI).href;
  return <section className={`kitchen-theater kt-phase-${p}${heat ? ' kt-high-heat' : ''}`} data-paused={paused} data-renderer={fallback ? 'fallback' : 'three'} aria-label={`${names[p]}: ${dishes.join(', ')}`}>
    <div className="kt-topline"><span><i /> DELIVR ATELIER</span><span>CHANDIGARH · EST. WITH LOVE</span></div>
    <div className="kt-title"><span>0{p + 1} / THE RITUAL</span><h3>{titles[p]}</h3></div>
    <div className="kt-stage" ref={host} />
    {fallback && <div className="kt-fallback" role="status"><img src={photo} alt={dishes[0] || 'A freshly prepared meal'} /><div><span>THE ATELIER</span><strong>3D kitchen unavailable</strong><p>Your order is still moving. {captions[p]}</p></div></div>}
    <div className="kt-view-tools"><span>{paused ? 'RITUAL PAUSED' : 'DRAG TO EXPLORE'}<span className="kt-view-dot">·</span>{fallback ? 'PHOTO VIEW' : 'LIVE 3D'}</span>{!fallback && <button type="button" onClick={() => setReset(value => value + 1)} aria-label="Reset kitchen view" title="Reset kitchen view"><span aria-hidden="true">↺</span> Reset view</button>}</div>
    <div className="kt-stage-progress" aria-hidden="true"><span>{names[p]}</span><span>{Math.round(completion * 100).toString().padStart(2, '0')} / 100</span><i><b style={{ width: `${completion * 100}%` }} /></i></div>
    <div className="kt-bottom"><span>{captions[p]}</span>{p === 2 ? <div className="kt-actions"><button type="button" disabled={paused || fallback} onClick={() => { setToss(value => value + 1); setAnnouncement('Pan tossed.'); }}><span aria-hidden="true">↗</span> Toss the pan</button><button type="button" aria-pressed={heat} onClick={() => setHeat(value => !value)}><span className="kt-heat-icon" aria-hidden="true">♨</span>{heat ? 'High heat' : 'Turn up heat'}</button></div> : p === 5 ? <button type="button" aria-pressed={clocheOpen} onClick={() => setClocheOpen(value => !value)}><span aria-hidden="true">✧</span>{clocheOpen ? 'Cover the table' : 'Dinner is served'}</button> : <span className="kt-signature">made with appetite.</span>}</div>
    <span className="kt-sr-only" aria-live="polite">{announcement}{p === 5 ? clocheOpen ? ' The lid is lifted. Dinner is served.' : ' The served plate is covered.' : ''}</span>
  </section>;
}
