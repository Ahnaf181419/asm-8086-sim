;================================================================
; Practice 7 (hardware): (1! * 2!) * 6! = 1440, on the 7-seg block
; Four digits: 2030H='1' 2031H='4' 2032H='4' 2033H='0'
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H, 07FH, 06FH
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 1
    CALL FACT            ; AX = 1
    MOV BX, AX
    MOV CX, 2
    CALL FACT            ; AX = 2
    MUL BX               ; 1!*2! = 2
    MOV BX, AX
    MOV CX, 6
    CALL FACT            ; AX = 720
    MUL BX               ; AX = 1440 = 05A0H

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
