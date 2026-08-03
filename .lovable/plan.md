# Restore missing patient info without overwriting clinic edits

Your concern is correct and it changes one part of the data fix. Here is exactly what will and will not be touched.

## Guarantee: clinic-entered values are never replaced

The restore only writes into fields that are currently **empty**. Any value a clinic typed in the Portal stays exactly as it is.

Concretely, for the 21 affected records:

- Name, phone, email, date of birth in the Contact card: filled in **only when the field is blank**, and the value comes from the same appointment row's own stored name/phone/email/DOB — no external source, no guessing.
- Insurance: not touched at all by the restore.
- Pathology, medical/PCP notes: not touched at all.

The one place the original draft overwrote something is the **Age** field. Rather than blanket-overwriting, it will now only replace a value that is clearly not an age — an age *bracket* such as "46 to 55" or "55-64" — with the age calculated from the patient's date of birth. A clinic-entered numeric age is left alone. That is Esther De La Cruz's case: her Age currently reads "46 to 55" while her DOB (1967-08-16) makes her 58.

Nothing is deleted, and no record's existing values are cleared.

## What caused the missing information

Three symptoms, one main cause plus one display bug:

1. **Contact details disappearing (Kevin Eifert, Rafael Paulino).** When GoHighLevel sends a contact update that does not include phone/email/DOB/address, the Portal was writing those blanks straight over the record. So a record that was complete after booking could be reduced to just a name by a later, thinner GHL event. Kevin's own intake notes still contain his full address, phone, email and DOB — only the parsed card was blanked.
2. **Age shown as a range (Esther De La Cruz).** The intake form's age-bracket answer was accepted as the Age value instead of the DOB-derived age.
3. **Rafael's insurance ID** was added in GHL after booking; it has since synced (ID on file: OSC…-01). His name/phone/email were blanked by cause #1 and will be restored.

## Fixes

**Code (already prepared, applies going forward)**

- `ghl-webhook-handler`: contact and demographic fields are now merged, not replaced — an incoming blank can no longer erase a known phone, email, DOB or address.
- `auto-parse-intake-notes`: Age is always derived from DOB when a DOB exists; bracket answers ("46 to 55") are rejected as an age.

**Data (needs your approval to run)**

- Fill blank name/phone/email/DOB in the Contact card for the 21 records that lost them, using values already on the same record.
- Replace non-numeric age brackets with the DOB-derived age.

**Verification**

- Re-check Kevin Eifert, Rafael Paulino and Esther De La Cruz in the Portal.
- Confirm LJV users can edit Esther's record (her status is OON; the earlier "Action failed" UUID error in that path has been fixed).

## Technical notes

- Restore statement uses `COALESCE(existing, fallback)` per key plus `jsonb_strip_nulls`, so present keys are preserved byte-for-byte.
- Age statement is guarded by `parsed_demographics->>'age' !~ '^[0-9]{1,3}$'`, so numeric ages are untouched.
- Scope: `is_superseded IS NOT TRUE` and `created_at > now() - interval '120 days'`.
