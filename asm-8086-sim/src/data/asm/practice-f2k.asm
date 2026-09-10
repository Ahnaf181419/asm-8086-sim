;================================================================
; Practice 3: Temperature conversion, F -> K  (130 degrees F)
;   K = (F - 32) * 5 / 9 + 273 = 490/9 + 273 = 54 + 273 = 327
; Result: AX = 0147H. (Some handouts list 0547H — that is a typo;
; 490/9 is 54 remainder 4, so the integer result is 327 = 0147H.)
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '130F = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV AL, 130          ; Fahrenheit
    SUB AL, 32           ; 98
    MOV BL, 5
    MUL BL               ; AX = 98 * 5 = 490
    MOV BL, 9
    DIV BL               ; AL = 490 / 9 = 54   (AH = remainder 4)
    MOV AH, 0            ; AX = 54 (word, so we can add 273)
    ADD AX, 273          ; AX = 327 Kelvin = 0147H
    MOV BX, AX

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 327

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN
