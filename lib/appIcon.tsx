import { ImageResponse } from "next/og";

// The app icon, drawn in code (no image files), styled like iMessage's dark-mode icon:
// a bold green line graph trending upward on a near-black background, with a dot at each point (what progress looks
// like). The last dot is bigger, with a halo, because that's where you are now.
//
// This file is the design. The icons the phone actually uses are plain PNG files in public/
// (apple-touch-icon.png, icon-192.png, icon-512.png): after changing the design here, run
// `npm run dev`, then `npm run icons` to redraw them.
//
// iPhones let a web app have only ONE home-screen icon (it can't switch between
// light and dark), so this dark icon is used for the home screen and every
// browser tab.
//
// Note: the image renderer only allows plain SVG tags inside <svg> (no React
// fragments or custom components), so everything is wrapped in <g> groups.

// The data points on a 512 x 512 canvas: mostly up, with one small dip so it
// looks like real progress rather than a ruler.
const POINTS: [number, number][] = [
  [88, 378],
  [178, 318],
  [262, 338],
  [350, 214],
  [432, 124],
];

const LINE = POINTS.map(([x, y]) => `${x},${y}`).join(" ");

// The iMessage dark-mode look: a bold green glyph with a soft top-to-bottom gradient
// (lighter green to deeper green) on a background that fades from very dark grey to black.
const GREEN_TOP = "#5df27a";
const GREEN_BOTTOM = "#1fbf3f";
const BG_TOP = "#1c1c1e"; // iOS dark grey
const BLACK = "#000000";

function iconSvg(size: number) {
  const last = POINTS[POINTS.length - 1];

  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BG_TOP} />
          <stop offset="1" stopColor={BLACK} />
        </linearGradient>
        {/* userSpaceOnUse: one gradient across the whole icon, so the line and dots match */}
        <linearGradient id="green" gradientUnits="userSpaceOnUse" x1="0" y1="96" x2="0" y2="416">
          <stop offset="0" stopColor={GREEN_TOP} />
          <stop offset="1" stopColor={GREEN_BOTTOM} />
        </linearGradient>
      </defs>

      <rect width="512" height="512" fill="url(#bg)" />

      {/* the connecting line: thick and bold, like iMessage's bubble */}
      <polyline
        points={LINE}
        fill="none"
        stroke="url(#green)"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* a dot at every point; each has a dark center so it reads as a node */}
      {POINTS.slice(0, -1).map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="34" fill="url(#green)" />
          <circle cx={x} cy={y} r="13" fill={BLACK} />
        </g>
      ))}

      {/* the last dot is bigger, with a halo: where you are now */}
      <g>
        <circle cx={last[0]} cy={last[1]} r="62" fill={GREEN_TOP} fillOpacity={0.22} />
        <circle cx={last[0]} cy={last[1]} r="44" fill="url(#green)" />
        <circle cx={last[0]} cy={last[1]} r="17" fill={BLACK} />
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
          border: "3px solid #3a3a3c", // a hairline edge so the dark icon stands out on the dark card
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
                border: `2px solid ${GREEN_BOTTOM}`,
                color: GREEN_TOP,
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
