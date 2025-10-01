Got it, Catalin! Below is a **complete, copy-paste README** for your repo that:

* Uses **Ubuntu** step-by-step instructions
* Builds the **GNU rv32 toolchain + QEMU** to **`~/projects/riscv/install/rv32i/bin`** (Winans-style)
* Keeps your **project folder** installed/cloned under **`~/projects/KYBER_on_RISC-V32`**
* Adds **ready-to-run Makefile targets** (`kyber512/768/1024`, `run-qemu`, and a `hello-uart` smoke test)
* Calls out **which files to add/modify**

You can paste this entire thing into `README.md`.
(Where I say “Add this file” or “Replace your Makefile,” that’s the part you’ll actually change in the repo.)

---

# KYBER on RISC-V32 — GNU Toolchain, QEMU & Quickstart (Ubuntu)

This project runs **CRYSTALS-Kyber** on **RV32** using the **RISC-V GNU (ELF/Newlib) toolchain** and **QEMU**.
It follows the structure of John Winans’ guide for predictable installs and paths.

* **Toolchain & QEMU install path:** `~/projects/riscv/install/rv32i/bin`
* **Project location:** `~/projects/KYBER_on_RISC-V32`

> If you delete `~/projects/riscv/`, the toolchain is gone. Your project stays in `~/projects/KYBER_on_RISC-V32`.

---

## 1) Ubuntu prerequisites

```bash
sudo apt update
sudo apt install -y git build-essential autoconf automake autotools-dev \
  curl python3 libmpc-dev libmpfr-dev libgmp-dev gawk gperf bison flex \
  texinfo help2man libtool patchutils zlib1g-dev libexpat1-dev ninja-build \
  cmake libglib2.0-dev libpixman-1-dev
```

Tested on Ubuntu 22.04/24.04.

---

## 2) Get the project

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/catalin69140/KYBER_on_RISC-V32.git
cd KYBER_on_RISC-V32

# bring submodules (toolchain, qemu, etc.) to pinned commits
git submodule update --init --recursive
```

---

## 3) Install OS deps & pin submodules (repo scripts)

```bash
# safe to re-run any time
./installdeps-gnu.sh
./setup.sh
```

---

## 4) Build the RISC-V GNU toolchain (rv32) + QEMU

We install to the **standard Winans path**:

* `RISCV_HOME="~/projects/riscv"`
* `RISCV_PREFIX="~/projects/riscv/install/rv32i"`

```bash
export RISCV_HOME="$HOME/projects/riscv"
export RISCV_PREFIX="$RISCV_HOME/install/rv32i"
mkdir -p "$RISCV_HOME"

# Build toolchain + QEMU; this may take a while on first run
./buildall-gnu.sh
```

Add tools to your PATH (now and in future shells):

```bash
echo 'export PATH=$HOME/projects/riscv/install/rv32i/bin:$PATH' >> ~/.bashrc
export PATH=$HOME/projects/riscv/install/rv32i/bin:$PATH
```

Sanity checks:

```bash
which riscv32-unknown-elf-gcc && riscv32-unknown-elf-gcc --version
which qemu-system-riscv32 && qemu-system-riscv32 --version
```

> If either command is “not found”, re-open your terminal or `source ~/.bashrc`.

---

## 5) Build & run KYBER

From the project root (`~/projects/KYBER_on_RISC-V32`):

```bash
# default build = Kyber-768 (KYBER_K=3)
make
# run on QEMU (virt)
make run-qemu
```

Select parameter set:

```bash
make kyber512     # KYBER_K=2
make kyber768     # KYBER_K=3 (default)
make kyber1024    # KYBER_K=4
```

---

## 6) (Optional) Spike + proxy kernel

If you have Spike + pk installed:

```bash
make run-spike
```

---

## 7) Hello-UART smoke test

Verify the QEMU console quickly:

```bash
make run-hello
# expected:
# hello from rv32 on qemu virt!
```

---

## 8) Troubleshooting

* **Tools not found**: ensure PATH has `~/projects/riscv/install/rv32i/bin` and re-source:

  ```bash
  source ~/.bashrc
  which riscv32-unknown-elf-gcc
  which qemu-system-riscv32
  ```
* **Build fails on first run**: Make sure you ran `./installdeps-gnu.sh` and `./setup.sh`.
* **QEMU no output**: Confirm you used `-nographic` and your UART base matches virt (0x10000000).

---

## 9) Files you need to add or modify

> ✅ If these already exist, you can merge changes. Otherwise, add them as new files.

### A) **Replace your top-level `Makefile`** with this (or merge carefully)

```make
# --- Toolchain paths (Winans-style install) ---
REPO_ROOT := $(abspath .)
RISCV_PREFIX_DIR ?= $(HOME)/projects/riscv/install/rv32i
CROSS_PREFIX     ?= $(RISCV_PREFIX_DIR)/bin/riscv32-unknown-elf-

