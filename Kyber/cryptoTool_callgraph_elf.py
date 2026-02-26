#!/usr/bin/env python3
import argparse
import subprocess
from collections import defaultdict, deque
from pathlib import Path
import re
import json


def run_cmd(cmd):
    return subprocess.run(
        cmd,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    ).stdout


def build_symbol_table(elf, nm_tool):
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
    out = run_cmd([objdump_tool, "-d", "-C", elf])
    cg = defaultdict(set)
    current_func = None

    func_header_re = re.compile(r"^[0-9a-fA-F]+\s+<([^>]+)>:")

    for line in out.splitlines():
        line = line.rstrip()
        m = func_header_re.match(line.strip())
        if m:
            current_func = m.group(1)
            continue

        if current_func is None:
            continue

        if "jal" in line and "<" in line and ">" in line:
            callee = line.split("<", 1)[1].split(">", 1)[0].strip()
            if callee:
                cg[current_func].add(callee)

    return cg


def addr2line_for_symbol(elf, addr, addr2line_tool):
    out = run_cmd([addr2line_tool, "-C", "-e", elf, addr])
    lines = out.splitlines()
    if not lines:
        return ("??", 0)
    file_line = lines[-1].strip()
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
    sym2file = {}
    project_syms = set()
    proj_root_resolved = project_root.resolve()

    for name, addr in sym2addr.items():
        file, line = addr2line_for_symbol(elf, addr, addr2line_tool)
        sym2file[name] = (file, line)
        try:
            full = Path(file).resolve()
        except Exception:
            continue
        if str(full).startswith(str(proj_root_resolved)):
            project_syms.add(name)

    return sym2file, project_syms


def bfs_from_main(cg, root="main"):
    """
    BFS traversal from root.

    Returns:
      - order:  list of visited functions (in BFS order)
      - parents: child -> parent
      - depth: func -> distance from root (0 = root)
    """
    visited = set()
    parents = {}
    order = []
    depth = {}

    visited.add(root)
    depth[root] = 0
    q = deque([root])

    while q:
        f = q.popleft()
        order.append(f)
        for callee in cg.get(f, []):
            if callee not in visited:
                visited.add(callee)
                parents[callee] = f
                depth[callee] = depth[f] + 1
                q.append(callee)

    if not order:
        order.append(root)
        depth[root] = 0

    return order, parents, depth


def module_of_file(file, project_root):
    """
    Classify a source file into a logical module:
      - "impl"     : crypto_kem/kyber768/kyber768r1/*
      - "mupq"     : mupq/*
      - "common"   : common/* (including keccak, randombytes)
      - "hal"      : common/hal-*.c
      - "project"  : any other file under project root
      - "external" : outside project root or unknown
    """
    if file == "??":
        return "external"

    proj_root_resolved = project_root.resolve()
    try:
        full = Path(file).resolve()
        rel = full.relative_to(proj_root_resolved)
    except Exception:
        return "external"

    parts = rel.parts
    if len(parts) >= 3 and parts[0] == "crypto_kem" and parts[1] == "kyber768" and parts[2] == "kyber768r1":
        return "impl"
    if parts[0] == "mupq":
        return "mupq"
    if parts[0] == "common":
        if "hal-" in parts[-1]:
            return "hal"
        return "common"
    return "project"


def print_tree(elf, cg, sym2file, project_syms, root_func):
    order, parents, depth = bfs_from_main(cg, root_func)
    if not order:
        print(f"[!] No calls found starting from {root_func}")
        return

    print(f"Call graph starting from {root_func}:\n")
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
        d = depth.get(f, 0)
        loc = ""
        if file != "??":
            loc = f" ({file}:{line})"
        print(f"{indent}{marker} [d={d}] {f}{loc}")
        if f in seen:
            print(f"{indent}  (recursion/cycle)")
            return
        seen.add(f)
        for c in sorted(children.get(f, [])):
            print_subtree(c, indent + "  ", seen)

    print_subtree(root_func)


# ---------- DOT generation (for PNG and HTML) ----------

def generate_dot(elf, cg, sym2file, project_syms, root_func, project_root):
    order, _, depth = bfs_from_main(cg, root_func)
    if not order:
        return "digraph CallGraph {\\n}"

    proj_root_resolved = project_root.resolve()

    # Determine module for each symbol
    sym2module = {}
    for sym in order:
        file, _ = sym2file.get(sym, ("??", 0))
        sym2module[sym] = module_of_file(file, project_root)

    # Group symbols by module
    modules = defaultdict(list)
    for sym in order:
        modules[sym2module[sym]].append(sym)

    module_labels = {
        "impl": "Kyber768r1 implementation (core KEM operations)",
        "mupq": "MUPQ harness / benchmarks / tests",
        "common": "Common crypto primitives",
        "hal": "Platform HAL / board support",
        "project": "Other project code",
        "external": "Toolchain / libc / external",
    }

    def rel_path(file):
        if file == "??":
            return "??"
        try:
            full = Path(file).resolve()
            return str(full.relative_to(proj_root_resolved))
        except Exception:
            return file

    lines = []
    lines.append("digraph CallGraph {")
    lines.append("  rankdir=LR;")
    lines.append('  node [fontname="Helvetica"];')

    # ELF node
    elf_name = Path(elf).name
    elf_node_id = f"ELF::{elf_name}"
    lines.append(
        f'  "{elf_node_id}" [shape=doublecircle,style="bold",label="{elf_name}\\n(ELF root)"];'
    )
    lines.append(f'  "{elf_node_id}" -> "{root_func}";')

    # Clusters
    for module, syms in modules.items():
        if not syms:
            continue
        cluster_name = f"cluster_{module}"
        label = module_labels.get(module, module)
        lines.append(f"  subgraph {cluster_name} {{")
        lines.append(f'    label="{label}";')
        lines.append("    style=rounded;")

        for sym in syms:
            file, line = sym2file.get(sym, ("??", 0))
            rpath = rel_path(file)
            label_sym = sym
            if rpath != "??":
                label_sym += f"\\n{rpath}:{line}"
            else:
                label_sym += f"\\n{rpath}"

            if sym in project_syms:
                shape = "box"
                style = "filled"
                fillcolor = "lightgray"
            else:
                shape = "ellipse"
                style = "dotted"
                fillcolor = "white"

            lines.append(
                f'    "{sym}" [shape={shape},style="{style}",fillcolor="{fillcolor}",label="{label_sym}"];'
            )

        lines.append("  }")

    # Edges between visited nodes
    for caller in order:
        for callee in cg.get(caller, []):
            if callee in order:
                lines.append(f'  "{caller}" -> "{callee}";')

    lines.append("}")
    return "\n".join(lines)


def write_dot(elf, cg, sym2file, project_syms, dot_path, root_func, project_root):
    dot_text = generate_dot(elf, cg, sym2file, project_syms, root_func, project_root)
    Path(dot_path).write_text(dot_text)
    print(f"Wrote call graph to {dot_path}. Render with:")
    print(f"  dot -Tpng {dot_path} -o callgraph.png")


# ---------- HTML animation output ----------

