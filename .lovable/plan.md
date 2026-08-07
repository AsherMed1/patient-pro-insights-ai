# Notify AM and Tech when mentioned in tickets and in patient-record Notes

## What's true today

- Marissa Kresnik, Duncan DiSciorio (AM) and Luis De Leon, Johann Alpapara, Althea Romero, Mohsin (Tech) all already hold the `admin` role, so they already appear in the QA Operations mention picker and already receive bell notifications when tagged in a QA Operations note or in a Control Hub ticket comment. (Luis's two personal Gmail accounts are separate `project_user` logins and are not mentionable — his `luis.d@patientpromarketing.com` account is the one that gets notified.)
- The Notes section on a patient record in the portal (the appointment card / detailed view) has **no** @mention support at all — no picker, no chips, no notification. That is the actual gap.
- Control Hub comment mentions only resolve on an exact email or exact full-name match, so `@Marissa`, `@Duncan`, `@AM` or `@Tech` in a ticket comment currently notifies nobody.

## What changes

### 1. @mentions in the patient-record Notes

- Typing `@` in the Notes box on a patient record opens the same teammate picker used in QA Operations.
- Tagged teammates get a bell notification titled with the patient and clinic; clicking it opens that patient's record with the note highlighted.
- Mentions render as chips in the saved note, exactly like QA notes.
- Only teammates with portal QA access (admin, agent, QA specialist, VA) can be tagged — which covers both AM and Tech.

### 2. AM and Tech group tags

- `@AM` notifies Marissa Kresnik and Duncan DiSciorio.
- `@Tech` notifies Luis De Leon, Johann Alpapara, Althea Romero, and Mohsin.
- The groups appear at the top of the picker in QA notes and in patient-record notes, and are also recognised in Control Hub ticket comments.

### 3. Looser matching for Control Hub ticket comments

- Ticket comments now match `@AM` / `@Tech`, a first name when it is unambiguous (`@Duncan`, `@Althea`), and an email — in addition to the current exact full-name match.
- Ambiguous first names (two Marissa accounts, several Luis accounts) resolve to the `@patientpromarketing.com` account; if still ambiguous, they are skipped as they are today.

Escalation routing is unchanged — Escalated to AM / Escalated to Tech still do not auto-assign anyone. These notifications fire only on an actual mention.

## Technical notes

- Migration on `qa_note_mentions` (the shared notification feed): make `case_id` nullable, add `appointment_id uuid` and `appointment_note_id uuid`, and a check that one of `case_id` / `appointment_id` is present. Keep existing RLS (recipient-scoped) and add grants unchanged for the new columns.
- `src/hooks/useQAMentions.tsx`: widen the select to join `all_appointments (lead_name, project_name)` for appointment-sourced rows and expose `appointment_id` / `appointment_note_id` on the shaped record.
- `src/components/notifications/MentionsBell.tsx`: when a notification carries `appointment_id`, navigate to the appointments view with `?appointment=<id>&note=<note_id>&n=<nonce>` instead of the QA queue link.
- `src/components/appointments/AppointmentNotes.tsx`: replace the plain `Textarea` in the add/edit paths with `MentionTextarea`, render saved text through `src/lib/mentions.tsx`, and after `addNote` insert `qa_note_mentions` rows (`kind: 'mention'`, `appointment_id`, `appointment_note_id`, title `"<Patient> — <Clinic>"`). Reuse `notifyQAUsers` from `src/lib/qaEscalation.ts`, extended to accept `appointmentId`/`appointmentNoteId`.
- `src/hooks/useMentionableUsers.tsx`: append two synthetic group entries (`@AM`, `@Tech`) backed by an exported `MENTION_GROUPS` map of emails; token expansion happens at send time so stored tokens stay `@[Full Name](uuid)` per member plus a plain `@AM` label.
- `src/components/appointments/AppointmentsList.tsx` / `AppointmentCard.tsx`: accept a `focusAppointmentId` / `focusNoteId` from the URL, open that card's Notes tab, and scroll the note into view.
- `supabase/functions/controlhub-ticket-webhook/index.ts`: extend the mention resolver with the group aliases and unambiguous first-name matching, preferring `@patientpromarketing.com` profiles.
- Verification with a throwaway record: add a note tagging `@AM`, confirm both Marissa and Duncan get a bell item that opens the patient record; post a Control Hub comment containing `@Tech` and confirm four notifications; confirm an unknown `@name` still notifies nobody and never fails the webhook. Clean up the test rows.
