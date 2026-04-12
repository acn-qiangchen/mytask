# Changelog

All notable changes to this project are documented here.
A GitHub release tag is created for every entry (see [releases](https://github.com/acn-qiangchen/mytask/releases)).

Format: `## [version] - YYYY-MM-DD` followed by categorised change bullets.

---

## [1.0.1] - 2026-04-12

### Added
- GitHub Actions release workflow (`.github/workflows/release.yml`) — automatically creates a GitHub release and tag on every `main` push when the `package.json` version is new (closes #47).
- `CHANGELOG.md` — this file; required for every release going forward (closes #46).
- Release process documented in `CLAUDE.md`.

---

## [1.0.0] - 2026-04-12

### Added
- Ticket management: register tickets (number + description), link tasks to tickets, view focus distribution grouped by ticket on the Reports page (closes #39).
- Distraction distribution pie chart on the Reports page — groups interruptions by reason with count and percentage (closes #38).
- Pause reason modal and interruption tracking (closes #25).
- Task history date filter defaults to today (closes #30).
- Report: merged weekly/monthly bar charts with toggle; date filter applied to focus distribution (closes #32).

### Fixed
- Report page filter now uses session dates instead of task planned dates, so a task worked on day Y appears in day Y's report (closes #37).
- Date logic uses browser local timezone instead of UTC (closes #27).

### Changed
- Version display in the top bar changed from a build date string to a semver version string sourced from `package.json` (closes #43).
