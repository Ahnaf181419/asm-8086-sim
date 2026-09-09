;================================================================
; ASCII LCD: write three lines of text to the 3 x 16 LCD
;================================================================
; LCD layout: 48 bytes starting at port 2040H, row-major:
;   row 0  -> ports 2040H .. 204FH  (16 chars)
;   row 1  -> ports 2050H .. 205FH  (16 chars)
;   row 2  -> ports 2060H .. 206FH  (16 chars)
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  ROW0 DB 'HELLO WORLD!    '   ; padded to 16 chars
  ROW1 DB 'FROM MDA-8086   '
  ROW2 DB 'EMU KIT 8086    '
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    ; row 0 at 2040H
    MOV CX, 16
    LEA SI, ROW0
    MOV DX, 2040H
R0:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP R0

    ; row 1 at 2050H
    MOV CX, 16
    LEA SI, ROW1
    MOV DX, 2050H
R1:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP R1

    ; row 2 at 2060H
    MOV CX, 16
    LEA SI, ROW2
    MOV DX, 2060H
R2:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP R2

    HLT
MAIN ENDP
END MAIN
