;================================================================
; Practice 7: (1! * 2!) * 6! = (1 * 2) * 720 = 1440
; MUL BX multiplies AX by BX, so stash one operand in BX before
; each call and multiply afterwards.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '(1! * 2!) * 6! = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 1
    CALL FACT            ; AX = 1! = 1
    MOV BX, AX
    MOV CX, 2
    CALL FACT            ; AX = 2! = 2
    MUL BX               ; AX = 1! * 2! = 2
    MOV BX, AX           ; BX = 2

    MOV CX, 6
    CALL FACT            ; AX = 6! = 720
    MUL BX               ; AX = 2 * 720 = 1440 = 05A0H
    MOV BX, AX

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 1440

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
