# Address issue: who else was affected

## What the data shows

- **No patient currently has bot text saved in their address field.** A scan of every appointment for bot wording (disqualify, "OpenAI Prompt", "Role:", "kindly"), over-long values (>120 chars), or paragraph-shaped values returned zero matches. The 4 junk values found earlier were already cleared, and Jamesena L Johnson and Stella D Irving have correct saved addresses.
- The wrong text was never stored — it was produced at display time by the address guesser. So the group that *could* have shown bot text is: records with **no saved address** whose intake notes contain the GHL bot block.
- That group is **66 appointments across 23 clinics**:

| Clinic | Records |
| --- | --- |
| Texas Endovascular - Dallas Vein Clinic | 8 |
| Liberty Joint & Vascular | 6 |
| Georgia Endovascular | 6 |
| Arterial Interventional Centers | 5 |
| Fayette Surgical Associates | 4 |
| Premier Vascular | 4 |
| Ally Vascular and Pain Centers | 3 |
| Texas Vascular Institute | 3 |
| Apex Vascular | 3 |
| Seamless Medical Centers | 3 |
| Prospero Vascular and Interventional | 3 |
| Zenith Vascular & Fibroid Center | 2 |
| Emage Fibroid Centers | 2 |
| Mara Vascular and Interventional Radiology | 2 |
| Naadi Healthcare | 2 |
| Vascular and Vein Institute of the South | 2 |
| Vascular Surgery Center of Excellence | 2 |
| The Painless Center | 1 |
| Ventra Medical Advanced Interventions | 1 |
| Vascular Institute of Michigan | 1 |
| AVA Vascular | 1 |
| Middle Tennessee Vascular | 1 |
| Horizon Vascular Specialists | 1 |

All 66 now run through the hardened guesser, so they show either a real address or nothing — never bot text. Not every one of the 66 displayed junk before the fix; that is the maximum exposure, not a confirmed count.

## Proposed follow-up

1. **Spot-check verification** — render a sample of the 66 records (one per clinic, weighted toward Dallas Vein, Liberty, Georgia Endovascular) and confirm the Overview address line is either a valid street address or blank.
2. **Backfill real addresses where GHL has them** — for the 66 records, read the labeled `Address:` line from the stored GHL contact section and, when it passes the plausibility check, save it into `parsed_contact_info.address` so the portal stops relying on any guess.
3. **Stop storing the bot block at intake** — strip the `OpenAI Prompt: …` section in `ghl-webhook-handler` before writing intake notes, so future records never carry it. Keep the raw payload only where it is already retained for audit.
4. **Standing check** — a lightweight query that flags any future saved address containing bot wording or exceeding a sane length, so this cannot silently reappear.

## Technical notes

- Detection query: `parsed_contact_info->>'address'` empty AND `patient_intake_notes ILIKE '%OpenAI Prompt:%' OR '%disqualify%'`.
- Backfill source: the `Address:` line inside the `=== GHL Contact Data ===` block, validated by the same `isPlausibleAddress` guard already added to `DetailedAppointmentView.tsx`.
- Step 3 touches `supabase/functions/ghl-webhook-handler/index.ts` and reuses the existing strip helper from `auto-parse-intake-notes`.
