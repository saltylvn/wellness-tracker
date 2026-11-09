"use client";

import { useId, useState } from "react";
import { addDays, daysBetween, formatDayNumber, formatShortMonth } from "@/lib/dates";
import { formatWeightLb } from "@/lib/weight";
import type { WeighIn } from "@/lib/weightPlan";

// A line chart of your weigh-ins (solid orange, with a soft orange fill under it and a small
// dot on each weigh-in), your target (dashed gray line), and, when there's a pace, where
// you'll be heading (dashed orange, from your latest weigh-in to the target on the goal
// date). Your latest weight is labeled on the chart. Touch or drag across it to see each weigh-in.

const W = 340; // drawing size; the SVG scales to the card's width
const H = 140; // the weigh-in card sits above the chart now, so it has room to be taller
const PAD = { top: 16, right: 14, bottom: 22, left: 34 };
const MAX_DOTS = 40; // with more weigh-ins than this, the small dots are left off so the line stays clean

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
  const fillId = useId(); // a unique id for the fill's gradient (two charts on a page can't share one)

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
  // The soft fill: the line, then down to the bottom of the chart and back.
  const bottom = H - PAD.bottom;
  const area = `${line}L${x(latest.date).toFixed(1)},${bottom}L${x(firstDate).toFixed(1)},${bottom}Z`;
  const middleDate = addDays(firstDate, Math.round(span / 2));

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
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity={0.22} />
            <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Quiet dashed grid lines and pound labels on the left. */}
        {ticks.map((lb) => (
          <g key={lb}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(lb)}
              y2={y(lb)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text x={PAD.left - 6} y={y(lb) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
              {lb}
            </text>
          </g>
        ))}
        {/* Dates along the bottom: the first day, the middle, and the last day shown. */}
        <text x={PAD.left} y={H - 6} fontSize={10} fill="var(--muted)">
          {shortDate(firstDate)}
        </text>
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">
          {shortDate(middleDate)}
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

        <path d={area} fill={`url(#${fillId})`} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* A small dot on every weigh-in (left off when there are lots, to keep the line clean). */}
        {logs.length <= MAX_DOTS &&
          logs.map((l) => <circle key={l.date} cx={x(l.date)} cy={y(l.pounds)} r={2} fill="var(--accent)" />)}

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
        {/* The latest weigh-in (or the one you're touching): a dot with a soft halo, and its weight above it. */}
        {(shown ? [shown] : [latest]).map((l) => (
          <g key={l.date}>
            <circle cx={x(l.date)} cy={y(l.pounds)} r={10} fill="var(--accent)" fillOpacity={0.15} />
            <circle cx={x(l.date)} cy={y(l.pounds)} r={5} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
            {!shown && (
              <text
                x={Math.min(x(l.date), W - PAD.right - 14)}
                y={Math.max(y(l.pounds) - 12, 11)}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--foreground)"
              >
                {formatWeightLb(l.pounds)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}
