"use client";

import { useState } from "react";
import { addDays, daysBetween, formatDayNumber, formatShortMonth } from "@/lib/dates";
import { formatWeightLb } from "@/lib/weight";
import type { WeighIn } from "@/lib/weightPlan";

// A line chart of your weigh-ins (solid green), your target (dashed gray line), and,
// when there's a pace, where you'll be heading (dashed green, from your latest weigh-in
// to the target on the goal date). Touch or drag across it to see each weigh-in.

const W = 340; // drawing size; the SVG scales to the card's width
const H = 78; // kept short so the weigh-in card below stays high on the screen
const PAD = { top: 10, right: 12, bottom: 20, left: 34 };

const shortDate = (key: string) => `${formatShortMonth(key)} ${formatDayNumber(key)}`;

export default function WeightChart({
  logs,
  target,
  goalDate,
}: {
  logs: WeighIn[]; // oldest first
  target: number | null;
  goalDate: string | null; // when the projection reaches the target
}) {
  const [active, setActive] = useState<number | null>(null); // index of the weigh-in being touched

  if (logs.length === 0) return null;
  const latest = logs.at(-1)!;
  const projection = target !== null && goalDate ? { from: latest, to: { date: goalDate, pounds: target } } : null;

  // The ranges the chart covers: dates across, pounds up.
  const firstDate = logs[0].date;
  let lastDate = projection?.to.date ?? latest.date;
  if (daysBetween(firstDate, lastDate) < 7) lastDate = addDays(firstDate, 7); // never squeeze to a dot
  const span = daysBetween(firstDate, lastDate);
  const pounds = [...logs.map((l) => l.pounds), ...(target !== null ? [target] : [])];
  let low = Math.floor(Math.min(...pounds) - 2);
  let high = Math.ceil(Math.max(...pounds) + 2);
  if (high - low < 6) [low, high] = [low - 2, high + 2];

  const x = (date: string) => PAD.left + (daysBetween(firstDate, date) / span) * (W - PAD.left - PAD.right);
  const y = (lb: number) => PAD.top + ((high - lb) / (high - low)) * (H - PAD.top - PAD.bottom);
  const line = logs.map((l, i) => `${i === 0 ? "M" : "L"}${x(l.date).toFixed(1)},${y(l.pounds).toFixed(1)}`).join("");

  // Touch: pick the weigh-in nearest your finger, left to right.
  function pick(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    let best = 0;
    logs.forEach((l, i) => {
      if (Math.abs(x(l.date) - px) < Math.abs(x(logs[best].date) - px)) best = i;
    });
    setActive(best);
  }

  const shown = active === null ? null : logs[active];
  const ticks = [high, Math.round((high + low) / 2), low];

  return (
    <figure className="space-y-1">
      <div className="flex min-h-5 items-baseline justify-between text-xs text-muted">
        <figcaption className="font-medium">Your weigh-ins</figcaption>
        {shown && (
          <span className="tabular-nums">
            <span className="font-semibold text-foreground">{formatWeightLb(shown.pounds)} lb</span> · {shortDate(shown.date)}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={`Weight chart from ${shortDate(firstDate)}: latest ${formatWeightLb(latest.pounds)} lb${
          target !== null ? `, target ${formatWeightLb(target)} lb` : ""
        }`}
        onPointerDown={pick}
        onPointerMove={(event) => (event.buttons || event.pointerType === "mouse" ? pick(event) : undefined)}
        onPointerLeave={() => setActive(null)}
      >
        {/* Quiet grid lines and pound labels on the left. */}
        {ticks.map((lb) => (
          <g key={lb}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(lb)} y2={y(lb)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(lb) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
              {lb}
            </text>
          </g>
        ))}
        {/* Dates along the bottom: the first day and the last day shown. */}
        <text x={PAD.left} y={H - 6} fontSize={10} fill="var(--muted)">
          {shortDate(firstDate)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={10} fill="var(--muted)">
          {shortDate(lastDate)}
        </text>

        {target !== null && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(target)}
              y2={y(target)}
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text x={PAD.left + 4} y={y(target) - 5} fontSize={10} fill="var(--muted)">
              Target {formatWeightLb(target)}
            </text>
          </g>
        )}

        {projection && (
          <line
            x1={x(projection.from.date)}
            y1={y(projection.from.pounds)}
            x2={x(projection.to.date)}
            y2={y(projection.to.pounds)}
            stroke="var(--accent)"
            strokeOpacity={0.6}
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        )}
        {projection && (
          // The goal: a ring where the projection meets the target.
          <circle
            cx={x(projection.to.date)}
            cy={y(projection.to.pounds)}
            r={4}
            fill="var(--card)"
            stroke="var(--accent)"
            strokeWidth={2}
          />
        )}

        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {shown && (
          <line
            x1={x(shown.date)}
            x2={x(shown.date)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--muted)"
            strokeWidth={1}
          />
        )}
        {/* The latest weigh-in (or the one you're touching) as a dot with a ring of card color. */}
        {(shown ? [shown] : [latest]).map((l) => (
          <circle
            key={l.date}
            cx={x(l.date)}
            cy={y(l.pounds)}
            r={4.5}
            fill="var(--accent)"
            stroke="var(--card)"
            strokeWidth={2}
          />
        ))}
      </svg>
    </figure>
  );
}
