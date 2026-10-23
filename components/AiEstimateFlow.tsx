"use client";

import { useRef, useState } from "react";
import FoodEntryForm from "@/components/FoodEntryForm";
import type { AiEstimate } from "@/lib/ai/nutrition";
import { resizeImageToJpeg } from "@/lib/resizeImage";

type Props = {
  mode: "photo" | "text";
  date: string; // the day the food will be logged for
};

type Stage =
  | { name: "input" }
  | { name: "loading" }
  | { name: "result"; estimate: AiEstimate; round: number };

const CONFIDENCE_TEXT = { low: "Low confidence", medium: "Medium confidence", high: "High confidence" };

// Matches the server's check in app/api/estimate-food/route.ts.
const SENDABLE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_UPLOAD_BYTES = 4_000_000;
// The server gives up on the AI after ~24 seconds; don't spin forever if the network drops.
const REQUEST_TIMEOUT_MS = 35_000;

// Shrinks the photo for upload. If this phone can't (rare), send the original when the
// server would accept it; otherwise there's nothing usable to send.
async function photoForUpload(file: File): Promise<Blob | null> {
  try {
    return await resizeImageToJpeg(file);
  } catch {
    return SENDABLE_TYPES.includes(file.type) && file.size <= MAX_UPLOAD_BYTES ? file : null;
  }
}

const inputClass = "w-full rounded-xl border border-border bg-background px-4 py-3 text-base";

// One screen for both AI options:
//   1. you give it a photo or a description
//   2. the AI estimate comes back inside the normal editable form
//   3. nothing is saved until you check it and tap "Add food"
export default function AiEstimateFlow({ mode, date }: Props) {
  const [stage, setStage] = useState<Stage>({ name: "input" });
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  // `upload` starts shrinking the photo as soon as it's picked, so it's ready by the time
  // you tap Estimate.
  const [photo, setPhoto] = useState<{ previewUrl: string; upload: Promise<Blob | null> } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function choosePhoto(file: File | undefined) {
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setPhoto(file ? { previewUrl: URL.createObjectURL(file), upload: photoForUpload(file) } : null);
    setError(null);
  }

  async function estimate() {
    setError(null);
    if (mode === "photo" && !photo) {
      setError("Take or choose a photo first.");
      return;
    }
    if (mode === "text" && !description.trim()) {
      setError("Describe what you ate or drank first.");
      return;
    }

    setStage({ name: "loading" });
    try {
      const body = new FormData();
      if (description.trim()) body.set("description", description.trim());
      if (mode === "photo" && photo) {
        const image = await photo.upload;
        if (!image) {
          setError("Couldn't read that photo. Try a different one, or take a new picture.");
          setStage({ name: "input" });
          return;
        }
        body.set("image", image, image instanceof File ? image.name : "meal.jpg");
      }

      const response = await fetch("/api/estimate-food", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok: true; estimate: AiEstimate }
        | { ok: false; message: string }
        | null;

      if (result?.ok) {
        setStage({ name: "result", estimate: result.estimate, round: Date.now() });
      } else {
        setError(result?.message ?? "Something went wrong. Please try again.");
        setStage({ name: "input" });
      }
    } catch (error) {
      setError(
        error instanceof Error && error.name === "TimeoutError"
          ? "The AI took too long. Please try again, or enter it manually."
          : "Couldn't reach the AI. Check your connection and try again.",
      );
      setStage({ name: "input" });
    }
  }

  // Step 2: the estimate, in the editable form.
  if (stage.name === "result") {
    const { estimate } = stage;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-card p-4">
          <p className="text-sm font-semibold">
            AI estimate · <span className="text-muted">{CONFIDENCE_TEXT[estimate.confidence]}</span>
          </p>
          {estimate.notes && <p className="mt-1 text-sm text-muted">{estimate.notes}</p>}
          <p className="mt-2 text-sm text-muted">
            This is a rough guess. Check and adjust the numbers before adding.
          </p>
        </div>

        <FoodEntryForm
          key={stage.round}
          defaultDate={date}
          prefill={estimate}
          source={mode}
        />

        <button
          type="button"
          onClick={() => setStage({ name: "input" })}
          className="min-h-12 w-full text-base font-medium text-accent active:opacity-70"
        >
          Try again
        </button>
      </div>
    );
  }

  const loading = stage.name === "loading";

  // Step 1: the input.
  return (
    <div className="space-y-4">
      {mode === "photo" && (
        <div className="space-y-3">
          {/* On iPhone this offers "Take Photo" and "Photo Library". */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.previewUrl}
              alt="Your photo"
              className="max-h-72 w-full rounded-2xl object-cover"
            />
          ) : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => fileInput.current?.click()}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-border text-base font-medium active:opacity-80 disabled:opacity-60"
          >
            <span aria-hidden="true">📷</span>
            {photo ? "Choose a different photo" : "Take or choose a photo"}
          </button>
        </div>
      )}

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-muted">
          {mode === "photo" ? "Add details (optional)" : "What did you eat or drink?"}
        </label>
        <textarea
          id="description"
          rows={mode === "photo" ? 2 : 4}
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={loading}
          placeholder={
            mode === "photo"
              ? "e.g. about 6 oz of chicken, no dressing"
              : "e.g. 2 scrambled eggs, a slice of buttered toast, and a small orange juice"
          }
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={estimate}
        disabled={loading}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
      >
        {loading ? "Estimating…" : "Estimate calories & macros"}
      </button>

      <p className="text-xs text-muted">
        {mode === "photo" ? "Your photo is" : "Your description is"} sent to Google&apos;s Gemini AI to
        make the estimate. This uses Google&apos;s free tier, where Google may use what you send to
        improve its products. {mode === "photo" ? "The photo isn't saved in this app." : ""}
      </p>
    </div>
  );
}
