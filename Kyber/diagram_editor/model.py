from __future__ import annotations

import copy
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

MODEL_VERSION = 4
DEFAULT_VIEWBOX = {"x": 0.0, "y": 0.0, "width": 1000.0, "height": 1000.0}
DEFAULT_BACKGROUND = "#0b1220"
DEFAULT_ANCHOR_STOPS = [i / 10 for i in range(11)]
DEFAULT_FONT_FAMILY = 'Georgia, "Times New Roman", serif'
FONT_FAMILY_OPTIONS = [
    "Arial, Helvetica, sans-serif",
    "Helvetica, Arial, sans-serif",
    "Inter, Arial, sans-serif",
    "Roboto, Arial, sans-serif",
    '"Open Sans", Arial, sans-serif',
    "Lato, Arial, sans-serif",
    "Verdana, Geneva, sans-serif",
    "Tahoma, Geneva, sans-serif",
    '"Trebuchet MS", Helvetica, sans-serif',
    DEFAULT_FONT_FAMILY,
    '"Times New Roman", Times, serif',
]
VALID_FONT_FAMILIES = set(FONT_FAMILY_OPTIONS)

# Existing primary diagram role colors from CryptoTool UI.
DEFAULT_COLOR_PALETTE = [
    "#3a2d55",
    "#1c2f4f",
    "#15362f",
    "#542f2f",
    "#3f5667",
    "#5e3b00",
    "#253f57",
]

DEFAULT_SHAPE_FILL = "#1c2f4f"
DEFAULT_SHAPE_STROKE = "#80b6ff"
DEFAULT_TEXT_COLOR = "#f4f7ff"
DEFAULT_CONTAINER_FILL = "#0d172a"
DEFAULT_CONTAINER_STROKE = "#eef3ff"

DEFAULT_ARROW_STROKE = "#e8efff"
DEFAULT_ARROW_WIDTH = 1.7
MAX_GROUP_CELLS = 576

ID_BAD_CHARS = re.compile(r"[^a-zA-Z0-9_]+")
ID_MULTI_UNDERSCORE = re.compile(r"_+")

VALID_SHAPE_KINDS = {
    "square",
    "cube",
    "rectangle",
    "cuboid",
    "triangle",
    "cone",
    "diamond",
    "parallelogram",
    "trapezoid",
    "pentagon",
    "hexagon",
    "octagon",
    "circle",
    "oval",
    "cylinder",
    "hexagonal_prism",
    "and",
    "or",
    "message",
    "mail",
    "actor",
    "cloud",
    "cloud_callout",
    "card",
    "note",
    "text_box",
    "container",
    "header_container",
    "table_group",
    "component_group",
}
VALID_CONTAINER_KINDS = {"container", "header_container"}
VALID_SIDES = {"left", "right", "top", "bottom"}
VALID_ROUTINGS = {"straight", "curved", "angled"}
VALID_LINE_STYLES = {"solid", "dashed", "dotted"}
VALID_BORDER_STYLES = {"none", "solid", "dashed", "dotted"}
VALID_TEXT_ALIGN = {"left", "center", "right"}
VALID_TEXT_V_ALIGN = {"top", "center", "bottom"}
VALID_CONNECTION_TYPES = {"directional_connector", "bidirectional_connector", "line"}
VALID_GROUP_HEADER_SIDES = {"top", "right", "bottom", "left", "none"}


def sanitize_id(value: Any) -> str:
    txt = str(value or "").strip().lower()
    txt = txt.replace("-", "_")
    txt = ID_BAD_CHARS.sub("_", txt)
    txt = ID_MULTI_UNDERSCORE.sub("_", txt)
    txt = txt.strip("_")
    return txt or "node"


def derive_default_shape_id(text: str, container_text: Optional[str] = None) -> str:
    base = sanitize_id(text or "node")
    if container_text:
        container = sanitize_id(container_text)
        if container:
            return f"{container}_{base}"
    return base


