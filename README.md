# Social Media Calendar Planner

## Purpose and workflow

For a social-media planner who needs an editable monthly schedule. Choose a month, posting frequency, preferred weekdays, platforms, formats, and campaign context; generate a schedule; then review, search, filter, edit, add, or delete posts. Switch between list and calendar views and export the filtered, current schedule as CSV.

## Rules and output validation

- Frequency is 1–7 posts per week. Dates are unique, chronological, and inside the selected month, including leap-year February and partial first/last weeks.
- Edited dates remain within the active month and cannot duplicate another post date. Supported statuses are Draft, Scheduled, Published, and Needs Review.
- AI schedules must contain the expected dates and selected platforms/formats; invalid responses use a labelled deterministic local schedule.
- CSV values are quoted and escaped; spreadsheet-formula prefixes are neutralized.
- “Scheduled” is a planning status only. The app does not publish to social networks.
- Schedules are saved in this browser's localStorage and restored after reload. Resetting the form clears the saved schedule; browser storage is not encrypted or synchronized, so avoid confidential campaign data.

## Technology and run

HTML, shared CSS, browser JavaScript modules, and Node.js; no third-party packages or build step.

```powershell
node server.mjs
```

Run from this project directory; the standalone server uses port 4172 by default. Local mode needs no key. Optional AI mode and server safeguards are documented in the suite [README](../README.md).

## Tests

Run `node --test test/application-logic.test.mjs test/server.test.mjs` from the suite directory. Business-logic tests cover leap years, month boundaries, weekly frequency, unique dates, edits, filters, status summaries, and CSV safety. Server tests use a mock provider; no live model call was made.

## Limitations and deployment

Schedules persist in the current browser only; there is no account, cloud backup, collaboration, or publishing integration. AI mode requires a Node-capable host; static hosting can serve local processing. See [suite QA results](../QA_CHECKLIST.md).
