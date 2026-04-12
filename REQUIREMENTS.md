# MyTask — Application Requirements

## 1. Overview

MyTask is a Pomodoro-based personal task management app. Users break work into focused intervals ("pomodoros"), track progress per task per day, and review history through charts and session logs. The app is designed for both mobile and desktop use.

All date values (task date, session date, "today" comparisons, weekly/monthly chart ranges) use the **browser's local timezone**, not UTC. A task created or a session recorded at 9 AM in Tokyo is assigned the local date April 2, not the UTC date April 1.

---

## 2. Authentication


| ID     | Requirement                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-1 | The app requires sign-in before any content is shown.                                                                              |
| AUTH-2 | Authentication is handled by AWS Cognito (user pool + identity pool).                                                              |
| AUTH-3 | A Sign Out button is always accessible from the top navigation bar.                                                                |
| AUTH-4 | If the signed-in user changes (different Cognito identity), the local state is reset to the remote (DynamoDB) state for that user. |


---

## 3. Timer

### 3.1 Modes


| ID    | Requirement                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------- |
| TMR-1 | The timer supports three modes: **Focus**, **Short Break**, and **Long Break**.                       |
| TMR-2 | The user can switch modes at any time using the mode selector at the top of the timer.                |
| TMR-3 | If the timer is running when the user switches mode, a confirmation dialog is shown before switching. |


### 3.2 Controls


| ID    | Requirement                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------- |
| TMR-4 | The user can **Start**, **Pause**, **Reset**, and **Force Complete** the timer.                                       |
| TMR-5 | Start is disabled in Focus mode if no task is selected and the timer is not running.                                  |
| TMR-6 | Force Complete ("Done") records the actually elapsed time (not the full configured duration) as the session duration. |
| TMR-7 | Reset returns the timer to the full configured duration for the current mode without changing the mode.               |


### 3.3 Display


| ID     | Requirement                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TMR-8  | The timer displays remaining time in `MM:SS` format inside a circular progress ring.                                                                                                       |
| TMR-9  | The ring color reflects the current mode: red (Focus), green (Short Break), blue (Long Break).                                                                                             |
| TMR-10 | The ring progress advances as time elapses.                                                                                                                                                |
| TMR-11 | The timer uses the device wall clock to stay accurate even when the browser tab is in the background. When the tab becomes visible again, the display snaps to the correct remaining time. |


### 3.4 Session Lifecycle


| ID     | Requirement                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TMR-12 | When a Focus session completes (normally or via Force Complete), a **Session** record is saved with: task ID, date, start time, actual duration (minutes), type=`focus`, completed=`true`. |
| TMR-13 | When a Break session completes, a Session record is saved with: taskId=`null`, date, start time, duration, type=`short_break` or `long_break`, completed=`true`.                           |
| TMR-14 | Pausing the timer does not save a session. Only completion (normal or forced) saves a session.                                                                                             |
| TMR-15 | After a Focus session completes, the mode automatically advances: if `sessionCount % longBreakInterval === 0` → Long Break; otherwise → Short Break.                                       |
| TMR-16 | After a Break session completes, the mode automatically returns to Focus.                                                                                                                  |
| TMR-17 | If **Auto Start Breaks** is enabled, the break timer starts immediately after a Focus session completes.                                                                                   |
| TMR-18 | If **Auto Start Pomodoros** is enabled, the Focus timer starts immediately after a Break session completes.                                                                                |
| TMR-19 | A sound plays when a session completes, if sounds are enabled.                                                                                                                             |


### 3.5 Relationship with Tasks


| ID     | Requirement                                                                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TMR-20 | A task must be selected before starting a Focus session.                                                                                                               |
| TMR-21 | Only pending (not completed) tasks can be selected.                                                                                                                    |
| TMR-22 | When a task is selected for focus, it is highlighted in the task list.                                                                                                 |
| TMR-23 | Clicking another pending task while the timer is running shows a confirmation dialog before switching.                                                                 |
| TMR-24 | If the currently focused task is marked complete while the timer is running, the timer pauses and the task is deselected.                                              |
| TMR-27 | When the user clicks Pause, a **Pause Reason modal** appears with preset reason chips (Meeting, Phone call, Bathroom, Distracted, Break, Other) and a free-text input. The chip selection and text input are mutually exclusive. |
| TMR-28 | In the Pause Reason modal: confirming with a reason or "Pause without reason" records an `Interruption` entry and pauses the timer. Dismissing the modal (backdrop click) does NOT pause the timer. |
| TMR-25 | When a Focus session completes (or is force-completed), the `completedPomodoros` counter on the selected task is incremented by 1, provided the task is still pending. |
| TMR-26 | A session counter on the timer page shows the number of focus sessions completed since the app loaded (e.g. "#3").                                                     |


