;================================================================
; Practice 3 (hardware): 130 F -> K, result shown on the ASCII LCD
;   K = (130-32)*5/9 + 273 = 327 (0147H) -> LCD shows "130F->327"
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG     DB '130F->'
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA SI, MSG
    MOV CX, 6
    CALL WRITE_STR

    MOV AL, 130          ; K = (F-32)*5/9 + 273
    SUB AL, 32           ; 98
    MOV BL, 5
    MUL BL               ; AX = 490
    MOV BL, 9
    DIV BL               ; AL = 54
    MOV AH, 0
    ADD AX, 273          ; AX = 327 = 0147H
    CALL WRITE_NUM       ; LCD now reads "130F->327"

    HLT
MAIN ENDP

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

WRITE_NUM PROC
    MOV BX, 10
    XOR CX, CX
WN_DIV:
    XOR DX, DX
    DIV BX
    PUSH DX
    INC CX
    OR AX, AX
    JNE WN_DIV
WN_OUT:
    POP DX
    MOV AL, DL
    OR AL, 30H
    MOV DX, LCD_POS
    OUT DX, AL
    INC LCD_POS
    LOOP WN_OUT
    RET
WRITE_NUM ENDP
END MAIN
