;================================================================
; LED <-> Switch echo: copy switch positions to the LEDs
;================================================================
; Switches are read once per loop iteration from port 2084H (8
; bits, one per slide switch). The same byte is written to the
; LED port 2070H so each LED mirrors its slide switch.
; Runs forever — stop with the simulator HALT button.
;================================================================
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
ECHO:
    MOV DX, 2084H        ; switches
    IN AL, DX
    MOV DX, 2070H        ; LEDs
    OUT DX, AL
    JMP ECHO

    HLT                  ; unreachable — infinite loop
MAIN ENDP
END MAIN