def _default_shape_text(kind: str) -> str:
    if kind == "square":
        return "Square"
    if kind == "cube":
        return "Cube"
    if kind == "rectangle":
        return "Rectangle"
    if kind == "cuboid":
        return "Cuboid"
    if kind == "triangle":
        return "Triangle"
    if kind == "cone":
        return "Cone"
    if kind == "diamond":
        return "Diamond"
    if kind == "parallelogram":
        return "Parallelogram"
    if kind == "trapezoid":
        return "Trapezoid"
    if kind == "pentagon":
        return "Pentagon"
    if kind == "hexagon":
        return "Hexagon"
    if kind == "octagon":
        return "Octagon"
    if kind == "circle":
        return "Circle"
    if kind == "oval":
        return "Oval"
    if kind == "cylinder":
        return "Cylinder"
    if kind == "hexagonal_prism":
        return "Hexagonal Prism"
    if kind == "and":
        return "And"
    if kind == "or":
        return "Or"
    if kind == "message":
        return "Message"
    if kind == "mail":
        return "Mail"
    if kind == "actor":
        return "Actor"
    if kind == "cloud":
        return "Cloud"
    if kind == "cloud_callout":
        return "Cloud Callout"
    if kind == "card":
        return "Card"
    if kind == "note":
        return "Note"
    if kind == "text_box":
        return "Text"
    if kind == "table_group":
        return "Table"
    if kind == "container":
        return "Container"
    if kind == "header_container":
        return "Header"
    if kind == "component_group":
        return "Group"
    return "Node"


def _default_shape_size(kind: str) -> Tuple[float, float]:
    if kind == "square":
        return 50.0, 50.0
    if kind == "cube":
        return 80.0, 70.0
    if kind == "rectangle":
        return 100.0, 50.0
    if kind == "cuboid":
        return 110.0, 70.0
    if kind == "triangle":
        return 90.0, 60.0
    if kind == "cone":
        return 90.0, 90.0
    if kind == "diamond":
        return 100.0, 60.0
    if kind == "parallelogram":
        return 100.0, 60.0
    if kind == "trapezoid":
        return 100.0, 60.0
    if kind == "pentagon":
        return 90.0, 80.0
    if kind == "hexagon":
        return 110.0, 70.0
    if kind == "octagon":
        return 110.0, 70.0
    if kind == "circle":
        return 60.0, 60.0
    if kind == "oval":
        return 100.0, 90.0
    if kind == "cylinder":
        return 110.0, 80.0
    if kind == "hexagonal_prism":
        return 120.0, 80.0
    if kind == "and":
        return 100.0, 60.0
    if kind == "or":
        return 100.0, 60.0
    if kind == "message":
        return 110.0, 70.0
    if kind == "mail":
        return 110.0, 70.0
    if kind == "actor":
        return 90.0, 120.0
    if kind == "cloud":
        return 120.0, 80.0
    if kind == "cloud_callout":
        return 130.0, 90.0
    if kind == "card":
        return 80.0, 100.0
    if kind == "note":
        return 90.0, 110.0
    if kind == "text_box":
        return 120.0, 60.0
    if kind in VALID_CONTAINER_KINDS:
        return 240.0, 200.0
    if kind == "table_group":
        return 240.0, 180.0
    if kind == "component_group":
        return 200.0, 70.0
    return 100.0, 48.0


def _default_border_width(kind: str) -> float:
    if kind in VALID_CONTAINER_KINDS or kind in {"table_group", "component_group"}:
        return 1.8
    return 1.5


def default_model(elf_name: str = "") -> Dict[str, Any]:
    return {
        "version": MODEL_VERSION,
        "metadata": {
            "elf": str(elf_name or ""),
            "viewBox": dict(DEFAULT_VIEWBOX),
            "background": DEFAULT_BACKGROUND,
            "colorPalette": list(DEFAULT_COLOR_PALETTE),
        },
        "anchors": {
            "countPerEdge": len(DEFAULT_ANCHOR_STOPS),
            "stops": list(DEFAULT_ANCHOR_STOPS),
        },
        "shapes": [],
        "arrows": [],
    }


def _to_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(fallback)


def _to_int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(fallback)


def _as_side(value: Any, fallback: str) -> str:
    side = str(value or "").strip().lower()
    if side in VALID_SIDES:
        return side
    return fallback


def _as_shape_kind(value: Any) -> str:
    kind = str(value or "").strip().lower()
    if kind in VALID_SHAPE_KINDS:
        return kind
    return "square"


