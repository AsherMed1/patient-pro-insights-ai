# Image Attachments in QA Internal Patient Notes

Let QA specialists attach screenshots/images to notes in the QA Operations record, the same way they already can on ControlHub ticket replies.

## What QAs will see

- The "Add an internal QA note…" box gains paste, drag-and-drop, and an **Attach image** button — identical behaviour to the ControlHub reply composer.
- Up to 5 images per note, 10 MB each (PNG, JPG, WEBP, GIF, HEIC).
- Thumbnails preview under the composer before posting, each removable with an X.
- Posted notes show their images as clickable thumbnails that open full size in a new tab.
- "Add note" becomes available when there is text **or** at least one image, so an image-only note is allowed.
- Editing a note still edits the text only; attachments stay with the note. Deleting the note removes it and its attachments from view.

## Privacy

Images go to the existing private `qa-ticket-attachments` bucket (PHI-safe, signed URLs only, never public). Notes stay portal-only — attachments are not sent to ControlHub.

## Technical notes

1. **Migration:** add `attachments jsonb not null default '[]'::jsonb` to `public.qa_case_notes`. No new grants or policy changes needed — existing RLS on the table already governs who can read/write notes.
2. **Storage:** reuse `uploadImages(files, \`qa-notes/${caseId}\`)` from `src/lib/attachments.ts` and the existing `qa-ticket-attachments` bucket, so no new bucket or policies.
3. **`QAOperationsQueue.tsx`:**
   - add `noteImages: File[]` state next to `noteDraft`;
   - wrap the `MentionTextarea` composer in `ImageAttachInput`;
   - in `addNote`, upload images first (with a busy state on the button and a toast on upload failure), then insert the note with the returned `attachments` array; clear both draft and images on success;
   - render `<AttachmentGallery attachments={n.attachments} size="sm" />` inside each note row;
   - include `attachments` in the `QANote` type and in the realtime/reload note fetches (they already `select('*')`).
4. Mentions, activity logging, edit/delete, and realtime row updates keep working unchanged.
