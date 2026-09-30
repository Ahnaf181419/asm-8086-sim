; Assignment - dot-matrix system on the emulation kit (lesson 25)
;   display 2 (ports 2005H..2009H): digit N, blinking N times
;   then display 1 (ports 2000H..2004H): N rows lit in the LAST column,
;   rotating right -> left inside display 1, forever
; N is hardcoded - change the MOV BL line (valid 1..5)
.MODEL SMALL
.STACK 100H
.DATA
  DIGIT DB 00100111B,01000101B,01000101B,01000101B,00111001B   ; '5'

.CODE
MAIN PROC
    MOV AX, @DATA            ; point DS at the data segment
    MOV DS, AX               ; so DIGIT is addressable

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

; ---- phase 1: digit N on display 2, blinking N times -----------------
    XOR CX, CX
    MOV CL, BL               ; CL = N - read BL BEFORE BX is repurposed:
    LEA BX, DIGIT            ; BX -> the five glyph bytes (clobbers BL!)
BLINK:
    PUSH CX                  ; the hold loops use no CX, keep the counter safe
    MOV DX, 2005H            ; display 2 base port
    XOR SI, SI
SHOW_ON:
    MOV AL, [BX+SI]          ; glyph byte SI
    OUT DX, AL
    INC DX
    INC SI
    CMP SI, 5
    JB SHOW_ON               ; all five columns written - digit lit
    MOV DI, 0FFFFH           ; hold it lit
HOLD_ON:
    DEC DI
    JNZ HOLD_ON
    MOV DX, 2005H            ; blank display 2
    XOR SI, SI
    XOR AL, AL
SHOW_OFF:
    OUT DX, AL               ; write 0 to each column
    INC DX
    INC SI
    CMP SI, 5
    JB SHOW_OFF
    MOV DI, 0FFFFH           ; hold it dark - one full blink done
HOLD_OFF:
    DEC DI
    JNZ HOLD_OFF
    POP CX
    DEC CX
    JNZ BLINK                ; blink N times

; ---- phase 2: rotate the N-row column right -> left on display 1 -----
    MOV DX, 2004H            ; LAST column of display 1
SPIN:
    MOV AL, AH               ; the N-row pattern
    OUT DX, AL               ; light this column
    MOV DI, 0FFFFH           ; hold
HOLD_SPIN:
    DEC DI
    JNZ HOLD_SPIN
    XOR AL, AL
    OUT DX, AL               ; blank it
    DEC DX                   ; step one column right -> left
    CMP DX, 2000H
    JB WRAP                  ; fell below display 1 - wrap
    JMP SPIN
WRAP:
    MOV DX, 2004H            ; back to the last column
    JMP SPIN
MAIN ENDP
END MAIN
