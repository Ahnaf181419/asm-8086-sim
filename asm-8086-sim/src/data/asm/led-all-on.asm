; Pattern: all 8 lamps on, hold, then all off
    MOV AL, 11111111B
    MOV DX, 2070H
    OUT DX, AL

    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY

    MOV AL, 00000000B
    OUT DX, AL

    HLT
