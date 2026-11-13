// What kind of picture a file really is, read from its first bytes (its "signature").
// The browser also sends a type with each upload, but that's just a label anyone can
// change; the bytes can't be faked the same way. Used by the AI food-estimate route so
// only real photos are passed on to the AI.

export type ImageType = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  bytes.length >= signature.length && signature.every((byte, i) => bytes[i] === byte);

// iPhone photos (HEIC / HEIF) name their exact flavour in bytes 8-12.
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis"];
const HEIF_BRANDS = ["mif1", "msf1", "heif"];

/** The picture type found in the file's first bytes, or null if it isn't one we accept. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (HEIC_BRANDS.includes(brand)) return "image/heic";
    if (HEIF_BRANDS.includes(brand)) return "image/heif";
  }
  return null;
}
