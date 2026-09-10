;================================================================
; Practice 1: Temperature conversion, C -> F  (37 degrees C)
;   F = C * 9 / 5 + 32 = 37*9/5 + 32 = 98
; Integer division truncates: 333/5 = 66 remainder 3 -> 98 (not 98.6)
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '37C = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV AL, 37           ; Celsius
    MOV BL, 9
    MUL BL               ; AX = 37 * 9 = 333
    MOV BL, 5
    DIV BL               ; AL = 333 / 5 = 66   (AH = remainder 3)
    ADD AL, 32           ; AL = 98 Fahrenheit
    MOV AH, 0            ; result as a word for OUTDEC
    MOV BX, AX           ; keep it: INT 21H clobbers AH

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 98

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN
