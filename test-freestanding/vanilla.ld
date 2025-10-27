/* Copied from the Script for -z combreloc and heavily hacked up by jrw */
/* Copyright (C) 2014-2020 Free Software Foundation, Inc.
   Copying and distribution of this script, with or without modification,
   are permitted in any medium without royalty provided the copyright
   notice and this notice are preserved.  */

OUTPUT_FORMAT("elf32-littleriscv", "elf32-littleriscv", "elf32-littleriscv")
// Specifies the format of the output file: 32-bit ELF, little-endian RISC-V.

OUTPUT_ARCH(riscv)
// Specifies the target architecture is RISC-V.

MEMORY
{
    /* qemu-system-risc32 virt machine */
    RAM (rwx)  : ORIGIN = 0x80000000, LENGTH = 128M
    // Defines a single memory region named RAM.
    // (rwx) grants read, write, and execute permissions.
    // ORIGIN: The starting physical address (common for RISC-V/QEMU bare-metal).
    // LENGTH: The size of the memory region (128 Megabytes).
}

ENTRY(_start) /* this will cause an error if the symbol _start is not present */
// Specifies the initial entry point of the program. The linker will look for the symbol '_start'.

SECTIONS
{
	. = ORIGIN(RAM);
	// Set the current location counter ('.') to the start of the RAM region (0x80000000).

	PROVIDE(__ram_origin__ = ORIGIN(RAM));
	PROVIDE(__ram_end__ = ORIGIN(RAM) + LENGTH(RAM));
	// Define global symbols for the start and end addresses of RAM.
    // PROVIDE() ensures these symbols are only defined if the object files don't define them.

	.text :
	{
		__text_start = .;
		// Define a symbol for the start of the .text section (code).
		KEEP(*(.text.crt0))		/* this is why _start comes before any other function */
		// KEEP ensures the .text.crt0 section (which contains _start) is placed first and is not discarded.
		*(.text.*)
		// Include all other .text subsections.
		__text_end = .;
		// Define a symbol for the end of the .text section.
	}

	/*. = ALIGN(0x10);*/	/* putting this here does not cause the followng section to move */
    // Commented out: This would only align the location counter, not the start of the next section.

	.rodata : /*ALIGN(0x10):*/	/* this will the align section but others can overlap */
	{
		. = ALIGN(0x10);		/* aligning here will align the section & update the loc counter */
		// Align the current location counter to a 16-byte boundary (0x10) before starting .rodata.
		__rodata_start = .;
		// Define a symbol for the start of the Read-Only Data section.
		*(.rodata.*)
		// Include all standard read-only data.
		*(.srodata.*)
		// Include small read-only data objects (specific to some architectures/compilers).
		__rodata_end = .;
		// Define a symbol for the end of the .rodata section.
	}

	.data :
	{
		. = ALIGN(0x1000);
		// Align the current location counter to a 4KB boundary (0x1000).
		__data_start = .;
		// Define a symbol for the start of the Initialized Data section.
		*(.data.*)
		// Include all standard initialized data.
		*(.sdata*) 				/* small data objects */
		// Include small initialized data objects.
		__data_end = .;
		// Define a symbol for the end of the .data section.
	}

    __global_pointer$ = (__data_start + 0x800);	/* stick this somewhere potentially useful */
    // RISC-V specific: Define the Global Pointer (gp) register value. It's often set to the middle of the small data section
    // (here, 2KB (0x800) offset from the start of .data) for efficient access to small data objects.

	
/**/
// Standard sections used for C++ constructors/destructors and initialization routines.
// They use PROVIDE_HIDDEN to define internal linker symbols.

  .preinit_array    :
  {
    PROVIDE_HIDDEN (__preinit_array_start = .);
    KEEP (*(.preinit_array))
    PROVIDE_HIDDEN (__preinit_array_end = .);
  }
  .init_array    :
  {
    PROVIDE_HIDDEN (__init_array_start = .);
    KEEP (*(SORT_BY_INIT_PRIORITY(.init_array.*) SORT_BY_INIT_PRIORITY(.ctors.*)))
    KEEP (*(.init_array EXCLUDE_FILE (*crtbegin.o *crtbegin?.o *crtend.o *crtend?.o ) .ctors))
    PROVIDE_HIDDEN (__init_array_end = .);
  }
  .fini_array    :
  {
    PROVIDE_HIDDEN (__fini_array_start = .);
    KEEP (*(SORT_BY_INIT_PRIORITY(.fini_array.*) SORT_BY_INIT_PRIORITY(.dtors.*)))
    KEEP (*(.fini_array EXCLUDE_FILE (*crtbegin.o *crtbegin?.o *crtend.o *crtend?.o ) .dtors))
    PROVIDE_HIDDEN (__fini_array_end = .);
  }
/**/

	.bss :
	{
		. = ALIGN(0x100);
		// Align the current location counter to a 256-byte boundary (0x100).
		__bss_start__ = .;
		// Define a symbol for the start of the Block Started by Symbol (uninitialized data).
		*(.sbss*) 			/* small data objects */
		// Include small uninitialized data.
		*(.bss*)
		// Include all standard uninitialized data.
		__bss_end__ = .;
		// Define a symbol for the end of the .bss section.
	}

	_end = .;
	// Define a final symbol '_end' pointing to the end of all loaded sections.
}
