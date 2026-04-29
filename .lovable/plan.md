## Add VA (Virtual Assistant) Role

A new "VA" role scoped to appointment notes only. VAs can view, edit, and delete any note (including notes other users created). Only admins can assign the role.

### 1. Database (migration)

- Add `'va'` to the `app_role` enum.
- Update RLS on `public.appointment_notes`:
  - Add SELECT policy granting VAs read access to all notes.
  - Add UPDATE policy: `has_role(auth.uid(), 'va')` for both USING and WITH CHECK.
  - Add DELETE policy: `has_role(auth.uid(), 'va')`.
  - Existing admin/agent ALL policies remain (they already cover edit/delete).
- Optional: add a trigger or column `edited_by` / `edited_at` on `appointment_notes` to record who last modified a note (helps audit). New columns: `last_edited_by text`, `last_edited_at timestamptz`. Hook updates from the UI to populate them.
- Log every edit/delete to `audit_logs` via `log_audit_event(...)` from the client (entity `appointment_note`, action `note_edited` / `note_deleted`).

### 2. Frontend role plumbing

- `src/hooks/useRole.tsx`: extend `UserRole` union with `'va'`. Add `isVA()` helper. Treat VA as a non-management role (NOT in `hasManagementAccess`). VAs do not get blanket project access — they reach notes via the appointments they can already view, OR we grant them read access to all appointments (decision below).
- VA scope = "Notes-only": VAs do not need to see the full app. Simplest path: route them to a dedicated lightweight page, OR allow appointment list access read-only. Plan picks the minimal change: VAs get the same view as agents (so they can find notes in context), but their edit/delete UI is limited to notes. We'll restrict any other edit buttons by checking `hasManagementAccess()` (already used in many places).
- `AuthGuard`: no change needed since VA passes auth; route protection unchanged.

### 3. UI changes — `AppointmentNotes.tsx`

- Surface Edit + Delete buttons on each note card when the current role is `admin`, `agent`, or `va`.
- Edit: inline textarea + Save/Cancel. Calls `updateNote(id, text)`.
- Delete: confirm dialog → `deleteNote(id)`.
- Hide buttons for system-generated notes (`created_by === 'System'`) to avoid breaking attribution chains, OR allow only for admins. Plan: allow edit/delete on all notes for these three roles.

### 4. Hook — `useAppointmentNotes.tsx`

- Add `updateNote(noteId, newText)`: updates `note_text`, sets `last_edited_by` = current `userName`, `last_edited_at = now()`. Optimistic local update + audit log.
- Add `deleteNote(noteId)`: deletes row, removes locally, audit log.

### 5. User Management — `UserManagement.tsx`

- Add `<SelectItem value="va">VA</SelectItem>` to:
  - Create-user role dropdown
  - Edit-user role dropdown
  - Role filter dropdown
- Add badge variant for `va` (e.g. `outline` or a new color).
- Edge function `create-user-with-role` already accepts arbitrary role strings since they're passed straight to `user_roles` insert (verify, no change expected).

### 6. Memory

- Add `mem://auth/va-role` describing the new role and its permissions; update `mem://index.md` Memories list.

### Technical notes

- Enum addition requires its own migration committed before any policy referencing `'va'::app_role` runs.
- `has_role` SECURITY DEFINER function already supports the new enum value automatically.
- No changes to existing policies needed (additive only), so admins/agents keep current behavior.

### Open question (will use defaults if not specified)

You picked "Notes-only VA" but didn't answer the UI buttons question. Default: edit/delete buttons visible to **VA + Admin + Agent** (Admin/Agent already have DB permission via the existing ALL policy, so exposing the UI for them too is consistent and harmless).
