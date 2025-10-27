# Simple bare-metal RISC-V32 (QEMU virt) build


PROJECT := test-freestanding2
BUILD 	:= build


RISCV_PREFIX ?= riscv32-unknown-elf-
CC 	:= $(RISCV_PREFIX)gcc
AS 	:= $(RISCV_PREFIX)gcc
LD 	:= $(RISCV_PREFIX)gcc
OBJCOPY := $(RISCV_PREFIX)objcopy
OBJDUMP := $(RISCV_PREFIX)objdump


ARCH 	?= rv32imac_zicsr
ABI 	?= ilp32


CFLAGS 	:= 	-march=$(ARCH) -mabi=$(ABI) -ffreestanding -fno-builtin -nostdlib -nostartfiles -Os -g \
		-Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers \
		-Iinclude
ASFLAGS := -march=$(ARCH) -mabi=$(ABI) -x assembler-with-cpp -g
LDFLAGS := -T linker.ld -nostdlib -Wl,--gc-sections -Wl,-Map,$(BUILD)/$(PROJECT).map


SRC_C := \
	drivers/uart16550.c \
	lib/util.c \
	tests/test_main.c


SRC_S := \
	start.S


OBJ := $(patsubst %.c,$(BUILD)/%.o,$(SRC_C)) $(patsubst %.S,$(BUILD)/%.o,$(SRC_S))


.PHONY: all clean run run-gdb dump


all: $(BUILD)/$(PROJECT).elf $(BUILD)/$(PROJECT).bin


$(BUILD):
	@mkdir -p $(BUILD)/drivers $(BUILD)/lib $(BUILD)/tests


$(BUILD)/%.o: %.c | $(BUILD)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD)/%.o: %.S | $(BUILD)
	$(AS) $(ASFLAGS) -c $< -o $@

$(BUILD)/$(PROJECT).elf: $(OBJ) linker.ld | $(BUILD)
	$(LD) $(CFLAGS) $(OBJ) -o $@ $(LDFLAGS)

$(BUILD)/$(PROJECT).bin: $(BUILD)/$(PROJECT).elf
	$(OBJCOPY) -O binary $< $@

run: $(BUILD)/$(PROJECT).elf
	qemu-system-riscv32 -M virt -nographic -bios none -kernel $<

run-gdb: $(BUILD)/$(PROJECT).elf
	qemu-system-riscv32 -M virt -nographic -bios none -kernel $< -S -gdb tcp::1234



clean:
	rm -rf $(BUILD)
	rm -f *.log
	rm -f *.pyc
	rm -f *~
	rm -f TAGS
	rm -f cscope.out
	rm -f compile_commands.json
	rm -f .cache
	rm -f .gdb_history


# Utility targets


format:
	@which clang-format >/dev/null 2>&1 && clang-format -i $(shell git ls-files "*.c" "*.h" "*.S") || echo "clang-format not found"


dump: 		
	$(BUILD)/$(PROJECT).elf
	$(OBJDUMP) -d $< | less
