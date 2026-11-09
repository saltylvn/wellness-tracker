import { ICON_VERSION } from "@/lib/iconVersion";

// The launch splash: the logo, the name, and the subtitle, filling the screen for
// about a second when the app opens, then fading away. It is pure markup and CSS
// (see .splash in globals.css), so it needs no JavaScript to disappear. A tiny script
// in the layout keeps it from replaying on every page load.
export default function SplashScreen() {
  return (
    <div className="splash" aria-hidden="true">
      {/* A plain <img> is right here: it's the generated app icon, shown at one fixed size.
          ?v= (like the home-screen icon links) makes phones fetch the new logo after a change,
          instead of showing a copy they saved earlier. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/icon-512.png?v=${ICON_VERSION}`} alt="" width={104} height={104} className="splash-logo" />
      <p className="splash-name">DEVELOP</p>
      <p className="splash-sub">wellness tracker</p>
    </div>
  );
}
