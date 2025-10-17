## 1) One-command setup (deps → submodules → toolchain → QEMU)

From the repo root:

```bash
./setup.sh
```

> Note that this can take the better part of an hour or more to complete!

This will:

* Install OS dependencies (idempotent)
* Initialize & update submodules at pinned commits
* Build **rv32i** GNU toolchain + QEMU into `Kyber-Project/riscv/install/rv32i`

Make PATH live in this shell (new shells will have it already):

```bash
source ~/.bashrc
```

<details>
  
<summary>
  
Sanity checks(both tools should come from the same prefix/bin)

</summary>

```bash
which riscv32-unknown-elf-gcc
```

Output:

```bash
/home/catalin-ubuntu/Desktop/Kyber-Project/riscv/install/rv32i/bin/riscv32-unknown-elf-gcc
```
---
```bash
which qemu-system-riscv32
```

Output:

```bash
/home/catalin-ubuntu/Desktop/Kyber-Project/riscv/install/rv32i/bin/qemu-system-riscv32
```
---
```bash
riscv32-unknown-elf-gcc --version
```

Output:

```bash
riscv32-unknown-elf-gcc (g1b306039ac4) 15.1.0
Copyright (C) 2025 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```
---
```bash
qemu-system-riscv32 --version
```

Output:

```bash
QEMU emulator version 10.1.0 (v10.1.0-60-g562020faa2)
Copyright (c) 2003-2025 Fabrice Bellard and the QEMU Project developers
```
---
```bash
qemu-system-riscv32 -machine help
```

Output:

```bash
Supported machines are:
none                 empty machine
opentitan            RISC-V Board compatible with OpenTitan
sifive_e             RISC-V Board compatible with SiFive E SDK
sifive_u             RISC-V Board compatible with SiFive U SDK
spike                RISC-V Spike board (default)
virt                 RISC-V VirtIO board
```

</details>

---

here next gdb dashboard


</details>
