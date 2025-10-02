#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# setup.sh
#
# Purpose
#   One-command bootstrap for this repo on Ubuntu:
#     1) Install host dependencies (idempotent).
#     2) Initialize & update submodules to pinned commits.
#     3) Build and install the rv32i GNU toolchain + QEMU next to this project.
#
# Differences vs original
#   - Adds dependency installation step (calls installdeps-gnu.sh).
#   - Uses 'git submodule update --init --recursive' in one shot.
#   - Calls ./buildall-gnu.sh with a default install prefix at:
#       $HOME/Kyber-Project/riscv/install/rv32i
#     (You can still override by passing a custom prefix as $1.)
#
# Usage
#   ./setup.sh                   # installs to $HOME/Kyber-Project/riscv/install/rv32i
#   ./setup.sh /custom/prefix    # installs to /custom/prefix
#
# Result
#   Tool binaries at:  $INSTALL_DIR/bin
#   e.g. riscv32-unknown-elf-gcc, qemu-system-riscv32
# -----------------------------------------------------------------------------

set -euo pipefail

# 0) Resolve install directory (default near the project)
if [[ $# -ge 1 && -n "${1:-}" ]]; then
  INSTALL_DIR="$1"
else
  INSTALL_DIR="$HOME/Kyber-Project/riscv/install/rv32i"
fi
echo "Will install toolchain into: $INSTALL_DIR"

# 1) Install OS deps (idempotent)
echo "[1/3] Installing Ubuntu packages..."
./installdeps-gnu.sh

# 2) Submodules (pin to this repo's recorded commits)
echo "[2/3] Initializing/updating submodules..."
git submodule update --init --recursive

# Optional: manually pin specific versions if you need exact tags/commits:
# pushd riscv-gnu-toolchain >/dev/null
# git checkout 2021.06.26
# popd >/dev/null
# pushd qemu >/dev/null
# git checkout v5.2.0
# popd >/dev/null

# 3) Build the rv32i GNU toolchain + QEMU
echo "[3/3] Building GNU toolchain + QEMU (rv32i)..."
./buildall-gnu.sh "$INSTALL_DIR"

echo
echo "Setup complete."
echo "Add to PATH if needed:"
echo "  echo 'export PATH=$INSTALL_DIR/bin:\$PATH' >> ~/.bashrc"
echo "  export PATH=$INSTALL_DIR/bin:\$PATH"
