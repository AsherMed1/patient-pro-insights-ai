# Color-coded, collapsible sections in the QA record panel

Make the three stacked sections in a QA Operations record visually distinct and individually collapsible, so long records are easier to scan.

## Sections affected

1. ControlHub ticket (incl. ticket comments + reply composer)
2. Ticket attachments (when present)
3. Internal Patient Notes
4. Activity
5. History for this patient (already collapsible — brought into the same styling)

## What changes

- Each section becomes a bordered card with its own tinted header strip and a subtle matching background, using semantic tokens so light/dark both work:
  - ControlHub ticket — primary/blue accent
  - Ticket attachments — muted/neutral accent
  - Internal Patient Notes — amber accent (portal-only signal)
  - Activity — slate/muted accent
  - History — muted accent, dashed border to read as archival
- Section headers get a chevron toggle. Clicking the header collapses/expands the body. Header shows an icon, title, and a small count badge (comments / notes / activity entries) so collapsed state still conveys volume.
- Default open state: ControlHub ticket open, Internal Patient Notes open, Activity open, Attachments open, History collapsed (unchanged).
- Collapse state is remembered per user in localStorage so a preferred layout persists between records and sessions.
- A small "Collapse all / Expand all" control sits above the stack.

## Technical notes

- New presentational component `src/components/admin/QASection.tsx`: props `title`, `icon`, `count`, `tone` ('ticket' | 'notes' | 'activity' | 'neutral'), `defaultOpen`, `storageKey`, `children`. Uses shadcn `Collapsible`, `cn`, and tone-to-class mapping.
- Tone colors added as semantic utility classes driven by existing tokens (`--primary`, `--muted`, `--accent`) plus two new QA section tokens in `src/index.css` and `tailwind.config.ts` if amber/slate are not already tokenized. No hardcoded hex or `bg-white`/`text-black` in components.
- `QAOperationsQueue.tsx`: wrap the existing blocks around lines ~2535 (ticket), ~2597 (attachments), ~2617 (notes), ~2727 (activity), ~2837 (history) in `QASection`. Inner markup unchanged; the existing `historyOpen` state is replaced by the section's own state.
- Presentation only — no changes to data fetching, realtime updates, or QA workflow logic.
