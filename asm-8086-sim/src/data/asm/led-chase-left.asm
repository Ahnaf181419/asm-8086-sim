; Pattern: chase left — one lamp runs LED0 -> LED7 and wraps
    MOV AL, 00000001B
    MOV DX, 2070H
STEP:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    ROL AL, 1            ; bit 7 rotates back into bit 0
    JMP STEP
