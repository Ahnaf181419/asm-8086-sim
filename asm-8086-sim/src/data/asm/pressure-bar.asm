;================================================================
; Pressure bar: 0..200% byte -> 0..7 lit LEDs
;================================================================
; Pressure returns a byte at port 2088H scaled as percent x 2
; (i.e. 0..200). Halve it to percent (0..100), then divide by 13
; to map the result to a bar level of 0..7. Convert that level
; into a bit pattern (1 << level) - 1 and write to the LED port.
;================================================================
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
LOOP_:
    MOV DX, 2088H         ; pressure port
    IN AL, DX             ; 0..200

    MOV AH, 0
    SHR AX, 1             ; 0..100 (percent)
    MOV CL, 13
    DIV CL                ; AL = level 0..7, AH = remainder

    MOV CL, AL
    MOV AL, 01H
    SHL AL, CL            ; AL = 1 << level
    DEC AL                ; pattern = (1<<level) - 1

    MOV DX, 2070H         ; LED port
    OUT DX, AL

    JMP LOOP_

    HLT                   ; unreachable — infinite loop
MAIN ENDP
END MAIN
