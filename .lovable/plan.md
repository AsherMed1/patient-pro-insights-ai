## Delete duplicate John Dupree entry (Champion Heart & Vascular)

Two rows exist for John Dupree, both same appt (Jul 20, 2026 2:00 PM), same GHL contact (`uaSIJ1qx5spVcUmd1cDN`), but two different GHL appointment IDs:

| Keep / Delete | ID | Created | Status | GHL appt ID |
|---|---|---|---|---|
| ✅ Keep | `5052e510-55f7-4ff0-8134-728d40ed1562` | Jul 6 | **Showed** | ErMxOSdPaIlG9nmiUg61 |
| ❌ Delete | `f9d9b3b9-4219-4c67-b1fd-ba5677a02132` | Jul 13 | Welcome Call | HyxatO3q89Znc5zilpEh |

### Action
- Hard-delete `all_appointments` row `f9d9b3b9-4219-4c67-b1fd-ba5677a02132` (the Welcome Call duplicate showing in Needs Review).
- Keep the Showed row untouched.

No code changes. No trigger/logic changes this turn.