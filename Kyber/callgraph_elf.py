#!/usr/bin/env python3
import argparse
import subprocess
from collections import defaultdict, deque
from pathlib import Path
import os
import re


def run_cmd(cmd):
    return subprocess.run(
        cmd,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    ).stdout


def build_symbol_table(elf, nm_tool):
    """
    Return:
      - sym2addr:  name -> address(hex string "0x8000...")
      - addr2sym:  address string -> name
    Only for code symbols (T/W).
    """
    out = run_cmd([nm_tool, "-C", "--defined-only", "-n", elf])
    sym2addr = {}
    addr2sym = {}
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        addr_str, typecode, name = parts[0], parts[1], parts[2]
        if typecode.upper() in ("T", "W"):
            addr = "0x" + addr_str.lstrip("0x")
            sym2addr[name] = addr
            addr2sym[addr] = name
    return sym2addr, addr2sym


def build_call_graph(elf, objdump_tool):
    """
    Parse objdump -d -C output, build call graph as adjacency:
      caller -> set(callee)
    """
    out = run_cmd([objdump_tool, "-d", "-C", elf])
    cg = defaultdict(set)
    current_func = None

    # match lines like: 800001c8 <main>:
    func_header_re = re.compile(r"^[0-9a-fA-F]+\s+<([^>]+)>:")  # function label

    for line in out.splitlines():
        line = line.rstrip()
        # Detect function header
        m = func_header_re.match(line.strip())
        if m:
            current_func = m.group(1)
            continue

        if current_func is None:
            continue

        # Look for calls with 'jal' or 'jalr' and a symbol <...>
        if "jal" in line:
            if "<" in line and ">" in line:
                callee = line.split("<", 1)[1].split(">", 1)[0]
                # strip PLT-like suffixes if any (not common here)
                callee = callee.strip()
                if callee:
                    cg[current_func].add(callee)

    return cg


def addr2line_for_symbol(elf, addr, addr2line_tool):
    """
    Use addr2line to get (file, line) for given address.
    """
    out = run_cmd([addr2line_tool, "-C", "-e", elf, addr])
    lines = out.splitlines()
    if not lines:
        return ("??", 0)
    file_line = lines[-1].strip()  # usually "path/file.c:123"
    if ":" in file_line:
        file, ln = file_line.rsplit(":", 1)
        try:
            ln = int(ln)
        except ValueError:
            ln = 0
    else:
        file, ln = file_line, 0
    return (file, ln)


def classify_symbol_files(elf, sym2addr, addr2line_tool, project_root):
    """
    For each symbol, find its source file and mark whether it's in the project or external.
    Returns:
      - sym2file: name -> (file, line)
      - project_syms: set of symbols whose file is under project_root
    """
    sym2file = {}
    project_syms = set()
    for name, addr in sym2addr.items():
        file, line = addr2line_for_symbol(elf, addr, addr2line_tool)
        sym2file[name] = (file, line)
        try:
            full = Path(file).resolve()
        except Exception:
            continue
        if str(full).startswith(str(project_root.resolve())):
            project_syms.add(name)
    return sym2file, project_syms


def bfs_from_main(cg, root="main"):
    """
    BFS traversal from root, returns (order, parents).
      - order: list of visited symbols
      - parents: symbol -> parent symbol (for tree view)
    """
    visited = set()
    parents = {}
    order = []

    if root not in cg:
        # root may not have outgoing edges but might still exist as symbol
        if root not in cg:
            return [], {}
    q = deque([root])
    visited.add(root)

    while q:
        f = q.popleft()
        order.append(f)
        for callee in cg.get(f, []):
            if callee not in visited:
                visited.add(callee)
                parents[callee] = f
                q.append(callee)

    return order, parents


