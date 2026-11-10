# 2. Race AI models instead of waiting on one

**Status:** accepted

## Context
Food estimates use Google Gemini's free tier. Free models are sometimes slow or overloaded: a single request measured up to 12.5 s, which is too long for logging a meal on a phone.

## Decision
`raceModels` (`lib/ai/modelChain.ts`) tries the fastest models first. If one hasn't answered in 1.5 s, the next starts alongside it (at most two at once), and the first valid answer wins; every other request is cancelled. A model that fails hands off immediately, a bad API key stops at once, and a total time budget caps the wait. Every answer is validated against a JSON schema before it's used.

The race is a small generic function with its own tests, independent of the Google SDK, and the provider sits behind one file (`lib/ai/gemini.ts`) so it can be swapped.

## Consequences
- Typical estimates take 1.3–2.5 s.
- A slow moment can cost a second request; the 40-a-day per-user limit is counted once per estimate, before the race starts, so that stays bounded.