CC      := $(CROSS_PREFIX)gcc
AS      := $(CROSS_PREFIX)gcc
AR      := $(CROSS_PREFIX)ar
OBJDUMP := $(CROSS_PREFIX)objdump
OBJCOPY := $(CROSS_PREFIX)objcopy
SIZE    := $(CROSS_PREFIX)size

QEMU ?= $(RISCV_PREFIX_DIR)/bin/qemu-system-riscv32
ifeq ("$(wildcard $(QEMU))","")
QEMU := qemu-system-riscv32
endif

# --- ISA/ABI + common flags ---
ARCH ?= rv32imac
ABI  ?= ilp32

CFLAGS   += -march=$(ARCH) -mabi=$(ABI) -O3 -ffreestanding -fno-common -Wall -Wextra
ASFLAGS  += -march=$(ARCH) -mabi=$(ABI)
LDFLAGS  += -nostartfiles -nostdlib -Wl,-Bstatic -Wl,-Map,build/kyber.map -T linker.ld

# Pick Kyber parameter set: 2=512, 3=768, 4=1024
KYBER_K ?= 3
CFLAGS  += -DKYBER_K=$(KYBER_K)

# --- Source layout ---
SRC_C  := $(wildcard src/*.c)
SRC_S  := $(wildcard src/*.S)
OBJS   := $(patsubst src/%.c,build/%.o,$(SRC_C)) \
          $(patsubst src/%.S,build/%.o,$(SRC_S))

ELF    := build/kyber.elf
BIN    := build/kyber.bin

# --- Default target ---
.PHONY: all
all: build $(ELF)

build:
	mkdir -p build

$(ELF): $(OBJS) linker.ld | build
	$(CC) $(CFLAGS) $(OBJS) $(LDFLAGS) -o $@
	$(SIZE) $@

build/%.o: src/%.c | build
	$(CC) $(CFLAGS) -c $< -o $@

build/%.o: src/%.S | build
	$(AS) $(ASFLAGS) -c $< -o $@

$(BIN): $(ELF)
	$(OBJCOPY) -O binary $< $@

# --- Kyber presets ---
.PHONY: kyber512 kyber768 kyber1024
kyber512: ; $(MAKE) KYBER_K=2 all
kyber768: ; $(MAKE) KYBER_K=3 all
kyber1024: ; $(MAKE) KYBER_K=4 all

# --- Run on QEMU (virt, headless) ---
.PHONY: run-qemu
run-qemu: $(ELF)
	$(QEMU) -M virt -nographic -bios none -kernel $(ELF)

# --- Spike (optional) ---
SPIKE ?= spike
PK    ?= pk
.PHONY: run-spike
run-spike: $(ELF)
	$(SPIKE) $(PK) $(ELF)

# --- hello-uart demo ---
HELLO_DIR := examples/hello-uart
HELLO_ELF := build/hello-uart.elf
HELLO_OBJS := build/hello-start.o build/hello-main.o

.PHONY: hello-uart
hello-uart: $(HELLO_ELF)

build/hello-start.o: $(HELLO_DIR)/start.S | build
	$(AS) $(ASFLAGS) -c $< -o $@

build/hello-main.o: $(HELLO_DIR)/main.c | build
	$(CC) $(CFLAGS) -c $< -o $@

$(HELLO_ELF): $(HELLO_OBJS) linker.ld | build
	$(CC) $(CFLAGS) $(HELLO_OBJS) $(LDFLAGS) -o $@
	$(SIZE) $@

.PHONY: run-hello
run-hello: hello-uart
	$(QEMU) -M virt -nographic -bios none -kernel $(HELLO_ELF)

# --- Clean ---
.PHONY: clean distclean
clean: ; rm -rf build
distclean: clean
	@echo "Toolchain is at $$HOME/projects/riscv/ (not removed)."
```

> If your sources aren’t under `src/`, adjust the `SRC_C` / `SRC_S` globs.

---

### B) **Add `linker.ld`** (root of the repo)

If you already have one that matches your startup/runtime, keep it. Otherwise add this minimal RAM‐only script for QEMU `virt`:

```ld
/* linker.ld - qemu-system-riscv32 -M virt -bios none */
OUTPUT_ARCH(riscv)
ENTRY(_start)

MEMORY
{
  RAM (rwx) : ORIGIN = 0x80000000, LENGTH = 128M
}

SECTIONS
{
  .text : {
    KEEP(*(.init))
    KEEP(*(.text.startup))
    *(.text .text.*)
    *(.rodata .rodata.*)
  } > RAM

  .data : { *(.data .data.*) } > RAM

  .bss (NOLOAD) : {
    *(.sbss .sbss.* .bss .bss.*)
    *(COMMON)
  } > RAM

  /DISCARD/ : { *(.comment*) *(.note*) }
}
```

---

### C) **Add Hello-UART example** (for quick console check)

Create the folder and files:

```
examples/hello-uart/
├─ start.S
└─ main.c
```

**`examples/hello-uart/start.S`**

```asm
    .section .text.startup
    .globl _start
_start:
    la sp, _stack_top       /* set up a stack */
    call main               /* jump into C */
1:  j 1b                    /* hang after main */

    .section .bss
    .global _stack
    .global _stack_top
    .align 4
_stack:
    .space 4096             /* 4 KB stack */
_stack_top:
```

**`examples/hello-uart/main.c`**

```c
#include <stdint.h>

/* QEMU virt exposes a 16550 UART at 0x10000000 */
#define UART0_BASE 0x10000000UL
#define UART_THR   0x00
#define UART_LSR   0x05
#define LSR_THRE   0x20

static inline void uart_putc(char c) {
    volatile uint8_t* thr = (uint8_t*)(UART0_BASE + UART_THR);
    volatile uint8_t* lsr = (uint8_t*)(UART0_BASE + UART_LSR);
    while (((*lsr) & LSR_THRE) == 0) { }
    *thr = (uint8_t)c;
}

static void uart_puts(const char* s) {
    while (*s) {
        if (*s == '\n') uart_putc('\r');
        uart_putc(*s++);
    }
}

int main(void) {
    uart_puts("hello from rv32 on qemu virt!\n");
    return 0;
}
```

---

### D) **.gitignore (optional but recommended)**

Add to `.gitignore`:

```
/build/
/*.map
```

*(The toolchain lives outside the repo, so nothing to ignore there.)*

---

## 10) Developer notes

* The **ELF/Newlib** toolchain (`riscv32-unknown-elf-*`) is for bare-metal images like we run on `qemu-system-riscv32 -M virt -bios none`.
* The Linux/glibc tools (`riscv32-unknown-linux-gnu-*`) are **not** used here.
* Default ISA/ABI: `-march=rv32imac` and `-mabi=ilp32`. Adjust if your target differs.
* Newlib `printf` can be wired to UART via `_write()` if you want standard I/O; the current example uses polled UART for simplicity.

---

### Quickstart recap

```bash
# One-time setup
sudo apt update
sudo apt install -y git build-essential autoconf automake autotools-dev \
  curl python3 libmpc-dev libmpfr-dev libgmp-dev gawk gperf bison flex \
  texinfo help2man libtool patchutils zlib1g-dev libexpat1-dev ninja-build \
  cmake libglib2.0-dev libpixman-1-dev

mkdir -p ~/projects && cd ~/projects
git clone https://github.com/catalin69140/KYBER_on_RISC-V32.git
cd KYBER_on_RISC-V32
git submodule update --init --recursive
./installdeps-gnu.sh
./setup.sh

export RISCV_HOME="$HOME/projects/riscv"
export RISCV_PREFIX="$RISCV_HOME/install/rv32i"
mkdir -p "$RISCV_HOME"
./buildall-gnu.sh

echo 'export PATH=$HOME/projects/riscv/install/rv32i/bin:$PATH' >> ~/.bashrc
export PATH=$HOME/projects/riscv/install/rv32i/bin:$PATH

# Build + run
make            # (kyber768 by default)
make run-qemu

# Variants
make kyber512
make kyber1024

# Smoke test
make run-hello
```

---

## Do you need to modify any files?

* **Yes (once):**

  * Replace/merge the **top-level `Makefile`** with the version above.
  * Add **`linker.ld`** if you don’t already have a suitable one.
  * Add the **hello-uart** example files (optional but handy).

Everything else runs via your existing scripts: `installdeps-gnu.sh`, `setup.sh`, `buildall-gnu.sh`.

If you want, I can also add a tiny `_write()` and `syscalls.c` so `printf()` goes to the same UART; just say the word and I’ll include the drop-in files + Makefile tweak.
