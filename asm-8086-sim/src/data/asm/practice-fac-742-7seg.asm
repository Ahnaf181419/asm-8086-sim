;================================================================
; Practice 9 (hardware): 7! - 4! + 2! = 5018 (139AH), on the 7-seg
; 2030H='5' 2031H='0' 2032H='1' 2033H='8'
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H, 07FH, 06FH
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 7
    CALL FACT            ; AX = 5040
    MOV BX, AX
    MOV CX, 4
    CALL FACT            ; AX = 24
    SUB BX, AX           ; 5016
    MOV CX, 2
    CALL FACT            ; AX = 2
    ADD AX, BX           ; AX = 5018

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
