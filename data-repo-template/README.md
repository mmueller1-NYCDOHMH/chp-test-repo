# Data repo setup

Everything in this folder goes into the **data repo** (the public repo that holds
`data/` and `content/`), not the site repo. Copy the `github/` folder to the root
of the data repo and **rename it to `.github`** (it's stored without the dot here so
it isn't mistaken for this site repo's own workflows).

| File | What it does |
|---|---|
| `github/workflows/content-checks.yml` | On every pull request: checks the files, posts a report comment, marks problems in "Files changed", labels the PR, and gates merging. |
| `github/workflows/publish.yml` | After a merge to main: checks + full test build, then publishes. On failure: opens an issue and alerts Teams; the live site is left alone. |
| `github/ISSUE_TEMPLATE/` | "Report a copy problem" and "Report a data problem" forms. |
| `github/pull_request_template.md` | Short checklist shown on every new pull request. |
| `github/CODEOWNERS` | Sends data changes to the data team and copy changes to the content team. |

The check logic itself lives in the site repo (`scripts/validate-content.js`,
settings in `scripts/validate-config.json`); the workflows check out the site repo
to run it, so there is one copy of the rules.

## One-time setup

### 1. Teams webhook
In the Teams channel: **••• → Workflows → "Post to a channel when a webhook request
is received"** → finish the steps → copy the URL.

### 2. Data repo → Settings → Secrets and variables → Actions

| Kind | Name | Value |
|---|---|---|
| Variable | `SITE_REPO` | the site repo, e.g. `nyc-health/community-health-profiles` |
| Secret | `TEAMS_WEBHOOK_URL` | URL from step 1 |
| Secret | `SITE_BUILD_HOOK_URL` | the host's build hook (Netlify/Render). Until set, publish runs checks + test build only. |
| Secret | `SITE_REPO_DEPLOY_KEY` | only if the site repo is private (preferred): private half of a read-only deploy key added to the site repo |
| Secret | `SITE_REPO_TOKEN` | alternative to the deploy key: fine-grained token, Contents read-only on the site repo |
| Variable | `TEAMS_NOTIFY_PRS` | optional: `true` to also post "Waiting for review" when a PR is opened |

### 3. Data repo → Settings → Branches → add a rule for `main`
- Require a pull request before merging, **1 approval**
- Require review from Code Owners (after editing CODEOWNERS)
- Require status checks: **Content checks** and **Review sign-off**
- Do not allow bypassing the above

### 4. Labels
Created automatically the first time a pull request is checked. The one people use
by hand is **warnings-reviewed**: a reviewer adds it after looking at the
"Needs review" items. Pushing new changes removes the sign-off.

## What editors see

1. Upload or edit a file → **Propose changes** (GitHub opens a pull request).
2. A comment appears within a couple of minutes:
   - ❌ **Must fix**: plain-language list with file and line; fix and re-upload to the same PR.
   - ⚠️ **Needs review**: things a reviewer should confirm (big value swings, removed indicators, sentences that won't fill in, old years left in copy).
   - **What this change does**: indicators updated/added/removed, copy edited, biggest value changes.
   - Problems that were already on main are listed separately and don't block.
3. Reviewer approves (and adds **warnings-reviewed** if needed) → merge.
4. Publish runs; Teams gets "Publishing…" or "Publishing failed" with a link.

## Testing the checks locally (site repo)

```bash
npm run validate                                   # site repo's own data/ + content/
node scripts/validate-content.js \
  --content-root ../data-repo --base ../data-repo-main
```