def _js_escape(s: str) -> str:
    """Escape a Python string for safe use in JS string literal."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

TRACE_LINE = re.compile(r"^TRACE\|(?P<type>ENTER|EXIT|BUF|U32)\|(.+)$")

def parse_trace_log(path):
    steps = []
    stack = []
    buf_acc = {}  # (step_id, func, name) -> dict(len=?, chunks={off:hex})

    def kv_parse(rest):
        d = {}
        for part in rest.split("|"):
            if "=" in part:
                k,v = part.split("=",1)
                d[k] = v
        return d

    with open(path, "r", errors="ignore") as f:
        for line in f:
            line = line.strip()
            m = TRACE_LINE.match(line)
            if not m:
                continue
            typ = m.group("type")
            rest = line.split("|", 2)[2]
            kv = kv_parse(rest)

            if typ == "ENTER":
                func = kv.get("f","?")
                depth = int(kv.get("d","0"))
                step = {"id": len(steps), "func": func, "depth": depth, "vars": []}
                steps.append(step)
                stack.append(step["id"])

            elif typ == "EXIT":
                if stack:
                    stack.pop()

            elif typ == "BUF":
                if not stack:
                    continue
                step_id = stack[-1]
                func = kv.get("f","?")
                name = kv.get("n","?")
                total_len = int(kv.get("len","0"))
                off = int(kv.get("off","0"))
                hexdata = kv.get("hex","")

                key = (step_id, func, name)
                entry = buf_acc.setdefault(key, {"len": total_len, "chunks": {}})
                entry["chunks"][off] = hexdata

            elif typ == "U32":
                if not stack:
                    continue
                step_id = stack[-1]
                func = kv.get("f","?")
                name = kv.get("n","?")
                v = kv.get("v","0")
                steps[step_id]["vars"].append({"name": name, "type": "u32", "value": v})

    # finalize buffers: reconstruct full hex in order
    for (step_id, func, name), entry in buf_acc.items():
        # order chunks by offset
        full = "".join(entry["chunks"][off] for off in sorted(entry["chunks"].keys()))
        steps[step_id]["vars"].append({"name": name, "type": "buf", "len": entry["len"], "hex": full})

    return steps

def write_html_animation(
    elf,
    cg,
    sym2file,
    project_syms,
    html_path,
    root_func,
    project_root,
    trace_steps=None,
    steps_json=None,
    flow_spec=None,
    graph_dot_override_text=None,
):
    """
    Generate an HTML file that:
      - Uses Viz.js to render the same DOT as the PNG (same layout/structure)
      - Adds pan/zoom
      - Animates edges in BFS-ish order from main
      - Provides Play/Pause, Step Back, Step Forward, Speed controls
      - Provides a search box to find functions by name
      - Optional 'Follow line' that jumps the camera to each red edge
      - Node interactions:
          * Click a node to select/deselect it
          * Outgoing edges of the selected node can be highlighted (green)
          * Incoming edges of the selected node can be highlighted (blue)
          * Highlighting is controlled by two checkboxes in the UI
          * Double-click a node to start animation from its outgoing edges
          * Copy name and the path of the selected node to clipboard
    """
    order, _, _ = bfs_from_main(cg, root_func)
    if not order:
        print(f"[!] No calls found from {root_func}, not writing HTML.")
        return

    dot_text = graph_dot_override_text if graph_dot_override_text else generate_dot(
        elf, cg, sym2file, project_syms, root_func, project_root
    )
    dot_js = _js_escape(dot_text)

    # Edge order for animation, in BFS caller order
    edge_keys = []
    for caller in order:
        for callee in cg.get(caller, []):
            if callee in order:
                edge_keys.append(f"{caller}->{callee}")

    elf_name = Path(elf).name
    html_path = Path(html_path)

    # Map symbol -> "relative/path/file.c:line" for copyable paths
    proj_root_resolved = project_root.resolve()
    sym2path = {}
    for sym, (file, line) in sym2file.items():
        if file == "??":
            sym2path[sym] = "??"
        else:
            try:
                full = Path(file).resolve()
                rel = full.relative_to(proj_root_resolved)
                sym2path[sym] = f"{rel}:{line}"
            except Exception:
                sym2path[sym] = f"{file}:{line}"

    trace_json = json.dumps(trace_steps or [])

    with html_path.open("w") as f:
        f.write("<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n")
        f.write(f"<title>Call graph animation for {elf_name}</title>\n")
        f.write("<style>\n")

        f.write("html, body {\n")
        f.write("  margin: 0;\n")
        f.write("  padding: 0;\n")
        f.write("  height: 100%;\n")
        f.write("}\n")

        f.write("body {\n")
        f.write("  font-family: sans-serif;\n")
        f.write("  display: flex;\n")
        f.write("  flex-direction: column;\n")
        f.write("  height: 100vh;\n")
        f.write("}\n")

        f.write("#controls {\n")
        f.write("  padding: 8px 12px;\n")
        f.write("  border-bottom: 1px solid #ccc;\n")
        f.write("  display: flex;\n")
        f.write("  flex-wrap: wrap;\n")
        f.write("  align-items: center;\n")
        f.write("  gap: 6px;\n")
        f.write("}\n")

        f.write("#controls button {\n")
        f.write("  padding: 0.65em 1.2em;\n")
        f.write("  font-size: 1.25rem;\n")
        f.write("  border-radius: 6px;\n")
        f.write("  border: 1px solid #555;\n")
        f.write("  cursor: pointer;\n")
        f.write("}\n")

        f.write("#controls input[type=\"range\"] {\n")
        f.write("  vertical-align: middle;\n")
        f.write("}\n")

        f.write("#main-split {\n")
        f.write("  flex: 1;\n")
        f.write("  display: flex;\n")
        f.write("  min-height: 0;\n")  # important for scroll areas
        f.write("}\n")

        f.write("#trace-panel {\n")
        f.write("  width: 420px;\n")
        f.write("  border-right: 1px solid #ccc;\n")
        f.write("  display: flex;\n")
        f.write("  flex-direction: column;\n")
        f.write("  min-height: 0;\n")
        f.write("}\n")

        f.write("#trace-steps {\n")
        f.write("  flex: 1;\n")
        f.write("  overflow: auto;\n")
        f.write("  padding: 10px;\n")
        f.write("  min-height: 0;\n")
        f.write("}\n")

        f.write("#graph-container {\n")
        f.write("  flex: 1;\n")
        f.write("  width: auto;\n")
        f.write("  min-width: 0;\n")
        f.write("  min-height: 0;\n")
        f.write("  display: flex;\n")
        f.write("  background: #0b1220;\n")
        f.write("}\n")


        f.write("#graph {\n")
        f.write("  width: 100%;\n")
        f.write("  height: 100%;\n")
        f.write("  flex: 1 1 auto;\n")
        f.write("  min-width: 0;\n")
        f.write("  min-height: 0;\n")
        f.write("  display: flex;\n")
        f.write("  align-items: center;\n")
        f.write("  justify-content: center;\n")
        f.write("  overflow: auto;\n")
        f.write("  padding: 16px;\n")
        f.write("  box-sizing: border-box;\n")
        f.write("  background: #0b1220;\n")
        f.write("}\n")
        
        f.write("""
            /* === CrypTool-like layout (matches your HTML IDs) === */

            #main-split {
                flex: 1;
                display: flex;
                min-height: 0;
            }

            #left-panel {
                width: 420px;
                border-right: 1px solid #ccc;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            #tabs {
                display: flex;
                gap: 6px;
                padding: 8px 10px;
                border-bottom: 1px solid #ccc;
            }

            #tabs .tab {
                flex: 1;
                padding: 10px;
                border: 1px solid #555;
                border-radius: 8px;
                cursor: pointer;
                background: #f7f7f7;
                font-size: 16px;
                text-align: center;
                user-select: none;
            }

            #tabs .tab.active {
                background: #e6f0ff;
                border-color: #2b5cff;
            }

            #steps-container {
                flex: 1;
                min-height: 0;
                overflow: hidden;
            }

            /* each tab pane */
            .steps {
                height: 100%;
                overflow: auto;
                padding: 10px;
                box-sizing: border-box;
            }

            /* we’ll use these later when we render step cards */
            .step-item {
                border: 1px solid #bbb;
                border-radius: 10px;
                padding: 10px;
                cursor: pointer;
                background: white;
                margin-bottom: 8px;
            }

            .step-item.active {
                border-color: #ff9900;
                box-shadow: 0 0 0 2px rgba(255,153,0,0.2);
            }

            .step-title {
                font-weight: 700;
                margin-bottom: 6px;
            }

            .step-funcs {
                font-family: monospace;
                font-size: 12px;
                opacity: 0.8;
            }

            .vars {
                margin-top: 8px;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .var-chip {
                border: 1px solid #888;
                border-radius: 999px;
                padding: 4px 10px;
                font-family: monospace;
                font-size: 12px;
                cursor: pointer;
                background: #f3f3f3;
            }
            .var-chip { transition: transform 0.05s ease, filter 0.1s ease; }
            .var-chip:hover { filter: brightness(1.05); }
            .var-chip.active { outline: 3px solid rgba(255,255,255,0.6); transform: translateY(-1px); }

            .var-seed      { background:#ff8a00; color:#111; border-color:#ff8a00; } /* Random bytes/Seeds */
            .var-matrix    { background:#ff2ea6; color:#fff; border-color:#ff2ea6; } /* Matrix */
            .var-vector    { background:#8b2cff; color:#fff; border-color:#8b2cff; } /* Vector */
            .var-poly      { background:#1db954; color:#fff; border-color:#1db954; } /* Polynomial */
            .var-bytes     { background:#ffd400; color:#111; border-color:#ffd400; } /* Bytes */
            .var-calc      { background:#00bcd4; color:#111; border-color:#00bcd4; } /* Calculation */

            /* Old callgraph controls are hidden in the new reference-first layout */
            #controls,
            #node-info-container {
                display: none !important;
            }

            /* Primary reference diagram (recreated from the supplied image) */
            #graph .primary-ref-root {
                flex: 0 0 auto;
                width: auto;
                height: auto;
                min-width: 0;
                min-height: 0;
                max-width: none;
                max-height: none;
                display: block;
                background: #0b1220;
            }

            .ref-panel-frame {
                fill: #0d172a;
                stroke: #eef3ff;
                stroke-width: 2.2;
                rx: 8;
                ry: 8;
            }

            .ref-panel-titlebar {
                fill: #0a0f18;
                stroke: #eef3ff;
                stroke-width: 1.2;
            }

            .ref-panel-title {
                font-family: Georgia, "Times New Roman", serif;
                font-size: 15px;
                font-weight: 700;
                fill: #eef3ff;
                text-anchor: middle;
                dominant-baseline: middle;
            }

            .ref-node rect {
                fill: #1a2947;
                stroke: #8fb2ff;
                stroke-width: 1.5;
                rx: 6;
                ry: 6;
            }

            .ref-node text {
                font-family: Georgia, "Times New Roman", serif;
                font-size: 13px;
                fill: #f4f7ff;
                text-anchor: middle;
                dominant-baseline: middle;
                pointer-events: none;
            }

            .ref-node .sub {
                font-size: 10px;
                fill: #c8d4f8;
                font-family: sans-serif;
            }

            .ref-node.role-process rect { fill: #3a2d55; stroke: #b997f6; }
            .ref-node.role-data rect    { fill: #1c2f4f; stroke: #80b6ff; }
            .ref-node.role-input rect   { fill: #15362f; stroke: #43d17e; }
            .ref-node.role-output rect  { fill: #542f2f; stroke: #ff8f86; }
            .ref-node.role-usage rect   { fill: #3f5667; stroke: #bdd9ef; }
            .ref-node.role-random rect  { fill: #5e3b00; stroke: #ffb34e; }
            .ref-node.role-calc rect    { fill: #253f57; stroke: #5ee1ff; }

            .ref-node.step-highlight rect {
                stroke: #ffd76b !important;
                stroke-width: 3.2 !important;
                filter: drop-shadow(0 0 4px rgba(255, 215, 107, 0.45));
            }

            .ref-dk-group .outer,
            .ref-ekpke-group .outer {
                fill: #542f2f;
                stroke: #ff8f86;
                stroke-width: 1.5;
                rx: 6;
                ry: 6;
            }

            .ref-dk-group .header,
            .ref-ekpke-group .header {
                font-family: Georgia, "Times New Roman", serif;
                font-size: 14px;
                fill: #f4f7ff;
                text-anchor: middle;
                dominant-baseline: middle;
                font-style: italic;
                pointer-events: none;
            }

            .ref-dk-group .cell-sep,
            .ref-ekpke-group .cell-sep {
                stroke: #f0f4ff;
                stroke-width: 1.1;
                opacity: 0.85;
            }

            .ref-dk-group .cell-text,
            .ref-ekpke-group .cell-text {
                font-family: Georgia, "Times New Roman", serif;
                font-size: 12px;
                fill: #f4f7ff;
                text-anchor: middle;
                dominant-baseline: middle;
                pointer-events: none;
            }

            .ref-arrow {
                stroke: #e8efff;
                stroke-width: 1.7;
                fill: none;
                marker-end: url(#ref-arrow-head);
            }

            .ref-arrow-dashed {
                stroke-dasharray: 5 4;
            }

            .flow-node-rect {
                stroke: #d4dcff;
                stroke-width: 1.2;
                rx: 8;
            }

            .flow-node-label {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 11px;
                fill: #eef2ff;
                pointer-events: none;
            }

            .flow-node-func {
                font-family: sans-serif;
                font-size: 9px;
                fill: #b9c4ee;
                pointer-events: none;
            }

            .flow-node.active .flow-node-rect {
                stroke: #ffffff;
                stroke-width: 3;
                filter: brightness(1.12);
            }

            .flow-edge {
                stroke: #95a5ce;
                stroke-width: 1.3;
                fill: none;
                marker-end: url(#flow-arrow);
            }


            #variable-box {
                border-top: 1px solid #ccc;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            #variable-meta {
                font-family: monospace;
                font-size: 12px;
                color: #666;
            }

            #variable-hex {
                width: 100%;
                height: 140px;
                font-family: monospace;
                box-sizing: border-box;
            }
        """)
        
        f.write("</style>\n</head>\n<body>\n")

        f.write(f'<h3 style="font-size:20px; margin:10px 0;">Kyber KeyGen Reference Visualization for <code>{elf_name}</code></h3>\n')
        f.write(
            "<p>The central diagram is a recreated ML-KEM/Kyber KeyGen reference layout (based on the provided KeyGen flow image). "
            "Tabs only change the step documentation and variable details.</p>\n"
        )

        # Controls
        f.write("<div id=\"controls\">\n")
        f.write('<button id="btn-play">Play ▶️</button>\n')
        f.write('<button id="btn-play-backward">Play ◀️</button>\n')
        f.write('<button id="btn-pause">Pause ⏸</button>\n')
        f.write('<button id="btn-prev">Step Back</button>\n')
        f.write('<button id="btn-next">Step Forward</button>\n')

        f.write(
            '<label style="margin-left:10px;">Speed '
            '<input type="range" id="speed" min="0.25" max="3" step="0.25" value="1"> '
            '<span id="speed-value">1.0x</span></label>\n'
        )
        f.write(
            '<label style="margin-left:10px;">'
            '<input type="checkbox" id="follow-line"> Track Step'
            '</label>\n'
        )

        f.write(
            '<label style="margin-left:10px;">'
            '<input type="checkbox" id="highlight-outgoing" checked> Outgoing edges'
            '</label>\n'
        )
        f.write(
            '<label style="margin-left:10px; margin-right:50px;">'
            '<input type="checkbox" id="highlight-incoming"> Incoming edges'
            '</label>\n'
        )

        # Search bar with suggestions and Clear button
        f.write(
            '<label style="margin-left:10px; font-size:30px; vertical-align:middle;">'
            'Find: '
            '<input type="text" id="search-node" size="20" '
            'placeholder="function name" '
            'style="height:2.4em; width:500px; font-size:30px; vertical-align:middle; line-height:1.2;" '
            'list="search-node-list" /> '
            '<button id="search-node-btn" '
            'style="height:2.4em; font-size:30px; vertical-align:middle;">Go</button>'
            '<button id="clear-node-btn" '
            'style="height:2.4em; font-size:30px; vertical-align:middle; margin-left:4px;">Clear</button>'
            '</label>\n'
        )


        # Dropdown suggestions list
        f.write('<datalist id="search-node-list"></datalist>\n')

        # Zoom controls
        f.write(
            '<span style="margin-left:auto;">Zoom: '
            '<button id="zoom-in">+</button>'
            '<button id="zoom-out">-</button>'
            '<button id="zoom-reset">Reset</button>'
            '</span>\n'
        )
        f.write("</div>\n")

        # Node info UI: separate bar for name and path
        # Node info UI: separate bar for name and path
        f.write(
            '<div id="node-info-container" style="padding:8px 12px; display:flex; flex-direction:column; gap:4px;">'
            '  <label>'
            '    Function name: '
            '    <input id="node-name" type="text" style="width:22.6%;" readonly /> '
            '    <button id="copy-node-name">Copy Function Name</button>'
            '  </label>'
            '  <label>'
            '    Path: '
            '    <input id="node-path" type="text" style="width:25%;" readonly /> '
            '    <button id="copy-node-path">Copy Path</button>'
            '  </label>'
            '</div>\n'
        )

        f.write(
            '<div id="main-split">'
            '  <div id="left-panel">'

            # Tabs
            '    <div id="tabs" style="display:flex; border-bottom:1px solid #ccc;">'
            '      <div class="tab active" data-tab="keygen">KeyGen</div>'
            '      <div class="tab" data-tab="encap">Encap</div>'
            '      <div class="tab" data-tab="decap">Decap</div>'
            '    </div>'

            # Steps container
            '    <div id="steps-container">'
            '      <div class="steps" id="steps-keygen"></div>'
            '      <div class="steps" id="steps-encap" style="display:none;"></div>'
            '      <div class="steps" id="steps-decap" style="display:none;"></div>'
            '    </div>'

            # Selected variable box
            '    <div id="variable-box" style="border-top:1px solid #ddd; padding:10px;">'
            '      <b>Selected Variable</b>'
            '      <div id="variable-meta" style="font-size:12px; color:#666; margin-top:4px;"></div>'
            '      <textarea id="variable-hex" style="width:100%; height:140px; margin-top:6px; font-family:monospace;"></textarea>'
            '    </div>'

            '  </div>'

            # Callgraph
            '  <div id="graph-container">'
            '    <div id="graph"></div>'
            '  </div>'

            '</div>\n'
        )

        # Tab behavior is handled in the main JS block (renderTabs).


        # Viz.js + svg-pan-zoom from CDN
        f.write(
            '<script src="https://cdn.jsdelivr.net/npm/viz.js@2.1.2/viz.js"></script>\n'
        )
        f.write(
            '<script src="https://cdn.jsdelivr.net/npm/viz.js@2.1.2/full.render.js"></script>\n'
        )
        f.write(
            '<script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>\n'
        )

        # JS: data + logic
        f.write("<script>\n")
        f.write(f'const dotSrc = "{dot_js}";\n')

        f.write(f'const traceSteps = {trace_json};\n')
        
        steps_blob = json.dumps(steps_json or {})
        flow_blob  = json.dumps(flow_spec or {})
        f.write(f'const stepsData = {steps_blob};\n')
        f.write(f'const flowSpec = {flow_blob};\n')

        
        f.write(r"""
    function escapeHtml(s) {
        return (s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function selectHex(metaText, hex) {
        const meta = document.getElementById("trace-detail-meta");
        const ta = document.getElementById("trace-detail-hex");
        if (meta) meta.textContent = metaText || "";
        if (ta) ta.value = hex || "";
    }

    function highlightFunctionByName(funcName) {
        // If graph not loaded yet, do nothing
        if (!nodeMap || !nodeMap[funcName]) return;
        const node = nodeMap[funcName];
        emphasizeNode(node);
        focusOnNode(node);
        selectedNode = funcName;
        updateNeighborHighlights();

        // Update the node info bars too
        const nodeNameInput = document.getElementById('node-name');
        const nodePathInput = document.getElementById('node-path');
        if (nodeNameInput) nodeNameInput.value = funcName;
        if (nodePathInput) {
            const info = sym2Info[funcName];
            nodePathInput.value = info ? info.path : "??";
        }
    }

    function renderTraceSteps() {
        const container = document.getElementById("trace-steps");
        if (!container) return;

        if (!traceSteps || traceSteps.length === 0) {
            container.innerHTML = "<div style='color:#666;'>No trace steps loaded. Provide --trace-log with TRACE|... lines.</div>";
            return;
        }

        // Build step list (collapsible cards)
        let html = "";
        for (const step of traceSteps) {
            const func = step.func || "?";
            const vars = step.vars || [];
            html += `
            <div class="trace-step" data-func="${escapeHtml(func)}"
                style="border:1px solid #ddd; border-radius:10px; padding:10px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:700;">${escapeHtml(func)}</div>
                    <div style="font-size:12px; color:#666;">vars: ${vars.length}</div>
                </div>
                <button class="trace-jump" data-func="${escapeHtml(func)}">Go</button>
                </div>
                <div style="margin-top:8px;">
                ${vars.map((v, idx) => {
                    if (v.type === "buf") {
                        const hex = v.hex || "";
                        const len = v.len ?? (hex.length/2);
                        const preview = hex.slice(0, 64) + (hex.length > 64 ? "…" : "");
                        return `
                            <div style="padding:6px 0; border-top:1px dashed #eee;">
                            <div style="display:flex; justify-content:space-between; gap:8px;">
                                <div>
                                <b>${escapeHtml(v.name)}</b>
                                <span style="font-size:12px; color:#666;">(${len} bytes)</span>
                                </div>
                                <button class="trace-show" data-func="${escapeHtml(func)}" data-name="${escapeHtml(v.name)}" data-hex="${escapeHtml(hex)}" data-len="${len}">Show</button>
                            </div>
                            <div style="font-family:monospace; font-size:12px; color:#444; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${escapeHtml(preview)}
                            </div>
                            </div>
                        `;
                    } else if (v.type === "u32") {
                        return `
                            <div style="padding:6px 0; border-top:1px dashed #eee;">
                            <b>${escapeHtml(v.name)}</b> = <span style="font-family:monospace;">${escapeHtml(String(v.value))}</span>
                            </div>
                        `;
                    } else {
                        return `
                            <div style="padding:6px 0; border-top:1px dashed #eee;">
                            <b>${escapeHtml(v.name || "var")}</b>
                            </div>
                        `;
                    }
                }).join("")}
                </div>
            </div>
            `;
        }

        container.innerHTML = html;

        // Hook buttons
        container.querySelectorAll(".trace-jump").forEach(btn => {
            btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            const fn = btn.getAttribute("data-func");
            highlightFunctionByName(fn);
            });
        });

        container.querySelectorAll(".trace-show").forEach(btn => {
            btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            const fn = btn.getAttribute("data-func") || "";
            const name = btn.getAttribute("data-name") || "";
            const hex = btn.getAttribute("data-hex") || "";
            const len = btn.getAttribute("data-len") || "";
            selectHex(`${fn} :: ${name} (${len} bytes)`, hex);
            });
        });

        const copyBtn = document.getElementById("copy-trace-hex");
        if (copyBtn) {
            copyBtn.onclick = () => {
            const ta = document.getElementById("trace-detail-hex");
            if (!ta || !ta.value) return;
            navigator.clipboard.writeText(ta.value).catch(err => console.error(err));
            };
        }
    }
        """)


        f.write("const edgeOrder = [\n")
        for key in edge_keys:
            f.write(f'  "{_js_escape(key)}",\n')
        f.write("];\n")

        # JS mapping: symbol -> { name, path }
        f.write("const sym2Info = {\n")
        for sym, path in sym2path.items():
            f.write(
                f'  "{_js_escape(sym)}": {{ '
                f'name: "{_js_escape(sym)}", '
                f'path: "{_js_escape(str(path))}" }},\n'
            )
        f.write("};\n")


        # --- Zoom compensation for controls ---
        f.write(r"""
    // Keep the control buttons readable when the user zooms the page
    let basePixelRatio = window.devicePixelRatio || 1;
    let baseControlsFontSize = null;

    function initZoomCompensation() {
        const controls = document.getElementById('controls');
        if (!controls) return;
        const computed = window.getComputedStyle(controls);
        baseControlsFontSize = parseFloat(computed.fontSize) || 14;
    }

    function applyZoomCompensation() {
        const controls = document.getElementById('controls');
        if (!controls || baseControlsFontSize === null) return;

        const ratio = (window.devicePixelRatio || 1) / basePixelRatio;

        // Extra boost factor so buttons get a bit larger than “exactly same size”
        const extraBoost = 1.4;  // tweak: 1.2–1.8

        // When zoom = 50% → ratio ~0.5 → 1/ratio = 2 → × extraBoost = 2.8
        const scale = (1 / ratio) * extraBoost;

        controls.style.fontSize = (baseControlsFontSize * scale) + "px";
    }

    window.addEventListener('load', () => {
        initZoomCompensation();
        applyZoomCompensation();
    });

    // devicePixelRatio usually changes on zoom and triggers resize
    window.addEventListener('resize', applyZoomCompensation);
        """)

        f.write(r"""
    let viz = (typeof Viz !== "undefined") ? new Viz() : null;
    let edgeElements = [];
    let currentIndex = -1;        // index of the "current" edge in animation order
    let playingDirection = null;  // "forward" | "backward" | null
    let speed = 1.0;
    let panZoom = null;
    let svgRoot = null;
    let followLine = false;

    // Node selection + neighbor highlighting state
    let selectedNode = null;
    let showOutgoing = true;
    let showIncoming = false;
    
    let selectedVarKey = null; // "StepTitle::VarName" (used to toggle-highlight chips)

    let nodeMap = {};   // symbol -> <g.node> (global so all functions can use it)
    let primaryRefNodeEls = {};  // diagram nodeId -> <g>
    let primaryRefNodeBoxes = {}; // diagram nodeId -> {x,y,w,h}
    let primaryRefConnectorBuffer = null; // deferred connector specs (for port planning)
    let primaryRefDrawnSegments = []; // segments used for crossing bridge rendering

    function setupGraphAnimation(svgElement) {
        svgRoot = svgElement;

        // Enable pan/zoom with visible control icons, but disable dbl-click zoom
        panZoom = svgPanZoom(svgElement, {
            controlIconsEnabled: true,
            zoomScaleSensitivity: 0.4,
            dblClickZoomEnabled: false
        });

        // Map from symbol -> node <g> for search/focus
        nodeMap = {};

        // Map Graphviz edges by title "caller->callee"
        const edgeGroupsByKey = {};
        const edgeGroups = svgElement.querySelectorAll('g.edge');
        edgeGroups.forEach(g => {
            const titleEl = g.querySelector('title');
            if (!titleEl) return;
            const key = titleEl.textContent.trim();
            edgeGroupsByKey[key] = g;
        });

        // Build ordered edge elements and prepare stroke-dash animation
        edgeElements = edgeOrder.map((key, idx) => {
            const g = edgeGroupsByKey[key];
            if (!g) return null;
            const path = g.querySelector('path');
            if (!path) return null;

            const length = path.getTotalLength();

            // base style
            path.setAttribute('stroke', '#aaaaaa');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('fill', 'none');

            // prepare for "draw line" animation
            path.setAttribute('stroke-dasharray', length);
            path.setAttribute('stroke-dashoffset', length);
            path.setAttribute('data-base-color', '#aaaaaa');
            path.setAttribute('data-discovered', '0'); // 0 = not discovered yet

            return { key, group: g, path, length };
        }).filter(e => e !== null);

        // Initially: nothing discovered
        highlightEdges(-1);

        // Hook up controls
        const btnPlay        = document.getElementById('btn-play');
        const btnPlayBack    = document.getElementById('btn-play-backward');
        const btnPause       = document.getElementById('btn-pause');
        const btnPrev        = document.getElementById('btn-prev');
        const btnNext        = document.getElementById('btn-next');
        const speedSlider    = document.getElementById('speed');
        const speedValue     = document.getElementById('speed-value');
        const followCheckbox = document.getElementById('follow-line');
        const zoomInBtn      = document.getElementById('zoom-in');
        const zoomOutBtn     = document.getElementById('zoom-out');
        const zoomResetBtn   = document.getElementById('zoom-reset');
        const outgoingCheckbox = document.getElementById('highlight-outgoing');
        const incomingCheckbox = document.getElementById('highlight-incoming');
        const searchInput      = document.getElementById('search-node');
        const searchBtn        = document.getElementById('search-node-btn');
        const clearBtn          = document.getElementById('clear-node-btn');
        const searchList        = document.getElementById('search-node-list');
        const nodeNameInput     = document.getElementById('node-name');
        const copyNodeNameBtn   = document.getElementById('copy-node-name');
        const nodePathInput     = document.getElementById('node-path');
        const copyNodePathBtn   = document.getElementById('copy-node-path');

        btnPlay.onclick = () => {
            // prevent stacking multiple forward runs
            if (playingDirection !== null) return;
            playingDirection = "forward";
            runAnimationForward();
        };
        btnPlayBack.onclick = () => {
            // prevent stacking multiple backward runs
            if (playingDirection !== null) return;
            playingDirection = "backward";
            runAnimationBackward();
        };
        btnPause.onclick = () => {
            playingDirection = null;
        };
        btnNext.onclick = () => {
            playingDirection = null;
            stepForward();
        };
        btnPrev.onclick = () => {
            playingDirection = null;
            stepBack();
        };

        speedSlider.oninput = () => {
            speed = parseFloat(speedSlider.value);
            speedValue.textContent = speed.toFixed(2) + "x";
        };

        followCheckbox.onchange = () => {
            followLine = followCheckbox.checked;
            if (followLine && currentIndex >= 0) {
                focusOnEdge(currentIndex);
            }
        };

        if (zoomInBtn)  zoomInBtn.onclick  = () => { if (panZoom) panZoom.zoomIn();  };
        if (zoomOutBtn) zoomOutBtn.onclick = () => { if (panZoom) panZoom.zoomOut(); };
        if (zoomResetBtn) zoomResetBtn.onclick = () => {
            if (!panZoom) return;
            if (svgRoot && svgRoot.id === "primary-ref-svg") {
                if (panZoom.zoom) panZoom.zoom(1);
                if (panZoom.pan) panZoom.pan({ x: 0, y: 0 });
            } else if (panZoom.reset) {
                panZoom.reset();
            }
        };

        if (outgoingCheckbox) {
            showOutgoing = outgoingCheckbox.checked;
            outgoingCheckbox.onchange = () => {
                showOutgoing = outgoingCheckbox.checked;
                updateNeighborHighlights();
            };
        }

        if (incomingCheckbox) {
            showIncoming = incomingCheckbox.checked;
            incomingCheckbox.onchange = () => {
                showIncoming = incomingCheckbox.checked;
                updateNeighborHighlights();
            };
        }

        if (copyNodeNameBtn && nodeNameInput) {
            copyNodeNameBtn.onclick = () => {
                if (!nodeNameInput.value) return;
                navigator.clipboard
                    .writeText(nodeNameInput.value)
                    .catch(err => console.error("Clipboard error:", err));
            };
        }

        if (copyNodePathBtn && nodePathInput) {
            copyNodePathBtn.onclick = () => {
                if (!nodePathInput.value) return;
                navigator.clipboard
                    .writeText(nodePathInput.value)
                    .catch(err => console.error("Clipboard error:", err));
            };
        }

        // Search functionality
        if (searchBtn && searchInput) {
            searchBtn.onclick = () => {
                const q = searchInput.value.trim();
                if (!q) return;
                searchAndHighlightNode(q);
            };
        }

        if (searchInput) {
            searchInput.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    const q = searchInput.value.trim();
                    if (!q) return;
                    searchAndHighlightNode(q);
                }
                if (ev.key === 'Escape') {
                    if (clearBtn) clearBtn.click();
                }
            });
        }

        // Clear functionality
        if (clearBtn) {
            clearBtn.onclick = () => {
                searchInput.value = "";
                selectedNode = null;
                updateNeighborHighlights();

                // Remove highlighted borders if any
                if (lastHighlightedNode) {
                    const prev = lastHighlightedNode.querySelectorAll('ellipse,polygon,rect');
                    prev.forEach(s => {
                        const baseStroke = s.getAttribute('data-base-stroke') || '#000000';
                        const baseWidth = s.getAttribute('data-base-stroke-width') || '1';
                        s.setAttribute('stroke', baseStroke);
                        s.setAttribute('stroke-width', baseWidth);
                    });
                    lastHighlightedNode = null;
                }

                // Clear info fields
                if (nodeNameInput) nodeNameInput.value = "";
                if (nodePathInput) nodePathInput.value = "";
            };
        }

        // Make nodes clickable: select/deselect symbol
        const nodes = svgElement.querySelectorAll('g.node');
        nodes.forEach(node => {
            const titleEl = node.querySelector('title');
            if (!titleEl) return;
            const sym = titleEl.textContent.trim();

            nodeMap[sym] = node;

            node.style.cursor = 'pointer';

            // Single-click: select node for incoming/outgoing highlighting
            node.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (selectedNode === sym) {
                    selectedNode = null;
                } else {
                    selectedNode = sym;
                }
                updateNeighborHighlights();

                // Update the separate name bar
                if (nodeNameInput) {
                    nodeNameInput.value = sym || "";
                }

                // Update the path bar using sym2Info
                if (nodePathInput) {
                    const info = sym2Info[sym];
                    nodePathInput.value = info ? info.path : "??";
                }
            });

            // Double-click: continue animation from this node's outgoing edges
            node.addEventListener('dblclick', (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                continueFromNode(sym);
            });
        });

        // Fill dropdown suggestions
        if (searchList) {
            searchList.innerHTML = "";
            Object.keys(nodeMap).sort().forEach(sym => {
                const opt = document.createElement('option');
                opt.value = sym;
                searchList.appendChild(opt);
            });
        }

        // Search by name, highlight node + its edges and jump to it
        function searchAndHighlightNode(query) {
            if (!query) return;

            const qLower = query.toLowerCase();

            // Prefer exact match first
            if (nodeMap[query]) {
                applyNodeSelection(query, nodeMap[query]);
                return;
            }

            // Then substring match
            for (const sym in nodeMap) {
                if (sym.toLowerCase().includes(qLower)) {
                    applyNodeSelection(sym, nodeMap[sym]);
                    return;
                }
            }
            // No match: do nothing (or you could flash the input)
        }

        function applyNodeSelection(sym, node) {
            // Use same selection logic as clicking the node
            selectedNode = sym;
            updateNeighborHighlights();

            if (nodeNameInput) {
                nodeNameInput.value = sym || "";
            }
            if (nodePathInput) {
                const info = sym2Info[sym];
                nodePathInput.value = info ? info.path : "??";
            }

            // Visually emphasize the node and jump to it
            emphasizeNode(node);
            focusOnNode(node);
        }
    }

    // Double-click helper: find first edge with this node as caller,
    // jump animation to just before it, and start playing forward.
    function continueFromNode(sym) {
        if (!edgeElements.length) return;

        let idx = -1;
        for (let i = 0; i < edgeElements.length; i++) {
            const e = edgeElements[i];
            if (!e || !e.key) continue;
            if (e.key.startsWith(sym + "->")) {
                idx = i;
                break;
            }
        }
        if (idx === -1) {
            return; // no outgoing edges from this symbol
        }

        // Apply one step forward from this node:
        // make that edge the current one (red), but don't start animation.
        highlightEdges(idx);
        playingDirection = null;   // ensure nothing is playing
        focusOnEdge(idx);          // optional: center camera on that edge
    }

    // Move the camera so the midpoint of the given edge
    // is centered in the visible container.
    // Uses getScreenCTM + panBy (no centerOn / manual zoom math).
    function focusOnEdge(index) {
        if (!followLine) return;
        if (!panZoom || !svgRoot) return;
        if (index < 0 || index >= edgeElements.length) return;

        const e = edgeElements[index];
        if (!e || !e.path) return;

        try {
            const path   = e.path;
            const length = e.length;

            // Midpoint of the edge in the path's coordinate system
            const mid = path.getPointAtLength(length / 2);

            // Need SVGPoint to transform to screen coordinates
            if (!svgRoot.createSVGPoint) {
                return; // give up gracefully on very old browsers
            }

            const pt = svgRoot.createSVGPoint();
            pt.x = mid.x;
            pt.y = mid.y;

            // Transform that point to *screen* coordinates using the element's CTM
            const ctm = path.getScreenCTM();
            if (!ctm || !pt.matrixTransform) {
                return;
            }
            const screenPt = pt.matrixTransform(ctm);

            // Compute the center of the visible graph container in screen coords
            const container = document.getElementById('graph-container');
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width  / 2;

            // Shift the "target" point a bit *lower* than the true center.
            const verticalBias = 0.25;
            const centerY = rect.top + rect.height * verticalBias;

            // We want to move the SVG so that screenPt goes to (centerX, centerY).
            const dx = centerX - screenPt.x;
            const dy = centerY - screenPt.y;

            // panBy expects deltas in screen pixels
            panZoom.panBy({ x: dx, y: dy });
        } catch (err) {
            console.error("Error in focusOnEdge:", err);
        }
    }


    let lastHighlightedNode = null;

    // Center the view on a given node, similar to focusOnEdge
    function focusOnNode(node) {
        if (!panZoom || !svgRoot) return;
        if (!node || !node.getBBox) return;

        const bbox = node.getBBox();
        const center = svgRoot.createSVGPoint();
        center.x = bbox.x + bbox.width / 2;
        center.y = bbox.y + bbox.height / 2;

        const ctm = node.getScreenCTM();
        if (!ctm || !center.matrixTransform) return;
        const screenPt = center.matrixTransform(ctm);

        const container = document.getElementById('graph-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const verticalBias = 0.25;
        const centerY = rect.top + rect.height * verticalBias;

        const dx = centerX - screenPt.x;
        const dy = centerY - screenPt.y;

        panZoom.panBy({ x: dx, y: dy });
    }

    // Give the node a visible outline, reset previous one
    function emphasizeNode(node) {
        if (lastHighlightedNode && lastHighlightedNode !== node) {
            const prevShapes = lastHighlightedNode.querySelectorAll('ellipse,polygon,rect');
            prevShapes.forEach(s => {
                const baseStroke = s.getAttribute('data-base-stroke') || '#000000';
                const baseWidth = s.getAttribute('data-base-stroke-width') || '1';
                s.setAttribute('stroke', baseStroke);
                s.setAttribute('stroke-width', baseWidth);
            });
        }

        const shapes = node.querySelectorAll('ellipse,polygon,rect');
        shapes.forEach(s => {
            s.setAttribute('stroke', '#ffa500'); // orange
            s.setAttribute('stroke-width', '3');
        });

        lastHighlightedNode = node;
    }


    // Apply neighbor-based highlighting on top of base colors
    // - Outgoing edges of selected node: green
    // - Incoming edges of selected node: purple
    // - Current animated (red) edge keeps its red color
    // - Also color the nodes themselves:
    //     * selected node: orange border
    //     * outgoing targets: green border
    //     * incoming sources: purple border
    function updateNeighborHighlights() {
        if (!edgeElements.length) return;

        const outgoingEdgeSet = new Set();
        const incomingEdgeSet = new Set();
        const outgoingNodeSet = new Set(); // callees of selected
        const incomingNodeSet = new Set(); // callers of selected

        if (selectedNode) {
            edgeElements.forEach((e, i) => {
                if (!e || !e.path || !e.key) return;
                const key = e.key;
                const parts = key.split("->");
                if (parts.length !== 2) return;
                const caller = parts[0];
                const callee = parts[1];

                if (showOutgoing && caller === selectedNode) {
                    outgoingEdgeSet.add(i);
                    outgoingNodeSet.add(callee);
                }
                if (showIncoming && callee === selectedNode) {
                    incomingEdgeSet.add(i);
                    incomingNodeSet.add(caller);
                }
            });
        }

        // ---- Edge colors (same as before, but using the sets above) ----
        edgeElements.forEach((e, i) => {
            if (!e || !e.path) return;
            const path = e.path;
            const length = e.length;
            const baseColor = path.getAttribute("data-base-color") || "#aaaaaa";
            const discovered = path.getAttribute("data-discovered") === "1";
            const isOutgoing = outgoingEdgeSet.has(i);
            const isIncoming = incomingEdgeSet.has(i);
            const highlighted = isOutgoing || isIncoming;

            // Color priority:
            //  1. animated red (baseColor == red)
            //  2. incoming purple
            //  3. outgoing green
            //  4. baseColor (grey)
            if (baseColor === "#ff0000") {
                path.setAttribute("stroke", baseColor);
            } else if (isIncoming) {
                path.setAttribute("stroke", "#800080"); // purple
            } else if (isOutgoing) {
                path.setAttribute("stroke", "#008000"); // green
            } else {
                path.setAttribute("stroke", baseColor);
            }

            // Visibility: discovered OR highlighted edges are visible
            if (discovered || highlighted) {
                path.setAttribute("stroke-dashoffset", 0);
            } else {
                path.setAttribute("stroke-dashoffset", length);
            }
        });

        // ---- Node colors (new part) ----
        Object.entries(nodeMap).forEach(([sym, node]) => {
            const shapes = node.querySelectorAll("ellipse,polygon,rect");
            shapes.forEach(s => {
                // Default border
                let stroke = "#000000";
                let strokeWidth = "1";

                if (sym === selectedNode) {
                    stroke = "#ff9900";        // selected node: orange
                    strokeWidth = "3";
                } else if (incomingNodeSet.has(sym)) {
                    stroke = "#800080";        // callers: purple
                    strokeWidth = "3";
                } else if (outgoingNodeSet.has(sym)) {
                    stroke = "#008000";        // callees: green
                    strokeWidth = "3";
                }

                s.setAttribute("stroke", stroke);
                s.setAttribute("stroke-width", strokeWidth);
            });
        });
    }


    // Color & discovered state for all edges based on currentIndex
    //   - current edge (i == currentIndex): RED and discovered
    //   - edges < currentIndex: GREY and discovered
    //   - edges > currentIndex: GREY and not discovered
    // Dashoffset is handled in updateNeighborHighlights so we can show
    // future edges if they're highlighted via checkboxes.
    function highlightEdges(idx) {
        if (typeof idx === "number") {
            currentIndex = idx;
        }

        edgeElements.forEach((e, i) => {
            if (!e || !e.path) return;
            const path = e.path;
            let baseColor = "#aaaaaa";
            let discovered = "0";

            if (currentIndex < 0) {
                // Initial: nothing discovered
                baseColor = "#aaaaaa";
                discovered = "0";
            } else if (i === currentIndex) {
                // current edge: red + discovered
                baseColor = "#ff0000";
                discovered = "1";
            } else if (i < currentIndex) {
                // older than current: grey + discovered
                baseColor = "#aaaaaa";
                discovered = "1";
            } else {
                // future edges: grey + not discovered
                baseColor = "#aaaaaa";
                discovered = "0";
            }

            path.setAttribute("stroke", baseColor);
            path.setAttribute("data-base-color", baseColor);
            path.setAttribute("data-discovered", discovered);
        });

        updateNeighborHighlights();
    }

    function stepForward() {
        if (edgeElements.length === 0) return;
        if (currentIndex < edgeElements.length - 1) {
            highlightEdges(currentIndex + 1);
            focusOnEdge(currentIndex);
        }
    }

    function stepBack() {
        if (edgeElements.length === 0) return;
        if (currentIndex > 0) {
            highlightEdges(currentIndex - 1);
            focusOnEdge(currentIndex);
        } else if (currentIndex === 0) {
            // go back to "no edge selected"
            highlightEdges(-1);
        }
    }

    // Animate drawing (or undrawing) of a single edge
    function animateEdge(index, direction, onDone) {
        if (index < 0 || index >= edgeElements.length) {
            onDone(false);
            return;
        }
        const e = edgeElements[index];
        if (!e || !e.path || !e.length) {
            onDone(false);
            return;
        }

        const path   = e.path;
        const length = e.length;

        const baseDuration = 900; // ms
        const totalSteps   = 40;
        const interval     = baseDuration / (speed * totalSteps);
        let t = 0;

        // ensure current line is red while animating
        path.setAttribute("stroke", "#ff0000");
        path.setAttribute("data-base-color", "#ff0000");
        path.setAttribute("stroke-dasharray", length);

        // starting dashoffset depends on direction
        if (direction === "forward") {
            // draw from nothing -> full
            path.setAttribute("stroke-dashoffset", length);
        } else {
            // backward: erase from full -> nothing
            path.setAttribute("stroke-dashoffset", 0);
        }

        const timer = setInterval(() => {
            // stop if user changed direction or paused
            if (playingDirection !== direction) {
                clearInterval(timer);
                onDone(false);
                return;
            }

            t++;
            const alpha = t / totalSteps;

            if (direction === "forward") {
                // draw line progressively
                const offset = length * (1 - alpha);
                path.setAttribute("stroke-dashoffset", offset);
            } else {
                // erase line progressively
                const offset = length * alpha;
                path.setAttribute("stroke-dashoffset", offset);
            }

            if (t >= totalSteps) {
                clearInterval(timer);

                if (direction === "forward") {
                    // final: fully drawn
                    path.setAttribute("stroke-dashoffset", 0);
                    path.setAttribute("data-discovered", "1");
                } else {
                    // final: fully hidden
                    path.setAttribute("stroke-dashoffset", length);
                    path.setAttribute("data-discovered", "0");
                }

                onDone(true);
            }
        }, interval);
    }

    function runAnimationForward() {
        if (playingDirection !== "forward") return;
        if (edgeElements.length === 0) {
            playingDirection = null;
            return;
        }
        const nextIndex = currentIndex + 1;
        if (nextIndex >= edgeElements.length) {
            playingDirection = null;
            return;
        }
        // mark this as current (colors + discovered state)
        highlightEdges(nextIndex);
        focusOnEdge(nextIndex);
        animateEdge(nextIndex, "forward", (completed) => {
            if (!completed || playingDirection !== "forward") return;
            // keep states consistent
            highlightEdges(nextIndex);
            setTimeout(runAnimationForward, 200);
        });
    }

    function runAnimationBackward() {
        if (playingDirection !== "backward") return;
        if (edgeElements.length === 0) {
            playingDirection = null;
            return;
        }
        if (currentIndex < 0) {
            playingDirection = null;
            return;
        }
        const idx = currentIndex;
        // mark this as current
        highlightEdges(idx);
        focusOnEdge(idx);
        animateEdge(idx, "backward", (completed) => {
            if (!completed || playingDirection !== "backward") return;
            // after erasing this edge, move one step back
            highlightEdges(idx - 1);
            setTimeout(runAnimationBackward, 200);
        });
    }
    
    // --- Sidebar: Tabs + Steps + Variables ---
    const VAR_KIND_META = {
        seed:   { cls: "var-seed",   fill: "#ff8a00", fg: "#111" },
        matrix: { cls: "var-matrix", fill: "#ff2ea6", fg: "#fff" },
        vector: { cls: "var-vector", fill: "#8b2cff", fg: "#fff" },
        poly:   { cls: "var-poly",   fill: "#1db954", fg: "#fff" },
        bytes:  { cls: "var-bytes",  fill: "#ffd400", fg: "#111" },
        calc:   { cls: "var-calc",   fill: "#00bcd4", fg: "#111" }
    };
    const FLOW_KIND_ORDER = ["seed", "matrix", "vector", "poly", "bytes", "calc"];
    const FLOW_KIND_LABEL = {
        seed: "Random bytes/Seeds",
        matrix: "Matrix",
        vector: "Vector",
        poly: "Polynomial",
        bytes: "Bytes",
        calc: "Calculation"
    };

    const defaultFlowSpec = {
        tabs: {
            keygen: {
                nodes: [
                    { id: "d", label: "d", var: "d", kind: "seed", x: 30, y: 38, w: 52, h: 30, funcs: ["randombytes"] },
                    { id: "z", label: "z", var: "z", kind: "seed", x: 30, y: 156, w: 52, h: 30, funcs: ["randombytes"] },
                    { id: "k", label: "k", var: "k", kind: "seed", x: 112, y: 38, w: 52, h: 30, funcs: ["hash_g"] },
                    { id: "G", label: "G(d||k)", var: "G", kind: "calc", x: 190, y: 38, w: 110, h: 30, funcs: ["hash_g"] },
                    { id: "rho", label: "rho", var: "rho", kind: "bytes", x: 328, y: 38, w: 64, h: 30, funcs: ["hash_g"] },
                    { id: "sigma", label: "sigma", var: "sigma", kind: "bytes", x: 328, y: 98, w: 72, h: 30, funcs: ["hash_g"] },
                    { id: "A", label: "A", var: "A", kind: "matrix", x: 432, y: 38, w: 68, h: 30, funcs: ["gen_matrix"] },
                    { id: "s", label: "s", var: "s", kind: "vector", x: 432, y: 98, w: 68, h: 30, funcs: ["poly_getnoise_eta1"] },
                    { id: "e", label: "e", var: "e", kind: "vector", x: 432, y: 156, w: 68, h: 30, funcs: ["poly_getnoise_eta1"] },
                    { id: "s_hat", label: "s_hat", var: "s_hat", kind: "vector", x: 530, y: 98, w: 80, h: 30, funcs: ["polyvec_ntt"] },
                    { id: "t_hat", label: "t_hat", var: "t_hat", kind: "vector", x: 530, y: 156, w: 80, h: 30, funcs: ["polyvec_basemul_acc_montgomery"] },
                    { id: "pk", label: "ek (pk)", var: "ek", kind: "bytes", x: 640, y: 38, w: 86, h: 30, funcs: ["pack_pk"] },
                    { id: "sk", label: "dk_pke (sk)", var: "dk_pke", kind: "bytes", x: 640, y: 98, w: 108, h: 30, funcs: ["pack_sk"] },
                    { id: "dk", label: "dk", var: "dk", kind: "bytes", x: 640, y: 156, w: 60, h: 30, funcs: ["crypto_kem_keypair"] }
                ],
                edges: [
                    ["d","G"], ["k","G"], ["G","rho"], ["G","sigma"],
                    ["rho","A"], ["sigma","s"], ["sigma","e"],
                    ["s","s_hat"], ["A","t_hat"], ["s_hat","t_hat"], ["e","t_hat"],
                    ["t_hat","pk"], ["s_hat","sk"], ["sk","dk"], ["z","dk"], ["pk","dk"]
                ]
            }
        }
    };

    let currentTab = "keygen";
    let activeStepId = null;
    let flowNodeEls = {};

    function getStepsForTab(tabId) {
        // Support both formats:
        // 1) { "keygen": {steps:[...]}, "encap":{...} }
        // 2) { tabs:[{id:"keygen", steps:[...]}] }
        if (!stepsData) return [];
        if (stepsData.tabs && Array.isArray(stepsData.tabs)) {
            const t = stepsData.tabs.find(x => x.id === tabId);
            return t && Array.isArray(t.steps) ? t.steps : [];
        }
        if (stepsData[tabId] && Array.isArray(stepsData[tabId].steps)) return stepsData[tabId].steps;
        if (stepsData.tab === tabId && Array.isArray(stepsData.steps)) return stepsData.steps;
        return [];
    }

    function getVarKind(v, fallbackName) {
        const txt = String(v && (v.kind || v.type || v.category || v.group || fallbackName || "")).toLowerCase();
        if (txt.includes("matrix")) return "matrix";
        if (txt.includes("vector")) return "vector";
        if (txt.includes("poly")) return "poly";
        if (txt.includes("seed") || txt.includes("random") || txt === "z" || txt === "d" || txt === "k") return "seed";
        if (txt.includes("calc") || txt.includes("hash") || txt.includes("prf") || txt.includes("ntt")) return "calc";
        return "bytes";
    }

    function getFlowForTab(tabId) {
        const spec = (flowSpec && Object.keys(flowSpec).length) ? flowSpec : defaultFlowSpec;
        if (spec.tabs && !Array.isArray(spec.tabs)) return spec.tabs[tabId] || null;
        if (Array.isArray(spec.tabs)) {
            const t = spec.tabs.find(x => x.id === tabId);
            return t || null;
        }
        return spec[tabId] || null;
    }

    function renderFlowLegend() {
        const legend = document.getElementById("flow-legend");
        if (!legend) return;
        legend.innerHTML = "";
        FLOW_KIND_ORDER.forEach(kind => {
            const pill = document.createElement("span");
            pill.className = "var-chip " + VAR_KIND_META[kind].cls;
            pill.style.cursor = "default";
            pill.textContent = FLOW_KIND_LABEL[kind];
            legend.appendChild(pill);
        });
    }

    function renderFlowGraphForStep(step) {
        const svg = document.getElementById("flow-canvas");
        if (!svg) return;
        const flow = getFlowForTab(currentTab);
        flowNodeEls = {};
        if (!flow || !Array.isArray(flow.nodes)) {
            svg.innerHTML = "";
            return;
        }

        const ns = "http://www.w3.org/2000/svg";
        svg.innerHTML = "";

        const defs = document.createElementNS(ns, "defs");
        const marker = document.createElementNS(ns, "marker");
        marker.setAttribute("id", "flow-arrow");
        marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "9");
        marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "5");
        marker.setAttribute("markerHeight", "5");
        marker.setAttribute("orient", "auto-start-reverse");
        const arrowPath = document.createElementNS(ns, "path");
        arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
        arrowPath.setAttribute("fill", "#95a5ce");
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        svg.appendChild(defs);

        const flowNodeById = {};
        flow.nodes.forEach(n => { flowNodeById[n.id] = n; });
        (flow.edges || []).forEach(e => {
            if (!Array.isArray(e) || e.length < 2) return;
            const src = flowNodeById[e[0]];
            const dst = flowNodeById[e[1]];
            if (!src || !dst) return;
            const line = document.createElementNS(ns, "line");
            line.setAttribute("class", "flow-edge");
            line.setAttribute("x1", String(src.x + (src.w || 70)));
            line.setAttribute("y1", String(src.y + (src.h || 28) / 2));
            line.setAttribute("x2", String(dst.x));
            line.setAttribute("y2", String(dst.y + (dst.h || 28) / 2));
            svg.appendChild(line);
        });

        const stepVars = {};
        if (step && Array.isArray(step.vars)) {
            step.vars.forEach(v => {
                if (!v || !v.name) return;
                stepVars[String(v.name).toLowerCase()] = v;
            });
        }

        flow.nodes.forEach(n => {
            const kind = getVarKind(n, n.label || n.id);
            const style = VAR_KIND_META[kind] || VAR_KIND_META.bytes;
            const g = document.createElementNS(ns, "g");
            g.setAttribute("class", "flow-node");
            g.style.cursor = "pointer";
            g.dataset.nodeId = n.id;

            const rect = document.createElementNS(ns, "rect");
            rect.setAttribute("class", "flow-node-rect");
            rect.setAttribute("x", String(n.x));
            rect.setAttribute("y", String(n.y));
            rect.setAttribute("width", String(n.w || 70));
            rect.setAttribute("height", String(n.h || 28));
            rect.setAttribute("fill", style.fill);
            g.appendChild(rect);

            const label = document.createElementNS(ns, "text");
            label.setAttribute("class", "flow-node-label");
            label.setAttribute("x", String(n.x + 8));
            label.setAttribute("y", String(n.y + 16));
            label.setAttribute("fill", style.fg);
            label.textContent = n.label || n.id;
            g.appendChild(label);

            const fn = (Array.isArray(n.funcs) && n.funcs.length) ? n.funcs[0] : (n.func || "");
            if (fn) {
                const funcText = document.createElementNS(ns, "text");
                funcText.setAttribute("class", "flow-node-func");
                funcText.setAttribute("x", String(n.x + 8));
                funcText.setAttribute("y", String(n.y + (n.h || 28) - 4));
                funcText.textContent = fn;
                g.appendChild(funcText);
            }

            g.onclick = (ev) => {
                ev.stopPropagation();
                const needle = String((n.var || n.label || n.id || "")).toLowerCase();
                let found = stepVars[needle];
                if (!found) {
                    const allKeys = Object.keys(stepVars);
                    const fuzzy = allKeys.find(k => k.includes(needle) || needle.includes(k));
                    if (fuzzy) found = stepVars[fuzzy];
                }
                if (found && step) {
                    const varKey = String(step.id || step.title || "step") + "::" + found.name;
                    toggleVarSelection(varKey, found, step);
                }
                if (fn) jumpToFunction(fn);
            };

            svg.appendChild(g);
            flowNodeEls[n.id] = g;
        });

        highlightFlowNodesForStep(step);
    }

    function highlightFlowNodesForStep(step) {
        Object.values(flowNodeEls).forEach(el => el.classList.remove("active"));
        if (!step || !selectedVarKey) return;
        const vars = Array.isArray(step.vars) ? step.vars : [];
        const hit = vars.find(v => (String(step.id || step.title || "step") + "::" + v.name) === selectedVarKey);
        if (!hit) return;
        const needle = String(hit.name || "").toLowerCase();
        Object.entries(flowNodeEls).forEach(([id, el]) => {
            const lbl = String(id || "").toLowerCase();
            const txt = String(el.textContent || "").toLowerCase();
            if (lbl === needle || txt.includes(needle)) el.classList.add("active");
        });
    }

    function renderTabs() {
    const btns = document.querySelectorAll("#tabs .tab");
    btns.forEach(b => {
            b.classList.toggle("active", b.dataset.tab === currentTab);
            b.onclick = () => {
                currentTab = b.dataset.tab;
                activeStepId = null;
                document.querySelectorAll('.steps').forEach(s => s.style.display = 'none');
                const target = document.getElementById('steps-' + currentTab);
                if (target) target.style.display = 'block';
                renderSteps();
                clearVarBox();
                renderFlowGraphForStep(null);
            };
        });
        document.querySelectorAll('.steps').forEach(s => s.style.display = 'none');
        const target = document.getElementById('steps-' + currentTab);
        if (target) target.style.display = 'block';
    }

    function renderSteps() {
        const steps = getStepsForTab(currentTab);
        const list = document.getElementById("steps-" + currentTab);
        if (!list) return;

        list.innerHTML = "";
        if (!steps.length) {
            list.innerHTML = "<div style='padding:10px;color:#666;'>No steps for this tab yet.</div>";
            return;
        }
        if (!steps.some(s => s.id === activeStepId)) {
            activeStepId = steps[0].id;
        }

        steps.forEach(step => {
            const div = document.createElement("div");
            div.className = "step-item" + (step.id === activeStepId ? " active" : "");
            div.dataset.stepId = step.id;

            const title = document.createElement("div");
            title.className = "step-title";
            title.textContent = (step.title || step.id || "Step");

            const funcs = document.createElement("div");
            funcs.className = "step-funcs";
            const fns = Array.isArray(step.funcs) ? step.funcs : [];
            funcs.textContent = fns.length ? ("funcs: " + fns.join(", ")) : "";

            const vars = document.createElement("div");
            vars.className = "vars";
            (step.vars || []).forEach(v => {
                    const chip = document.createElement("span");
                    const kind = getVarKind(v, v.name);
                    const key = String(step.id || step.title || "step") + "::" + v.name;
                    chip.className = "var-chip " + ((VAR_KIND_META[kind] || VAR_KIND_META.bytes).cls);
                    if (selectedVarKey === key) chip.classList.add("active");
                    chip.textContent = v.name;
                    chip.onclick = (ev) => {
                        ev.stopPropagation();
                        toggleVarSelection(key, v, step);
                        // optional: jump to mapped function when clicking variable
                        if (step.funcs && step.funcs[0]) {
                            jumpToFunction(step.funcs[0]);
                        }
                    };
                vars.appendChild(chip);
            });

            div.appendChild(title);
            if (funcs.textContent) div.appendChild(funcs);
            if ((step.vars || []).length) div.appendChild(vars);

            div.onclick = () => {
                activeStepId = step.id;
                renderSteps();
            };

            list.appendChild(div);
        });

        const activeStep = steps.find(s => s.id === activeStepId);
        if (activeStep) onStepSelected(activeStep);
    }

    function clearVarBox() {
        const meta = document.getElementById("variable-meta");
        const pre  = document.getElementById("variable-hex");
        if (meta) meta.textContent = "";
        if (pre) pre.value = "";
        selectedVarKey = null;
    }

    function showVar(v, step) {
        const meta = document.getElementById("variable-meta");
        const pre  = document.getElementById("variable-hex");
        if (meta) meta.textContent = `${step.title || step.id || currentTab} :: ${v.name} (${v.format || "text"})`;
        if (!pre) return;

        // Print full value (guaranteed output)
        let val = v.value ?? "";
        if (typeof val !== "string") val = JSON.stringify(val, null, 2);

        // Optional pretty hex wrap
        if ((v.format || "").toLowerCase() === "hex") {
            val = val.replace(/\s+/g, "");
            val = val.match(/.{1,64}/g)?.join("\n") || val;
        }
        pre.value = val;
    }

    function toggleVarSelection(varKey, v, step) {
        if (selectedVarKey === varKey) {
            clearVarBox();
        } else {
            selectedVarKey = varKey;
            showVar(v, step);
        }
        renderSteps();
        highlightFlowNodesForStep(step);
    }

    function onStepSelected(step) {
        // 1) Highlight/jump to function node in the primary reference diagram
        if (step.funcs && step.funcs.length) {
            jumpToFunction(step.funcs[0]);
            highlightFunctions(step.funcs);
        }
        // 2) Highlight conceptual nodes in the primary reference diagram
        highlightPrimaryReferenceForStep(step);
        // 3) Legacy side flow graph (no-op when hidden/removed)
        renderFlowGraphForStep(step);
        highlightFlowNodesForStep(step);
    }

    function jumpToFunction(funcName) {
        // nodeMap is built in setupGraphAnimation
        const node = nodeMap[funcName];
        if (!node) return;
        emphasizeNode(node);
        focusOnNode(node);
    }

    function highlightFunctions(funcNames) {
        // Orange outline for all listed functions
        if (!funcNames || !funcNames.length) return;
        funcNames.forEach(fn => {
            const node = nodeMap[fn];
            if (!node) return;
            const shapes = node.querySelectorAll("ellipse,polygon,rect");
            shapes.forEach(s => {
                s.setAttribute("stroke", "#ffa500");
                s.setAttribute("stroke-width", "3");
            });
        });
    }

    const PRIMARY_REF_FUNC_ALIASES = {
        mlkem_keygen: ["crypto_kem_keypair"],
        mlkem_keygen_internal: ["crypto_kem_keypair"],
        kpke_keygen: ["indcpa_keypair"],
        rand_d: ["randombytes"],
        rand_z: ["randombytes"],
        hash_g_box: ["hash_g", "sha3_512"],
        sigma_box: ["hash_g", "sha3_512"],
        rho_box: ["hash_g", "sha3_512"],
        prf_s: ["shake256", "prf", "poly_getnoise_eta1", "poly_getnoise"],
        cbd_s: ["cbd", "poly_getnoise_eta1", "poly_getnoise"],
        ntt_s: ["polyvec_ntt", "poly_ntt"],
        prf_e: ["shake256", "prf", "poly_getnoise_eta1", "poly_getnoise"],
        cbd_e: ["cbd", "poly_getnoise_eta1", "poly_getnoise"],
        ntt_e: ["polyvec_ntt", "poly_ntt"],
        sample_ntt: ["gen_matrix", "shake128_absorb", "shake128_squeezeblocks", "xof_absorb", "xof_squeezeblocks"],
        matrix_A: ["gen_matrix"],
        t_calc: ["polyvec_pointwise_acc", "polyvec_basemul_acc_montgomery", "polyvec_add", "poly_add", "polyvec_invntt"],
        byteencode_sk: ["pack_sk", "polyvec_tobytes"],
        byteencode_pk: ["pack_pk", "polyvec_tobytes", "polyvec_compress", "poly_tobytes"],
        h_pk: ["hash_h", "sha3_256"]
    };

    const PRIMARY_REF_STEP_MAP = {
        keygen: {
            kg01_setup_randomness: ["rand_d", "rand_z"],
            kg02_enter_k_pke_keygen: ["mlkem_keygen_internal", "kpke_keygen"],
            kg03_derive_rho_sigma: ["hash_g_box", "rho_box", "sigma_box"],
            kg04_generate_s_e: ["prf_s", "cbd_s", "prf_e", "cbd_e", "s_box", "e_box"],
            kg05_ntt_conversion: ["ntt_s", "ntt_e", "s_hat_box", "e_hat_box"],
            kg06_generate_matrix_A_hat: ["sample_ntt", "matrix_A", "rho_box"],
            kg07_compute_t_hat: ["t_calc", "t_hat_box"],
            kg08_encode_keys: ["byteencode_sk", "byteencode_pk", "dkpke_out", "ekpke_out"],
            kg09_build_kem_secret_key: ["h_pk", "dk_fields", "ek_bar", "z_mid"],
            kg10_return_keys: ["ek_out", "dk_out", "save_decaps", "send_bob"]
        },
        encap: {},
        decap: {}
    };

    function createSvgEl(tag, attrs = {}) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, String(v)));
        return el;
    }

    function refNodeColors(role) {
        const m = {
            process: { fill: "#3a2d55", stroke: "#b997f6" },
            data:    { fill: "#1c2f4f", stroke: "#80b6ff" },
            input:   { fill: "#15362f", stroke: "#43d17e" },
            output:  { fill: "#542f2f", stroke: "#ff8f86" },
            usage:   { fill: "#3f5667", stroke: "#bdd9ef" },
            random:  { fill: "#5e3b00", stroke: "#ffb34e" },
            calc:    { fill: "#253f57", stroke: "#5ee1ff" }
        };
        return m[role] || m.data;
    }

    function addRefText(g, x, y, text, cls = "") {
        const t = createSvgEl("text", { x, y, class: cls });
        t.textContent = text;
        g.appendChild(t);
        return t;
    }

    function registerRefInteractiveNode(g, id, x, y, w, h) {
        primaryRefNodeEls[id] = g;
        primaryRefNodeBoxes[id] = { x, y, w, h };

        g.style.cursor = "pointer";
        g.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const aliases = PRIMARY_REF_FUNC_ALIASES[id] || [];
            const sym = aliases[0] || id;
            selectedNode = sym;
            emphasizeNode(g);
            focusOnNode(g);
            const nodeNameInput = document.getElementById('node-name');
            const nodePathInput = document.getElementById('node-path');
            if (nodeNameInput) nodeNameInput.value = sym;
            if (nodePathInput) {
                const info = sym2Info[sym];
                nodePathInput.value = info ? info.path : "reference-diagram";
            }
        });
    }

    function addRefNode(svg, spec) {
        const { fill, stroke } = refNodeColors(spec.role || "data");
        const g = createSvgEl("g", {
            class: `ref-node role-${spec.role || "data"}`,
            "data-node-id": spec.id
        });
        const rect = createSvgEl("rect", {
            x: spec.x, y: spec.y, width: spec.w, height: spec.h
        });
        rect.setAttribute("fill", fill);
        rect.setAttribute("stroke", stroke);
        rect.setAttribute("stroke-width", "1.5");
        rect.setAttribute("rx", "6");
        rect.setAttribute("ry", "6");
        rect.setAttribute("data-base-stroke", stroke);
        rect.setAttribute("data-base-stroke-width", "1.5");
        g.appendChild(rect);

        if (Array.isArray(spec.lines)) {
            const lineYStart = spec.y + spec.h / 2 - ((spec.lines.length - 1) * 13) / 2;
            spec.lines.forEach((line, idx) => {
                const cls = (idx > 0) ? "sub" : "";
                addRefText(g, spec.x + spec.w / 2, lineYStart + idx * 13, line, cls);
            });
        } else if (spec.label) {
            addRefText(g, spec.x + spec.w / 2, spec.y + spec.h / 2, spec.label);
        }

        svg.appendChild(g);
        registerRefInteractiveNode(g, spec.id, spec.x, spec.y, spec.w, spec.h);
        return g;
    }

    function addRefArrow(svg, from, to, opts = {}) {
        const path = createSvgEl("path", {
            d: opts.d || `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
            class: "ref-arrow" + (opts.dashed ? " ref-arrow-dashed" : "")
        });
        if (opts.color) path.setAttribute("stroke", opts.color);
        if (opts.width) path.setAttribute("stroke-width", String(opts.width));
        svg.appendChild(path);
        return path;
    }

    function addRefPanel(svg, p) {
        const frame = createSvgEl("rect", {
            x: p.x, y: p.y, width: p.w, height: p.h, class: "ref-panel-frame"
        });
        svg.appendChild(frame);
        const titleBar = createSvgEl("rect", {
            x: p.x + 2, y: p.y + 2, width: p.w - 4, height: 28, class: "ref-panel-titlebar"
        });
        svg.appendChild(titleBar);
        const title = createSvgEl("text", {
            x: p.x + p.w / 2, y: p.y + 16, class: "ref-panel-title"
        });
        title.textContent = p.title;
        svg.appendChild(title);
    }

    function addRefDkGroup(svg, spec) {
        const g = createSvgEl("g", { class: "ref-dk-group", "data-node-id": spec.id });
        const outer = createSvgEl("rect", {
            x: spec.x, y: spec.y, width: spec.w, height: spec.h, class: "outer"
        });
        outer.setAttribute("data-base-stroke", "#ff8f86");
        outer.setAttribute("data-base-stroke-width", "1.5");
        g.appendChild(outer);
        addRefText(g, spec.x + spec.w / 2, spec.y + 14, "dk", "header");

        const innerY = spec.y + 22;
        const innerH = spec.h - 28;
        const cells = [
            { label: "dkPKE", frac: 0.33 },
            { label: "ek", frac: 0.22 },
            { label: "H(ek)", frac: 0.25 },
            { label: "z", frac: 0.20 },
        ];
        const anchorMap = {};
        let cx = spec.x + 8;
        const innerW = spec.w - 16;
        cells.forEach((c, idx) => {
            const w = (idx === cells.length - 1) ? (spec.x + spec.w - 8 - cx) : Math.round(innerW * c.frac);
            if (idx > 0) {
                g.appendChild(createSvgEl("line", {
                    x1: cx, y1: innerY + 2, x2: cx, y2: innerY + innerH - 2, class: "cell-sep"
                }));
            }
            addRefText(g, cx + w / 2, innerY + innerH / 2 + 1, c.label, "cell-text");
            const key = (idx === 0) ? "dkpke" : (idx === 1) ? "ek" : (idx === 2) ? "hek" : "z";
            anchorMap[`${key}-top`] = { x: cx + w / 2, y: spec.y };
            anchorMap[`${key}-bottom`] = { x: cx + w / 2, y: spec.y + spec.h };

            // Reference-style indicators in the grouped dk layout (H(ek) = green, z = orange).
            if (idx === 2) {
                g.appendChild(createSvgEl("circle", {
                    cx: cx + w - 12, cy: innerY + 9, r: 5, fill: "#5edc74", stroke: "#bff6c9", "stroke-width": 1
                }));
            } else if (idx === 3) {
                g.appendChild(createSvgEl("rect", {
                    x: cx + w - 16, y: innerY + 4, width: 10, height: 10,
                    fill: "#ff8a21", stroke: "#ffd19a", "stroke-width": 1, rx: 1.5, ry: 1.5
                }));
            }
            cx += w;
        });

        svg.appendChild(g);
        registerRefInteractiveNode(g, spec.id, spec.x, spec.y, spec.w, spec.h);
        if (primaryRefNodeBoxes[spec.id]) primaryRefNodeBoxes[spec.id].anchors = anchorMap;
        return g;
    }

    function addRefEkPkeGroup(svg, spec) {
        const g = createSvgEl("g", { class: "ref-ekpke-group", "data-node-id": spec.id });
        const outer = createSvgEl("rect", {
            x: spec.x, y: spec.y, width: spec.w, height: spec.h, class: "outer"
        });
        outer.setAttribute("data-base-stroke", "#ff8f86");
        outer.setAttribute("data-base-stroke-width", "1.5");
        g.appendChild(outer);

        const headerH = 16;
        g.appendChild(createSvgEl("line", {
            x1: spec.x + 4, y1: spec.y + headerH, x2: spec.x + spec.w - 4, y2: spec.y + headerH, class: "cell-sep"
        }));
        addRefText(g, spec.x + spec.w / 2, spec.y + 10, "ekPKE", "header");

        const bodyY = spec.y + headerH + 4;
        const bodyH = spec.h - headerH - 8;
        const splitX = spec.x + Math.round(spec.w * 0.62);
        g.appendChild(createSvgEl("line", {
            x1: splitX, y1: bodyY, x2: splitX, y2: bodyY + bodyH, class: "cell-sep"
        }));
        addRefText(g, spec.x + (splitX - spec.x) / 2, bodyY + bodyH / 2 + 1, "t^", "cell-text");
        addRefText(g, splitX + (spec.x + spec.w - splitX) / 2, bodyY + bodyH / 2 + 1, "rho", "cell-text");

        svg.appendChild(g);
        registerRefInteractiveNode(g, spec.id, spec.x, spec.y, spec.w, spec.h);
        if (primaryRefNodeBoxes[spec.id]) {
            primaryRefNodeBoxes[spec.id].anchors = {
                "body-left": { x: spec.x, y: bodyY + bodyH / 2 },
                "body-right": { x: spec.x + spec.w, y: bodyY + bodyH / 2 },
                "t-bottom": { x: spec.x + (splitX - spec.x) / 2, y: spec.y + spec.h },
                "rho-bottom": { x: splitX + (spec.x + spec.w - splitX) / 2, y: spec.y + spec.h },
                "t-top": { x: spec.x + (splitX - spec.x) / 2, y: spec.y },
                "rho-top": { x: splitX + (spec.x + spec.w - splitX) / 2, y: spec.y }
            };
        }
        return g;
    }

    function refAnchor(nodeId, side, dx = 0, dy = 0) {
        const b = primaryRefNodeBoxes[nodeId];
        if (!b) return { x: 0, y: 0 };
        if (b.anchors && b.anchors[side]) {
            return { x: b.anchors[side].x + dx, y: b.anchors[side].y + dy };
        }
        if (side === "left")   return { x: b.x, y: b.y + b.h / 2 + dy };
        if (side === "right")  return { x: b.x + b.w, y: b.y + b.h / 2 + dy };
        if (side === "top")    return { x: b.x + b.w / 2 + dx, y: b.y };
        if (side === "bottom") return { x: b.x + b.w / 2 + dx, y: b.y + b.h };
        return { x: b.x + b.w / 2 + dx, y: b.y + b.h / 2 + dy };
    }

    function canonicalRefBorderSide(side) {
        if (!side) return null;
        if (side === "left" || side === "right" || side === "top" || side === "bottom") return side;
        if (typeof side === "string") {
            if (side.endsWith("-left")) return "left";
            if (side.endsWith("-right")) return "right";
            if (side.endsWith("-top")) return "top";
            if (side.endsWith("-bottom")) return "bottom";
        }
        return null;
    }

    function isCustomNamedRefAnchor(nodeId, side) {
        if (!side || side === "left" || side === "right" || side === "top" || side === "bottom") return false;
        const b = primaryRefNodeBoxes[nodeId];
        return !!(b && b.anchors && b.anchors[side]);
    }

    function orthPolylineFromPoints(a, b, viaPoints, fromSide, toSide) {
        const pts = [a, ...(viaPoints || []), b];
        const out = [{ x: pts[0].x, y: pts[0].y }];
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const next = pts[i];
            if (prev.x === next.x || prev.y === next.y) {
                out.push({ x: next.x, y: next.y });
                continue;
            }

            let horizFirst = true;
            if (i === 1) {
                horizFirst = (fromSide === "left" || fromSide === "right");
            }
            if (i === pts.length - 1) {
                // Ensure the final segment approaches perpendicular to the target border.
                horizFirst = !(toSide === "left" || toSide === "right");
            }

            if (horizFirst) {
                out.push({ x: next.x, y: prev.y });
                out.push({ x: next.x, y: next.y });
            } else {
                out.push({ x: prev.x, y: next.y });
                out.push({ x: next.x, y: next.y });
            }
        }
        return out;
    }

    function compressOrthPolyline(points) {
        if (!Array.isArray(points) || !points.length) return [];
        const out = [{ x: points[0].x, y: points[0].y }];
        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            const last = out[out.length - 1];
            if (p.x === last.x && p.y === last.y) continue;
            out.push({ x: p.x, y: p.y });
            while (out.length >= 3) {
                const a = out[out.length - 3];
                const b = out[out.length - 2];
                const c = out[out.length - 1];
                if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) {
                    out.splice(out.length - 2, 1);
                } else {
                    break;
                }
            }
        }
        return out;
    }

    function refSideNormal(side) {
        if (side === "left") return { x: -1, y: 0 };
        if (side === "right") return { x: 1, y: 0 };
        if (side === "top") return { x: 0, y: -1 };
        if (side === "bottom") return { x: 0, y: 1 };
        return { x: 0, y: 0 };
    }

    function buildRefConnectorPolyline(a, b, fromSide, toSide, opts = {}) {
        const clearance = (opts.clearance != null) ? opts.clearance : 7;
        const nFrom = refSideNormal(fromSide);
        const nTo = refSideNormal(toSide);
        const aOut = { x: a.x + nFrom.x * clearance, y: a.y + nFrom.y * clearance };
        const bIn  = { x: b.x + nTo.x   * clearance, y: b.y + nTo.y   * clearance };
        let middle = [];

        if (opts.points && Array.isArray(opts.points) && opts.points.length) {
            middle = orthPolylineFromPoints(aOut, bIn, opts.points, fromSide, toSide);
        } else if (opts.mode === "vh") {
            middle = [{ x: aOut.x, y: aOut.y }, { x: aOut.x, y: bIn.y }, { x: bIn.x, y: bIn.y }];
        } else if (opts.mode === "hv") {
            middle = [{ x: aOut.x, y: aOut.y }, { x: bIn.x, y: aOut.y }, { x: bIn.x, y: bIn.y }];
        } else {
            // Orthogonal default. "curve" is intentionally normalized to orth routing.
            if (aOut.x === bIn.x || aOut.y === bIn.y) {
                middle = [{ x: aOut.x, y: aOut.y }, { x: bIn.x, y: bIn.y }];
            } else if (toSide === "left" || toSide === "right") {
                middle = [{ x: aOut.x, y: aOut.y }, { x: aOut.x, y: bIn.y }, { x: bIn.x, y: bIn.y }];
            } else {
                middle = [{ x: aOut.x, y: aOut.y }, { x: bIn.x, y: aOut.y }, { x: bIn.x, y: bIn.y }];
            }
        }

        const all = [a, aOut, ...(middle || []).slice(1), bIn, b];
        return compressOrthPolyline(all);
    }

    function buildRefPathWithBridges(polyline, bridgeSeed = 0) {
        const bridgeRadius = 4;
        const bridgeLift = 4;
        if (!Array.isArray(polyline) || polyline.length < 2) return { d: "", segments: [] };

        const builtSegs = [];
        let d = `M ${polyline[0].x} ${polyline[0].y}`;

        const almostEq = (u, v) => Math.abs(u - v) < 0.001;
        const betweenOpen = (v, a, b) => v > Math.min(a, b) + 0.001 && v < Math.max(a, b) - 0.001;

        for (let i = 1; i < polyline.length; i++) {
            const p0 = polyline[i - 1];
            const p1 = polyline[i];
            if (almostEq(p0.x, p1.x) && almostEq(p0.y, p1.y)) continue;

            const horiz = almostEq(p0.y, p1.y);
            const vert = almostEq(p0.x, p1.x);
            if (!horiz && !vert) {
                d += ` L ${p1.x} ${p1.y}`;
                continue;
            }

            const crossings = [];
            for (const s of primaryRefDrawnSegments) {
                if (horiz && s.orient === "v") {
                    if (!betweenOpen(s.x, p0.x, p1.x)) continue;
                    if (!betweenOpen(p0.y, s.y1, s.y2)) continue;
                    if (Math.abs(s.x - p0.x) <= bridgeRadius + 1 || Math.abs(s.x - p1.x) <= bridgeRadius + 1) continue;
                    crossings.push(s.x);
                } else if (vert && s.orient === "h") {
                    if (!betweenOpen(s.y, p0.y, p1.y)) continue;
                    if (!betweenOpen(p0.x, s.x1, s.x2)) continue;
                    if (Math.abs(s.y - p0.y) <= bridgeRadius + 1 || Math.abs(s.y - p1.y) <= bridgeRadius + 1) continue;
                    crossings.push(s.y);
                }
            }

            if (!crossings.length) {
                d += ` L ${p1.x} ${p1.y}`;
            } else if (horiz) {
                const sign = (p1.x >= p0.x) ? 1 : -1;
                const liftSign = ((bridgeSeed + i) % 2 === 0) ? -1 : 1;
                const sorted = crossings.slice().sort((a, b) => sign * (a - b));
                let cursorX = p0.x;
                for (const xc of sorted) {
                    const preX = xc - sign * bridgeRadius;
                    const postX = xc + sign * bridgeRadius;
                    d += ` L ${preX} ${p0.y}`;
                    d += ` Q ${xc} ${p0.y + liftSign * bridgeLift} ${postX} ${p0.y}`;
                    cursorX = postX;
                }
                d += ` L ${p1.x} ${p1.y}`;
            } else {
                const sign = (p1.y >= p0.y) ? 1 : -1;
                const liftSign = ((bridgeSeed + i) % 2 === 0) ? 1 : -1;
                const sorted = crossings.slice().sort((a, b) => sign * (a - b));
                let cursorY = p0.y;
                for (const yc of sorted) {
                    const preY = yc - sign * bridgeRadius;
                    const postY = yc + sign * bridgeRadius;
                    d += ` L ${p0.x} ${preY}`;
                    d += ` Q ${p0.x + liftSign * bridgeLift} ${yc} ${p0.x} ${postY}`;
                    cursorY = postY;
                }
                d += ` L ${p1.x} ${p1.y}`;
            }

            if (horiz) {
                builtSegs.push({
                    orient: "h",
                    y: p0.y,
                    x1: Math.min(p0.x, p1.x),
                    x2: Math.max(p0.x, p1.x)
                });
            } else {
                builtSegs.push({
                    orient: "v",
                    x: p0.x,
                    y1: Math.min(p0.y, p1.y),
                    y2: Math.max(p0.y, p1.y)
                });
            }
        }

        return { d, segments: builtSegs };
    }

    function drawRefConnectorInternal(svg, fromSpec, toSpec, opts = {}) {
        const fromRawSide = fromSpec.side || "right";
        const toRawSide = toSpec.side || "left";
        const fromSide = canonicalRefBorderSide(fromRawSide) || "right";
        const toSide = canonicalRefBorderSide(toRawSide) || "left";
        const a = refAnchor(fromSpec.id, fromSpec.side || "right", fromSpec.dx || 0, fromSpec.dy || 0);
        const b = refAnchor(toSpec.id, toSpec.side || "left", toSpec.dx || 0, toSpec.dy || 0);
        const polyline = buildRefConnectorPolyline(a, b, fromSide, toSide, opts || {});
        const bridgeBuilt = buildRefPathWithBridges(polyline, opts.bridgeSeed || 0);
        primaryRefDrawnSegments.push(...bridgeBuilt.segments);

        return addRefArrow(svg, a, b, {
            d: bridgeBuilt.d,
            dashed: !!opts.dashed,
            color: opts.color,
            width: opts.width
        });
    }

    function addRefConnector(svg, fromSpec, toSpec, opts = {}) {
        if (Array.isArray(primaryRefConnectorBuffer)) {
            const clonedOpts = { ...(opts || {}) };
            if (Array.isArray(clonedOpts.points)) {
                clonedOpts.points = clonedOpts.points.map(p => ({ ...p }));
            }
            primaryRefConnectorBuffer.push({
                fromSpec: { ...(fromSpec || {}) },
                toSpec: { ...(toSpec || {}) },
                opts: clonedOpts
            });
            return null;
        }
        return drawRefConnectorInternal(svg, fromSpec, toSpec, opts);
    }

    function flushRefConnectors(svg) {
        if (!Array.isArray(primaryRefConnectorBuffer) || !primaryRefConnectorBuffer.length) {
            primaryRefConnectorBuffer = null;
            return;
        }

        const buffered = primaryRefConnectorBuffer;
        primaryRefConnectorBuffer = null;

        const portCounts = {};
        const portSeen = {};

        function registerEndpointCount(spec, fallbackSide) {
            const rawSide = spec.side || fallbackSide;
            const side = canonicalRefBorderSide(rawSide);
            if (!side) return;
            if (isCustomNamedRefAnchor(spec.id, rawSide)) return;
            if (spec.dx != null || spec.dy != null) return; // explicit override
            const key = `${spec.id}|${side}`;
            portCounts[key] = (portCounts[key] || 0) + 1;
        }

        buffered.forEach(({ fromSpec, toSpec }) => {
            registerEndpointCount(fromSpec, "right");
            registerEndpointCount(toSpec, "left");
        });

        function portOffsetFor(spec, fallbackSide) {
            const rawSide = spec.side || fallbackSide;
            const side = canonicalRefBorderSide(rawSide);
            if (!side) return { dx: spec.dx || 0, dy: spec.dy || 0 };
            if (isCustomNamedRefAnchor(spec.id, rawSide)) return { dx: spec.dx || 0, dy: spec.dy || 0 };
            if (spec.dx != null || spec.dy != null) return { dx: spec.dx || 0, dy: spec.dy || 0 };

            const key = `${spec.id}|${side}`;
            const total = portCounts[key] || 1;
            const idx = portSeen[key] || 0;
            portSeen[key] = idx + 1;

            if (total <= 1) return { dx: 0, dy: 0 };

            const box = primaryRefNodeBoxes[spec.id];
            const len = box ? ((side === "left" || side === "right") ? box.h : box.w) : 40;
            const reach = Math.max(6, len * 0.28);
            const step = Math.min(14, Math.max(8, reach / Math.max(1, (total - 1) / 2)));
            const centeredIndex = idx - (total - 1) / 2;
            const offset = centeredIndex * step;

            if (side === "left" || side === "right") return { dx: 0, dy: offset };
            return { dx: offset, dy: 0 };
        }

        buffered.forEach(({ fromSpec, toSpec, opts }) => {
            const fromAdj = { ...fromSpec };
            const toAdj = { ...toSpec };
            const fromOff = portOffsetFor(fromAdj, "right");
            const toOff = portOffsetFor(toAdj, "left");
            if (fromAdj.dx == null) fromAdj.dx = fromOff.dx;
            if (fromAdj.dy == null) fromAdj.dy = fromOff.dy;
            if (toAdj.dx == null) toAdj.dx = toOff.dx;
            if (toAdj.dy == null) toAdj.dy = toOff.dy;
            drawRefConnectorInternal(svg, fromAdj, toAdj, opts || {});
        });
    }

    function setupPrimaryReferenceNodeMap(svg) {
        svgRoot = svg;
        edgeElements = [];
        nodeMap = {};

        Object.entries(PRIMARY_REF_FUNC_ALIASES).forEach(([nodeId, fns]) => {
            const el = primaryRefNodeEls[nodeId];
            if (!el) return;
            (fns || []).forEach(fn => {
                if (fn && !nodeMap[fn]) nodeMap[fn] = el;
            });
        });

        if (typeof svgPanZoom !== "undefined") {
            try {
                panZoom = svgPanZoom(svg, {
                    controlIconsEnabled: false,
                    zoomScaleSensitivity: 0.25,
                    dblClickZoomEnabled: false,
                    fit: false,
                    center: false,
                    minZoom: 0.5,
                    maxZoom: 6
                });
                if (panZoom && panZoom.resize) panZoom.resize();
                if (panZoom && panZoom.updateBBox) panZoom.updateBBox();
                if (panZoom && panZoom.zoom) panZoom.zoom(1);
                if (panZoom && panZoom.pan) panZoom.pan({ x: 0, y: 0 });
            } catch (e) {
                console.warn("svgPanZoom unavailable for reference diagram:", e);
                panZoom = null;
            }
        } else {
            panZoom = null;
        }

        // Center the large, height-fitted SVG inside the scrollable canvas on first render.
        try {
            const graphEl = document.getElementById("graph");
            if (graphEl) {
                requestAnimationFrame(() => {
                    graphEl.scrollLeft = Math.max(0, Math.round((graphEl.scrollWidth - graphEl.clientWidth) / 2));
                    graphEl.scrollTop = Math.max(0, Math.round((graphEl.scrollHeight - graphEl.clientHeight) / 2));
                });
            }
        } catch (e) {
            console.warn("Could not center graph viewport:", e);
        }
    }

    function renderPrimaryReferenceDiagram() {
        const container = document.getElementById("graph");
        if (!container) return;
        container.innerHTML = "";
        primaryRefNodeEls = {};
        primaryRefNodeBoxes = {};
        primaryRefDrawnSegments = [];

        const svg = createSvgEl("svg", {
            id: "primary-ref-svg",
            class: "primary-ref-root",
            viewBox: "0 0 1980 410",
            preserveAspectRatio: "xMidYMid meet"
        });

        // Fit to available canvas height (not width) to avoid thin-strip rendering for wide diagrams.
        const canvasPad = 24;
        const availW = Math.max(320, (container.clientWidth || 1200) - canvasPad * 2);
        const availH = Math.max(240, (container.clientHeight || 600) - canvasPad * 2);
        const vbW = 1980, vbH = 410;
        const scaleByHeight = availH / vbH;
        const targetW = Math.round(vbW * scaleByHeight);
        const targetH = Math.round(vbH * scaleByHeight);
        svg.setAttribute("width", String(targetW));
        svg.setAttribute("height", String(targetH));

        const defs = createSvgEl("defs");
        const marker = createSvgEl("marker", {
            id: "ref-arrow-head", viewBox: "0 0 10 10",
            refX: 9, refY: 5, markerWidth: 7, markerHeight: 7,
            orient: "auto-start-reverse"
        });
        marker.appendChild(createSvgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#e8efff" }));
        defs.appendChild(marker);
        svg.appendChild(defs);

        svg.appendChild(createSvgEl("rect", { x: 0, y: 0, width: 1980, height: 410, fill: "#0b1220" }));

        const p1 = { x: 16, y: 16, w: 510, h: 350 };
        const p2 = { x: 540, y: 16, w: 500, h: 350 };
        const p3 = { x: 1054, y: 16, w: 910, h: 350 };
        addRefPanel(svg, { ...p1, title: "[19] ML-KEM.KeyGen (Initiator Alice)" });
        addRefPanel(svg, { ...p2, title: "[16] ML-KEM.KeyGen_internal (Initiator Alice)" });
        addRefPanel(svg, { ...p3, title: "[13] K-PKE.KeyGen (Initiator Alice)" });

        // Panel 1: ML-KEM.KeyGen
        addRefNode(svg, { id: "ifnull_d", role: "process", x: 30,  y: 58,  w: 96, h: 40, label: "if NULL" });
        addRefNode(svg, { id: "rand_d", role: "random", x: 150, y: 54,  w: 44, h: 48, label: "d" });
        addRefNode(svg, { id: "dk_out", role: "output", x: 300, y: 54,  w: 54, h: 48, label: "dk" });
        addRefNode(svg, { id: "save_decaps", role: "usage", x: 380, y: 54, w: 128, h: 48, lines: ["Save for", "Decaps"] });
        addRefNode(svg, { id: "return_bottom", role: "output", x: 30, y: 122, w: 96, h: 46, lines: ["return", "bottom"] });
        addRefNode(svg, { id: "mlkem_keygen_internal", role: "process", x: 142, y: 122, w: 270, h: 46, label: "ML-KEM.KeyGen_internal" });
        addRefNode(svg, { id: "ifnull_z", role: "process", x: 30, y: 198, w: 96, h: 40, label: "if NULL" });
        addRefNode(svg, { id: "rand_z", role: "random", x: 150, y: 194, w: 44, h: 48, label: "z" });
        addRefNode(svg, { id: "ek_out", role: "output", x: 300, y: 194, w: 54, h: 48, label: "ek" });
        addRefNode(svg, { id: "send_bob", role: "usage", x: 380, y: 194, w: 128, h: 48, label: "Send to Bob" });

        // Panel 2: ML-KEM.KeyGen_internal
        addRefDkGroup(svg, { id: "dk_fields", x: 556, y: 54, w: 468, h: 62 });
        addRefNode(svg, { id: "dkpke_mid", role: "data", x: 608, y: 146, w: 86, h: 40, label: "dkPKE" });
        addRefNode(svg, { id: "h_pk", role: "calc", x: 812, y: 142, w: 56, h: 48, label: "H" });
        addRefNode(svg, { id: "z_mid", role: "input", x: 920, y: 142, w: 56, h: 48, label: "z" });
        addRefNode(svg, { id: "d_mid", role: "input", x: 556, y: 246, w: 46, h: 40, label: "d" });
        addRefNode(svg, { id: "kpke_keygen", role: "process", x: 622, y: 242, w: 154, h: 48, label: "K-PKE.KeyGen" });
        addRefNode(svg, { id: "ekpke_mid", role: "data", x: 810, y: 246, w: 80, h: 40, label: "ekPKE" });
        addRefNode(svg, { id: "ek_bar", role: "output", x: 912, y: 246, w: 50, h: 40, label: "ek" });

        // Panel 3: K-PKE.KeyGen
        const x0 = 1060, y0 = 58;
        addRefNode(svg, { id: "k_box", role: "calc", x: x0+8, y: y0, w: 50, h: 42, label: "k" });
        addRefNode(svg, { id: "d_box", role: "input", x: x0+66, y: y0, w: 50, h: 42, label: "d" });
        addRefNode(svg, { id: "hash_g_box", role: "process", x: x0+8, y: y0+58, w: 130, h: 42, label: "G(d||k)" });
        addRefNode(svg, { id: "rho_box", role: "data", x: x0+8, y: y0+212, w: 54, h: 42, label: "rho" });
        addRefNode(svg, { id: "sigma_box", role: "data", x: x0+152, y: y0+58, w: 56, h: 42, label: "sigma" });
        addRefNode(svg, { id: "loop_s", role: "process", x: x0+78, y: y0+116, w: 88, h: 40, lines: ["For i in", "(0..k)"] });
        addRefNode(svg, { id: "loop_a", role: "process", x: x0+78, y: y0+174, w: 88, h: 40, lines: ["For j in", "(0..k)"] });

        addRefNode(svg, { id: "prf_s", role: "process", x: x0+236, y: y0, w: 108, h: 42, label: "PRF(sigma,N)" });
        addRefNode(svg, { id: "n_box", role: "data", x: x0+236, y: y0+58, w: 46, h: 38, label: "N" });
        addRefNode(svg, { id: "n1_box", role: "process", x: x0+292, y: y0+58, w: 54, h: 38, label: "N+1" });
        addRefNode(svg, { id: "prf_e", role: "process", x: x0+236, y: y0+116, w: 108, h: 42, label: "PRF(sigma,N)" });
        addRefNode(svg, { id: "sample_ntt", role: "process", x: x0+226, y: y0+174, w: 178, h: 42, label: "SampleNTT(rho|j|i)" });

        addRefNode(svg, { id: "cbd_s", role: "process", x: x0+356, y: y0, w: 124, h: 42, label: "SamplePolyCBD" });
        addRefNode(svg, { id: "cbd_e", role: "process", x: x0+356, y: y0+116, w: 124, h: 42, label: "SamplePolyCBD" });
        addRefNode(svg, { id: "matrix_A", role: "data", x: x0+414, y: y0+174, w: 58, h: 42, label: "A^" });

        addRefNode(svg, { id: "s_box", role: "data", x: x0+492, y: y0, w: 34, h: 42, label: "s" });
        addRefNode(svg, { id: "e_box", role: "data", x: x0+492, y: y0+116, w: 34, h: 42, label: "e" });
        addRefNode(svg, { id: "ntt_s", role: "process", x: x0+536, y: y0, w: 44, h: 42, label: "NTT" });
        addRefNode(svg, { id: "ntt_e", role: "process", x: x0+536, y: y0+116, w: 44, h: 42, label: "NTT" });
        addRefNode(svg, { id: "s_hat_box", role: "data", x: x0+590, y: y0, w: 40, h: 42, label: "s^" });
        addRefNode(svg, { id: "e_hat_box", role: "data", x: x0+590, y: y0+116, w: 40, h: 42, label: "e^" });
        addRefNode(svg, { id: "t_calc", role: "process", x: x0+488, y: y0+174, w: 154, h: 42, label: "t^ = A^ o s^ + e^" });
        addRefNode(svg, { id: "t_hat_box", role: "data", x: x0+652, y: y0+174, w: 40, h: 42, label: "t^" });

        addRefNode(svg, { id: "byteencode_sk", role: "process", x: x0+694, y: y0, w: 110, h: 42, label: "ByteEncode" });
        addRefNode(svg, { id: "dkpke_out", role: "output", x: x0+816, y: y0, w: 82, h: 42, label: "dkPKE" });
        addRefNode(svg, { id: "byteencode_pk", role: "process", x: x0+694, y: y0+174, w: 110, h: 42, label: "ByteEncode" });
        addRefEkPkeGroup(svg, { id: "ekpke_out", x: x0+808, y: y0+162, w: 90, h: 64 });

        // Queue connectors first so border ports can be distributed consistently.
        primaryRefConnectorBuffer = [];

        // Panel 1 connectors
        addRefConnector(svg, {id:"ifnull_d", side:"right"}, {id:"rand_d", side:"left"});
        addRefConnector(svg, {id:"rand_d", side:"right"}, {id:"dk_out", side:"left"});
        addRefConnector(svg, {id:"dk_out", side:"right"}, {id:"save_decaps", side:"left"});
        addRefConnector(svg, {id:"ifnull_z", side:"right"}, {id:"rand_z", side:"left"});
        addRefConnector(svg, {id:"rand_z", side:"right"}, {id:"ek_out", side:"left"});
        addRefConnector(svg, {id:"ek_out", side:"right"}, {id:"send_bob", side:"left"});
        addRefConnector(svg, {id:"ifnull_d", side:"bottom", dx:-10}, {id:"return_bottom", side:"top", dx:-10}, {mode:"vh"});
        addRefConnector(svg, {id:"ifnull_z", side:"top", dx:-10}, {id:"return_bottom", side:"bottom", dx:-10}, {mode:"vh"});
        addRefConnector(svg, {id:"rand_d", side:"bottom"}, {id:"mlkem_keygen_internal", side:"top", dx:-64}, {mode:"vh"});
        addRefConnector(svg, {id:"rand_z", side:"top"}, {id:"mlkem_keygen_internal", side:"bottom", dx:-64}, {mode:"vh"});
        addRefConnector(svg, {id:"mlkem_keygen_internal", side:"right", dy:-12}, {id:"dk_out", side:"bottom"}, {
            mode:"curve", c1:{x:470,y:130}, c2:{x:356,y:110}
        });
        addRefConnector(svg, {id:"mlkem_keygen_internal", side:"right", dy:12}, {id:"ek_out", side:"top"}, {
            mode:"curve", c1:{x:470,y:162}, c2:{x:356,y:188}
        });

        // KEM internal + cross-panel links
        addRefConnector(svg, {id:"mlkem_keygen_internal", side:"right"}, {id:"kpke_keygen", side:"left"}, {
            dashed:true,
            points:[
                { x: p2.x - 18, y: refAnchor("mlkem_keygen_internal", "right").y },
                { x: p2.x - 18, y: refAnchor("kpke_keygen", "left").y }
            ]
        });
        addRefConnector(svg, {id:"rand_d", side:"top"}, {id:"d_mid", side:"left"}, {
            dashed:true,
            points:[
                { x: refAnchor("rand_d", "top").x, y: p1.y + 36 },
                { x: p2.x - 28, y: p1.y + 36 },
                { x: p2.x - 28, y: refAnchor("d_mid", "left").y }
            ]
        });
        addRefConnector(svg, {id:"rand_z", side:"bottom"}, {id:"z_mid", side:"left"}, {
            dashed:true,
            points:[
                { x: refAnchor("rand_z", "bottom").x, y: p2.y + p2.h + 14 },
                { x: p2.x - 10, y: p2.y + p2.h + 14 },
                { x: p2.x - 10, y: refAnchor("z_mid", "left").y }
            ]
        });
        addRefConnector(svg, {id:"d_mid", side:"right"}, {id:"kpke_keygen", side:"left"});
        addRefConnector(svg, {id:"kpke_keygen", side:"right"}, {id:"ekpke_mid", side:"left"});
        addRefConnector(svg, {id:"ekpke_mid", side:"right"}, {id:"ek_bar", side:"left"});
        addRefConnector(svg, {id:"ek_bar", side:"top"}, {id:"h_pk", side:"bottom"}, {mode:"vh"});
        addRefConnector(svg, {id:"kpke_keygen", side:"top", dx:-46}, {id:"dkpke_mid", side:"bottom", dx:6}, {
            mode:"curve", c1:{x:650,y:218}, c2:{x:626,y:174}
        });
        addRefConnector(svg, {id:"dkpke_mid", side:"top"}, {id:"dk_fields", side:"dkpke-bottom"}, {mode:"vh"});
        addRefConnector(svg, {id:"ek_bar", side:"top"}, {id:"dk_fields", side:"ek-bottom"}, {mode:"vh"});
        addRefConnector(svg, {id:"h_pk", side:"top"}, {id:"dk_fields", side:"hek-bottom"}, {mode:"vh"});
        addRefConnector(svg, {id:"z_mid", side:"top"}, {id:"dk_fields", side:"z-bottom"}, {mode:"vh"});

        addRefConnector(svg, {id:"dk_fields", side:"left"}, {id:"dk_out", side:"right"}, {
            dashed:true,
            points:[
                { x: p1.x + p1.w + 18, y: refAnchor("dk_fields", "left").y },
                { x: p1.x + p1.w + 18, y: p1.y + 36 },
                { x: refAnchor("dk_out", "right").x + 18, y: p1.y + 36 },
                { x: refAnchor("dk_out", "right").x + 18, y: refAnchor("dk_out", "right").y }
            ]
        });
        addRefConnector(svg, {id:"ek_bar", side:"left"}, {id:"ek_out", side:"right"}, {
            dashed:true,
            points:[
                { x: p2.x - 20, y: refAnchor("ek_bar", "left").y },
                { x: p2.x - 20, y: refAnchor("ek_out", "bottom").y + 16 },
                { x: refAnchor("ek_out", "right").x + 18, y: refAnchor("ek_out", "bottom").y + 16 },
                { x: refAnchor("ek_out", "right").x + 18, y: refAnchor("ek_out", "right").y }
            ]
        });
        addRefConnector(svg, {id:"kpke_keygen", side:"right"}, {id:"hash_g_box", side:"left"}, {
            dashed:true,
            points:[
                { x: p3.x - 16, y: refAnchor("kpke_keygen", "right").y },
                { x: p3.x - 16, y: refAnchor("hash_g_box", "left").y }
            ]
        });
        addRefConnector(svg, {id:"dkpke_out", side:"top"}, {id:"dkpke_mid", side:"right"}, {
            dashed:true,
            points:[
                { x: refAnchor("dkpke_out", "top").x, y: p3.y + 36 },
                { x: p3.x - 18, y: p3.y + 36 },
                { x: p3.x - 18, y: refAnchor("dkpke_mid", "right").y }
            ]
        });
        addRefConnector(svg, {id:"ekpke_out", side:"bottom"}, {id:"ekpke_mid", side:"right"}, {
            dashed:true,
            points:[
                { x: refAnchor("ekpke_out", "bottom").x, y: p2.y + p2.h + 14 },
                { x: p3.x - 18, y: p2.y + p2.h + 14 },
                { x: p3.x - 18, y: refAnchor("ekpke_mid", "right").y }
            ]
        });

        // Panel 3 connectors (all snapped to node borders)
        addRefConnector(svg, {id:"k_box", side:"bottom"}, {id:"hash_g_box", side:"top", dx:-34}, {mode:"vh"});
        addRefConnector(svg, {id:"d_box", side:"bottom"}, {id:"hash_g_box", side:"top", dx:22}, {mode:"vh"});
        addRefConnector(svg, {id:"hash_g_box", side:"right"}, {id:"sigma_box", side:"left"});
        addRefConnector(svg, {id:"hash_g_box", side:"bottom", dx:-34}, {id:"rho_box", side:"top"}, {mode:"vh"});
        addRefConnector(svg, {id:"sigma_box", side:"bottom"}, {id:"loop_s", side:"top", dx:16}, {mode:"vh"});
        addRefConnector(svg, {id:"rho_box", side:"right"}, {id:"loop_a", side:"left"}, {mode:"hv"});

        addRefConnector(svg, {id:"loop_s", side:"right", dy:-10}, {id:"prf_s", side:"left", dy:10}, {mode:"hv"});
        addRefConnector(svg, {id:"loop_s", side:"right", dy:10}, {id:"prf_e", side:"left"}, {mode:"hv"});
        addRefConnector(svg, {id:"prf_s", side:"bottom"}, {id:"n_box", side:"top"}, {mode:"vh"});
        addRefConnector(svg, {id:"n_box", side:"right"}, {id:"n1_box", side:"left"});
        addRefConnector(svg, {id:"n1_box", side:"bottom"}, {id:"prf_e", side:"top"}, {mode:"vh"});

        addRefConnector(svg, {id:"prf_s", side:"right"}, {id:"cbd_s", side:"left"});
        addRefConnector(svg, {id:"cbd_s", side:"right"}, {id:"s_box", side:"left"});
        addRefConnector(svg, {id:"s_box", side:"right"}, {id:"ntt_s", side:"left"});
        addRefConnector(svg, {id:"ntt_s", side:"right"}, {id:"s_hat_box", side:"left"});
        addRefConnector(svg, {id:"s_hat_box", side:"right"}, {id:"byteencode_sk", side:"left"}, {
            mode:"curve", c1:{x:x0+680,y:y0+20}, c2:{x:x0+695,y:y0+20}
        });
        addRefConnector(svg, {id:"byteencode_sk", side:"right"}, {id:"dkpke_out", side:"left"});

        addRefConnector(svg, {id:"prf_e", side:"right"}, {id:"cbd_e", side:"left"});
        addRefConnector(svg, {id:"cbd_e", side:"right"}, {id:"e_box", side:"left"});
        addRefConnector(svg, {id:"e_box", side:"right"}, {id:"ntt_e", side:"left"});
        addRefConnector(svg, {id:"ntt_e", side:"right"}, {id:"e_hat_box", side:"left"});

        addRefConnector(svg, {id:"loop_a", side:"right"}, {id:"sample_ntt", side:"left"}, {mode:"hv"});
        addRefConnector(svg, {id:"rho_box", side:"right"}, {id:"sample_ntt", side:"left", dy:12}, {
            mode:"curve", c1:{x:x0+170,y:y0+232}, c2:{x:x0+214,y:y0+232}
        });
        addRefConnector(svg, {id:"sample_ntt", side:"right"}, {id:"matrix_A", side:"left"});
        addRefConnector(svg, {id:"matrix_A", side:"right"}, {id:"t_calc", side:"left"});
        addRefConnector(svg, {id:"s_hat_box", side:"bottom"}, {id:"t_calc", side:"top", dx:-42}, {mode:"vh"});
        addRefConnector(svg, {id:"e_hat_box", side:"bottom"}, {id:"t_calc", side:"top", dx:26}, {mode:"vh"});
        addRefConnector(svg, {id:"t_calc", side:"right"}, {id:"t_hat_box", side:"left"});
        addRefConnector(svg, {id:"t_hat_box", side:"right"}, {id:"byteencode_pk", side:"left"});
        addRefConnector(svg, {id:"byteencode_pk", side:"right"}, {id:"ekpke_out", side:"body-left"});
        addRefConnector(svg, {id:"rho_box", side:"bottom"}, {id:"ekpke_out", side:"rho-bottom"}, {
            points: [
                { x: refAnchor("rho_box", "bottom").x, y: p3.y + p3.h - 10 },
                { x: refAnchor("ekpke_out", "rho-bottom").x, y: p3.y + p3.h - 10 }
            ]
        });

        flushRefConnectors(svg);
        container.appendChild(svg);
        setupPrimaryReferenceNodeMap(svg);
    }

    function highlightPrimaryReferenceForStep(step) {
        Object.values(primaryRefNodeEls).forEach(el => el.classList.remove("step-highlight"));
        if (!step) return;
        const tabMap = PRIMARY_REF_STEP_MAP[currentTab] || {};
        const ids = tabMap[step.id] || [];
        ids.forEach(id => {
            const el = primaryRefNodeEls[id];
            if (el) el.classList.add("step-highlight");
        });
    }

    // Render the recreated KeyGen reference diagram as the central visualization.
    // Tabs remain step-specific; the main graph is global.
    try {
        renderPrimaryReferenceDiagram();
        renderFlowLegend();          // no-op when flow panel is not present
        renderTabs();
        renderSteps();
        renderFlowGraphForStep(null); // no-op when flow panel is not present
        renderTraceSteps();
    } catch (error) {
        console.error(error);
        const container = document.getElementById('graph');
        if (container) container.textContent = "Error rendering reference diagram: " + error;
    }
        """)
        f.write("</script>\n")
        f.write("</body>\n</html>\n")

    print(f"Wrote HTML visualization to {html_path}")
    print("Open it in a browser to view the primary KeyGen reference diagram with tab-specific steps.")



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
        help="Graphviz .dot output file for the call graph",
    )
    ap.add_argument(
        "--html",
        help="HTML file for animated call graph visualization",
    )
    ap.add_argument(
        "--graph-dot",
        default=None,
        help="DOT file to use as the single global diagram in the right pane (overrides generated ELF dot).",
    )
    ap.add_argument(
        "--keygen-dot",
        default=None,
        help="Deprecated: accepted for compatibility, but not used for rendering (the diagram is global, not tab-specific).",
    )
    ap.add_argument(
        "--trace-log",
        default=None,
        help="Path to UART log containing TRACE|... lines to overlay step view",
    )
    ap.add_argument(
        "--flow-spec",
        default=None,
        help="Path to a JSON flow specification (CrypTool-like panels/boxes/arrows + mapping to functions).",
    )
    ap.add_argument(
        "--steps-json",
        default=None,
        help="Path to steps JSON (deterministic values for variables) to drive the UI (preferred over --trace-log).",
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
        write_dot(str(elf), cg, sym2file, project_syms, args.dot, args.root_func, project_root)

    trace_steps = None
    if args.trace_log:
        trace_steps = parse_trace_log(args.trace_log)

    steps_json = None
    if args.steps_json:
        steps_json = json.loads(Path(args.steps_json).read_text())
        print("[debug] loaded steps_json keys:", steps_json.keys())

    flow_spec = None
    if args.flow_spec:
        flow_spec = json.loads(Path(args.flow_spec).read_text())

    graph_dot_override_text = None
    if args.graph_dot:
        graph_dot_override_text = Path(args.graph_dot).read_text()

    if args.keygen_dot:
        print("[warn] --keygen-dot is ignored for rendering in the current UI (single global graph).")
        print("       Use --graph-dot if you want to override the global diagram.")

    if args.html:
        write_html_animation(
            str(elf), cg, sym2file, project_syms,
            args.html, args.root_func, project_root,
            trace_steps=trace_steps,
            steps_json=steps_json,
            flow_spec=flow_spec,
            graph_dot_override_text=graph_dot_override_text,
        )

if __name__ == "__main__":
    main()
