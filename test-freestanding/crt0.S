    .section    .text.crt0,"ax",@progbits

    .global _start
    .type   _start, @function
    .align  2

_start:
    .cfi_startproc
    .cfi_undefined ra

    li      x5, 0x10000000        // UART THR base
    la      x6, hello             // ptr to "Hello World!\n"

    // print loop
1:
    lb      x7, 0(x6)             // load byte
    beq     x7, x0, 2f            // if 0 -> done
    sb      x7, 0(x5)             // write to UART
    addi    x6, x6, 1             // next char
    j       1b

    // halt: plain busy-loop (no CSR, no WFI)
2:
halt:
    j       halt

    .cfi_endproc

    .section .rodata
hello:
    .asciz  "Hello World!\n"

    .end
