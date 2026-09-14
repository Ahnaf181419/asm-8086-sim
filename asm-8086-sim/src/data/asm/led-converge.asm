; Pattern: converging loader — the lit ends march inward
    MOV AL, 10000001B
    MOV DX, 2070H
STEP:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    MOV AH, AL
    MOV BL, AL
    SHL AH, 1            ; left end moves right
    SHR BL, 1            ; right end moves left
    OR AL, AH
    OR AL, BL
    CMP AL, 11111111B
    JNE STEP
    MOV AL, 10000001B    ; reset and converge again
    JMP STEP
