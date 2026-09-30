;================================================================
; Assignment: Dot-Matrix ID × Name Scroll — "1A5F"
;================================================================
; Sequence: the last two ID digits (1, 5) interleaved with the
; last two name letters (A, F): 1 A 5 F. It first appears on the
; RIGHT-most four displays ("shown"), then scrolls right→left
; until the whole sequence reaches the leftmost position,
; reverses, scrolls left→right back, and bounces forever.
;
; Window math: the board is 40 columns (8 displays × 5 columns),
; the sequence occupies 20 of them. Column i shows SEQ[i − BP]
; when that source index lands inside 0..19; every other column
; is blank (00H). BP is the shift: 20 = parked right, 0 = parked
; left.
;================================================================
.MODEL SMALL
.STACK 100H
.DATA
  SEQ DB 00000000B,01000010B,01111111B,01000000B,00000000B          ; '1'
      DB 01111110B,00001001B,00001001B,00001001B,01111110B          ; 'A'
      DB 00100111B,01000101B,01000101B,01000101B,00111001B          ; '5'
      DB 01111111B,00001001B,00001001B,00001001B,00000001B          ; 'F'
  SEQLEN EQU 20
  BOARD  EQU 40
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA BX, SEQ            ; BX -> font table
    MOV BP, 20             ; shift: sequence parked on the right
    MOV AH, 0FFH           ; direction -1 -> scrolling right-to-left

FRAME:
    MOV DX, 2000H          ; dot-matrix base port
    XOR SI, SI             ; SI = board column 0..39
NEXT_COL:
    XOR AL, AL             ; blank unless the window covers this column
    MOV DI, SI
    SUB DI, BP             ; DI = source index inside SEQ
    CMP DI, 0
    JB  BLANK              ; column is left of the window
    CMP DI, SEQLEN
    JAE BLANK              ; column is right of the window
    MOV AL, [BX+DI]
BLANK:
    OUT DX, AL
    INC DX
    INC SI
    CMP SI, BOARD
    JB  NEXT_COL

    MOV CX, 0FFFFH         ; hold this frame
DELAY:
    LOOP DELAY

    CMP AH, 0FFH           ; which way are we going?
    JNE GOING_RIGHT
    DEC BP                 ; moving left
    CMP BP, 0
    JNE FRAME
    MOV AH, 01H            ; reached the leftmost position - reverse
    JMP FRAME
GOING_RIGHT:
    INC BP                 ; moving right
    CMP BP, 20
    JNE FRAME
    MOV AH, 0FFH           ; reached the rightmost position - reverse
    JMP FRAME
MAIN ENDP
END MAIN
