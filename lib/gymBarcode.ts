// Your gym check-in barcode, shown at the top of the Fitness tab so you don't have to
// open the gym's own app at the front desk.
//
// How it works: you pick a screenshot of the barcode, the browser reads it
// (lib/gymBarcodeDecode.ts), and only the barcode's text and type are saved on your
// profile. The page then draws a fresh, sharp copy on the server every time
// (lib/gymBarcodeSvg.ts), so it's part of the page itself: no image to load.

// The striped barcode types we can both read from a screenshot and draw again.
// (Only striped barcodes, like the ones gym apps show: no QR codes.)
export const GYM_BARCODE_FORMATS = [
  "code128",
  "code39",
  "code93",
  "ean13",
  "ean8",
  "upca",
  "upce",
  "itf",
  "codabar",
] as const;

export type GymBarcodeFormat = (typeof GYM_BARCODE_FORMATS)[number];

export type GymBarcode = { text: string; format: GymBarcodeFormat };

/** A short, friendly name for each type ("Code 128", "EAN-13"...). */
export const FORMAT_LABELS: Record<GymBarcodeFormat, string> = {
  code128: "Code 128",
  code39: "Code 39",
  code93: "Code 93",
  ean13: "EAN-13",
  ean8: "EAN-8",
  upca: "UPC-A",
  upce: "UPC-E",
  itf: "ITF",
  codabar: "Codabar",
};

export const MAX_BARCODE_LENGTH = 200;

/**
 * Checks a barcode before it's saved (the browser could send anything): a known type,
 * and 1-200 characters with no hidden control characters.
 */
export function parseGymBarcode(input: unknown): GymBarcode | null {
  if (typeof input !== "object" || input === null) return null;
  const { text, format } = input as Record<string, unknown>;
  if (typeof format !== "string" || !(GYM_BARCODE_FORMATS as readonly string[]).includes(format)) return null;
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_BARCODE_LENGTH) return null;
  if (/[\u0000-\u001f\u007f]/.test(text)) return null;
  return { text, format: format as GymBarcodeFormat };
}
