#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# setup.sh
#
# Purpose
#   One-command bootstrap for this repo on Ubuntu:
#     1) Install host dependencies (idempotent).
#     2) Initialize & update submodules to pinned commits.
#     3) Build and install rv32i and/or rv64i GNU toolchains + QEMU.
#     4) PATH wiring (adds/removes arch-specific bin dirs).
#
# Usage
#   ./setup.sh                          # build both rv32 & rv64 into default base
#   ./setup.sh --only-rv32              # build only rv32
#   ./setup.sh --only-rv64              # build only rv64
#   ./setup.sh --delete-rv32            # remove rv32 install and PATH line
#   ./setup.sh --delete-rv64            # remove rv64 install and PATH line
#   ./setup.sh --delete-all             # remove both installs and PATH lines
#   ./setup.sh /custom/prefix           # base prefix (contains rv32i/ and rv64i/)
#   ./setup.sh --prefix=/custom/prefix  # same as above
# -----------------------------------------------------------------------------

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_BASE_PREFIX="$(cd "$REPO_ROOT/.." && pwd)/riscv/install"

# -------- arg parse --------
INSTALL_BASE=""
ONLY=""
DELETE_MODE=""

print_usage() {
  sed -n '1,200p' "$0" | sed -n '1,35p'
  cat <<USAGE

Options:
  --only-rv32            Build only rv32
  --only-rv64            Build only rv64
  --delete-rv32          Delete rv32 install and PATH line
  --delete-rv64          Delete rv64 install and PATH line
  --delete-all           Delete both installs and PATH lines
  --prefix=/path         Set base install directory (contains rv32i/ and rv64i/)
  -h, --help             Show this help
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --only-rv32) ONLY="rv32" ;;
    --only-rv64) ONLY="rv64" ;;
    --delete-rv32|--delete-rv64|--delete-all) DELETE_MODE="$arg" ;;
    --prefix=*) INSTALL_BASE="${arg#--prefix=}" ;;
    -h|--help) print_usage; exit 0 ;;
    --*) echo "Unknown option: $arg"; print_usage; exit 2 ;;
    *)  # positional base prefix
        [[ -z "$INSTALL_BASE" ]] && INSTALL_BASE="$arg" || { echo "Unexpected arg: $arg"; exit 2; }
        ;;
  esac
done

if [[ -z "${INSTALL_BASE:-}" ]]; then
  INSTALL_BASE="${PREFIX:-$DEFAULT_BASE_PREFIX}"
fi

RV32_DIR="$INSTALL_BASE/rv32i"
RV64_DIR="$INSTALL_BASE/rv64i"

# Determine parallelism (used for submodule jobs)
if command -v nproc >/dev/null 2>&1; then
  JOBS="$(nproc)"
else
  JOBS=4
fi

# -------- helpers --------
remove_path_line() {
  local dir="$1"
  local line="export PATH=\"$dir/bin:\$PATH\""
  if [[ -f "$HOME/.bashrc" ]]; then
    if grep -qxF "$line" "$HOME/.bashrc"; then
      # Remove exact matching line
      sed -i.bak "\|^$(printf '%s' "$line" | sed 's/[^^]/[&]/g; s/\^/\\^/g')\$|d" "$HOME/.bashrc"
      echo "[setup] Removed PATH line for $dir from ~/.bashrc"
    fi
  fi
}

delete_tree() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    rm -rf "$dir"
    echo "[setup] Deleted: $dir"
  else
    echo "[setup] Skip delete (not found): $dir"
  fi
}

# -------- delete modes --------
if [[ -n "$DELETE_MODE" ]]; then
  echo "[setup] Delete mode requested: $DELETE_MODE"
  case "$DELETE_MODE" in
    --delete-rv32)
      delete_tree "$RV32_DIR"
      remove_path_line "$RV32_DIR"
      ;;
    --delete-rv64)
      delete_tree "$RV64_DIR"
      remove_path_line "$RV64_DIR"
      ;;
    --delete-all)
      delete_tree "$RV32_DIR"
      delete_tree "$RV64_DIR"
      remove_path_line "$RV32_DIR"
      remove_path_line "$RV64_DIR"
      ;;
  esac
  echo "[setup] Done (delete mode). Open a new shell or run: source ~/.bashrc"
  exit 0
