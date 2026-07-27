export const LIMIT_PRESET_DISCLAIMER =
  'Illustrative template, not verified against the official standard text. Field-strength (dBµV/m) — use calibration offset + dBµV Y-axis to compare meaningfully.'

export function distanceDisclaimer(meters: number): string {
  return `Radiated emissions, measured at ${meters}m. ${LIMIT_PRESET_DISCLAIMER}`
}
