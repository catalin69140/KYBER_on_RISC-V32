#!/usr/bin/env python3
import argparse
import subprocess
from collections import defaultdict
from pathlib import Path


def nm_functions(elf, nm_tool):
    """
    Return list of (addr_hex, name) for text/weak-text symbols in ELF.
    """
    try:
        res = subprocess.run(
            [nm_tool, "-C", "--defined-only", elf],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as e:
        print(f"[!] nm failed on {elf}: {e}")
        return []

    funcs = []
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        addr_str, typecode, name = parts[0], parts[1], parts[2]
        if typecode.upper() in ("T", "W"):  # code / weak code
            # addr is already hex (e.g. 00001000)
            addr = "0x" + addr_str.lstrip("0x")
            funcs.append((addr, name))
    return funcs


def addr2line_info(elf, addr, addr2line_tool):
    """
    Run addr2line for a single address, return (func_name, file, line).
    """
    try:
        res = subprocess.run(
            [addr2line_tool, "-C", "-f", "-e", elf, addr],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return ("??", "??", 0)

    lines = res.stdout.splitlines()
    if len(lines) < 2:
        return ("??", "??", 0)

    func_name = lines[0].strip()
    file_line = lines[1].strip()  # "path/file.c:123" or "??:0"

    if ":" in file_line:
        file, line_str = file_line.rsplit(":", 1)
        try:
            line = int(line_str)
        except ValueError:
            line = 0
    else:
        file, line = file_line, 0

    return (func_name, file, line)


def analyze_elf(elf_path, nm_tool, addr2line_tool):
    elf = Path(elf_path).resolve()
    if not elf.exists():
        print(f"[!] ELF not found: {elf}")
        return

    print("=" * 80)
    print(f"ELF: {elf}")
    print()

    funcs = nm_functions(str(elf), nm_tool)
    if not funcs:
        print("No functions found by nm (did you build with DEBUG=1 ?)")
        return

    # Group by source file
    per_file = defaultdict(list)

    for addr, sym_name in funcs:
        demangled_name, file, line = addr2line_info(str(elf), addr, addr2line_tool)
        # Sometimes sym_name == demangled_name, sometimes not; keep both.
        per_file[file].append(
            {
                "addr": addr,
                "sym_name": sym_name,
                "func_name": demangled_name,
                "line": line,
            }
        )

    # Pretty print
    for file, entries in sorted(per_file.items()):
        print(f"File: {file}")
        for e in sorted(entries, key=lambda x: (x["line"], x["addr"])):
            name_display = e["func_name"]
            if e["func_name"] != e["sym_name"]:
                name_display += f"  (symbol: {e['sym_name']})"
            line_info = f":{e['line']}" if e["line"] else ""
            print(f"  {name_display}{line_info}  @ {e['addr']}")
        print()


def main():
    ap = argparse.ArgumentParser(
        description=(
            "Analyze a RISC-V ELF using debug info to show which functions "
            "and source files it contains."
        )
    )
    ap.add_argument("elf", help="Path to ELF file to analyze")
    ap.add_argument(
        "--nm-tool",
        default="riscv32-unknown-elf-nm",
        help="nm executable (default: riscv32-unknown-elf-nm)",
    )
    ap.add_argument(
        "--addr2line-tool",
        default="riscv32-unknown-elf-addr2line",
        help="addr2line executable (default: riscv32-unknown-elf-addr2line)",
    )
    args = ap.parse_args()

    analyze_elf(args.elf, args.nm_tool, args.addr2line_tool)


if __name__ == "__main__":
    main()
