# Fix transparent modal windows (Tennille's Setter Worklist)

## What's happening

In both screenshots the modal panels ("Log contact attempt", "Appointment Details") are see-through: the Review Queue table behind them shows straight through the popup, and its text collides with the popup's own text. Inner white cards (Appointment Overview, Patient Intake Notes) still paint correctly, so it is only the modal shell and its dim backdrop that fail to paint on her machine.

The modal shell already asks for a solid background in code, so this is not a missing style — it is the shell's background failing to render in her browser session (typical causes: a browser extension such as a dark/contrast reader, Windows high-contrast / forced-colors mode, or a GPU compositing glitch). Rather than chase her machine, harden the modal so it can't render transparent for anyone.

## Fix

1. **Make the modal shell opaque by construction** — in the shared dialog component, set the panel background with a literal solid-colour fallback behind the theme token, so it stays opaque even when the themed value fails to resolve. Same treatment for the dim backdrop layer.
2. **Neutralise compositing side effects** — add `isolation: isolate` and explicitly disable any inherited backdrop filter / blend mode on the modal panel and backdrop, so an outside layer can't make it translucent.
3. **Forced-colors / high-contrast safety** — add a small `forced-colors` and `prefers-contrast` block in the global stylesheet that pins the modal panel to an opaque system background with a visible border.
4. **Apply the same hardening to the sibling overlay surfaces** so the bug can't surface elsewhere: alert dialog, sheet/drawer, popover, select and dropdown menu panels.
5. **Verify** by loading the Review Queue in the preview, opening "Log attempt" and "Appointment Details", and confirming no underlying content bleeds through.

## Follow-up for Tennille (no code)

If it still shows transparent for her after the fix, it is almost certainly local: ask her to try an incognito window (extensions off) and to check Windows Settings > Accessibility > Contrast themes is off. The changes above should make it moot either way.

## Technical notes

- Files touched: `src/components/ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `popover.tsx`, `select.tsx`, `dropdown-menu.tsx`, plus a small block in `src/index.css`.
- Purely presentational; no changes to Review Queue logic, appointment data, or workflows.
