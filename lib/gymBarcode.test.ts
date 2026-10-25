import bwipjs from "bwip-js/node";
import { describe, expect, it } from "vitest";
import { GYM_BARCODE_FORMATS, parseGymBarcode, type GymBarcodeFormat } from "./gymBarcode";
import { decodeGymBarcode, rotateLuminance, toLuminance } from "./gymBarcodeDecode";
import { gymBarcodeSvg } from "./gymBarcodeSvg";

// Draws a barcode as a brightness picture (255 = white, 0 = black), the way a
// screenshot would look, using the drawing library's bar widths.
function picture(bcid: string, text: string, scale = 3) {
  const [raw] = bwipjs.raw({ bcid, text }) as unknown as [
    { sbs?: number[] },
  ];
  const margin = 20 * scale; // white space around it, like a phone screen
  if (raw.sbs) {
    // Alternating bar and space widths, starting with a bar.
    const modules = raw.sbs.reduce((sum, w) => sum + w, 0);
    const width = modules * scale + margin * 2;
    const height = 60 * scale;
    const pixels = new Uint8ClampedArray(width * height).fill(255);
    let x = margin;
    raw.sbs.forEach((w, i) => {
      if (i % 2 === 0) {
        for (let y = margin; y < height - margin; y++) pixels.fill(0, y * width + x, y * width + x + w * scale);
      }
      x += w * scale;
    });
    return { pixels, width, height };
  }
  throw new Error(`${bcid} is not a striped barcode`);
}

describe("parseGymBarcode", () => {
  it("accepts a known type and ordinary text", () => {
    expect(parseGymBarcode({ text: "0012345678", format: "code128" })).toEqual({ text: "0012345678", format: "code128" });
  });

  it("refuses unknown types, empty or overly long text, and control characters", () => {
    expect(parseGymBarcode({ text: "123", format: "maxicode" })).toBeNull();
    expect(parseGymBarcode({ text: "123", format: "qr" })).toBeNull(); // striped barcodes only
    expect(parseGymBarcode({ text: "", format: "code128" })).toBeNull();
    expect(parseGymBarcode({ text: "x".repeat(201), format: "code128" })).toBeNull();
    expect(parseGymBarcode({ text: "12\n34", format: "code128" })).toBeNull();
    expect(parseGymBarcode({ text: 123, format: "code128" })).toBeNull();
    expect(parseGymBarcode(null)).toBeNull();
  });
});

describe("GYM_BARCODE_FORMATS", () => {
  it("has no QR codes", () => {
    expect(GYM_BARCODE_FORMATS).not.toContain("qr");
  });
});

describe("toLuminance", () => {
  it("turns colours into brightness, and see-through pixels into white", () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0]);
    expect([...toLuminance(rgba, 3, 1)]).toEqual([0, 255, 255]);
  });
});

describe("rotateLuminance", () => {
  it("turns a 2x3 picture a quarter turn clockwise", () => {
    // 1 2
    // 3 4
    // 5 6
    const rotated = rotateLuminance(new Uint8ClampedArray([1, 2, 3, 4, 5, 6]), 2, 3);
    // 5 3 1
    // 6 4 2
    expect([...rotated]).toEqual([5, 3, 1, 6, 4, 2]);
  });
});

describe("decodeGymBarcode", () => {
  const samples: [GymBarcodeFormat, string, string][] = [
    ["code128", "code128", "GYM-0012345"],
    ["code39", "code39", "MEMBER42"],
    ["ean13", "ean13", "5901234123457"],
    ["itf", "interleaved2of5", "12345678"],
  ];

  it.each(samples)("reads a %s barcode", (format, bcid, text) => {
    const { pixels, width, height } = picture(bcid, text);
    expect(decodeGymBarcode(pixels, width, height)).toEqual({ text, format });
  });

  it("reads a barcode shown sideways", () => {
    const { pixels, width, height } = picture("code128", "SIDEWAYS1");
    expect(decodeGymBarcode(rotateLuminance(pixels, width, height), height, width)).toEqual({
      text: "SIDEWAYS1",
      format: "code128",
    });
  });

  it("ignores QR codes", () => {
    const [raw] = bwipjs.raw({ bcid: "qrcode", text: "QR123" }) as unknown as [{ pixs: number[]; pixx: number; pixy: number }];
    const scale = 4;
    const size = (raw.pixx + 20) * scale;
    const pixels = new Uint8ClampedArray(size * size).fill(255);
    raw.pixs.forEach((on, i) => {
      if (!on) return;
      const row = Math.floor(i / raw.pixx) + 10;
      const col = (i % raw.pixx) + 10;
      for (let y = 0; y < scale; y++) pixels.fill(0, (row * scale + y) * size + col * scale, (row * scale + y) * size + (col + 1) * scale);
    });
    expect(decodeGymBarcode(pixels, size, size)).toBeNull();
  });

  it("returns null for a picture with no barcode", () => {
    expect(decodeGymBarcode(new Uint8ClampedArray(200 * 100).fill(255), 200, 100)).toBeNull();
  });
});

describe("gymBarcodeSvg", () => {
  it("draws an SVG that stretches to fit", () => {
    const svg = gymBarcodeSvg({ text: "0012345678", format: "code128" });
    expect(svg).toMatch(/^<svg preserveAspectRatio="none" viewBox="[\d. ]+"/);
    expect(svg).not.toMatch(/<svg[^>]* width=/);
  });

  it("draws Codabar with or without its start and stop letters", () => {
    expect(gymBarcodeSvg({ text: "123456", format: "codabar" })).toContain("<svg");
    expect(gymBarcodeSvg({ text: "A123456B", format: "codabar" })).toContain("<svg");
  });

  it("returns null for a value its type can't hold", () => {
    expect(gymBarcodeSvg({ text: "not digits", format: "ean13" })).toBeNull();
  });
});
