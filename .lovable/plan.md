## 1. Column sorting in the QA Operations Queue

Add click-to-sort on the queue table headers (`src/components/admin/QAOperationsQueue.tsx`).

Sortable columns and their sort semantics:

| Column | Type | Sort |
|---|---|---|
| Patient | text | A–Z / Z–A (case-insensitive, blanks last) |
| Clinic | text | A–Z / Z–A |
| Service | text | A–Z / Z–A |
| Alerts | status | groups matching alert types together, using a fixed alert-priority order |
| Self-Booked | status | Yes / No / — grouped |
| Error, Error Source, Resolution | text | A–Z / Z–A, blanks last |
| Date Created | date | oldest ↔ newest (uses group `earliestCreated`) |
| Latest Alert | date | oldest ↔ newest (uses group `latestActivity`) |
| Resolved | date | oldest ↔ newest, blanks last |
| Ticket | text | ticket ID A–Z, "None" last |

Behavior:
- One `sortKey` + `sortDir` state; clicking a header cycles ascending → descending → back to the default (Date Created descending / current behavior).
- Sorting applies to the already-filtered, already-grouped list, so grouping by contact and bucket counts are unchanged.
- Visual indicator: header text becomes a button with an up/down chevron (`ArrowUp`/`ArrowDown`); inactive columns show a faint `ArrowUpDown` on hover. Active header is emphasized.
- Sort persists across tab switches within the session; resets on reload.

## 2. Multiple ticket attachments

**Storage:** a new private `qa-ticket-attachments` bucket (screenshots can contain PHI), with policies allowing authenticated staff to upload and read. Files stored under `{case_id}/{timestamp}-{filename}`.

**Schema:** add `attachments jsonb` (array of `{name, path, size, type, url}`) to `qa_cases`, plus records in the ticket activity metadata so the ticket history shows what was attached.

**Ticket dialog (`QAOperationsQueue.tsx` → Create ControlHub Ticket):**
- New "Attachments" field with a multi-select file input (and drag-and-drop) — `multiple` enabled.
- Selecting files again appends to the list rather than replacing it.
- Each pending file shows its name, size, and an X to remove it before submitting.
- Client-side limits: max 10 files, 20 MB each, images/PDF/doc types.
- On submit: files upload to storage first, signed URLs (long-lived) are generated, then the ticket is created with the attachment list; upload failure aborts ticket creation with a clear toast.

**Edge function (`create-controlhub-ticket`):**
- Accepts an `attachments` array, validates it, forwards it to ControlHub in the payload (top-level `attachments` plus in `metadata`), persists it on the `qa_cases` row, and includes it in the `qa_case_activity` metadata.

**Viewing:** the case drawer's ticket section lists all submitted attachments as clickable links (name + size), opening in a new tab.

### Technical notes
- Sorting is pure presentation over `filteredGroups` — no query or grouping changes.
- ControlHub receives attachment URLs, not binaries, so no change is needed on their upload API; if they later support binary intake we can swap the transport without touching the UI.
- A migration is required for the bucket, its policies, and the `attachments` column; it will be submitted for your approval before any code that depends on it.
