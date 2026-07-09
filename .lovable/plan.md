Delete 7 duplicate appointment records from `all_appointments`:

**Georgia Endovascular**
- 06f937b4 — Anthony Dickson
- 862a6134 — Isaiah Ballard
- c199c9ca — Kevin Jahner
- 8ee410d1 — Charles Anderson

**Texas Endovascular - Houston Vein Clinic**
- 59fef288 — Jacque Cooper
- fe4a6c1a — Randy Gautreaux
- 841e3edf — Lola Taylor

All 7 IDs verified in the database. Executed as a single DELETE via the insert tool matching on the full UUIDs. Related child rows (notes, tags, reschedules, EMR queue) will cascade or be removed via existing FKs.

No code changes.