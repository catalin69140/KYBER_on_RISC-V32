/* Minimal machine-mode start-up for RISC-V32 (QEMU virt) */
.section .text.boot
.globl _start
_start:
/* Set up stack */
la sp, __stack_top


/* Zero .bss */
la t0, __bss_start
la t1, __bss_end
beq t0, t1, 2f
1:
sw zero, 0(t0)
addi t0, t0, 4
blt t0, t1, 1b
2:
/* Set mtvec to a simple trap handler */
la t0, default_trap
csrw mtvec, t0


/* Jump to C runtime */
call main


halt:
wfi
j halt


/* Default trap handler: spin */
.align 2
.globl default_trap
default_trap:
j halt
