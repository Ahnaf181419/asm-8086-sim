; Hardware Lab: 7-Segment Active-Low Digit 0 (7segmentusingKIT.asm)
; Outputs 11000000B (NOT AL -> 00111111B = '0') to Port 2030H

L1:
    MOV AL, 11000000B
    NOT AL    ;goes to PORT A (which is dedicated to seven segment)
    MOV DX, 2030H
    OUT DX, AL

    JMP L1
