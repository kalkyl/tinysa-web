# tinySA Web Control

A browser-based control and visualization app for the tinySA Basic spectrum analyzer, using WebSerial. Aimed at EMC pre-compliance testing: live streaming sweeps, peak hold, averaging, noise-floor subtraction, calibration offset, reference/limit lines (presets + custom), draggable markers with a harmonic finder, sweep presets, and saving/loading measurements with notes and overlays.

## Features

- **Streaming sweeps** — start/stop live sweeps with start/stop frequency, point count, RBW (manual or auto), and spur reduction (on by default — shifts the IF to reduce spurious mixer products/images in the display, at a minor sweep-time cost, same currency as RBW). Stopping keeps the last frame on screen (a "pause", not a clear).
- **Input settings** — RF front-end port mode (Low, ≤350 MHz direct sampling, the device default; or High, ≥240 MHz harmonic mixing) and the input attenuator (0–31 dB, defaulting to manual 0 dB). Applied to the device when streaming starts, and re-applied live if changed mid-stream. While streaming, the actually-resolved attenuation is read back from the device once a second and shown next to the control. Note: on tinySA Basic, "Auto" is **not** an adaptive AGC — it's a fixed firmware preset (30 dB in Low input mode, 0 dB in High), which is why it's not the default here; it can noticeably raise the noise floor in Low mode. (tinySA Basic has no software-controllable LNA — that command only exists on Ultra firmware.)
- **Sweep presets** — built-in EMC-band presets (full range, radiated low/mid/high band, conducted emissions) plus custom presets you can save/delete, stored locally.
- **Peak hold** — running max per bin, toggled from the plot legend, with its own reset; auto-resets (with a notice) if the point count changes.
- **Averaging** — rolling-window average of the live curve, with a configurable sweep count and its own reset.
- **Noise floor subtraction** — capture an ambient/no-signal baseline and subtract it from the live trace, or check "Subtract" on a saved measurement in the Measurements list to compare against an earlier run instead (subtracts its live curve from your live trace, and its peak-hold curve from your peak-hold trace, together — so both stay on one consistent scale). Only enabled for measurements with a matching sweep range/point count. The active baseline persists across reloads.
- **Calibration offset** — a single dB offset (antenna factor + cable loss) applied centrally before peak hold, plot, or save.
- **Markers** — two draggable markers (click-and-drag on the plot; right-click one to hide it, keeping its frequency for next time) with a Δfreq/ΔdB readout beside them, plus a harmonic-frequency finder (expanded by default).
- **Horizontal helper lines** — click the Y-axis label area to drop a dashed threshold line at that level (with an inline label). Drag an existing one to reposition it (cursor turns to a resize handle, with a hover tooltip); right-click it to delete. Persists across reloads; hidden while noise-floor subtraction is active (an absolute level has no meaning against a relative dB delta).
- **Reference/limit lines** — built-in FCC Part 15 and CISPR 32 Class A/B templates (see disclaimer below) plus a custom breakpoint editor.
- **Cursor readout & crosshair** — hovering the plot shows a faint full crosshair and a frequency+amplitude readout in the bottom-right corner; hovering just the Y-axis or X-axis label margin shows only that axis's hair and value (amplitude-only or frequency-only, respectively).
- **X/Y axis controls** — linear or log frequency axis, dBm or dBµV amplitude axis, manual or auto Y-axis range.
- **Measurement storage** — save the live and/or peak-hold curve with a name and note (IndexedDB), including the sweep config and averaging state at the time (shown in the list); overlay any saved curve back onto the live plot, or subtract it as a noise-floor baseline; export/import as JSON or export a single measurement as CSV.
- **Waterfall** — an optional sweep-history chart directly below the main plot (toggled from the "Waterfall" checkbox in the Display fieldset), showing the live trace over a rolling time window (adjustable in seconds) as a color-mapped heatmap, newest at the top. Its frequency axis is pixel-aligned to the main plot's (same margins, same linear/log scale), so a signal lines up in both, and it has its own hover readout (frequency, time-ago, amplitude). "Sensitivity" (the color scale's dB range) is independent of the main plot's Y-axis and can be auto-fit or set manually, so it can be zoomed to whatever level range is of interest. Off by default; toggling it off only pauses buffering — the history is kept and picks back up on re-enabling, rather than being cleared (use "Clear" for that explicitly). Noise-floor subtraction is re-applied across the whole buffer live, same as the live trace, so toggling that doesn't lose history either. When enabled, it's included in **Export PNG** — composited directly below the FFT plot in the exported image, not just on screen.

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
