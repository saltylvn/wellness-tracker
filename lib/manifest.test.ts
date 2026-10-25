import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";
import { ICON_VERSION } from "./iconVersion";

// iPhones take the home-screen icon from the manifest; if they can't use what's listed
// they show a letter instead of the logo. These checks guard the icon list.
describe("web app manifest", () => {
  it("opens on the Fitness tab", () => {
    expect(manifest().start_url).toBe("/workouts");
  });
});

describe("web app manifest icons", () => {
  const icons = manifest().icons ?? [];

  it("lists only PNG files", () => {
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(icon.src).toMatch(/\.png\?v=/);
    }
  });

  it("starts with the 180x180 iPhone icon and also has 192 and 512", () => {
    expect(icons[0]).toMatchObject({ src: `/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: "180x180" });
    expect(icons.map((icon) => icon.sizes)).toEqual(["180x180", "192x192", "512x512"]);
  });

  it("versions every icon so phones fetch a fresh copy", () => {
    for (const icon of icons) expect(icon.src).toContain(`?v=${ICON_VERSION}`);
  });
});
