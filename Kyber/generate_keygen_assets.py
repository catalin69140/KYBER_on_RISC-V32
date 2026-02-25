#!/usr/bin/env python3
"""
Generate KeyGen UI assets from the KeyGen Markdown docs + an ELF with debug symbols.

Outputs:
  - steps_keygen JSON (for the KeyGen tab step list)
  - KeyGen-focused DOT call graph with enriched labels (function + file/line + role tag)
  - Optional JSON sidecar with step/function metadata and best-effort variable metadata

The Markdown docs in docs/keygen/ are treated as the source of truth for step titles/order.
Function/file/line metadata is extracted automatically from the ELF/toolchain (nm/objdump/addr2line).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

# Reuse existing call graph extraction logic (objdump parser) from the project.
from cryptoTool_callgraph_elf import build_call_graph


FUNC_SYMBOL_TYPES = {"T", "t", "W", "w"}
OBJ_SYMBOL_TYPES = {
    "B", "b", "C", "c", "D", "d", "G", "g", "R", "r", "S", "s", "V", "v",
}


def run_cmd(cmd: List[str]) -> str:
    try:
        return subprocess.run(
            cmd,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        ).stdout
    except FileNotFoundError as e:
        tool = cmd[0] if cmd else "<tool>"
        raise RuntimeError(
            f"Required tool not found in PATH: {tool}. "
            "Install the tool (or pass --nm-tool/--objdump-tool/--addr2line-tool explicitly)."
        ) from e


def parse_nm_defined_symbols(elf: str, nm_tool: str) -> List[dict]:
    """
    Parse defined symbols with addresses/sizes from `nm -S -n`.

    Expected format (GNU nm):
      address size type name
    """
    out = run_cmd([nm_tool, "-C", "--defined-only", "-n", "-S", elf])
    symbols: List[dict] = []
    for raw in out.splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 4:
            continue
        addr_s, size_s, typ = parts[0], parts[1], parts[2]
        name = " ".join(parts[3:])
        try:
            addr = int(addr_s, 16)
        except ValueError:
            continue
        try:
            size = int(size_s, 16)
        except ValueError:
            size = 0
        symbols.append(
            {
                "name": name,
                "type": typ,
                "addr": addr,
                "addr_hex": f"0x{addr:x}",
                "size": size,
            }
        )
    return symbols


def addr2line_single(elf: str, addr2line_tool: str, addr: int) -> Tuple[str, int]:
    out = run_cmd([addr2line_tool, "-C", "-e", elf, f"0x{addr:x}"])
    line = (out.splitlines() or ["??:0"])[-1].strip()
    if ":" not in line:
        return line, 0
    file_s, ln_s = line.rsplit(":", 1)
    try:
        ln = int(ln_s)
    except ValueError:
        ln = 0
    return file_s, ln


def rel_path_or_abs(file_s: str, project_root: Path) -> str:
    if not file_s or file_s == "??":
        return "??"
    try:
        return str(Path(file_s).resolve().relative_to(project_root.resolve()))
    except Exception:
        return file_s


def collect_function_metadata(
    elf: str,
    nm_tool: str,
    addr2line_tool: str,
    project_root: Path,
) -> Dict[str, dict]:
    all_syms = parse_nm_defined_symbols(elf, nm_tool)
    funcs = [s for s in all_syms if s["type"] in FUNC_SYMBOL_TYPES]
    out: Dict[str, dict] = {}
    for s in funcs:
        start_file, start_line = addr2line_single(elf, addr2line_tool, s["addr"])
        end_line = start_line
        end_file = start_file
        if s["size"] > 0:
            # Symbol size -> best-effort end address for a line range.
            end_addr = max(s["addr"], s["addr"] + s["size"] - 1)
            end_file, end_line = addr2line_single(elf, addr2line_tool, end_addr)
            if end_file != start_file:
                end_file, end_line = start_file, start_line
        out[s["name"]] = {
            "name": s["name"],
            "addr": s["addr_hex"],
            "size": s["size"],
            "file": start_file,
            "line_start": start_line,
            "line_end": end_line,
            "path": rel_path_or_abs(start_file, project_root),
        }
    return out


def collect_global_variable_metadata(
    elf: str,
    nm_tool: str,
    addr2line_tool: str,
    project_root: Path,
) -> List[dict]:
    """
    Best-effort variable metadata from defined object symbols.

    Note:
      - This captures global/static object symbols visible in the ELF symbol table.
      - Local stack variables are usually not recoverable from nm and may be optimized out.
    """
    all_syms = parse_nm_defined_symbols(elf, nm_tool)
    vars_out: List[dict] = []
    for s in all_syms:
        if s["type"] not in OBJ_SYMBOL_TYPES:
            continue
        file_s, line = addr2line_single(elf, addr2line_tool, s["addr"])
        vars_out.append(
            {
                "name": s["name"],
                "kind": "global_symbol",
                "symbol_type": s["type"],
                "addr": s["addr_hex"],
                "size": s["size"],
                "file": file_s,
                "line": line,
                "path": rel_path_or_abs(file_s, project_root),
            }
        )
    return vars_out


def parse_markdown_title(md_path: Path) -> str:
    for line in md_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return md_path.stem


SUMMARY_STEP_RE = re.compile(r"^###\s+(\d+)\.\s+(.+?)\s*$")


def parse_summary_steps(summary_md: Path) -> List[Tuple[int, str]]:
    out: List[Tuple[int, str]] = []
    for line in summary_md.read_text(encoding="utf-8").splitlines():
        m = SUMMARY_STEP_RE.match(line)
        if m:
            out.append((int(m.group(1)), m.group(2)))
    return out


def first_existing(func_meta: Dict[str, dict], candidates: Iterable[str]) -> Optional[str]:
    for name in candidates:
        if name in func_meta:
            return name
    return None


def resolve_candidates(func_meta: Dict[str, dict], candidates: Iterable[str]) -> List[str]:
    resolved: List[str] = []
    seen = set()

    for c in candidates:
        if c in func_meta and c not in seen:
            resolved.append(c)
            seen.add(c)

    # Best-effort aliasing for compiler/round variants.
    alias_patterns = [
        ("hash_g", re.compile(r"^(hash_g|sha3_512)$")),
        ("hash_h", re.compile(r"^(hash_h|sha3_256)$")),
        ("poly_getnoise_eta1", re.compile(r"^(poly_getnoise_eta1|poly_getnoise)$")),
        ("polyvec_basemul_acc_montgomery", re.compile(r"^(polyvec_basemul_acc_montgomery|polyvec_pointwise_acc)$")),
        ("pack_pk", re.compile(r"^(pack_pk|polyvec_tobytes|polyvec_compress)$")),
        ("pack_sk", re.compile(r"^(pack_sk|polyvec_tobytes)$")),
        ("prf", re.compile(r"^(prf|shake256)$")),
        ("xof_absorb", re.compile(r"^(xof_absorb|shake128_absorb)$")),
        ("xof_squeezeblocks", re.compile(r"^(xof_squeezeblocks|shake128_squeezeblocks)$")),
        ("polyvec_reduce", re.compile(r"^(polyvec_reduce|poly_reduce|barrett_reduce|freeze)$")),
    ]
    present = set(resolved)
    for c in candidates:
        for canonical, pat in alias_patterns:
            if c != canonical:
                continue
            for fn in sorted(func_meta.keys()):
                if pat.match(fn) and fn not in present:
                    resolved.append(fn)
                    present.add(fn)
                    break
    return resolved


def build_keygen_step_templates(summary_steps: List[Tuple[int, str]]) -> List[dict]:
    """
    Step titles/order come from docs/10_keygen_flow_summary.md.
    Function candidates and variable chips are mapped to those doc-defined steps.
    """
    title_by_num = {n: title for n, title in summary_steps}

    # The titles are sourced from the Markdown summary file. The rest is UI metadata.
    templates: List[dict] = [
        {
            "num": 1,
            "id": "kg01_setup_randomness",
            "doc_refs": ["00_notation.md", "01_overview.md", "02_randomness_and_seeds.md", "10_keygen_flow_summary.md"],
            "role": "setup randomness",
            "func_candidates": ["crypto_kem_keypair", "indcpa_keypair", "randombytes"],
            "vars": [
                ("d", "seed", "Initial seed input (generated inside indcpa_keypair in this repo)."),
                ("z", "seed", "Fallback secret value appended to KEM secret key in crypto_kem_keypair."),
            ],
        },
        {
            "num": 2,
            "id": "kg02_enter_k_pke_keygen",
            "doc_refs": ["01_overview.md", "03_k_pke_keygen.md", "10_keygen_flow_summary.md"],
            "role": "enter K-PKE.KeyGen",
            "func_candidates": ["crypto_kem_keypair", "indcpa_keypair"],
            "vars": [
                ("pk", "bytes", "Public key output buffer (KEM layer -> K-PKE keygen)."),
                ("sk0", "bytes", "CPA/PKE secret-key bytes region written by indcpa_keypair."),
                ("k", "seed", "Parameter-set dimension (2/3/4 depending on Kyber level)."),
            ],
        },
        {
            "num": 3,
            "id": "kg03_derive_rho_sigma",
            "doc_refs": ["02_randomness_and_seeds.md", "03_k_pke_keygen.md", "10_keygen_flow_summary.md"],
            "role": "derive seeds",
            "func_candidates": ["indcpa_keypair", "hash_g", "sha3_512"],
            "vars": [
                ("buf", "bytes", "Temporary seed-expansion buffer (typically 64 bytes for rho||sigma)."),
                ("rho", "bytes", "Public seed used to deterministically generate matrix A."),
                ("sigma", "bytes", "Secret seed used for PRF/CBD noise sampling."),
            ],
        },
        {
            "num": 4,
            "id": "kg04_generate_s_e",
            "doc_refs": ["04_sampling_and_polynomials.md", "08_security_and_design_rationale.md", "10_keygen_flow_summary.md"],
            "role": "sample noise/polynomials",
            "func_candidates": ["poly_getnoise_eta1", "poly_getnoise", "cbd", "prf", "shake256"],
            "vars": [
                ("nonce", "bytes", "PRF counter incremented per sampled polynomial."),
                ("s", "vector", "Secret polynomial vector with small coefficients."),
                ("e", "vector", "Error/noise polynomial vector with small coefficients."),
                ("eta", "poly", "CBD width parameter controlling coefficient range."),
            ],
        },
        {
            "num": 5,
            "id": "kg05_ntt_conversion",
            "doc_refs": ["00_notation.md", "05_ntt_and_matrix_generation.md", "10_keygen_flow_summary.md"],
            "role": "NTT",
            "func_candidates": ["polyvec_ntt", "poly_ntt"],
            "vars": [
                ("s^", "vector", "Secret vector converted to NTT domain for fast multiplication."),
                ("e^", "vector", "Error vector in NTT domain (round-dependent handling)."),
            ],
        },
        {
            "num": 6,
            "id": "kg06_generate_matrix_A_hat",
            "doc_refs": ["05_ntt_and_matrix_generation.md", "10_keygen_flow_summary.md"],
            "role": "generate matrix A^",
            "func_candidates": ["gen_matrix", "xof_absorb", "xof_squeezeblocks", "shake128_absorb", "shake128_squeezeblocks"],
            "vars": [
                ("A^", "matrix", "Public matrix generated deterministically from rho."),
                ("rho", "bytes", "Public seed reused as matrix-generation seed."),
            ],
        },
        {
            "num": 7,
            "id": "kg07_compute_t_hat",
            "doc_refs": ["06_public_key_construction.md", "10_keygen_flow_summary.md"],
            "role": "compute t^",
            "func_candidates": [
                "polyvec_basemul_acc_montgomery",
                "polyvec_pointwise_acc",
                "polyvec_invntt",
                "polyvec_add",
                "poly_add",
                "polyvec_reduce",
            ],
            "vars": [
                ("t^", "vector", "Public polynomial vector in NTT/round-specific intermediate representation."),
                ("A^ o s^", "calc", "Matrix-vector multiply in NTT domain."),
                ("e^", "vector", "Noise added to hide exact linear relation."),
            ],
        },
        {
            "num": 8,
            "id": "kg08_encode_keys",
            "doc_refs": ["07_encoding_and_output.md", "10_keygen_flow_summary.md"],
            "role": "encode keys",
            "func_candidates": ["pack_pk", "pack_sk", "polyvec_tobytes", "polyvec_compress", "poly_tobytes"],
            "vars": [
                ("ek (pk)", "bytes", "Encoded public key: encoded t-hat/t plus rho."),
                ("dk_pke (sk0)", "bytes", "Encoded CPA/PKE secret key bytes."),
            ],
        },
        {
            "num": 9,
            "id": "kg09_build_kem_secret_key",
            "doc_refs": ["07_encoding_and_output.md", "08_security_and_design_rationale.md", "10_keygen_flow_summary.md"],
            "role": "finalize KEM secret key",
            "func_candidates": ["crypto_kem_keypair", "hash_h", "sha3_256"],
            "vars": [
                ("H(pk)", "bytes", "Hash of public key stored in secret key for decapsulation checks."),
                ("dk", "bytes", "Final KEM secret key: sk0 || pk || H(pk) || z."),
                ("z", "seed", "Fallback secret used in CCA transform on failure paths."),
            ],
        },
        {
            "num": 10,
            "id": "kg10_return_keys",
            "doc_refs": ["01_overview.md", "07_encoding_and_output.md", "10_keygen_flow_summary.md"],
            "role": "return outputs",
            "func_candidates": ["crypto_kem_keypair"],
            "vars": [
                ("pk", "bytes", "Public key returned to caller."),
                ("sk", "bytes", "Secret key returned to caller."),
            ],
        },
    ]

    for t in templates:
        md_title = title_by_num.get(t["num"], f"Step {t['num']}")
        t["title"] = f"{t['num']}. {md_title}"
    return templates


def build_steps_json(step_templates: List[dict], func_meta: Dict[str, dict]) -> dict:
    steps = []
    for t in step_templates:
        funcs = resolve_candidates(func_meta, t["func_candidates"])
        step = {
            "id": t["id"],
            "title": t["title"],
            "funcs": funcs if funcs else list(dict.fromkeys(t["func_candidates"]))[:3],
            "vars": [
                {
                    "name": vname,
                    "kind": vkind,
                    "format": "text",
                    "value": vdesc,
                }
                for (vname, vkind, vdesc) in t["vars"]
            ],
            "doc_refs": t["doc_refs"],
            "role": t["role"],
        }
        steps.append(step)

    return {
        "keygen": {
            "steps": steps,
            "source_of_truth": "Kyber/docs/keygen/*.md",
        }
    }


def step_title_to_cluster_label(title: str) -> str:
    if len(title) <= 80:
        return title
    return title[:77] + "..."


def escape_dot_label(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def pick_step_representative(step_funcs: List[str]) -> Optional[str]:
    if not step_funcs:
        return None
    return step_funcs[0]


def build_keygen_dot(
    elf: Path,
    step_templates: List[dict],
    func_meta: Dict[str, dict],
    call_graph: Dict[str, set],
    root_func: str,
    sidecar_steps: List[dict],
) -> str:
    """
    Generate a KeyGen-focused call graph:
      - clustered by KeyGen step order
      - labels include function + file/line + role tag
      - real call edges between included functions
      - invisible ordering edges to keep clusters aligned to step sequence
    """
    # Step -> resolved functions
    step_to_funcs: Dict[str, List[str]] = {}
    step_num_by_id: Dict[str, int] = {}
    step_title_by_id: Dict[str, str] = {}
    step_role_by_id: Dict[str, str] = {}
    for t in step_templates:
        resolved = resolve_candidates(func_meta, t["func_candidates"])
        step_to_funcs[t["id"]] = resolved
        step_num_by_id[t["id"]] = t["num"]
        step_title_by_id[t["id"]] = t["title"]
        step_role_by_id[t["id"]] = t["role"]

    # Assign each function to its first step cluster to avoid duplicate Graphviz nodes.
    func_to_primary_step: Dict[str, str] = {}
    func_to_all_steps: Dict[str, List[str]] = defaultdict(list)
    for t in step_templates:
        sid = t["id"]
        for fn in step_to_funcs[sid]:
            func_to_all_steps[fn].append(sid)
            func_to_primary_step.setdefault(fn, sid)

    included_funcs = set(func_to_primary_step.keys())
    if root_func in func_meta:
        included_funcs.add(root_func)
        func_to_all_steps[root_func] = list(dict.fromkeys(func_to_all_steps.get(root_func, []) + [step_templates[1]["id"]]))
        func_to_primary_step.setdefault(root_func, step_templates[1]["id"])

    # Precompute filtered call edges.
    edges: List[Tuple[str, str]] = []
    for caller in sorted(included_funcs):
        for callee in sorted(call_graph.get(caller, set())):
            if callee in included_funcs:
                edges.append((caller, callee))

    lines: List[str] = []
    lines.append("digraph KeyGenCallGraph {")
    lines.append("  rankdir=LR;")
    lines.append('  graph [fontname="Helvetica", labelloc="t", labeljust="l"];')
    lines.append('  node [fontname="Helvetica", shape=box, style="rounded,filled", fillcolor="#f5f7fb"];')
    lines.append('  edge [fontname="Helvetica", color="#5a6b85"];')
    lines.append(
        f'  label="{escape_dot_label("KeyGen Call Graph (step-aligned) :: " + elf.name)}";'
    )

    # Step clusters in markdown/summary order.
    ordered_step_ids = [t["id"] for t in step_templates]
    reps: List[Tuple[str, str]] = []
    for t in step_templates:
        sid = t["id"]
        funcs = [fn for fn in step_to_funcs[sid] if func_to_primary_step.get(fn) == sid]
        cluster_name = f"cluster_{sid}"
        cluster_label = step_title_to_cluster_label(step_title_by_id[sid])
        lines.append(f"  subgraph {cluster_name} {{")
        lines.append(f'    label="{escape_dot_label(cluster_label)}";')
        lines.append('    style="rounded";')
        lines.append('    color="#9db0d0";')

        if not funcs:
            # Keep empty steps visible so the diagram still mirrors the markdown flow.
            placeholder = f"__empty_{sid}"
            lines.append(
                f'    "{placeholder}" [label="{escape_dot_label("[no matching function found in this ELF]")}", '
                'shape=note, style="dashed,rounded", fillcolor="#fffdf3", color="#d1b45c"];'
            )
            reps.append((sid, placeholder))
            lines.append("  }")
            continue

        rep = pick_step_representative(funcs)
        if rep:
            reps.append((sid, rep))

        for fn in funcs:
            meta = func_meta.get(fn, {})
            path = meta.get("path", "??")
            ls = meta.get("line_start", 0) or 0
            le = meta.get("line_end", 0) or 0
            if ls and le and le >= ls:
                loc = f"{path}:{ls}-{le}"
            elif ls:
                loc = f"{path}:{ls}"
            else:
                loc = path
            tags = [f"step {step_num_by_id[sid]:02d}", step_role_by_id[sid]]
            # Mention cross-step reuse if this node is referenced by multiple steps.
            all_steps = func_to_all_steps.get(fn, [])
            if len(all_steps) > 1:
                nums = ",".join(f"{step_num_by_id[x]:02d}" for x in all_steps)
                tags.append(f"used in {nums}")
            label = f"{fn}\\n{loc}\\n[{ ' | '.join(tags) }]"
            fill = "#eaf1ff" if fn in {"crypto_kem_keypair", "indcpa_keypair"} else "#f5f7fb"
            lines.append(
                f'    "{fn}" [label="{escape_dot_label(label)}", fillcolor="{fill}"];'
            )
        lines.append("  }")

    # Invisible edges enforce left-to-right step ordering.
    for idx in range(len(reps) - 1):
        _, a = reps[idx]
        _, b = reps[idx + 1]
        lines.append(f'  "{a}" -> "{b}" [style=invis, weight=100, minlen=1];')

    # Real call edges (only for real function nodes).
    for caller, callee in edges:
        lines.append(f'  "{caller}" -> "{callee}";')

    # Optional edge from ELF root to root function (visual entrypoint).
    if root_func in included_funcs:
        elf_node = f"ELF::{elf.name}"
        elf_label = escape_dot_label(elf.name + "\n(ELF root)")
        lines.append(
            f'  "{elf_node}" [shape=doublecircle, style="bold", fillcolor="#ffffff", label="{elf_label}"];'
        )
        lines.append(f'  "{elf_node}" -> "{root_func}" [color="#888", penwidth=1.2];')

    lines.append("}")
    return "\n".join(lines)


def build_sidecar_json(
    elf: Path,
    project_root: Path,
    step_templates: List[dict],
    steps_json_payload: dict,
    func_meta: Dict[str, dict],
    call_graph: Dict[str, set],
    variables_meta: List[dict],
    root_func: str,
    nm_tool: str,
    objdump_tool: str,
    addr2line_tool: str,
) -> dict:
    steps_out = []
    ui_steps = {
        s["id"]: s for s in steps_json_payload.get("keygen", {}).get("steps", [])
    }

    for t in step_templates:
        sid = t["id"]
        ui = ui_steps.get(sid, {})
        funcs = []
        for fn in ui.get("funcs", []):
            m = func_meta.get(fn)
            funcs.append(
                {
                    "name": fn,
                    "file": (m or {}).get("file", "??"),
                    "path": (m or {}).get("path", "??"),
                    "line_start": (m or {}).get("line_start", 0),
                    "line_end": (m or {}).get("line_end", 0),
                    "calls": sorted([c for c in call_graph.get(fn, set()) if c in func_meta]),
                }
            )
        steps_out.append(
            {
                "id": sid,
                "num": t["num"],
                "title": t["title"],
                "role": t["role"],
                "doc_refs": t["doc_refs"],
                "functions": funcs,
                "variables_from_docs": ui.get("vars", []),
            }
        )

    return {
        "elf": str(elf),
        "root_func": root_func,
        "project_root": str(project_root.resolve()),
        "tooling": {
            "nm_tool": nm_tool,
            "objdump_tool": objdump_tool,
            "addr2line_tool": addr2line_tool,
            "commands_used": [
                f"{nm_tool} -C --defined-only -n -S <elf>",
                f"{objdump_tool} -d -C <elf>",
                f"{addr2line_tool} -C -e <elf> <addr>",
            ],
        },
        "docs_source_of_truth": {
            "dir": str((project_root / "Kyber" / "docs" / "keygen").resolve())
            if (project_root / "Kyber" / "docs" / "keygen").exists()
            else None,
            "summary": "10_keygen_flow_summary.md",
        },
        "steps": steps_out,
        "functions": func_meta,
        "call_edges": [
            {"caller": caller, "callee": callee}
            for caller, callees in sorted(call_graph.items())
            for callee in sorted(callees)
        ],
        "variables": {
            "note": (
                "Best-effort variable metadata from ELF object symbols (global/static). "
                "Local stack variables may be absent or optimized out."
            ),
            "items": variables_meta,
        },
    }


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote JSON: {path}")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"Wrote file: {path}")


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    default_docs_dir = script_dir / "docs" / "keygen"
    default_project_root = script_dir.parent

    ap = argparse.ArgumentParser(
        description="Generate KeyGen steps JSON and step-aligned call graph DOT from KeyGen docs + ELF metadata."
    )
    ap.add_argument(
        "elf",
        nargs="?",
        help="Path to ELF with symbols/debug info (optional for steps-only generation)",
    )
    ap.add_argument(
        "--docs-dir",
        default=str(default_docs_dir),
        help=f"KeyGen docs directory (default: {default_docs_dir})",
    )
    ap.add_argument(
        "--project-root",
        default=str(default_project_root),
        help="Project root used for relative source paths in labels",
    )
    ap.add_argument(
        "--root-func",
        default="crypto_kem_keypair",
        help="Entry/root function for KeyGen-focused graph (default: crypto_kem_keypair)",
    )
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
    ap.add_argument("--steps-json", help="Output JSON for KeyGen steps (UI input)")
    ap.add_argument("--dot", help="Output DOT for KeyGen step-aligned call graph")
    ap.add_argument("--sidecar-json", help="Optional output JSON metadata sidecar")
    args = ap.parse_args()

    elf: Optional[Path] = None
    if args.elf:
        elf = Path(args.elf).resolve()
        if not elf.exists():
            raise SystemExit(f"[!] ELF not found: {elf}")

    docs_dir = Path(args.docs_dir).resolve()
    project_root = Path(args.project_root).resolve()
    summary_md = docs_dir / "10_keygen_flow_summary.md"
    if not summary_md.exists():
        raise SystemExit(f"[!] Summary markdown not found: {summary_md}")

    # Validate docs presence (source-of-truth set).
    required_docs = [f"{i:02d}_" for i in range(0, 11)]
    existing_docs = [p.name for p in docs_dir.glob("*.md")]
    missing_prefixes = [pref for pref in required_docs if not any(n.startswith(pref) for n in existing_docs)]
    if missing_prefixes:
        print(f"[warn] Missing expected KeyGen docs prefixes in {docs_dir}: {', '.join(missing_prefixes)}")

    print("[info] Parsing KeyGen summary steps from docs:", summary_md)
    summary_steps = parse_summary_steps(summary_md)
    if len(summary_steps) < 10:
        print(f"[warn] Expected ~10 summary steps, found {len(summary_steps)} in {summary_md}")

    step_templates = build_keygen_step_templates(summary_steps)

    func_meta: Dict[str, dict] = {}
    call_graph: Dict[str, set] = defaultdict(set)
    variables_meta: List[dict] = []
    if elf:
        print("[info] Extracting symbols/functions/variables from ELF (automated metadata extraction)")
        func_meta = collect_function_metadata(str(elf), args.nm_tool, args.addr2line_tool, project_root)
        call_graph = build_call_graph(str(elf), args.objdump_tool)
        variables_meta = collect_global_variable_metadata(str(elf), args.nm_tool, args.addr2line_tool, project_root)
    else:
        print("[info] No ELF provided: generating steps from Markdown only (no function/file/line metadata).")

    steps_payload = build_steps_json(step_templates, func_meta)

    if args.steps_json:
        write_json(Path(args.steps_json), steps_payload)

    if args.dot:
        if not elf:
            raise SystemExit("[!] --dot requires an ELF input (metadata/call graph comes from ELF).")
        dot_text = build_keygen_dot(
            elf=elf,
            step_templates=step_templates,
            func_meta=func_meta,
            call_graph=call_graph,
            root_func=args.root_func,
            sidecar_steps=steps_payload["keygen"]["steps"],
        )
        write_text(Path(args.dot), dot_text)

    if args.sidecar_json:
        if not elf:
            raise SystemExit("[!] --sidecar-json requires an ELF input.")
        sidecar = build_sidecar_json(
            elf=elf,
            project_root=project_root,
            step_templates=step_templates,
            steps_json_payload=steps_payload,
            func_meta=func_meta,
            call_graph=call_graph,
            variables_meta=variables_meta,
            root_func=args.root_func,
            nm_tool=args.nm_tool,
            objdump_tool=args.objdump_tool,
            addr2line_tool=args.addr2line_tool,
        )
        write_json(Path(args.sidecar_json), sidecar)

    if not (args.steps_json or args.dot or args.sidecar_json):
        print("[info] No outputs requested. Use --steps-json and/or --dot and/or --sidecar-json.")


if __name__ == "__main__":
    main()
