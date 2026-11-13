import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./sameOrigin";

const h = (values: Record<string, string>) => new Headers(values);

describe("isSameOrigin", () => {
  it("accepts requests from the app's own pages", () => {
    expect(isSameOrigin(h({ origin: "https://app.example", host: "app.example" }))).toBe(true);
    expect(isSameOrigin(h({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    // Behind a proxy, the address the visitor used is in x-forwarded-host.
    expect(isSameOrigin(h({ origin: "https://app.example", host: "internal:8080", "x-forwarded-host": "app.example" }))).toBe(true);
  });

  it("refuses requests sent from another site", () => {
    expect(isSameOrigin(h({ origin: "https://evil.example", host: "app.example" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "https://app.example.evil.example", host: "app.example" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "null", host: "app.example" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "https://app.example" }))).toBe(false); // no host to compare with
  });

  it("lets through requests with no Origin header (not sent by another site's script)", () => {
    expect(isSameOrigin(h({ host: "app.example" }))).toBe(true);
  });
});
