---
name: fetch-implement-issue
description: Fetch open GitHub issues, let the user pick one, then implement it on a new branch, run unit tests, open a PR, and merge it to main.
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

As part of implementation, write unit tests alongside the code changes:
- Place test files next to the source files they test (e.g. `src/utils/foo.test.ts` for `src/utils/foo.ts`).
- Cover the core logic: happy path, edge cases, and any bug-specific regression cases.
- Use the existing test framework already configured in the project.

## Step 5 — Build and unit tests

After implementation, verify the build passes and run unit tests:
```bash
npm run build
npm test -- --run
```

If any tests fail, fix the failures before proceeding. If no test file exists for the changed code, write appropriate unit tests covering the core logic of the implementation.

## Step 6 — Push and open PR

Once build and tests pass:
```bash
git push -u origin <branch>
/opt/homebrew/bin/gh pr create --base main --title "<issue title>" --body "..."
```

The PR body should summarise what was done and include `Closes #<N>`.

## Step 7 — Wait for CI and merge PR

1. Wait for GitHub Actions CI to complete:
   ```bash
   /opt/homebrew/bin/gh pr checks <PR-number> --watch
   ```
2. Once all checks pass, merge the PR:
   ```bash
   /opt/homebrew/bin/gh pr merge <PR-number> --squash --delete-branch
   ```
3. Pull the updated main locally:
   ```bash
   git checkout main && git pull
   ```
