/* Minimal linker script for RISC-V32 QEMU virt */
OUTPUT_ARCH(riscv)
ENTRY(_start)


MEMORY
{
RAM (wx) : ORIGIN = 0x80000000, LENGTH = 128M
}


SECTIONS
{
.text : ALIGN(4)
{
KEEP(*(.init))
KEEP(*(.text.boot))
*(.text .text.*)
} > RAM


.rodata : ALIGN(4)
{
*(.srodata .srodata.*)
*(.rodata .rodata.*)
} > RAM


.data : ALIGN(4)
{
*(.data .data.*)
*(.sdata .sdata.*)
} > RAM


.bss (NOLOAD) : ALIGN(4)
{
__bss_start = .;
*(.sbss .sbss.*)
*(.bss .bss.*)
*(COMMON)
__bss_end = .;
} > RAM


.stack (NOLOAD) : ALIGN(16)
{
. = ALIGN(16);
__stack_top = ORIGIN(RAM) + LENGTH(RAM);
} > RAM
}
