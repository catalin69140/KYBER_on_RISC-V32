#!/usr/bin/env python3
import argparse
import json
import os
import shlex
import subprocess
from collections import defaultdict
from pathlib import Path


def load_commands(log_path):
    """
    Optional: load build_trace.jsonl to show which make commands ran.
    """
    cmds = []
    p = Path(log_path)
    if not p.exists():
        return cmds
    with p.open() as f:
        for idx, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            cmd = entry.get("cmd")
            if isinstance(cmd, str):
                cmd = shlex.split(cmd)
            cmds.append(
                {
                    "index": idx,
                    "cwd": entry.get("cwd"),
                    "cmd": cmd,
                    "env": entry.get("env", {}),
                }
            )
    return cmds


def find_elfs(root):
    """
    Find all .elf files under root.
    """
    root = Path(root)
    return sorted(root.rglob("*.elf"))


def parse_depfile(path):
    """
    Parse a GCC-generated .d file (dependency file).

    Typical format:
      obj/file.o: src/file.c header1.h header2.h \
                  header3.h ...

    Returns a list of dependency paths (including the .c/.S source).
    """
    text = Path(path).read_text()
    # Join backslash-continued lines
    text = text.replace("\\\n", " ")
    parts = text.split(":")
    if len(parts) < 2:
        return []
    deps_part = ":".join(parts[1:])
    tokens = shlex.split(deps_part)
    return tokens