def _as_routing(value: Any) -> str:
    routing = str(value or "").strip().lower()
    if routing in VALID_ROUTINGS:
        return routing
    return "angled"


def _as_line_style(value: Any) -> str:
    style = str(value or "").strip().lower()
    if style in VALID_LINE_STYLES:
        return style
    return "solid"


def _as_border_style(value: Any) -> str:
    style = str(value or "").strip().lower()
    if style in VALID_BORDER_STYLES:
        return style
    return "solid"


def _as_text_align(value: Any) -> str:
    align = str(value or "").strip().lower()
    if align in VALID_TEXT_ALIGN:
        return align
    return "center"


def _as_text_v_align(value: Any) -> str:
    align = str(value or "").strip().lower()
    if align in VALID_TEXT_V_ALIGN:
        return align
    return "center"


def _as_connection_type(value: Any, fallback_arrow_head: Any = None) -> str:
    conn = str(value or "").strip().lower()
    if conn == "arrow":
        return "directional_connector"
    if conn == "bi":
        return "bidirectional_connector"
    if conn in VALID_CONNECTION_TYPES:
        return conn
    # Legacy compatibility:
    # - arrowHead=false implies line
    # - otherwise default to single arrow.
    if fallback_arrow_head is False:
        return "line"
    return "directional_connector"


def _as_component_direction(value: Any) -> str:
    return "vertical" if str(value or "").strip().lower() == "vertical" else "horizontal"


def _as_group_header_side(value: Any) -> str:
    side = str(value or "").strip().lower()
    if side in VALID_GROUP_HEADER_SIDES:
        return side
    return "top"


def _as_group_header_size(value: Any) -> float:
    raw = _to_float(value, 0.0)
    if raw <= 0.0:
        return 0.0
    return max(0.0, min(2000.0, raw))


def _as_font_family(value: Any) -> str:
    family = str(value or "").strip()
    if family in VALID_FONT_FAMILIES:
        return family
    return DEFAULT_FONT_FAMILY


def _as_text_inset(value: Any, fallback: float = 0.0) -> float:
    return max(0.0, min(200.0, _to_float(value, fallback)))


def _normalize_component_labels(value: Any, count: int) -> List[str]:
    out: List[str] = []
    if isinstance(value, list):
        out = [str(v or "").strip() for v in value]
    safe_count = max(1, min(MAX_GROUP_CELLS, int(count)))
    while len(out) < safe_count:
        out.append(f"Item {len(out) + 1}")
    return out[:safe_count]


def _normalize_fraction_list(value: Any, count: int) -> List[float]:
    safe_count = max(1, min(MAX_GROUP_CELLS, int(count)))
    if safe_count == 1:
        return [1.0]
    source = value if isinstance(value, list) else []
    out: List[float] = []
    for idx in range(safe_count):
        raw = source[idx] if idx < len(source) else None
        num = _to_float(raw, 1.0)
        out.append(num if num > 0 else 1.0)
    total = sum(out)
    if not total > 0:
        return [1.0 / safe_count for _ in range(safe_count)]
    return [num / total for num in out]


def _default_group_component(
    index: int,
    fill: str,
    text_color: str,
    font_size: float,
    font_family: str,
) -> Dict[str, Any]:
    text = f"Item {index + 1}"
    return {
        "text": text,
        "richText": "",
        "fill": str(fill or DEFAULT_CONTAINER_FILL),
        "fillOverride": False,
        "textColor": str(text_color or DEFAULT_TEXT_COLOR),
        "textAlign": "center",
        "textVAlign": "center",
        "fontSize": max(8.0, min(40.0, float(font_size or 12.0))),
        "fontFamily": _as_font_family(font_family),
        "textOffsetUp": 0.0,
        "textOffsetDown": 0.0,
        "textOffsetLeft": 0.0,
        "textOffsetRight": 0.0,
        "textPadding": 0.0,
    }


