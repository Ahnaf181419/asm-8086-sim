;================================================================
; Keyboard -> ASCII LCD   (correct kit protocol)
;================================================================
; The kit keyboard (ports 2082H - 2083H) works like this:
;   IN  AL, DX (DX=2083H) -> buffer-full flag in bit 0
;   IN  AL, DX (DX=2082H) -> key VALUE = the key INDEX 0..23
;                            (NOT ASCII! 0-9 = 0..9, A-F = 10..15,
;                             A1-A8 = 16..23)
;   OUT DX, AL (DX=2083H, AL=0) -> acknowledge: clear the flag
; This program waits for a key, translates its index into a
; printable ASCII character and appends it to the LCD at 2040H+,
; wrapping back to the start after the 48th character.
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
    JZ WAIT              ; no key yet -> keep polling

    MOV DX, 2082H        ; key index 0..23
    IN AL, DX

    CMP AL, 10
    JB DIGIT             ;  0..9  -> '0'..'9' (30H..39H)
    CMP AL, 16
    JB LETTER            ; 10..15 -> 'A'..'F' (41H..46H)
    SUB AL, 16           ; 16..23 -> '1'..'8' (A1..A8 keys)
    ADD AL, 31H
    JMP SHOW
LETTER:
    SUB AL, 10
    ADD AL, 41H
    JMP SHOW
DIGIT:
    ADD AL, 30H
SHOW:
    MOV BX, LCD_POS      ; write the character to the LCD cell
    MOV DX, BX
    OUT DX, AL

    INC LCD_POS          ; advance cursor, wrap at LCD end (2070H)
    MOV AX, LCD_POS
    CMP AX, 2070H
    JL NO_WRAP
    MOV LCD_POS, 2040H
NO_WRAP:

    MOV DX, 2083H        ; acknowledge the key: clear the flag
    MOV AL, 0
    OUT DX, AL

    JMP WAIT             ; infinite loop
MAIN ENDP
END MAIN
