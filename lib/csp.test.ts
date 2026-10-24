import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "./csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `));

describe("buildCsp", () => {
  const prod = buildCsp({ nonce: "abc123", isDev: false, supabaseUrl: "https://xyz.supabase.co/" });

  it("only runs scripts that carry this request's nonce", () => {
    expect(directive(prod, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(prod).not.toContain("unsafe-eval");
    expect(directive(prod, "script-src")).not.toContain("unsafe-inline");
  });

  it("allows eval only in development (React's debugging needs it)", () => {
    expect(directive(buildCsp({ nonce: "n", isDev: true }), "script-src")).toContain("'unsafe-eval'");
  });

  it("lets Google sign-in redirect through Supabase to Google, and nowhere else", () => {
    expect(directive(prod, "form-action")).toBe("form-action 'self' https://xyz.supabase.co https://accounts.google.com");
  });

  it("blocks framing, plugins and other sites in the browser", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(directive(prod, "connect-src")).toBe("connect-src 'self'");
  });

  it("upgrades to https only in production (localhost is plain http)", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(buildCsp({ nonce: "n", isDev: true })).not.toContain("upgrade-insecure-requests");
  });

  it("survives a missing or bad Supabase URL", () => {
    expect(directive(buildCsp({ nonce: "n", isDev: false, supabaseUrl: "not a url" }), "form-action")).toBe(
      "form-action 'self' https://accounts.google.com",
    );
  });
});

describe("createNonce", () => {
  it("is different every time", () => {
    expect(createNonce()).not.toBe(createNonce());
    expect(createNonce().length).toBeGreaterThan(30);
  });
});
