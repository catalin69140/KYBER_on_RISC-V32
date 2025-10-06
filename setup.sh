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

# Determine parallelism
if command -v nproc >/dev/null 2>&1; then
  JOBS="$(nproc)"
else
  JOBS=4
fi

echo "[setup] Will install into: $INSTALL_DIR"

# 1) Deps
echo "[1/4] Installing OS dependencies..."
"$REPO_ROOT/installdeps-gnu.sh"

# 2) Sources (submodules or shallow clones)
echo "[2/4] Ensuring sources exist..."

# Always sync submodule URLs/config (prevents stale/renamed issues)
git submodule sync --recursive

# Optional: flag to force HTTPS remotes for submodules (CI or no SSH keys)
#   Use: FORCE_HTTPS=1 ./setup.sh
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
  # Re-sync after rewriting
  git submodule sync --recursive
fi

# Diagnostic: warn if a submodule’s configured branch doesn’t exist upstream
echo "[setup] Checking submodule branch tracking…"
while IFS=$'\n' read -r line; do
  key="${line%% *}"; branch="${line#* }"                 # key like submodule.X.branch
  base="${key%.branch}"
  path="$(git config -f .gitmodules "$base.path" || true)"
  [[ -z "$path" ]] && continue
  if [[ -d "$path/.git" ]]; then
    ( cd "$path"
      git fetch origin --prune >/dev/null 2>&1 || true
      if ! git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        echo "[warn] Submodule '$path' tracks '$branch' but origin/$branch not found. --remote may fail; will fall back to pinned commit."
      fi
    )
  fi
done < <(git config -f .gitmodules --get-regexp '^submodule\..*\.branch' || true)

# Try to pull latest upstream first; if that fails, fall back to pinned commits.
echo "[setup] Updating submodules to latest upstream (with fallback)…"
if ! git submodule update --init --recursive --remote --jobs="$JOBS"; then
  echo "[setup] --remote failed (likely missing/renamed branch). Falling back to pinned commits…"
  # Clean half-updated states (best effort)
  git submodule deinit -f --all || true
  git submodule update --init --recursive --jobs="$JOBS"
fi

# Show final status markers: ' ' ok, '-' uninit, '+' different commit, 'U' conflict
echo "[setup] Submodule status:"
git submodule status --recursive || true

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
