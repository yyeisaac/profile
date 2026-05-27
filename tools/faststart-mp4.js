#!/usr/bin/env node
/**
 * faststart-mp4.js
 * Pure-Node MP4 "faststart" — moves the moov atom from the end of the
 * file to right after ftyp so browsers can build the seek timeline
 * without downloading the entire video. Equivalent to:
 *   ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4
 * but with no external dependency.
 *
 * Usage:
 *   node tools/faststart-mp4.js path/to/video.mp4 [path/to/output.mp4]
 *
 * If the output path is omitted, the input file is overwritten in place.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* Atoms that contain other atoms — we need to descend into these to
   find stco / co64 chunk-offset tables that have to be patched. */
const CONTAINER_ATOMS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'udta']);

function readAtomHeader(buf, pos) {
  if (pos + 8 > buf.length) return null;
  let size = buf.readUInt32BE(pos);
  const type = buf.toString('latin1', pos + 4, pos + 8);
  let headerSize = 8;
  if (size === 1) {
    if (pos + 16 > buf.length) return null;
    const hi = buf.readUInt32BE(pos + 8);
    const lo = buf.readUInt32BE(pos + 12);
    size = hi * 0x100000000 + lo;
    headerSize = 16;
  } else if (size === 0) {
    size = buf.length - pos;
  }
  if (size < headerSize || pos + size > buf.length) return null;
  return { pos, type, size, headerSize };
}

function patchChunkOffsets(buf, shift) {
  let pos = 0;
  while (pos < buf.length) {
    const atom = readAtomHeader(buf, pos);
    if (!atom) break;

    if (atom.type === 'stco') {
      const dataStart = atom.pos + atom.headerSize;
      const entryCount = buf.readUInt32BE(dataStart + 4);
      for (let i = 0; i < entryCount; i++) {
        const ep = dataStart + 8 + i * 4;
        buf.writeUInt32BE(buf.readUInt32BE(ep) + shift, ep);
      }
    } else if (atom.type === 'co64') {
      const dataStart = atom.pos + atom.headerSize;
      const entryCount = buf.readUInt32BE(dataStart + 4);
      for (let i = 0; i < entryCount; i++) {
        const ep = dataStart + 8 + i * 8;
        const hi = buf.readUInt32BE(ep);
        const lo = buf.readUInt32BE(ep + 4);
        const newVal = hi * 0x100000000 + lo + shift;
        buf.writeUInt32BE(Math.floor(newVal / 0x100000000), ep);
        buf.writeUInt32BE(newVal % 0x100000000, ep + 4);
      }
    } else if (CONTAINER_ATOMS.has(atom.type)) {
      // subarray returns a Buffer that shares memory — mutations propagate
      patchChunkOffsets(buf.subarray(atom.pos + atom.headerSize, atom.pos + atom.size), shift);
    }

    pos += atom.size;
  }
}

function faststart(inputPath, outputPath) {
  const data = fs.readFileSync(inputPath);

  // Walk top-level atoms
  const atoms = [];
  let pos = 0;
  while (pos < data.length) {
    const atom = readAtomHeader(data, pos);
    if (!atom) {
      throw new Error('Malformed mp4 — could not parse atom at offset ' + pos);
    }
    atoms.push(atom);
    pos += atom.size;
  }

  const ftypIdx = atoms.findIndex(a => a.type === 'ftyp');
  const moovIdx = atoms.findIndex(a => a.type === 'moov');

  if (ftypIdx < 0) throw new Error('No ftyp atom found — not a valid mp4');
  if (moovIdx < 0) throw new Error('No moov atom found — not a valid mp4');

  if (moovIdx === ftypIdx + 1) {
    console.log('[faststart] already in faststart order (moov immediately after ftyp). Nothing to do.');
    return false;
  }

  const ftyp = atoms[ftypIdx];
  const moov = atoms[moovIdx];

  // Copy moov so the patch doesn't corrupt the source view
  const moovBuf = Buffer.from(data.subarray(moov.pos, moov.pos + moov.size));

  // Every chunk offset will shift forward by moov.size bytes
  patchChunkOffsets(moovBuf, moov.size);

  // New layout: ftyp, moov (patched), then everything else in original order
  const parts = [];
  parts.push(data.subarray(ftyp.pos, ftyp.pos + ftyp.size));
  parts.push(moovBuf);
  for (let i = 0; i < atoms.length; i++) {
    if (i === ftypIdx || i === moovIdx) continue;
    parts.push(data.subarray(atoms[i].pos, atoms[i].pos + atoms[i].size));
  }

  const newData = Buffer.concat(parts);

  if (newData.length !== data.length) {
    throw new Error(
      'Output size mismatch (' + newData.length + ' vs ' + data.length + ') — refusing to write'
    );
  }

  fs.writeFileSync(outputPath, newData);
  console.log(
    '[faststart] OK — moved moov (' + moov.size + ' bytes) to offset ' + ftyp.size +
    '. Wrote ' + outputPath
  );
  return true;
}

const input = process.argv[2];
const output = process.argv[3] || input;
if (!input) {
  console.error('Usage: node tools/faststart-mp4.js <input.mp4> [output.mp4]');
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error('Input not found: ' + input);
  process.exit(1);
}
faststart(path.resolve(input), path.resolve(output));