def _normalize_group_components(
    value: Any,
    count: int,
    fill: str,
    text_color: str,
    font_size: float,
    font_family: str,
    fallback_labels: Any = None,
) -> List[Dict[str, Any]]:
    safe_count = max(1, min(MAX_GROUP_CELLS, int(count)))
    defaults = [
        _default_group_component(idx, fill, text_color, font_size, font_family)
        for idx in range(safe_count)
    ]
    labels = _normalize_component_labels(fallback_labels, safe_count) if fallback_labels is not None else []
    out: List[Dict[str, Any]] = []
    raw_items = value if isinstance(value, list) else []

    for idx in range(safe_count):
        default = defaults[idx]
        raw_item = raw_items[idx] if idx < len(raw_items) else None
        if isinstance(raw_item, dict):
            has_text = "text" in raw_item
            has_label = "label" in raw_item
            if has_text:
                text_source = raw_item.get("text")
            elif has_label:
                text_source = raw_item.get("label")
            elif idx < len(labels):
                text_source = labels[idx]
            else:
                text_source = default["text"]
            text = str("" if text_source is None else text_source)
            out.append(
                {
                    "text": text,
                    "richText": str(raw_item.get("richText") if "richText" in raw_item else ""),
                    "fill": str(raw_item.get("fill") or default["fill"]),
                    "fillOverride": bool(raw_item.get("fillOverride", raw_item.get("override", False))),
                    "textColor": str(raw_item.get("textColor") or default["textColor"]),
                    "textAlign": _as_text_align(raw_item.get("textAlign")),
                    "textVAlign": _as_text_v_align(raw_item.get("textVAlign")),
                    "fontSize": max(8.0, min(40.0, _to_float(raw_item.get("fontSize"), default["fontSize"]))),
                    "fontFamily": _as_font_family(raw_item.get("fontFamily")),
                    "textOffsetUp": _as_text_inset(raw_item.get("textOffsetUp"), default["textOffsetUp"]),
                    "textOffsetDown": _as_text_inset(raw_item.get("textOffsetDown"), default["textOffsetDown"]),
                    "textOffsetLeft": _as_text_inset(raw_item.get("textOffsetLeft"), default["textOffsetLeft"]),
                    "textOffsetRight": _as_text_inset(raw_item.get("textOffsetRight"), default["textOffsetRight"]),
                    "textPadding": _as_text_inset(raw_item.get("textPadding"), default["textPadding"]),
                }
            )
            continue
        if isinstance(raw_item, str) and raw_item.strip():
            text = raw_item.strip()
            default["text"] = text
            default["richText"] = ""
            out.append(default)
            continue
        if idx < len(labels):
            default["text"] = labels[idx] or default["text"]
        out.append(default)
    return out


def _shape_defaults(kind: str) -> Tuple[str, str]:
    if kind in VALID_CONTAINER_KINDS or kind in {"table_group", "component_group"}:
        return DEFAULT_CONTAINER_FILL, DEFAULT_CONTAINER_STROKE
    return DEFAULT_SHAPE_FILL, DEFAULT_SHAPE_STROKE


def _dedupe_id(desired: str, used: Iterable[str]) -> str:
    existing = set(used)
    if desired not in existing:
        return desired
    idx = 2
    while True:
        candidate = f"{desired}_{idx}"
        if candidate not in existing:
            return candidate
        idx += 1


def _normalize_anchor_stops(raw_stops: Any) -> List[float]:
    if not isinstance(raw_stops, list):
        return list(DEFAULT_ANCHOR_STOPS)
    out: List[float] = []
    for v in raw_stops:
        f = _to_float(v, 0.5)
        f = max(0.0, min(1.0, f))
        out.append(f)
    if not out:
        return list(DEFAULT_ANCHOR_STOPS)
    unique = sorted(set(out))
    if len(unique) < len(DEFAULT_ANCHOR_STOPS):
        return list(DEFAULT_ANCHOR_STOPS)
    return unique


def _anchor_fraction_for_index(stops: List[float], anchor_count: int, anchor_index: int) -> float:
    if stops and 0 <= anchor_index < len(stops):
        return float(stops[anchor_index])
    if anchor_count <= 1:
        return 0.5
    return float(anchor_index) / float(anchor_count - 1)


def _as_anchor_fraction(value: Any, fallback: float = 0.5) -> float:
    return max(0.0, min(1.0, _to_float(value, fallback)))


