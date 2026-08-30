.MODEL SMALL
.STACK 100H

.DATA

.CODE
MAIN PROC

    MOV AX, @DATA
    MOV DS, AX

    
    ; a
    
    MOV AX, 8000H           
    NEG AX

    
    ; b

    MOV AX, 7FFFH
    MOV BX, 0001H
    ADD AX, BX

    ; c

    MOV AX, 0FFFFH
    INC AX

    MOV AH, 4CH
    INT 21H

MAIN ENDP
END MAIN