def print_tree(elf, cg, sym2file, project_syms, root_func):
    """
    Print a call tree from root_func, highlighting project vs external.
    """

    order, parents = bfs_from_main(cg, root_func)
    if not order:
        print(f"[!] No calls found starting from {root_func}")
        return

    print(f"Call graph starting from {root_func}:\n")
    # build children map from parents
    children = defaultdict(list)
    for child, parent in parents.items():
        children[parent].append(child)

    def is_project(f):
        return f in project_syms

    def print_subtree(f, indent="", seen=None):
        if seen is None:
            seen = set()
        marker = "[P]" if is_project(f) else "[EXT]"
        file, line = sym2file.get(f, ("??", 0))
        loc = ""
        if file != "??":
            loc = f" ({Path(file).name}:{line})"
        print(f"{indent}{marker} {f}{loc}")
        if f in seen:
            print(f"{indent}  (recursion/cycle)")
            return
        seen.add(f)
        for c in sorted(children.get(f, [])):
            print_subtree(c, indent + "  ", seen)

    print_subtree(root_func)


def write_dot(elf, cg, sym2file, project_syms, dot_path, root_func="main"):
    """
    Write a Graphviz .dot call graph, starting from root_func.
    """
    order, _ = bfs_from_main(cg, root_func)
    if not order:
        print(f"[!] No calls found from {root_func}, not writing dot.")
        return

    with open(dot_path, "w") as f:
        f.write("digraph CallGraph {\n")
        f.write('  rankdir=LR;\n')
        f.write('  node [fontname="Helvetica"];\n')

        def node_attrs(sym):
            file, line = sym2file.get(sym, ("??", 0))
            if sym in project_syms:
                shape = "box"
                style = "filled"
                fillcolor = "lightgray"
            else:
                shape = "ellipse"
                style = "dotted"
                fillcolor = "white"
            label = sym
            if file != "??":
                label += f"\\n{Path(file).name}:{line}"
            return shape, style, fillcolor, label

        # nodes
        for sym in order:
            shape, style, fillcolor, label = node_attrs(sym)
            f.write(
                f'  "{sym}" [shape={shape},style="{style}",fillcolor="{fillcolor}",label="{label}"];\n'
            )

        # edges
        for caller in order:
            for callee in cg.get(caller, []):
                if callee in order:
                    f.write(f'  "{caller}" -> "{callee}";\n')

        f.write("}\n")

    print(f"Wrote call graph to {dot_path}. Render with:")
    print(f"  dot -Tpng {dot_path} -o callgraph.png")


def main():
    ap = argparse.ArgumentParser(
        description="Build a call graph from a RISC-V ELF using objdump + debug info."
    )
    ap.add_argument("elf", help="Path to ELF file")
    ap.add_argument(
        "--nm-tool",
        default="riscv32-unknown-elf-nm",
        help="nm executable (default: riscv32-unknown-elf-nm)",
    )
    ap.add_argument(
        "--objdump-tool",
        default="riscv32-unknown-elf-objdump",
        help="objdump executable (default: riscv32-unknown-elf-objdump)",
    )
    ap.add_argument(
        "--addr2line-tool",
        default="riscv32-unknown-elf-addr2line",
        help="addr2line executable (default: riscv32-unknown-elf-addr2line)",
    )
    ap.add_argument(
        "--root-func",
        default="main",
        help="Root function for the call graph (default: main)",
    )
    ap.add_argument(
        "--dot",
        help="Optional Graphviz .dot output file for the call graph",
    )
    args = ap.parse_args()

    elf = Path(args.elf).resolve()
    if not elf.exists():
        print(f"[!] ELF not found: {elf}")
        return

    project_root = Path(".").resolve()

    sym2addr, addr2sym = build_symbol_table(str(elf), args.nm_tool)
    cg = build_call_graph(str(elf), args.objdump_tool)
    sym2file, project_syms = classify_symbol_files(
        str(elf), sym2addr, args.addr2line_tool, project_root
    )

    print(f"ELF: {elf}\n")
    print_tree(str(elf), cg, sym2file, project_syms, args.root_func)

    if args.dot:
        write_dot(str(elf), cg, sym2file, project_syms, args.dot, args.root_func)


if __name__ == "__main__":
    main()
