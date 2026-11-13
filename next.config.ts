import type { NextConfig } from "next";

// Safe browser-protection headers for every page. They're skipped for the app icons (.png)
// and the web app manifest, where they do nothing. (They were ruled out as the cause of the
// letter home-screen icon: that turned out to be the iOS 27.2 beta, which showed a letter for
// every site, github.com included.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" }, // don't guess file types
  { key: "X-Frame-Options", value: "DENY" }, // no one can embed the app in another site
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Always use https, for two years. (Vercel adds this too; set here so it holds on any host.)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // The app never uses the camera API (photos come from the phone's own picker), the
  // microphone, location, payments, motion sensors, screen capture or attached devices,
  // so no page (or injected code) can ask for them.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=(), " +
      "accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" }, // other sites' windows can't reach this one
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" }, // other sites can't load this app's pages or data
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" }, // no Flash / PDF cross-site access files
  { key: "Origin-Agent-Cluster", value: "?1" }, // keep this site's pages in their own browser process group
];
// The Content Security Policy is sent by proxy.ts (it needs a fresh nonce per request).

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise "Next.js" in every response
  async headers() {
    return [{ source: "/:path((?!.*\\.png$)(?!manifest\\.webmanifest$).*)", headers: securityHeaders }];
  },
};

export default nextConfig;
