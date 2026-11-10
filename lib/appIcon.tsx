import { ImageResponse } from "next/og";

// The app icon, drawn in code (no image files): a minimal black and white design, just a
// fine black trend line rising to an arrowhead (progress) on a white background.
//
// This file is the design. The icons the phone actually uses are plain PNG files in public/
// (apple-touch-icon.png, icon-192.png, icon-512.png): after changing the design here, run
// `npm run dev`, then `npm run icons` to redraw them.
//
// iPhones let a web app have only ONE home-screen icon (it can't switch between
// light and dark), so this white icon is used for the home screen and every
// browser tab.
//
// Note: the image renderer only allows plain SVG tags inside <svg> (no React
// fragments or custom components), so everything is wrapped in <g> groups.

// The trend on a 512 x 512 canvas: up, a small dip, then up to the arrowhead.
const TREND = "120,340 214,246 278,304 392,190";
const ARROW_HEAD = "324,184 398,184 398,258";

const INK = "#111111"; // near-black line
const WHITE = "#ffffff";
const BG_BOTTOM = "#f0f0f1"; // the white background fades to a very light grey

function iconSvg(size: number) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WHITE} />
          <stop offset="1" stopColor={BG_BOTTOM} />
        </linearGradient>
      </defs>

      <rect width="512" height="512" fill="url(#bg)" />

      {/* the fine black trend arrow */}
      <g stroke={INK} strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <polyline points={TREND} />
        <polyline points={ARROW_HEAD} />
      </g>
    </svg>
  );
}

export function renderIcon(size: number) {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>{iconSvg(size)}</div>,
    { width: size, height: size },
  );
}
