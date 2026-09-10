;================================================================
; Practice 4 (hardware): 300 K -> F, result shown on the ASCII LCD
;   F = 9*(300-273)/5 + 32 = 80  ->  LCD shows "300K->80"
; 300 needs word arithmetic (MUL/DIV on AX).
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG     DB '300K->'
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA SI, MSG
    MOV CX, 6
    CALL WRITE_STR

    MOV AX, 300          ; F = 9*(K-273)/5 + 32
    SUB AX, 273          ; 27
    MOV BX, 9
    MUL BX               ; DX:AX = 243
    MOV BX, 5
    XOR DX, DX
    DIV BX               ; AX = 48
    ADD AX, 32           ; AX = 80
    CALL WRITE_NUM       ; LCD now reads "300K->80"

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
