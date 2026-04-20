from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from .model import normalize_model


def _fmt_num(value: Any) -> float | int:
    n = float(value)
    if abs(n - round(n)) < 1e-9:
        return int(round(n))
    return round(n, 3)


def _endpoint_codegen(endpoint: Dict[str, Any], shape_map: Dict[str, Dict[str, Any]], stops: List[float], anchor_count: int) -> Dict[str, Any]:
    shape_id = endpoint.get("shapeId")
    if shape_id in shape_map:
        side = endpoint.get("side") or "right"
        frac = float(endpoint.get("anchorFraction", 0.5))
        frac = max(0.0, min(1.0, frac))
        return {
            "id": shape_id,
            "side": side,
            "fraction": _fmt_num(frac),
        }
    return {
        "x": _fmt_num(endpoint.get("x", 0)),
        "y": _fmt_num(endpoint.get("y", 0)),
    }


def _sorted_shapes(model: Dict[str, Any]) -> List[Dict[str, Any]]:
    return sorted(
        model.get("shapes", []),
        key=lambda s: (int(s.get("z", 0)), s.get("id", "")),
    )


def _sorted_arrows(model: Dict[str, Any]) -> List[Dict[str, Any]]:
    return sorted(model.get("arrows", []), key=lambda a: (int(a.get("z", 0)), a.get("id", "")))


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
                "z": int(shape.get("z", 0)),
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
                "noBackground": bool(shape.get("noBackground", False)),
                "textAlign": shape.get("textAlign", "center"),
                "textVAlign": shape.get("textVAlign", "center"),
                "fontSize": _fmt_num(shape.get("fontSize", 12)),
                "fontFamily": shape.get("fontFamily"),
                "textOffsetUp": _fmt_num(shape.get("textOffsetUp", 0)),
                "textOffsetDown": _fmt_num(shape.get("textOffsetDown", 0)),
                "textOffsetLeft": _fmt_num(shape.get("textOffsetLeft", 0)),
                "textOffsetRight": _fmt_num(shape.get("textOffsetRight", 0)),
                "textPadding": _fmt_num(shape.get("textPadding", 0)),
                "groupHeaderSide": shape.get("groupHeaderSide", "top"),
                "groupHeaderSize": _fmt_num(shape.get("groupHeaderSize", 0)),
                "componentDirection": shape.get("componentDirection", "horizontal"),
                "componentCount": int(shape.get("componentCount", 1)),
                "componentFractions": [_fmt_num(value) for value in shape.get("componentFractions", [])],
                "tableRows": int(shape.get("tableRows", 2)),
                "tableCols": int(shape.get("tableCols", 2)),
                "rowFractions": [_fmt_num(value) for value in shape.get("rowFractions", [])],
                "colFractions": [_fmt_num(value) for value in shape.get("colFractions", [])],
                "components": [
                    {
                        "text": component.get("text", ""),
                        "richText": component.get("richText", ""),
                        "fill": component.get("fill"),
                        "fillOverride": bool(component.get("fillOverride", False)),
                        "textColor": component.get("textColor"),
                        "textAlign": component.get("textAlign", "center"),
                        "textVAlign": component.get("textVAlign", "center"),
                        "fontSize": _fmt_num(component.get("fontSize", 12)),
                        "fontFamily": component.get("fontFamily"),
                        "textOffsetUp": _fmt_num(component.get("textOffsetUp", 0)),
                        "textOffsetDown": _fmt_num(component.get("textOffsetDown", 0)),
                        "textOffsetLeft": _fmt_num(component.get("textOffsetLeft", 0)),
                        "textOffsetRight": _fmt_num(component.get("textOffsetRight", 0)),
                        "textPadding": _fmt_num(component.get("textPadding", 0)),
                    }
                    for component in shape.get("components", [])
                    if isinstance(component, dict)
                ],
            }
        )

    connector_specs: List[Dict[str, Any]] = []
    for arrow in _sorted_arrows(model):
        from_ep = arrow.get("from") if isinstance(arrow.get("from"), dict) else {}
        to_ep = arrow.get("to") if isinstance(arrow.get("to"), dict) else {}
        from_connected = from_ep.get("shapeId") in shape_map
        to_connected = to_ep.get("shapeId") in shape_map
        from_free = from_ep.get("shapeId") in (None, "") and "x" in from_ep and "y" in from_ep
        to_free = to_ep.get("shapeId") in (None, "") and "x" in to_ep and "y" in to_ep
        if not (from_connected or from_free) or not (to_connected or to_free):
            continue
        from_spec = _endpoint_codegen(from_ep, shape_map, stops, anchor_count)
        to_spec = _endpoint_codegen(to_ep, shape_map, stops, anchor_count)

        opts: Dict[str, Any] = {
            "routing": arrow.get("routing", "angled"),
            "lineStyle": arrow.get("lineStyle", "solid"),
            "connectionType": arrow.get("connectionType", "directional_connector"),
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
                "z": int(arrow.get("z", 0)),
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
    const generatedShapeEls = Object.create(null);
    generatedShapes.forEach((shapeSpec) => {{
        addGeneratedRefShape(svg, shapeSpec);
        generatedShapeEls[shapeSpec.id] = primaryRefNodeEls[shapeSpec.id] || null;
    }});

    const generatedConnectors = {connector_json};
    const generatedConnectorEls = Object.create(null);
    generatedConnectors.forEach((connSpec) => {{
        generatedConnectorEls[connSpec.id] = drawRefConnectorInternal(svg, connSpec.from, connSpec.to, connSpec.opts || {{}});
    }});

    generatedShapes
        .map((shapeSpec) => ({{ type: "shape", id: shapeSpec.id, z: Number(shapeSpec.z) || 0 }}))
        .concat(generatedConnectors.map((connSpec) => ({{ type: "connector", id: connSpec.id, z: Number(connSpec.z) || 0 }})))
        .sort((a, b) => {{
            if (a.z !== b.z) return a.z - b.z;
            if (a.type !== b.type) return a.type === "connector" ? -1 : 1;
            return String(a.id || "").localeCompare(String(b.id || ""));
        }})
        .forEach((entry) => {{
            const el = entry.type === "shape"
                ? generatedShapeEls[entry.id]
                : generatedConnectorEls[entry.id];
            if (el && el.parentNode === svg) {{
                svg.appendChild(el);
            }}
        }});

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
