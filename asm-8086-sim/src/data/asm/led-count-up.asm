; Pattern: binary up-counter 00h -> FFh on the lamp bank
    MOV AL, 0
    MOV DX, 2070H
UP:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    INC AL
    JMP UP
