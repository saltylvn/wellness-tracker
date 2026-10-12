// Rewrites a PNG keeping only the chunks needed to draw it (IHDR, PLTE, IDAT, IEND) plus
// sRGB. macOS's `sips` adds photo metadata (EXIF, XMP, ...) that iPhones don't need for an
// app icon, so this leaves a plain, minimal image. Usage: node scripts/strip-png.mjs file.png ...
import { readFileSync, writeFileSync } from "node:fs";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "sRGB"]);

for (const file of process.argv.slice(2)) {
  const data = readFileSync(file);
  if (!data.subarray(0, 8).equals(SIGNATURE)) throw new Error(`${file} is not a PNG`);
  const parts = [SIGNATURE];
  let offset = 8;
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("latin1", offset + 4, offset + 8);
    const end = offset + 12 + length; // length + type + data + CRC
    if (KEEP.has(type)) parts.push(data.subarray(offset, end));
    offset = end;
  }
  writeFileSync(file, Buffer.concat(parts));
  console.log(`${file}: kept ${parts.length - 1} chunks`);
}
