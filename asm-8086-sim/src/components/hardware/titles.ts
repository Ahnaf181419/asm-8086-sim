// Exact window captions from the original kit's C++ source
// (SetWindowText in each *Dlg.cpp) — kept verbatim, including the
// upstream "Guage" misspelling, for authenticity.
export const HW_TITLES = {
  'dot-matrix': 'Dot Matrix Display Output (2000h ... 2027h)',
  'seven-segment': 'Seven Segment Display Output (2030h ... 2037h)',
  'ascii-lcd': 'ASCII LCD Display Output (2040h ... 206Fh)',
  leds: 'LEDs Output (2070h)',
  switches: 'Switches Input (2084h)',
  'push-buttons': 'Push Buttons Input (2080h)',
  keyboard: 'Keyboard Input (2082h)',
  thermometer: 'Thermometer (2086h)',
  pressure: 'Pressure Guage (2088h)',
} as const

export type HwPanelName = keyof typeof HW_TITLES
