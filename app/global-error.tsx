"use client";

import { useEffect } from "react";

// The last resort, shown only if the root layout itself fails. It replaces the whole page,
// so the app's stylesheet isn't loaded: the styles here are written in, using the app's colors.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f4f5",
          color: "#1c1c1e",
          fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <title>DEVELOP</title>
        <main style={{ maxWidth: 360 }}>
          <p style={{ fontWeight: 800, letterSpacing: "0.2em", fontSize: 14 }}>DEVELOP</p>
          <h1 style={{ fontSize: 24, margin: "8px 0" }}>Something went wrong</h1>
          <p style={{ color: "#6b6b72", margin: "0 0 24px" }}>The app couldn&apos;t load. Please try again.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 48,
              width: "100%",
              border: 0,
              borderRadius: 999,
              background: "#f26b2a",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
