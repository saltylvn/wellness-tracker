import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";
import { ICON_VERSION } from "@/lib/iconVersion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  themeColor: "#ffffff", // white status bar: the app is always light
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
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
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
