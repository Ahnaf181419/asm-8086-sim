; Hardware Lab: Alternating LED Pattern (ledKIT.asm)
; Outputs 10101010B to port 2070H in an infinite loop
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
L1:
    MOV AL, 10101010B
    MOV DX, 2070H
    OUT DX, AL
    JMP L1
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN
