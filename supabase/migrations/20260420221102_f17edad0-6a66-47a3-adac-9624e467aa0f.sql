UPDATE all_appointments
SET cancellation_reason = 'Duplicate booking — patient kept Hollywood Apr 28 appointment',
    updated_at = now()
WHERE id = 'a0c87e8f-ef80-4d6a-a15e-450e820d38bd';

INSERT INTO appointment_notes (appointment_id, note_text)
VALUES (
  'a0c87e8f-ef80-4d6a-a15e-450e820d38bd',
  'Cleanup per Vivid support request: patient Riviann Jerry was double-booked (Hollywood Apr 28 + Miami May 11). Hollywood Apr 28 kept as source of truth; Miami May 11 cancelled and synced to GHL.'
);