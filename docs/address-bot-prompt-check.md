# Standing check: bot text in patient addresses

GoHighLevel stores the booking bot's system prompt ("OpenAI Prompt: Role: You are …
Disqualification Criteria: …") in a contact custom field. That text must never end up
in a patient's address.

Two guards are in place:

1. `ghl-webhook-handler` drops bot-prompt custom fields at ingest
   (`isBotPromptField` / `sanitizeBotPrompt`), so new intake notes don't carry the block.
2. The portal's display-time address fallback (`extractAddressFromNotes` in
   `src/components/appointments/DetailedAppointmentView.tsx`) strips bot noise and
   validates candidates with `isPlausibleAddress`.

Run this query periodically (expected result: zero rows) to confirm nothing regressed:

```sql
SELECT id, project_name, lead_name, parsed_contact_info->>'address' AS address
FROM all_appointments
WHERE parsed_contact_info->>'address' ~* '(disqualify|openai|kindly|role:|emoji|booking|you are)'
   OR length(parsed_contact_info->>'address') > 120;
```

To find records that still have no stored address while their notes contain the bot
block (these fall back to the hardened guesser and will show a real address or nothing):

```sql
SELECT project_name, count(*)
FROM all_appointments
WHERE coalesce(parsed_contact_info->>'address','') = ''
  AND (patient_intake_notes ILIKE '%OpenAI Prompt:%' OR patient_intake_notes ILIKE '%disqualify%')
GROUP BY 1 ORDER BY 2 DESC;
```
