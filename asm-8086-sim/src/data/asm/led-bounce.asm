;================================================================
; LEDs: true ping-pong bounce (Knight Rider, both directions)
;================================================================
; One lit lamp runs up the bank, turns round at LED 7, runs back
; down, turns round at LED 0, forever.
;
; The other chase patterns need nothing but the pattern byte: ROL
; wraps on its own, and SHL+JC restarts on its own. A BOUNCE is the
; first pattern that needs STATE the lamps do not carry -- which
; way am I currently going? BL holds it:
;
;   BL = 0  ->  moving left  (LED 0 towards LED 7, SHL)
;   BL = 1  ->  moving right (LED 7 towards LED 0, SHR)
;
; At each end we flip BL and step the other way in the same frame,
; so the end lamp is not shown twice in a row.
;================================================================
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
    MOV AL, 00000001B    ; start at LED 0
    MOV BL, 0            ; ...moving left
    MOV DX, 2070H        ; LED port

STEP:
    OUT DX, AL
    MOV CX, 0FFFFH       ; software delay -- without it you see a blur
DELAY:
    LOOP DELAY

    CMP BL, 0
    JNE GOING_RIGHT

GOING_LEFT:
    CMP AL, 10000000B    ; already at the top lamp?
    JE  TURN_RIGHT
    SHL AL, 1
    JMP STEP
TURN_RIGHT:
    MOV BL, 1            ; remember the new direction
    SHR AL, 1
    JMP STEP

GOING_RIGHT:
    CMP AL, 00000001B    ; already at the bottom lamp?
    JE  TURN_LEFT
    SHR AL, 1
    JMP STEP
TURN_LEFT:
    MOV BL, 0
    SHL AL, 1
    JMP STEP
MAIN ENDP
END MAIN
