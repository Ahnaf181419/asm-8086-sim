;================================================================
; Practice 1 (hardware): 37 C -> F, result shown on the ASCII LCD
;   F = 37*9/5 + 32 = 98  ->  LCD shows "37C->98"
; WRITE_STR writes CX chars from [SI] at the LCD cursor;
; WRITE_NUM writes AX as decimal at the LCD cursor.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG     DB '37C->'
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA SI, MSG          ; write the "37C->" prefix
    MOV CX, 5
    CALL WRITE_STR

    MOV AL, 37           ; F = 37*9/5 + 32
    MOV BL, 9
    MUL BL               ; AX = 333
    MOV BL, 5
    DIV BL               ; AL = 66
    ADD AL, 32           ; AL = 98
    MOV AH, 0
    CALL WRITE_NUM       ; LCD now reads "37C->98"

    HLT
MAIN ENDP

; WRITE_STR: writes CX bytes from [SI] at the LCD cursor
WRITE_STR PROC
WS_NEXT:
    MOV DX, LCD_POS
    MOV AL, [SI]
    OUT DX, AL
    INC LCD_POS
    INC SI
    LOOP WS_NEXT
    RET
WRITE_STR ENDP

; WRITE_NUM: writes AX as decimal at the LCD cursor
WRITE_NUM PROC
    MOV BX, 10
    XOR CX, CX
WN_DIV:
    XOR DX, DX
    DIV BX               ; AX = quotient, DX = digit
    PUSH DX              ; stack holds the digits backwards
    INC CX
    OR AX, AX
    JNE WN_DIV
WN_OUT:
    POP DX               ; most significant digit pops first
    MOV AL, DL
    OR AL, 30H           ; ASCII digit
    MOV DX, LCD_POS
    OUT DX, AL
    INC LCD_POS
    LOOP WN_OUT
    RET
WRITE_NUM ENDP
END MAIN
