import { useEffect, useMemo, useRef } from 'react';
import './driver-scene.css';

export interface DriverSceneProps {
  /** Ordered route geometry in [longitude, latitude], WGS84. */
  route: Array<[number, number]>;
  /** Authoritative journey position, clamped to 0–1. */
  progress: number;
  paused: boolean;
  destination: string;
}

type V = { x: number; z: number };
type Station = V & { d: number };
type RouteModel = { points: Station[]; road: Station[]; length: number; roadLength: number; fallback: boolean };
type Screen = { x: number; y: number; scale: number; depth: number };
type Project = (p: V, elevation?: number) => Screen;
const TAU = Math.PI * 2;
const ROAD_HALF = 5.7;
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const distance = (a: V, b: V) => Math.hypot(b.x - a.x, b.z - a.z);
const lerp = (a: V, b: V, t: number): V => ({ x: mix(a.x, b.x, t), z: mix(a.z, b.z, t) });
const unit = (a: V, b: V): V => {
  const n = distance(a, b) || 1;
  return { x: (b.x - a.x) / n, z: (b.z - a.z) / n };
};
const offset = (p: V, direction: V, side: number, forward = 0): V => ({
  x: p.x + direction.z * side + direction.x * forward,
  z: p.z - direction.x * side + direction.z * forward,
});
const random = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const meters = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)} km` : `${Math.round(n)} m`;

function stations(points: V[]): Station[] {
  let d = 0;
  return points.map((p, i) => {
    if (i) d += distance(points[i - 1], p);
    return { ...p, d };
  });
}

/** Round junctions within the supplied polyline, rather than inventing a looping road. */
function roundedRoad(points: Station[]): Station[] {
  const road: V[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const incoming = distance(a, b), outgoing = distance(b, c);
    const cut = Math.min(23, incoming * .24, outgoing * .24);
    const start = lerp(b, a, cut / incoming), end = lerp(b, c, cut / outgoing);
    road.push(start);
    for (let j = 1; j <= 10; j++) {
      const t = j / 10;
      road.push(lerp(lerp(start, b, t), lerp(b, end, t), t));
    }
  }
  road.push(points[points.length - 1]);
  return stations(road);
}

function makeRoute(input: DriverSceneProps['route']): RouteModel {
  const valid = (Array.isArray(input) ? input : []).filter(p => Array.isArray(p)
    && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90);
  const fallback = valid.length < 2;
  const coordinates: Array<[number, number]> = fallback
    ? [[76.782, 30.733], [76.785, 30.735], [76.788, 30.734], [76.791, 30.737], [76.795, 30.739]] : valid;
  const origin = coordinates[0];
  const longitudeScale = 111320 * Math.cos(origin[1] * Math.PI / 180);
  const local: V[] = [];
  for (const p of coordinates) {
    const v = { x: (p[0] - origin[0]) * longitudeScale, z: (p[1] - origin[1]) * 111320 };
    if (!local.length || distance(local[local.length - 1], v) > .05) local.push(v);
  }
  // Repeated coordinates are a stationary route, with a short boulevard for the camera to see.
  if (local.length < 2) local.push({ x: local[0].x, z: local[0].z + 80 });
  const points = stations(local), road = roundedRoad(points);
  return { points, road, length: points[points.length - 1].d, roadLength: road[road.length - 1].d,
    fallback: fallback || valid.every(p => p[0] === valid[0]?.[0] && p[1] === valid[0]?.[1]) };
}

/** Binary search keeps per-frame sampling independent of route vertex count. */
function at(points: Station[], d: number): V {
  if (d <= 0) {
    const direction = unit(points[0], points[1]);
    return { x: points[0].x + direction.x * d, z: points[0].z + direction.z * d };
  }
  const last = points[points.length - 1];
  if (d >= last.d) {
    const direction = unit(points[points.length - 2], last);
    return { x: last.x + direction.x * (d - last.d), z: last.z + direction.z * (d - last.d) };
  }
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].d < d) lo = mid; else hi = mid;
  }
  return lerp(points[lo], points[hi], (d - points[lo].d) / (points[hi].d - points[lo].d));
}

function directionAt(points: Station[], d: number): V {
  return unit(at(points, d - 3), at(points, d + 9));
}

function polygon(ctx: CanvasRenderingContext2D, points: Screen[], color: string) {
  if (points.some(p => p.depth < 1 || !Number.isFinite(p.x + p.y))) return;
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, a: Screen, b: Screen, color: string, width: number) {
  if (a.depth < 1 || b.depth < 1) return;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU);
  ctx.fillStyle = color; ctx.fill();
}

function sky(ctx: CanvasRenderingContext2D, w: number, h: number, heading: V) {
  const horizon = h * .43;
  const gradient = ctx.createLinearGradient(0, 0, 0, h * .68);
  gradient.addColorStop(0, '#303b50'); gradient.addColorStop(.37, '#a07b8c');
  gradient.addColorStop(.67, '#efae84'); gradient.addColorStop(1, '#f6c693');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  const sunX = w * (.73 + heading.x * .09), sunY = h * .28;
  const glow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, h * .48);
  glow.addColorStop(0, '#fff1c985'); glow.addColorStop(.25, '#f9cba53d'); glow.addColorStop(1, '#f6b89c00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h * .67);
  ellipse(ctx, sunX, sunY, h * .042, h * .042, '#ffe6b5');
  // Wispy clouds, distant Shivalik foothills, and a geometric modernist skyline.
  for (let i = 0; i < 8; i++) {
    const x = random(i + 30) * w, y = h * (.1 + random(i + 42) * .19);
    ellipse(ctx, x, y, w * (.05 + random(i) * .12), h * .007, '#f8d5ba12');
  }
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath(); ctx.moveTo(0, horizon + 12);
    for (let x = 0; x <= w + 10; x += 10) {
      const y = horizon - h * (.026 + Math.sin(x / w * 10 + layer) * .014
        + Math.sin(x / w * 23 + layer * 2) * .009) + layer * 7;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, horizon + 35); ctx.lineTo(0, horizon + 35); ctx.closePath();
    ctx.fillStyle = ['#937b8980', '#9c848880', '#a38b8380'][layer]; ctx.fill();
  }
  for (let i = 0; i < 43; i++) {
    const x = i * w / 41, bw = w * (.01 + random(i + 40) * .025), bh = h * (.012 + random(i + 66) * .047);
    ctx.fillStyle = '#807b7b58'; ctx.fillRect(x, horizon - bh, bw, bh + 20);
    ctx.fillStyle = '#f8c39d30'; ctx.fillRect(x, horizon - bh, bw, 2);
  }
  const ground = ctx.createLinearGradient(0, horizon, 0, h);
  ground.addColorStop(0, '#9f9b79'); ground.addColorStop(.22, '#67705d'); ground.addColorStop(1, '#313d35');
  ctx.fillStyle = ground; ctx.fillRect(0, horizon + 6, w, h - horizon);
}

function road(ctx: CanvasRenderingContext2D, project: Project, model: RouteModel, d: number) {
  const step = 4, first = Math.floor((d - 12) / step) * step;
  for (let s = first + 480; s >= first; s -= step) {
    const p = at(model.road, s), q = at(model.road, s + step);
    const a = directionAt(model.road, s), b = directionAt(model.road, s + step);
    const strip = (left: number, right: number, color: string, elevation = 0) => polygon(ctx, [
      project(offset(p, a, left), elevation), project(offset(q, b, left), elevation),
      project(offset(q, b, right), elevation), project(offset(p, a, right), elevation),
    ], color);
    strip(-12, 12, '#718066');
    strip(-9.2, -6.1, '#b4ad98', .12); strip(6.1, 9.2, '#b4ad98', .12);
    strip(-6.15, -5.7, (Math.floor(s / 8) % 2) ? '#dad4b6' : '#586355', .12);
    strip(5.7, 6.15, (Math.floor(s / 8) % 2) ? '#dad4b6' : '#586355', .12);
    strip(-ROAD_HALF, ROAD_HALF, Math.floor(s / 4) % 2 ? '#414b4e' : '#424c4f');
    strip(3.9, 5.1, '#edc28e08', .005);
    strip(-5.27, -5.19, '#c1bba497', .015); strip(5.19, 5.27, '#c1bba497', .015);
    strip(-.1, -.045, '#efc780b8', .016); strip(.045, .1, '#efc780b8', .016);
    if (((Math.floor(s / 4) % 4) + 4) % 4 < 2) {
      strip(-2.88, -2.77, '#e2d9bfcc', .02); strip(2.77, 2.88, '#e2d9bfcc', .02);
    }
    // Paving joints and subtle asphalt aggregate stay anchored to route distance.
    line(ctx, project(offset(p, a, -9.2), .13), project(offset(p, a, -6.2), .13), '#797e6a60', .5);
    line(ctx, project(offset(p, a, 6.2), .13), project(offset(p, a, 9.2), .13), '#797e6a60', .5);
    line(ctx, project(offset(p, a, -7.7), .13), project(offset(q, b, -7.7), .13), '#797e6a45', .5);
    line(ctx, project(offset(p, a, 7.7), .13), project(offset(q, b, 7.7), .13), '#797e6a45', .5);
    if (s < d + 65) {
      for (let j = 0; j < 5; j++) {
        const pt = project(offset(p, a, random(s * 2 + j) * 10 - 5, random(s + j) * 4));
        if (pt.depth > 2) ellipse(ctx, pt.x, pt.y, .5, .35, '#d6c3ab18');
      }
    }
  }
  // Painted direction arrows in the left-hand lanes, projected onto the asphalt.
  const arrowD = Math.floor(d / 72 + 1) * 72;
  for (const lane of [-3.9, -1.35]) {
    const p = at(model.road, arrowD), dir = directionAt(model.road, arrowD);
    const contour = [[-.12, -2.1], [.12, -2.1], [.12, .8], [.65, .1], [0, 1.8], [-.65, .1], [-.12, .8]];
    polygon(ctx, contour.map(([x, z]) => project(offset(p, dir, lane + x, z), .027)), '#e5dcc37a');
  }
  // A finish marker is placed on the route's actual endpoint.
  if (model.roadLength - d < 160) {
    const p = at(model.road, model.roadLength), dir = directionAt(model.road, model.roadLength);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
      const x = -4.8 + i * 1.2;
      polygon(ctx, [project(offset(p, dir, x, j * 1.2), .025), project(offset(p, dir, x + 1.2, j * 1.2), .025),
        project(offset(p, dir, x + 1.2, (j + 1) * 1.2), .025), project(offset(p, dir, x, (j + 1) * 1.2), .025)],
      (i + j) % 2 ? '#ede4c766' : '#283c3d66');
    }
  }
}

function building(ctx: CanvasRenderingContext2D, project: Project, p: V, dir: V, side: number, seed: number) {
  const width = 8 + random(seed + 3) * 9, depth = 9 + random(seed + 4) * 8;
  const height = 5 + Math.floor(random(seed + 7) * 4) * 3;
  const near = side * (13 + random(seed + 1) * 5), far = near + side * depth;
  const corners = [offset(p, dir, near, -width / 2), offset(p, dir, near, width / 2),
    offset(p, dir, far, width / 2), offset(p, dir, far, -width / 2)];
  const base = corners.map(c => project(c, .15)), top = corners.map(c => project(c, height));
  if (base.some(v => v.depth < 2)) return;
  const palette = [['#b09a86', '#796c64', '#d1b79b'], ['#8b9b91', '#5d746f', '#b8b8a0'],
    ['#c7a383', '#947763', '#dfbfa0'], ['#a19a98', '#776f76', '#c3adb0']][Math.floor(random(seed) * 4)];
  polygon(ctx, [base[0], base[3], top[3], top[0]], palette[1]);
  polygon(ctx, [base[1], base[2], top[2], top[1]], palette[1]);
  polygon(ctx, [base[0], base[1], top[1], top[0]], palette[0]);
  polygon(ctx, top, palette[2]);
  // Narrow cast shadows give the flat-roof buildings their Chandigarh silhouette.
  const cornice = corners.map(c => project(c, height - .22));
  polygon(ctx, [top[0], top[1], cornice[1], cornice[0]], '#eee0c088');
  // Concrete roofline, regularly recessed windows, balcony slabs, shop awnings.
  line(ctx, top[0], top[1], '#f0d6b4', Math.max(.7, top[0].scale * .12));
  const columns = Math.max(2, Math.floor(width / 2.8)), floors = Math.floor((height - 1) / 3);
  for (let floor = 0; floor < floors; floor++) {
    const y = 2.5 + floor * 3;
    for (let col = 0; col < columns; col++) {
      const z = -width / 2 + (col + .5) * width / columns;
      const win = (f: number, e: number) => project(offset(p, dir, near - side * .03, z + f), e);
      polygon(ctx, [win(-.7, y), win(.7, y), win(.7, y + 1.5), win(-.7, y + 1.5)],
        random(seed + col + floor * 9) > .64 ? '#f9d595' : '#3e5659');
      line(ctx, win(0, y), win(0, y + 1.5), '#c4b396', Math.max(.5, win(0, y).scale * .065));
      polygon(ctx, [win(-.9, y - .18), win(.9, y - .18), win(.9, y - .04), win(-.9, y - .04)], '#d5c2a2');
    }
  }
  const shop = (f: number, e: number) => project(offset(p, dir, near - side * .15, f), e);
  polygon(ctx, [shop(-width * .4, .2), shop(width * .4, .2), shop(width * .4, 2.2), shop(-width * .4, 2.2)], '#304549');
  for (let i = 1; i < 4; i++) {
    const f = -width * .4 + i * width * .2;
    line(ctx, shop(f, .2), shop(f, 2.1), '#b6b39a', Math.max(.5, shop(f, 1).scale * .055));
    polygon(ctx, [shop(f + .12, .5), shop(f + width * .15, .5), shop(f + width * .15, 1.7), shop(f + .12, 1.7)], '#cfb99222');
  }
  for (let i = 0; i < 4; i++) {
    const f = -width * .4 + i * width * .2;
    polygon(ctx, [shop(f, 2.1), shop(f + width * .2, 2.1), shop(f + width * .2, 2.65), shop(f, 2.65)],
      i % 2 ? '#e6ccb0' : '#7b5647');
  }
  const name = project(offset(p, dir, near - side * .18), 3.15);
  if (name.depth > 4 && name.depth < 115) {
    ctx.save(); ctx.font = `600 ${Math.max(6, name.scale * .45)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = '#f7dfbd';
    ctx.fillText(['SECTOR MARKET', 'CHAI & CO.', 'CITY BAKERY', 'CHANDIGARH'][Math.floor(random(seed + 8) * 4)], name.x, name.y);
    ctx.restore();
  }
  // Rooftop water tank: an everyday detail of the city's low-rise blocks.
  if (random(seed + 12) > .4) {
    const tank = project(offset(p, dir, far - side * 2), height + .5);
    if (tank.depth > 2) {
      ctx.fillStyle = '#526465'; ctx.fillRect(tank.x - tank.scale * .7, tank.y - tank.scale * .9, tank.scale * 1.4, tank.scale);
      ellipse(ctx, tank.x, tank.y - tank.scale * .9, tank.scale * .7, tank.scale * .2, '#72807b');
    }
  }
  const ac = project(offset(p, dir, near - side * .12, width * .33), height - 2.2);
  if (ac.depth > 4 && ac.depth < 90) {
    ctx.fillStyle = '#c6bfaa'; ctx.fillRect(ac.x - ac.scale * .42, ac.y, ac.scale * .84, ac.scale * .47);
    for (let i = 1; i < 4; i++) {
      ctx.fillStyle = '#6d827b'; ctx.fillRect(ac.x - ac.scale * .3, ac.y + ac.scale * i * .1, ac.scale * .6, Math.max(.4, ac.scale * .035));
    }
  }
}

