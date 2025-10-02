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

set -Eeuo pipefail

# Repo root + default colocated prefix: <parent-of-repo>/riscv/install/rv32i
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_PREFIX="$(cd "$REPO_ROOT/.." && pwd)/riscv/install/rv32i"

if [[ $# -ge 1 && -n "${1:-}" ]]; then
  INSTALL_DIR="$1"
else
  INSTALL_DIR="${PREFIX:-$DEFAULT_PREFIX}"
fi

echo "[build] Install prefix: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Parallel jobs
if command -v nproc >/dev/null 2>&1; then
  JOBS="$(nproc)"
elif command -v sysctl >/dev/null 2>&1; then
  JOBS="$(sysctl -n hw.ncpu || echo 1)"
else
  JOBS=1
fi
echo "[build] Using jobs: $JOBS"

# ---- Toolchain ---------------------------------------------------------------
TOOLCHAIN_DIR="$REPO_ROOT/riscv-gnu-toolchain"
if [[ ! -d "$TOOLCHAIN_DIR" ]]; then
  echo "ERROR: 'riscv-gnu-toolchain' not found. Run ./setup.sh first."
  exit 1
fi

echo "[build] Configuring riscv-gnu-toolchain..."
pushd "$TOOLCHAIN_DIR" >/dev/null

# Provide a few multilibs so -march/-mabi can vary at build time if needed
./configure \
  --prefix="$INSTALL_DIR" \
  --with-arch=rv32i \
  --with-abi=ilp32 \
  --with-multilib-generator="rv32i-ilp32--;rv32im-ilp32--;rv32ima-ilp32--;rv32imafd-ilp32--"

echo "[build] Building toolchain..."
make -j"$JOBS"

echo "[build] Installing toolchain..."
make install
popd >/dev/null

# ---- QEMU --------------------------------------------------------------------
QEMU_DIR="$REPO_ROOT/qemu"
if [[ ! -d "$QEMU_DIR" ]]; then
  echo "ERROR: 'qemu' not found. Run ./setup.sh first."
  exit 1
fi

echo "[build] Configuring QEMU..."
pushd "$QEMU_DIR" >/dev/null
./configure \
  --target-list=riscv32-softmmu \
  --prefix="$INSTALL_DIR" \
  --disable-werror

echo "[build] Building QEMU..."
make -j"$JOBS"

echo "[build] Installing QEMU..."
make install
popd >/dev/null

cat <<EOF

[build] Done.

Add to PATH if not already:
  export PATH="$INSTALL_DIR/bin:\$PATH"

Then verify:
  which riscv32-unknown-elf-gcc
  which qemu-system-riscv32
EOF
