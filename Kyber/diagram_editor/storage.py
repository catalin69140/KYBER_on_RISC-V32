from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from .codegen import generate_renderer_source
from .model import default_model, normalize_model

KYBER_ROOT = Path(__file__).resolve().parent.parent
GENERATED_DIAGRAMS_ROOT = KYBER_ROOT / "generated_diagrams"

FILENAME_SANITIZE_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def _safe_elf_basename(elf_name: str) -> str:
    raw_name = Path(str(elf_name or "")).name
    stem = Path(raw_name).stem if raw_name else ""
    if not stem:
        stem = "unknown_elf"
    safe = FILENAME_SANITIZE_RE.sub("_", stem).strip("._")
    return safe or "unknown_elf"


def diagram_dir_for_elf(elf_name: str) -> Path:
    return GENERATED_DIAGRAMS_ROOT / _safe_elf_basename(elf_name)


def diagram_store_path_for_elf(elf_name: str) -> Path:
    base = _safe_elf_basename(elf_name)
    return diagram_dir_for_elf(elf_name) / f"{base}.diagram_store.json"


def generated_renderer_path_for_elf(elf_name: str) -> Path:
    return diagram_dir_for_elf(elf_name) / "renderPrimaryReferenceDiagram.js"


def load_diagram_model_for_elf(elf_name: str) -> Dict[str, Any]:
    store_path = diagram_store_path_for_elf(elf_name)
    legacy_store_path = diagram_dir_for_elf(elf_name) / "diagram_store.json"
    if not store_path.exists() and legacy_store_path.exists():
        store_path = legacy_store_path
    if not store_path.exists():
        return default_model(elf_name=_safe_elf_basename(elf_name))
    try:
        raw = json.loads(store_path.read_text())
    except Exception:
        return default_model(elf_name=_safe_elf_basename(elf_name))
    return normalize_model(raw, elf_name=_safe_elf_basename(elf_name))


def save_diagram_model_for_elf(elf_name: str, model: Any) -> Dict[str, Any]:
    normalized = normalize_model(model, elf_name=_safe_elf_basename(elf_name))
    store_path = diagram_store_path_for_elf(elf_name)
    store_path.parent.mkdir(parents=True, exist_ok=True)
    store_path.write_text(json.dumps(normalized, indent=2, sort_keys=False) + "\n")
    return normalized


def ensure_generated_renderer_for_elf(elf_name: str, model: Optional[Any] = None) -> Tuple[Path, Dict[str, Any], str]:
    normalized = normalize_model(model, elf_name=_safe_elf_basename(elf_name)) if model is not None else load_diagram_model_for_elf(elf_name)
    # Keep store and generated renderer in sync.
    save_diagram_model_for_elf(elf_name, normalized)
    source = generate_renderer_source(normalized)
    out_path = generated_renderer_path_for_elf(elf_name)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(source)
    return out_path, normalized, source


def load_generated_renderer_source_for_elf(elf_name: str) -> Optional[str]:
    path = generated_renderer_path_for_elf(elf_name)
    if not path.exists():
        return None
    try:
        text = path.read_text()
    except Exception:
        return None
    stripped = text.strip()
    return stripped if stripped else None
