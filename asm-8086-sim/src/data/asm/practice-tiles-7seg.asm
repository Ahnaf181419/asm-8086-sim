;================================================================
; Practice 10 (hardware): floor 80x80, tiles 4x4 -> 400 (190H)
;   tiles per side = 80/4 = 20; total = 20*20 = 400
; Shown on the 7-seg block: 2030H='4' 2031H='0' 2032H='0'
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H, 07FH, 06FH
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV AX, 80
    MOV BX, 4
    XOR DX, DX
    DIV BX               ; AX = 20 tiles per side
    MUL AX               ; DX:AX = 400

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
END MAIN
