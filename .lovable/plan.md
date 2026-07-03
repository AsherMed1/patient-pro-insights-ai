# Fix broken insurance card previews (HEIC uploads)

## Problem
Dean's ticket: Donna Zarn's insurance card image renders as a broken image and, when clicked, downloads instead of opening in a new tab. Root cause confirmed in the codebase: the uploaded file was a `.heic` (iPhone default). Browsers can't render HEIC, and Supabase Storage serves an unknown MIME with `Content-Disposition: attachment`, hence the forced download.

Neither `InsuranceCardUpload.tsx` nor `SecondaryInsuranceCardUpload.tsx` has any HEIC handling today — both just `accept="image/*"` and upload the raw file. Fix has to happen at upload time; existing broken records can be re-uploaded by staff.

## Fix

Client-side conversion to JPEG before upload in both `InsuranceCardUpload.tsx` and `SecondaryInsuranceCardUpload.tsx`.

1. Add `heic2any` dependency (small, browser-only, no server changes).
2. In each component's `uploadFile`, detect HEIC/HEIF by extension (`.heic`, `.heif`) or MIME (`image/heic`, `image/heif`) — iOS sometimes reports an empty type.
3. If detected: convert to JPEG blob (quality 0.9), rebuild a `File` with `.jpg` extension and `image/jpeg` type, then continue the existing upload path unchanged. Show a brief toast ("Converting HEIC…") during conversion so slow phones don't feel frozen.
4. If conversion throws: toast a clear error asking the user to upload JPG/PNG instead, and abort — don't upload the raw HEIC.
5. Keep `accept="image/*"` (iOS camera roll needs it), but add a comment noting HEIC is auto-converted.

No changes to storage bucket, edge functions, DB schema, or the viewer modal — once the stored file is a real JPEG, the existing `<img src>` preview and "open in new tab" behavior work correctly.

## Files touched
- `package.json` — add `heic2any`
- `src/components/appointments/InsuranceCardUpload.tsx` — HEIC conversion in `uploadFile`
- `src/components/appointments/SecondaryInsuranceCardUpload.tsx` — same

## Out of scope
- Backfilling Donna Zarn's existing broken card (staff can re-upload; happy to add a one-off cleanup util if you want).
- Server-side conversion / a Supabase edge function — unnecessary since we can convert in the browser before the file ever reaches storage.
