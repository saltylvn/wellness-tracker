import type { NextConfig } from "next";

// Safe browser-protection headers for every page. They're skipped for the app icons (.png)
// and the web app manifest, where they do nothing. (They were ruled out as the cause of the
// letter home-screen icon: that turned out to be the iOS 27.2 beta, which showed a letter for
// every site, github.com included.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" }, // don't guess file types
  { key: "X-Frame-Options", value: "DENY" }, // no one can embed the app in another site
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app never uses the camera API (photos come from the phone's own picker), the
  // microphone, location or payments, so no page (or injected code) can ask for them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" }, // other sites' windows can't reach this one
];
// The Content Security Policy is sent by proxy.ts (it needs a fresh nonce per request).

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise "Next.js" in every response
  async headers() {
    return [{ source: "/:path((?!.*\\.png$)(?!manifest\\.webmanifest$).*)", headers: securityHeaders }];
  },
};

export default nextConfig;
