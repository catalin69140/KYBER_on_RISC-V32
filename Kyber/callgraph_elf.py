#!/usr/bin/env python3
import argparse
import subprocess
from collections import defaultdict, deque
from pathlib import Path
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


def write_html_animation(elf, cg, sym2file, project_syms, html_path, root_func, project_root):
    """
    Generate an HTML file that:
      - Uses Viz.js to render the same DOT as the PNG (same layout/structure)
      - Adds pan/zoom
      - Animates edges in BFS-ish order from main
      - Provides Play/Pause, Step Back, Step Forward, Speed controls
      - Optional 'Follow line' that jumps the camera to each red edge
    """
    order, _, _ = bfs_from_main(cg, root_func)
    if not order:
        print(f"[!] No calls found from {root_func}, not writing HTML.")
        return

    dot_text = generate_dot(elf, cg, sym2file, project_syms, root_func, project_root)
    dot_js = _js_escape(dot_text)

    # Edge order for animation, in BFS caller order
    edge_keys = []
    for caller in order:
        for callee in cg.get(caller, []):
            if callee in order:
                edge_keys.append(f"{caller}->{callee}")

    elf_name = Path(elf).name
    html_path = Path(html_path)

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
        f.write("}\n")
        f.write("#graph-container {\n")
        f.write("  flex: 1;\n")
        f.write("  width: 100%;\n")
        f.write("}\n")
        f.write("#graph {\n")
        f.write("  width: 100%;\n")
        f.write("  height: 100%;\n")
        f.write("}\n")
        f.write("</style>\n</head>\n<body>\n")

        f.write(f"<h3>Call graph animation for <code>{elf_name}</code></h3>\n")
        f.write(
            "<p>Layout and clusters match the Graphviz PNG. "
            "Use the controls to animate calls from <code>main</code>.</p>\n"
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
            '<input type="checkbox" id="follow-line"> Follow line'
            '</label>\n'
        )
        f.write(
            '<span style="margin-left:10px;">Zoom: '
            '<button id="zoom-in">+</button>'
            '<button id="zoom-out">-</button>'
            '<button id="zoom-reset">Reset</button>'
            '</span>\n'
        )
        f.write("</div>\n")

        f.write('<div id="graph-container"><div id="graph"></div></div>\n')

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
        f.write("const edgeOrder = [\n")
        for key in edge_keys:
            f.write(f'  "{_js_escape(key)}",\n')
        f.write("];\n")

        f.write(r"""
let viz = new Viz();
let edgeElements = [];
let currentIndex = -1;        // index of the "current" edge
let playingDirection = null;  // "forward" | "backward" | null
let speed = 1.0;
let panZoom = null;
let svgRoot = null;
let followLine = false;

function setupGraphAnimation(svgElement) {
    svgRoot = svgElement;

    // Enable pan/zoom with visible control icons
    panZoom = svgPanZoom(svgElement, {
        controlIconsEnabled: true,
        zoomScaleSensitivity: 0.4
    });

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
    edgeElements = edgeOrder.map(key => {
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

        return { key, group: g, path, length };
    }).filter(e => e !== null);

    // Initially: all grey + hidden
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
    if (zoomResetBtn) zoomResetBtn.onclick = () => { if (panZoom) panZoom.reset(); };
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
        // 0.25 = exact middle, tweak as you like (0.55, 0.65, etc.)
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


// Color & dash state for all edges based on currentIndex
//   - current edge (i == currentIndex): RED
//   - previous edge (i == currentIndex - 1): BLUE
//   - all others: GREY
//   - edges < currentIndex-1: grey but drawn (dashoffset=0)
//   - future edges > currentIndex: grey + hidden (dashoffset=length)
function highlightEdges(idx) {
    if (typeof idx === "number") {
        currentIndex = idx;
    }

    edgeElements.forEach((e, i) => {
        if (!e || !e.path) return;
        const path   = e.path;
        const length = e.length;

        if (currentIndex < 0) {
            // initial: all grey, not yet drawn
            path.setAttribute("stroke", "#aaaaaa");
            path.setAttribute("stroke-dashoffset", length);
        } else if (i === currentIndex) {
            // current edge: red and fully drawn
            path.setAttribute("stroke", "#ff0000");
            path.setAttribute("stroke-dashoffset", 0);
        } else if (i === currentIndex - 1) {
            // immediate previous edge: blue and fully drawn
            path.setAttribute("stroke", "#3366ff");
            path.setAttribute("stroke-dashoffset", 0);
        } else {
            // all other edges
            path.setAttribute("stroke", "#aaaaaa");
            if (i < currentIndex - 1) {
                // older than previous: grey but drawn
                path.setAttribute("stroke-dashoffset", 0);
            } else {
                // future edges: grey and hidden
                path.setAttribute("stroke-dashoffset", length);
            }
        }
    });
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
            } else {
                // final: fully hidden
                path.setAttribute("stroke-dashoffset", length);
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
    // mark this as current (colors + dash state)
    highlightEdges(nextIndex);
    focusOnEdge(nextIndex);
    animateEdge(nextIndex, "forward", (completed) => {
        if (!completed || playingDirection !== "forward") return;
        // keep states consistent: current red, previous blue, others grey
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

// Render graph with Viz.js
viz.renderSVGElement(dotSrc)
    .then(function(svgElement) {
        const container = document.getElementById('graph');
        container.innerHTML = "";
        container.appendChild(svgElement);
        setupGraphAnimation(svgElement);
    })
    .catch(function(error) {
        console.error(error);
        const container = document.getElementById('graph');
        container.textContent = "Error rendering graph: " + error;
    });
""")
        f.write("</script>\n")
        f.write("</body>\n</html>\n")

    print(f"Wrote animated HTML to {html_path}")
    print("Open it in a browser (with internet access for the JS libs) to watch the calls animate.")


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

    if args.html:
        write_html_animation(str(elf), cg, sym2file, project_syms, args.html, args.root_func, project_root)


if __name__ == "__main__":
    main()
