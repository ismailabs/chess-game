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
  const compressed = deflateSync(rawData);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Generate stylish icon: #25282d dark rounded background with #4d7a59 emerald knight silhouette
function chessIconPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const rCorner = 0.2; // rounded corner radius
  const cx = Math.min(Math.max(nx, rCorner), 1 - rCorner);
  const cy = Math.min(Math.max(ny, rCorner), 1 - rCorner);
  const distCorner = Math.hypot(nx - cx, ny - cy);
  if (distCorner > rCorner) {
    return [0, 0, 0, 0]; // outside rounded rect
  }

  // Base background
  let r = 0x25, g = 0x28, b = 0x2d, a = 255;

  // Knight silhouette approximation
  const kx = (nx - 0.5) * 2; // -1 to 1
  const ky = (ny - 0.5) * 2; // -1 to 1

  // Base plate
  if (ky > 0.6 && ky < 0.8 && Math.abs(kx) < 0.7) {
    return [0x4d, 0x7a, 0x59, 255];
  }
  if (ky > 0.45 && ky <= 0.6 && Math.abs(kx) < 0.55) {
    return [0x4d, 0x7a, 0x59, 255];
  }
  // Knight body / head
  if (ky > -0.65 && ky <= 0.45) {
    const neckLeft = -0.35 + (ky + 0.6) * 0.1;
    const neckRight = 0.35 + (ky > 0 ? (0.45 - ky) * 0.2 : 0);
    const snoutX = 0.55 - Math.max(0, ky + 0.2) * 0.5;
    if (kx >= neckLeft && kx <= Math.max(neckRight, snoutX)) {
      // Eye cutout
      if (Math.hypot(kx - 0.15, ky - (-0.3)) < 0.08) {
        return [0xf5, 0xf2, 0xea, 255];
      }
      return [0x4d, 0x7a, 0x59, 255];
    }
  }

  // Subtle border glow
  if (distCorner > rCorner - 0.02 || nx < 0.02 || nx > 0.98 || ny < 0.02 || ny > 0.98) {
    return [0x3b, 0x40, 0x48, 255];
  }

  return [r, g, b, a];
}

const png180 = createPng(180, 180, chessIconPixel);
writeFileSync("public/apple-touch-icon.png", png180);
console.log("Created public/apple-touch-icon.png (180x180)");

const png32 = createPng(32, 32, chessIconPixel);

// Wrap 32x32 PNG in standard ICO header
const icoHeader = Buffer.alloc(6 + 16);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // icon type
icoHeader.writeUInt16LE(1, 4); // 1 image
// Directory entry
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
console.log("Created public/favicon.ico");
