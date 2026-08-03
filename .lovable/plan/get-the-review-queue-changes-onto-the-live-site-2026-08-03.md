# Get the Review Queue changes onto the live site

The project is published and public, so the site itself is fine — the New / Pending Review buckets simply aren't in the deployed build yet. Frontend changes only go live when a publish is run after the edits land, and a publish that ran before or during the edit captures the older code.

## Steps

1. Run a fresh security scan and confirm there are no critical findings (publishing is blocked by unresolved critical issues).
2. Re-publish the project so the current code — including the three-bucket Review Queue — is deployed.
3. Confirm the live URL serves the new build once the deploy finishes (about a minute).

## If it still looks unchanged after that

- Hard-refresh the live tab (Cmd/Ctrl + Shift + R) to clear the cached bundle.
- The site is reachable at both `patient-pro-insights-ai.lovable.app` and the custom domain `patientproclients.com`; the custom domain can take a few extra minutes to serve the new build.
- Confirm the account viewing the live app has admin access — the Review Queue buckets are admin-only surfaces.

## Technical notes

No code changes are needed. Publish settings are already `is_published: true`, visibility `public`. This is a deploy-only action: `security--get_scan_results` / `security--run_security_scan`, then `preview_ui--publish`.
