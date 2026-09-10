;================================================================
; Practice 6: (4! + 3!) - 2! = (24 + 6) - 2 = 28
; Same FACT procedure; note which register holds the running
; total after each step — BX keeps the grand result.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '(4! + 3!) - 2! = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 4
    CALL FACT            ; AX = 4! = 24
    MOV BX, AX
    MOV CX, 3
    CALL FACT            ; AX = 3! = 6
    ADD AX, BX           ; AX = 30
    MOV BX, AX           ; BX = 4! + 3!

    MOV CX, 2
    CALL FACT            ; AX = 2! = 2
    SUB BX, AX           ; BX = 30 - 2 = 28
    MOV AX, BX

    PUSH AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    POP AX
    CALL OUTDEC          ; prints 28

    MOV AH, 4CH
    INT 21H
MAIN ENDP

FACT PROC
    MOV AX, 1
NEXT:
    MUL CX
    LOOP NEXT
    RET
FACT ENDP

INCLUDE OUTDEC.ASM
END MAIN
