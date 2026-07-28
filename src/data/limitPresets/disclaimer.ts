export const LIMIT_PRESET_DISCLAIMER =
  'Illustrative template — verify against the official standard text before relying on it for a real compliance decision.'

export function distanceDisclaimer(meters: number): string {
  return `Radiated emissions, measured at ${meters}m. Field-strength (dBµV/m) — use calibration offset + dBµV Y-axis to compare meaningfully. ${LIMIT_PRESET_DISCLAIMER}`
}

export function conductedDisclaimer(): string {
  return `Conducted emissions on AC mains via a LISN, 150kHz–30MHz, quasi-peak. Already in dBµV — no antenna-factor calibration offset needed (just cable loss, if any). ${LIMIT_PRESET_DISCLAIMER}`
}
