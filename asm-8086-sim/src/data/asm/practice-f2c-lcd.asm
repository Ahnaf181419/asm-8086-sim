;================================================================
; Practice 2 (hardware): 110 F -> C, result shown on the ASCII LCD
;   C = (110-32)*5/9 = 43  ->  LCD shows "110F->43"
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG     DB '110F->'
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA SI, MSG
    MOV CX, 6
    CALL WRITE_STR

    MOV AL, 110          ; C = (F-32)*5/9
    SUB AL, 32           ; 78
    MOV BL, 5
    MUL BL               ; AX = 390
    MOV BL, 9
    DIV BL               ; AL = 43
    MOV AH, 0
    CALL WRITE_NUM       ; LCD now reads "110F->43"

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
