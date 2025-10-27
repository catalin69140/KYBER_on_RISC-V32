A super simple freestanding RV32I app that is suitable for verifying the toolchain & qemu installation.

It follows the example of [John Winans’](https://github.com/johnwinans/riscv-toolchain-install-guide) but with some modifications.

Inside the **test-freestanding** folder:

## Initialize

```bash
make world
```

Expected Output:

```bash
catalin-ubuntu@catalin-ubuntu:~/Desktop/Kyber-Project/KYBER_on_RISC-V32/test-freestanding$ make world
rm -f prog prog.lst *.o *.s *.lst
riscv32-unknown-elf-gcc -Wall -Werror -g -Wcast-align -ffreestanding  -fno-pic -O2 -march=rv32im_zicsr -mabi=ilp32 -Wa,-alh=crt0.o.lst,-L -march=rv32im_zicsr -mabi=ilp32   -c -o crt0.o crt0.S
riscv32-unknown-elf-gcc -Wall -Werror -g -Wcast-align -ffreestanding  -fno-pic -O2 -march=rv32im_zicsr -mabi=ilp32  -nostdlib -Wl,-T,vanilla.ld -march=rv32im_zicsr -mabi=ilp32 -march=rv32im_zicsr -mabi=ilp32 -o prog crt0.o -lc -lgcc
/home/catalin-ubuntu/Desktop/Kyber-Project/riscv/install/rv32i/lib/gcc/riscv32-unknown-elf/15.1.0/../../../../riscv32-unknown-elf/bin/ld: warning: prog has a LOAD segment with RWX permissions
riscv32-unknown-elf-size -A -x prog
prog  :
section               size         addr
.text                 0x30   0x80000000
.rodata                0xe   0x80000030
.eh_frame             0x28   0x80000040
.data                0xf98   0x80000068
.bss                   0x0   0x80001000
.riscv.attributes     0x35          0x0
.debug_line           0x82          0x0
.debug_line_str       0x56          0x0
.debug_info           0x24          0x0
.debug_abbrev         0x14          0x0
.debug_aranges        0x20          0x0
.debug_str            0x62          0x0
Total               0x11c5


riscv32-unknown-elf-objdump -Mnumeric,no-aliases -S -dr prog > prog.lst
```

> To clean the build: make clean

## 1) Run qemu without -S

```bash
qemu-system-riscv32 -machine virt -m 128M -bios none -device loader,file=./prog -nographic -s
```

Output:

```bash
Hello World!
```

> To stop qemu: ^A x

Note that qemu will set the PC register to the load address of 'prog'.

## 2) Run qemu with -S to make it wait for gdb to attach before it starts running

```bash
qemu-system-riscv32 -machine virt -m 128M -bios none -device loader,file=./prog -nographic -s -S
```

Output:

```bash
Hello World!
```

> To stop qemu: ^A x

## Then run gdb in another terminal like this:

```bash
riscv32-unknown-elf-gdb ./prog
```

> Note: You can paste it directly without being in the **test-freestanding** folder.

Then type this inside that terminal and press enter:

```bash
target remote :1234
```

> To stop gdb: q

## Visualizing

Inside the terminal with gdb just type **si** (step over one single machine instruction) once and you can hit enter after that. 

Now you can see how different commands execute and register.
