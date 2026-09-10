;================================================================
; Practice 8: average of ten numbers
;   15 42 7 93 28 55 61 34 88 19  -> sum 442, average 44
; Word array walked with SI (step 2), summed in AX, then one
; word DIV by 10 gives quotient (average) and remainder.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  NUMS DW 15, 42, 7, 93, 28, 55, 61, 34, 88, 19
  MSG1 DB 'SUM = $'
  MSG2 DB 13, 10, 'AVG = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 10           ; count of numbers
    XOR AX, AX           ; running sum
    LEA SI, NUMS
SUMLOOP:
    ADD AX, [SI]         ; add the word at NUMS[SI]
    ADD SI, 2            ; words are 2 bytes apart
    LOOP SUMLOOP
    MOV BX, AX           ; BX = 442

    XOR DX, DX           ; average = sum / 10
    MOV CX, 10
    DIV CX               ; AX = 44, DX = remainder 2
    MOV DI, AX           ; DI = average (OUTDEC does not touch DI)

    LEA DX, MSG1
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 442

    LEA DX, MSG2
    MOV AH, 9
    INT 21H
    MOV AX, DI
    CALL OUTDEC          ; prints 44

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN
