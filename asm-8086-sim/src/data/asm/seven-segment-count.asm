;================================================================
; Seven-Segment: cycle digits 0..7 across 8 displays
;================================================================
; Each of the 8 seven-segment digits lights up showing its own
; index. SEG_TABLE is the standard 0..F segment encoding:
;   a=01 b=02 c=04 d=08 e=10 f=20 g=40   (bit 7 = decimal dot)
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H  ; 0..7
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 8
    LEA SI, SEG_TABLE
    MOV DX, 2030H        ; base port for seven-segment block
WRITE_LOOP:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP WRITE_LOOP

    HLT
MAIN ENDP
END MAIN
