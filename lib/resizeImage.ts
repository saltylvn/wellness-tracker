// Browser-only: shrinks a photo before it's uploaded. A phone photo can be 5-10 MB;
// the AI doesn't need that detail, and smaller uploads are faster and cheaper.
// Converting to JPEG also avoids HEIC compatibility problems. 768px is one "tile" for
// Gemini, so it reads the photo faster than a bigger one, with the same estimates.
export async function resizeImageToJpeg(
  file: File,
  maxEdge = 768,
  quality = 0.8,
): Promise<Blob> {
  // createImageBitmap applies the photo's rotation (EXIF) so it isn't sideways.
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))),
      "image/jpeg",
      quality,
    );
  });
}
