; Hardware Lab: 7-Segment Active-Low Digit 0 (7segmentusingKIT.asm)
; Outputs 11000000B (NOT AL -> 00111111B = '0') to Port 2030H
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
L1:
    MOV AL, 11000000B
    NOT AL
    MOV DX, 2030H
    OUT DX, AL
    JMP L1
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN
