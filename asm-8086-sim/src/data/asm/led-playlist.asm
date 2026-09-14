;================================================================
; Pattern: playlist — a table-driven pattern sequence
;================================================================
; The DB table holds the whole show; the loop just walks it
; with SI and repeats forever. Tables need a data segment,
; so this one uses the full MASM form.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SHOW DB 10000001B, 11000011B, 01100110B
       DB 11100111B, 00011000B, 11111111B
  LEN EQU 6
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV DX, 2070H        ; LED port
FOREVER:
    LEA SI, SHOW
    MOV CX, LEN
NEXT:
    MOV AL, [SI]
    OUT DX, AL
    PUSH CX              ; delay clobbers CX — save the counter
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    POP CX
    INC SI
    LOOP NEXT
    JMP FOREVER
MAIN ENDP
END MAIN
