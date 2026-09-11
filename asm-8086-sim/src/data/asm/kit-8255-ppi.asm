; Hardware Lab 5: 8255A PPI Trainer Configuration (LED.asm)
; Uses 8255 PPI ports 19H (Port A), 1BH (Port B), 1DH (Port C), 1FH (Control)
PPIC_C EQU 1FH
PPIC   EQU 1DH
PPIB   EQU 1BH
PPIA   EQU 19H

.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
    MOV AL, 10000000B
    OUT PPIC_C, AL     ; 8255 Mode 0: All ports configured as output
    MOV AL, 11111111B
    OUT PPIA, AL       ; Port A inactive (active-low display)
    MOV AL, 00000000B
    OUT PPIC, AL       ; Port C clear

L1:
    MOV AL, 00000011B
    OUT PPIB, AL       ; Turn on low 2 LEDs on Port B
    JMP L1

    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN
