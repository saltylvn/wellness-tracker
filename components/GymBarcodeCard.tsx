"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/BottomSheet";
import { deleteGymBarcode, saveGymBarcode } from "@/app/(tabs)/workouts/barcode-actions";
import { FORMAT_LABELS, MAX_BARCODE_LENGTH, type GymBarcode } from "@/lib/gymBarcode";

// Bigger pictures are shrunk to this many pixels on the longest side before reading.
// An iPhone screenshot (up to 2796 tall) fits, so it's read at full detail.
const MAX_SIDE = 2800;

// Turns the picked screenshot into pixels the barcode reader can search.
async function readPixels(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No canvas");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { rgba: context.getImageData(0, 0, width, height).data, width, height };
}

// The gym check-in barcode at the top of the Fitness tab. The server draws it into the
// page (`svg`), so it's there the moment the page opens: hold it up to the gym's scanner.
// "Change" opens a sheet where you pick a screenshot of the barcode from your gym's app;
// it's read right here on the phone, and only the barcode's text and type are saved.
// If a screenshot can't be read, you can type the number printed under the barcode instead.
export default function GymBarcodeCard({ barcode, svg }: { barcode: GymBarcode | null; svg: string | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [found, setFound] = useState<GymBarcode | null>(null);
  const [typing, setTyping] = useState(false); // typing the number instead of using a screenshot
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openSheet() {
    setFound(null);
    setTyping(false);
    setTyped("");
    setError(null);
    setOpen(true);
  }

  async function onPick(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = ""; // so picking the same file again still works
    if (!file) return;
    setFound(null);
    setError(null);
    setReading(true);
    try {
      // The reader is only downloaded now, when it's needed.
      const [{ decodeGymBarcode, toLuminance }, { rgba, width, height }] = await Promise.all([
        import("@/lib/gymBarcodeDecode"),
        readPixels(file),
      ]);
      const result = decodeGymBarcode(toLuminance(rgba, width, height), width, height);
      if (result) setFound(result);
      else
        setError(
          "Couldn't find a barcode in that picture. Try a screenshot where the whole barcode shows clearly, or type the number instead.",
        );
    } catch {
      setError("Couldn't open that picture. Try another screenshot.");
    } finally {
      setReading(false);
    }
  }

  function run(action: () => ReturnType<typeof saveGymBarcode>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else setError(result.message);
    });
  }

  return (
    <>
      {barcode ? (
        // Always white behind the bars, so scanners can read it.
        <section aria-label="Gym check-in barcode" className="rounded-2xl bg-white px-4 pt-5 pb-1 text-center ring-1 ring-border">
          {svg ? (
            <div
              role="img"
              aria-label={`${FORMAT_LABELS[barcode.format]}: ${barcode.text}`}
              // Centered and not too wide, like the gym's own app, with white space on each side for the scanner.
              className="mx-auto h-24 w-3/4 [&>svg]:h-full [&>svg]:w-full"
              // Drawn on the server by lib/gymBarcodeSvg.ts from a checked value, not from user HTML.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <p className="py-4 text-sm text-muted">Couldn&apos;t draw this barcode. Tap Change to add it again.</p>
          )}
          <p className="mt-2 truncate text-lg font-semibold tracking-wide text-black/70">{barcode.text}</p>
          <button
            type="button"
            onClick={openSheet}
            className="min-h-11 px-3 text-sm font-medium text-muted active:opacity-70"
          >
            Change
          </button>
        </section>
      ) : (
        <button
          type="button"
          onClick={openSheet}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted active:opacity-70"
        >
          <span aria-hidden="true">🏷️</span> Add your gym check-in barcode
        </button>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} label="Gym check-in barcode">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">Gym check-in barcode</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 shrink-0 rounded-xl px-3 text-base font-semibold text-accent active:opacity-70"
          >
            Cancel
          </button>
        </div>

        <p className="text-sm text-muted">
          Take a screenshot of the barcode in your gym&apos;s app, then choose it here. DEVELOP keeps a sharp copy at
          the top of Fitness, ready to scan at the front desk.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onPick(event.target.files?.[0])}
        />

        {typing ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              // Typed numbers are drawn as Code 128, which holds any letters and digits.
              run(() => saveGymBarcode({ text: typed.trim(), format: "code128" }));
            }}
          >
            <label className="block space-y-1">
              <span className="text-sm text-muted">The number under your gym&apos;s barcode</span>
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={MAX_BARCODE_LENGTH}
                placeholder="e.g. 4641827V"
                className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base tracking-wide"
              />
            </label>
            <button
              type="submit"
              disabled={pending || typed.trim() === ""}
              className="min-h-14 w-full rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save barcode"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTyping(false);
                setError(null);
              }}
              className="min-h-11 w-full rounded-xl text-base font-medium text-accent active:opacity-70"
            >
              Use a screenshot instead
            </button>
          </form>
        ) : found ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-card p-4">
              <p className="text-sm text-muted">Found a {FORMAT_LABELS[found.format]}</p>
              <p className="mt-1 break-all font-mono text-base">{found.text}</p>
            </div>
            <button
              type="button"
              onClick={() => run(() => saveGymBarcode(found))}
              disabled={pending}
              className="min-h-14 w-full rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save barcode"}
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={pending}
              className="min-h-11 w-full rounded-xl text-base font-medium text-accent active:opacity-70 disabled:opacity-60"
            >
              Choose a different screenshot
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={reading}
              className="min-h-14 w-full rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
            >
              {reading ? "Reading barcode…" : "Choose screenshot"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTyping(true);
                setError(null);
              }}
              disabled={reading}
              className="min-h-11 w-full rounded-xl text-base font-medium text-accent active:opacity-70 disabled:opacity-60"
            >
              Type the number instead
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {barcode && !found && !typing && (
          <button
            type="button"
            onClick={() => run(() => deleteGymBarcode())}
            disabled={pending}
            className="min-h-11 w-full rounded-xl text-base font-medium text-danger active:opacity-70 disabled:opacity-60"
          >
            Remove barcode
          </button>
        )}
      </BottomSheet>
    </>
  );
}
