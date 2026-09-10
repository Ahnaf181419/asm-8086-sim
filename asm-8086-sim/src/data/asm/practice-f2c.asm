;================================================================
; Practice 2: Temperature conversion, F -> C  (110 degrees F)
;   C = (F - 32) * 5 / 9 = (110-32)*5/9 = 390/9 = 43
; Subtract BEFORE multiplying so the intermediate stays unsigned.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '110F = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV AL, 110          ; Fahrenheit
    SUB AL, 32           ; 110 - 32 = 78
    MOV BL, 5
    MUL BL               ; AX = 78 * 5 = 390
    MOV BL, 9
    DIV BL               ; AL = 390 / 9 = 43   (AH = remainder 3)
    MOV AH, 0
    MOV BX, AX

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 43

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN
