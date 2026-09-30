; Assignment - dot-matrix system on the MDA trainer kit (lesson 25)
;   the whole board is ONE 40-column matrix (ports 2000H..2027H):
;   light N rows in the LAST column (2027H), then rotate the lit column
;   right -> left across the whole matrix, wrapping forever
; N lives in BL - change the MOV BL line (valid 1..8; N=8 sets 11111111B
; but the 5x7 matrix shows only the low 7 rows)

    MOV BL, 5                ; N = 5  (the author edits this line)

; ---- build the column byte: N ones = 2^N - 1 -------------------------
    MOV AL, 1                ; start from 1 = 00000001B
    MOV CL, BL               ; shift counter = N
DOUBLE:
    SHL AL, 1                ; double AL  -> 2, 4, 8, 16, 32
    DEC CL
    JNZ DOUBLE               ; after N shifts AL = 2^N
    DEC AL                   ; 2^N - 1 = N ones. N=5 -> 00011111B
    MOV AH, AL               ; keep the pattern in AH

; ---- rotate: start at the last column, travel right -> left ----------
    MOV DX, 2027H            ; LAST column of the whole matrix
SPIN:
    MOV AL, AH
    OUT DX, AL               ; light this column
    MOV DI, 0FFFFH           ; hold
HOLD:
    DEC DI
    JNZ HOLD
    XOR AL, AL
    OUT DX, AL               ; blank it
    DEC DX                   ; step one column right -> left
    CMP DX, 2000H
    JB WRAP                  ; fell off the left edge - wrap
    JMP SPIN
WRAP:
    MOV DX, 2027H            ; back to the last column
    JMP SPIN