def nm_defined_funcs(obj_or_elf, tool="riscv32-unknown-elf-nm"):
    """
    Run 'nm' on an object or ELF and return a list of defined function names.
    """
    try:
        res = subprocess.run(
            [tool, "-C", "--defined-only", obj_or_elf],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return []

    funcs = []
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 3:
            _, typecode, name = parts[0], parts[1], parts[2]
            if typecode.upper() in ("T", "W"):
                funcs.append(name)
    return funcs


def parse_map_for_objects(map_path):
    """
    Very simple map parser: collect object files mentioned in the map file.

    GNU ld map files contain lines like:
      .text          0x00000000       0x1234 obj/file.o

    We'll grab the last 'word' on lines that look like they end with '.o'.
    """
    objs = set()
    for line in Path(map_path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith(("#", "Linker script and memory map")):
            continue
        parts = line.split()
        if not parts:
            continue
        last = parts[-1]
        if last.endswith(".o"):
            objs.add(last)
    return sorted(objs)


def build_report(root, log_path, dot_path=None, nm_tool=None):
    root = Path(root)
    cmds = load_commands(log_path)
    elfs = find_elfs(root)

    if not elfs:
        print("No .elf files found under", root)
        return

    dot_lines = None
    if dot_path:
        dot_lines = [
            "digraph Build {",
            "  rankdir=LR;",
            '  node [shape=box,fontname="Helvetica"];',
        ]

    # Optional: show which make commands ran
    if cmds:
        print("Commands recorded in build_trace.jsonl:")
        for c in cmds:
            if c["cmd"] and c["cmd"][0] == "make":
                print(f"  #{c['index']} @ {c['cwd']}: {' '.join(c['cmd'])}")
        print()

    for elf in elfs:
        elf = elf.resolve()
        print("=" * 80)
        print(f"ELF: {elf}")

        # Try to find a matching map file (same dir, .map extension)
        map_path = elf.with_suffix(elf.suffix + ".map")  # e.g. foo.elf.map
        if not map_path.exists():
            # fallback: foo.map
            map_path = elf.with_suffix(".map")

        if map_path.exists():
            print(f"Map file: {map_path}")
            obj_names = parse_map_for_objects(map_path)
        else:
            print("Map file: (none found)")
            obj_names = []

        # Try to resolve object paths: map usually contains basenames or relative paths.
        # We'll search under root for matches.
        all_obj_files = {p.name: p for p in root.rglob("*.o")}
        resolved_objs = []
        for on in obj_names:
            # exact basename match
            base = os.path.basename(on)
            p = all_obj_files.get(base)
            if p:
                resolved_objs.append(p.resolve())
            else:
                # best-effort: treat path as given in map
                resolved_objs.append(Path(on).resolve())

        if not resolved_objs and obj_names:
            # In case they were all paths, not basenames
            resolved_objs = [Path(on).resolve() for on in obj_names]

        if not resolved_objs:
            print("  (No object files parsed from map; reporting will be limited.)")

        obj_to_sources = defaultdict(list)
        source_to_headers = defaultdict(set)
        source_to_funcs = defaultdict(list)

        # Gather sources + headers from .d files
        for obj in resolved_objs:
            dep = obj.with_suffix(".d")
            if dep.exists():
                deps = parse_depfile(dep)
                if deps:
                    # First token often is the target (obj file); skip it if so.
                    deps = [d for d in deps if d != str(obj)]
                    for d in deps:
                        if d.endswith((".c", ".C", ".cc", ".cpp", ".S", ".s")):
                            obj_to_sources[str(obj)].append(d)
                        else:
                            for s in obj_to_sources[str(obj)] or [None]:
                                if s:
                                    source_to_headers[s].add(d)

        # Gather functions from objects (or from ELF if we have no map)
        if nm_tool:
            if resolved_objs:
                for obj in resolved_objs:
                    funcs = nm_defined_funcs(str(obj), nm_tool)
                    for s in obj_to_sources.get(str(obj), []) or [None]:
                        if s:
                            source_to_funcs[s].extend(funcs)
            else:
                # Fallback: no map/objs → list functions directly from ELF
                funcs = nm_defined_funcs(str(elf), nm_tool)
                if funcs:
                    source_to_funcs[str(elf)] = funcs

        # ----- Textual report -----
        if resolved_objs:
            for obj in resolved_objs:
                print()
                print(f"  Object: {obj}")
                srcs = obj_to_sources.get(str(obj)) or []
                if srcs:
                    for s in srcs:
                        print(f"    Source: {s}")
                        headers = sorted(source_to_headers.get(s, []))
                        if headers:
                            print("      Headers:")
                            for h in headers:
                                print(f"        {h}")
                        funcs = source_to_funcs.get(s, [])
                        if funcs:
                            print("      Functions (from nm):")
                            for fn in sorted(set(funcs)):
                                print(f"        {fn}")
                else:
                    print("    (No .d file or could not resolve sources)")
        else:
            # No objects resolved; just show functions from ELF if we have them
            if source_to_funcs:
                print()
                print("  Functions in ELF (no object/source mapping):")
                for fn in sorted(set(next(iter(source_to_funcs.values())))):
                    print(f"    {fn}")

        # ----- Graphviz graph -----
        if dot_path and dot_lines is not None:
            elf_id = str(elf).replace(os.sep, "_").replace(".", "_")
            dot_lines.append(
                f'  "{elf_id}" [label="{elf.name}",shape=ellipse,style=filled];'
            )

            for obj in resolved_objs:
                obj = obj.resolve()
                obj_id = str(obj).replace(os.sep, "_").replace(".", "_")
                dot_lines.append(
                    f'  "{obj_id}" [label="{obj.name}"];'
                )
                dot_lines.append(f'  "{obj_id}" -> "{elf_id}";')

                for s in obj_to_sources.get(str(obj), []):
                    sid = s.replace(os.sep, "_").replace(".", "_")
                    dot_lines.append(
                        f'  "{sid}" [label="{os.path.basename(s)}",shape=note];'
                    )
                    dot_lines.append(f'  "{sid}" -> "{obj_id}";')

    if dot_path and dot_lines is not None:
        dot_lines.append("}")
        Path(dot_path).write_text("\n".join(dot_lines))
        print()
        print(f"Wrote Graphviz graph to {dot_path}. Render it with, e.g.:")
        print(f"  dot -Tpng {dot_path} -o build_graph.png")


def main():
    ap = argparse.ArgumentParser(
        description=(
            "Analyze built ELF files and reconstruct how they were created: "
            "object files, sources, headers, and functions."
        )
    )
    ap.add_argument(
        "--root",
        default=".",
        help="Root directory to scan for .elf files (default: current directory).",
    )
    ap.add_argument(
        "--log",
        default="build_trace.jsonl",
        help="Optional JSONL log from build_everything.py (default: build_trace.jsonl)",
    )
    ap.add_argument(
        "--dot",
        help="Optional Graphviz .dot output file (ELF <- objs <- sources graph).",
    )
    ap.add_argument(
        "--nm-tool",
        help="Optional nm executable (e.g. riscv32-unknown-elf-nm) to list functions.",
    )
    args = ap.parse_args()

    build_report(args.root, args.log, args.dot, args.nm_tool)


if __name__ == "__main__":
    main()
