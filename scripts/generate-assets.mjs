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

// 1. Apple Touch Icon & Favicon pixel function (Dark Squircle with Emerald & Gold Knight)
function emblemPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const rCorner = 0.22;
  const cx = Math.min(Math.max(nx, rCorner), 1 - rCorner);
  const cy = Math.min(Math.max(ny, rCorner), 1 - rCorner);
  const distCorner = Math.hypot(nx - cx, ny - cy);

  if (distCorner > rCorner) {
    return [0, 0, 0, 0]; // outside squircle
  }

  // Specular edge highlight (top and left edges brighter)
  const isEdge = distCorner > rCorner - 0.02 || nx < 0.02 || nx > 0.98 || ny < 0.02 || ny > 0.98;
  if (isEdge) {
    if (ny < 0.3 || nx < 0.3) return [255, 255, 255, 70]; // subtle top specular highlight
    return [0, 0, 0, 160];
  }

  // Dark studio gradient background: #262522 to #141312
  const bgGrad = (nx + ny) * 0.5;
  let r = Math.round(0x28 * (1 - bgGrad) + 0x14 * bgGrad);
  let g = Math.round(0x26 * (1 - bgGrad) + 0x13 * bgGrad);
  let b = Math.round(0x22 * (1 - bgGrad) + 0x11 * bgGrad);
  let a = 255;

  // Normalized knight coordinate system (-1 to 1)
  const kx = (nx - 0.5) * 2;
  const ky = (ny - 0.5) * 2;

  // Pedestal base (emerald #81b64c)
  if (ky > 0.58 && ky < 0.76 && Math.abs(kx) < 0.72) {
    return [0x81, 0xb6, 0x4c, 255];
  }
  // Gold base stripe
  if (ky >= 0.50 && ky <= 0.58 && Math.abs(kx) < 0.64) {
    return [0xe5, 0xb8, 0x4b, 255];
  }

  // Knight silhouette
  if (ky > -0.70 && ky <= 0.50) {
    const neckLeft = -0.38 + (ky + 0.7) * 0.12;
    const neckRight = 0.36 + (ky > 0 ? (0.50 - ky) * 0.2 : 0);
    const snoutX = 0.58 - Math.max(0, ky + 0.15) * 0.55;

    if (kx >= neckLeft && kx <= Math.max(neckRight, snoutX)) {
      // Gold Mane Accents on the back
      if (kx < neckLeft + 0.18 && ky < 0.2) {
        return [0xe5, 0xb8, 0x4b, 255];
      }
      // Eye cutout & Gold pupil
      const eyeDist = Math.hypot(kx - 0.22, ky - (-0.28));
      if (eyeDist < 0.08) {
        if (eyeDist < 0.04) return [0xff, 0xff, 0xff, 255];
        return [0xe5, 0xb8, 0x4b, 255];
      }
      // Muzzle slit
      if (ky > -0.05 && ky < 0.03 && kx > 0.15 && kx < 0.45) {
        return [0xe5, 0xb8, 0x4b, 255];
      }
      // Main emerald body
      const shade = (kx + ky + 1) * 0.3;
      const er = Math.round(0x81 + shade * 20);
      const eg = Math.round(0xb6 + shade * 15);
      const eb = Math.round(0x4c + shade * 10);
      return [er, eg, eb, 255];
    }
  }

  return [r, g, b, a];
}

