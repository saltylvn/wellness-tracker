import { ImageResponse } from "next/og";

// The app icon, drawn in code (no image files): a bold orange "D" (for DEVELOP) shaped
// like a weight plate, with a white trend arrow rising inside it (lifting + progress), on
// a white background to match the always-light, orange-and-white app.
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

// The D on a 512 x 512 canvas: a straight left side and a half-circle on the right.
// It's drawn filled and also outlined (round corners) in the same orange, which rounds
// the corners without changing its size much.
const D_SHAPE = "M 132 104 H 262 A 152 152 0 0 1 262 408 H 132 Z";
// The trend inside it: up, a small dip, then up to the arrowhead.
const TREND = "166,328 224,270 262,302 342,214";
const ARROW_HEAD = "290,210 348,210 348,268";

// A soft top-to-bottom gradient, lighter orange to deeper orange (the app's accent is #f26b2a),
// on a background that fades from white to the app's light grey.
const ORANGE_TOP = "#f7843f";
const ORANGE_BOTTOM = "#e5521a";
const WHITE = "#ffffff";
const BG_BOTTOM = "#f3f3f4";
// The social preview card stays dark, so the white icon stands out on it.
const BG_TOP = "#1c1c1e"; // iOS dark grey
const BLACK = "#000000";

function iconSvg(size: number) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WHITE} />
          <stop offset="1" stopColor={BG_BOTTOM} />
        </linearGradient>
        {/* userSpaceOnUse: one gradient across the whole icon */}
        <linearGradient id="orange" gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="442">
          <stop offset="0" stopColor={ORANGE_TOP} />
          <stop offset="1" stopColor={ORANGE_BOTTOM} />
        </linearGradient>
      </defs>

      <rect width="512" height="512" fill="url(#bg)" />

      {/* the D-shaped plate */}
      <path d={D_SHAPE} fill="url(#orange)" stroke="url(#orange)" strokeWidth="28" strokeLinejoin="round" />

      {/* the white trend arrow */}
      <g stroke={WHITE} strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" fill="none">
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

// The repository's social preview (the card shown when the GitHub link is shared on
// LinkedIn, Slack, iMessage...). GitHub's recommended size is 1280 x 640. Saved as
// docs/social-preview.png by `npm run icons`; upload it in the repo's Settings.
const STACK = ["Next.js 16", "TypeScript", "Supabase", "Postgres RLS", "Gemini AI"];

export function renderSocialPreview() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        gap: 64,
        padding: "0 80px",
        background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BLACK} 100%)`,
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          borderRadius: 64,
          overflow: "hidden",
          flexShrink: 0,
          border: "3px solid #3a3a3c", // a hairline edge around the icon on the dark card
        }}
      >
        {iconSvg(280)}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 112, letterSpacing: 16, lineHeight: 1 }}>DEVELOP</div>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 10, color: "#8e8e93", marginTop: 16 }}>
          WELLNESS TRACKER
        </div>
        <div style={{ display: "flex", fontSize: 36, lineHeight: 1.35, marginTop: 36, maxWidth: 780 }}>
          AI food logging from photos, lifting and cardio plans, weight goals.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 36 }}>
          {STACK.map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                fontSize: 22,
                padding: "8px 16px",
                borderRadius: 999,
                border: `2px solid ${ORANGE_BOTTOM}`,
                color: ORANGE_TOP,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>,
    { width: 1280, height: 640 },
  );
}
