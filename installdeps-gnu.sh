#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# installdeps-gnu.sh
#
# Purpose
#   Install host (Ubuntu/Debian) packages needed to build:
#     - riscv-gnu-toolchain (ELF/Newlib)
#     - QEMU (riscv32-softmmu)
#
# Notes
#   - Intended for Ubuntu 22.04 or newer (also works on Debian-like systems).
#   - Safe to re-run; 'apt' will skip already-installed packages.
#   - Uses separate groups for clarity (toolchain core, gdb extras, qemu deps).
#
# Usage
#   ./installdeps-gnu.sh
# -----------------------------------------------------------------------------

set -euo pipefail

echo "[deps] Installing toolchain core build dependencies..."
sudo apt-get update
sudo apt-get install -y \
  autoconf automake autotools-dev curl python3 libmpc-dev libmpfr-dev libgmp-dev \
  gawk build-essential bison flex texinfo gperf libtool patchutils bc zlib1g-dev \
  libexpat-dev

echo "[deps] (Optional) GDB python support / dashboards..."
# Some GDB dashboards/scripts expect Python headers (for the host's Python 3).
# On older docs you may see 'python-dev' (Python 2); use python3-dev on modern Ubuntu.
sudo apt-get install -y python3-dev || true

echo "[deps] QEMU build helpers (graphics & build tools used by softmmu)..."
sudo apt-get install -y ninja-build meson pkg-config libglib2.0-dev libpixman-1-dev \
                 python3 python3-venv

echo "[deps] Useful extra: device-tree compiler (dtc) to inspect QEMU machines..."
sudo apt-get install -y device-tree-compiler

echo "[deps] All dependencies installed."
