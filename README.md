# simple-apps

A small collection of hand-built, offline-ready web apps, served from one GitHub
Pages site. The root page is a launcher; each app lives in its own folder and is
installed to the home screen separately.

Live site: `https://dunklastarn.github.io/simple-apps/`

## Apps

| App | Folder | Notes |
| --- | --- | --- |
| Interval Timer | `interval-timer/` | Custom work/rest intervals. Runs accurately with the screen off. |
| Core Trainer | `core-trainer/` | Guided core workouts with animated figures. Runs with the screen off. |
| Water Sort | `water-sort/` | Color-sorting puzzle. Progress export/import via the ⋯ menu. |

## Installing

Open an app (e.g. `.../simple-apps/interval-timer/`) and use **Add to Home Screen**.
Each app is its own installable PWA with its own icon.

## Updates — no reinstalling

Every app uses a service worker (`sw.js`) with a **stale-while-revalidate** strategy
and a shared `update.js`:

- The app loads instantly from cache and quietly checks for a newer version in the
  background.
- When a new version has downloaded, the app shows a small **Refresh** button. It
  never reloads on its own, so it can't interrupt a running timer.
- Tapping Refresh swaps in the new version in place. No reinstalling.

To ship an update: edit the files, **bump the `CACHE` version string** near the top of
that app's `sw.js` (e.g. `interval-timer-v4` → `-v5`), and push to `main`. Bumping the
cache name is what makes installed apps notice the update.

## Background-reliable timers

`interval-timer` and `core-trainer` share `bgtimer.js`, a small engine that keeps
timers accurate when the phone is locked or the app is backgrounded:

- All state derives from the wall clock, so the current phase is recomputed exactly
  whenever the page wakes — no drift.
- Every beep for the whole remaining workout is pre-scheduled on the Web Audio
  timeline, so cues fire from the audio thread even while the main thread is frozen.
- `navigator.audioSession = 'playback'` (iOS 16.4+) keeps audio alive when locked and
  ignores the mute switch; a silent looping source keeps the audio context awake.

The timing core in `bgtimer.js` is pure and has no DOM dependencies, so it is unit-
testable with a fake clock.