---

## 4. Tasks

### 4.1 Display


| ID     | Requirement                                                                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TSK-1  | The timer page shows all **pending (not completed, not archived)** tasks regardless of their date, plus today's completed tasks.                                             |
| TSK-2  | Pending tasks are shown above completed tasks.                                                                                                                               |
| TSK-3  | Pending tasks are sorted by their `order` value (drag-and-drop order), then by `createdAt` for tasks without an order. Delayed tasks share the same ordering as today's tasks. |
| TSK-4  | Completed tasks are sorted by `completedAt` descending (most recently completed first).                                                                                      |
| TSK-5  | Completed tasks are shown at 50% opacity with a strikethrough on their title.                                                                                                |
| TSK-6  | The pomodoro progress for each task is shown as "🍅 completed/estimated".                                                                                                    |
| TSK-7  | If there are no tasks to display, a placeholder message is shown.                                                                                                            |
| TSK-21 | A pending task whose `date` is earlier than today is displayed as a **delayed task**: it receives a distinct visual style (e.g. amber/warning colour) to differentiate it from today's tasks. |
| TSK-22 | A delayed task shows its original creation date on the task line (e.g. "Mar 27").                                                                                            |


### 4.2 Adding Tasks


| ID     | Requirement                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------- |
| TSK-8  | The user can add a task by entering a title and selecting an estimated pomodoro count (1–20, default 1). |
| TSK-9  | The title field is required; submitting an empty title shows an inline error.                            |
| TSK-10 | A newly created task is assigned today's date, a unique ID, and the current timestamp as `createdAt`.    |


### 4.3 Editing Tasks


| ID     | Requirement                                                           |
| ------ | --------------------------------------------------------------------- |
| TSK-11 | The user can edit a task's title and estimated pomodoro count inline. |
| TSK-12 | The estimated pomodoro count can be adjusted between 1 and 20.        |


### 4.4 Completing & Deleting Tasks


| ID     | Requirement                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TSK-13 | The user can mark a task complete via its checkbox. Marking complete sets `completed=true` and records `completedAt`.                                                     |
| TSK-14 | Marking a completed task as incomplete sets `completed=false` and clears `completedAt`.                                                                                   |
| TSK-15 | The user can delete a task via a delete icon. A confirmation dialog is shown before deletion.                                                                             |
| TSK-16 | A "Clear completed" button appears when at least one task for today is complete.                                                                                          |
| TSK-17 | "Clear completed" sets `archivedAt` on all completed tasks for today, hiding them from the timer page. Archived tasks remain visible in task history on the Reports page. |


### 4.5 Reordering Tasks


| ID     | Requirement                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| TSK-18 | Pending tasks can be reordered via drag-and-drop.                            |
| TSK-19 | Completed tasks cannot be reordered.                                         |
| TSK-20 | The drag handle is always visible (not hover-only) to support touch devices. |


---

## 5. Reports

### 5.1 Today Summary


| ID    | Requirement                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPT-1 | The reports page shows three summary cards for today: **Focus Time** (hours and minutes), **Pomodoros Completed** (count), **Tasks Completed** (count). |
| RPT-2 | Focus Time counts only sessions of type `focus` with `completed=true` for today's date.                                                                 |
| RPT-3 | Tasks Completed counts tasks where `completed=true` or `archivedAt` is set, for today's date.                                                           |


### 5.2 Charts


| ID    | Requirement                                                                      |
| ----- | -------------------------------------------------------------------------------- |
| RPT-4 | A single **daily focus bar chart** shows focus time (minutes) per day with a **This Week / This Month** toggle to switch between 7-day and 30-day views. |
| RPT-5 | *(merged into RPT-4)*                                                                                                                                    |
| RPT-6 | A **focus distribution pie chart** shows focus time broken down by task or ticket for the active date range filter (defaults to today when no filter is set). A **By Task / By Ticket** toggle switches the grouping. |
| RPT-7 | In the pie chart, sessions with no linked task (or tasks with no ticket in ticket view) are grouped as "No Task" / "No Ticket".                          |
| RPT-8 | If no focus session data exists, charts are replaced by a "No data yet" message.                                                                         |


