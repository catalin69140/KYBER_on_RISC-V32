    .section    .text.crt0,"ax",@progbits
    // Define the executable code section (.text.crt0).

    .global _start
    // Make '_start' the global entry point.

    .type   _start, @function
    .align 2
    // Align the entry point.

_start:     // Program entry point. Must match the linker script ENTRY address.

    .cfi_startproc
    .cfi_undefined ra
    // Call Frame Information (CFI) for debugging.

    li      x5, 0x10000000        // x5 = Address of the 16550 UART Transmitter Holding Register (THR)

    la      x6, hello             // x6 = Address of the null-terminated string "hello"

// Check for and print the string
2:
    lb      x7, 0(x6)             // x7 = Load the current character (byte) from the string.
    beq     x0, x7, 2f            // If the character is NULL (x0=0), jump forward to the HALT section (label 2).

// Print character loop
1:
    sb      x7, 0(x5)             // Store (write) the character (x7) to the UART THR (x5).
    addi    x6, x6, 1             // Increment the string pointer to the next character.
    lb      x7, 0(x6)             // Load the next character into x7.
    bne     x0, x7, 1b            // If the new character is NOT NULL, jump back to print it (label 1).

// Halt section (label 2)
2:
    // Disable all machine-level interrupts.
    csrw    mie, x0               // Control Status Register Write: Clear the Machine Interrupt Enable (MIE) register.

    // Enter an infinite idle loop.
1:
    wfi                           // Wait For Interrupt (processor sleeps until an interrupt).
    j       1b                    // Unconditional jump back to wfi.

    .cfi_endproc


    .section .rodata              // Define the Read-Only Data section.
hello:
    .asciz  "Hello World!\n"      // The null-terminated string to be printed.
                                  // 48 65 6c 6c 6f 20 57 6f 72 6c 64 21 0a 00

    .end                          // End of the assembly file.
