# tinySA Web Control

A browser-based control and visualization app for the tinySA Basic spectrum analyzer, using WebSerial. Aimed at EMC pre-compliance testing: live streaming sweeps, peak hold, averaging, noise-floor subtraction, calibration offset, reference/limit lines (presets + custom), draggable markers with a harmonic finder, sweep presets, and saving/loading measurements with notes and overlays.

## Features

- **Streaming sweeps** — start/stop live sweeps with start/stop frequency, point count, and RBW (manual or auto). Stopping keeps the last frame on screen (a "pause", not a clear).
- **Sweep presets** — built-in EMC-band presets (full range, radiated low/mid/high band, conducted emissions) plus custom presets you can save/delete, stored locally.
- **Peak hold** — running max per bin, toggled from the plot legend, with its own reset; auto-resets (with a notice) if the point count changes.
- **Averaging** — rolling-window average of the live curve, with a configurable sweep count and its own reset.
- **Noise floor subtraction** — capture an ambient/no-signal baseline and subtract it from the live trace, or check "Subtract" on a saved measurement in the Measurements list to compare against an earlier run instead (subtracts its live curve from your live trace, and its peak-hold curve from your peak-hold trace, together — so both stay on one consistent scale). Only enabled for measurements with a matching sweep range/point count. The active baseline persists across reloads.
- **Calibration offset** — a single dB offset (antenna factor + cable loss) applied centrally before peak hold, plot, or save.
- **Markers** — two draggable markers (click-and-drag on the plot, or type a frequency) with a Δfreq/ΔdB readout, plus a harmonic-frequency finder.
- **Reference/limit lines** — built-in FCC Part 15 and CISPR 32 Class A/B templates (see disclaimer below) plus a custom breakpoint editor.
- **Cursor readout** — hovering over the plot shows the frequency/amplitude under the pointer in the bottom-right corner.
- **X/Y axis controls** — linear or log frequency axis, dBm or dBµV amplitude axis, manual or auto Y-axis range.
- **Measurement storage** — save the live and/or peak-hold curve with a name and note (IndexedDB), including the sweep config and averaging state at the time (shown in the list); overlay any saved curve back onto the live plot, or subtract it as a noise-floor baseline; export/import as JSON or export a single measurement as CSV.

## Requirements

- **Chromium-based browser** (Chrome, Edge, or Opera) — this app uses the [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API), which Firefox and Safari do not implement.
- **A secure context** — `https://` or `localhost`. Web Serial refuses to work anywhere else (including plain `file://`).
- A tinySA **Basic** connected over USB. (tinySA Ultra is detected but not yet supported — see below.)

## Getting started

```bash
npm install
npm run dev
```

Open the printed `localhost` URL in Chrome/Edge/Opera.

## Connecting a real device

1. Plug in the tinySA over USB.
2. Click **"Connect tinySA…"** and pick the device's serial port from the browser's native picker.
3. If the device isn't shown or the connection fails, check that nothing else (another app, a terminal program) is holding the serial port open.

tinySA Ultra will be detected and rejected with a clear message rather than silently mis-measuring — only tinySA Basic is fully supported right now.

## Notes on the reference/limit line presets

The built-in FCC/CISPR presets are **illustrative templates** — their numeric breakpoints were checked against independent published sources, but they are not a substitute for the current official standard text; verify against the real spec before relying on them for an actual compliance decision. They're expressed in dBµV/m (a radiated-emission field-strength convention); to compare them meaningfully against this app's dBm readings, set the **calibration offset** (antenna factor + cable loss) and switch the Y-axis unit to dBµV.

## Development

```bash
npm run build   # type-check (vue-tsc) + production build
npm test        # unit tests (protocol framing, parsing, peak hold, storage, etc.)
```

Most of the logic here (serial framing/parsing, timeouts, model detection, peak hold, averaging, interpolation, IndexedDB storage, export/import) is covered by unit tests that run against a `MockTransport` — no hardware needed. What can't be tested outside a real browser+device: the native serial port permission picker, real sweep timing, and mid-stream USB disconnects.
