# Add 252-hour option to Short Notice Alert Threshold dropdown

## What
Add a new "252 hours (10.5 days)" choice to the Short-Notice Alert Threshold dropdown in the project edit dialog.

## Where
`src/components/projects/EditProjectDialog.tsx` — the `<SelectContent>` list (lines 291-305). Insert one new `<SelectItem value="252">252 hours (10.5 days)</SelectItem>` between the existing 240-hour and 336-hour entries.

## Notes
- No schema or backend change needed — the threshold is stored as a number and any integer is accepted.
- No other dropdown/filter references the threshold list, so this is the only edit.