function tree(ctx: CanvasRenderingContext2D, project: Project, p: V, seed: number, time: number) {
  const base = project(p), height = 5 + random(seed) * 3.4, crown = project(p, height);
  if (base.depth < 3) return;
  ellipse(ctx, base.x + base.scale * 1.7, base.y, base.scale * 2.4, base.scale * .3, '#142e2b32');
  line(ctx, base, crown, '#5b5843', Math.max(1, base.scale * .25));
  for (const side of [-1, 1]) {
    line(ctx, project(p, height * .55), project({ x: p.x + side * 1.25, z: p.z }, height * .88), '#5b5843', Math.max(.6, base.scale * .1));
  }
  const sway = Math.sin(time * .7 + seed) * .045;
  for (let i = 0; i < 11; i++) {
    const x = (random(seed + i * 4) - .5) * 4.8 + sway;
    const y = height - 1.2 + random(seed + i * 7) * 2.8;
    const leaf = project({ x: p.x + x, z: p.z + (random(seed + i * 6) - .5) * 2 }, y);
    const r = (1.05 + random(seed + i * 13) * .8) * leaf.scale;
    ellipse(ctx, leaf.x, leaf.y, r, r * .78, ['#3b594b', '#4e6a50', '#637951', '#78845b'][i % 4]);
    if (i % 3 === 0) ellipse(ctx, leaf.x + r * .3, leaf.y - r * .3, r * .57, r * .33, '#b7aa6540');
    for (let j = 0; j < 3; j++) {
      const angle = random(seed + i * 3 + j) * TAU;
      ellipse(ctx, leaf.x + Math.cos(angle) * r * .66, leaf.y + Math.sin(angle) * r * .45,
        r * .2, r * .15, j % 2 ? '#213f3e18' : '#b6b4761a');
    }
  }
}

