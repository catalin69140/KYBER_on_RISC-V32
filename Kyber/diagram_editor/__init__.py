"""Kyber primary reference diagram editor utilities."""

from .codegen import generate_renderer_source
from .model import default_model, normalize_model, sanitize_id
from .storage import (
    diagram_store_path_for_elf,
    ensure_generated_renderer_for_elf,
    generated_renderer_path_for_elf,
    load_diagram_model_for_elf,
    load_generated_renderer_source_for_elf,
    save_diagram_model_for_elf,
)

__all__ = [
    "default_model",
    "diagram_store_path_for_elf",
    "ensure_generated_renderer_for_elf",
    "generate_renderer_source",
    "generated_renderer_path_for_elf",
    "load_diagram_model_for_elf",
    "load_generated_renderer_source_for_elf",
    "normalize_model",
    "sanitize_id",
    "save_diagram_model_for_elf",
]
