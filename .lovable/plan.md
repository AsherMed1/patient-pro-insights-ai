No new work — answering the user's diagnostic question about the just-shipped fix.

**Root cause for the 3 Everest patients (Dorothy Martinez, Corey Ransom, Ingrid Rivera-Rodriguez):**
- Admin clicked Approve → DB `review_status` correctly set to `approved`.
- UI then invoked `update-ghl-contact-tags` to add the `approved` tag in GHL. That call failed at the time (transient: network, closed tab, or GHL hiccup).
- Old code was fire-and-forget: failure showed only a red toast. No DB marker for tag delivery, no queue, no retry. The row stayed `approved` in our system while GHL never received the tag → GHL workflow stayed in its wait step.

**What's now in place (already deployed):**
1. Manual backfill — all 3 contacts tagged in GHL, verified 200 OK.
2. New column `all_appointments.ghl_approved_tag_sent_at` — only stamped when GHL accepts the tag.
3. ReviewQueue.tsx and ghl-webhook-handler Setter-Submitted branch stamp on success, leave NULL on failure.
4. New `retry-missing-ghl-approved-tags` edge function sweeps any approved row missing the stamp and retries (skips the exempt projects).
5. Historic approved rows were backfilled to "assumed sent" so the sweep only catches genuinely-new failures.

**Optional next step (not yet done, ask user):**
Schedule the retry sweep on a cron (e.g., every 15 minutes) so future silent failures self-heal without anyone running it manually.