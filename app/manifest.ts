import type { MetadataRoute } from "next";
import { ICON_VERSION } from "../lib/iconVersion"; // relative, so the unit test can load this file

// The "web app manifest": tells the phone this website can be installed
// and how it should look when launched from the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DEVELOP",
    short_name: "DEVELOP",
    description: "DEVELOP: a wellness tracker for calories, macros, workouts, and cardio.",
    start_url: "/workouts", // opens on the Fitness tab
    display: "standalone", // full-screen, like a native app
    background_color: "#ffffff", // white while the app opens, to match the app
    theme_color: "#ffffff", // white system bars, to match the app
    // Plain PNG files in public/ (made by `npm run icons` from lib/appIcon.tsx). Newer iPhones
    // take the home-screen icon from here, so the 180x180 iPhone size comes first.
    icons: [
      { src: `/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: "180x180", type: "image/png", purpose: "any" },
      { src: `/icon-192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
