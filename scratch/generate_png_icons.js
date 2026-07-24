import fs from 'fs';
import path from 'path';

function generatePNG(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdr);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const zlibHeader = Buffer.from([0x78, 0x01]);
  const blocks = [];
  const maxBlockSize = 65535;
  let offset = 0;

  while (offset < rawData.length) {
    const isLast = offset + maxBlockSize >= rawData.length;
    const currentBlockSize = Math.min(maxBlockSize, rawData.length - offset);
    const blockHeader = Buffer.alloc(5);
    blockHeader[0] = isLast ? 1 : 0;
    blockHeader.writeUInt16LE(currentBlockSize, 1);
    blockHeader.writeUInt16LE(currentBlockSize ^ 0xffff, 3);

    blocks.push(blockHeader);
    blocks.push(rawData.subarray(offset, offset + currentBlockSize));
    offset += currentBlockSize;
  }

  const adler = calcAdler32(rawData);
  const adlerBuf = Buffer.alloc(4);
  adlerBuf.writeUInt32BE(adler >>> 0, 0);

  const idatData = Buffer.concat([zlibHeader, ...blocks, adlerBuf]);
  const idatChunk = createChunk('IDAT', idatData);

  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);
  const crc = calcCRC32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, crcData, crcBuf]);
}

function calcAdler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function calcCRC32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Pixel drawer matching Image 3: Teal Rounded Badge with Test Tube
function drawAppIconPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  const radius = 0.22;
  let inBadge = false;

  const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - radius));
  const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - radius));
  if (dx * dx + dy * dy <= radius * radius) {
    inBadge = true;
  }

  if (!inBadge) {
    return [0, 0, 0, 0];
  }

  // Teal Base Color (#00c9a7 / #00d2b4)
  let r = 0;
  let g = 201;
  let b = 167;
  let a = 255;

  const cx = nx - 0.5;
  const cy = ny - 0.5;
  const rad = -15 * (Math.PI / 180);
  const rx = cx * Math.cos(-rad) - cy * Math.sin(-rad);
  const ry = cx * Math.sin(-rad) + cy * Math.cos(-rad);

  const tubeWidth = 0.10;
  const tubeTop = -0.24;
  const tubeBottom = 0.22;

  const strokeThickness = 0.035;
  const innerTubeWidth = tubeWidth - strokeThickness;

  const isRim = ry >= (tubeTop - 0.04) && ry <= tubeTop && Math.abs(rx) <= (tubeWidth + 0.04);
  const isTubeBody = ry >= tubeTop && ry <= tubeBottom && Math.abs(rx) <= tubeWidth;
  const isTubeBottomCap = ry > tubeBottom && (rx * rx + (ry - tubeBottom) * (ry - tubeBottom) <= tubeWidth * tubeWidth);

  const isOuterTube = isRim || isTubeBody || isTubeBottomCap;

  const isInnerBody = ry >= tubeTop && ry <= tubeBottom && Math.abs(rx) <= innerTubeWidth;
  const isInnerBottom = ry > tubeBottom && (rx * rx + (ry - tubeBottom) * (ry - tubeBottom) <= innerTubeWidth * innerTubeWidth);
  const isInnerTube = isInnerBody || isInnerBottom;

  if (isOuterTube && !isInnerTube) {
    return [7, 10, 19, 255];
  }

  if (isInnerTube) {
    if (ry >= -0.02) {
      return [94, 234, 212, 255];
    } else {
      return [255, 255, 255, 240];
    }
  }

  if (rx >= (tubeWidth * 0.3) && rx <= (tubeWidth + strokeThickness) && ry >= -0.15 && ry <= 0.12) {
    const markY = Math.abs((ry + 0.15) % 0.08);
    if (markY <= 0.02) {
      return [7, 10, 19, 255];
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve(process.cwd(), 'public');

console.log('Generating pwa-192x192.png...');
const png192 = generatePNG(192, 192, drawAppIconPixel);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

console.log('Generating pwa-512x512.png...');
const png512 = generatePNG(512, 512, drawAppIconPixel);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

console.log('PNG Icons successfully generated!');
