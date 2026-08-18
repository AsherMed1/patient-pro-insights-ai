# Review Queue: contact-history accuracy + Short Notice tag colors

## 1. Where the "165d ago · GoHighLevel" came from

Verified against Jason Cason's records (Apex Vascular, +1 865 323 4337). He has three appointment rows: the live one from Aug 17, and two older superseded ones (June 2026, Dec 2025).

The badge did not come from GHL call data. It came from an appointment note on the oldest superseded row:

- `2026-03-05 · created_by = "GoHighLevel"` — "Rescheduled | FROM ... | TO ... | By: GoHighLevel"

The queue derives "last contact" from the most recent human-authored note across all sibling rows for the patient. `isSystemNote` only filters authors named System / Review Queue / Support / *automation*, so an automated note authored by **GoHighLevel** passes as a human contact attempt. That note is ~165 days old and lives on an earlier record — exactly what the badge said.

Separately, the real attempt logged today did save correctly: `appointment_contact_attempts` has Call / Left voicemail, Aug 17 22:10 UTC, Chantel Mdletshe, on the live row — so the screenshot was taken before that, and the stale GHL note was ranking as the last contact until then.

### Fixes

- Treat `GoHighLevel`, `GHL`, `HighLevel`, `Bot`, `Workflow`, `Webhook` authors as system notes in `isSystemNote`, and also filter note bodies starting with `Rescheduled |`, `Superseded`, `Cancellation Reason:`, and `"approved" tag`.
- Age cap: ignore sibling-derived contact older than 45 days — an outreach attempt from a closed record months ago is not "last contact" on today's booking. Older than that renders as **No contact logged**.
- Keep the "earlier record" hint only when the contact is genuinely a human attempt on a sibling row.

Net effect for Jason Cason: the badge would have shown **No contact logged** until Chantel's real attempt, then **Last contact ... · Call, left voicemail · Chantel Mdletshe**.

## 2. Short Notice tag colors

Three states in the Review Queue row badges:

| State | Color |
| --- | --- |
| Inside the short-notice window (`Short Notice window`, and the booked-short-notice `Short Notice · Xh` badge) | Red fill + red border/text |
| `Short Notice in <24h` remaining | Orange fill + orange border/text |
| `Short Notice in >24h` remaining | No fill — neutral border, muted text |

## Technical notes

- `src/lib/shortNotice.ts`: extend `isSystemNote` author/body patterns; export a `MAX_CONTACT_AGE_DAYS = 45` constant.
- `src/components/admin/ReviewQueue.tsx`: apply the age cap when folding sibling notes/attempts into `lastContactByRowId`; update badge classes at lines ~2009-2047 (red for in-window, orange under 24h, neutral/no fill above 24h). Threshold changes from the current 12h cutoff to 24h.
- No schema, RLS, or edge-function changes.
