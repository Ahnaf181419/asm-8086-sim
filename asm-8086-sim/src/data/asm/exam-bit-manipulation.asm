.MODEL SMALL
.STACK 100H
.DATA
    RESULT DW 0
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV BH, 17H        ; sample value: 00010111b (bit 2 is 1)

    TEST BH, 04H
    JNZ BIT_IS_1

    ; Bit 2 is 0: complement and count 1s in lower nibble
    NOT BH
    MOV CX, 4
    XOR AL, AL
COUNT_ONES:
    TEST BH, 1
    JZ SKIP_INC
    INC AL
SKIP_INC:
    SHR BH, 1
    LOOP COUNT_ONES

    MOV DL, AL
    ADD DL, '0'
    MOV AH, 2
    INT 21H
    JMP DONE

BIT_IS_1:
    ; Bit 2 is 1: count 0s in upper nibble
    MOV BL, BH
    MOV CL, 4
    SHR BL, CL         ; 8086 requires CL for multi-bit shift

    MOV CX, 4
    XOR AL, AL
COUNT_ZEROS:
    TEST BL, 1
    JNZ SKIP_ZERO
    INC AL
SKIP_ZERO:
    SHR BL, 1
    LOOP COUNT_ZEROS

    ; AL has count of zeroes (3)
    MOV DH, AL         ; keep copy of count in DH

    ; multiply by 5 without MUL: 5*AL = (AL * 4) + AL
    MOV BL, AL
    SHL AL, 1
    SHL AL, 1          ; AL * 4
    ADD AL, BL         ; AL * 5
    MOV AH, 0
    MOV RESULT, AX

    ; display the count in console
    MOV DL, DH
    ADD DL, '0'
    MOV AH, 2
    INT 21H

DONE:
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN
