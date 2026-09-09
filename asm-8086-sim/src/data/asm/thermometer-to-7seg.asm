;================================================================
; Thermometer byte -> one seven-segment digit (low nibble)
;================================================================
; The thermometer returns a byte (0..160) at port 2086H, where
; 0 maps to -40 deg-C and 160 maps to +120 deg-C. We look up the
; low nibble in a 0..F segment table and write it to digit 0 of
; the seven-segment block (port 2030H).
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H
           DB 07FH, 06FH, 077H, 07CH, 039H, 05EH, 079H, 071H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA SI, SEG_TABLE
LOOP_:
    MOV DX, 2086H         ; thermometer port
    IN AL, DX
    AND AL, 0FH           ; take low nibble -> 0..15

    ; index SEG_TABLE with AL (LEA + ADD walks the bytes one-by-one)
    MOV BX, SI
    ADD BL, AL
    MOV AL, [BX]          ; segment pattern

    MOV DX, 2030H         ; seven-segment digit 0
    OUT DX, AL

    JMP LOOP_

    HLT                   ; unreachable — infinite loop
MAIN ENDP
END MAIN
