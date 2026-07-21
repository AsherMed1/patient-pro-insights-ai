
## Goal
Auto-linkify URLs in QA case notes so any pasted link becomes clickable, without introducing a separate ticket-link field.

## Changes
- Add a small helper `src/lib/linkify.tsx` exporting `renderWithLinks(text: string): ReactNode[]` that splits on a URL regex (http/https, and bare `www.`) and returns an array mixing plain text with `<a href target="_blank" rel="noopener noreferrer" class="text-primary underline break-all">` for each URL. Preserves whitespace/newlines when used inside a `whitespace-pre-wrap` container.
- Update `src/components/admin/QAOperationsQueue.tsx` line 882: replace `{n.note}` with `{renderWithLinks(n.note)}` inside the existing `whitespace-pre-wrap` div.

## Notes
- No DB or ticket-form changes. Applies only to the notes list rendering.
- Regex trims trailing punctuation (`.,;:!?)]}`) so `see https://example.com.` links to the URL, not the period.
