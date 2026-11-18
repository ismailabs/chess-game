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
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
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

// Geometric Pawn Pixel for OG Badge
function pawnBadgePixel(nx, ny) {
  const headDist = Math.hypot(nx - 0.5, ny - 0.28);
  const inHead = headDist <= 0.16;
  const inCollar = ny >= 0.42 && ny <= 0.48 && Math.abs(nx - 0.5) <= 0.17;
  let inBody = false;
  if (ny >= 0.48 && ny <= 0.78) {
    const progress = (ny - 0.48) / 0.30;
    const halfWidth = 0.11 + 0.15 * Math.pow(progress, 1.8);
    if (Math.abs(nx - 0.5) <= halfWidth) inBody = true;
  }
  const inBase = ny >= 0.78 && ny <= 0.90 && Math.abs(nx - 0.5) <= 0.27;

  if (!inHead && !inCollar && !inBody && !inBase) return null;

  const splitX = 0.50 - 0.04 * ny;
  const isLeft = nx < splitX;

  return isLeft ? [0x81, 0xb6, 0x4c, 255] : [0x53, 0x7a, 0x2e, 255];
}

function ogPixel(x, y, w, h) {
  // Radial glow around left board area (cx: 350, cy: 315)
  const distGlow = Math.hypot(x - 350, y - 315) / 520;
  const glow = Math.max(0, 1 - distGlow);

  let r = Math.round(0x1d + glow * 14);
  let g = Math.round(0x1c + glow * 24);
  let b = Math.round(0x1a + glow * 12);
  let a = 255;

  // --- 1. CHESSBOARD (Left Side: x 75 to 555, y 75 to 555) -> 480x480 ---
  const bx0 = 75, by0 = 75, bSize = 480;
  const sqSize = 60; // 480 / 8

  // Outer bezel (Solid/Tonal Content Surface, not glass)
  const pad = 12;
  if (x >= bx0 - pad && x <= bx0 + bSize + pad && y >= by0 - pad && y <= by0 + bSize + pad) {
    if (x < bx0 || x > bx0 + bSize || y < by0 || y > by0 + bSize) {
      // Bezel border
      return [0x26, 0x25, 0x22, 255];
    }

    const col = Math.floor((x - bx0) / sqSize);
    const row = Math.floor((y - by0) / sqSize);
    const isLight = (col + row) % 2 === 0;

    // Last move on e4 (col 4, row 4) and e2 (col 4, row 6)
    const isHighlight = (col === 4 && row === 4) || (col === 4 && row === 6);

    let sqR = isLight ? 0xee : 0x76;
    let sqG = isLight ? 0xee : 0x96;
    let sqB = isLight ? 0xd2 : 0x56;

    if (isHighlight) {
      sqR = Math.round(sqR * 0.55 + 0xff * 0.45);
      sqG = Math.round(sqG * 0.55 + 0xeb * 0.45);
      sqB = Math.round(sqB * 0.55 + 0x3b * 0.45);
    }

    // Piece silhouette in center of square
    const sx = (x - bx0 - col * sqSize) / sqSize;
    const sy = (y - by0 - row * sqSize) / sqSize;
    const px = (sx - 0.5) * 2;
    const py = (sy - 0.5) * 2;

    const hasWhite = (row === 7 && col !== 4) || (row === 6 && col !== 4) || (row === 4 && col === 4);
    const hasBlack = (row === 0) || (row === 1 && col !== 4) || (row === 3 && col === 4);

    if (hasWhite || hasBlack) {
      const pieceColor = hasWhite ? [245, 245, 244, 255] : [26, 25, 23, 255];
      const trimColor = hasWhite ? [100, 100, 100, 255] : [229, 184, 75, 255];

      const distHead = Math.hypot(px, py + 0.12);
      if (distHead < 0.44 && py < 0.5) {
        if (distHead > 0.38) return trimColor;
        return pieceColor;
      }
      if (py >= 0.5 && py <= 0.76 && Math.abs(px) < 0.58) {
        if (py >= 0.70 || Math.abs(px) > 0.52) return trimColor;
        return pieceColor;
      }
    }

    return [sqR, sqG, sqB, 255];
  }

  // --- 2. RIGHT SIDE BRANDING & VALUE PILLS (x 630 to 1140) ---
  // A. Logo Mark Squircle Badge (x: 630 to 714, y: 80 to 164) -> 84x84
  const lx0 = 630, ly0 = 80, lSize = 84;
  if (x >= lx0 && x <= lx0 + lSize && y >= ly0 && y <= ly0 + lSize) {
    const p = pawnBadgePixel((x - lx0) / lSize, (y - ly0) / lSize);
    if (p) return p;
    // Dark badge container
    return [0x26, 0x25, 0x22, 255];
  }

  // B. Brushed Gold Accent Separator Line (x: 630 to 1120, y: 180 to 182)
  if (x >= 630 && x <= 1120 && y >= 180 && y <= 182) {
    return [0x81, 0xb6, 0x4c, 240];
  }

  // C. Feature Value Pills (y: 340 to 470)
  const pills = [
    { y0: 340, y1: 385, w: 420, dot: [0x81, 0xb6, 0x4c] }, // Play friends
    { y0: 395, y1: 440, w: 380, dot: [0xe5, 0xb8, 0x4b] }, // Beat 14 bots
    { y0: 450, y1: 495, w: 400, dot: [0x5d, 0x9a, 0x30] }, // Climb Elo ladder
  ];

  for (const p of pills) {
    if (y >= p.y0 && y <= p.y1 && x >= 630 && x <= 630 + p.w) {
      // Indicator dot
      const cy = (p.y0 + p.y1) / 2;
      if (Math.hypot(x - 652, y - cy) < 6) {
        return [...p.dot, 255];
      }
      return [0x26, 0x25, 0x22, 240]; // elevated container
    }
  }

  // D. Primary CTA Banner "Continue with Google / Play Now" (x: 630 to 1020, y: 520 to 575)
  if (x >= 630 && x <= 1040 && y >= 520 && y <= 575) {
    const isBevel = y >= 571;
    if (isBevel) return [0x53, 0x7a, 0x2e, 255];
    return [0x81, 0xb6, 0x4c, 255]; // Signature brand emerald
  }

  return [r, g, b, a];
}

console.log("Rendering 1200x630 OpenGraph share preview image...");
const ogBuffer = createPng(1200, 630, ogPixel);
writeFileSync("public/og-preview.png", ogBuffer);
console.log(`✓ Generated public/og-preview.png (${(ogBuffer.length / 1024).toFixed(1)} KB)`);
