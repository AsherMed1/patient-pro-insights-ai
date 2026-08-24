# Clean up the Service line dropdown options

## What's wrong

The Service line dropdowns (OON Block Rules, Supported Insurances, rule tester) are built from every distinct `procedure_type` value ever parsed for a clinic, with no filtering by frequency. Checked across all appointments, the real service lines and the junk are clearly separable:

Real lines: GAE (14,632), PAE (2,428), PFE (1,978), UFE (1,208), FSE (986), PAD (694), Neuropathy (616), HAE (418), ATE (22), TAE (19).

Junk / variants currently offered as options:
- `TKR` — 5 rows across 5 clinics (Joint & Vascular, NG Vascular, Richmond Vascular, Texas Vascular, Vascular and Vein Institute of the South). Not a service line.
- `knee replacement surgery` (1), `tarsal tunnel release` (1), `Procedure` (1), `FNA` (2) — misparses.
- `null` as a literal string (9 rows, 3 clinics).
- `PAE w/BPH` (59), `PAE - BPH` (2), `Genicular Artery Embolization (GAE)` (1) — variants that should collapse onto PAE / GAE.

## The fix

In `src/lib/serviceLines.ts` (single source used by every service-line dropdown):

1. Add a canonical service-line allowlist: GAE, PAE, PFE, UFE, FSE, PAD, HAE, ATE, TAE, PFE, Neuropathy (plus any acronym already present in `KNOWN_PROJECT_SERVICES`). Anything not on the list is dropped from dropdowns.
2. Extend `normalizeServiceLine` alias handling: `PAE w/BPH`, `PAE - BPH`, `PAE with BPH` → PAE; `UAE` → UFE; a name with a parenthesised acronym (`Genicular Artery Embolization (GAE)`) → the acronym; explicitly reject `TKR`, `FNA`, `Procedure`, `null`, and free-text surgical phrases.
3. `fetchServiceLines` returns only allowlisted values (still union'd with the clinic's `KNOWN_PROJECT_SERVICES`), so each clinic shows only the lines it actually runs.
4. Safety valve: a service line already saved on an existing rule or supported-insurance row keeps rendering in that row's select (the existing fallback `SelectItem` in `InsuranceRulesConfig.tsx` already does this), so no saved rule silently loses its scope.

## Not included

This is a display-layer fix; it does not rewrite the ~20 mis-parsed `parsed_pathology_info` rows in the database. Say the word if you also want those rows corrected (e.g. the 5 `TKR` rows and the 9 literal `null` rows).

## Files touched

- `src/lib/serviceLines.ts`
