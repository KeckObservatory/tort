# TORT: Keck ToO Request Tool

A single-page app where PIs with Target of Opportunity (ToO) time create, edit, submit, cancel and
delete ToO requests, and check whether a request could interrupt the programs scheduled that night.

It is built with React, TypeScript and Vite. The UI uses MUI and dates use dayjs. The app has no
backend of its own. Every request goes through the Keck web services (`/userinfo/` and `/api/*`),
using the observer's login cookie.

## Running

```bash
npm install
npm run tdev     # Vite dev server on http://localhost:5173
npm run build    # type-check and production build into dist/
npm run lint
make install     # rsync dist/ to the release directory (see below)
```

All API URLs are relative (`/userinfo/`, `/api/...`), so the app has to be served from the same
host as those services. The Vite dev server has no proxy set up yet, so API calls from `tdev`
return 404 until one is added in `vite.config.ts`.

`make install` copies `dist/` to the release directory:

- **Sandbox:** in a `sandbox` checkout, files go to the path with `build` removed.
- **Official build:** files go to `/www/observers/tort/<version>`, and the `rel` symlink is
  repointed to that version.

`make show` prints the resolved paths.

## Layout

The app has three parts:

- **Top bar:** shows the logged-in observer's name, and has a button that goes back to the Observer
  Portal (`KECK_OBS_PORTAL` in `src/config.tsx`).
- **ToO form** (left): the form for creating and managing requests.
- **Schedule panel** (right): the schedule for the selected night and instrument readiness.

The ToO form and the schedule panel share one observing date. Changing it in either picker updates
both. The semester is worked out from that date: February to July is `A`, and August to January is
`B` (so January 2027 is in 2026B).

Nothing is shown until `/userinfo/` returns the logged-in observer. Until then the page displays a
loading skeleton.

### ToO form ([src/too_form.tsx](src/too_form.tsx))

1. **Program ID:** lists the observer's ToO programs for the semester (`too/getToo`). Selecting one
   shows its remaining institution and partner hours and the institutions it can interrupt.
2. **Select ToO:** loads one of the observer's existing requests (`too/getTooRequests`) into the
   form for viewing or editing. **Clear Form** resets the form.
3. **Request fields:**
   - target name
   - interrupt type (`partner` or `institution`)
   - instrument (from the program's instrument list)
   - interrupted program (from the schedule for that night)
   - flexibility (±0–4 h)
   - observer location (Remote or HQ)
   - notes
   - start time (UT)

   The duration defaults to `1:00:00` (`BASE_TOO` in `src/config.tsx`).
4. **Actions:**

   | Button | What it does | When it is enabled |
   |--------|--------------|--------------------|
   | Create ToO / Edit ToO Draft / Edit ToO | Saves the request (`too/submitTooRequest`) as `draft`, or as `edit` if it has already been submitted. | When instrument, date, start time, duration, interrupted program and interrupt type are all set. |
   | Submit ToO | Submits the saved request (`action: 'submit'`). | Once the request has an ID. |
   | Cancel ToO | Cancels the request (`too/submitTooCancel`). | Once the request has an ID. |
   | Delete ToO | Deletes the request (`too/deleteTooRequest`). | Once the request has an ID. |
   | Validate ToO Request | Opens the interrupt dialog. | Once the request has an ID. |

   The **Request Status** field shows the request's current state (`draft`, `submitted`,
   `scheduled`, `cancelled`, …).

### Interrupt dialog ([src/too_interrupt_dialog.tsx](src/too_interrupt_dialog.tsx))

The dialog calls `too/getTooCanInterrupt` with the request's semester and program, instrument, date,
start time and duration. If the request can interrupt anything, it lists each program it could
interrupt, with the date and times and whether the interrupt is by institution or partner (with the
reasons). It also marks programs where the interrupt would be an instrument switch.

### Schedule panel ([src/schedule_panel.tsx](src/schedule_panel.tsx))

For the selected night, the panel shows:

- **Schedule images:** the schedule for Keck I and Keck II (`schedule/getScheduleImage`).
- **Instrument ToO Readiness:** a table of instruments marked ToO-ready, with their telescope
  (`too/getInstrumentsTooStatus`). Ready instruments are listed first.

The panel also fetches the night's schedule as data (`schedule/getSchedule`). The ToO form uses it
to fill the "Interrupted Program" list.

## Source

| File | Purpose |
|------|---------|
| [src/api/api_root.tsx](src/api/api_root.tsx) | All API calls and their request/response types (`UserInfo`, `Too`, `TooItem`, `ScheduleItem`, …). Calls throw `ApiError` (HTTP status and parsed error body) when a response isn't OK. |
| [src/App.tsx](src/App.tsx) | Fetches userinfo, holds the shared date, semester and schedule, and lays out the page. |
| [src/config.tsx](src/config.tsx) | The Observer Portal link and the defaults for a new ToO request. |
| [src/theme.tsx](src/theme.tsx) | MUI theme (light and dark). |
| [src/top_bar.tsx](src/top_bar.tsx) | App bar. |

Add new endpoints as functions in `api_root.tsx`. Components shouldn't call `fetch` directly.

### Endpoints

| Function | Method | Endpoint |
|----------|--------|----------|
| `get_userinfo` | GET | `/userinfo/` |
| `get_schedule` | GET | `/api/schedule/getSchedule?date&telnr` |
| `get_schedule_image` | GET | `/api/schedule/getScheduleImage?date&telnr` |
| `get_instruments_too_status` | GET | `/api/too/getInstrumentsTooStatus?date` |
| `get_too_items` | GET | `/api/too/getToo?semester&obsid` |
| `get_too_requests` | GET | `/api/too/getTooRequests?semester&obsid` |
| `submit_too_request` | POST | `/api/too/submitTooRequest` |
| `delete_too_request` | DELETE | `/api/too/deleteTooRequest?tooid` |
| `submit_too_cancel` | POST | `/api/too/submitTooCancel` |
| `get_too_can_interrupt` | GET | `/api/too/getTooCanInterrupt?semid&obsid&instr&date&duration&starttime` |

## Known issues

- The `dev` script in `package.json` and the package name (`keke`) are left over from the project
  this app was copied from.
