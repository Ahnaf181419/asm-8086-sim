; Pattern: binary down-counter FFh -> 00h on the lamp bank
    MOV AL, 11111111B
    MOV DX, 2070H
DOWN:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    DEC AL
    JMP DOWN
