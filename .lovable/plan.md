# Compose Email to Clinic from the QA case record

Yes — this is feasible. Phase 1 is send-only from the Scheduling Google Workspace mailbox, with every sent email recorded on the patient's QA record.

## How it works

A new "Email Clinic" panel sits in the QA Operations case drawer, next to the ControlHub ticket panel and Internal Patient Notes.

- **Compose:** subject + message body, with @-free rich-text-lite (plain text), image/file attachments using the same attach control already used for ControlHub replies and notes.
- **Recipients:** a dropdown of saved clinic contacts for that patient's project (name + email + role, e.g. Scheduler / Office Manager), multi-select, plus optional CC. Contacts are managed in a small admin screen per project.
- **Sender:** always the Scheduling mailbox (scheduling@…). The email is sent through Gmail, so it also appears in the real Gmail Sent folder and threads normally when the clinic replies.
- **Prefill:** subject and body start from a template with the patient name, clinic, appointment date/time and the alert type, so Gloria isn't retyping context. Templates are editable per send.
- **Thread record:** each sent email is stored on the case and rendered as a timeline entry — recipients, subject, body, attachments, who sent it, and when. Visible in the case drawer and counted in the case activity log.
- **Reply handling (phase 1):** clinic replies still land in the Gmail Scheduling inbox. The panel shows the Gmail thread link so one click opens the conversation. Phase 2 (below) pulls replies in automatically.

## Phase 2 (later, if wanted)

Because sending goes through the Gmail API, replies can be pulled back in with a scheduled job that reads the Scheduling mailbox and matches the stored Gmail thread ID to the case — turning the panel into a full two-way thread with no inbox searching. This is an additive step; nothing in phase 1 has to be redone.

## Access and safety

- Panel is limited to admin and QA specialist roles; clinic portal users never see it.
- Emails contain PHI, so the body and attachments are stored in the same private, access-controlled way as QA notes/attachments, and every send is written to the audit trail.
- Attachments are re-used from the existing private attachments bucket and attached to the outbound message.

## Technical notes

- **Gmail access:** connect the Scheduling Google Workspace account via the Google Mail connector and send with `users/me/messages/send` through the connector gateway. The connected account is the sender, so the Scheduling mailbox must be the account that authorizes the connection. (Resend, already used for welcome emails, is not a good fit here — it can't put the message in the Scheduling Sent folder or thread with the clinic's replies.)
- **New table `qa_case_emails`:** `case_id`, `appointment_id`, `project_name`, `to_emails[]`, `cc_emails[]`, `subject`, `body`, `attachments jsonb`, `gmail_message_id`, `gmail_thread_id`, `sent_by_user_id`, `sent_by_name`, `status` (`sent` / `failed`), `error`, `created_at`. GRANTs for `authenticated` (select/insert) and `service_role`; RLS mirroring `qa_case_notes` access (`has_qa_case_access`).
- **New table `clinic_email_contacts`:** `project_name`, `name`, `email`, `role`, `is_default`, `active`. Admin-managed; GRANT select to `authenticated`, full to `service_role`, write policies restricted to admins.
- **New edge function `send-clinic-email`:** validates the caller's JWT and QA role with Zod-validated input, builds the RFC 2822 message (with base64 attachments), sends via the gateway, then inserts the `qa_case_emails` row and a `qa_case_activity` entry. Surfaces provider status/body on failure.
- **Frontend:** new `src/components/admin/QAEmailPanel.tsx` rendered in the case drawer in `QAOperationsQueue.tsx`, reusing `ImageAttachInput`, `AttachmentGallery` and `uploadImages`; realtime subscription on `qa_case_emails` for the thread list. Small admin editor for clinic contacts alongside the existing admin settings screens.

## Build order

1. Connect the Scheduling Gmail account.
2. Migrations for the two tables.
3. `send-clinic-email` edge function.
4. Email panel in the case drawer + clinic contact management.
5. Templates and audit/activity wiring.
