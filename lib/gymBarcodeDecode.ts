// Reads a barcode from a screenshot, in the browser. Kept apart from lib/gymBarcode.ts
// because the reader library is large: the Fitness page only downloads it when you pick
// a screenshot.
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
  type Binarizer,
  type LuminanceSource,
} from "@zxing/library";
import { parseGymBarcode, type GymBarcode, type GymBarcodeFormat } from "./gymBarcode";

// The barcode reader's names for each type, matched to ours.
const FROM_READER: Partial<Record<BarcodeFormat, GymBarcodeFormat>> = {
  [BarcodeFormat.CODE_128]: "code128",
  [BarcodeFormat.CODE_39]: "code39",
  [BarcodeFormat.CODE_93]: "code93",
  [BarcodeFormat.EAN_13]: "ean13",
  [BarcodeFormat.EAN_8]: "ean8",
  [BarcodeFormat.UPC_A]: "upca",
  [BarcodeFormat.UPC_E]: "upce",
  [BarcodeFormat.ITF]: "itf",
  [BarcodeFormat.CODABAR]: "codabar",
};

/** Turns a picture's colour pixels (RGBA, as a canvas gives them) into brightness values. */
export function toLuminance(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3] / 255;
    // See-through pixels count as white, like the screen behind them.
    out[i] = Math.round((0.299 * r + 0.587 * g + 0.114 * b) * a + 255 * (1 - a));
  }
  return out;
}

/** Turns a brightness picture a quarter turn, for barcodes shown sideways. */
export function rotateLuminance(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  // The new picture is `height` wide and `width` tall.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[x * height + (height - 1 - y)] = pixels[y * width + x];
  }
  return out;
}

/**
 * Shrinks a brightness picture to 1/factor of its size, each new pixel the average of a
 * factor x factor block. Averaging smooths out speckle (Safari adds faint random noise to
 * pictures a website reads, to stop tracking), which can hide a barcode's thin bars.
 */
export function shrinkLuminance(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  factor: number,
): [Uint8ClampedArray, number, number] {
  const w = Math.floor(width / factor);
  const h = Math.floor(height / factor);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++) {
        const row = (y * factor + dy) * width + x * factor;
        for (let dx = 0; dx < factor; dx++) sum += pixels[row + dx];
      }
      out[y * w + x] = Math.round(sum / (factor * factor));
    }
  }
  return [out, w, h];
}

/**
 * Finds a barcode in a picture (as brightness values, see toLuminance) and returns its
 * text and type, or null if there isn't one it can read. Tries a few ways of telling
 * black from white, then the picture shrunk (smoothing out speckle), then turned sideways.
 */
export function decodeGymBarcode(pixels: Uint8ClampedArray, width: number, height: number): GymBarcode | null {
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.POSSIBLE_FORMATS, Object.keys(FROM_READER).map(Number)],
  ]);
  reader.setHints(hints);

  // Built only when needed: most screenshots are read on the first try.
  const attempts: (() => [Uint8ClampedArray, number, number])[] = [
    () => [pixels, width, height],
    () => shrinkLuminance(pixels, width, height, 2),
    () => shrinkLuminance(pixels, width, height, 3),
    () => [rotateLuminance(pixels, width, height), height, width],
    () => {
      const [small, w, h] = shrinkLuminance(pixels, width, height, 2);
      return [rotateLuminance(small, w, h), h, w];
    },
  ];
  const binarizers: ((source: LuminanceSource) => Binarizer)[] = [
    (source) => new HybridBinarizer(source),
    (source) => new GlobalHistogramBinarizer(source),
  ];
  for (const attempt of attempts) {
    const [data, w, h] = attempt();
    for (const makeBinarizer of binarizers) {
      try {
        const result = reader.decodeWithState(new BinaryBitmap(makeBinarizer(new RGBLuminanceSource(data, w, h))));
        const format = FROM_READER[result.getBarcodeFormat()];
        const found = format ? parseGymBarcode({ text: result.getText(), format }) : null;
        if (found) return found;
      } catch {
        // Nothing found this way: try the next.
      } finally {
        reader.reset();
      }
    }
  }
  return null;
}
