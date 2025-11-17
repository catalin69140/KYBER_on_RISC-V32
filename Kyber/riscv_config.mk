# Set default architecture (can be overridden on command line)
RISCV_XLEN ?= 32

ifeq ($(RISCV_XLEN),32)
    RISCV_ARCH  := rv32im
    RISCV_ABI   := ilp32
    CROSS_PREFIX := riscv32-unknown-elf
else ifeq ($(RISCV_XLEN),64)
    RISCV_ARCH  := rv64im
    RISCV_ABI   := lp64
    CROSS_PREFIX := riscv64-unknown-elf
else
    $(error Invalid RISCV_XLEN value '$(RISCV_XLEN)'. Use 32 or 64.)
endif

RISCV_CMODEL := medany

RISCV_ARCHFLAGS := -march=$(RISCV_ARCH) -mabi=$(RISCV_ABI) -mcmodel=$(RISCV_CMODEL)
