# Smoother Portal Tour Transitions

Make the step-to-step transitions in `PortalTour.tsx` feel fluid instead of snappy/jumpy. This is a presentation-only change to the tour overlay; no step content, anchors, or logic changes.

## Current problems

1. **Card position snaps** — the explanation card uses inline `style` with no `transition`, so it jumps instantly to each new anchor's position.
2. **Card content swaps abruptly** — title/body text changes with no fade; `animate-fade-in` only fires once on mount.
3. **Spotlight pops in/out** — the spotlight (`rect`) and the full-screen scrim are in an either/or branch (`rect ? spotlight : scrim`), so moving between anchored and non-anchored steps (e.g. the centered Welcome step ↔ first anchored step) causes a hard cut.
4. **Spotlight can vanish mid-tour** — `setRect(getRect(anchor))` writes `null` if the anchor isn't in the DOM yet during a section switch, and there is no re-measure, so the spotlight disappears and may not return until a scroll/resize.
5. **Spotlight morph is quick** — `transition-all duration-200` is fine but a touch fast/hard.

## Changes (all in `src/components/tour/PortalTour.tsx`)

**1. Persistent scrim + fade-able spotlight (fixes #3, #4)**
- Replace the `rect ? spotlight : scrim` branch with two always-rendered layers:
  - A **scrim** layer (`fixed inset-0`, `bg-foreground/55`) that is always present while the tour is open and fades in/out via `transition-opacity duration-300`.
  - A **spotlight** layer that is always mounted, positioned from the *last known* rect, and fades opacity to `0` when no rect is available (so it dissolves rather than pops). Add `transition-all duration-300 ease-out` so it morphs position/size between anchors.
- Add a **re-measure retry**: if `getRect(anchor)` returns `null` during settle, retry on the next animation frame (poll up to ~1s) so the spotlight reappears once the section's anchor renders — fixes #4.

**2. Glide the card (fixes #1)**
- Add `transition-[top,left,width,opacity] duration-300 ease-out` (or `transition-all duration-300 ease-out`) to the card container so it smoothly slides between anchor positions instead of snapping.

**3. Cross-fade card content (fixes #2)**
- Wrap the title + body block in a div keyed by `index` and apply a short fade/slide animation (reuse `animate-fade-in-up` or a 200ms opacity fade) so each step's text fades in while the card itself glides.

**4. Easing**
- Use a consistent ease (`ease-out` / `cubic-bezier(0.22,1,0.36,1)`) across spotlight, scrim, and card for a cohesive feel. Bump spotlight morph from `duration-200` to `duration-300`.

## Out of scope
- No changes to `portalTourSteps.ts` (step list, anchors, copy).
- No new dependencies (Motion/etc.). Uses existing Tailwind transition utilities + the `tailwindcss-animate` plugin already in the project.
- No schema, hook, or `ProjectPortal.tsx` navigation changes.
