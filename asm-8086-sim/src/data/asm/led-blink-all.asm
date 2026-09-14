; Pattern: blink all lamps — XOR flips every bit at once
    MOV AL, 11111111B
    MOV DX, 2070H
BLINK:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    XOR AL, 11111111B
    JMP BLINK
