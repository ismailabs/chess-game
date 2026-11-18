import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const off = 1 + x * 4;
      row[off] = r;
      row[off + 1] = g;
      row[off + 2] = b;
      row[off + 3] = a;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = deflateSync(rawData, { level: 9 });
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Geometric Pawn Pixel Evaluator
function pawnPixel(nx, ny) {
  // Check head
  const headDist = Math.hypot(nx - 0.5, ny - 0.28);
  const inHead = headDist <= 0.16;

  // Check collar
  const inCollar = ny >= 0.42 && ny <= 0.48 && Math.abs(nx - 0.5) <= 0.17;

  // Check body (flaring bell shape)
  let inBody = false;
  if (ny >= 0.48 && ny <= 0.78) {
    const progress = (ny - 0.48) / 0.30;
    const halfWidth = 0.11 + 0.15 * Math.pow(progress, 1.8);
    if (Math.abs(nx - 0.5) <= halfWidth) inBody = true;
  }

  // Check base plate
  const inBase = ny >= 0.78 && ny <= 0.90 && Math.abs(nx - 0.5) <= 0.27;

  if (!inHead && !inCollar && !inBody && !inBase) {
    return null; // outside pawn
  }

  // Diagonal facet split: line through (0.5, 0) to (0.46, 1)
  const splitX = 0.50 - 0.04 * ny;
  const isLeft = nx < splitX;

  if (isLeft) {
    // Light emerald #81b64c with subtle top gradient
    const shade = (1 - ny) * 0.25;
    const r = Math.min(255, Math.round(0x81 + shade * 26));
    const g = Math.min(255, Math.round(0xb6 + shade * 26));
    const b = Math.min(255, Math.round(0x4c + shade * 18));
    return [r, g, b, 255];
  } else {
    // Deep emerald #537a2e
    const r = 0x53, g = 0x7a, b = 0x2e;
    return [r, g, b, 255];
  }
}

// 1. Transparent Favicon (for browser tabs)
function faviconPixel(x, y, w, h) {
  const p = pawnPixel(x / w, y / h);
  return p || [0, 0, 0, 0];
}

// 2. App Icons with Container Background (Apple Touch & PWA)
function appIconPixel(x, y, w, h, scale = 1.0) {
  const nx = x / w;
  const ny = y / h;

  // Squircle rounded corners
  const rCorner = 0.22;
  const cx = Math.min(Math.max(nx, rCorner), 1 - rCorner);
  const cy = Math.min(Math.max(ny, rCorner), 1 - rCorner);
  const distCorner = Math.hypot(nx - cx, ny - cy);

  if (distCorner > rCorner) {
    return [0, 0, 0, 0]; // outside squircle
  }

  // Base background: #262522
  let r = 0x26, g = 0x25, b = 0x22, a = 255;

  // Specular top highlight
  const isEdge = distCorner > rCorner - 0.02 || nx < 0.02 || nx > 0.98 || ny < 0.02 || ny > 0.98;
  if (isEdge && (ny < 0.3 || nx < 0.3)) {
    return [255, 255, 255, 45];
  }

  // Normalized pawn coordinates centered with optional scale
  const px = (nx - 0.5) / scale + 0.5;
  const py = (ny - 0.5) / scale + 0.5;

  if (px >= 0 && px <= 1 && py >= 0 && py <= 1) {
    const pawn = pawnPixel(px, py);
    if (pawn) return pawn;
  }

  return [r, g, b, a];
}

console.log("Generating brand icons with original geometric pawn...");

// 1. Favicon.ico (32x32 standard ICO)
const png32 = createPng(32, 32, faviconPixel);
const icoHeader = Buffer.alloc(6 + 16);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // icon type
icoHeader.writeUInt16LE(1, 4); // 1 image
icoHeader.writeUInt8(32, 6);   // width
icoHeader.writeUInt8(32, 7);   // height
icoHeader.writeUInt8(0, 8);    // colors
icoHeader.writeUInt8(0, 9);    // reserved
icoHeader.writeUInt16LE(1, 10); // color planes
icoHeader.writeUInt16LE(32, 12); // bpp
icoHeader.writeUInt32LE(png32.length, 14); // image size
icoHeader.writeUInt32LE(22, 18); // offset
const ico = Buffer.concat([icoHeader, png32]);
writeFileSync("public/favicon.ico", ico);
console.log("✓ Created public/favicon.ico");

// 2. Apple Touch Icon (180x180)
const png180 = createPng(180, 180, (x, y, w, h) => appIconPixel(x, y, w, h, 0.85));
writeFileSync("public/apple-touch-icon.png", png180);
console.log("✓ Created public/apple-touch-icon.png (180x180)");

// 3. PWA Icons (192, 512, maskable 512)
const png192 = createPng(192, 192, (x, y, w, h) => appIconPixel(x, y, w, h, 0.82));
writeFileSync("public/icon-192.png", png192);
console.log("✓ Created public/icon-192.png");

const png512 = createPng(512, 512, (x, y, w, h) => appIconPixel(x, y, w, h, 0.82));
writeFileSync("public/icon-512.png", png512);
console.log("✓ Created public/icon-512.png");

// Maskable icon with 70% safe zone scaling
const pngMaskable512 = createPng(512, 512, (x, y, w, h) => appIconPixel(x, y, w, h, 0.70));
writeFileSync("public/icon-maskable-512.png", pngMaskable512);
console.log("✓ Created public/icon-maskable-512.png (maskable safe zone)");
