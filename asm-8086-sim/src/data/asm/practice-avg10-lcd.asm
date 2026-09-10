;================================================================
; Practice 8 (hardware): sum & average of ten numbers on the LCD
;   15 42 7 93 28 55 61 34 88 19 -> sum 442, average 44
;   LCD shows "S=442 A=44"
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  NUMS    DW 15, 42, 7, 93, 28, 55, 61, 34, 88, 19
  MSG1    DB 'S='
  MSG2    DB ' A='
  SUMV    DW ?
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 10           ; sum the array first
    XOR AX, AX
    LEA SI, NUMS
SUMLOOP:
    ADD AX, [SI]
    ADD SI, 2
    LOOP SUMLOOP
    MOV SUMV, AX         ; 442

    XOR DX, DX           ; average
    MOV BX, 10
    DIV BX               ; AX = 44
    MOV DI, AX           ; keep it: WRITE_NUM clobbers AX/BX/CX/DX

    LEA SI, MSG1         ; "S="
    MOV CX, 2
    CALL WRITE_STR
    MOV AX, SUMV
    CALL WRITE_NUM       ; 442

    LEA SI, MSG2         ; " A="
    MOV CX, 3
    CALL WRITE_STR
    MOV AX, DI
    CALL WRITE_NUM       ; 44

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
