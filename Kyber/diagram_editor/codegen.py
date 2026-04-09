from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from .model import normalize_model


def _fmt_num(value: Any) -> float | int:
    n = float(value)
    if abs(n - round(n)) < 1e-9:
        return int(round(n))
    return round(n, 3)


def _anchor_fraction(stops: List[float], anchor_count: int, anchor_index: int) -> float:
    if stops and 0 <= anchor_index < len(stops):
        return float(stops[anchor_index])
    if anchor_count <= 1:
        return 0.5
    return float(anchor_index) / float(anchor_count - 1)


def _endpoint_codegen(endpoint: Dict[str, Any], shape_map: Dict[str, Dict[str, Any]], stops: List[float], anchor_count: int) -> Dict[str, Any]:
    shape = shape_map[endpoint["shapeId"]]
    side = endpoint.get("side") or "right"
    anchor_index = int(endpoint.get("anchorIndex", anchor_count // 2))
    anchor_index = max(0, min(anchor_count - 1, anchor_index))
    frac = _anchor_fraction(stops, anchor_count, anchor_index)
    dx = 0.0
    dy = 0.0
    if side in ("top", "bottom"):
        dx = (frac - 0.5) * float(shape["width"])
    else:
        dy = (frac - 0.5) * float(shape["height"])
    return {
        "id": endpoint["shapeId"],
        "side": side,
        "dx": _fmt_num(dx),
        "dy": _fmt_num(dy),
    }


def _sorted_shapes(model: Dict[str, Any]) -> List[Dict[str, Any]]:
    container_kinds = {"container", "header_container"}
    return sorted(
        model.get("shapes", []),
        key=lambda s: (int(s.get("z", 0)), s.get("kind") not in container_kinds, s.get("id", "")),
    )


def _sorted_arrows(model: Dict[str, Any]) -> List[Dict[str, Any]]:
    return sorted(model.get("arrows", []), key=lambda a: a.get("id", ""))


def _build_codegen_payload(model: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    shapes = _sorted_shapes(model)
    shape_map = {s["id"]: s for s in shapes}

    anchor_cfg = model.get("anchors", {}) if isinstance(model.get("anchors"), dict) else {}
    stops = anchor_cfg.get("stops") if isinstance(anchor_cfg.get("stops"), list) else []
    stops = [float(v) for v in stops]
    anchor_count = max(2, int(anchor_cfg.get("countPerEdge", len(stops) if stops else 11)))
    if not stops:
        stops = [i / (anchor_count - 1) for i in range(anchor_count)]

    shape_specs: List[Dict[str, Any]] = []
    for shape in shapes:
        shape_specs.append(
            {
                "id": shape["id"],
                "kind": shape.get("kind", "square"),
                "x": _fmt_num(shape.get("x", 0)),
                "y": _fmt_num(shape.get("y", 0)),
                "w": _fmt_num(shape.get("width", 100)),
                "h": _fmt_num(shape.get("height", 50)),
                "label": shape.get("text", ""),
                "richText": shape.get("richText", ""),
                "fill": shape.get("fill"),
                "stroke": shape.get("stroke"),
                "textColor": shape.get("textColor"),
                "rounded": bool(shape.get("rounded", True)),
                "borderStyle": shape.get("borderStyle", "solid"),
                "borderWidth": _fmt_num(shape.get("borderWidth", 1.5)),
                "textAlign": shape.get("textAlign", "center"),
                "textVAlign": shape.get("textVAlign", "center"),
                "fontSize": _fmt_num(shape.get("fontSize", 12)),
                "fontFamily": shape.get("fontFamily"),
                "componentDirection": shape.get("componentDirection", "horizontal"),
                "componentCount": int(shape.get("componentCount", 1)),
                "componentLabels": shape.get("componentLabels", []),
            }
        )

    connector_specs: List[Dict[str, Any]] = []
    for arrow in _sorted_arrows(model):
        from_ep = arrow.get("from") if isinstance(arrow.get("from"), dict) else {}
        to_ep = arrow.get("to") if isinstance(arrow.get("to"), dict) else {}
        if from_ep.get("shapeId") not in shape_map or to_ep.get("shapeId") not in shape_map:
            continue
        from_spec = _endpoint_codegen(from_ep, shape_map, stops, anchor_count)
        to_spec = _endpoint_codegen(to_ep, shape_map, stops, anchor_count)

        opts: Dict[str, Any] = {
            "routing": arrow.get("routing", "angled"),
            "dashed": arrow.get("lineStyle", "solid") == "dashed",
            "connectionType": arrow.get("connectionType", "arrow"),
            "color": arrow.get("stroke", "#e8efff"),
            "width": _fmt_num(arrow.get("width", 1.7)),
        }

        waypoints = arrow.get("waypoints")
        if isinstance(waypoints, list) and waypoints:
            opts["points"] = [{"x": _fmt_num(p.get("x", 0)), "y": _fmt_num(p.get("y", 0))} for p in waypoints if isinstance(p, dict)]

        control_points = arrow.get("controlPoints")
        if isinstance(control_points, list) and len(control_points) >= 2:
            cp1 = control_points[0]
            cp2 = control_points[1]
            if isinstance(cp1, dict) and isinstance(cp2, dict):
                opts["c1"] = {"x": _fmt_num(cp1.get("x", 0)), "y": _fmt_num(cp1.get("y", 0))}
                opts["c2"] = {"x": _fmt_num(cp2.get("x", 0)), "y": _fmt_num(cp2.get("y", 0))}

        connector_specs.append(
            {
                "id": arrow["id"],
                "from": from_spec,
                "to": to_spec,
                "opts": opts,
            }
        )

    return shape_specs, connector_specs


def generate_renderer_source(model: Dict[str, Any]) -> str:
    normalized = normalize_model(model)
    metadata = normalized.get("metadata", {})
    view_box = metadata.get("viewBox", {})
    vb_x = _fmt_num(view_box.get("x", 0))
    vb_y = _fmt_num(view_box.get("y", 0))
    vb_w = _fmt_num(view_box.get("width", 1000))
    vb_h = _fmt_num(view_box.get("height", 1000))
    bg = str(metadata.get("background") or "#0b1220")

    shape_specs, connector_specs = _build_codegen_payload(normalized)

    shape_json = json.dumps(shape_specs, indent=2, sort_keys=False)
    connector_json = json.dumps(connector_specs, indent=2, sort_keys=False)

    return f"""/* Auto-generated by Kyber Diagram Editor. Do not hand-edit. */
function generatedRenderPrimaryReferenceDiagram() {{
    const container = document.getElementById("graph");
    if (!container) return;
    container.innerHTML = "";
    primaryRefNodeEls = {{}};
    primaryRefNodeBoxes = {{}};
    primaryRefDrawnSegments = [];

    const viewBoxX = {vb_x};
    const viewBoxY = {vb_y};
    const viewBoxWidth = {vb_w};
    const viewBoxHeight = {vb_h};
    const svg = createSvgEl("svg", {{
        id: "primary-ref-svg",
        class: "primary-ref-root",
        viewBox: `${{viewBoxX}} ${{viewBoxY}} ${{viewBoxWidth}} ${{viewBoxHeight}}`,
        preserveAspectRatio: "xMidYMid meet"
    }});

    const canvasPad = 28;
    const availW = Math.max(320, (container.clientWidth || 1200) - canvasPad * 2);
    const availH = Math.max(240, (container.clientHeight || 600) - canvasPad * 2);
    const scaleByHeight = (availH * 0.88) / viewBoxHeight;
    const targetW = Math.round(viewBoxWidth * scaleByHeight);
    const targetH = Math.round(viewBoxHeight * scaleByHeight);
    svg.setAttribute("width", String(targetW));
    svg.setAttribute("height", String(targetH));

    const defs = createSvgEl("defs");
    const marker = createSvgEl("marker", {{
        id: "ref-arrow-head",
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 7,
        markerHeight: 7,
        orient: "auto-start-reverse"
    }});
    marker.appendChild(createSvgEl("path", {{
        d: "M 0 0 L 10 5 L 0 10 z",
        fill: "context-stroke",
        stroke: "context-stroke"
    }}));
    defs.appendChild(marker);
    svg.appendChild(defs);

    svg.appendChild(createSvgEl("rect", {{
        x: viewBoxX,
        y: viewBoxY,
        width: viewBoxWidth,
        height: viewBoxHeight,
        fill: "{bg}"
    }}));

    const generatedShapes = {shape_json};
    generatedShapes.forEach((shapeSpec) => {{
        addGeneratedRefShape(svg, shapeSpec);
    }});

    primaryRefConnectorBuffer = [];
    const generatedConnectors = {connector_json};
    generatedConnectors.forEach((connSpec) => {{
        addRefConnector(svg, connSpec.from, connSpec.to, connSpec.opts || {{}});
    }});

    flushRefConnectors(svg);
    container.appendChild(svg);
    setupPrimaryReferenceNodeMap(svg);
}}

function renderPrimaryReferenceDiagram() {{
    return generatedRenderPrimaryReferenceDiagram();
}}

if (typeof module !== "undefined") {{
    module.exports = {{
        generatedRenderPrimaryReferenceDiagram,
        renderPrimaryReferenceDiagram
    }};
}}
"""
