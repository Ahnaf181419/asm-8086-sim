;=====================================================================
; Online Exam 3 — greatest common divisor, Euclidean algorithm
;   read X and Y, then repeat  X, Y := Y, X mod Y  until Y = 0
;   IDIV needs the dividend sign-extended into DX:AX, so CWD first.
;=====================================================================
.MODEL SMALL
.STACK 100H

.DATA
    PROMPT_X DB 'Enter X: $'
    PROMPT_Y DB 0DH,0AH,'Enter Y: $'
    ANSWER   DB 0DH,0AH,'GCD = $'
    X        DW ?
    Y        DW ?

.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA DX, PROMPT_X
    MOV AH, 9
    INT 21H
    CALL INDEC
    MOV X, AX

    LEA DX, PROMPT_Y
    MOV AH, 9
    INT 21H
    CALL INDEC
    MOV Y, AX

GCD_LOOP:
    CMP Y, 0                        ; Y = 0 → X holds the answer
    JE DONE
    MOV AX, X
    CWD                             ; sign-extend AX into DX:AX
    IDIV Y                          ; AX = quotient, DX = remainder
    MOV AX, Y                       ; X := Y
    MOV X, AX
    MOV Y, DX                       ; Y := remainder
    JMP GCD_LOOP

DONE:
    LEA DX, ANSWER
    MOV AH, 9
    INT 21H
    MOV AX, X
    CALL OUTDEC

    MOV AH, 4CH
    INT 21H
MAIN ENDP

INCLUDE INDEC.ASM
INCLUDE OUTDEC.ASM
END MAIN
