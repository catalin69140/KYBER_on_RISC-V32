#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# setup.sh
#
# Purpose
#   One-command bootstrap for this repo on Ubuntu:
#     1) Install host dependencies (idempotent).
#     2) Initialize & update submodules to pinned commits.
#     3) Build and install the rv32i GNU toolchain + QEMU next to this project.
#     4) PATH WIRING
#
# Usage
#   ./setup.sh                   # installs to $HOME/Kyber-Project/riscv/install/rv32i
#   ./setup.sh /custom/prefix    # installs to /custom/prefix
#
# Result
#   Tool binaries at:  $INSTALL_DIR/bin
#   e.g. riscv32-unknown-elf-gcc, qemu-system-riscv32
# -----------------------------------------------------------------------------

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_PREFIX="$(cd "$REPO_ROOT/.." && pwd)/riscv/install/rv32i"

# Choose install dir: arg > PREFIX env > default
if [[ $# -ge 1 && -n "${1:-}" ]]; then
  INSTALL_DIR="$1"
else
  INSTALL_DIR="${PREFIX:-$DEFAULT_PREFIX}"
fi

echo "[setup] Will install into: $INSTALL_DIR"

# 1) Deps
echo "[1/4] Installing OS dependencies..."
"$REPO_ROOT/installdeps-gnu.sh"

# 2) Sources (submodules or shallow clones)
echo "[2/4] Ensuring sources exist..."
# If you do not keep them as submodules, switch to:
# if [[ ! -d "$REPO_ROOT/riscv-gnu-toolchain" ]]; then
#   echo "[setup] Cloning riscv-gnu-toolchain..."
#   git clone --depth=1 https://github.com/riscv-collab/riscv-gnu-toolchain.git "$REPO_ROOT/riscv-gnu-toolchain"
# fi
# if [[ ! -d "$REPO_ROOT/qemu" ]]; then
#   echo "[setup] Cloning QEMU..."
#   git clone --depth=1 https://gitlab.com/qemu-project/qemu.git "$REPO_ROOT/qemu"
# fi

# If you keep them as submodules, switch to:
git submodule update --init --recursive --remote --jobs=$(nproc)

# 3) Build
echo "[3/4] Building toolchain + QEMU..."
"$REPO_ROOT/buildall-gnu.sh" "$INSTALL_DIR"

# 4) PATH wiring
echo "[4/4] Updating PATH in ~/.bashrc (idempotent)..."
PATH_LINE="export PATH=\"$INSTALL_DIR/bin:\$PATH\""
grep -qxF "$PATH_LINE" "$HOME/.bashrc" || echo "$PATH_LINE" >> "$HOME/.bashrc"
export PATH="$INSTALL_DIR/bin:$PATH"

echo
echo "[setup] Done."
echo "Open a new shell or run: source ~/.bashrc"