def normalize_model(raw_model: Any, elf_name: str = "") -> Dict[str, Any]:
    model = default_model(elf_name=elf_name)
    if not isinstance(raw_model, dict):
        return model

    src = copy.deepcopy(raw_model)
    src_meta = src.get("metadata") if isinstance(src.get("metadata"), dict) else {}
    if src_meta.get("elf"):
        model["metadata"]["elf"] = str(src_meta.get("elf"))
    if elf_name:
        model["metadata"]["elf"] = str(elf_name)

    src_viewbox = src_meta.get("viewBox") if isinstance(src_meta.get("viewBox"), dict) else {}
    vb_x = _to_float(src_viewbox.get("x"), DEFAULT_VIEWBOX["x"])
    vb_y = _to_float(src_viewbox.get("y"), DEFAULT_VIEWBOX["y"])
    vb_w = _to_float(src_viewbox.get("width"), DEFAULT_VIEWBOX["width"])
    vb_h = _to_float(src_viewbox.get("height"), DEFAULT_VIEWBOX["height"])
    model["metadata"]["viewBox"] = {
        "x": vb_x,
        "y": vb_y,
        "width": max(DEFAULT_VIEWBOX["width"], vb_w),
        "height": max(DEFAULT_VIEWBOX["height"], vb_h),
    }

    bg = str(src_meta.get("background") or DEFAULT_BACKGROUND)
    model["metadata"]["background"] = bg

    raw_palette = src_meta.get("colorPalette")
    if isinstance(raw_palette, list):
        model["metadata"]["colorPalette"] = [str(c) for c in raw_palette if str(c).strip()]

    src_anchors = src.get("anchors") if isinstance(src.get("anchors"), dict) else {}
    stops = _normalize_anchor_stops(src_anchors.get("stops"))
    model["anchors"]["stops"] = stops
    model["anchors"]["countPerEdge"] = max(len(DEFAULT_ANCHOR_STOPS), _to_int(src_anchors.get("countPerEdge"), len(stops)))

    raw_shapes = src.get("shapes")
    if not isinstance(raw_shapes, list):
        raw_shapes = []

    raw_names: Dict[str, str] = {}
    for idx, shape in enumerate(raw_shapes):
        if not isinstance(shape, dict):
            continue
        sid = shape.get("id")
        key = str(sid) if sid else f"idx:{idx}"
        kind = _as_shape_kind(shape.get("kind"))
        text = str(shape.get("text") or shape.get("label") or _default_shape_text(kind)).strip()
        raw_names[key] = text

    normalized_shapes: List[Dict[str, Any]] = []
    used_ids: List[str] = []

    for idx, raw_shape in enumerate(raw_shapes):
        if not isinstance(raw_shape, dict):
            continue

        kind = _as_shape_kind(raw_shape.get("kind"))
        text = str(raw_shape.get("text") or raw_shape.get("label") or _default_shape_text(kind)).strip()
        parent_raw = raw_shape.get("parentId")
        parent_id = str(parent_raw).strip() if parent_raw else None
        id_manual = bool(raw_shape.get("idManual", False))

        raw_shape_id = raw_shape.get("id")
        desired_id = sanitize_id(raw_shape_id) if str(raw_shape_id or "").strip() else ""
        if not desired_id:
            container_text = None
            if parent_id and kind not in VALID_CONTAINER_KINDS:
                container_text = raw_names.get(parent_id)
            desired_id = derive_default_shape_id(text, container_text)
        elif not id_manual and kind not in VALID_CONTAINER_KINDS and parent_id:
            # Keep IDs deterministic when auto-managed by text + container.
            container_text = raw_names.get(parent_id)
            desired_id = derive_default_shape_id(text, container_text)

        sid = _dedupe_id(desired_id, used_ids)
        used_ids.append(sid)

        fill_default, stroke_default = _shape_defaults(kind)
        default_width, default_height = _default_shape_size(kind)
        width = max(18.0, _to_float(raw_shape.get("width"), raw_shape.get("w", default_width)))
        height = max(18.0, _to_float(raw_shape.get("height"), raw_shape.get("h", default_height)))
        if kind in {"square", "circle"}:
            side = max(width, height)
            width = side
            height = side
        component_count_fallback = 4 if kind == "component_group" else 1
        component_count = max(1, min(24, _to_int(raw_shape.get("componentCount"), component_count_fallback)))
        table_rows = max(1, min(24, _to_int(raw_shape.get("tableRows"), 2)))
        table_cols = max(1, min(24, _to_int(raw_shape.get("tableCols"), 2)))
        raw_components = raw_shape.get("components")
        component_labels_raw = raw_shape.get("componentLabels")

        shape = {
            "id": sid,
            "idManual": id_manual,
            "kind": kind,
            "text": text,
            "richText": str(raw_shape.get("richText") or ""),
            "x": _to_float(raw_shape.get("x"), 60 + idx * 12),
            "y": _to_float(raw_shape.get("y"), 60 + idx * 10),
            "width": width,
            "height": height,
            "fill": str(raw_shape.get("fill") or fill_default),
            "stroke": str(raw_shape.get("stroke") or stroke_default),
            "borderStyle": _as_border_style(raw_shape.get("borderStyle", "none" if kind == "text_box" else "solid")),
            "borderWidth": max(0.5, min(12.0, _to_float(raw_shape.get("borderWidth"), _default_border_width(kind)))),
            "textColor": str(raw_shape.get("textColor") or DEFAULT_TEXT_COLOR),
            "rounded": bool(raw_shape.get("rounded", True)),
            "textAlign": _as_text_align(raw_shape.get("textAlign")),
            "textVAlign": _as_text_v_align(raw_shape.get("textVAlign")),
            "fontSize": max(8.0, min(40.0, _to_float(raw_shape.get("fontSize"), 12.0))),
            "fontFamily": _as_font_family(raw_shape.get("fontFamily")),
            "noBackground": bool(raw_shape.get("noBackground", kind == "text_box")),
            "textOffsetUp": _as_text_inset(raw_shape.get("textOffsetUp"), 0.0),
            "textOffsetDown": _as_text_inset(raw_shape.get("textOffsetDown"), 0.0),
            "textOffsetLeft": _as_text_inset(raw_shape.get("textOffsetLeft"), 0.0),
            "textOffsetRight": _as_text_inset(raw_shape.get("textOffsetRight"), 0.0),
            "textPadding": _as_text_inset(raw_shape.get("textPadding"), 0.0),
            "groupHeaderSide": _as_group_header_side(raw_shape.get("groupHeaderSide", "top")),
            "groupHeaderSize": _as_group_header_size(raw_shape.get("groupHeaderSize", 0.0)),
            "componentDirection": _as_component_direction(raw_shape.get("componentDirection")),
            "componentCount": component_count,
            "componentFractions": _normalize_fraction_list(raw_shape.get("componentFractions"), component_count),
            "tableRows": table_rows,
            "tableCols": table_cols,
            "rowFractions": _normalize_fraction_list(raw_shape.get("rowFractions"), table_rows),
            "colFractions": _normalize_fraction_list(raw_shape.get("colFractions"), table_cols),
            "z": _to_int(raw_shape.get("z"), idx),
            "parentId": parent_id,
        }
        if kind in {"component_group", "table_group"}:
            component_total = component_count if kind == "component_group" else table_rows * table_cols
            shape["components"] = _normalize_group_components(
                raw_components,
                component_total,
                shape["fill"],
                shape["textColor"],
                shape["fontSize"],
                shape["fontFamily"],
                component_labels_raw,
            )
        normalized_shapes.append(shape)

    all_shape_ids = {s["id"] for s in normalized_shapes}
    container_ids = {s["id"] for s in normalized_shapes if s["kind"] in VALID_CONTAINER_KINDS}
    for shape in normalized_shapes:
        parent_id = shape.get("parentId")
        if not parent_id:
            shape["parentId"] = None
            continue
        if parent_id not in all_shape_ids or parent_id not in container_ids or parent_id == shape["id"]:
            shape["parentId"] = None

    raw_arrows = src.get("arrows")
    if not isinstance(raw_arrows, list):
        raw_arrows = []

    normalized_arrows: List[Dict[str, Any]] = []
    used_arrow_ids: List[str] = []
    max_shape_z = max((int(shape.get("z", 0)) for shape in normalized_shapes), default=0)
    for idx, raw_arrow in enumerate(raw_arrows):
        if not isinstance(raw_arrow, dict):
            continue
        from_spec = raw_arrow.get("from") if isinstance(raw_arrow.get("from"), dict) else {}
        to_spec = raw_arrow.get("to") if isinstance(raw_arrow.get("to"), dict) else {}
        from_shape = str(from_spec.get("shapeId") or "")
        to_shape = str(to_spec.get("shapeId") or "")
        from_connected = from_shape in all_shape_ids
        to_connected = to_shape in all_shape_ids
        parent_raw = raw_arrow.get("parentId")
        parent_id = str(parent_raw).strip() if parent_raw else None

        raw_arrow_id = raw_arrow.get("id")
        desired_id = sanitize_id(raw_arrow_id) if str(raw_arrow_id or "").strip() else sanitize_id(f"arrow_{idx + 1}")
        aid = _dedupe_id(desired_id, used_arrow_ids)
        used_arrow_ids.append(aid)

        anchor_count = max(2, model["anchors"]["countPerEdge"])
        raw_from_anchor = _to_int(from_spec.get("anchorIndex"), anchor_count // 2)
        raw_to_anchor = _to_int(to_spec.get("anchorIndex"), anchor_count // 2)
        from_anchor_index = max(0, min(anchor_count - 1, raw_from_anchor))
        to_anchor_index = max(0, min(anchor_count - 1, raw_to_anchor))
        from_fraction = _as_anchor_fraction(
            from_spec.get("anchorFraction"),
            _anchor_fraction_for_index(stops, anchor_count, from_anchor_index),
        )
        to_fraction = _as_anchor_fraction(
            to_spec.get("anchorFraction"),
            _anchor_fraction_for_index(stops, anchor_count, to_anchor_index),
        )
        from_x = _to_float(from_spec.get("x"), 0.0)
        from_y = _to_float(from_spec.get("y"), 0.0)
        to_x = _to_float(to_spec.get("x"), 0.0)
        to_y = _to_float(to_spec.get("y"), 0.0)
        from_valid = from_connected or all(k in from_spec for k in ("x", "y"))
        to_valid = to_connected or all(k in to_spec for k in ("x", "y"))
        if not from_valid or not to_valid:
            continue

        waypoints = []
        for p in raw_arrow.get("waypoints") or []:
            if not isinstance(p, dict):
                continue
            waypoints.append({"x": _to_float(p.get("x"), 0), "y": _to_float(p.get("y"), 0)})

        control_points = []
        for p in raw_arrow.get("controlPoints") or []:
            if not isinstance(p, dict):
                continue
            control_points.append({"x": _to_float(p.get("x"), 0), "y": _to_float(p.get("y"), 0)})
        if len(control_points) > 2:
            control_points = control_points[:2]

        arrow = {
            "id": aid,
            "from": {
                "shapeId": from_shape if from_connected else "",
                "side": _as_side(from_spec.get("side"), "right"),
                "anchorIndex": from_anchor_index,
                "anchorFraction": from_fraction,
                "x": from_x,
                "y": from_y,
            },
            "to": {
                "shapeId": to_shape if to_connected else "",
                "side": _as_side(to_spec.get("side"), "left"),
                "anchorIndex": to_anchor_index,
                "anchorFraction": to_fraction,
                "x": to_x,
                "y": to_y,
            },
            "lineStyle": _as_line_style(raw_arrow.get("lineStyle")),
            "routing": _as_routing(raw_arrow.get("routing")),
            "connectionType": _as_connection_type(raw_arrow.get("connectionType"), raw_arrow.get("arrowHead")),
            "stroke": str(raw_arrow.get("stroke") or DEFAULT_ARROW_STROKE),
            "width": max(0.5, _to_float(raw_arrow.get("width"), DEFAULT_ARROW_WIDTH)),
            "z": _to_int(raw_arrow.get("z"), max_shape_z + idx + 1),
            "parentId": parent_id if parent_id in container_ids and not from_connected and not to_connected else None,
            "waypoints": waypoints,
            "controlPoints": control_points,
        }
        normalized_arrows.append(arrow)

    normalized_shapes.sort(key=lambda s: (s.get("z", 0), s["id"]))
    normalized_arrows.sort(key=lambda a: (a.get("z", 0), a["id"]))

    model["shapes"] = normalized_shapes
    model["arrows"] = normalized_arrows
    return model
