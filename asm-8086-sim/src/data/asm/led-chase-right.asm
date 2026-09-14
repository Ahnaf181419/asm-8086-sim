; Pattern: chase right — one lamp runs LED7 -> LED0 and wraps
    MOV AL, 10000000B
    MOV DX, 2070H
STEP:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    ROR AL, 1            ; bit 0 rotates back into bit 7
    JMP STEP
