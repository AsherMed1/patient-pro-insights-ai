# Connect Project to GitHub (Git Sync)

## Goal
Enable two-way Git sync between this Lovable project and a GitHub repository so the project code can be backed up, edited locally, and collaborated on via GitHub.

## What will happen
- A new GitHub repository is created under the selected GitHub account/organization.
- The current project code is pushed to that repository.
- Future changes made in Lovable automatically push to GitHub.
- Changes pushed to GitHub from an IDE or GitHub UI automatically sync back to Lovable.

## Steps to complete (performed in the Lovable editor)
1. Open the Lovable editor for this project.
2. Click the **Plus (+)** menu in the chat input (bottom left).
3. Select **GitHub → Connect project**.
4. Authorize the Lovable GitHub App on GitHub if prompted.
5. Choose the GitHub account or organization where the repository should live.
6. Click **Create Repository** in Lovable to generate the repo and push the project code.

## Post-connection notes
- The repository can be cloned locally with `git clone <repo-url>`.
- Lovable's built-in version history and rollback features remain available alongside GitHub.
- Branches can be created and switched from the Lovable editor.

## Limitations
- Lovable does not support importing an existing GitHub repository into this project.
- If an existing repo is needed, the workaround is to create a new Lovable project, connect it to GitHub, then manually copy the existing code over.

## No code changes required
This is a platform-level connection initiated from the Lovable editor UI; no source files or environment variables in this project need to be modified.
