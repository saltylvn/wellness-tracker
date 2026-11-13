import { describe, expect, it } from "vitest";
import { sniffImageType } from "./imageCheck";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("sniffImageType", () => {
  it("recognizes the photo types the app accepts from their first bytes", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("image/webp");
    expect(sniffImageType(bytes(0, 0, 0, 24, "ftyp", "heic"))).toBe("image/heic");
    expect(sniffImageType(bytes(0, 0, 0, 24, "ftyp", "mif1"))).toBe("image/heif");
  });

  it("refuses anything else, whatever the upload calls itself", () => {
    expect(sniffImageType(bytes("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(sniffImageType(bytes("<!doctype html><script>"))).toBeNull();
    expect(sniffImageType(bytes("%PDF-1.7 and more"))).toBeNull();
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WAVE"))).toBeNull(); // a sound file
    expect(sniffImageType(bytes(0, 0, 0, 24, "ftyp", "mp42"))).toBeNull(); // a video
    expect(sniffImageType(bytes(0xff, 0xd8))).toBeNull(); // too short
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
