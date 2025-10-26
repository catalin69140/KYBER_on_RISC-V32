A super simple freestanding RV32I app that is suitable for verifying the toolchain & qemu installation.

It follows the example of [John Winans’](https://github.com/johnwinans/riscv-toolchain-install-guide) but with some modifications.

Inside the **test-freestanding** folder:

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
