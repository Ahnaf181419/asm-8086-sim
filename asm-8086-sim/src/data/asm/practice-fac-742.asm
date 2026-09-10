;================================================================
; Practice 9: 7! - 4! + 2! = 5040 - 24 + 2 = 5018  (139AH)
; Left-to-right evaluation with BX as the accumulator.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '7! - 4! + 2! = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 7
    CALL FACT            ; AX = 7! = 5040
    MOV BX, AX           ; BX = 5040

    MOV CX, 4
    CALL FACT            ; AX = 4! = 24
    SUB BX, AX           ; BX = 5016

    MOV CX, 2
    CALL FACT            ; AX = 2! = 2
    ADD AX, BX           ; AX = 5018 = 139AH

    PUSH AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    POP AX
    CALL OUTDEC          ; prints 5018

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
