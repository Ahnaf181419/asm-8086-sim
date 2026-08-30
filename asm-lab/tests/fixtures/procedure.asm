.MODEL SMALL
.STACK 100H
.DATA
    MSG1     DB 'CALLING PRINT_STAR...$'
    MSG2     DB 'BACK IN MAIN!$'
    NEW_LINE DB 0DH, 0AH, '$'

.CODE

MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    ;=========================================
    ; PRINT MESSAGE BEFORE CALL
    ;=========================================
    LEA DX, MSG1
    MOV AH, 9
    INT 21H
    LEA DX, NEW_LINE
    MOV AH, 9
    INT 21H

    ;=========================================
    ; CALL PROCEDURE ONCE
    ; SP DECREMENTS, RETURN ADDRESS SAVED
    ; JUMPS TO PRINT_STAR
    ;=========================================
    CALL PRINT_STAR

    ;=========================================
    ; RET BRINGS US BACK HERE
    ;=========================================
    LEA DX, NEW_LINE
    MOV AH, 9
    INT 21H
    LEA DX, MSG2
    MOV AH, 9
    INT 21H

    MOV AH, 4CH
    INT 21H
MAIN ENDP

;=============================================
; PROCEDURE: PRINT_STAR
; PRINTS ONE ROW OF 5 STARS
; INPUT  : NONE
; OUTPUT : *****
;=============================================
PRINT_STAR PROC
    PUSH CX                ; SAVE CX
    PUSH AX                ; SAVE AX
    PUSH DX                ; SAVE DX

    MOV CX, 5

STAR_LOOP:
    MOV AH, 2
    MOV DL, '*'
    INT 21H
    LOOP STAR_LOOP

    LEA DX, NEW_LINE
    MOV AH, 9
    INT 21H

    POP DX                 ; RESTORE DX
    POP AX                 ; RESTORE AX
    POP CX                 ; RESTORE CX

    RET
PRINT_STAR ENDP

END MAIN