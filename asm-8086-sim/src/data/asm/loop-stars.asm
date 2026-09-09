.MODEL SMALL
.STACK 100H
.DATA  
NEW_LINE DB 0AH, 0DH, '$'
.CODE
MAIN PROC
;DATA SEGMENT INITIALIZATION    
MOV AX,@DATA
MOV DS, AX    
 
;I am showing you a related C++ code so that you can relate
;and understand the concept better. 
 
;Suppose, we want to print stars 5 times
;How would we execute a for loop in C++?     

;for(int i = 0; i < 5; i++){
;   cout << "*";
;}                   

;Here, the conditions is checked everytime   
;As long as the condition is true, the loop continues
;When the conditions becomes false, the loop stops
 
 
;In 8086 assembly, we do not have any for, while keywords 
;So, we usually implement loop in two ways:
;1. Using "LOOP" instruction
;2. Manually using CMP and JMP instruction

;So, what is the idea for implementing a loop here?
;We will basically jump to the same label repeatedly 
;and check if conditions for continuing the loop are met or not.


;First, let's use the LOOP Keyword
;LOOP always uses CX as counter
;It works in a decremental way   
                   
;for(int i = 5; i > 0; i--){
;   cout << "*";
;}               

;To print the stars 5 times, we need to initialize the value of CX with 5
MOV CX, 5

;Now, let's write a label 
;This label will be called repeatedly by the LOOP instruction

;When creating a loop, at first we need to initialize the counter.
;Already did it with MOV CX, 5   
 
;=================================== 
;LOOP does two things automatically:
;===================================
;1. Decrements CX by 1 (So we do not need to do it manually)
;2. Checks the value of CX
;if CX != 0, it jumps back to the label
;if CX = 0, it stops the loop and goes to the next statement


PRINT_STAR:
MOV AH, 2
MOV DL, '*'
INT 21H
LOOP PRINT_STAR 
;When loop instruction is found, it first decrments the value of CX
;Checks the value of CX
;if CX != 0, it will jump to PRINT_STAR
;if CX = 0, the loop stops

;It would be better if you can run this code using single step
;to better understand the execution flow

;NEW LINE
MOV AH, 9
LEA DX, NEW_LINE
INT 21H


;Now,suppose instead of CX = 0, 
;you want to break the loop when CX = 2
;but you want to use the LOOP insturction to do it
;What can you do?                                 

;For a C code, it will be like this:
;for(int i = 5; i > 0; i--){
;   if(i == 2){
;       break;
;   }
;   cout << "*";
;}
 
;So, we need to use CMP to implement the if condition
;Let's modify the above loop to fit this condition
MOV CX, 5                             

PRINT_PLUS:   
CMP CX, 2
JE BREAK  ;IF CX == 2, BREAK THE LOOP, ELSE PRINT
MOV AH, 2
MOV DL, '+'
INT 21H
LOOP PRINT_PLUS;THIS LOOP WILL RUN 3 TIMES, SO 3 PLUSES WILL BE PRINTED 


BREAK:
MOV AH, 4CH
INT 21H   
MAIN ENDP
END MAIN 

;------------------NOTE-----------------------
;Suppose, you do not want to use the whole CX
;You want to use only CL as your number can be easily represented in 8 bits
;In this case, please make sure you are clearing the value of CH first
;As LOOP Instruction will check the full 16bit value of CX
;If you initialize CH as 0, and then move 5 to CL
;CX = 05, so it will run the loop 5 times
;-----------------------------------------------

;In our 2nd example, we will try to implement a loop with JMP and CMp instructions