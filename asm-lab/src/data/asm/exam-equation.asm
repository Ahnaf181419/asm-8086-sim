;=====================================================================
; Online Exam 1 — evaluate  B = 3A - B + 2C
;   A : read from the keyboard with INDEC
;   B : a variable, initialised to 3
;   C : a constant, 1
; Only MOV / ADD / SUB / INC / DEC / NEG are allowed — no MUL.
;   3A is A+A+A ;  2C is C+C
;=====================================================================
.MODEL SMALL
.STACK 100H

.DATA
    C       EQU 1                   ; assembly-time constant
    B       DW 3                    ; initialised to 3
    PROMPT  DB 'Enter A: $'
    ANSWER  DB 0DH,0AH,'B = $'

.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA DX, PROMPT                  ; ask for A
    MOV AH, 9
    INT 21H
    CALL INDEC                      ; AX = A

    MOV BX, AX                      ; BX = A
    ADD AX, BX                      ; AX = 2A
    ADD AX, BX                      ; AX = 3A

    SUB AX, B                       ; AX = 3A - B

    MOV CX, C                       ; CX = C
    ADD CX, CX                      ; CX = 2C
    ADD AX, CX                      ; AX = 3A - B + 2C

    MOV B, AX                       ; store the result back into B

    LEA DX, ANSWER
    MOV AH, 9
    INT 21H
    MOV AX, B
    CALL OUTDEC                     ; print it

    MOV AH, 4CH
    INT 21H
MAIN ENDP

INCLUDE INDEC.ASM
INCLUDE OUTDEC.ASM
END MAIN
