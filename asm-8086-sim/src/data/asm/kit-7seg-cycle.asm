; Hardware Lab: 7-Segment Two Digits (7segmentusingkit3.asm)
; Alternates between digit 0 (11000000B inverted) and digit 1 (11111001B inverted)
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
L1:
    MOV AL, 11000000B
    NOT AL
    MOV DX, 2030H
    OUT DX, AL

    MOV AL, 11111001B
    NOT AL
    MOV DX, 2030H
    OUT DX, AL

    JMP L1
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN
