; Hardware Lab: Alternating LED Pattern (ledKIT.asm)
; Outputs 10101010B to port 2070H in an infinite loop

L1:
    MOV AL, 10101010B
    MOV DX, 2070H
    OUT DX, AL

    JMP L1
