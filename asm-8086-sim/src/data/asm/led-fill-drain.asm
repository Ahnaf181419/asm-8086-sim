; Pattern: fill the bank one lamp at a time, then drain it
    MOV AL, 00000001B
    MOV DX, 2070H
FILL:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    SHL AL, 1
    OR AL, 00000001B     ; keep the lower lamps lit
    JNC FILL             ; CF=1 -> bank full, switch to draining
DRAIN:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY2:
    LOOP DELAY2
    SHR AL, 1
    JNZ DRAIN            ; bank empty when AL = 0
    MOV AL, 00000001B
    JMP FILL
