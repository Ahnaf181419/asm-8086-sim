export const DOT_MATRIX_ADDRESS = 0x2000
export const SEVEN_SEGMENT_ADDRESS = 0x2030
export const ASCII_LCD_ADDRESS = 0x2040
export const LED_ADDRESS = 0x2070
export const PUSH_BUTTONS_ADDRESS = 0x2080
export const KEYBOARD_ADDRESS = 0x2082
export const SWITCHES_ADDRESS = 0x2084
export const THERMOMETER_ADDRESS = 0x2086
export const PRESSURE_ADDRESS = 0x2088
export const ONE_BUTTON_ADDRESS = 0x20a0

export const MIN_IO_ADDRESS = 0x2000
export const MAX_IO_ADDRESS = 0x2fff
export const MAX_NUM_OF_PORTS = 0x1000 // 4096

// 8255A Programmable Peripheral Interface (MDA-8086 trainer / Laboratory 5)
export const PPI_PORT_A = 0x19 // 7-Segment display data (Port A)
export const PPI_PORT_B = 0x1b // LEDs / display control (Port B)
export const PPI_PORT_C = 0x1d // Strobe / handshaking (Port C)
export const PPI_CONTROL = 0x1f // Command / Mode control register
