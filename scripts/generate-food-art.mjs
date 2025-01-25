// Deterministic, original vector illustrations bundled for offline / failed-image states.
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('public/food', { recursive: true });
let seed = 314159;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const n = (lo, hi) => +(lo + random() * (hi - lo)).toFixed(1);
const leaf = (x, y, angle, scale = 1) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><path d="M0 0C-27-26-25-42 0-48C25-42 27-26 0 0Z" fill="#527943"/><path d="M0-2V-41M0-15L-12-28M0-24L10-34" stroke="#8b9c59" stroke-width="2" fill="none"/></g>`;
for (let i = 1; i <= 12; i++) {
  const rice = i === 4 || i === 5;
  const bread = i === 6 || i === 7;
  const dessert = i === 9;
  const yogurt = i === 8;
  const drink = i === 10;
  const colors = ['#b9471e', '#cc6a28', '#d0a03b', '#deb765', '#dcc797', '#ead5a0', '#cda873', '#eee8ce', '#a24b1b', '#e7ac37', '#8d381d', '#d68c36'];
  let food = '';
  if (rice) {
    for (let j = 0; j < 610; j++) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 168;
      const x = 300 + Math.cos(angle) * radius, y = 285 + Math.sin(angle) * radius;
      food += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${n(3, 5)}" ry="${n(8, 14)}" fill="${['#f5e2aa', '#d9a344', '#f1d08b', '#fff0bc'][j % 4]}" transform="rotate(${n(0, 180)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    for (let j = 0; j < 20; j++) food += `<circle cx="${n(195, 400)}" cy="${n(170, 410)}" r="${n(5, 9)}" fill="${i === 5 ? '#6d873e' : '#9d5628'}"/>`;
  } else if (bread) {
    for (let j = 0; j < 3; j++) {
      food += `<g transform="translate(${230 + j * 65} ${295 - j * 7}) rotate(${-27 + j * 23})"><path d="M0-130C58-133 92-39 74 46C60 100-24 145-64 85C-104 25-77-92 0-130Z" fill="url(#bread)" stroke="#bf894b" stroke-width="3"/>`;
      for (let k = 0; k < 32; k++) food += `<ellipse cx="${n(-51, 53)}" cy="${n(-86, 75)}" rx="${n(3, 10)}" ry="${n(2, 8)}" fill="${k % 3 ? '#b98140' : '#72502c'}" opacity="${n(.3, .7)}"/>`;
      food += '</g>';
    }
  } else if (dessert) {
    for (const [x, y] of [[240, 222], [328, 207], [380, 290], [298, 304], [216, 323], [308, 390]]) food += `<circle cx="${x}" cy="${y}" r="45" fill="url(#jamun)" stroke="#793718" stroke-width="2"/><ellipse cx="${x - 10}" cy="${y - 17}" rx="17" ry="8" fill="#d88b43" opacity=".55"/>`;
  } else if (drink) {
    food += '<circle cx="300" cy="285" r="140" fill="#f4bd46" stroke="#f9dfa1" stroke-width="17"/><path d="M390 130L356 332" stroke="#f6f3dd" stroke-width="19"/><path d="M390 130L356 332" stroke="#d9784c" stroke-width="4" stroke-dasharray="11 14"/>';
    for (let j = 0; j < 13; j++) food += `<circle cx="${n(215, 370)}" cy="${n(200, 350)}" r="${n(3, 7)}" fill="#fae2a2" opacity=".6"/>`;
  } else {
    for (let j = 0; j < (yogurt ? 48 : 17); j++) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 130;
      const x = 300 + Math.cos(angle) * radius, y = 285 + Math.sin(angle) * radius;
      food += yogurt ? `<rect x="${x}" y="${y}" width="18" height="17" rx="5" fill="#a5b979" stroke="#e5e7c6" stroke-width="5" transform="rotate(${n(0, 80)} ${x} ${y})"/>` : `<rect x="${x - 20}" y="${y - 20}" width="${n(29, 51)}" height="${n(28, 45)}" rx="${i === 2 ? 6 : 15}" fill="${i === 2 ? '#efd19c' : i === 3 ? '#dbb251' : '#db8743'}" stroke="${i === 2 ? '#d7a358' : '#ad501e'}" stroke-width="3" transform="rotate(${n(-40, 40)} ${x} ${y})"/>`;
    }
    if (!yogurt) food += '<path d="M204 213C271 165 405 224 358 292C318 351 205 323 247 275C287 230 348 285 317 312" fill="none" stroke="#f5d19b" stroke-width="7" stroke-linecap="round" opacity=".8"/>';
    for (let j = 0; j < 45; j++) food += `<ellipse cx="${n(184, 415)}" cy="${n(170, 400)}" rx="${n(1, 3)}" ry="${n(1, 2)}" fill="#684b2b" opacity=".55"/>`;
  }
  if (!drink) for (let j = 0; j < 8; j++) food += leaf(n(220, 383), n(207, 370), n(0, 360), .34);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 570"><defs><radialGradient id="bg"><stop stop-color="#e7ddc4"/><stop offset="1" stop-color="#d7cfb8"/></radialGradient><radialGradient id="sauce"><stop stop-color="${colors[i - 1]}"/><stop offset="1" stop-color="${colors[i - 1]}" stop-opacity=".88"/></radialGradient><radialGradient id="bread"><stop stop-color="#f5e4b4"/><stop offset="1" stop-color="#d7ad6c"/></radialGradient><radialGradient id="jamun" cx=".35" cy=".25"><stop stop-color="#b66b2b"/><stop offset=".7" stop-color="#904316"/><stop offset="1" stop-color="#68361e"/></radialGradient><filter id="shadow" x="-25%" y="-25%" width="170%" height="170%"><feDropShadow dx="9" dy="18" stdDeviation="16" flood-color="#534a2c" flood-opacity=".23"/></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".07"/></feComponentTransfer></filter><clipPath id="bowl"><circle cx="300" cy="285" r="174"/></clipPath></defs><rect width="600" height="570" fill="url(#bg)"/><path d="M-20 67L620 507M-20 88L620 528" stroke="#f8f3df" stroke-width="2" opacity=".2"/><g transform="rotate(-18 300 285)"><rect x="44" y="50" width="220" height="460" rx="5" fill="#eae5d7" opacity=".5"/><path d="M62 50v460M76 50v460" stroke="#c6baa0" stroke-width="2" opacity=".3"/></g><g filter="url(#shadow)"><circle cx="300" cy="285" r="212" fill="#fcfaee"/><circle cx="300" cy="285" r="194" fill="none" stroke="#dedccf" stroke-width="2"/><circle cx="300" cy="285" r="182" fill="#e9e5d5"/><circle cx="300" cy="285" r="174" fill="url(#sauce)"/><g clip-path="url(#bowl)">${food}</g></g>${leaf(72, 128, -50, .9)}${leaf(101, 102, -18, .8)}${leaf(86, 155, -81, .8)}<g transform="translate(497 461) rotate(30)"><ellipse rx="17" ry="29" fill="#a9a98f"/><rect x="-4" y="21" width="8" height="102" rx="4" fill="#a9a98f"/><ellipse rx="12" ry="22" fill="#c6c5aa"/></g><rect width="600" height="570" filter="url(#grain)" opacity=".65"/></svg>`;
  writeFileSync(`public/food/m${i}.svg`, svg);
}
console.log('Generated 12 original offline food illustrations.');
