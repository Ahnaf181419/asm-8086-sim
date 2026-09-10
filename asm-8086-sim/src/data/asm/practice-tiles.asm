;================================================================
; Practice 10: floor 80x80, tiles 4x4 — how many tiles?
;   tiles per side = 80 / 4 = 20; total = 20 * 20 = 400 (190H)
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB 'TILES = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV AX, 80           ; floor side
    MOV BX, 4            ; tile side
    XOR DX, DX
    DIV BX               ; AX = 20 tiles per side
    MUL AX               ; DX:AX = 20 * 20 = 400
    MOV BX, AX

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 400

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN
