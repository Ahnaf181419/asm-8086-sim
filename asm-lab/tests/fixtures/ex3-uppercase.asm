;=================================================================================
;Uppercase to lowercase conversion
;Input a uppercase letter and display it's corresponding lowercase in the new line
;=================================================================================
.MODEL SMALL
.STACK 100H
.DATA                 
NEW_LINE DB 0AH, 0DH, '$'
.CODE
MAIN PROC
;DATA SEGMENT INITIALIZATION
MOV AX, @DATA
MOV DS, AX 

;USER INPUT
MOV AH, 1
INT 21H
MOV BL, AL

;DISPLAY A NEW LINE
;THIS IS ANOTHER WAY OF PRINTING A NEW LINE
;WE WILL STORE BOTH THE ASCII VALUE OF NEW LINE AND CARRIAGE RETURN AS STRING
;SO WE CAN JUST LOAD IT'S EFFECTIVE ADDRESS INTO DX

MOV AH, 9
LEA DX, NEW_LINE
INT 21H
                                                                             
;NOW THE CONVERSION
;"A" = 41H, "a" = 61H, DIFFERENCE = 20H
;WE WILL SIMPLY JUST ADD THE 20H TO OUR UPPERCASE INPUT
ADD BL, 20H

;DISPLAY OUTPUT
MOV AH, 2 
MOV DL, BL                                                                             
INT 21H
    
MAIN ENDP
;RETURN TO DOS
MOV AH, 4CH
INT 21H
END MAIN




