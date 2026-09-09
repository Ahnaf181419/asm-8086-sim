;================================================================
; Knight Rider: sweep a single lit LED across the 8-LED bank
;================================================================
; BL holds the current pattern (1 << position). Each step we
; OUT to the LED port at 2070H, hold for a delay, then shift.
; (1 << 0) = 0x01, (1 << 1) = 0x02, ..., (1 << 7) = 0x80.
;================================================================
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
    MOV BL, 01H          ; start with LED 0 lit
SWEEP:
    MOV DX, 2070H        ; LED port
    MOV AL, BL
    OUT DX, AL

    MOV CX, 0FFFFH       ; software delay loop
DELAY:
    LOOP DELAY

    ; rotate BL left; when it has shifted past bit 7, reset to 1
    SHL BL, 1
    JNC SWEEP            ; CF=0 means we are still inside bit 0..7
    MOV BL, 01H          ; wrap back to LED 0
    JMP SWEEP

    HLT                  ; unreachable — infinite sweep
MAIN ENDP
END MAIN
