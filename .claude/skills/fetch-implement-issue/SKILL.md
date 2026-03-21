---
name: fetch-implement-issue
description: Fetch open GitHub issues, let the user pick one, then implement it on a new branch and open a PR to main.
---

Fetch open GitHub issues for this repository and help the user pick one to implement.

## Step 1 — Fetch issues

Run the following command and display all open issues to the user in a clear numbered list showing the issue number, title, and body:

```bash
/opt/homebrew/bin/gh issue list --repo acn-qiangchen/mytask --state open --json number,title,body --jq 'sort_by(.number)'
```

## Step 2 — Ask user which issue to implement

Use AskUserQuestion to ask: "Which issue would you like to implement? Enter the issue number."

## Step 3 — Checkout main and create feature branch

Once the user picks an issue number N:
- Determine from the issue title/labels whether it is a bug fix (`fix/`) or new feature (`feature/`). Bugs usually contain words like "bug", "fix", "error", "crash", "broken". Features are everything else.
- Create a URL-friendly short slug from the issue title (lowercase, hyphens, max 5 words).
- Run:
  ```bash
  git checkout main && git pull && git checkout -b <prefix>/issue-<N>-<slug>
  ```
  Example: `fix/issue-4-timer-runs-on-complete` or `feature/issue-2-sound-notifications`

## Step 4 — Plan and implement

Enter plan mode to research and plan the implementation for the chosen issue, then implement it following the plan. Refer to CLAUDE.md for architecture context and constraints.

## Step 5 — Push and open PR

After implementation is complete and the build passes (`npm run build`):
```bash
git push -u origin <branch>
/opt/homebrew/bin/gh pr create --base main --title "<issue title>" --body "..."
```

The PR body should summarise what was done and include `Closes #<N>`.
