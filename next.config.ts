import type { NextConfig } from "next";

// Safe browser-protection headers for every page. They're skipped for the app icons (.png)
// and the web app manifest: they do nothing for those files, and iPhones read those files
// for "Add to Home Screen" (the home-screen icon started falling back to a letter after
// these headers were added, so they're kept off anything the icon depends on).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" }, // don't guess file types
  { key: "X-Frame-Options", value: "DENY" }, // no one can embed the app in another site
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise "Next.js" in every response
  async headers() {
    return [{ source: "/:path((?!.*\\.png$)(?!manifest\\.webmanifest$).*)", headers: securityHeaders }];
  },
};

export default nextConfig;