// 2. OpenGraph 1200x630 Social Share Card Pixel Function
function ogPreviewPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background: Dark luxury studio with vignette and emerald radial backlight
  // Center of glow around x: 380, y: 315 (the board area)
  const distGlow = Math.hypot(x - 380, y - 315) / 500;
  const glow = Math.max(0, 1 - distGlow);

  let r = Math.round(0x22 + glow * 18);
  let g = Math.round(0x21 + glow * 32);
  let b = Math.round(0x1e + glow * 16);
  let a = 255;

  // Grid subtle pattern across the background
  if ((x % 32 === 0 || y % 32 === 0) && distGlow > 0.5) {
    r = Math.min(255, r + 4);
    g = Math.min(255, g + 4);
    b = Math.min(255, b + 4);
  }

  // --- LEFT SIDE: 8x8 CHESSBOARD (x: 100 to 580, y: 75 to 555) -> 480x480 ---
  const bx0 = 90, by0 = 75, bSize = 480;
  const sqSize = bSize / 8; // 60px

  // Board Liquid Glass Outer Frame
  const frameBorder = 12;
  const fx0 = bx0 - frameBorder, fy0 = by0 - frameBorder;
  const fx1 = bx0 + bSize + frameBorder, fy1 = by0 + bSize + frameBorder;

  if (x >= fx0 && x <= fx1 && y >= fy0 && y <= fy1) {
    // Outside actual board squares -> Glass Frame
    if (x < bx0 || x > bx0 + bSize || y < by0 || y > by0 + bSize) {
      const isSpecularTop = y === fy0 || x === fx0;
      if (isSpecularTop) return [255, 255, 255, 60];
      return [0x1a, 0x19, 0x17, 255]; // Deep dark frame
    }

    // Inside board squares
    const col = Math.floor((x - bx0) / sqSize);
    const row = Math.floor((y - by0) / sqSize);
    const isLight = (col + row) % 2 === 0;

    // Last move highlight on e4 (col 4, row 4) and e2 (col 4, row 6)
    const isLastMove = (col === 4 && row === 4) || (col === 4 && row === 6);

    let sqR = isLight ? 0xee : 0x76;
    let sqG = isLight ? 0xee : 0x96;
    let sqB = isLight ? 0xd2 : 0x56;

    if (isLastMove) {
      sqR = Math.round(sqR * 0.6 + 0xff * 0.4);
      sqG = Math.round(sqG * 0.6 + 0xeb * 0.4);
      sqB = Math.round(sqB * 0.6 + 0x3b * 0.4);
    }

    // Draw piece silhouette in squares (approximate Staunton shapes)
    const sx = (x - bx0 - col * sqSize) / sqSize; // 0 to 1
    const sy = (y - by0 - row * sqSize) / sqSize; // 0 to 1
    const px = (sx - 0.5) * 2;
    const py = (sy - 0.5) * 2;

    // Place pieces:
    // row 0: black major pieces, row 1: black pawns, row 7: white major, row 6: white pawns, row 4: e4 pawn
    const hasWhitePiece = (row === 7 && col !== 4) || (row === 6 && col !== 4) || (row === 4 && col === 4);
    const hasBlackPiece = (row === 0) || (row === 1 && col !== 4) || (row === 3 && col === 4);

    if (hasWhitePiece || hasBlackPiece) {
      const pieceColor = hasWhitePiece ? [245, 245, 244, 255] : [28, 27, 25, 255];
      const pieceTrim = hasWhitePiece ? [80, 80, 80, 255] : [229, 184, 75, 255];

      // Circular piece head or body
      const distCenter = Math.hypot(px, py + 0.1);
      if (distCenter < 0.45 && py < 0.5) {
        if (distCenter > 0.40) return pieceTrim;
        return pieceColor;
      }
      // Piece base
      if (py >= 0.5 && py <= 0.75 && Math.abs(px) < 0.6) {
        if (py >= 0.70 || Math.abs(px) > 0.55) return pieceTrim;
        return pieceColor;
      }
    }

    return [sqR, sqG, sqB, 255];
  }

  // --- RIGHT SIDE: BRANDING, TYPOGRAPHY & BADGES (x: 640 to 1120) ---
  // 1. Ismail Studio Emblem Squircle (x: 650 to 730, y: 130 to 210) -> 80x80
  const ex0 = 650, ey0 = 120, eSize = 84;
  if (x >= ex0 && x < ex0 + eSize && y >= ey0 && y < ey0 + eSize) {
    const ep = emblemPixel(x - ex0, y - ey0, eSize, eSize);
    if (ep[3] > 0) return ep;
  }

  // 2. Brand Title Area "CHESS | ISMAIL STUDIO"
  // Horizontal Gold Line separator below header
  if (x >= 650 && x <= 1120 && y >= 226 && y <= 228) {
    return [0xe5, 0xb8, 0x4b, 220]; // Brushed gold accent line
  }

  // 3. Feature Pills / Glass Cards (y: 250 to 420)
  // Pill 1: Real-Time Multiplayer (y: 255 to 295)
  // Pill 2: Stockfish 17 Engines (y: 310 to 350)
  // Pill 3: Live Friend Challenges (y: 365 to 405)
  const pills = [
    { y0: 255, y1: 295, w: 380, dotColor: [0x81, 0xb6, 0x4c] },
    { y0: 310, y1: 350, w: 340, dotColor: [0xe5, 0xb8, 0x4b] },
    { y0: 365, y1: 405, w: 360, dotColor: [0x42, 0x85, 0xf4] },
  ];

  for (const p of pills) {
    if (y >= p.y0 && y <= p.y1 && x >= 650 && x <= 650 + p.w) {
      const isTopBorder = y === p.y0;
      if (isTopBorder) return [255, 255, 255, 30];
      // Dot indicator (x: 670, y: center)
      const cy = (p.y0 + p.y1) / 2;
      if (Math.hypot(x - 670, y - cy) < 6) {
        return [...p.dotColor, 255];
      }
      return [0x30, 0x2e, 0x2b, 230]; // elevated glass surface
    }
  }

  // 4. Emerald CTA Banner Pill (y: 450 to 510, x: 650 to 1020)
  if (x >= 650 && x <= 1040 && y >= 450 && y <= 510) {
    const isBevel = y >= 506;
    if (isBevel) return [0x53, 0x7a, 0x2e, 255]; // 3D bevel
    const isSpecular = y === 450;
    if (isSpecular) return [255, 255, 255, 90];
    return [0x81, 0xb6, 0x4c, 255]; // Emerald CTA
  }

  // 5. Website URL badge (y: 535 to 555, x: 650 to 860)
  if (x >= 650 && x <= 900 && y >= 535 && y <= 555) {
    if (Math.hypot(x - 660, y - 545) < 4) {
      return [0x81, 0xb6, 0x4c, 255];
    }
  }

  return [r, g, b, a];
}

console.log("Generating brand assets...");

// 1. apple-touch-icon.png (180x180)
const png180 = createPng(180, 180, emblemPixel);
writeFileSync("public/apple-touch-icon.png", png180);
console.log("✓ Created public/apple-touch-icon.png (180x180)");

// 2. favicon.ico (32x32 standard ICO)
const png32 = createPng(32, 32, emblemPixel);
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
console.log("✓ Created public/favicon.ico (32x32)");

// 3. og-preview.png (1200x630 high resolution social share card)
const ogPng = createPng(1200, 630, ogPreviewPixel);
writeFileSync("public/og-preview.png", ogPng);
console.log("✓ Created public/og-preview.png (1200x630)");
