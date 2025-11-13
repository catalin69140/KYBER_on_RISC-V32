#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# buildall-gnu.sh
#
# Purpose
#   Build and install the RISC-V GNU toolchain (ELF/Newlib) and QEMU for rv32 and/or rv64.
#
# Usage
#   ./buildall-gnu.sh [<base-prefix>] [--only-rv32|--only-rv64]
#   ./buildall-gnu.sh --prefix=/custom/prefix [--only-rv32|--only-rv64]
#
# Default installs to: $HOME/Kyber-Project/riscv/install/{rv32i,rv64i}
# -----------------------------------------------------------------------------

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_BASE_PREFIX="$(cd "$REPO_ROOT/.." && pwd)/riscv/install"

# -------- arg parse --------
BASE_PREFIX=""
ONLY=""

print_usage() {
  cat <<USAGE
Usage:
  $(basename "$0") [<base-prefix>] [--only-rv32|--only-rv64]
  $(basename "$0") --prefix=/path [--only-rv32|--only-rv64]

Options:
  --only-rv32        Build only rv32 toolchain + QEMU
  --only-rv64        Build only rv64 toolchain + QEMU
  --prefix=/path     Set base install directory (contains rv32i/ and rv64i/)
  -h, --help         Show this help
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --only-rv32) ONLY="rv32" ;;
    --only-rv64) ONLY="rv64" ;;
    --prefix=*) BASE_PREFIX="${arg#--prefix=}" ;;
    -h|--help) print_usage; exit 0 ;;
    --*) echo "Unknown option: $arg"; print_usage; exit 2 ;;
    *)  # positional base prefix (first non-flag wins)
        [[ -z "$BASE_PREFIX" ]] && BASE_PREFIX="$arg" || { echo "Unexpected arg: $arg"; exit 2; }
        ;;
  esac
done

if [[ -z "${BASE_PREFIX:-}" ]]; then
  BASE_PREFIX="${PREFIX:-$DEFAULT_BASE_PREFIX}"
fi

RV32_INSTALL="$BASE_PREFIX/rv32i"
RV64_INSTALL="$BASE_PREFIX/rv64i"

echo "[build] Base install prefix: $BASE_PREFIX"
[[ -z "$ONLY" || "$ONLY" == "rv32" ]] && echo "[build]  - rv32 -> $RV32_INSTALL"
[[ -z "$ONLY" || "$ONLY" == "rv64" ]] && echo "[build]  - rv64 -> $RV64_INSTALL"
mkdir -p "$BASE_PREFIX"

# -------- jobs --------
if command -v nproc >/dev/null 2>&1; then
  JOBS="$(nproc)"
elif command -v sysctl >/dev/null 2>&1; then
  JOBS="$(sysctl -n hw.ncpu || echo 1)"
else
  JOBS=1
fi
echo "[build] Using jobs: $JOBS"

# -------- sources --------
TOOLCHAIN_SRC="$REPO_ROOT/riscv-gnu-toolchain"
QEMU_SRC="$REPO_ROOT/qemu"
[[ -d "$TOOLCHAIN_SRC" ]] || { echo "ERROR: 'riscv-gnu-toolchain' not found. Run ./setup.sh first."; exit 1; }
[[ -d "$QEMU_SRC" ]]      || { echo "ERROR: 'qemu' not found. Run ./setup.sh first."; exit 1; }

# -------- helpers --------
build_toolchain() {
  local arch="$1" abi="$2" prefix="$3" multilib="$4"
  local bdir="$REPO_ROOT/build-gnu-$arch"

  echo "[toolchain] ===== $arch / $abi -> $prefix ====="
  mkdir -p "$bdir"
  pushd "$bdir" >/dev/null
  "$TOOLCHAIN_SRC/configure" \
    --prefix="$prefix" \
    --with-arch="$arch" \
    --with-abi="$abi" \
    --with-multilib-generator="$multilib"
  make -j"$JOBS"
  make install
  popd >/dev/null
}

build_qemu() {
  local targets="$1" prefix="$2"
  local bdir="$REPO_ROOT/build-qemu-${targets%%,*}"
  echo "[qemu] ===== targets:$targets -> $prefix ====="
  mkdir -p "$bdir"
  pushd "$bdir" >/dev/null
  "$QEMU_SRC/configure" \
    --target-list="$targets" \
    --prefix="$prefix" \
    --disable-werror
  make -j"$JOBS"
  make install
  popd >/dev/null
}

# -------- rv32 --------
if [[ -z "$ONLY" || "$ONLY" == "rv32" ]]; then
  mkdir -p "$RV32_INSTALL"
  build_toolchain "rv32i" "ilp32" "$RV32_INSTALL" \
    "rv32i-ilp32--;rv32im-ilp32--;rv32ima-ilp32--;rv32imafd-ilp32--"
  build_qemu "riscv32-softmmu" "$RV32_INSTALL"
fi

# -------- rv64 --------
if [[ -z "$ONLY" || "$ONLY" == "rv64" ]]; then
  mkdir -p "$RV64_INSTALL"
  build_toolchain "rv64i" "lp64" "$RV64_INSTALL" \
    "rv64i-lp64--;rv64im-lp64--;rv64ima-lp64--;rv64imafd-lp64d--"
  build_qemu "riscv64-softmmu" "$RV64_INSTALL"
fi

cat <<EOF

[build] Done.

Add to PATH if not already:
$([[ -z "$ONLY" || "$ONLY" == "rv32" ]] && echo "  export PATH=\"$RV32_INSTALL/bin:\$PATH\"")
$([[ -z "$ONLY" || "$ONLY" == "rv64" ]] && echo "  export PATH=\"$RV64_INSTALL/bin:\$PATH\"")

Then verify:
$([[ -z "$ONLY" || "$ONLY" == "rv32" ]] && echo "  which riscv32-unknown-elf-gcc && which qemu-system-riscv32")
$([[ -z "$ONLY" || "$ONLY" == "rv64" ]] && echo "  which riscv64-unknown-elf-gcc && which qemu-system-riscv64")

EOF