### 5.3 Task History


| ID     | Requirement                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| RPT-9  | The reports page shows a filterable history table of completed and archived tasks.                            |
| RPT-10 | Each row shows: title, pomodoro count (completed/estimated), started timestamp, completed/archived timestamp. |
| RPT-11 | Archived tasks are shown at 50% opacity to distinguish them from completed tasks.                             |
| RPT-12 | A date range filter (From / To) placed above the focus distribution chart applies to **both** the focus distribution chart and the task history table. Both pickers default to today so only the current day's data is shown on first open. The date filter matches tasks by **when focus sessions occurred** (session date), not by the task's planned date — so a task planned on day X but worked on day Y appears in day Y's report. |
| RPT-13 | A clear-filter button (✕) removes the date filter when a range is active.                                                                             |
| RPT-14 | If no task history exists for the selected range, a "No task history" message is shown.                       |
| RPT-15 | The reports page shows an **Interruptions** section filtered by the same date range as task history. Each row shows the reason (or "(no reason given)"), the timestamp, and the linked task name if available. |
| RPT-16 | If no interruptions exist for the selected range, a "No interruptions for this period" message is shown. |


---

## 6. Tickets


| ID     | Requirement                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| TKT-1  | A **Tickets** page (accessible via top navigation) allows users to register named tickets with a ticket number and optional description.          |
| TKT-2  | Each ticket has a user-defined **ticket number** (e.g. "JIRA-123") and an optional **description**.                                             |
| TKT-3  | Tickets can be created, edited, and deleted from the Tickets page.                                                                               |
| TKT-4  | Deleting a ticket unlinks it from all tasks that referenced it; the tasks themselves are not deleted.                                            |
| TKT-5  | When creating or editing a task, the user can optionally select a registered ticket to link the task to.                                         |
| TKT-6  | If a task is linked to a ticket, the ticket number is shown as a badge on the task item.                                                         |
| TKT-7  | On the Reports page, the focus distribution chart has a **By Task / By Ticket** toggle. In "By Ticket" mode, focus time is aggregated per ticket; tasks without a ticket are grouped as "No Ticket". |


---

## 7. Settings


| ID     | Requirement                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| SET-1  | The user can configure **Focus Duration** (1–60 min, default 25).                                                |
| SET-2  | The user can configure **Short Break Duration** (1–30 min, default 5).                                           |
| SET-3  | The user can configure **Long Break Duration** (1–60 min, default 15).                                           |
| SET-4  | The user can configure **Long Break Interval** (2–10 pomodoros, default 4).                                      |
| SET-5  | Duration fields have − and + buttons for incremental adjustment.                                                 |
| SET-6  | The user can toggle **Auto Start Breaks** (default: off).                                                        |
| SET-7  | The user can toggle **Auto Start Pomodoros** (default: off).                                                     |
| SET-8  | The user can toggle **Sound Enabled** (default: on).                                                             |
| SET-9  | The user can switch the UI language between **English** and **Japanese**.                                        |
| SET-10 | Settings are saved when the user presses the Save button. A "Saved!" confirmation message appears for 2 seconds. |
| SET-11 | If the timer is not running and the focus duration is changed, the timer display resets to the new duration.     |


---

## 7. Sound


| ID    | Requirement                                                                               |
| ----- | ----------------------------------------------------------------------------------------- |
| SND-1 | Sound plays when a session completes, if Sound Enabled is on.                             |
| SND-2 | Focus completion: two short high-pitched beeps (880 Hz).                                  |
| SND-3 | Short Break completion: one soft mid-tone (528 Hz).                                       |
| SND-4 | Long Break completion: three ascending tones (528 → 659 → 784 Hz).                        |
| SND-5 | If the browser does not support the Web Audio API, sound fails silently (no error shown). |


---

## 8. Data Persistence & Sync

### 8.1 Local Storage


| ID    | Requirement                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------ |
| DAT-1 | All app state (tasks, sessions, settings) is saved to localStorage on every state change, immediately. |
| DAT-2 | The selected UI language is persisted to localStorage separately.                                      |
| DAT-3 | The Cognito identity ID is persisted to localStorage for user-change detection.                        |


### 8.2 DynamoDB Sync