fi

echo "[setup] Will install into:"
if [[ -z "$ONLY" || "$ONLY" == "rv32" ]]; then echo "        - rv32: $RV32_DIR"; fi
if [[ -z "$ONLY" || "$ONLY" == "rv64" ]]; then echo "        - rv64: $RV64_DIR"; fi

# 1) Deps
echo "[1/4] Installing OS dependencies..."
"$REPO_ROOT/installdeps-gnu.sh"

# 2) Sources
echo "[2/4] Ensuring sources exist..."
git submodule sync --recursive

if [[ "${FORCE_HTTPS:-0}" == "1" ]]; then
  echo "[setup] Rewriting submodule URLs to HTTPS locally…"
  git -c protocol.file.allow=always submodule foreach --recursive '
    url=$(git config --file "$toplevel/.gitmodules" --get "submodule.$name.url" || true)
    if [[ -n "$url" && "$url" =~ ^git@github\.com: ]]; then
      https_url="https://github.com/${url#git@github.com:}"
      git config --file "$toplevel/.gitmodules" "submodule.$name.url" "$https_url"
      echo "  - $name: $url -> $https_url"
    fi
  ' || true
  git submodule sync --recursive
fi

echo "[setup] Checking submodule branch tracking…"
while IFS=$'\n' read -r line; do
  key="${line%% *}"; branch="${line#* }"
  base="${key%.branch}"
  path="$(git config -f .gitmodules "$base.path" || true)"
  [[ -z "$path" ]] && continue
  if [[ -d "$path/.git" ]]; then
    ( cd "$path"
      git fetch origin --prune >/dev/null 2>&1 || true
      if ! git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        echo "[warn] Submodule '$path' tracks '$branch' but origin/$branch not found. Falling back to pinned commit if needed."
      fi
    )
  fi
done < <(git config -f .gitmodules --get-regexp '^submodule\..*\.branch' || true)

echo "[setup] Updating submodules to latest upstream (with fallback)…"
if ! git submodule update --init --recursive --remote --jobs="$JOBS"; then
  echo "[setup] --remote failed. Falling back to pinned commits…"
  git submodule deinit -f --all || true
  git submodule update --init --recursive --jobs="$JOBS"
fi

echo "[setup] Submodule status:"
git submodule status --recursive || true

# 3) Build (filters passed through)
echo "[3/4] Building toolchains + QEMU…"
BUILD_ARGS=("$INSTALL_BASE")
[[ "$ONLY" == "rv32" ]] && BUILD_ARGS+=("--only-rv32")
[[ "$ONLY" == "rv64" ]] && BUILD_ARGS+=("--only-rv64")
"$REPO_ROOT/buildall-gnu.sh" "${BUILD_ARGS[@]}"

# 4) PATH wiring
echo "[4/4] Updating PATH in ~/.bashrc (idempotent)..."
added_any=0
if [[ -z "$ONLY" || "$ONLY" == "rv32" ]]; then
  RV32_LINE="export PATH=\"$RV32_DIR/bin:\$PATH\""
  grep -qxF "$RV32_LINE" "$HOME/.bashrc" || { echo "$RV32_LINE" >> "$HOME/.bashrc"; added_any=1; }
  export PATH="$RV32_DIR/bin:$PATH"
fi
if [[ -z "$ONLY" || "$ONLY" == "rv64" ]]; then
  RV64_LINE="export PATH=\"$RV64_DIR/bin:\$PATH\""
  grep -qxF "$RV64_LINE" "$HOME/.bashrc" || { echo "$RV64_LINE" >> "$HOME/.bashrc"; added_any=1; }
  export PATH="$RV64_DIR/bin:$PATH"
fi

echo
echo "[setup] Done."
[[ "$added_any" == "1" ]] && echo "Open a new shell or run: source ~/.bashrc"
echo
echo "Verify:"
[[ -z "$ONLY" || "$ONLY" == "rv32" ]] && echo "  which riscv32-unknown-elf-gcc && which qemu-system-riscv32"
[[ -z "$ONLY" || "$ONLY" == "rv64" ]] && echo "  which riscv64-unknown-elf-gcc && which qemu-system-riscv64"
