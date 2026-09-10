;================================================================
; Practice 4: Temperature conversion, K -> F  (300 degrees K)
;   F = 9 * (K - 273) / 5 + 32 = 9*27/5 + 32 = 48 + 32 = 80
; 300 does not fit in a byte, so this one uses 16-bit MUL/DIV.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '300K = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV AX, 300          ; Kelvin (word: 300 > 255)
    SUB AX, 273          ; 27
    MOV BX, 9
    MUL BX               ; DX:AX = 27 * 9 = 243
    MOV BX, 5
    XOR DX, DX           ; word DIV divides DX:AX — clear the high half
    DIV BX               ; AX = 243 / 5 = 48   (DX = remainder 3)
    ADD AX, 32           ; AX = 80 Fahrenheit = 0050H
    MOV BX, AX

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 80

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN
