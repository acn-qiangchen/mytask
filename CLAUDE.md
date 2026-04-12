# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # local dev server (http://localhost:5173)
npm run build     # TypeScript check + Vite production build → dist/
npm run lint      # ESLint
npm run preview   # preview the production build locally
```

Node version is pinned in `.nvmrc` (v20). The project uses `.claude/settings.local.json` (gitignored) to inject the correct `PATH` for the nvm-managed Node binary so Claude Code tools pick up the right version automatically.

CI/CD: pushing to `main` triggers two workflows:
- `.github/workflows/deploy.yml` → builds and deploys to GitHub Pages at `https://acn-qiangchen.github.io/mytask/`.
- `.github/workflows/release.yml` → creates a GitHub release + tag for the current `package.json` version if one does not already exist.

## Architecture

### State & data flow

All persistent app state (`Task[]`, `Session[]`, `Settings`, `selectedDate`) lives in `AppContext` (`src/context/AppContext.tsx`). It uses `useReducer` with actions defined in `src/context/reducer.ts`. On mount it hydrates from DynamoDB (via `src/utils/dynamoSync.ts`); every state change is saved to `localStorage` immediately and debounced 1.5 s to DynamoDB.

Timer state is separate — it lives in `TimerContext` (`src/context/TimerContext.tsx`), mounted **above the router** in `App.tsx` so navigation between pages never resets a running timer. The timer uses a wall-clock `endTimeRef` (not a decrement counter) to stay accurate across backgrounded tabs; a `visibilitychange` listener snaps the display when the tab is foregrounded.

### Provider nesting order (App.tsx)
```
LangProvider
  Authenticator (AWS Cognito)
    AppProvider
      TimerProvider
        HashRouter → routes
```

### Key files

| File | Role |
|---|---|
| `src/context/AppContext.tsx` | App state provider + DynamoDB sync |
| `src/context/TimerContext.tsx` | All timer logic: countdown, session lifecycle, forceComplete, mode/task switching |
| `src/context/reducer.ts` | Pure reducer for all `AppState` actions |
| `src/hooks/useTimer.ts` | Thin re-export of `useTimerContext` — always use this in components |
| `src/i18n/translations.ts` | All UI strings (en + ja). `const ja: typeof en` enforces type parity — add new keys to `en` first, TypeScript will flag missing `ja` entries |
| `src/utils/dynamoSync.ts` | DynamoDB load/save using Cognito Identity credentials (ap-northeast-1, table `MyTask`, PK=`userId`, SK=`STATE`, `data`=serialized JSON) |
| `src/utils/storage.ts` | localStorage under key `mytask_state` |
| `src/aws-config.ts` | Amplify/Cognito config (real IDs committed — intentional for a personal app) |

### Data model

`Task` — belongs to a `date` (YYYY-MM-DD), tracks `estimatedPomodoros` vs `completedPomodoros`.
`Session` — one completed focus/break interval; `taskId` is null for break sessions.
`Settings` — durations and auto-start flags; stored inside `AppState` and persisted with the rest.

Tasks are per-day: `state.tasks.filter(t => t.date === todayStr())`. There is no cross-day task rollover.

### Timer session lifecycle

`onSessionComplete` (auto) and `forceComplete` (manual) both: record a `Session` via `addSession`, call `incrementTaskPomodoro` for focus sessions, then advance the mode (`focus → short_break` or `long_break` based on `longBreakInterval`, `break → focus`). If the corresponding auto-start setting is on, the next session starts immediately.

### Routing

HashRouter with three routes: `/` (TimerPage), `/reports` (ReportsPage), `/settings` (SettingsPage). HashRouter is used for GitHub Pages compatibility (no server-side routing needed).

## Requirements

`REQUIREMENTS.md` is the single source of truth for all user-facing features and behaviours.

**Any time a feature is added, changed, or removed, you must update `REQUIREMENTS.md` as part of the same PR.** This includes:
- New requirement IDs for new behaviour (use the next available number in the relevant section).
- Updates to existing requirement text if behaviour changes.
- Removal of requirement rows if a feature is deliberately removed.

Do not merge a feature PR without a corresponding `REQUIREMENTS.md` update.

## Git workflow

- Always work on a dedicated branch — never commit directly to `main` or `master`.
- Branch names must include the GitHub issue number: `feature/issue-<N>-<short-description>` or `fix/issue-<N>-<short-description>`.
- After pushing the branch, open a PR targeting `main`.

## Release process

A GitHub release tag is **required** for every release. The release workflow automates this:

1. Bump `version` in `package.json` (e.g. `1.0.0` → `1.0.1`) as part of the feature/fix PR.
2. Add a `CHANGELOG.md` entry for the new version — the PR check (`.github/workflows/changelog-check.yml`) **blocks merge** if the version was bumped but `CHANGELOG.md` was not updated.
3. Merge to `main` — `.github/workflows/release.yml` automatically creates the Git tag and GitHub release using the new version, with auto-generated release notes.
4. A release is **not considered complete** until a GitHub release tag exists for that version.

To distinguish multiple releases on the same day, increment the patch segment (`1.0.1`, `1.0.2`, …).

## UI / UX constraints

The app targets **mobile as a primary use case** alongside desktop. Key implications:
- Never use hover-only interactions (`opacity-0 group-hover:opacity-100`) for actionable controls — touch devices have no hover state. Buttons and action icons must always be visible.
- Prefer tap-friendly target sizes (minimum ~40px hit area).
- Avoid tooltips as the sole affordance for an action.
