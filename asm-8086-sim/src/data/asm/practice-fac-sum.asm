;================================================================
; Practice 5: 3! + 4! = 6 + 24 = 30
; FACT computes n! in AX from a count in CX. MUL with a word
; register writes DX:AX — for n <= 7 the high half stays 0.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '3! + 4! = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 3
    CALL FACT            ; AX = 3! = 6
    MOV BX, AX           ; save it
    MOV CX, 4
    CALL FACT            ; AX = 4! = 24
    ADD AX, BX           ; AX = 30
    MOV BX, AX

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 30

    MOV AH, 4CH
    INT 21H
MAIN ENDP

; FACT: input CX = n (n <= 7 fits a word), output AX = n!
FACT PROC
    MOV AX, 1
NEXT:
    MUL CX               ; AX = AX * CX
    LOOP NEXT            ; counts CX down to 0
    RET
FACT ENDP

INCLUDE OUTDEC.ASM
END MAIN