function parkedCar(ctx: CanvasRenderingContext2D, project: Project, p: V, dir: V) {
  const box = (left: number, right: number, rear: number, front: number, bottom: number, top: number,
    colors: [string, string, string]) => {
    const corners = [offset(p, dir, left, rear), offset(p, dir, right, rear), offset(p, dir, right, front), offset(p, dir, left, front)];
    const low = corners.map(v => project(v, bottom)), high = corners.map(v => project(v, top));
    polygon(ctx, [low[0], low[3], high[3], high[0]], colors[1]);
    polygon(ctx, [low[1], low[2], high[2], high[1]], colors[1]);
    polygon(ctx, [low[0], low[1], high[1], high[0]], colors[0]); polygon(ctx, high, colors[2]);
  };
  const rear = project(p);
  if (rear.depth < 5) return;
  box(-.92, .92, -1.8, 1.8, .32, 1.03, ['#d2b998', '#9a9685', '#ead1ac']);
  box(-.72, .72, -.95, .95, 1.03, 1.68, ['#355258', '#3e5e61', '#a4afa0']);
  for (const side of [-1, 1]) {
    for (const forward of [-1.05, 1.1]) {
      const wheel = project(offset(p, dir, side * .9, forward), .36);
      ellipse(ctx, wheel.x, wheel.y, wheel.scale * .25, wheel.scale * .38, '#233b40');
      ellipse(ctx, wheel.x, wheel.y, wheel.scale * .12, wheel.scale * .2, '#84938b');
    }
    line(ctx, project(offset(p, dir, side * .53, -1.81), .77), project(offset(p, dir, side * .81, -1.81), .77), '#e99375', Math.max(1, rear.scale * .15));
  }
  line(ctx, project(offset(p, dir, -.78, -1.82), .38), project(offset(p, dir, .78, -1.82), .38), '#57736e', Math.max(1, rear.scale * .12));
}

function lamp(ctx: CanvasRenderingContext2D, project: Project, p: V, dir: V, side: number) {
  const base = project(p), tip = project(p, 7.5), arm = project(offset(p, dir, -side * 1.6), 7.6);
  if (base.depth < 3) return;
  line(ctx, base, tip, '#35464a', Math.max(.7, base.scale * .105));
  line(ctx, tip, arm, '#35464a', Math.max(.7, base.scale * .09));
  ellipse(ctx, arm.x, arm.y, Math.max(1, arm.scale * .4), Math.max(.5, arm.scale * .1), '#fff0c8');
  if (arm.scale > 2) {
    const glow = ctx.createRadialGradient(arm.x, arm.y, 0, arm.x, arm.y, arm.scale * 2.2);
    glow.addColorStop(0, '#ffe8b543'); glow.addColorStop(1, '#ffe8b500');
    ctx.fillStyle = glow; ctx.fillRect(arm.x - arm.scale * 2.2, arm.y - arm.scale * 2.2, arm.scale * 4.4, arm.scale * 4.4);
  }
  line(ctx, project(offset(p, dir, -.18), .2), project(offset(p, dir, .18), .2), '#58655f', base.scale * .22);
}

function city(ctx: CanvasRenderingContext2D, project: Project, model: RouteModel, d: number, time: number) {
  type Object3D = { depth: number; draw: () => void };
  const objects: Object3D[] = [];
  const first = Math.floor((d - 24) / 24) * 24;
  for (let s = first; s < d + 420; s += 24) {
    const center = at(model.road, s), dir = directionAt(model.road, s);
    for (const side of [-1, 1]) {
      const seed = Math.floor(s / 24) * 17 + side * 31;
      const block = offset(center, dir, side * 18);
      const b = project(block);
      if (b.depth > 4) objects.push({ depth: b.depth, draw: () => building(ctx, project, center, dir, side, seed) });
      const t = offset(center, dir, side * (9.6 + random(seed) * 1.4), 6);
      const tp = project(t);
      if (tp.depth > 4) objects.push({ depth: tp.depth, draw: () => tree(ctx, project, t, seed + 21, time) });
      const l = offset(center, dir, side * 6.9, -7);
      const lp = project(l);
      if (lp.depth > 3) objects.push({ depth: lp.depth, draw: () => lamp(ctx, project, l, dir, side) });
      if (Math.floor(s / 24) % 3 === 0) {
        const plant = offset(center, dir, side * 9.5, -5), pp = project(plant, .4);
        if (pp.depth > 3) objects.push({ depth: pp.depth, draw: () => {
          ellipse(ctx, pp.x, pp.y, pp.scale * 1.4, pp.scale * .5, '#567456');
          for (let i = 0; i < 5; i++) ellipse(ctx, pp.x + (i - 2) * pp.scale * .4, pp.y - pp.scale * .18,
            pp.scale * .13, pp.scale * .13, '#e7b486');
        } });
      }
    }
  }
  const carD = Math.floor((d - 30) / 180 + 1) * 180 + 38;
  const carDir = directionAt(model.road, carD), carP = offset(at(model.road, carD), carDir, 4.45);
  const car = project(carP);
  if (car.depth > 5 && car.depth < 240) objects.push({ depth: car.depth, draw: () => parkedCar(ctx, project, carP, carDir) });
  // Sector signs are world objects and pass naturally beside the rider.
  const signD = Math.floor(d / 160 + 1) * 160;
  const signP = at(model.road, signD), signDir = directionAt(model.road, signD);
  const pole = offset(signP, signDir, -7.8), sign = project(pole, 3.3);
  if (sign.depth > 3) objects.push({ depth: sign.depth, draw: () => {
    line(ctx, project(pole), project(pole, 4.6), '#485958', Math.max(1, sign.scale * .12));
    const x = sign.x, y = sign.y, scale = sign.scale;
    ctx.fillStyle = '#254e4c'; ctx.fillRect(x - 2.2 * scale, y - 1.15 * scale, scale * 4.4, scale * 1.9);
    ctx.strokeStyle = '#d1d7bc'; ctx.lineWidth = Math.max(.5, scale * .04);
    ctx.strokeRect(x - 2.1 * scale, y - 1.05 * scale, scale * 4.2, scale * 1.7);
    ctx.textAlign = 'center'; ctx.fillStyle = '#efe8ca'; ctx.font = `600 ${Math.max(5, scale * .38)}px sans-serif`;
    ctx.fillText('CHANDIGARH', x, y - scale * .38);
    ctx.font = `${Math.max(4, scale * .28)}px sans-serif`; ctx.fillText('SECTOR BOULEVARD  ↑', x, y + scale * .24);
  } });
  objects.sort((a, b) => b.depth - a.depth).forEach(object => object.draw());
}

function rider(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, lean: number, time: number, stopped: boolean) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  ellipse(ctx, 8, 9, 55, 13, '#101c2560');
  ctx.rotate(lean * .12);
  ctx.translate(0, stopped ? 0 : Math.sin(time * 9) * .65);
  const shape = (path: () => void, color: string, stroke?: string, width = 1) => {
    ctx.beginPath(); path(); ctx.fillStyle = color; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  };
  const rounded = (a: number, b: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
    shape(() => ctx.roundRect(a, b, w, h, r), fill, stroke);
  };
  // Tyres, front fork, side panels, and metallic scooter chassis.
  rounded(-11, -48, 22, 63, 9, '#18272d', '#61716b');
  rounded(-6, -38, 12, 49, 5, '#24363a');
  ctx.strokeStyle = '#8c979080'; ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-7, -28 + i * 6); ctx.lineTo(7, -23 + i * 6); ctx.stroke(); }
  rounded(-31, -59, 62, 41, 14, '#243f42', '#75928a');
  shape(() => { ctx.moveTo(-37, -65); ctx.bezierCurveTo(-44, -42, -37, -20, -19, -16);
    ctx.lineTo(19, -16); ctx.bezierCurveTo(37, -20, 44, -42, 37, -65); ctx.closePath(); }, '#47736b', '#aec2a0');
  shape(() => { ctx.moveTo(-35, -52); ctx.quadraticCurveTo(-24, -31, -18, -20); ctx.lineTo(-26, -23);
    ctx.quadraticCurveTo(-39, -40, -35, -52); }, '#8cab8b');
  shape(() => { ctx.moveTo(34, -53); ctx.lineTo(31, -28); ctx.lineTo(19, -20); ctx.lineTo(25, -51); }, '#264c4c');
  rounded(-24, -47, 48, 19, 5, '#213b3d', '#9bb0a0');
  const tail = ctx.createLinearGradient(0, -43, 0, -32); tail.addColorStop(0, '#ffb495'); tail.addColorStop(1, '#ec563d');
  ctx.fillStyle = tail; ctx.beginPath(); ctx.roundRect(-20, -43, 40, 8, 3); ctx.fill();
  ctx.shadowColor = '#ff5e42'; ctx.shadowBlur = stopped ? 14 : 7;
  rounded(-14, -41, 28, 4, 2, '#ff8970'); ctx.shadowBlur = 0;
  rounded(-14, -25, 28, 10, 2, '#ded9be');
  ctx.fillStyle = '#324945'; ctx.textAlign = 'center'; ctx.font = 'bold 4.5px sans-serif'; ctx.fillText('CH 01  •  JOY', 0, -18);
  rounded(30, -33, 20, 6, 3, '#465b5b', '#a6afa0');
  // Boots and trouser legs hug the rear quarter of the scooter.
  rounded(-38, -95, 15, 61, 7, '#293c43'); rounded(23, -95, 15, 61, 7, '#22353c');
  rounded(-42, -42, 19, 11, 4, '#18292f', '#718078'); rounded(24, -42, 19, 11, 4, '#18292f', '#718078');
  // Handlebars, mirrors, gloved hands, sleeves.
  ctx.lineCap = 'round'; ctx.strokeStyle = '#294146'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-42, -111); ctx.lineTo(42, -111); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(side * 39, -111); ctx.lineTo(side * 52, -142); ctx.stroke();
    ellipse(ctx, side * 53, -143, 10, 5, '#263c41'); ellipse(ctx, side * 53, -144, 7, 3, '#b1bdb0');
    shape(() => { ctx.moveTo(side * 22, -148); ctx.quadraticCurveTo(side * 38, -148, side * 41, -119);
      ctx.lineTo(side * 34, -111); ctx.quadraticCurveTo(side * 21, -131, side * 13, -128); }, '#ddd1b0', '#aaad90');
    ellipse(ctx, side * 38, -112, 6, 4, '#35484a');
  }
  // Rider jacket: shoulders, seam, neck, then the insulated delivery box.
  shape(() => { ctx.moveTo(-28, -146); ctx.quadraticCurveTo(0, -161, 28, -146);
    ctx.lineTo(26, -98); ctx.quadraticCurveTo(0, -89, -26, -98); ctx.closePath(); }, '#e2d4b3', '#abaf8e');
  rounded(-7, -166, 14, 18, 4, '#a78061');
  ctx.strokeStyle = '#637467'; ctx.lineWidth = 5;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 17, -148); ctx.lineTo(side * 24, -108); ctx.stroke(); }
  shape(() => { ctx.moveTo(-39, -125); ctx.lineTo(-34, -135); ctx.lineTo(33, -135); ctx.lineTo(40, -125); }, '#ffc397', '#ffe0b1');
  const box = ctx.createLinearGradient(-40, 0, 40, 0);
  box.addColorStop(0, '#c9583a'); box.addColorStop(.25, '#f1784c'); box.addColorStop(.8, '#ed7247'); box.addColorStop(1, '#b84935');
  ctx.fillStyle = box; ctx.beginPath(); ctx.roundRect(-40, -125, 80, 55, 6); ctx.fill();
  rounded(-37, -122, 74, 48, 4, 'transparent', '#ffb17b');
  rounded(-40, -124, 80, 7, 2, '#b95237');
  rounded(-31, -83, 62, 4, 1, '#ffe3b6');
  ctx.fillStyle = '#fff0d3'; ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('delivr', 0, -99);
  ctx.font = '4.5px sans-serif'; ctx.fillText('A LITTLE JOY, ON BOARD.', 0, -89);
  for (const side of [-1, 1]) rounded(side * 32 - 2, -111, 4, 20, 1, '#723d33');
  // Rounded helmet with warm rim light, ventilation, and a reflective stripe.
  const helmet = ctx.createLinearGradient(-20, -197, 20, -162);
  helmet.addColorStop(0, '#e6ddc4'); helmet.addColorStop(.45, '#c0cbb4'); helmet.addColorStop(1, '#788c83');
  shape(() => { ctx.moveTo(-21, -170); ctx.bezierCurveTo(-28, -207, 27, -211, 23, -171);
    ctx.quadraticCurveTo(0, -153, -21, -170); }, '#afbeaa', '#e2ddbf');
  ctx.fillStyle = helmet; ctx.beginPath(); ctx.ellipse(0, -181, 23, 22, -.08, 0, TAU); ctx.fill();
  shape(() => { ctx.moveTo(-4, -202); ctx.quadraticCurveTo(-9, -181, -5, -163);
    ctx.lineTo(2, -162); ctx.quadraticCurveTo(-2, -183, 3, -203); }, '#f8ebc8');
  shape(() => { ctx.moveTo(-22, -181); ctx.quadraticCurveTo(0, -165, 23, -181); ctx.lineTo(21, -169);
    ctx.quadraticCurveTo(0, -155, -21, -169); }, '#405a58');
  rounded(-10, -170, 20, 3, 1, '#bac6a9');
  for (const side of [-1, 1]) ellipse(ctx, side * 14, -186, 2, 4, '#728981');
  ctx.restore();
}

function render(ctx: CanvasRenderingContext2D, w: number, h: number, model: RouteModel, progress: number, time: number, stopped: boolean) {
  const d = model.roadLength * progress, p = at(model.road, d), heading = directionAt(model.road, d);
  const ahead = directionAt(model.road, d + 16);
  const bend = clamp(heading.x * ahead.z - heading.z * ahead.x, -1, 1);
  const cameraHeading = unit({ x: 0, z: 0 }, { x: heading.x * .8 + ahead.x * .2, z: heading.z * .8 + ahead.z * .2 });
  const camera = offset(p, heading, -2.35, -12.5);
  const focal = h * .86, horizon = h * .43;
  const groundTarget = w <= 620 ? Math.min(h * .63, h - 216) : Math.min(h * .74, h - 177);
  const camHeight = (groundTarget - horizon) * 12.5 / focal;
  const project: Project = (point, elevation = 0) => {
    const dx = point.x - camera.x, dz = point.z - camera.z;
    const depth = dx * cameraHeading.x + dz * cameraHeading.z;
    const lateral = dx * cameraHeading.z - dz * cameraHeading.x;
    const scale = focal / Math.max(1, depth);
    return { x: w * .5 + lateral * scale, y: horizon + (camHeight - elevation) * scale, scale, depth };
  };
  ctx.clearRect(0, 0, w, h);
  sky(ctx, w, h, heading);
  road(ctx, project, model, d);
  city(ctx, project, model, d, time);
  // Distance haze blends the avenue into the sunset without flattening the foreground.
  const haze = ctx.createLinearGradient(0, horizon - 25, 0, h * .64);
  haze.addColorStop(0, '#f5cba756'); haze.addColorStop(.42, '#f5cba724'); haze.addColorStop(1, '#f5cba700');
  ctx.fillStyle = haze; ctx.fillRect(0, horizon - 25, w, h * .25);
  const ground = project(offset(p, heading, -2.35));
  const scooterScale = Math.min(h / 660, w / 550) * .98;
  rider(ctx, ground.x, Math.min(ground.y, h * .83), scooterScale, -bend, time, stopped);
  // Filmic edges leave the central road and rider luminous.
  const vignette = ctx.createRadialGradient(w * .5, h * .5, h * .2, w * .5, h * .5, Math.max(w, h) * .72);
  vignette.addColorStop(0, '#0c1e2800'); vignette.addColorStop(1, '#0c1e2880');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
}

