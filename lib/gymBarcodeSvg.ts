// Draws your saved gym barcode as an SVG picture, on the server, every time the Fitness
// page loads. The picture is part of the page itself, so there's nothing extra to load,
// and it's always perfectly sharp (no blurry screenshot). Only used by server code: the
// drawing library never goes to the browser.
import bwipjs from "bwip-js/node";
import type { GymBarcode, GymBarcodeFormat } from "./gymBarcode";

// The drawing library's name for each barcode type.
const BWIP_TYPES: Record<GymBarcodeFormat, string> = {
  code128: "code128",
  code39: "code39",
  code93: "code93",
  ean13: "ean13",
  ean8: "ean8",
  upca: "upca",
  upce: "upce",
  itf: "interleaved2of5",
  codabar: "rationalizedCodabar",
};

/** Codabar needs start and stop letters (A-D); the reader sometimes leaves them off. */
function codabarText(text: string): string {
  return /^[A-D].*[A-D]$/i.test(text) ? text : `A${text}A`;
}

/**
 * The barcode as an SVG string, or null if it can't be drawn (say, a damaged value).
 * The SVG has no fixed size, so it stretches to fit its card, even wider than drawn
 * (every bar widens by the same amount, so scanners read it the same).
 */
export function gymBarcodeSvg(barcode: GymBarcode): string | null {
  try {
    const svg = bwipjs.toSVG({
      bcid: BWIP_TYPES[barcode.format],
      text: barcode.format === "codabar" ? codabarText(barcode.text) : barcode.text,
      scale: 2,
      height: 14, // millimetres
    });
    return svg.replace("<svg ", '<svg preserveAspectRatio="none" ');
  } catch {
    return null;
  }
}
