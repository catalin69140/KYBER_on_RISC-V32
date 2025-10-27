This directory contains a **freestanding test harness** that boots directly on QEMU or real RISC-V hardware (no OS, no libc).  

> It is designed for later on for verifying cryptographic primitives and core functions — such as the Kyber algorithm — at the **machine level**. For now it runs some simple test wich should pass if everything was installed correctly.

---

## 🧩 Overview

`test-freestanding2` is a minimal setup that:
- boots in **machine mode** (`_start` in `start.S`);
- initializes the **stack**, clears `.bss`, and sets up a basic **trap handler**;
- provides **UART16550** output for logging and debugging;
- runs simple **unit tests** written in C using lightweight `ASSERT_*` macros;
- can be extended to test any custom C or assembly routines (e.g. Kyber).

> Note: **UART16550** stands for universal asynchronous receiver-transmitter

## 🧪 Tests

Located in `tests/test_main.c`:

- **`test_math()`** – verifies basic arithmetic (`1+1==2`, etc.)
- **`test_prng()`** – ensures the pseudo-random generator produces distinct values

All tests report results via **UART** using simple macros:
```c
ASSERT_TRUE(condition);
ASSERT_EQ_U32(a, b);
```

---

Inside the **test-freestanding2** folder:

## Initialize/Build

```bash
make
```

Expected Output:

```bash
catalin-ubuntu@catalin-ubuntu:~/Desktop/Kyber-Project/KYBER_on_RISC-V32/test-freestanding2$ make
riscv32-unknown-elf-gcc -march=rv32imac_zicsr -mabi=ilp32 -ffreestanding -fno-builtin -nostdlib -nostartfiles -Os -g -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers -Iinclude -c drivers/uart16550.c -o build/drivers/uart16550.o
riscv32-unknown-elf-gcc -march=rv32imac_zicsr -mabi=ilp32 -ffreestanding -fno-builtin -nostdlib -nostartfiles -Os -g -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers -Iinclude -c lib/util.c -o build/lib/util.o
riscv32-unknown-elf-gcc -march=rv32imac_zicsr -mabi=ilp32 -ffreestanding -fno-builtin -nostdlib -nostartfiles -Os -g -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers -Iinclude -c tests/test_main.c -o build/tests/test_main.o
riscv32-unknown-elf-gcc -march=rv32imac_zicsr -mabi=ilp32 -x assembler-with-cpp -g -c start.S -o build/start.o
riscv32-unknown-elf-gcc -march=rv32imac_zicsr -mabi=ilp32 -ffreestanding -fno-builtin -nostdlib -nostartfiles -Os -g -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers -Iinclude build/drivers/uart16550.o build/lib/util.o build/tests/test_main.o build/start.o -o build/test-freestanding2.elf -T linker.ld -nostdlib -Wl,--gc-sections -Wl,-Map,build/test-freestanding2.map
/home/catalin-ubuntu/Desktop/Kyber-Project/riscv/install/rv32i/lib/gcc/riscv32-unknown-elf/15.1.0/../../../../riscv32-unknown-elf/bin/ld: warning: build/test-freestanding2.elf has a LOAD segment with RWX permissions
riscv32-unknown-elf-objcopy -O binary build/test-freestanding2.elf build/test-freestanding2.bin
```

> To clean the build: make clean

## 1) Run in Qemu without -S

```bash
make run
```

Expected Output:

```bash
catalin-ubuntu@catalin-ubuntu:~/Desktop/Kyber-Project/KYBER_on_RISC-V32/test-freestanding2$ make run
qemu-system-riscv32 -M virt -nographic -bios none -kernel build/test-freestanding2.elf

=== test-freestanding2 (rv32) ===
[PASS] All tests passed
```

> To stop qemu: ^A x

## 2) Run Qemu with -S to make it wait for gdb to attach before it starts running

```bash
make run-gdb
```

Expected Output:

```bash
catalin-ubuntu@catalin-ubuntu:~/Desktop/Kyber-Project/KYBER_on_RISC-V32/test-freestanding2$ make run-gdb
qemu-system-riscv32 -M virt -nographic -bios none -kernel build/test-freestanding2.elf -S -gdb tcp::1234

=== test-freestanding2 (rv32) ===
[PASS] All tests passed
```

> To stop qemu: ^A x

## Then run gdb in another terminal like this:

```bash
riscv32-unknown-elf-gdb ./test-freestanding2.elf 
```

> Note: You can paste it directly without being in the **test-freestanding** folder.

Then type this inside that terminal and press enter:

```bash
target remote:1234
```

> To stop gdb: q

## Visualizing

Inside the terminal with gdb just type **si** (step over one single machine instruction) once and you can hit enter after that. 

Now you can see how different commands execute and register.

---

## 🧠 Extending with Kyber tests

To add your Kyber routines:

1. **Add** your Kyber source files to `lib/` or `tests/`.
2. **Modify** the `Makefile` → include them in the `SRC_C` list.
3. **Create** a new test function, for example:

   ```c
   static int test_kyber(void) {
       ASSERT_TRUE(kyber_keygen() == 0);
       ASSERT_TRUE(kyber_encrypt() == 0);
       ASSERT_TRUE(kyber_decrypt() == 0);
       return 0;
   }
   ```
4. **Call** it from `main()` in `test_main.c`.

The Kyber tests will print their results through UART exactly like the sample tests.
