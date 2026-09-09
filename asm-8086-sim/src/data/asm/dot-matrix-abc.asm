;================================================================
; Dot Matrix: render "ASM-8086" across 8 displays
;================================================================
; Each display = 5 columns x 7 rows. Each byte holds 7 rows for
; ONE column. The 40-byte pattern table below encodes the eight
; characters left-to-right; we walk it once and OUT each byte to
; the corresponding port starting at 2000H.
;   bit 0 = top row, bit 6 = bottom row
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  ; display 0 'A', display 1 'S', display 2 'M', display 3 '-',
  ; display 4 '8', display 5 '0', display 6 '8', display 7 '6'
  PATTERNS DB 0EH,11H,11H,1FH,11H, 1EH,10H,10H,0EH,01H, 11H,15H,15H,11H,11H, 00H,00H,1FH,00H,00H, 0EH,11H,11H,0EH,11H, 0EH,13H,15H,19H,11H, 0EH,11H,11H,0EH,11H, 0EH,11H,10H,1EH,11H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 40           ; 8 displays x 5 columns
    LEA SI, PATTERNS
    MOV DX, 2000H        ; base port for dot-matrix
WRITE_LOOP:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP WRITE_LOOP

    HLT
MAIN ENDP
END MAIN
