#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# buildall-gnu.sh
#
# Purpose
#   Build and install the RISC-V GNU toolchain (ELF/Newlib) and QEMU for rv32.
#
# What this script does
#   1) Chooses an install prefix (default: $HOME/Kyber-Project/riscv/install/rv32i)
#   2) Builds riscv-gnu-toolchain targeting rv32i plus a few common multilibs
#   3) Builds QEMU with the riscv32-softmmu target
#
# Usage
#   ./buildall-gnu.sh                 # installs to $HOME/Kyber-Project/riscv/install/rv32i
#   ./buildall-gnu.sh /custom/prefix  # override install prefix
#
# Expected repo layout
#   ./riscv-gnu-toolchain   (git submodule)
#   ./qemu                  (git submodule)
#
# One-time prerequisites
#   ./installdeps-gnu.sh
#   ./setup.sh
#
# Results
#   Binaries:  $INSTALL_DIR/bin
#   Tools:     riscv32-unknown-elf-gcc, qemu-system-riscv32, etc.
# -----------------------------------------------------------------------------

set -euo pipefail

# 1) Resolve install directory (default to ~/Kyber-Project/riscv/install/rv32i)
if [[ $# -ge 1 && -n "${1:-}" ]]; then
  INSTALL_DIR="$1"
else
  INSTALL_DIR="$HOME/Kyber-Project/riscv/install/rv32i"
fi
echo "Installing into: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# 2) Determine parallelism (prefer nproc; fall back to sysctl or 1)
if command -v nproc >/dev/null 2>&1; then
  JOBS="$(nproc)"
elif command -v sysctl >/dev/null 2>&1; then
  JOBS="$(sysctl -n hw.ncpu || echo 1)"
else
  JOBS=1
fi
echo "Using parallel jobs: $JOBS"

# 3) Build the RISC-V GNU toolchain (ELF/Newlib)
#    The toolchain submodule is expected at: ./riscv-gnu-toolchain
if [[ ! -d "riscv-gnu-toolchain" ]]; then
  echo "ERROR: Submodule 'riscv-gnu-toolchain' not found. Did you run ./setup.sh?"
  exit 1
fi

pushd riscv-gnu-toolchain >/dev/null

# Configure for a rv32i baseline. The multilib generator enables a few common
# -march/-mabi combinations; keep or trim as you see fit.
./configure --prefix="$INSTALL_DIR" --with-arch=rv32i \
  --with-multilib-generator="rv32i-ilp32--;rv32ima-ilp32--;rv32imafd-ilp32--"

# For this project, plain `make` performs the build and install into --prefix.
make -j"$JOBS"

popd >/dev/null

# 4) Build QEMU (riscv32 softmmu)
#    The QEMU submodule is expected at: ./qemu
if [[ ! -d "qemu" ]]; then
  echo "ERROR: Submodule 'qemu' not found. Did you run ./setup.sh?"
  exit 1
fi

pushd qemu >/dev/null
./configure --target-list=riscv32-softmmu --prefix="$INSTALL_DIR"
make -j"$JOBS"
make install
popd >/dev/null

echo
echo "Done."
echo "Add to PATH if needed:"
echo "  export PATH=\"$INSTALL_DIR/bin:\$PATH\""
