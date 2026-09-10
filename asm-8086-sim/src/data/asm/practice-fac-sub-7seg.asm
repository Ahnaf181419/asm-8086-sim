;================================================================
; Practice 6 (hardware): (4! + 3!) - 2! = 28, shown on the 7-seg block
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H, 07FH, 06FH
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 4
    CALL FACT            ; AX = 24
    MOV BX, AX
    MOV CX, 3
    CALL FACT            ; AX = 6
    ADD AX, BX           ; 30
    MOV BX, AX
    MOV CX, 2
    CALL FACT            ; AX = 2
    SUB BX, AX           ; BX = 28
    MOV AX, BX

    MOV BX, 10           ; digits onto the stack, ones first
    XOR CX, CX
DIVLP:
    XOR DX, DX
    DIV BX
    PUSH DX
    INC CX
    OR AX, AX
    JNE DIVLP

    MOV DX, 2030H        ; first pop = most significant = leftmost digit
OUTLP:
    POP BX               ; digit value 0..9
    MOV AL, SEG_TABLE[BX]
    OUT DX, AL
    INC DX
    LOOP OUTLP

    HLT
MAIN ENDP

FACT PROC
    MOV AX, 1
NEXT:
    MUL CX
    LOOP NEXT
    RET
FACT ENDP
END MAIN
