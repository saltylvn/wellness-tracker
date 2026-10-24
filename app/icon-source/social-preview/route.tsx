import { renderSocialPreview } from "@/lib/appIcon";

// Draws the GitHub social preview card, ONLY on your Mac (npm run dev), for
// `npm run icons` to save as docs/social-preview.png. Not found on the live site.
export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  return renderSocialPreview();
}
