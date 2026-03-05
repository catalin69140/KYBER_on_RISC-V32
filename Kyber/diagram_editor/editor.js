(function () {
  "use strict";

  const DEFAULT_COLOR_PALETTE = [
    "#3a2d55",
    "#1c2f4f",
    "#15362f",
    "#542f2f",
    "#3f5667",
    "#5e3b00",
    "#253f57",
  ];

  const DEFAULT_ANCHOR_STOPS = [0.1, 0.3, 0.5, 0.7, 0.9];
  const HANDLE_SIZE = 8;
  const MIN_SHAPE_SIZE = 24;

  const state = {
    elf: "",
    model: null,
    mode: "select",
    selected: null, // {type: "shape"|"arrow", id: "..."}
    connectFromShapeId: null,
    drag: null,
    arrowRenderCache: {},
  };

  const els = {
    elfInput: document.getElementById("elf-input"),
    loadBtn: document.getElementById("load-btn"),
    saveBtn: document.getElementById("save-btn"),
    generateBtn: document.getElementById("generate-btn"),
    toolSelectBtn: document.getElementById("tool-select"),
    toolConnectBtn: document.getElementById("tool-connect"),
    addShapeBtn: document.getElementById("add-shape-btn"),
    addContainerBtn: document.getElementById("add-container-btn"),
    deleteBtn: document.getElementById("delete-btn"),
    fitBtn: document.getElementById("fit-btn"),
    canvasScroll: document.getElementById("canvas-scroll"),
    svg: document.getElementById("diagram-canvas"),
    inspector: document.getElementById("inspector-content"),
    status: document.getElementById("status"),
    selectionChip: document.getElementById("selection-chip"),
  };

  function setStatus(msg, type) {
    els.status.textContent = msg;
    if (type === "error") {
      els.status.style.color = "#ffb4b4";
    } else if (type === "ok") {
      els.status.style.color = "#c8f3d8";
    } else {
      els.status.style.color = "#9cb3dd";
    }
  }

  function queryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
  }

  function sanitizeId(raw) {
    let out = String(raw || "").trim().toLowerCase();
    out = out.replace(/-/g, "_");
    out = out.replace(/[^a-z0-9_]+/g, "_");
    out = out.replace(/_+/g, "_");
    out = out.replace(/^_+|_+$/g, "");
    return out || "node";
  }

  function deriveShapeId(text, containerText) {
    const base = sanitizeId(text || "node");
    if (containerText) {
      return sanitizeId(containerText) + "_" + base;
    }
    return base;
  }

  function defaultModel(elfName) {
    return {
      version: 1,
      metadata: {
        elf: elfName || "",
        viewBox: { width: 1980, height: 410 },
        background: "#0b1220",
        colorPalette: DEFAULT_COLOR_PALETTE.slice(),
      },
      anchors: {
        countPerEdge: DEFAULT_ANCHOR_STOPS.length,
        stops: DEFAULT_ANCHOR_STOPS.slice(),
      },
      shapes: [],
      arrows: [],
    };
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function shapeById(id) {
    return (state.model && state.model.shapes || []).find((s) => s.id === id) || null;
  }

  function arrowById(id) {
    return (state.model && state.model.arrows || []).find((a) => a.id === id) || null;
  }

  function sortedShapes() {
    return (state.model.shapes || []).slice().sort((a, b) => {
      if ((a.z || 0) !== (b.z || 0)) return (a.z || 0) - (b.z || 0);
      if (a.kind !== b.kind) return a.kind === "container" ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  }

  function sortedArrows() {
    return (state.model.arrows || []).slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  function uniqueShapeId(base, currentId) {
    const used = new Set((state.model.shapes || []).map((s) => s.id).filter((id) => id !== currentId));
    if (!used.has(base)) return base;
    let i = 2;
    while (used.has(base + "_" + i)) i += 1;
    return base + "_" + i;
  }

  function uniqueArrowId(base, currentId) {
    const used = new Set((state.model.arrows || []).map((a) => a.id).filter((id) => id !== currentId));
    if (!used.has(base)) return base;
    let i = 2;
    while (used.has(base + "_" + i)) i += 1;
    return base + "_" + i;
  }

  function shapeCenter(shape) {
    return {
      x: shape.x + shape.width / 2,
      y: shape.y + shape.height / 2,
    };
  }

  function descendantsOf(shapeId) {
    const out = [];
    const queue = [shapeId];
    while (queue.length) {
      const cur = queue.shift();
      state.model.shapes.forEach((shape) => {
        if (shape.parentId === cur) {
          out.push(shape.id);
          queue.push(shape.id);
        }
      });
    }
    return out;
  }

  function isDescendant(shapeId, ancestorId) {
    let cur = shapeById(shapeId);
    while (cur && cur.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = shapeById(cur.parentId);
    }
    return false;
  }

  function renameShapeId(oldId, nextId) {
    if (!oldId || !nextId || oldId === nextId) return;
    const shape = shapeById(oldId);
    if (!shape) return;
    shape.id = nextId;
    state.model.shapes.forEach((s) => {
      if (s.parentId === oldId) s.parentId = nextId;
    });
    state.model.arrows.forEach((arrow) => {
      if (arrow.from.shapeId === oldId) arrow.from.shapeId = nextId;
      if (arrow.to.shapeId === oldId) arrow.to.shapeId = nextId;
    });
    if (state.selected && state.selected.type === "shape" && state.selected.id === oldId) {
      state.selected.id = nextId;
    }
    if (state.connectFromShapeId === oldId) {
      state.connectFromShapeId = nextId;
    }
  }

  function updateAutoId(shape, previousParentId) {
    if (!shape || shape.idManual) return;
    const oldId = shape.id;
    const parent = shape.parentId ? shapeById(shape.parentId) : null;
    const parentText = parent ? parent.text : "";
    const desired = deriveShapeId(shape.text, parentText);
    const unique = uniqueShapeId(desired, oldId);
    renameShapeId(oldId, unique);
    if (previousParentId && previousParentId !== shape.parentId) {
      // Keep children linked when the shape itself is a container and ID changed.
      state.model.shapes.forEach((s) => {
        if (s.parentId === oldId) s.parentId = unique;
      });
    }
  }

  function ensureModelDefaults() {
    if (!state.model) state.model = defaultModel(state.elf);
    if (!state.model.metadata) state.model.metadata = {};
    if (!state.model.metadata.viewBox) state.model.metadata.viewBox = { width: 1980, height: 410 };
    if (!Array.isArray(state.model.metadata.colorPalette) || !state.model.metadata.colorPalette.length) {
      state.model.metadata.colorPalette = DEFAULT_COLOR_PALETTE.slice();
    }
    if (!state.model.anchors) {
      state.model.anchors = { countPerEdge: DEFAULT_ANCHOR_STOPS.length, stops: DEFAULT_ANCHOR_STOPS.slice() };
    }
    if (!Array.isArray(state.model.anchors.stops) || !state.model.anchors.stops.length) {
      state.model.anchors.stops = DEFAULT_ANCHOR_STOPS.slice();
    }
    state.model.anchors.stops = state.model.anchors.stops
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v))
      .map((v) => Math.max(0, Math.min(1, v)))
      .sort((a, b) => a - b);
    state.model.anchors.countPerEdge = Math.max(2, Number(state.model.anchors.countPerEdge) || state.model.anchors.stops.length || 5);
    if (!Array.isArray(state.model.shapes)) state.model.shapes = [];
    if (!Array.isArray(state.model.arrows)) state.model.arrows = [];
    state.model.shapes.forEach((shape, idx) => {
      shape.kind = shape.kind === "container" ? "container" : "shape";
      shape.text = String(shape.text || (shape.kind === "container" ? "Container" : "Node"));
      shape.id = sanitizeId(shape.id || deriveShapeId(shape.text, ""));
      shape.idManual = !!shape.idManual;
      shape.x = Number(shape.x) || 0;
      shape.y = Number(shape.y) || 0;
      shape.width = Math.max(MIN_SHAPE_SIZE, Number(shape.width) || 120);
      shape.height = Math.max(MIN_SHAPE_SIZE, Number(shape.height) || 56);
      shape.fill = String(shape.fill || (shape.kind === "container" ? "#0d172a" : "#1c2f4f"));
      shape.stroke = String(shape.stroke || (shape.kind === "container" ? "#eef3ff" : "#80b6ff"));
      shape.textColor = String(shape.textColor || "#f4f7ff");
      shape.rounded = shape.rounded !== false;
      shape.z = Number(shape.z);
      if (!Number.isFinite(shape.z)) shape.z = idx;
      shape.parentId = shape.parentId ? String(shape.parentId) : null;
    });
    state.model.arrows.forEach((arrow, idx) => {
      arrow.id = sanitizeId(arrow.id || ("arrow_" + (idx + 1)));
      arrow.from = arrow.from && typeof arrow.from === "object" ? arrow.from : {};
      arrow.to = arrow.to && typeof arrow.to === "object" ? arrow.to : {};
      arrow.from.shapeId = String(arrow.from.shapeId || "");
      arrow.to.shapeId = String(arrow.to.shapeId || "");
      arrow.from.side = normalizeSide(arrow.from.side || "right");
      arrow.to.side = normalizeSide(arrow.to.side || "left");
      const maxAnchor = Math.max(1, state.model.anchors.countPerEdge - 1);
      arrow.from.anchorIndex = clamp(Math.round(Number(arrow.from.anchorIndex) || maxAnchor / 2), 0, maxAnchor);
      arrow.to.anchorIndex = clamp(Math.round(Number(arrow.to.anchorIndex) || maxAnchor / 2), 0, maxAnchor);
      arrow.lineStyle = arrow.lineStyle === "dashed" ? "dashed" : "solid";
      arrow.routing = normalizeRouting(arrow.routing);
      arrow.arrowHead = arrow.arrowHead !== false;
      arrow.stroke = String(arrow.stroke || "#e8efff");
      arrow.width = Math.max(0.5, Number(arrow.width) || 1.7);
      arrow.label = String(arrow.label || "");
      if (!Array.isArray(arrow.waypoints)) arrow.waypoints = [];
      arrow.waypoints = arrow.waypoints.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
      if (!Array.isArray(arrow.controlPoints)) arrow.controlPoints = [];
      arrow.controlPoints = arrow.controlPoints.slice(0, 2).map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
    });
    dedupeShapeIds();
    dedupeArrowIds();
    cleanupBrokenReferences();
  }

  function dedupeShapeIds() {
    const seen = new Set();
    state.model.shapes.forEach((shape) => {
      const desired = sanitizeId(shape.id);
      let id = desired;
      let i = 2;
      while (seen.has(id)) {
        id = desired + "_" + i;
        i += 1;
      }
      if (id !== shape.id) renameShapeId(shape.id, id);
      seen.add(id);
    });
  }

  function dedupeArrowIds() {
    const seen = new Set();
    state.model.arrows.forEach((arrow) => {
      const desired = sanitizeId(arrow.id);
      let id = desired;
      let i = 2;
      while (seen.has(id)) {
        id = desired + "_" + i;
        i += 1;
      }
      arrow.id = id;
      seen.add(id);
    });
  }

  function cleanupBrokenReferences() {
    const shapeIds = new Set(state.model.shapes.map((s) => s.id));
    const containerIds = new Set(state.model.shapes.filter((s) => s.kind === "container").map((s) => s.id));
    state.model.shapes.forEach((shape) => {
      if (!shape.parentId) return;
      if (!shapeIds.has(shape.parentId) || !containerIds.has(shape.parentId) || shape.parentId === shape.id || isDescendant(shape.parentId, shape.id)) {
        shape.parentId = null;
      }
    });
    state.model.arrows = state.model.arrows.filter((arrow) => shapeIds.has(arrow.from.shapeId) && shapeIds.has(arrow.to.shapeId));
  }

  function normalizeSide(raw) {
    const side = String(raw || "").toLowerCase().trim();
    if (side === "left" || side === "right" || side === "top" || side === "bottom") return side;
    return "right";
  }

  function normalizeRouting(raw) {
    const routing = String(raw || "").toLowerCase().trim();
    if (routing === "straight" || routing === "curved" || routing === "angled") return routing;
    return "angled";
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function darken(hex, amount) {
    const h = String(hex || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#80b6ff";
    const r = clamp(parseInt(h.slice(0, 2), 16) + amount, 0, 255);
    const g = clamp(parseInt(h.slice(2, 4), 16) + amount, 0, 255);
    const b = clamp(parseInt(h.slice(4, 6), 16) + amount, 0, 255);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function applyViewBox() {
    const vb = state.model.metadata.viewBox || { width: 1980, height: 410 };
    els.svg.setAttribute("viewBox", "0 0 " + vb.width + " " + vb.height);
    els.svg.setAttribute("width", String(vb.width));
    els.svg.setAttribute("height", String(vb.height));
  }

  function createSvg(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] !== undefined && attrs[k] !== null) {
          el.setAttribute(k, String(attrs[k]));
        }
      });
    }
    return el;
  }

  function ensureDefs() {
    const defs = createSvg("defs");
    const marker = createSvg("marker", {
      id: "editor-arrow-head",
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: "auto-start-reverse",
    });
    marker.appendChild(createSvg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#e8efff" }));
    defs.appendChild(marker);
    els.svg.appendChild(defs);
  }

  function getAnchorStops() {
    return state.model.anchors.stops && state.model.anchors.stops.length
      ? state.model.anchors.stops
      : DEFAULT_ANCHOR_STOPS;
  }

  function getAnchorPoint(endpoint) {
    const shape = shapeById(endpoint.shapeId);
    if (!shape) return { x: 0, y: 0 };
    const stops = getAnchorStops();
    const count = Math.max(2, state.model.anchors.countPerEdge || stops.length || 5);
    const index = clamp(Math.round(Number(endpoint.anchorIndex) || 0), 0, count - 1);
    let frac;
    if (index < stops.length) frac = stops[index];
    else frac = index / (count - 1);
    const x0 = shape.x;
    const y0 = shape.y;
    const x1 = shape.x + shape.width;
    const y1 = shape.y + shape.height;
    const side = normalizeSide(endpoint.side);
    if (side === "left") return { x: x0, y: y0 + shape.height * frac };
    if (side === "right") return { x: x1, y: y0 + shape.height * frac };
    if (side === "top") return { x: x0 + shape.width * frac, y: y0 };
    return { x: x0 + shape.width * frac, y: y1 };
  }

  function defaultCurveControl(from, to, side, scaleSign) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const span = Math.max(30, Math.sqrt(dx * dx + dy * dy) * 0.28);
    if (side === "left") return { x: from.x - span * scaleSign, y: from.y };
    if (side === "right") return { x: from.x + span * scaleSign, y: from.y };
    if (side === "top") return { x: from.x, y: from.y - span * scaleSign };
    return { x: from.x, y: from.y + span * scaleSign };
  }

  function orthSegment(a, b, horizontalFirst) {
    if (Math.abs(a.x - b.x) < 0.01 || Math.abs(a.y - b.y) < 0.01) {
      return [a, b];
    }
    if (horizontalFirst) {
      return [a, { x: b.x, y: a.y }, b];
    }
    return [a, { x: a.x, y: b.y }, b];
  }

  function polylinePath(points) {
    if (!points.length) return "";
    const out = ["M " + points[0].x + " " + points[0].y];
    for (let i = 1; i < points.length; i += 1) {
      out.push("L " + points[i].x + " " + points[i].y);
    }
    return out.join(" ");
  }

  function buildArrowGeometry(arrow) {
    const from = getAnchorPoint(arrow.from);
    const to = getAnchorPoint(arrow.to);
    const routing = normalizeRouting(arrow.routing);
    const geom = {
      from,
      to,
      routing,
      path: "",
      controlPoints: [],
      waypoints: [],
    };

    if (routing === "straight") {
      geom.path = "M " + from.x + " " + from.y + " L " + to.x + " " + to.y;
      return geom;
    }

    if (routing === "curved") {
      let cp1 = arrow.controlPoints[0];
      let cp2 = arrow.controlPoints[1];
      if (!cp1 || !cp2) {
        cp1 = defaultCurveControl(from, to, arrow.from.side, 1);
        cp2 = defaultCurveControl(to, from, arrow.to.side, 1);
      }
      geom.controlPoints = [{ x: cp1.x, y: cp1.y }, { x: cp2.x, y: cp2.y }];
      geom.path =
        "M " + from.x + " " + from.y +
        " C " + cp1.x + " " + cp1.y +
        " " + cp2.x + " " + cp2.y +
        " " + to.x + " " + to.y;
      return geom;
    }

    const waypoints = Array.isArray(arrow.waypoints) ? arrow.waypoints.map((p) => ({ x: p.x, y: p.y })) : [];
    geom.waypoints = waypoints.slice();
    let current = from;
    let horizontalFirst = arrow.from.side === "left" || arrow.from.side === "right";
    const points = [from];
    const targets = waypoints.concat([to]);
    targets.forEach((target, idx) => {
      if (idx === targets.length - 1) {
        if (arrow.to.side === "left" || arrow.to.side === "right") horizontalFirst = false;
        else horizontalFirst = true;
      }
      const seg = orthSegment(current, target, horizontalFirst);
      for (let i = 1; i < seg.length; i += 1) {
        points.push(seg[i]);
      }
      current = target;
      horizontalFirst = !horizontalFirst;
    });
    geom.path = polylinePath(compressCollinear(points));
    return geom;
  }

  function compressCollinear(points) {
    if (!points.length) return points;
    const out = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
      const p = points[i];
      const last = out[out.length - 1];
      if (Math.abs(p.x - last.x) < 0.01 && Math.abs(p.y - last.y) < 0.01) continue;
      out.push(p);
      while (out.length >= 3) {
        const a = out[out.length - 3];
        const b = out[out.length - 2];
        const c = out[out.length - 1];
        const sameX = Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - c.x) < 0.01;
        const sameY = Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - c.y) < 0.01;
        if (sameX || sameY) out.splice(out.length - 2, 1);
        else break;
      }
    }
    return out;
  }

  function render() {
    ensureModelDefaults();
    applyViewBox();
    els.svg.innerHTML = "";
    state.arrowRenderCache = {};
    ensureDefs();

    const vb = state.model.metadata.viewBox;
    els.svg.appendChild(createSvg("rect", {
      x: 0,
      y: 0,
      width: vb.width,
      height: vb.height,
      fill: state.model.metadata.background || "#0b1220",
    }));

    const arrowLayer = createSvg("g");
    const shapeLayer = createSvg("g");
    const overlayLayer = createSvg("g");
    els.svg.appendChild(arrowLayer);
    els.svg.appendChild(shapeLayer);
    els.svg.appendChild(overlayLayer);

    sortedArrows().forEach((arrow) => {
      const geom = buildArrowGeometry(arrow);
      state.arrowRenderCache[arrow.id] = geom;

      const path = createSvg("path", {
        d: geom.path,
        fill: "none",
        stroke: arrow.stroke || "#e8efff",
        "stroke-width": arrow.width || 1.7,
        "stroke-dasharray": arrow.lineStyle === "dashed" ? "6 4" : "",
        "marker-end": arrow.arrowHead === false ? "" : "url(#editor-arrow-head)",
        "data-arrow-id": arrow.id,
        style: "cursor:pointer",
      });
      if (state.selected && state.selected.type === "arrow" && state.selected.id === arrow.id) {
        path.setAttribute("stroke-width", String((arrow.width || 1.7) + 1.2));
        path.setAttribute("stroke", "#ffd76b");
      }
      path.addEventListener("pointerdown", (evt) => {
        evt.stopPropagation();
        setSelected({ type: "arrow", id: arrow.id });
      });
      arrowLayer.appendChild(path);

      if (arrow.label) {
        const mid = { x: (geom.from.x + geom.to.x) / 2, y: (geom.from.y + geom.to.y) / 2 };
        const t = createSvg("text", {
          x: mid.x,
          y: mid.y - 8,
          fill: "#f4f7ff",
          "font-size": 11,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "pointer-events": "none",
        });
        t.textContent = arrow.label;
        arrowLayer.appendChild(t);
      }
    });

    sortedShapes().forEach((shape) => {
      const group = createSvg("g", {
        "data-shape-id": shape.id,
        style: "cursor:" + (state.mode === "connect" ? "crosshair" : "move"),
      });
      const isSelected = state.selected && state.selected.type === "shape" && state.selected.id === shape.id;
      const rect = createSvg("rect", {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fill: shape.fill || "#1c2f4f",
        stroke: isSelected ? "#ffd76b" : shape.stroke || "#80b6ff",
        "stroke-width": isSelected ? 2.6 : 1.5,
        rx: shape.rounded === false ? 0 : 7,
        ry: shape.rounded === false ? 0 : 7,
        "stroke-dasharray": shape.kind === "container" ? "8 4" : "",
      });
      group.appendChild(rect);

      const text = createSvg("text", {
        x: shape.kind === "container" ? shape.x + 10 : shape.x + shape.width / 2,
        y: shape.kind === "container" ? shape.y + 14 : shape.y + shape.height / 2,
        fill: shape.textColor || "#f4f7ff",
        "font-size": shape.kind === "container" ? 13 : 12.5,
        "text-anchor": shape.kind === "container" ? "start" : "middle",
        "dominant-baseline": "middle",
        "pointer-events": "none",
      });
      text.textContent = shape.text;
      group.appendChild(text);

      group.addEventListener("pointerdown", (evt) => onShapePointerDown(evt, shape.id));
      shapeLayer.appendChild(group);
    });

    renderSelectionOverlay(overlayLayer);
    updateSelectionChip();
    renderInspector();
  }

  function renderSelectionOverlay(overlayLayer) {
    if (!state.selected) return;
    if (state.selected.type === "shape") {
      const shape = shapeById(state.selected.id);
      if (!shape) return;
      const handles = [
        { key: "nw", x: shape.x, y: shape.y },
        { key: "ne", x: shape.x + shape.width, y: shape.y },
        { key: "sw", x: shape.x, y: shape.y + shape.height },
        { key: "se", x: shape.x + shape.width, y: shape.y + shape.height },
      ];
      handles.forEach((h) => {
        const handle = createSvg("rect", {
          x: h.x - HANDLE_SIZE / 2,
          y: h.y - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          fill: "#ffd76b",
          stroke: "#382a00",
          "stroke-width": 1,
          rx: 2,
          ry: 2,
          style: "cursor:nwse-resize",
        });
        handle.addEventListener("pointerdown", (evt) => {
          evt.stopPropagation();
          startShapeResize(evt, shape.id, h.key);
        });
        overlayLayer.appendChild(handle);
      });
      return;
    }

    if (state.selected.type === "arrow") {
      const arrow = arrowById(state.selected.id);
      const geom = state.arrowRenderCache[state.selected.id];
      if (!arrow || !geom) return;
      const endpoints = [
        { key: "from", p: geom.from, fill: "#8fe6ff" },
        { key: "to", p: geom.to, fill: "#ffcf8f" },
      ];
      endpoints.forEach((ep) => {
        const c = createSvg("circle", {
          cx: ep.p.x,
          cy: ep.p.y,
          r: 5.2,
          fill: ep.fill,
          stroke: "#1a2235",
          "stroke-width": 1.1,
          style: "cursor:crosshair",
        });
        c.addEventListener("pointerdown", (evt) => {
          evt.stopPropagation();
          startArrowEndpointDrag(evt, arrow.id, ep.key);
        });
        overlayLayer.appendChild(c);
      });

      if (arrow.routing === "curved") {
        geom.controlPoints.forEach((cp, idx) => {
          const line = createSvg("line", {
            x1: idx === 0 ? geom.from.x : geom.to.x,
            y1: idx === 0 ? geom.from.y : geom.to.y,
            x2: cp.x,
            y2: cp.y,
            stroke: "#6f87b8",
            "stroke-dasharray": "4 4",
            "stroke-width": 1,
          });
          overlayLayer.appendChild(line);
          const c = createSvg("circle", {
            cx: cp.x,
            cy: cp.y,
            r: 4.8,
            fill: "#d6dcff",
            stroke: "#1a2235",
            "stroke-width": 1,
            style: "cursor:move",
          });
          c.addEventListener("pointerdown", (evt) => {
            evt.stopPropagation();
            startArrowControlPointDrag(evt, arrow.id, idx);
          });
          overlayLayer.appendChild(c);
        });
      } else if (arrow.routing === "angled") {
        (arrow.waypoints || []).forEach((wp, idx) => {
          const c = createSvg("rect", {
            x: wp.x - 4.2,
            y: wp.y - 4.2,
            width: 8.4,
            height: 8.4,
            fill: "#b6ffc8",
            stroke: "#1a2235",
            "stroke-width": 1,
            rx: 1.2,
            ry: 1.2,
            style: "cursor:move",
          });
          c.addEventListener("pointerdown", (evt) => {
            evt.stopPropagation();
            startArrowWaypointDrag(evt, arrow.id, idx);
          });
          overlayLayer.appendChild(c);
        });
      }
    }
  }

  function updateSelectionChip() {
    if (!state.selected) {
      els.selectionChip.textContent = "Selection: none";
      return;
    }
    els.selectionChip.textContent = "Selection: " + state.selected.type + " " + state.selected.id;
  }

  function setSelected(sel) {
    state.selected = sel;
    render();
  }

  function clientToSvg(evt) {
    const pt = els.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const matrix = els.svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function onBackgroundPointerDown(evt) {
    if (evt.button !== 0) return;
    state.selected = null;
    state.connectFromShapeId = null;
    render();
  }

  function onShapePointerDown(evt, shapeId) {
    evt.stopPropagation();
    if (evt.button !== 0) return;
    const shape = shapeById(shapeId);
    if (!shape) return;

    if (state.mode === "connect") {
      if (!state.connectFromShapeId) {
        state.connectFromShapeId = shapeId;
        setStatus("Connect mode: source selected " + shapeId + ". Click a target shape.", "ok");
        render();
        return;
      }
      if (state.connectFromShapeId === shapeId) {
        setStatus("Connect mode: source and target cannot be the same shape.", "error");
        return;
      }
      createArrow(state.connectFromShapeId, shapeId);
      state.connectFromShapeId = null;
      return;
    }

    setSelected({ type: "shape", id: shapeId });
    const start = clientToSvg(evt);
    const toMove = [shapeId];
    if (shape.kind === "container") {
      toMove.push.apply(toMove, descendantsOf(shapeId));
    }
    const before = {};
    toMove.forEach((id) => {
      const s = shapeById(id);
      before[id] = { x: s.x, y: s.y };
    });
    state.drag = {
      type: "move-shapes",
      shapeId,
      start,
      before,
      movedShapeIds: toMove,
      previousParentId: shape.parentId,
    };
  }

  function startShapeResize(evt, shapeId, corner) {
    const shape = shapeById(shapeId);
    if (!shape) return;
    const start = clientToSvg(evt);
    state.drag = {
      type: "resize-shape",
      shapeId,
      corner,
      start,
      before: {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      },
    };
  }

  function startArrowEndpointDrag(evt, arrowId, endpointKey) {
    state.drag = {
      type: "arrow-endpoint",
      arrowId,
      endpointKey,
    };
  }

  function startArrowWaypointDrag(evt, arrowId, waypointIndex) {
    state.drag = {
      type: "arrow-waypoint",
      arrowId,
      waypointIndex,
    };
  }

  function startArrowControlPointDrag(evt, arrowId, cpIndex) {
    state.drag = {
      type: "arrow-control",
      arrowId,
      cpIndex,
    };
  }

  function pickContainerForShape(shape) {
    if (!shape) return null;
    const center = shapeCenter(shape);
    const candidates = state.model.shapes.filter((s) =>
      s.kind === "container" &&
      s.id !== shape.id &&
      !isDescendant(s.id, shape.id) &&
      center.x >= s.x &&
      center.x <= s.x + s.width &&
      center.y >= s.y &&
      center.y <= s.y + s.height
    );
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      if (areaA !== areaB) return areaA - areaB;
      return (b.z || 0) - (a.z || 0);
    });
    return candidates[0];
  }

  function getAllAnchors() {
    const stops = getAnchorStops();
    const count = Math.max(2, state.model.anchors.countPerEdge || stops.length || 5);
    const anchors = [];
    state.model.shapes.forEach((shape) => {
      const maxIndex = count - 1;
      for (let i = 0; i <= maxIndex; i += 1) {
        const frac = i < stops.length ? stops[i] : i / maxIndex;
        anchors.push({ shapeId: shape.id, side: "left", anchorIndex: i, x: shape.x, y: shape.y + shape.height * frac });
        anchors.push({ shapeId: shape.id, side: "right", anchorIndex: i, x: shape.x + shape.width, y: shape.y + shape.height * frac });
        anchors.push({ shapeId: shape.id, side: "top", anchorIndex: i, x: shape.x + shape.width * frac, y: shape.y });
        anchors.push({ shapeId: shape.id, side: "bottom", anchorIndex: i, x: shape.x + shape.width * frac, y: shape.y + shape.height });
      }
    });
    return anchors;
  }

  function nearestAnchor(point) {
    const anchors = getAllAnchors();
    let best = null;
    anchors.forEach((anchor) => {
      const dx = anchor.x - point.x;
      const dy = anchor.y - point.y;
      const d2 = dx * dx + dy * dy;
      if (!best || d2 < best.d2) best = { anchor, d2 };
    });
    return best ? best.anchor : null;
  }

  function handlePointerMove(evt) {
    if (!state.drag) return;
    const point = clientToSvg(evt);
    if (state.drag.type === "move-shapes") {
      const dx = point.x - state.drag.start.x;
      const dy = point.y - state.drag.start.y;
      state.drag.movedShapeIds.forEach((id) => {
        const shape = shapeById(id);
        const before = state.drag.before[id];
        shape.x = before.x + dx;
        shape.y = before.y + dy;
      });
      render();
      return;
    }

    if (state.drag.type === "resize-shape") {
      const shape = shapeById(state.drag.shapeId);
      if (!shape) return;
      const b = state.drag.before;
      let x = b.x;
      let y = b.y;
      let w = b.width;
      let h = b.height;
      if (state.drag.corner.indexOf("e") >= 0) w = Math.max(MIN_SHAPE_SIZE, b.width + (point.x - state.drag.start.x));
      if (state.drag.corner.indexOf("s") >= 0) h = Math.max(MIN_SHAPE_SIZE, b.height + (point.y - state.drag.start.y));
      if (state.drag.corner.indexOf("w") >= 0) {
        const nx = b.x + (point.x - state.drag.start.x);
        const maxX = b.x + b.width - MIN_SHAPE_SIZE;
        x = Math.min(nx, maxX);
        w = Math.max(MIN_SHAPE_SIZE, b.width - (x - b.x));
      }
      if (state.drag.corner.indexOf("n") >= 0) {
        const ny = b.y + (point.y - state.drag.start.y);
        const maxY = b.y + b.height - MIN_SHAPE_SIZE;
        y = Math.min(ny, maxY);
        h = Math.max(MIN_SHAPE_SIZE, b.height - (y - b.y));
      }
      shape.x = x;
      shape.y = y;
      shape.width = w;
      shape.height = h;
      render();
      return;
    }

    if (state.drag.type === "arrow-endpoint") {
      const arrow = arrowById(state.drag.arrowId);
      if (!arrow) return;
      const anchor = nearestAnchor(point);
      if (!anchor) return;
      arrow[state.drag.endpointKey] = {
        shapeId: anchor.shapeId,
        side: anchor.side,
        anchorIndex: anchor.anchorIndex,
      };
      render();
      return;
    }

    if (state.drag.type === "arrow-waypoint") {
      const arrow = arrowById(state.drag.arrowId);
      if (!arrow) return;
      if (!Array.isArray(arrow.waypoints)) arrow.waypoints = [];
      if (!arrow.waypoints[state.drag.waypointIndex]) return;
      arrow.waypoints[state.drag.waypointIndex] = { x: point.x, y: point.y };
      render();
      return;
    }

    if (state.drag.type === "arrow-control") {
      const arrow = arrowById(state.drag.arrowId);
      if (!arrow) return;
      if (!Array.isArray(arrow.controlPoints)) arrow.controlPoints = [];
      while (arrow.controlPoints.length < 2) {
        arrow.controlPoints.push({ x: point.x, y: point.y });
      }
      arrow.controlPoints[state.drag.cpIndex] = { x: point.x, y: point.y };
      render();
    }
  }

  function handlePointerUp() {
    if (!state.drag) return;
    if (state.drag.type === "move-shapes") {
      const moved = shapeById(state.drag.shapeId);
      if (moved && moved.kind !== "container") {
        const previousParentId = moved.parentId;
        const parent = pickContainerForShape(moved);
        moved.parentId = parent ? parent.id : null;
        if (moved.parentId !== previousParentId) {
          updateAutoId(moved, previousParentId);
        }
      }
    }
    state.drag = null;
    render();
  }

  function chooseEndpointForNewArrow(fromShape, toShape, isFromEndpoint) {
    const fromCenter = shapeCenter(fromShape);
    const toCenter = shapeCenter(toShape);
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    let side;
    if (Math.abs(dx) >= Math.abs(dy)) {
      side = dx >= 0 ? (isFromEndpoint ? "right" : "left") : (isFromEndpoint ? "left" : "right");
    } else {
      side = dy >= 0 ? (isFromEndpoint ? "bottom" : "top") : (isFromEndpoint ? "top" : "bottom");
    }
    const anchorIndex = Math.floor((Math.max(2, state.model.anchors.countPerEdge || 5) - 1) / 2);
    return {
      shapeId: isFromEndpoint ? fromShape.id : toShape.id,
      side,
      anchorIndex,
    };
  }

  function createArrow(fromShapeId, toShapeId) {
    const fromShape = shapeById(fromShapeId);
    const toShape = shapeById(toShapeId);
    if (!fromShape || !toShape) return;
    const id = uniqueArrowId("arrow_" + (state.model.arrows.length + 1), null);
    const arrow = {
      id,
      from: chooseEndpointForNewArrow(fromShape, toShape, true),
      to: chooseEndpointForNewArrow(fromShape, toShape, false),
      lineStyle: "solid",
      routing: "angled",
      arrowHead: true,
      stroke: "#e8efff",
      width: 1.7,
      label: "",
      waypoints: [],
      controlPoints: [],
    };
    state.model.arrows.push(arrow);
    setSelected({ type: "arrow", id });
    setStatus("Created arrow " + id + ".", "ok");
  }

  function addShape(kind) {
    const vb = state.model.metadata.viewBox || { width: 1980, height: 410 };
    const x = vb.width * 0.5 - 70 + (Math.random() * 20 - 10);
    const y = vb.height * 0.5 - 32 + (Math.random() * 20 - 10);
    const text = kind === "container" ? "Container" : "Node";
    const desired = deriveShapeId(text, "");
    const id = uniqueShapeId(desired, null);
    const fill = kind === "container" ? "#0d172a" : "#1c2f4f";
    const stroke = kind === "container" ? "#eef3ff" : "#80b6ff";
    const shape = {
      id,
      idManual: false,
      kind,
      text,
      x,
      y,
      width: kind === "container" ? 240 : 128,
      height: kind === "container" ? 140 : 56,
      fill,
      stroke,
      textColor: "#f4f7ff",
      rounded: true,
      z: (state.model.shapes.length ? Math.max.apply(null, state.model.shapes.map((s) => s.z || 0)) : 0) + 1,
      parentId: null,
    };
    state.model.shapes.push(shape);
    setSelected({ type: "shape", id: shape.id });
    render();
  }

  function deleteSelected() {
    if (!state.selected) return;
    if (state.selected.type === "shape") {
      const shape = shapeById(state.selected.id);
      if (!shape) return;
      const idsToDelete = [shape.id].concat(descendantsOf(shape.id));
      const idSet = new Set(idsToDelete);
      state.model.shapes = state.model.shapes.filter((s) => !idSet.has(s.id));
      state.model.arrows = state.model.arrows.filter((a) => !idSet.has(a.from.shapeId) && !idSet.has(a.to.shapeId));
      state.selected = null;
      state.connectFromShapeId = null;
      render();
      return;
    }
    if (state.selected.type === "arrow") {
      state.model.arrows = state.model.arrows.filter((a) => a.id !== state.selected.id);
      state.selected = null;
      render();
    }
  }

  function fitCanvas() {
    els.canvasScroll.scrollLeft = 0;
    els.canvasScroll.scrollTop = 0;
    requestAnimationFrame(() => {
      const targetLeft = Math.max(0, Math.round((els.canvasScroll.scrollWidth - els.canvasScroll.clientWidth) / 2));
      const targetTop = Math.max(0, Math.round((els.canvasScroll.scrollHeight - els.canvasScroll.clientHeight) / 2));
      els.canvasScroll.scrollLeft = targetLeft;
      els.canvasScroll.scrollTop = targetTop;
    });
  }

  function renderInspector() {
    if (!state.selected) {
      els.inspector.innerHTML = '<div class="empty-state">Select a shape or arrow to edit properties.</div>';
      return;
    }
    if (state.selected.type === "shape") {
      renderShapeInspector(state.selected.id);
      return;
    }
    if (state.selected.type === "arrow") {
      renderArrowInspector(state.selected.id);
      return;
    }
    els.inspector.innerHTML = '<div class="empty-state">Selection unsupported.</div>';
  }

  function renderShapeInspector(shapeId) {
    const shape = shapeById(shapeId);
    if (!shape) {
      els.inspector.innerHTML = '<div class="empty-state">Shape not found.</div>';
      return;
    }
    const containers = state.model.shapes.filter((s) => s.kind === "container" && s.id !== shape.id && !isDescendant(s.id, shape.id));
    const palette = state.model.metadata.colorPalette || DEFAULT_COLOR_PALETTE;
    const parentText = shape.parentId ? (shapeById(shape.parentId) ? shapeById(shape.parentId).text : shape.parentId) : "None";
    els.inspector.innerHTML = [
      "<div>",
      "<h3>Shape</h3>",
      '<div><label>Text</label><input id="ins-shape-text" type="text" value="' + escapeHtml(shape.text) + '"/></div>',
      '<div><label>ID</label><input id="ins-shape-id" type="text" value="' + escapeHtml(shape.id) + '"/></div>',
      '<div class="hint">Parent container: <strong>' + escapeHtml(parentText) + "</strong></div>",
      '<div class="hint">Auto ID: ' + (shape.idManual ? "off (manual)" : "on (container_text)") + "</div>",
      "<h3>Color</h3>",
      '<div class="palette" id="ins-shape-palette"></div>',
      '<div><label>Custom fill</label><input id="ins-shape-fill" type="color" value="' + normalizeColor(shape.fill) + '"/></div>',
      '<div><label>Border color</label><input id="ins-shape-stroke" type="color" value="' + normalizeColor(shape.stroke) + '"/></div>',
      '<div class="row"><label style="margin:0;"><input id="ins-shape-rounded" type="checkbox"' + (shape.rounded ? " checked" : "") + "> Rounded corners</label></div>",
      "<h3>Geometry</h3>",
      '<div class="grid2">' +
      '<div><label>x</label><input id="ins-shape-x" type="number" step="1" value="' + roundNum(shape.x) + '"/></div>' +
      '<div><label>y</label><input id="ins-shape-y" type="number" step="1" value="' + roundNum(shape.y) + '"/></div>' +
      '<div><label>width</label><input id="ins-shape-w" type="number" step="1" min="' + MIN_SHAPE_SIZE + '" value="' + roundNum(shape.width) + '"/></div>' +
      '<div><label>height</label><input id="ins-shape-h" type="number" step="1" min="' + MIN_SHAPE_SIZE + '" value="' + roundNum(shape.height) + '"/></div>' +
      "</div>",
      "<h3>Z-Order</h3>",
      '<div class="row"><button id="ins-z-back">Send Back</button><button id="ins-z-front">Bring Front</button></div>',
      containers.length
        ? "<h3>Container Assign</h3>" +
          '<div><label>Parent container</label><select id="ins-parent">' +
          '<option value="">None</option>' +
          containers.map((c) => '<option value="' + escapeHtml(c.id) + '"' + (shape.parentId === c.id ? " selected" : "") + ">" + escapeHtml(c.text) + " (" + escapeHtml(c.id) + ")</option>").join("") +
          "</select></div>"
        : "",
      "</div>",
    ].join("");

    const paletteEl = document.getElementById("ins-shape-palette");
    palette.forEach((color) => {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "swatch" + (normalizeColor(shape.fill) === normalizeColor(color) ? " active" : "");
      sw.style.background = color;
      sw.addEventListener("click", () => {
        shape.fill = color;
        if (!shape.stroke || shape.stroke === "#80b6ff" || shape.stroke === "#eef3ff") {
          shape.stroke = darken(color, 36);
        }
        render();
      });
      paletteEl.appendChild(sw);
    });

    bindInput("ins-shape-text", "input", (value) => {
      shape.text = value || (shape.kind === "container" ? "Container" : "Node");
      if (!shape.idManual) {
        const parent = shape.parentId ? shapeById(shape.parentId) : null;
        const autoId = uniqueShapeId(deriveShapeId(shape.text, parent ? parent.text : ""), shape.id);
        renameShapeId(shape.id, autoId);
      }
      render();
    });
    bindInput("ins-shape-id", "change", (value) => {
      const next = uniqueShapeId(sanitizeId(value || shape.id), shape.id);
      shape.idManual = true;
      renameShapeId(shape.id, next);
      render();
    });
    bindInput("ins-shape-fill", "input", (value) => {
      shape.fill = value;
      render();
    });
    bindInput("ins-shape-stroke", "input", (value) => {
      shape.stroke = value;
      render();
    });
    bindChecked("ins-shape-rounded", (checked) => {
      shape.rounded = checked;
      render();
    });
    bindNumber("ins-shape-x", (num) => { shape.x = num; render(); });
    bindNumber("ins-shape-y", (num) => { shape.y = num; render(); });
    bindNumber("ins-shape-w", (num) => { shape.width = Math.max(MIN_SHAPE_SIZE, num); render(); });
    bindNumber("ins-shape-h", (num) => { shape.height = Math.max(MIN_SHAPE_SIZE, num); render(); });

    const zBack = document.getElementById("ins-z-back");
    const zFront = document.getElementById("ins-z-front");
    if (zBack) zBack.addEventListener("click", () => {
      const minZ = Math.min.apply(null, state.model.shapes.map((s) => s.z || 0));
      shape.z = minZ - 1;
      render();
    });
    if (zFront) zFront.addEventListener("click", () => {
      const maxZ = Math.max.apply(null, state.model.shapes.map((s) => s.z || 0));
      shape.z = maxZ + 1;
      render();
    });

    const parentSel = document.getElementById("ins-parent");
    if (parentSel) {
      parentSel.addEventListener("change", () => {
        const prev = shape.parentId;
        shape.parentId = parentSel.value || null;
        if (!shape.idManual && prev !== shape.parentId) {
          updateAutoId(shape, prev);
        }
        render();
      });
    }
  }

  function renderArrowInspector(arrowId) {
    const arrow = arrowById(arrowId);
    if (!arrow) {
      els.inspector.innerHTML = '<div class="empty-state">Arrow not found.</div>';
      return;
    }
    const fromShape = shapeById(arrow.from.shapeId);
    const toShape = shapeById(arrow.to.shapeId);
    const cp1 = arrow.controlPoints[0] || { x: 0, y: 0 };
    const cp2 = arrow.controlPoints[1] || { x: 0, y: 0 };
    const waypointRows = (arrow.waypoints || []).map((wp, idx) =>
      '<div class="grid2" data-waypoint="' + idx + '">' +
      '<div><label>x</label><input data-waypoint-x="' + idx + '" type="number" step="1" value="' + roundNum(wp.x) + '"/></div>' +
      '<div><label>y</label><input data-waypoint-y="' + idx + '" type="number" step="1" value="' + roundNum(wp.y) + '"/></div>' +
      '<div class="row"><button data-waypoint-remove="' + idx + '" class="danger">Remove waypoint</button></div>' +
      "</div>"
    ).join("");

    els.inspector.innerHTML = [
      "<div>",
      "<h3>Arrow</h3>",
      '<div><label>ID</label><input id="ins-arrow-id" type="text" value="' + escapeHtml(arrow.id) + '"/></div>',
      '<div class="hint">From: <strong>' + escapeHtml(fromShape ? fromShape.id : arrow.from.shapeId) + "</strong> (" + arrow.from.side + ":" + arrow.from.anchorIndex + ")</div>",
      '<div class="hint">To: <strong>' + escapeHtml(toShape ? toShape.id : arrow.to.shapeId) + "</strong> (" + arrow.to.side + ":" + arrow.to.anchorIndex + ")</div>",
      "<h3>Style</h3>",
      '<div><label>Line style</label><select id="ins-arrow-line"><option value="solid"' + (arrow.lineStyle === "solid" ? " selected" : "") + '>solid</option><option value="dashed"' + (arrow.lineStyle === "dashed" ? " selected" : "") + ">dashed</option></select></div>",
      '<div><label>Routing</label><select id="ins-arrow-routing"><option value="angled"' + (arrow.routing === "angled" ? " selected" : "") + '>angled/orthogonal</option><option value="straight"' + (arrow.routing === "straight" ? " selected" : "") + '>straight</option><option value="curved"' + (arrow.routing === "curved" ? " selected" : "") + ">curved</option></select></div>",
      '<div class="row"><label style="margin:0;"><input id="ins-arrow-head" type="checkbox"' + (arrow.arrowHead ? " checked" : "") + "> Arrowhead</label></div>",
      '<div><label>Color</label><input id="ins-arrow-color" type="color" value="' + normalizeColor(arrow.stroke) + '"/></div>',
      '<div><label>Width</label><input id="ins-arrow-width" type="number" min="0.5" step="0.1" value="' + roundNum(arrow.width) + '"/></div>',
      '<div><label>Label (optional)</label><input id="ins-arrow-label" type="text" value="' + escapeHtml(arrow.label || "") + '"/></div>',
      arrow.routing === "curved"
        ? "<h3>Control Points</h3>" +
          '<div class="grid2">' +
          '<div><label>cp1 x</label><input id="ins-cp1x" type="number" step="1" value="' + roundNum(cp1.x) + '"/></div>' +
          '<div><label>cp1 y</label><input id="ins-cp1y" type="number" step="1" value="' + roundNum(cp1.y) + '"/></div>' +
          '<div><label>cp2 x</label><input id="ins-cp2x" type="number" step="1" value="' + roundNum(cp2.x) + '"/></div>' +
          '<div><label>cp2 y</label><input id="ins-cp2y" type="number" step="1" value="' + roundNum(cp2.y) + '"/></div>' +
          "</div>"
        : "",
      arrow.routing === "angled"
        ? "<h3>Waypoints</h3>" +
          (waypointRows || '<div class="hint">No waypoints. Add one to bend manually.</div>') +
          '<div class="row"><button id="ins-waypoint-add">Add waypoint</button></div>'
        : "",
      "</div>",
    ].join("");

    bindInput("ins-arrow-id", "change", (value) => {
      arrow.id = uniqueArrowId(sanitizeId(value || arrow.id), arrow.id);
      render();
    });
    bindInput("ins-arrow-line", "change", (value) => {
      arrow.lineStyle = value === "dashed" ? "dashed" : "solid";
      render();
    });
    bindInput("ins-arrow-routing", "change", (value) => {
      arrow.routing = normalizeRouting(value);
      if (arrow.routing === "curved" && (!arrow.controlPoints || arrow.controlPoints.length < 2)) {
        const geom = buildArrowGeometry(arrow);
        arrow.controlPoints = geom.controlPoints;
      }
      render();
    });
    bindChecked("ins-arrow-head", (checked) => {
      arrow.arrowHead = checked;
      render();
    });
    bindInput("ins-arrow-color", "input", (value) => {
      arrow.stroke = value;
      render();
    });
    bindNumber("ins-arrow-width", (num) => {
      arrow.width = Math.max(0.5, num);
      render();
    });
    bindInput("ins-arrow-label", "input", (value) => {
      arrow.label = value;
      render();
    });

    if (arrow.routing === "curved") {
      bindNumber("ins-cp1x", (num) => setControlPoint(arrow, 0, "x", num));
      bindNumber("ins-cp1y", (num) => setControlPoint(arrow, 0, "y", num));
      bindNumber("ins-cp2x", (num) => setControlPoint(arrow, 1, "x", num));
      bindNumber("ins-cp2y", (num) => setControlPoint(arrow, 1, "y", num));
    }
    if (arrow.routing === "angled") {
      const addBtn = document.getElementById("ins-waypoint-add");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          if (!Array.isArray(arrow.waypoints)) arrow.waypoints = [];
          const geom = buildArrowGeometry(arrow);
          arrow.waypoints.push({ x: (geom.from.x + geom.to.x) / 2, y: (geom.from.y + geom.to.y) / 2 });
          render();
        });
      }
      (arrow.waypoints || []).forEach((_, idx) => {
        bindNumberByAttr("data-waypoint-x", idx, (num) => {
          arrow.waypoints[idx].x = num;
          render();
        });
        bindNumberByAttr("data-waypoint-y", idx, (num) => {
          arrow.waypoints[idx].y = num;
          render();
        });
        const removeBtn = document.querySelector('[data-waypoint-remove="' + idx + '"]');
        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            arrow.waypoints.splice(idx, 1);
            render();
          });
        }
      });
    }
  }

  function setControlPoint(arrow, index, axis, value) {
    if (!Array.isArray(arrow.controlPoints)) arrow.controlPoints = [];
    while (arrow.controlPoints.length < 2) {
      arrow.controlPoints.push({ x: 0, y: 0 });
    }
    arrow.controlPoints[index][axis] = value;
    render();
  }

  function escapeHtml(txt) {
    return String(txt || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeColor(color) {
    const value = String(color || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    return "#1c2f4f";
  }

  function roundNum(num) {
    const n = Number(num) || 0;
    if (Math.abs(n - Math.round(n)) < 0.01) return String(Math.round(n));
    return String(Math.round(n * 10) / 10);
  }

  function bindInput(id, eventName, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(eventName, () => handler(el.value));
  }

  function bindChecked(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => handler(!!el.checked));
  }

  function bindNumber(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const num = Number(el.value);
      if (!Number.isFinite(num)) return;
      handler(num);
    });
  }

  function bindNumberByAttr(attr, index, handler) {
    const el = document.querySelector("[" + attr + '="' + index + '"]');
    if (!el) return;
    el.addEventListener("input", () => {
      const num = Number(el.value);
      if (!Number.isFinite(num)) return;
      handler(num);
    });
  }

  async function apiLoadModel() {
    const elf = encodeURIComponent(state.elf || "unknown.elf");
    const response = await fetch("/api/model?elf=" + elf);
    if (!response.ok) throw new Error("Load failed (" + response.status + ")");
    return response.json();
  }

  async function apiSaveModel() {
    const elf = encodeURIComponent(state.elf || "unknown.elf");
    const response = await fetch("/api/model?elf=" + elf, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: state.model }),
    });
    if (!response.ok) throw new Error("Save failed (" + response.status + ")");
    return response.json();
  }

  async function apiGenerate() {
    const elf = encodeURIComponent(state.elf || "unknown.elf");
    const response = await fetch("/api/generate?elf=" + elf, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: state.model }),
    });
    if (!response.ok) throw new Error("Generate failed (" + response.status + ")");
    return response.json();
  }

  async function loadModel() {
    state.elf = String(els.elfInput.value || "").trim();
    if (!state.elf) {
      setStatus("ELF key cannot be empty.", "error");
      return;
    }
    setStatus("Loading model for " + state.elf + "...");
    try {
      const payload = await apiLoadModel();
      state.model = payload.model || defaultModel(state.elf);
      ensureModelDefaults();
      state.selected = null;
      state.connectFromShapeId = null;
      render();
      fitCanvas();
      setStatus("Loaded model from " + payload.paths.store, "ok");
    } catch (err) {
      setStatus("Load error: " + (err && err.message ? err.message : String(err)), "error");
    }
  }

  async function saveModel() {
    ensureModelDefaults();
    setStatus("Saving model...");
    try {
      const payload = await apiSaveModel();
      state.model = payload.model || state.model;
      ensureModelDefaults();
      render();
      setStatus("Saved diagram store to " + payload.paths.store, "ok");
    } catch (err) {
      setStatus("Save error: " + (err && err.message ? err.message : String(err)), "error");
    }
  }

  async function generateRenderer() {
    ensureModelDefaults();
    setStatus("Generating renderer...");
    try {
      const payload = await apiGenerate();
      state.model = payload.model || state.model;
      ensureModelDefaults();
      render();
      setStatus("Generated " + payload.paths.renderer + " (" + payload.renderer.bytes + " bytes)", "ok");
    } catch (err) {
      setStatus("Generation error: " + (err && err.message ? err.message : String(err)), "error");
    }
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode !== "connect") state.connectFromShapeId = null;
    els.toolSelectBtn.classList.toggle("active", mode === "select");
    els.toolConnectBtn.classList.toggle("active", mode === "connect");
    render();
  }

  function bindEvents() {
    els.loadBtn.addEventListener("click", loadModel);
    els.saveBtn.addEventListener("click", saveModel);
    els.generateBtn.addEventListener("click", generateRenderer);
    els.toolSelectBtn.addEventListener("click", () => setMode("select"));
    els.toolConnectBtn.addEventListener("click", () => setMode("connect"));
    els.addShapeBtn.addEventListener("click", () => addShape("shape"));
    els.addContainerBtn.addEventListener("click", () => addShape("container"));
    els.deleteBtn.addEventListener("click", deleteSelected);
    els.fitBtn.addEventListener("click", fitCanvas);
    els.svg.addEventListener("pointerdown", onBackgroundPointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", (evt) => {
      if (evt.key === "Delete" || evt.key === "Backspace") {
        const target = evt.target;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (isInput) return;
        deleteSelected();
      }
      if (evt.key === "Escape") {
        state.connectFromShapeId = null;
        state.drag = null;
        setMode("select");
      }
    });
  }

  function init() {
    const qpElf = queryParam("elf");
    state.elf = qpElf || "diagram.elf";
    els.elfInput.value = state.elf;
    state.model = defaultModel(state.elf);
    ensureModelDefaults();
    bindEvents();
    render();
    fitCanvas();
    loadModel();
  }

  init();
})();
