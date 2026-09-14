; Pattern: alternate lamps swap — 10101010b <-> 01010101b
    MOV AL, 10101010B
    MOV DX, 2070H
SWAP:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    NOT AL
    JMP SWAP