function MapRoute({ model, progress }: { model: RouteModel; progress: number }) {
  const { path, point, start, finish } = useMemo(() => {
    const points = model.points;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const scale = Math.min(144 / Math.max(1, maxX - minX), 86 / Math.max(1, maxZ - minZ));
    const map = (p: V) => ({ x: 94 + (p.x - (minX + maxX) / 2) * scale, y: 61 - (p.z - (minZ + maxZ) / 2) * scale });
    // Preserve vertices on typical routes; bound SVG size for very dense geometries.
    const stride = Math.max(1, Math.ceil(points.length / 1600));
    const sampled = points.filter((_, i) => i % stride === 0 || i === points.length - 1);
    return { path: sampled.map((p, i) => { const v = map(p); return `${i ? 'L' : 'M'}${v.x.toFixed(2)},${v.y.toFixed(2)}`; }).join(' '),
      point: map(at(points, model.length * progress)), start: map(points[0]), finish: map(points[points.length - 1]) };
  }, [model, progress]);
  return <svg className="driver-scene__map" viewBox="0 0 188 122" fill="none" aria-label="Route overview, north is up" role="img">
    <g stroke="#d1cdb2" strokeOpacity=".09" strokeWidth="7"><path d="M0 24H188M0 59H188M0 94H188M31 0V122M77 0V122M123 0V122M169 0V122" /></g>
    <g fill="#94b394" opacity=".09"><rect x="39" y="32" width="29" height="19" rx="3" /><rect x="132" y="67" width="27" height="19" rx="3" /><rect x="86" y="5" width="28" height="12" rx="3" /></g>
    <path d={path} stroke="#f6c098" strokeWidth="7" strokeOpacity=".08" strokeLinejoin="round" />
    <path d={path} stroke="#a6aaa0" strokeWidth="2.5" strokeOpacity=".6" strokeLinejoin="round" />
    <path d={path} pathLength="1" stroke="#f7b484" strokeWidth="3" strokeDasharray={`${progress} 1`} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={start.x} cy={start.y} r="3" fill="#e5e7cc" />
    <circle cx={finish.x} cy={finish.y} r="4" fill="#293c3c" stroke="#f2bd90" strokeWidth="1.5" />
    <circle cx={point.x} cy={point.y} r="9" fill="#f7b484" opacity=".16" />
    <circle cx={point.x} cy={point.y} r="4" fill="#f7b484" stroke="#fff0d5" strokeWidth="1.5" />
    <text x="174" y="14" textAnchor="middle" fill="#d9cfb8" fontSize="7">N</text><path d="m174 20-2 4h4z" fill="#d9cfb8" />
  </svg>;
}

