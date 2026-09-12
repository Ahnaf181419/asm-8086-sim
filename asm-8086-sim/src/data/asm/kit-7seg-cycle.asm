; Hardware Lab: 7-Segment Two Digits (7segmentusingkit3.asm)
; Alternates between digit 0 (11000000B inverted) and digit 1 (11111001B inverted)

L1:
    MOV AL, 11000000B
    NOT AL    ;goes to PORT A (which is dedicated to seven segment)
    MOV DX, 2030H
    OUT DX, AL

    MOV AL, 11111001B
    NOT AL    ;goes to PORT A (which is dedicated to seven segment)
    MOV DX, 2030H
    OUT DX, AL

    JMP L1
