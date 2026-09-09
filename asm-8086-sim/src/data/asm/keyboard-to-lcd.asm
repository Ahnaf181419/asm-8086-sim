;================================================================
; Keyboard -> ASCII LCD
;================================================================
; Polling protocol for the keyboard (ports 2082H - 2083H):
;   read 2083H  -> buffer-full flag in bit 0 (1 = key waiting)
;   read 2082H  -> ASCII code of the waiting key
;   write 0 to 2082H -> clear the buffer (acknowledge the key)
; Each key press is written sequentially to the LCD at 2040H+.
; When we reach the end of the 48-byte LCD, wrap back to 0.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
WAIT:
    MOV DX, 2083H        ; buffer-full flag
    IN AL, DX
    TEST AL, 01H
    JZ WAIT              ; loop until a key arrives

    MOV DX, 2082H        ; read the key code
    IN AL, DX

    ; write the char to LCD at the saved cursor position
    MOV BX, LCD_POS
    MOV DX, BX
    OUT DX, AL

    ; advance cursor, wrapping at end of LCD
    INC LCD_POS
    MOV AX, LCD_POS
    CMP AX, 2070H
    JL NO_WRAP
    MOV LCD_POS, 2040H
NO_WRAP:

    ; acknowledge by writing 0 to the keyboard buffer port
    MOV DX, 2082H
    MOV AL, 0
    OUT DX, AL

    JMP WAIT

    HLT                  ; unreachable — infinite loop
MAIN ENDP
END MAIN
