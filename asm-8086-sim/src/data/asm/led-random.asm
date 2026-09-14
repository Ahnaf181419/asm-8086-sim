; Pattern: pseudo-random lamps — 8-bit Galois LFSR
; Shift right; when the bit falling out is 1, XOR the tap mask.
    MOV AL, 00000001B    ; any non-zero seed (0 would stick)
    MOV DX, 2070H
RAND:
    OUT DX, AL
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    SHR AL, 1            ; CF = the bit that fell out
    JNC RAND
    XOR AL, 10111000B    ; taps: x^8+x^6+x^5+x^4+1 -> 255-step cycle
    JMP RAND
