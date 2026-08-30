.MODEL SMALL
.STACK 100H
.DATA  
NEW_LINE DB 0AH, 0DH, '$' 
I DB 0  
J DB 0
.CODE
MAIN PROC
;DATA SEGMENT INITIALIZATION    
MOV AX,@DATA
MOV DS, AX    

;Let's try to implement a nested loop
;Suppose we want to print the following pattern:
;***
;**
;*

;C++ code implementation:
;for(int i = 3; i > 0; i--){
;   for(int j = 0; j < i; j++){
;       cout << "*";
;   }
;   cout << endl;
;}                     

;We need to write two labels to implement two loops
;Let's implement the I loop with LOOP insturction
;and J loop manually

;First, we need to initialize the value of I with 3
;Here, as we will use LOOP instruction for the I_LOOP
;We will initialize CX with 3
MOV CX, 3; I = 3                                                

;AFTER INITIALIZING, WE NEED TO CHECK THE CONDITION TO ENTER THE LOOP
;Our I loop will stop when CX = 0, LOOP will handle it automatically 
;It will check the value of CX, if CX!= 0, it will jump to I_LOOP
;Initially, CX = 3, So 3!= 0         

I_LOOP:
;For every value of i, j starts from 0
MOV J, 0
;Now let's check the condition for running the loop in J_LOOP label 
J_LOOP:
CMP J, CL   
;CURRENTLY 3 CAN BE EASILY STORED IN LOWER 8 BITS, CH = 0
;SO WE CAN JUST COMPARE J WITH LOWER 8 BITS
;IF WE NEEDED TO INITIALIZE THE COUNTER THAT NEEDED 16 BITS TO BE REPRESENTED,
;THEN J NEEDED TO BE A WORD VARIABLE

JE BREAK_J_LOOP ;IF J = I, BREAK THE J LOOP, ELSE EXECUTE THE STATEMENTS INSIDE J LOOP
MOV AH, 2
MOV DL, '*'
INT 21H    

;INC COUNTER
INC J
JMP J_LOOP; JUMP TO J_LOOP

;NOW THAT WE ARE OUT OF THE J LOOP, 
;WE NEED TO PRINT A NEW LINE
BREAK_J_LOOP:
MOV AH, 9
LEA DX, NEW_LINE
INT 21H

;LOOP WILL AUTOMATICALLY DECREMENT CX AND CHECK THE VALUE OF CX
;IF CX!=0, IT WILL JUMP TO I_LOOP
LOOP I_LOOP



END_:
MOV AH, 4CH
INT 21H 
MAIN ENDP

END MAIN  





;SELF-STUDY: TRY TO IMPLEMENT BOTH I AND J LOOP MANUALLY