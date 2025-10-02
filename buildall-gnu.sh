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
#   3) Builds QEMU with the riscv32-softmmu target and installs into the same prefix
#
# Usage
#   ./buildall-gnu.sh                 # installs to $HOME/Kyber-Project/riscv/install/rv32i
#   ./buildall-gnu.sh /custom/prefix  # override install prefix
#
# Expected repo layout (as git submodules)
#   ./riscv-gnu-toolchain
#   ./qemu
#
# One-time prerequisites
#   ./installdeps-gnu.sh
#   ./setup.sh    # (this also runs submodule init/update)
#
# Results
#   Binaries:  $INSTALL_DIR/bin
#   Tools:     riscv32-unknown-elf-gcc, qemu-system-riscv32, etc.
# -----------------------------------------------------------------------------

set -euo pipefail

# Resolve install directory
if [[ $# -ge 1 && -n "${1:-}" ]]; then
  INSTALL_DIR="$1"
else
  INSTALL_DIR="$HOME/Kyber-Project/riscv/install/rv32i"
fi
echo "Installing into: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Parallel jobs
if command -v nproc >/dev/null 2>&1; then
  JOBS="$(nproc)"
elif command -v sysctl >/dev/null 2>&1; then
  JOBS="$(sysctl -n hw.ncpu || echo 1)"
else
  JOBS=1
fi
echo "Using parallel jobs: $JOBS"

# --- Build RISC-V GNU toolchain ----------------------------------------------
if [[ ! -d "riscv-gnu-toolchain" ]]; then
  echo "ERROR: Submodule 'riscv-gnu-toolchain' not found. Run ./setup.sh first."
  exit 1
fi

pushd riscv-gnu-toolchain >/dev/null

# Base ISA is rv32i; multilibs provide a few common variants if needed later.
./configure --prefix="$INSTALL_DIR" --with-arch=rv32i \
  --with-multilib-generator="rv32i-ilp32--;rv32ima-ilp32--;rv32imafd-ilp32--"

make -j"$JOBS"
popd >/dev/null

# --- Build QEMU (rv32 softmmu) -----------------------------------------------
if [[ ! -d "qemu" ]]; then
  echo "ERROR: Submodule 'qemu' not found. Run ./setup.sh first."
  exit 1
fi

pushd qemu >/dev/null
./configure --target-list=riscv32-softmmu --prefix="$INSTALL_DIR"
make -j"$JOBS"
make install
popd >/dev/null

echo
echo "Done."
echo "Now add to PATH (if not already):"
echo "  export PATH=\"$INSTALL_DIR/bin:\$PATH\""