| ID    | Requirement                                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DAT-4 | State is synced to DynamoDB with a 1.5-second debounce after each change (i.e., only the latest change within any 1.5s window is written).                                                                                                                          |
| DAT-5 | On app load, state is loaded from DynamoDB and merged with the local state.                                                                                                                                                                                         |
| DAT-6 | The merge winner is determined by `updatedAt` timestamp: the newer source wins for settings and task/session ordering. Tasks and sessions present in the losing source but absent from the winning source are always preserved (union merge — no silent data loss). |
| DAT-7 | A DynamoDB write is blocked if the local state has 0 tasks and 0 sessions but the existing DynamoDB record has data, to prevent accidental overwrite.                                                                                                               |
| DAT-8 | If a DynamoDB operation fails due to an expired credential (NotAuthorizedException, InvalidSignatureException, ExpiredTokenException), the app automatically refreshes the session token and retries the operation once.                                            |
| DAT-9 | If a DynamoDB operation fails for any reason after retry, the failure is logged silently; the app continues using local state.                                                                                                                                      |


### 8.3 Cross-Device Timer Sync


| ID     | Requirement                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DAT-13 | Timer state (running/paused, mode, end time, active task, session count) is saved to DynamoDB immediately on every timer action (start, pause, reset, mode switch, task switch, session complete). |
| DAT-14 | On app load, timer state is loaded from DynamoDB and restored if a session is still active (end time in the future). Mode, active task, and session count are always restored from the remote state when it is newer. |
| DAT-15 | Timer state is polled from DynamoDB every 8 seconds. If the remote state has a newer `updatedAt`, the local timer is updated to match (≤10 second propagation delay across devices). |
| DAT-16 | Conflict resolution uses last-writer-wins: a timer action on the current device always takes precedence over a same-age or older remote state. The device's own writes are never re-applied as remote changes. |


### 8.4 Manual Sync


| ID     | Requirement                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| DAT-10 | A sync button in the navigation bar triggers an immediate manual sync (load from DynamoDB, merge, push merged state).             |
| DAT-11 | On mobile, pulling down from the top of the timer page (when already scrolled to top) triggers a manual sync ("pull to refresh"). |
| DAT-12 | While a sync is in progress, the sync button shows a spinner and is disabled.                                                     |


---

## 9. Sync Logging & Diagnostics


| ID    | Requirement                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LOG-1 | All DynamoDB load/save events are written to a sync log stored in localStorage (up to 200 entries).                                                                                              |
| LOG-2 | Each log entry contains: timestamp, event name, and detail string.                                                                                                                               |
| LOG-3 | The detail string for `stateChange` includes: total task count, today's task count, unsynced task count, and selected date.                                                                      |
| LOG-4 | The detail string for `loadFromDynamo` and `saveToDynamo` includes: task count, session count, and `updatedAt`.                                                                                  |
| LOG-5 | Merge events log: winner (remote/local), primary task count, secondary task count, number of tasks merged in.                                                                                    |
| LOG-6 | If 2 or more tasks disappear in a single state update, a `tasks:bulk-drop:warning` entry is logged with the before/after counts and the IDs of remaining tasks, and a `console.warn` is emitted. |
| LOG-7 | A Debug page (`/debug`) displays the sync log for troubleshooting.                                                                                                                               |


---

## 10. Navigation


| ID    | Requirement                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------- |
| NAV-1 | The app has four pages: **Timer** (`/`), **Reports** (`/reports`), **Settings** (`/settings`), **Debug** (`/debug`). |
| NAV-2 | The top navigation bar is always visible and shows the current active page with a highlight.                         |
| NAV-3 | Navigation uses hash-based routing (`#/`, `#/reports`, etc.) for GitHub Pages compatibility.                         |
| NAV-4 | The top navigation bar displays the build date (YYYY-MM-DD) as a small label, allowing users to verify they are running the latest deployed version.                                             |


---

## 11. Internationalisation


| ID     | Requirement                                                     |
| ------ | --------------------------------------------------------------- |
| I18N-1 | All UI strings are available in English and Japanese.           |
| I18N-2 | The selected language persists across sessions.                 |
| I18N-3 | Language can be changed in Settings without reloading the page. |


---

## 12. UI / UX Constraints


| ID   | Requirement                                                                                   |
| ---- | --------------------------------------------------------------------------------------------- |
| UX-1 | The app must be fully usable on mobile (touch) as a primary use case, as well as desktop.     |
| UX-2 | All actionable controls (buttons, icons) must always be visible — no hover-only interactions. |
| UX-3 | Tap target sizes must be at least ~40 px.                                                     |
| UX-4 | Tooltips must not be the sole affordance for any action.                                      |


