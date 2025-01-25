// Original code-native brand artwork, rasterized without third-party tooling.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, data) {
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, body, footer]);
}
function icon(size, destination) {
  const bytes = Buffer.alloc(size * (size * 3 + 1));
  const center = size / 2, length = size * .235, radius = size * .036;
  const segments = [0, 45, 90, 135].map(a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let coverage = 0;
      for (const dy of [.125, .375, .625, .875]) for (const dx of [.125, .375, .625, .875]) {
        const px = x + dx - center, py = y + dy - center;
        if (segments.some(([vx, vy]) => {
          const t = Math.max(-length, Math.min(length, px * vx + py * vy));
          return (px - t * vx) ** 2 + (py - t * vy) ** 2 <= radius ** 2;
        })) coverage++;
      }
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      [237, 89, 53].forEach((bg, c) => { bytes[offset + c] = Math.round(bg + (255 - bg) * coverage / 16); });
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(destination, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(bytes)), chunk('IEND', Buffer.alloc(0))]));
}
icon(192, 'public/icon-192.png');
icon(512, 'public/icon-512.png');
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  icon(size, `android/app/src/main/res/mipmap-${density}/ic_launcher.png`);
  icon(size, `android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`);
}
console.log('Generated web and Android launcher icons.');