function TurnIcon({ direction }: { direction: 'left' | 'right' | 'straight' | 'arrived' }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={direction === 'arrived' ? 'm5 12 4 4L19 6'
    : direction === 'left' ? 'M17 20v-9a4 4 0 0 0-4-4H5m5-5L5 7l5 5'
      : direction === 'right' ? 'M7 20v-9a4 4 0 0 1 4-4h8m-5-5 5 5-5 5'
        : 'M12 21V3m-6 6 6-6 6 6'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function DriverScene({ route, progress, paused, destination }: DriverSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLElement>(null);
  const model = useMemo(() => makeRoute(route), [route]);
  const position = clamp(Number.isFinite(progress) ? progress : 0);
  const arrived = position >= 1;
  const stateRef = useRef({ model, progress: position, paused, arrived });
  const redrawRef = useRef<(() => void) | null>(null);
  const remaining = model.length * (1 - position);
  const navigation = useMemo(() => {
    const d = model.length * position;
    for (let i = 1; i < model.points.length - 1; i++) {
      const point = model.points[i];
      if (point.d < d + 5) continue;
      const incoming = unit(model.points[i - 1], point), outgoing = unit(point, model.points[i + 1]);
      const turn = incoming.x * outgoing.z - incoming.z * outgoing.x;
      if (Math.abs(turn) > .3) return { direction: (turn > 0 ? 'left' : 'right') as 'left' | 'right', distance: point.d - d };
    }
    return { direction: 'straight' as const, distance: remaining };
  }, [model, position, remaining]);
  const speed = arrived || paused ? 0 : Math.round(28 + Math.sin(position * Math.PI) * 6);
  const heading = directionAt(model.points, model.length * position);
  const bearing = (Math.atan2(heading.x, heading.z) * 180 / Math.PI + 360) % 360;
  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];

  useEffect(() => {
    stateRef.current = { model, progress: position, paused, arrived };
    redrawRef.current?.();
  }, [model, position, paused, arrived]);

  useEffect(() => {
    const canvas = canvasRef.current, host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, width = 0, height = 0, ratio = 1, elapsed = 0, lastTime = 0;
    let visible = true, disposed = false, renderedProgress = stateRef.current.progress;
    const animate = () => !disposed && visible && !document.hidden && !motion.matches
      && !stateRef.current.paused && !stateRef.current.arrived;
    const paint = (now: number) => {
      frame = 0;
      if (disposed || !width || !height) return;
      if (animate() && lastTime) elapsed += Math.min((now - lastTime) / 1000, .05);
      lastTime = now;
      const state = stateRef.current;
      renderedProgress = animate() ? mix(renderedProgress, state.progress, .24) : state.progress;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      render(ctx, width, height, state.model, renderedProgress, elapsed, !animate());
      if (animate()) frame = window.requestAnimationFrame(paint);
    };
    const redraw = () => {
      // Prop changes are picked up by the live loop without resetting its clock.
      if (frame && animate()) return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0; lastTime = 0;
      if (!disposed) paint(performance.now());
    };
    const resize = () => {
      const box = host.getBoundingClientRect();
      width = Math.max(0, box.width); height = Math.max(0, box.height);
      // Cap DPR and the pixel budget to keep mobile GPUs comfortable.
      ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3600000 / Math.max(1, width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
      redraw();
    };
    redrawRef.current = redraw;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    const intersection = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true; redraw();
    }, { rootMargin: '80px' }) : null;
    intersection?.observe(host);
    motion.addEventListener('change', redraw);
    document.addEventListener('visibilitychange', redraw);
    window.addEventListener('resize', resize);
    resize();
    return () => {
      disposed = true; redrawRef.current = null;
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect(); intersection?.disconnect();
      motion.removeEventListener('change', redraw);
      document.removeEventListener('visibilitychange', redraw);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <section ref={hostRef} className="driver-scene" data-paused={paused || arrived} data-arrived={arrived}
    aria-label={`Chandigarh delivery journey to ${destination || 'your destination'}`}>
    <canvas ref={canvasRef} className="driver-scene__canvas" aria-hidden="true" />
    <div className="driver-scene__grain" aria-hidden="true" />
    <header className="driver-scene__header">
      <div className="driver-scene__intro"><span className="driver-scene__eyebrow"><i /> THE CITY BEAUTIFUL</span>
        <h2>{arrived ? 'Made it.' : 'A little joy.'}<br /><em>{arrived ? 'With love.' : 'On the way.'}</em></h2>
        <p>Chandigarh <span>·</span> The golden hour ride</p>
      </div>
      <div className="driver-scene__live"><span className="driver-scene__live-dot" />{arrived ? 'JOURNEY COMPLETE' : paused ? 'RIDE PAUSED' : 'ON THE MOVE'}<span className="driver-scene__demo">DEMO</span></div>
    </header>
    <div className="driver-scene__compass" aria-hidden="true"><span>{compass}</span><i /><b>{Math.round(bearing)}°</b></div>
    <div className="driver-scene__navigation"><span className="driver-scene__turn"><TurnIcon direction={arrived ? 'arrived' : navigation.direction} /></span>
      <div><strong>{arrived ? 'You have arrived' : navigation.direction === 'straight' ? 'Enjoy the boulevard' : `Turn ${navigation.direction}`}</strong>
        <span>{arrived ? destination || 'Your destination' : `${meters(navigation.distance)} ${navigation.direction === 'straight' ? 'to your destination' : 'ahead · follow the route'}`}</span></div>
    </div>
    <div className="driver-scene__location" aria-hidden="true"><span>CHANDIGARH</span><i /> SECTOR BOULEVARD</div>
    {arrived && <div className="driver-scene__arrival" role="status"><span className="driver-scene__arrival-check"><TurnIcon direction="arrived" /></span>
      <div><span>A LITTLE JOY, DELIVERED</span><strong>{destination || 'Your happy place'}</strong><p>The ride is complete. Enjoy every bite.</p></div></div>}
    <div className="driver-scene__hud">
      <div className="driver-scene__journey"><span className="driver-scene__eyebrow">{arrived ? 'YOUR HAPPY PLACE' : 'RIDING TO'}</span>
        <strong title={destination}>{destination || 'Your happy place'}</strong>
        <div className="driver-scene__progress" role="progressbar" aria-label="Delivery journey progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position * 100)}>
          <span style={{ width: `${position * 100}%` }} /></div>
        <div className="driver-scene__journey-meta"><span>{arrived ? 'Arrived with love' : `${meters(remaining)} remaining`}</span><b>{Math.round(position * 100)}%</b></div>
      </div>
      <div className="driver-scene__telemetry"><div className="driver-scene__speed"><strong>{String(speed).padStart(2, '0')}</strong><span>KM/H<small>DEMO SPEED</small></span></div>
        <div className="driver-scene__distance"><span>ROUTE DISTANCE</span><strong>{meters(model.length)}</strong><small>SIMULATED DELIVERY</small></div></div>
      <div className="driver-scene__map-card"><div className="driver-scene__map-label"><span>{model.fallback ? 'ILLUSTRATIVE ROUTE' : 'YOUR ROUTE'}</span><b>CHD <i>↗</i></b></div><MapRoute model={model} progress={position} /></div>
    </div>
    <span className="driver-scene__sr" role="status" aria-live="polite">{arrived ? `Arrived at ${destination || 'your destination'}.` : paused ? 'Delivery demo paused.' : 'Delivery demo riding through Chandigarh.'}</span>
    <span className="driver-scene__coordinates" aria-hidden="true">THE CITY BEAUTIFUL · CITY RIDE 01</span>
  </section>;
}
