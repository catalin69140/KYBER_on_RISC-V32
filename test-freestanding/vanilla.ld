/* Copied from the Script for -z combreloc and heavily hacked up by jrw */
/* Copyright (C) 2014-2020 Free Software Foundation, Inc.
   Copying and distribution of this script, with or without modification,
   are permitted in any medium without royalty provided the copyright
   notice and this notice are preserved.  */

/* Minimal RISC-V32 linker script for QEMU virt RAM at 0x8000_0000 */

OUTPUT_FORMAT("elf32-littleriscv", "elf32-littleriscv", "elf32-littleriscv")
OUTPUT_ARCH(riscv)
ENTRY(_start)

MEMORY
{
  /* qemu-system-riscv32 virt machine */
  RAM (rwx) : ORIGIN = 0x80000000, LENGTH = 128M
}

SECTIONS
{
  /* Start at RAM base */
  . = ORIGIN(RAM);

  PROVIDE(__ram_origin__ = ORIGIN(RAM));
  PROVIDE(__ram_end__    = ORIGIN(RAM) + LENGTH(RAM));

  /* Code */
  .text : ALIGN(4)
  {
    __text_start = .;
    KEEP(*(.text.crt0))         /* ensure crt0/_start first */
    *(.text .text.*)
    __text_end = .;
  } > RAM

  /* Read-only data */
  .rodata : ALIGN(16)
  {
    __rodata_start = .;
    *(.rodata .rodata.*)
    *(.srodata .srodata.*)
    __rodata_end = .;
  } > RAM

  /* Initialized data */
  .data : ALIGN(4096)
  {
    __data_start = .;
    *(.data .data.*)
    *(.sdata .sdata.*)
    __data_end = .;
  } > RAM

  /* Place gp around small data (RISC-V convention) */
  __global_pointer$ = (__data_start + 0x800);

  /* C++ init/fini arrays (kept if present) */
  .preinit_array :
  {
    PROVIDE_HIDDEN(__preinit_array_start = .);
    KEEP(*(.preinit_array))
    PROVIDE_HIDDEN(__preinit_array_end = .);
  } > RAM

  .init_array :
  {
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT_BY_INIT_PRIORITY(.init_array.*) SORT_BY_INIT_PRIORITY(.ctors.*)))
    KEEP(*(.init_array EXCLUDE_FILE (*crtbegin.o *crtbegin?.o *crtend.o *crtend?.o) .ctors))
    PROVIDE_HIDDEN(__init_array_end = .);
  } > RAM

  .fini_array :
  {
    PROVIDE_HIDDEN(__fini_array_start = .);
    KEEP(*(SORT_BY_INIT_PRIORITY(.fini_array.*) SORT_BY_INIT_PRIORITY(.dtors.*)))
    KEEP(*(.fini_array EXCLUDE_FILE (*crtbegin.o *crtbegin?.o *crtend.o *crtend?.o) .dtors))
    PROVIDE_HIDDEN(__fini_array_end = .);
  } > RAM

  /* BSS */
  .bss (NOLOAD) : ALIGN(256)
  {
    __bss_start__ = .;
    *(.sbss .sbss.*)
    *(.bss .bss.*)
    *(COMMON)
    __bss_end__ = .;
  } > RAM

  /* End marker */
  _end = .;
}
