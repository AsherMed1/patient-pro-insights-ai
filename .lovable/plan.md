## Backfill missing "approved" GHL tags for Richmond Vascular Center

Use the existing `retry-missing-ghl-approved-tags` edge function — it was built for exactly this case. It verifies what's actually in GHL first (self-heals the stamp if the tag is already there), then pushes the `approved` tag if missing, then stamps `ghl_approved_tag_sent_at`.

## Steps

1. **Look up the 11 leads** in `all_appointments` by `lead_name` + `project_name = 'Richmond Vascular Center'` with `review_status = 'approved'` to collect their `id`s, `ghl_id`s, and current `ghl_approved_tag_sent_at` stamps. Report any name that doesn't match exactly so we can resolve it before tagging.

2. **Invoke `retry-missing-ghl-approved-tags`** via `supabase--curl_edge_functions` with:
   ```json
   { "force_ids": ["<id1>", "<id2>", ...], "include_backfilled": true }
   ```
   - `force_ids` bypasses the "missing stamp" filter so it processes them even if a stamp exists.
   - `include_backfilled: true` makes it re-verify against GHL rather than trusting the stamp.

3. **Report results**: per-lead outcome — `succeeded` (tag pushed now), `already_tagged` (tag was already in GHL, stamp self-healed), or `failed` (with reason).

## Names to resolve

Peter Davis, Gordon Tolson, Madeline Lopez Taylor, Antionette Hayes, Melinda Burchett, James Williams, Glendora Johnson, William Slate, Donna Lane, Toni Richerson, Zandra Coleman.

Multiple approved appointments under the same name will all be tagged (same `ghl_id` → idempotent in GHL).

No code or schema changes.
