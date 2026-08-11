# QA Operations: escalation navigation, live status sync, image attachments

## 1. Opening a record from Escalations returns to Escalations

Today, clicking Open in the Escalations worklist switches the whole page back to the Queue view before opening the record drawer, and the worklist re-mounts from scratch (losing search, owner/status/type filters) when you come back.

Changes:
- Opening a case from Escalations keeps the page on the Escalations view; the record drawer opens on top of it. Closing the drawer leaves you exactly where you were.
- Escalations filters (search, owner, escalation status, escalation type) and scroll position are preserved for the whole session, including while a record is open and after switching to Queue/Reports and back.
- Queue filters are likewise left untouched when a record is opened from the Queue.
- Notification/bell deep links keep today's behaviour of jumping to the Queue view, but they will only clear filters when the target record would otherwise be hidden.

## 2. Escalation status stays consistent everywhere

Right now the Escalations worklist loads once and never refreshes, so a status changed in the record drawer or in the Queue leaves the worklist showing the old value (Awaiting Clinic Response vs Response Received).

Changes:
- One shared update path for escalation status, used by the drawer, the Queue row, and the Escalations worklist — so all three write the same fields (escalation status, workflow status promotion/reopen, activity log, notifications).
- The Escalations worklist subscribes to live record changes the same way the Queue already does, so any change made anywhere updates its row immediately, including workflow status, owner, ticket status, and completion.
- The open record drawer also refreshes from the live change, so a status changed by a teammate while you have the record open is reflected instead of being silently overwritten.
- Last-write-wins is made explicit: the update writes the status and then applies the server's returned row, so the screen always shows what is actually stored.

## 3. Images in ControlHub replies and Internal Patient Notes

Both composers get the same image support:
- Paste an image straight from the clipboard (screenshot), drag-and-drop, or pick files with an attach button.
- Thumbnails of pending images show under the composer with a remove button; upload happens on send.
- Images are stored in the existing private attachments bucket and viewed through short-lived signed links — no public URLs.
- Limits: images only (png/jpg/webp/gif/heic), max 10 MB each, max 5 per message.

ControlHub replies: uploaded images are sent with the comment so they appear on the ticket, and the thumbnails render inline in the ticket comment thread in QA Operations.

Internal Patient Notes: images attach to the note and render as thumbnails in the note timeline; clicking one opens the full-size image. Edit keeps existing attachments; delete removes them with the note.

## Technical notes

- `QAOperationsQueue.tsx`: add `openedFrom: 'queue' | 'escalations'` state; do not `setView('queue')` in the worklist `onOpenCase`. Lift the worklist's filter/search state into the parent (or keep the component mounted and hidden) so it survives view switches.
- Extract `updateEscalationStatus` into a shared helper (`src/lib/qaEscalation.ts`) taking `{ caseId, next, actor }` and returning the updated row (`.select().single()`), reused by the drawer, queue and worklist.
- `QAEscalationWorklist.tsx`: add a `supabase.channel('qa-escalations')` postgres_changes subscription on `qa_cases` (UPDATE) with cleanup in `useEffect`; patch rows in place; add an inline escalation-status select using the shared helper.
- New shared composer piece `src/components/admin/ImageAttachInput.tsx` handling paste/drop/file-pick, validation, previews, and upload to `qa-ticket-attachments` (path `notes/<id>/…` and `tickets/<case>/…`), returning `{ path, name, signedUrl }`.
- `post-controlhub-comment`: accept an `images: [{path,name,url}]` array, append markdown image links to the outbound body, and persist them on the `qa_ticket_events` row so the panel can render thumbnails (`attachments` jsonb column on `qa_ticket_events` — migration).
- Migration: `alter table public.appointment_notes add column attachments jsonb default '[]'::jsonb;` (existing grants/RLS unchanged); `AppointmentNotes.tsx` + `useAppointmentNotes.tsx` read/write it.
- Storage RLS: allow authenticated insert/select on the attachments bucket paths used above; keep the bucket private and always render via signed URLs.
