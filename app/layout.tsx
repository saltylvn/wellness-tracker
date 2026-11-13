import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";
import { ICON_VERSION } from "@/lib/iconVersion";

// The fonts are files in this repo (app/fonts, free to use: see LICENSES.txt), served from
// this site, so a build never depends on reaching Google Fonts. Inter is for text, Manrope
// for headings, and Source Code Pro for the small capital-letter labels.
const inter = localFont({ src: "./fonts/inter-latin.woff2", weight: "100 900", variable: "--font-inter", display: "swap" });
const manrope = localFont({ src: "./fonts/manrope-latin.woff2", weight: "500 700", variable: "--font-manrope", display: "swap" });
const sourceCode = localFont({
  src: "./fonts/source-code-pro-latin.woff2",
  weight: "400 500",
  variable: "--font-source-code",
  display: "swap",
});

// <head> info: the browser tab title, and the settings iPhone Safari reads
// when you tap "Add to Home Screen".
export const metadata: Metadata = {
  title: "DEVELOP",
  description: "DEVELOP: a wellness tracker for calories, macros, workouts, and cardio.",
  // The app icon as plain PNG files in public/ (made by `npm run icons` from lib/appIcon.tsx).
  // iPhones use apple-touch-icon.png for the home screen; browsers use the others for tabs.
  // ?v= makes phones fetch a fresh copy instead of a saved old one (lib/iconVersion.ts).
  icons: {
    icon: [
      { url: `/icon-192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
      { url: `/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true, // open full-screen (no Safari toolbars) from the home screen
    title: "DEVELOP", // the label under the home-screen icon
    statusBarStyle: "default",
  },
};

// How the page fits the phone screen.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // let the page extend under the notch / home bar
  // The status bar matches the page: light, or near-black when the phone is in dark mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

// Runs before the page paints. The launch splash should show once each time the app
// is opened, not on every page load: the first time in a session we remember that we
// showed it (sessionStorage lives until the app is fully closed), and later loads add
// the "no-splash" class so the splash stays hidden.
const SPLASH_ONCE_SCRIPT = `try{var d=document.documentElement;if(sessionStorage.getItem("develop-splash")){d.classList.add("no-splash")}else{sessionStorage.setItem("develop-splash","1")}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The Content Security Policy only runs scripts with this request's nonce (proxy.ts).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // suppressHydrationWarning: the script above adds a class to <html> before React starts.
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${sourceCode.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SPLASH_ONCE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
