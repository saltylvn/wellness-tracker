#!/bin/sh
# Regenerates the app icon files in public/ from the design in lib/appIcon.tsx.
# Run `npm run dev` first, then `npm run icons`.
# Each file is saved without a see-through layer (iPhones want a solid square icon).
set -e
cd "$(dirname "$0")/.."
for pair in "180:apple-touch-icon" "192:icon-192" "512:icon-512"; do
  size=${pair%%:*}; name=${pair#*:}
  curl -sf "http://localhost:3000/icon-source/$size" -o "public/$name.tmp.png"
  # PNG -> best-quality JPEG (drops the see-through layer) -> back to PNG.
  sips -s format jpeg -s formatOptions 100 "public/$name.tmp.png" --out "public/$name.tmp.jpg" >/dev/null
  sips -s format png "public/$name.tmp.jpg" --out "public/$name.png" >/dev/null
  rm "public/$name.tmp.png" "public/$name.tmp.jpg"
  node scripts/strip-png.mjs "public/$name.png" >/dev/null # drop the photo metadata sips adds
  echo "public/$name.png ($size x $size)"
done
# Older iPhones also look for this name; keep an identical copy.
cp public/apple-touch-icon.png public/apple-touch-icon-precomposed.png
echo "public/apple-touch-icon-precomposed.png (copy)"
echo "Bump ICON_VERSION in lib/iconVersion.ts so phones fetch the new icon."
