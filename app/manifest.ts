import type { MetadataRoute } from "next";
import { ICON_VERSION } from "@/lib/iconVersion";

// The "web app manifest": tells the phone this website can be installed
// and how it should look when launched from the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DEVELOP",
    short_name: "DEVELOP",
    description: "DEVELOP: a wellness tracker for calories, macros, workouts, and cardio.",
    start_url: "/food",
    display: "standalone", // full-screen, like a native app
    background_color: "#000000", // black behind the icon while the app opens, to match it
    theme_color: "#000000", // black system bars, to match the icon
    // Plain PNG files in public/ (made by `npm run icons` from lib/appIcon.tsx).
    icons: [
      { src: `/icon-192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
