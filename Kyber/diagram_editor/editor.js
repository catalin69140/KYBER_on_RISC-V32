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
  const DEFAULT_FONT_FAMILY = 'Georgia, "Times New Roman", serif';
  const FONT_FAMILY_OPTIONS = [
    { label: "Arial", value: "Arial, Helvetica, sans-serif" },
    { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
    { label: "Inter", value: "Inter, Arial, sans-serif" },
    { label: "Roboto", value: "Roboto, Arial, sans-serif" },
    { label: "Open Sans", value: '"Open Sans", Arial, sans-serif' },
    { label: "Lato", value: "Lato, Arial, sans-serif" },
    { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
    { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
    { label: "Trebuchet MS", value: '"Trebuchet MS", Helvetica, sans-serif' },
    { label: "Georgia", value: DEFAULT_FONT_FAMILY },
    { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  ];
  const FONT_FAMILY_VALUES = new Set(FONT_FAMILY_OPTIONS.map((option) => option.value));
  const DEFAULT_SHAPE_SIZES = {
    square: { width: 48, height: 48 },
    rectangle: { width: 100, height: 48 },
    triangle: { width: 90, height: 60 },
    circle: { width: 60, height: 60 },
    oval: { width: 100, height: 90 },
    container: { width: 240, height: 200 },
    header_container: { width: 240, height: 200 },
    component_group: { width: 200, height: 70 },
  };
  const DEFAULT_ANCHOR_STOPS = Array.from({ length: 11 }, (_, idx) => idx / 10);
  const MAX_SHAPE_TEXT_LENGTH = 500;
  const HANDLE_SIZE = 8;
  const MIN_SHAPE_SIZE = 24;
  const HISTORY_LIMIT = 120;
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  const CONNECT_MODES = {
    connect_arrow: "arrow",
    connect_bi: "bi",
    connect_line: "line",
  };
  const TEXT_FORMAT_KEYS = ["bold", "italic", "underline", "overline", "subscript", "superscript"];

  const CONTAINER_KINDS = new Set(["container", "header_container"]);
  const SHAPE_KINDS = new Set([
    "square",
    "rectangle",
    "triangle",
    "circle",
    "oval",
    "container",
    "header_container",
    "component_group",
  ]);

  const state = {
    elf: "",
    model: null,
    mode: "select",
    selected: null, // {type: "shape" | "arrow", id: "..."}
    connectSourceId: null,
    drag: null,
    arrowRenderCache: {},
    history: [],
    future: [],
    clipboard: null,
    richTextSelection: null,
    richTextPendingFormat: null,
    view: {
      zoom: 1,
      minZoom: 0.15,
      maxZoom: 6,
    },
  };

  const els = {
    elfInput: document.getElementById("elf-input"),
    loadBtn: document.getElementById("load-btn"),
    saveBtn: document.getElementById("save-btn"),
    generateBtn: document.getElementById("generate-btn"),
    toolSelectBtn: document.getElementById("tool-select"),
    toolConnectArrowBtn: document.getElementById("tool-connect-arrow"),
    toolConnectBiBtn: document.getElementById("tool-connect-bi"),
    toolConnectLineBtn: document.getElementById("tool-connect-line"),
    addSquareBtn: document.getElementById("add-square-btn"),
    addRectangleBtn: document.getElementById("add-rectangle-btn"),
    addTriangleBtn: document.getElementById("add-triangle-btn"),
    addCircleBtn: document.getElementById("add-circle-btn"),
    addOvalBtn: document.getElementById("add-oval-btn"),
    addContainerStandardBtn: document.getElementById("add-container-standard-btn"),
    addContainerHeaderBtn: document.getElementById("add-container-header-btn"),
    addComponentGroupBtn: document.getElementById("add-component-group-btn"),
    deleteBtn: document.getElementById("delete-btn"),
    zoomInBtn: document.getElementById("zoom-in-btn"),
    zoomOutBtn: document.getElementById("zoom-out-btn"),
    zoomResetBtn: document.getElementById("zoom-reset-btn"),
    zoomLabel: document.getElementById("zoom-label"),
    canvasScroll: document.getElementById("canvas-scroll"),
    svg: document.getElementById("diagram-canvas"),
    inspector: document.getElementById("inspector-content"),
    status: document.getElementById("status"),
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

  function normalizeShapeKind(raw) {
    const kind = String(raw || "").trim().toLowerCase();
    if (SHAPE_KINDS.has(kind)) return kind;
    return "square";
  }

  function usesContainerPalette(kind) {
    return isContainerKind(kind) || kind === "component_group";
  }

  function deriveShapeId(text, containerText) {
    const base = sanitizeId(text || "node");
    if (containerText) {
      return sanitizeId(containerText) + "_" + base;
    }
    return base;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function defaultShapeText(kind) {
    if (kind === "square") return "Square";
    if (kind === "rectangle") return "Rectangle";
    if (kind === "container") return "Container";
    if (kind === "header_container") return "Header";
    if (kind === "circle") return "Circle";
    if (kind === "oval") return "Oval";
    if (kind === "triangle") return "Triangle";
    if (kind === "component_group") return "Group";
    return "Node";
  }

  function defaultShapeSize(kind) {
    const normalized = normalizeShapeKind(kind);
    const size = DEFAULT_SHAPE_SIZES[normalized];
    return size ? { width: size.width, height: size.height } : { width: 100, height: 48 };
  }

  function defaultBorderWidth(kind) {
    return usesContainerPalette(kind) ? 1.8 : 1.5;
  }

  function normalizeBorderWidth(raw, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return clamp(n, 0.5, 12);
  }

  function normalizeFontFamily(raw) {
    const value = String(raw || "").trim();
    if (FONT_FAMILY_VALUES.has(value)) return value;
    return DEFAULT_FONT_FAMILY;
  }

  function anchorCount() {
    const explicit = Number(state.model && state.model.anchors && state.model.anchors.countPerEdge);
    if (Number.isFinite(explicit)) return Math.max(2, Math.round(explicit));
    const stops = getAnchorStops();
    return Math.max(2, stops.length || DEFAULT_ANCHOR_STOPS.length);
  }

  function normalizeAnchorIndex(raw, maxIndex, fallbackIndex) {
    const n = Number(raw);
    const idx = Number.isFinite(n) ? Math.round(n) : fallbackIndex;
    return clamp(idx, 0, maxIndex);
  }

  function anchorFractionForIndex(index) {
    const stops = getAnchorStops();
    const count = anchorCount();
    const idx = normalizeAnchorIndex(index, count - 1, 0);
    if (idx < stops.length) return stops[idx];
    if (count <= 1) return 0.5;
    return idx / (count - 1);
  }

  function anchorIndexForFraction(rawFraction) {
    const frac = clamp(Number(rawFraction), 0, 1);
    const count = anchorCount();
    let bestIndex = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < count; i += 1) {
      const delta = Math.abs(anchorFractionForIndex(i) - frac);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  function defaultModel(elfName) {
    return {
      version: 2,
      metadata: {
        elf: elfName || "",
        viewBox: { width: 1980, height: 1200 },
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

  function shapeById(id) {
    return (state.model && state.model.shapes || []).find((s) => s.id === id) || null;
  }

  function arrowById(id) {
    return (state.model && state.model.arrows || []).find((a) => a.id === id) || null;
  }

  function isContainerKind(kind) {
    return CONTAINER_KINDS.has(kind);
  }

  function sortedShapes() {
    return (state.model.shapes || []).slice().sort((a, b) => {
      if ((a.z || 0) !== (b.z || 0)) return (a.z || 0) - (b.z || 0);
      if (isContainerKind(a.kind) !== isContainerKind(b.kind)) return isContainerKind(a.kind) ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  }

  function sortedShapesBy(predicate) {
    return (state.model.shapes || [])
      .filter(predicate)
      .slice()
      .sort((a, b) => {
        if ((a.z || 0) !== (b.z || 0)) return (a.z || 0) - (b.z || 0);
        return a.id.localeCompare(b.id);
      });
  }

  function sortedArrows() {
    return (state.model.arrows || []).slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
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

  function normalizeLineStyle(raw) {
    return String(raw || "").toLowerCase() === "dashed" ? "dashed" : "solid";
  }

  function normalizeConnectionType(raw) {
    const t = String(raw || "").toLowerCase().trim();
    if (t === "arrow" || t === "bi" || t === "line") return t;
    return "arrow";
  }

  function normalizeBorderStyle(raw) {
    return String(raw || "").toLowerCase() === "dashed" ? "dashed" : "solid";
  }

  function normalizeTextAlign(raw) {
    const t = String(raw || "").toLowerCase().trim();
    if (t === "left" || t === "center" || t === "right") return t;
    return "center";
  }

  function normalizeTextVAlign(raw) {
    const t = String(raw || "").toLowerCase().trim();
    if (t === "top" || t === "center" || t === "bottom") return t;
    return "center";
  }

  function normalizeComponentDirection(raw) {
    return String(raw || "").toLowerCase() === "vertical" ? "vertical" : "horizontal";
  }

  function normalizeFontSize(raw, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return clamp(n, 8, 40);
  }

  function normalizeComponentLabels(rawLabels, count) {
    const out = [];
    const safeCount = Math.max(1, Math.min(24, Number(count) || 1));
    if (Array.isArray(rawLabels)) {
      rawLabels.forEach((txt) => out.push(String(txt || "").trim()));
    }
    while (out.length < safeCount) {
      out.push("Item " + (out.length + 1));
    }
    return out.slice(0, safeCount);
  }

  function normalizeColor(color, fallback) {
    const value = String(color || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    return fallback || "#1c2f4f";
  }

  function darken(hex, amount) {
    const h = String(hex || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#80b6ff";
    const r = clamp(parseInt(h.slice(0, 2), 16) + amount, 0, 255);
    const g = clamp(parseInt(h.slice(2, 4), 16) + amount, 0, 255);
    const b = clamp(parseInt(h.slice(4, 6), 16) + amount, 0, 255);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function borderNuance(hex) {
    // CryptoTool-like border nuance: brighter, slightly cooler than fill.
    const value = normalizeColor(hex, "#1c2f4f");
    const h = value.replace("#", "");
    const r = clamp(parseInt(h.slice(0, 2), 16) + 58, 0, 255);
    const g = clamp(parseInt(h.slice(2, 4), 16) + 68, 0, 255);
    const b = clamp(parseInt(h.slice(4, 6), 16) + 92, 0, 255);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function ensureModelDefaults() {
    if (!state.model) state.model = defaultModel(state.elf);
    if (!state.model.metadata) state.model.metadata = {};
    if (!state.model.metadata.viewBox) state.model.metadata.viewBox = { width: 1980, height: 1200 };
    state.model.metadata.viewBox.width = Math.max(600, Number(state.model.metadata.viewBox.width) || 1980);
    state.model.metadata.viewBox.height = Math.max(1200, Number(state.model.metadata.viewBox.height) || 1200);
    if (!state.model.metadata.background) state.model.metadata.background = "#0b1220";
    if (!Array.isArray(state.model.metadata.colorPalette) || !state.model.metadata.colorPalette.length) {
      state.model.metadata.colorPalette = DEFAULT_COLOR_PALETTE.slice();
    }

    if (!state.model.anchors) {
      state.model.anchors = {
        countPerEdge: DEFAULT_ANCHOR_STOPS.length,
        stops: DEFAULT_ANCHOR_STOPS.slice(),
      };
    }

    if (!Array.isArray(state.model.anchors.stops) || !state.model.anchors.stops.length) {
      state.model.anchors.stops = DEFAULT_ANCHOR_STOPS.slice();
    }
    state.model.anchors.stops = state.model.anchors.stops
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v))
      .map((v) => clamp(v, 0, 1))
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .sort((a, b) => a - b);
    if (state.model.anchors.stops.length < DEFAULT_ANCHOR_STOPS.length) {
      state.model.anchors.stops = DEFAULT_ANCHOR_STOPS.slice();
    }
      state.model.anchors.countPerEdge = Math.max(
      DEFAULT_ANCHOR_STOPS.length,
      Number(state.model.anchors.countPerEdge) || state.model.anchors.stops.length || DEFAULT_ANCHOR_STOPS.length
    );

    if (!Array.isArray(state.model.shapes)) state.model.shapes = [];
    if (!Array.isArray(state.model.arrows)) state.model.arrows = [];

    state.model.shapes.forEach((shape, idx) => {
      shape.kind = normalizeShapeKind(shape.kind);
      shape.text = String(shape.text || defaultShapeText(shape.kind));
      shape.richText = typeof shape.richText === "string" && shape.richText.trim()
        ? shape.richText
        : plainTextToRichHtml(shape.text);
      shape.id = sanitizeId(shape.id || deriveShapeId(shape.text, ""));
      shape.idManual = !!shape.idManual;
      shape.x = Number(shape.x) || 0;
      shape.y = Number(shape.y) || 0;
      shape.width = Math.max(MIN_SHAPE_SIZE, Number(shape.width) || defaultShapeSize(shape.kind).width);
      shape.height = Math.max(MIN_SHAPE_SIZE, Number(shape.height) || defaultShapeSize(shape.kind).height);
      if (shape.kind === "square" || shape.kind === "circle") {
        const side = Math.max(shape.width, shape.height);
        shape.width = side;
        shape.height = side;
      }
      const usesContainerColors = usesContainerPalette(shape.kind);
      shape.fill = normalizeColor(shape.fill, usesContainerColors ? "#0d172a" : "#1c2f4f");
      shape.stroke = normalizeColor(shape.stroke, usesContainerColors ? "#eef3ff" : "#80b6ff");
      shape.borderStyle = normalizeBorderStyle(shape.borderStyle);
      shape.borderWidth = normalizeBorderWidth(shape.borderWidth, defaultBorderWidth(shape.kind));
      shape.textColor = normalizeColor(shape.textColor, "#f4f7ff");
      shape.rounded = shape.rounded !== false;
      shape.textAlign = normalizeTextAlign(shape.textAlign || "center");
      shape.textVAlign = normalizeTextVAlign(shape.textVAlign || "center");
      shape.fontSize = normalizeFontSize(shape.fontSize, 12);
      shape.fontFamily = normalizeFontFamily(shape.fontFamily);
      shape.componentDirection = normalizeComponentDirection(shape.componentDirection);
      const defaultComponentCount = shape.kind === "component_group" ? 4 : 1;
      shape.componentCount = Math.max(1, Math.min(24, Math.round(Number.isFinite(Number(shape.componentCount)) ? Number(shape.componentCount) : defaultComponentCount)));
      const rawComponentLabels = Array.isArray(shape.componentLabels) && shape.componentLabels.length
        ? shape.componentLabels
        : [];
      shape.componentLabels = normalizeComponentLabels(rawComponentLabels, shape.componentCount);
      shape.z = Number(shape.z);
      if (!Number.isFinite(shape.z)) shape.z = idx;
      shape.parentId = shape.parentId ? String(shape.parentId) : null;
    });

    const shapeIds = new Set(state.model.shapes.map((s) => s.id));
    const containerIds = new Set(state.model.shapes.filter((s) => isContainerKind(s.kind)).map((s) => s.id));

    state.model.shapes.forEach((shape) => {
      if (!shape.parentId) return;
      if (!shapeIds.has(shape.parentId) || !containerIds.has(shape.parentId) || shape.parentId === shape.id || isDescendant(shape.parentId, shape.id)) {
        shape.parentId = null;
      }
    });

    state.model.arrows.forEach((arrow, idx) => {
      arrow.id = sanitizeId(arrow.id || ("arrow_" + (idx + 1)));
      arrow.from = arrow.from && typeof arrow.from === "object" ? arrow.from : {};
      arrow.to = arrow.to && typeof arrow.to === "object" ? arrow.to : {};
      arrow.from.shapeId = String(arrow.from.shapeId || "");
      arrow.to.shapeId = String(arrow.to.shapeId || "");
      arrow.from.side = normalizeSide(arrow.from.side || "right");
      arrow.to.side = normalizeSide(arrow.to.side || "left");
      const maxAnchor = Math.max(1, anchorCount() - 1);
      const fallbackAnchor = Math.floor(maxAnchor / 2);
      arrow.from.anchorIndex = normalizeAnchorIndex(arrow.from.anchorIndex, maxAnchor, fallbackAnchor);
      arrow.to.anchorIndex = normalizeAnchorIndex(arrow.to.anchorIndex, maxAnchor, fallbackAnchor);
      arrow.lineStyle = normalizeLineStyle(arrow.lineStyle);
      arrow.routing = normalizeRouting(arrow.routing);
      arrow.connectionType = normalizeConnectionType(arrow.connectionType);
      arrow.stroke = normalizeColor(arrow.stroke, "#e8efff");
      arrow.width = Math.max(0.5, Number(arrow.width) || 1.7);
      if (!Array.isArray(arrow.waypoints)) arrow.waypoints = [];
      if (!Array.isArray(arrow.controlPoints)) arrow.controlPoints = [];
      arrow.waypoints = arrow.waypoints.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
      arrow.controlPoints = arrow.controlPoints.slice(0, 2).map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
    });

    dedupeShapeIds();
    dedupeArrowIds();
    state.model.arrows = state.model.arrows.filter((a) => shapeById(a.from.shapeId) && shapeById(a.to.shapeId));
  }

  function dedupeShapeIds() {
    const seen = new Set();
    state.model.shapes.forEach((shape) => {
      let desired = sanitizeId(shape.id);
      if (!desired) desired = "node";
      let next = desired;
      let i = 2;
      while (seen.has(next)) {
        next = desired + "_" + i;
        i += 1;
      }
      if (next !== shape.id) {
        renameShapeId(shape.id, next);
      }
      seen.add(next);
    });
  }

  function dedupeArrowIds() {
    const seen = new Set();
    state.model.arrows.forEach((arrow) => {
      let desired = sanitizeId(arrow.id);
      if (!desired) desired = "arrow";
      let next = desired;
      let i = 2;
      while (seen.has(next)) {
        next = desired + "_" + i;
        i += 1;
      }
      arrow.id = next;
      seen.add(next);
    });
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
    if (state.connectSourceId === oldId) {
      state.connectSourceId = nextId;
    }
  }

  function updateAutoId(shape, oldParentId) {
    if (!shape || shape.idManual) return;
    const parent = shape.parentId ? shapeById(shape.parentId) : null;
    const desired = deriveShapeId(shape.text, parent ? parent.text : "");
    const next = uniqueShapeId(desired, shape.id);
    const previousId = shape.id;
    renameShapeId(shape.id, next);
    if (oldParentId && oldParentId !== shape.parentId) {
      state.model.shapes.forEach((s) => {
        if (s.parentId === previousId) s.parentId = next;
      });
    }
  }

  function snapshotModel() {
    return JSON.stringify(state.model);
  }

  function restoreSnapshot(snapshot) {
    state.model = JSON.parse(snapshot);
    ensureModelDefaults();
  }

  function pushHistory() {
    state.history.push(snapshotModel());
    if (state.history.length > HISTORY_LIMIT) state.history.shift();
    state.future = [];
  }

  function undo() {
    if (!state.history.length) {
      setStatus("Nothing to undo.");
      return;
    }
    state.future.push(snapshotModel());
    const prev = state.history.pop();
    restoreSnapshot(prev);
    state.selected = null;
    state.connectSourceId = null;
    render();
    setStatus("Undo applied.", "ok");
  }

  function copySelectedShapeBundle() {
    if (!state.selected || state.selected.type !== "shape") {
      setStatus("Select a shape/container to copy.", "error");
      return;
    }
    const root = shapeById(state.selected.id);
    if (!root) return;
    const ids = [root.id].concat(descendantsOf(root.id));
    const idSet = new Set(ids);
    const bundle = state.model.shapes
      .filter((shape) => idSet.has(shape.id))
      .map((shape) => deepClone(shape));
    state.clipboard = {
      type: "shapeBundle",
      rootId: root.id,
      shapes: bundle,
      pasteCount: 0,
    };
    setStatus("Copied " + bundle.length + " shape(s).", "ok");
  }

  function pasteClipboard() {
    if (!state.clipboard || state.clipboard.type !== "shapeBundle") {
      setStatus("Clipboard is empty.", "error");
      return;
    }
    pushHistory();

    const bundle = deepClone(state.clipboard.shapes || []);
    if (!bundle.length) return;

    const offset = 24 + state.clipboard.pasteCount * 18;
    const idMap = {};

    bundle.sort((a, b) => (a.z || 0) - (b.z || 0));

    bundle.forEach((oldShape) => {
      const base = sanitizeId(oldShape.id || deriveShapeId(oldShape.text, ""));
      idMap[oldShape.id] = uniqueShapeId(base, null);
    });

    bundle.forEach((oldShape) => {
      const copied = deepClone(oldShape);
      copied.id = idMap[oldShape.id];
      copied.idManual = true;
      copied.x = Number(copied.x || 0) + offset;
      copied.y = Number(copied.y || 0) + offset;
      copied.parentId = copied.parentId && idMap[copied.parentId] ? idMap[copied.parentId] : null;
      copied.z = (state.model.shapes.length ? Math.max.apply(null, state.model.shapes.map((s) => s.z || 0)) : 0) + 1;
      state.model.shapes.push(copied);
    });

    state.clipboard.pasteCount += 1;
    const rootNewId = idMap[state.clipboard.rootId];
    if (rootNewId) state.selected = { type: "shape", id: rootNewId };
    ensureModelDefaults();
    render();
    setStatus("Pasted " + bundle.length + " shape(s).", "ok");
  }

  function createSvg(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== "") {
          el.setAttribute(k, String(attrs[k]));
        }
      });
    }
    return el;
  }

  function createHtml(tag, attrs) {
    const el = document.createElementNS(HTML_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== "") {
          el.setAttribute(k, String(attrs[k]));
        }
      });
    }
    return el;
  }

  function canvasFitScale() {
    const vb = state.model.metadata.viewBox || { width: 1980, height: 1200 };
    const minW = Math.max(320, (els.canvasScroll.clientWidth || 0) - 8);
    const minH = Math.max(260, (els.canvasScroll.clientHeight || 0) - 8);
    return Math.max(minW / vb.width, minH / vb.height);
  }

  function effectiveCanvasScale(requestedZoom) {
    const fitScale = canvasFitScale();
    const zoom = clamp(Number(requestedZoom) || 1, state.view.minZoom, state.view.maxZoom);
    return fitScale * zoom;
  }

  function applyViewBox() {
    const vb = state.model.metadata.viewBox || { width: 1980, height: 1200 };
    const zoom = state.view.zoom || 1;
    const scale = effectiveCanvasScale(zoom);
    const widthPx = Math.round(vb.width * scale);
    const heightPx = Math.round(vb.height * scale);
    els.svg.setAttribute("viewBox", "0 0 " + vb.width + " " + vb.height);
    els.svg.setAttribute("width", String(widthPx));
    els.svg.setAttribute("height", String(heightPx));
    if (els.zoomLabel) {
      els.zoomLabel.textContent = Math.round(zoom * 100) + "%";
    }
  }

  function setZoom(nextZoom) {
    const prev = state.view.zoom;
    const next = clamp(nextZoom, state.view.minZoom, state.view.maxZoom);
    if (Math.abs(next - prev) < 0.0001) return;

    const scroll = els.canvasScroll;
    const cx = scroll.scrollLeft + scroll.clientWidth / 2;
    const cy = scroll.scrollTop + scroll.clientHeight / 2;
    const prevScale = effectiveCanvasScale(prev);
    const nextScale = effectiveCanvasScale(next);
    const ratio = nextScale / prevScale;

    state.view.zoom = next;
    render();

    scroll.scrollLeft = Math.max(0, cx * ratio - scroll.clientWidth / 2);
    scroll.scrollTop = Math.max(0, cy * ratio - scroll.clientHeight / 2);
  }

  function resetView() {
    state.view.zoom = 1;
    render();
    els.canvasScroll.scrollLeft = 0;
    els.canvasScroll.scrollTop = 0;
  }

  function ensureDefs() {
    const defs = createSvg("defs");

    const arrowHead = createSvg("marker", {
      id: "editor-arrow-head",
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: "auto-start-reverse",
    });
    arrowHead.appendChild(createSvg("path", {
      d: "M 0 0 L 10 5 L 0 10 z",
      fill: "context-stroke",
      stroke: "context-stroke",
    }));
    defs.appendChild(arrowHead);

    els.svg.appendChild(defs);
  }

  function textAnchorForAlign(align) {
    if (align === "left") return "start";
    if (align === "right") return "end";
    return "middle";
  }

  function textXForAlign(shape, align, pad) {
    if (align === "left") return shape.x + pad;
    if (align === "right") return shape.x + shape.width - pad;
    return shape.x + shape.width / 2;
  }

  function plainTextToRichHtml(text) {
    return escapeHtml(String(text || "")).replace(/\r?\n/g, "<br>");
  }

  function richHtmlToPlainText(html) {
    const el = document.createElement("div");
    el.innerHTML = String(html || "");
    return String(el.innerText || el.textContent || "")
      .replace(/\u200b/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\r/g, "");
  }

  function sanitizeInlineStyle(styleText) {
    const allowed = new Set(["color", "text-decoration"]);
    const out = [];
    String(styleText || "").split(";").forEach((entry) => {
      const parts = entry.split(":");
      if (parts.length < 2) return;
      const key = String(parts[0] || "").trim().toLowerCase();
      const value = String(parts.slice(1).join(":") || "").trim();
      if (!allowed.has(key) || !value) return;
      out.push(key + ":" + value);
    });
    return out.join("; ");
  }

  function sanitizeRichHtml(html, fallbackText) {
    const root = document.createElement("div");
    root.innerHTML = String(html || "");

    function serialize(node) {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return escapeHtml(String(node.textContent || "").replace(/\u200b/g, ""));
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = String(node.tagName || "").toLowerCase();
      const children = Array.from(node.childNodes || []).map(serialize).join("");
      if (tag === "br") return "<br>";
      if (tag === "b" || tag === "strong" || tag === "i" || tag === "em" || tag === "u" || tag === "sub" || tag === "sup") {
        return "<" + tag + ">" + children + "</" + tag + ">";
      }
      if (tag === "span") {
        const style = sanitizeInlineStyle(node.getAttribute("style"));
        return style ? '<span style="' + escapeHtml(style) + '">' + children + "</span>" : children;
      }
      if (tag === "div" || tag === "p") {
        const style = sanitizeInlineStyle(node.getAttribute("style"));
        return style
          ? '<div style="' + escapeHtml(style) + '">' + children + "</div>"
          : "<div>" + children + "</div>";
      }
      return children;
    }

    const sanitized = Array.from(root.childNodes || []).map(serialize).join("").trim();
    return sanitized || plainTextToRichHtml(fallbackText || "");
  }

  function richTextJustifyContent(vAlign) {
    if (vAlign === "top") return "flex-start";
    if (vAlign === "bottom") return "flex-end";
    return "center";
  }

  function shapeTextBox(shape) {
    if (shape.kind === "header_container") {
      const headerH = Math.max(18, Math.min(36, Math.round(shape.height * 0.22)));
      return { x: shape.x + 8, y: shape.y + 2, width: Math.max(24, shape.width - 16), height: Math.max(14, headerH - 4) };
    }
    if (shape.kind === "component_group") {
      return { x: shape.x + 8, y: shape.y + 2, width: Math.max(24, shape.width - 16), height: 14 };
    }
    if (shape.kind === "circle" || shape.kind === "oval") {
      return { x: shape.x + 12, y: shape.y + 10, width: Math.max(20, shape.width - 24), height: Math.max(20, shape.height - 20) };
    }
    if (shape.kind === "triangle") {
      return { x: shape.x + 12, y: shape.y + 14, width: Math.max(20, shape.width - 24), height: Math.max(20, shape.height - 24) };
    }
    return { x: shape.x + 10, y: shape.y + 8, width: Math.max(20, shape.width - 20), height: Math.max(20, shape.height - 16) };
  }

  function renderRichTextBlock(group, shape, box) {
    const html = sanitizeRichHtml(shape.richText, shape.text);
    const foreign = createSvg("foreignObject", {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      style: "pointer-events:none;overflow:visible",
    });
    const wrapper = createHtml("div", {
      xmlns: HTML_NS,
      style: [
        "width:100%",
        "height:100%",
        "display:flex",
        "align-items:" + richTextJustifyContent(normalizeTextVAlign(shape.textVAlign || "center")),
        "justify-content:stretch",
        "overflow:hidden",
        "color:" + normalizeColor(shape.textColor, "#f4f7ff"),
        "font-size:" + normalizeFontSize(shape.fontSize, 12) + "px",
        "font-family:" + normalizeFontFamily(shape.fontFamily),
        "text-align:" + normalizeTextAlign(shape.textAlign || "center"),
        "line-height:1.18",
        "white-space:pre-wrap",
        "overflow-wrap:anywhere",
        "word-break:break-word",
      ].join(";"),
    });
    const inner = createHtml("div", {
      style: "width:100%;max-height:100%;overflow:hidden",
    });
    inner.innerHTML = html;
    wrapper.appendChild(inner);
    foreign.appendChild(wrapper);
    group.appendChild(foreign);
    return foreign;
  }

  function renderMultilineText(group, cfg) {
    const text = String(cfg.text || "");
    const lines = text.split(/\r?\n/);
    const fontSize = normalizeFontSize(cfg.fontSize, 12);
    const lineGap = fontSize * 1.18;
    const startY = cfg.y - ((lines.length - 1) * lineGap) / 2;
    const t = createSvg("text", {
      x: cfg.x,
      y: startY,
      fill: cfg.fill || "#f4f7ff",
      "font-size": fontSize,
      "font-family": normalizeFontFamily(cfg.fontFamily),
      "text-anchor": cfg.textAnchor || "middle",
      "dominant-baseline": "middle",
      "pointer-events": "none",
    });
    lines.forEach((line, idx) => {
      const span = createSvg("tspan", {
        x: cfg.x,
        y: startY + idx * lineGap,
      });
      span.textContent = line.length ? line : " ";
      t.appendChild(span);
    });
    group.appendChild(t);
    return t;
  }

  function renderShapeVisual(group, shape, strokeColor, strokeWidth) {
    const dash = shape.borderStyle === "dashed" ? "7 4" : "";
    const separatorWidth = Math.max(1, strokeWidth * 0.62);
    const minorSeparatorWidth = Math.max(1, strokeWidth * 0.56);
    const commonStroke = {
      fill: shape.fill,
      stroke: strokeColor,
      "stroke-width": strokeWidth,
      "stroke-dasharray": dash,
    };

    if (shape.kind === "triangle") {
      const points = [
        (shape.x + shape.width / 2) + "," + shape.y,
        (shape.x + shape.width) + "," + (shape.y + shape.height),
        shape.x + "," + (shape.y + shape.height),
      ].join(" ");
      group.appendChild(createSvg("polygon", Object.assign({ points: points }, commonStroke)));
    } else if (shape.kind === "circle" || shape.kind === "oval") {
      group.appendChild(createSvg("ellipse", Object.assign({
        cx: shape.x + shape.width / 2,
        cy: shape.y + shape.height / 2,
        rx: shape.width / 2,
        ry: shape.height / 2,
      }, commonStroke)));
    } else if (shape.kind === "header_container") {
      const headerH = Math.max(18, Math.min(36, Math.round(shape.height * 0.22)));
      group.appendChild(createSvg("rect", Object.assign({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: shape.rounded === false ? 0 : 7,
        ry: shape.rounded === false ? 0 : 7,
      }, commonStroke)));
      group.appendChild(createSvg("rect", {
        x: shape.x + 1,
        y: shape.y + 1,
        width: Math.max(1, shape.width - 2),
        height: Math.max(1, headerH - 1),
        fill: darken(shape.fill, -16),
        stroke: "none",
        rx: shape.rounded === false ? 0 : 6,
        ry: shape.rounded === false ? 0 : 6,
      }));
      group.appendChild(createSvg("line", {
        x1: shape.x,
        y1: shape.y + headerH,
        x2: shape.x + shape.width,
        y2: shape.y + headerH,
        stroke: strokeColor,
        "stroke-width": separatorWidth,
        "stroke-dasharray": dash,
      }));
    } else if (shape.kind === "component_group") {
      const headerH = 18;
      const componentCount = Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)));
      const componentDirection = normalizeComponentDirection(shape.componentDirection);
      const labels = normalizeComponentLabels(shape.componentLabels, componentCount);
      group.appendChild(createSvg("rect", {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fill: "none",
        stroke: strokeColor,
        "stroke-width": strokeWidth,
        "stroke-dasharray": dash,
        rx: shape.rounded === false ? 0 : 6,
        ry: shape.rounded === false ? 0 : 6,
      }));
      group.appendChild(createSvg("rect", {
        x: shape.x + 1,
        y: shape.y + 1,
        width: Math.max(1, shape.width - 2),
        height: headerH,
        fill: darken(shape.fill, -14),
        stroke: "none",
        rx: shape.rounded === false ? 0 : 5,
        ry: shape.rounded === false ? 0 : 5,
      }));
      group.appendChild(createSvg("rect", {
        x: shape.x + 1,
        y: shape.y + headerH + 1,
        width: Math.max(1, shape.width - 2),
        height: Math.max(1, shape.height - headerH - 2),
        fill: shape.fill,
        stroke: "none",
      }));
      group.appendChild(createSvg("line", {
        x1: shape.x + 1,
        y1: shape.y + headerH + 1,
        x2: shape.x + shape.width - 1,
        y2: shape.y + headerH + 1,
        stroke: strokeColor,
        "stroke-width": separatorWidth,
        "stroke-dasharray": dash,
      }));

      const bodyY = shape.y + headerH + 2;
      const bodyH = shape.height - headerH - 4;
      if (componentDirection === "horizontal") {
        const innerW = shape.width - 16;
        const cellW = innerW / componentCount;
        for (let idx = 0; idx < componentCount; idx += 1) {
          const x0 = shape.x + 8 + idx * cellW;
          const x1 = idx === componentCount - 1 ? (shape.x + shape.width - 8) : (x0 + cellW);
          if (idx > 0) {
            group.appendChild(createSvg("line", {
              x1: x0,
              y1: bodyY + 2,
              x2: x0,
              y2: bodyY + bodyH - 2,
              stroke: strokeColor,
              "stroke-width": minorSeparatorWidth,
              "stroke-dasharray": dash,
            }));
          }
          renderMultilineText(group, {
            x: (x0 + x1) / 2,
            y: bodyY + bodyH / 2 + 1,
            text: labels[idx],
            fontSize: Math.max(9, normalizeFontSize(shape.fontSize, 12) - 1),
            fontFamily: shape.fontFamily,
            fill: shape.textColor || "#f4f7ff",
            textAnchor: "middle",
          });
        }
      } else {
        const innerH = bodyH - 4;
        const cellH = innerH / componentCount;
        for (let idx = 0; idx < componentCount; idx += 1) {
          const y0 = bodyY + 2 + idx * cellH;
          const y1 = idx === componentCount - 1 ? (bodyY + bodyH - 2) : (y0 + cellH);
          if (idx > 0) {
            group.appendChild(createSvg("line", {
              x1: shape.x + 8,
              y1: y0,
              x2: shape.x + shape.width - 8,
              y2: y0,
              stroke: strokeColor,
              "stroke-width": minorSeparatorWidth,
              "stroke-dasharray": dash,
            }));
          }
          renderMultilineText(group, {
            x: shape.x + shape.width / 2,
            y: (y0 + y1) / 2,
            text: labels[idx],
            fontSize: Math.max(9, normalizeFontSize(shape.fontSize, 12) - 1),
            fontFamily: shape.fontFamily,
            fill: shape.textColor || "#f4f7ff",
            textAnchor: "middle",
          });
        }
      }
    } else {
      group.appendChild(createSvg("rect", Object.assign({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: shape.rounded === false ? 0 : 7,
        ry: shape.rounded === false ? 0 : 7,
      }, commonStroke)));
    }

    renderRichTextBlock(group, shape, shapeTextBox(shape));
  }

  function renderShape(shapeLayer, shape) {
    const isSelected = state.selected && state.selected.type === "shape" && state.selected.id === shape.id;
    const isConnectSource = state.connectSourceId === shape.id;
    const baseStrokeWidth = normalizeBorderWidth(shape.borderWidth, defaultBorderWidth(shape.kind));
    const stroke = isConnectSource ? "#43d17e" : (isSelected ? "#ffd76b" : shape.stroke);
    const strokeWidth = isSelected || isConnectSource
      ? Math.max(2.6, baseStrokeWidth + 1)
      : baseStrokeWidth;

    const group = createSvg("g", {
      "data-shape-id": shape.id,
      style: "cursor:" + (state.mode === "select" ? "move" : "crosshair"),
    });
    renderShapeVisual(group, shape, stroke, strokeWidth);
    group.addEventListener("pointerdown", (evt) => onShapePointerDown(evt, shape.id));
    shapeLayer.appendChild(group);
  }

  function getAnchorStops() {
    return state.model.anchors.stops && state.model.anchors.stops.length
      ? state.model.anchors.stops
      : DEFAULT_ANCHOR_STOPS;
  }

  function getAnchorPoint(endpoint) {
    const shape = shapeById(endpoint.shapeId);
    if (!shape) return { x: 0, y: 0 };
    const idx = normalizeAnchorIndex(endpoint.anchorIndex, anchorCount() - 1, 0);
    const frac = anchorFractionForIndex(idx);
    const side = normalizeSide(endpoint.side);
    const x0 = shape.x;
    const y0 = shape.y;
    const w = shape.width;
    const h = shape.height;
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;

    if (shape.kind === "circle" || shape.kind === "oval") {
      const rx = Math.max(0.01, w / 2);
      const ry = Math.max(0.01, h / 2);
      if (side === "left" || side === "right") {
        const y = y0 + h * frac;
        const ny = (y - cy) / ry;
        const k = Math.sqrt(Math.max(0, 1 - ny * ny));
        const x = cx + (side === "left" ? -rx : rx) * k;
        return { x: x, y: y };
      }
      const x = x0 + w * frac;
      const nx = (x - cx) / rx;
      const k = Math.sqrt(Math.max(0, 1 - nx * nx));
      const y = cy + (side === "top" ? -ry : ry) * k;
      return { x: x, y: y };
    }

    if (shape.kind === "triangle") {
      const top = { x: cx, y: y0 };
      const bl = { x: x0, y: y0 + h };
      const br = { x: x0 + w, y: y0 + h };
      if (side === "left") {
        return {
          x: top.x + (bl.x - top.x) * frac,
          y: top.y + (bl.y - top.y) * frac,
        };
      }
      if (side === "right") {
        return {
          x: top.x + (br.x - top.x) * frac,
          y: top.y + (br.y - top.y) * frac,
        };
      }
      if (side === "bottom") return { x: x0 + w * frac, y: y0 + h };
      if (frac <= 0.5) {
        const u = frac / 0.5;
        return {
          x: bl.x + (top.x - bl.x) * u,
          y: bl.y + (top.y - bl.y) * u,
        };
      }
      const u = (frac - 0.5) / 0.5;
      return {
        x: top.x + (br.x - top.x) * u,
        y: top.y + (br.y - top.y) * u,
      };
    }

    if (side === "left") return { x: x0, y: y0 + h * frac };
    if (side === "right") return { x: x0 + w, y: y0 + h * frac };
    if (side === "top") return { x: x0 + w * frac, y: y0 };
    return { x: x0 + w * frac, y: y0 + h };
  }

  function getAllAnchors() {
    const count = anchorCount();
    const anchors = [];

    state.model.shapes.forEach((shape) => {
      for (let i = 0; i < count; i += 1) {
        const frac = anchorFractionForIndex(i);
        const left = getAnchorPoint({ shapeId: shape.id, side: "left", anchorIndex: i });
        const right = getAnchorPoint({ shapeId: shape.id, side: "right", anchorIndex: i });
        const top = getAnchorPoint({ shapeId: shape.id, side: "top", anchorIndex: i });
        const bottom = getAnchorPoint({ shapeId: shape.id, side: "bottom", anchorIndex: i });
        anchors.push({ shapeId: shape.id, side: "left", anchorIndex: i, x: left.x, y: left.y, frac: frac });
        anchors.push({ shapeId: shape.id, side: "right", anchorIndex: i, x: right.x, y: right.y, frac: frac });
        anchors.push({ shapeId: shape.id, side: "top", anchorIndex: i, x: top.x, y: top.y, frac: frac });
        anchors.push({ shapeId: shape.id, side: "bottom", anchorIndex: i, x: bottom.x, y: bottom.y, frac: frac });
      }
    });

    return anchors;
  }

  function pointRectDistance2(point, shape) {
    const dx = Math.max(shape.x - point.x, 0, point.x - (shape.x + shape.width));
    const dy = Math.max(shape.y - point.y, 0, point.y - (shape.y + shape.height));
    return dx * dx + dy * dy;
  }

  function distance2(a, b) {
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    return dx * dx + dy * dy;
  }

  function projectPointToSegment(point, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const denom = abx * abx + aby * aby;
    if (denom <= 0.000001) {
      return { x: a.x, y: a.y, t: 0, d2: distance2(point, a) };
    }
    const t = clamp(((point.x - a.x) * abx + (point.y - a.y) * aby) / denom, 0, 1);
    const projected = { x: a.x + abx * t, y: a.y + aby * t };
    return { x: projected.x, y: projected.y, t: t, d2: distance2(point, projected) };
  }

  function buildAnchorCandidate(shape, side, frac, point) {
    const anchorIndex = anchorIndexForFraction(frac);
    const anchor = getAnchorPoint({ shapeId: shape.id, side: side, anchorIndex: anchorIndex });
    return {
      shapeId: shape.id,
      side: side,
      anchorIndex: anchorIndex,
      x: anchor.x,
      y: anchor.y,
      d2: distance2(point, anchor),
    };
  }

  function nearestAnchorForShape(shape, point) {
    if (!shape) return null;
    const x0 = shape.x;
    const y0 = shape.y;
    const x1 = shape.x + shape.width;
    const y1 = shape.y + shape.height;
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const candidates = [];

    if (shape.kind === "triangle") {
      const top = { x: cx, y: y0 };
      const bl = { x: x0, y: y1 };
      const br = { x: x1, y: y1 };
      const leftProj = projectPointToSegment(point, top, bl);
      const rightProj = projectPointToSegment(point, top, br);
      const bottomFrac = shape.width <= 0 ? 0.5 : clamp((point.x - x0) / shape.width, 0, 1);
      const topLeftProj = projectPointToSegment(point, bl, top);
      const topRightProj = projectPointToSegment(point, top, br);

      candidates.push(buildAnchorCandidate(shape, "left", leftProj.t, point));
      candidates.push(buildAnchorCandidate(shape, "right", rightProj.t, point));
      candidates.push(buildAnchorCandidate(shape, "bottom", bottomFrac, point));
      candidates.push(buildAnchorCandidate(
        shape,
        "top",
        point.x <= cx ? (0.5 * topLeftProj.t) : (0.5 + 0.5 * topRightProj.t),
        point
      ));
    } else if (shape.kind === "circle" || shape.kind === "oval") {
      const h = Math.max(0.01, shape.height);
      const w = Math.max(0.01, shape.width);
      candidates.push(buildAnchorCandidate(shape, "left", clamp((point.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "right", clamp((point.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "top", clamp((point.x - x0) / w, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "bottom", clamp((point.x - x0) / w, 0, 1), point));
    } else {
      const h = Math.max(0.01, shape.height);
      const w = Math.max(0.01, shape.width);
      candidates.push(buildAnchorCandidate(shape, "left", clamp((point.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "right", clamp((point.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "top", clamp((point.x - x0) / w, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "bottom", clamp((point.x - x0) / w, 0, 1), point));
    }

    let best = null;
    candidates.forEach((candidate) => {
      if (!best || candidate.d2 < best.d2) best = candidate;
    });
    return best;
  }

  function nearestAnchor(point, preferredShapeId) {
    const preferredShape = preferredShapeId ? shapeById(preferredShapeId) : null;
    let best = null;

    state.model.shapes.forEach((shape) => {
      const candidate = nearestAnchorForShape(shape, point);
      if (!candidate) return;
      let score = candidate.d2;
      if (preferredShape && preferredShape.id === shape.id) score -= 64;
      if (!best || score < best.score) {
        best = Object.assign({ score: score }, candidate);
      }
    });

    if (!best) return null;
    if (best.score > (220 * 220) && preferredShape) {
      return nearestAnchorForShape(preferredShape, point);
    }
    return {
      shapeId: best.shapeId,
      side: best.side,
      anchorIndex: best.anchorIndex,
      x: best.x,
      y: best.y,
    };
  }

  function defaultCurveControl(from, to, side) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const span = Math.max(28, Math.sqrt(dx * dx + dy * dy) * 0.28);
    if (side === "left") return { x: from.x - span, y: from.y };
    if (side === "right") return { x: from.x + span, y: from.y };
    if (side === "top") return { x: from.x, y: from.y - span };
    return { x: from.x, y: from.y + span };
  }

  function orthSegment(a, b, horizontalFirst) {
    if (Math.abs(a.x - b.x) < 0.01 || Math.abs(a.y - b.y) < 0.01) return [a, b];
    if (horizontalFirst) return [a, { x: b.x, y: a.y }, b];
    return [a, { x: a.x, y: b.y }, b];
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

  function polylinePath(points) {
    if (!points.length) return "";
    const d = ["M " + points[0].x + " " + points[0].y];
    for (let i = 1; i < points.length; i += 1) {
      d.push("L " + points[i].x + " " + points[i].y);
    }
    return d.join(" ");
  }

  function buildArrowGeometry(arrow) {
    const from = getAnchorPoint(arrow.from);
    const to = getAnchorPoint(arrow.to);
    const routing = normalizeRouting(arrow.routing);
    const geom = {
      from: from,
      to: to,
      routing: routing,
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
        cp1 = defaultCurveControl(from, to, arrow.from.side);
        cp2 = defaultCurveControl(to, from, arrow.to.side);
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

    waypoints.concat([to]).forEach((target, idx, arr) => {
      if (idx === arr.length - 1) {
        horizontalFirst = !(arrow.to.side === "left" || arrow.to.side === "right");
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

  function renderArrow(arrowLayer, arrow) {
    const geom = buildArrowGeometry(arrow);
    state.arrowRenderCache[arrow.id] = geom;

    const isSelected = state.selected && state.selected.type === "arrow" && state.selected.id === arrow.id;
    const stroke = isSelected ? "#ffd76b" : arrow.stroke;
    const width = isSelected ? (arrow.width + 1.2) : arrow.width;

    const attrs = {
      d: geom.path,
      fill: "none",
      stroke: stroke,
      "stroke-width": width,
      "stroke-dasharray": arrow.lineStyle === "dashed" ? "6 4" : "",
      style: "cursor:pointer",
      "data-arrow-id": arrow.id,
    };

    const connType = normalizeConnectionType(arrow.connectionType);
    if (connType === "arrow") {
      attrs["marker-end"] = "url(#editor-arrow-head)";
    } else if (connType === "bi") {
      attrs["marker-start"] = "url(#editor-arrow-head)";
      attrs["marker-end"] = "url(#editor-arrow-head)";
    }

    const path = createSvg("path", attrs);
    path.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
      setSelected({ type: "arrow", id: arrow.id });
    });
    arrowLayer.appendChild(path);
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

      [
        { key: "from", p: geom.from, fill: "#8fe6ff" },
        { key: "to", p: geom.to, fill: "#ffcf8f" },
      ].forEach((ep) => {
        const c = createSvg("circle", {
          cx: ep.p.x,
          cy: ep.p.y,
          r: 5.2,
          fill: ep.fill,
          stroke: "#1a2235",
          "stroke-width": 1,
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

  function render(skipInspector) {
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

    const shapeLayer = createSvg("g");
    const arrowLayer = createSvg("g");
    const overlayLayer = createSvg("g");

    els.svg.appendChild(shapeLayer);
    els.svg.appendChild(arrowLayer);
    els.svg.appendChild(overlayLayer);

    sortedShapes().forEach((shape) => renderShape(shapeLayer, shape));
    sortedArrows().forEach((arrow) => renderArrow(arrowLayer, arrow));

    renderSelectionOverlay(overlayLayer);
    updateToolButtonStates();
    if (!skipInspector) {
      renderInspector();
    }
  }

  function updateToolButtonStates() {
    els.toolSelectBtn.classList.toggle("active", state.mode === "select");
    els.toolConnectArrowBtn.classList.toggle("active", state.mode === "connect_arrow");
    els.toolConnectBiBtn.classList.toggle("active", state.mode === "connect_bi");
    els.toolConnectLineBtn.classList.toggle("active", state.mode === "connect_line");
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

  function currentViewportCenter() {
    const rect = els.canvasScroll.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return clientToSvg({
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
    }
    const vb = state.model.metadata.viewBox || { width: 1980, height: 1200 };
    return { x: vb.width / 2, y: vb.height / 2 };
  }

  function onBackgroundPointerDown(evt) {
    if (evt.button !== 0) return;
    state.selected = null;
    state.connectSourceId = null;
    state.drag = {
      type: "pan-canvas",
      startClientX: evt.clientX,
      startClientY: evt.clientY,
      startScrollLeft: els.canvasScroll.scrollLeft,
      startScrollTop: els.canvasScroll.scrollTop,
    };
    els.canvasScroll.classList.add("panning");
    render();
  }

  function onShapePointerDown(evt, shapeId) {
    evt.stopPropagation();
    if (evt.button !== 0) return;
    const shape = shapeById(shapeId);
    if (!shape) return;

    if (state.mode !== "select") {
      if (!state.connectSourceId) {
        state.connectSourceId = shapeId;
        setStatus("Connection mode: source selected " + shapeId + ". Click target shape.", "ok");
        render();
        return;
      }
      if (state.connectSourceId === shapeId) {
        state.connectSourceId = null;
        setStatus("Connection source deselected.");
        render();
        return;
      }
      createArrow(state.connectSourceId, shapeId, CONNECT_MODES[state.mode] || "arrow");
      state.connectSourceId = null;
      return;
    }

    setSelected({ type: "shape", id: shapeId });
    pushHistory();

    const start = clientToSvg(evt);
    const moveIds = [shapeId];
    if (isContainerKind(shape.kind)) {
      moveIds.push.apply(moveIds, descendantsOf(shapeId));
    }
    const before = {};
    moveIds.forEach((id) => {
      const s = shapeById(id);
      before[id] = { x: s.x, y: s.y };
    });

    state.drag = {
      type: "move-shapes",
      shapeId: shapeId,
      movedShapeIds: moveIds,
      before: before,
      start: start,
    };
  }

  function startShapeResize(evt, shapeId, corner) {
    const shape = shapeById(shapeId);
    if (!shape) return;
    pushHistory();
    const start = clientToSvg(evt);
    state.drag = {
      type: "resize-shape",
      shapeId: shapeId,
      corner: corner,
      start: start,
      before: {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      },
    };
  }

  function startArrowEndpointDrag(evt, arrowId, endpointKey) {
    pushHistory();
    state.drag = {
      type: "arrow-endpoint",
      arrowId: arrowId,
      endpointKey: endpointKey,
    };
  }

  function startArrowWaypointDrag(evt, arrowId, waypointIndex) {
    pushHistory();
    state.drag = {
      type: "arrow-waypoint",
      arrowId: arrowId,
      waypointIndex: waypointIndex,
    };
  }

  function startArrowControlPointDrag(evt, arrowId, cpIndex) {
    pushHistory();
    state.drag = {
      type: "arrow-control",
      arrowId: arrowId,
      cpIndex: cpIndex,
    };
  }

  function pickContainerForShape(shape) {
    if (!shape) return null;
    const center = shapeCenter(shape);
    const candidates = state.model.shapes.filter((s) => {
      if (!isContainerKind(s.kind)) return false;
      if (s.id === shape.id) return false;
      if (isDescendant(s.id, shape.id)) return false;
      return center.x >= s.x && center.x <= s.x + s.width && center.y >= s.y && center.y <= s.y + s.height;
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      if (areaA !== areaB) return areaA - areaB;
      return (b.z || 0) - (a.z || 0);
    });
    return candidates[0];
  }

  function handlePointerMove(evt) {
    if (!state.drag) return;

    if (state.drag.type === "pan-canvas") {
      const dx = evt.clientX - state.drag.startClientX;
      const dy = evt.clientY - state.drag.startClientY;
      els.canvasScroll.scrollLeft = state.drag.startScrollLeft - dx;
      els.canvasScroll.scrollTop = state.drag.startScrollTop - dy;
      return;
    }

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

      if (shape.kind === "square" || shape.kind === "circle") {
        const side = Math.max(w, h);
        if (state.drag.corner.indexOf("w") >= 0) x = b.x + b.width - side;
        if (state.drag.corner.indexOf("n") >= 0) y = b.y + b.height - side;
        w = side;
        h = side;
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
      const currentEndpoint = arrow[state.drag.endpointKey] || {};
      const anchor = nearestAnchor(point, currentEndpoint.shapeId || "");
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
      if (!arrow || !arrow.waypoints[state.drag.waypointIndex]) return;
      arrow.waypoints[state.drag.waypointIndex] = { x: point.x, y: point.y };
      render();
      return;
    }

    if (state.drag.type === "arrow-control") {
      const arrow = arrowById(state.drag.arrowId);
      if (!arrow) return;
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
      if (moved) {
        const prevParent = moved.parentId;
        const parent = pickContainerForShape(moved);
        moved.parentId = parent ? parent.id : null;
        if (moved.parentId !== prevParent) {
          updateAutoId(moved, prevParent);
        }
      }
      render();
    }

    if (state.drag.type === "pan-canvas") {
      els.canvasScroll.classList.remove("panning");
    }

    state.drag = null;
  }

  function chooseEndpointForNewArrow(fromShape, toShape, isFromEndpoint) {
    const c1 = shapeCenter(fromShape);
    const c2 = shapeCenter(toShape);
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    let side;
    if (Math.abs(dx) >= Math.abs(dy)) {
      side = dx >= 0
        ? (isFromEndpoint ? "right" : "left")
        : (isFromEndpoint ? "left" : "right");
    } else {
      side = dy >= 0
        ? (isFromEndpoint ? "bottom" : "top")
        : (isFromEndpoint ? "top" : "bottom");
    }
    const anchorIndex = Math.floor((anchorCount() - 1) / 2);
    return {
      shapeId: isFromEndpoint ? fromShape.id : toShape.id,
      side: side,
      anchorIndex: anchorIndex,
    };
  }

  function createArrow(fromShapeId, toShapeId, connectionType) {
    const fromShape = shapeById(fromShapeId);
    const toShape = shapeById(toShapeId);
    if (!fromShape || !toShape) return;

    pushHistory();

    const id = uniqueArrowId("arrow_" + (state.model.arrows.length + 1), null);
    const arrow = {
      id: id,
      from: chooseEndpointForNewArrow(fromShape, toShape, true),
      to: chooseEndpointForNewArrow(fromShape, toShape, false),
      lineStyle: "solid",
      routing: "angled",
      connectionType: normalizeConnectionType(connectionType),
      stroke: "#e8efff",
      width: 1.7,
      waypoints: [],
      controlPoints: [],
    };
    state.model.arrows.push(arrow);
    setSelected({ type: "arrow", id: id });
    setStatus("Created " + arrow.connectionType + " connector " + id + ".", "ok");
  }

  function addShape(kind) {
    const normalizedKind = normalizeShapeKind(kind);
    if (!SHAPE_KINDS.has(normalizedKind)) return;
    pushHistory();

    const vb = state.model.metadata.viewBox || { width: 1980, height: 1200 };
    const size = defaultShapeSize(normalizedKind);
    const center = currentViewportCenter();
    const x = clamp(center.x - size.width / 2, 0, Math.max(0, vb.width - size.width));
    const y = clamp(center.y - size.height / 2, 0, Math.max(0, vb.height - size.height));
    const text = defaultShapeText(normalizedKind);
    const id = uniqueShapeId(deriveShapeId(text, ""), null);

    const isContainer = usesContainerPalette(normalizedKind);
    const componentCount = normalizedKind === "component_group" ? 4 : 1;
    const shape = {
      id: id,
      idManual: false,
      kind: normalizedKind,
      text: text,
      richText: plainTextToRichHtml(text),
      x: x,
      y: y,
      width: size.width,
      height: size.height,
      fill: isContainer ? "#0d172a" : "#1c2f4f",
      stroke: isContainer ? "#eef3ff" : "#80b6ff",
      borderStyle: "solid",
      borderWidth: defaultBorderWidth(normalizedKind),
      textColor: "#f4f7ff",
      rounded: true,
      textAlign: "center",
      textVAlign: "center",
      fontSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      componentDirection: "horizontal",
      componentCount: componentCount,
      componentLabels: normalizeComponentLabels([], componentCount),
      z: (state.model.shapes.length ? Math.max.apply(null, state.model.shapes.map((s) => s.z || 0)) : 0) + 1,
      parentId: null,
    };

    state.model.shapes.push(shape);
    setSelected({ type: "shape", id: shape.id });
  }

  function deleteSelected() {
    if (!state.selected) return;
    pushHistory();

    if (state.selected.type === "shape") {
      const shape = shapeById(state.selected.id);
      if (!shape) return;
      const ids = [shape.id].concat(descendantsOf(shape.id));
      const idSet = new Set(ids);
      state.model.shapes = state.model.shapes.filter((s) => !idSet.has(s.id));
      state.model.arrows = state.model.arrows.filter((a) => !idSet.has(a.from.shapeId) && !idSet.has(a.to.shapeId));
      state.selected = null;
      state.connectSourceId = null;
      render();
      return;
    }

    if (state.selected.type === "arrow") {
      state.model.arrows = state.model.arrows.filter((a) => a.id !== state.selected.id);
      state.selected = null;
      render();
    }
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === "select") state.connectSourceId = null;
    render();
  }

  function renderInspector() {
    if (!state.selected) {
      state.richTextSelection = null;
      clearPendingRichTextFormat();
      els.inspector.innerHTML = '<div class="empty-state">Select a shape or arrow to edit properties.</div>';
      return;
    }

    if (state.selected.type === "shape") {
      renderShapeInspector(state.selected.id);
      return;
    }

    if (state.selected.type === "arrow") {
      state.richTextSelection = null;
      clearPendingRichTextFormat();
      renderArrowInspector(state.selected.id);
      return;
    }

    state.richTextSelection = null;
    clearPendingRichTextFormat();
    els.inspector.innerHTML = '<div class="empty-state">Selection unsupported.</div>';
  }

  function escapeHtml(txt) {
    return String(txt || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function bindNumber(id, eventName, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(eventName, () => {
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

  function bindCommittedNumber(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    const commit = () => {
      const value = String(el.value || "").trim();
      if (!value) return;
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      handler(num);
    };
    el.addEventListener("change", commit);
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        commit();
        el.blur();
      }
    });
  }

  function bindIconButton(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("mousedown", (evt) => evt.preventDefault());
    el.addEventListener("click", (evt) => {
      evt.preventDefault();
      handler();
    });
  }

  function emptyTextFormatState() {
    return {
      bold: false,
      italic: false,
      underline: false,
      overline: false,
      subscript: false,
      superscript: false,
    };
  }

  function normalizeTextFormatState(format) {
    const next = Object.assign(emptyTextFormatState(), format || {});
    Object.keys(next).forEach((key) => {
      next[key] = !!next[key];
    });
    if (next.subscript && next.superscript) {
      next.subscript = false;
    }
    return next;
  }

  function cloneTextFormatState(format) {
    return normalizeTextFormatState(format);
  }

  function setPendingRichTextFormat(shapeId, format) {
    state.richTextPendingFormat = {
      shapeId: shapeId,
      format: normalizeTextFormatState(format),
    };
  }

  function clearPendingRichTextFormat(shapeId) {
    if (!state.richTextPendingFormat) return;
    if (shapeId && state.richTextPendingFormat.shapeId !== shapeId) return;
    state.richTextPendingFormat = null;
  }

  function getPendingRichTextFormat(shapeId) {
    if (!state.richTextPendingFormat) return null;
    if (!shapeId || state.richTextPendingFormat.shapeId !== shapeId) return null;
    return cloneTextFormatState(state.richTextPendingFormat.format);
  }

  function parseTextDecoration(styleText) {
    return String(styleText || "")
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  function textDecorationHas(styleText, token) {
    return parseTextDecoration(styleText).indexOf(token) >= 0;
  }

  function nodeFormatContribution(node) {
    const next = emptyTextFormatState();
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return next;
    const tag = String(node.tagName || "").toLowerCase();
    const textDecoration = String(node.style && node.style.textDecoration || "");

    if (tag === "b" || tag === "strong") next.bold = true;
    if (tag === "i" || tag === "em") next.italic = true;
    if (tag === "u") next.underline = true;
    if (tag === "sub") next.subscript = true;
    if (tag === "sup") next.superscript = true;
    if (textDecorationHas(textDecoration, "underline")) next.underline = true;
    if (textDecorationHas(textDecoration, "overline")) next.overline = true;
    return next;
  }

  function applyNodeFormatState(baseState, node) {
    const next = cloneTextFormatState(baseState);
    const contribution = nodeFormatContribution(node);
    Object.keys(contribution).forEach((key) => {
      if (contribution[key]) next[key] = true;
    });
    if (contribution.subscript) next.superscript = false;
    if (contribution.superscript) next.subscript = false;
    return normalizeTextFormatState(next);
  }

  function getCaretFormatState(editor, range) {
    const formatState = emptyTextFormatState();
    if (!editor || !range) return formatState;
    let node = range.startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const next = applyNodeFormatState(formatState, node);
        Object.assign(formatState, next);
      }
      node = node.parentNode;
    }
    return normalizeTextFormatState(formatState);
  }

  function mergeFormatCoverage(coverage, formatState) {
    if (!coverage.hasText) {
      coverage.hasText = true;
      coverage.all = cloneTextFormatState(formatState);
      return;
    }
    Object.keys(coverage.all).forEach((key) => {
      coverage.all[key] = coverage.all[key] && !!formatState[key];
    });
  }

  function rangeIntersectsNode(range, node) {
    if (!range || !node) return false;
    if (typeof range.intersectsNode === "function") {
      try {
        return range.intersectsNode(node);
      } catch (err) {}
    }
    const nodeRange = document.createRange();
    try {
      nodeRange.selectNodeContents(node);
    } catch (err) {
      return false;
    }
    return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0;
  }

  function textNodeHasContent(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    return String(node.textContent || "").replace(/\u200b/g, "").length > 0;
  }

  function getRangeTextNodes(editor, range) {
    const textNodes = [];
    if (!editor || !range) return textNodes;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
      if (textNodeHasContent(node) && rangeIntersectsNode(range, node)) {
        textNodes.push(node);
      }
      node = walker.nextNode();
    }
    return textNodes;
  }

  function getTextNodeFormatState(editor, textNode) {
    const formatState = emptyTextFormatState();
    let node = textNode && textNode.parentNode;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const next = applyNodeFormatState(formatState, node);
        Object.assign(formatState, next);
      }
      node = node.parentNode;
    }
    return normalizeTextFormatState(formatState);
  }

  function getSelectionFormatState(editor, range) {
    if (!editor || !range) return emptyTextFormatState();
    if (range.collapsed) {
      const pending = state.selected && state.selected.type === "shape" ? getPendingRichTextFormat(state.selected.id) : null;
      return pending || getCaretFormatState(editor, range);
    }
    const textNodes = getRangeTextNodes(editor, range);
    const coverage = {
      hasText: false,
      all: emptyTextFormatState(),
    };
    textNodes.forEach((textNode) => {
      mergeFormatCoverage(coverage, getTextNodeFormatState(editor, textNode));
    });
    if (!coverage.hasText) return getCaretFormatState(editor, range);
    return normalizeTextFormatState(coverage.all);
  }

  function rangePlainText(range) {
    if (!range) return "";
    const wrapper = document.createElement("div");
    wrapper.appendChild(range.cloneContents());
    return richHtmlToPlainText(wrapper.innerHTML);
  }

  function currentEditorTextLength(editor) {
    if (!editor) return 0;
    return richHtmlToPlainText(editor.innerHTML).length;
  }

  function updateTextInspectorMeta(shape, editor) {
    const label = document.getElementById("ins-shape-text-label");
    const idInput = document.getElementById("ins-shape-id");
    if (label) {
      const currentLength = editor ? currentEditorTextLength(editor) : String(shape && shape.text || "").length;
      label.textContent = "Text - " + currentLength + "/" + MAX_SHAPE_TEXT_LENGTH;
    }
    if (idInput && shape && !shape.idManual) {
      idInput.value = shape.id;
    }
  }

  function remainingEditorTextCapacity(editor) {
    const range = inspectRichTextSelection(editor);
    const selectedLength = range ? rangePlainText(range).length : 0;
    return MAX_SHAPE_TEXT_LENGTH - (currentEditorTextLength(editor) - selectedLength);
  }

  function insertTextIntoEditor(text) {
    const value = String(text || "");
    if (!value) return;
    document.execCommand("insertText", false, value);
  }

  function isManagedFormatElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = String(node.tagName || "").toLowerCase();
    return tag === "b" || tag === "strong" || tag === "i" || tag === "em" ||
      tag === "u" || tag === "sub" || tag === "sup" || tag === "span";
  }

  function restoreSelectionFromMarkers(editor, markers) {
    if (!editor || !markers || !markers.startMarker || !markers.endMarker) return;
    const range = document.createRange();
    range.setStartAfter(markers.startMarker);
    range.setEndBefore(markers.endMarker);
    setEditorSelection(range);
    const startCleanupRoot = markers.startMarker.parentNode;
    const endCleanupRoot = markers.endMarker.parentNode;
    markers.startMarker.remove();
    markers.endMarker.remove();
    cleanupEmptyAncestors(startCleanupRoot, editor);
    cleanupEmptyAncestors(endCleanupRoot, editor);
  }

  function normalizeRichTextEditor(editor) {
    if (!editor) return;
    const selection = window.getSelection();
    const liveRange = selectionInsideNode(editor, selection) && selection.rangeCount
      ? selection.getRangeAt(0).cloneRange()
      : null;
    const markers = liveRange ? insertRangeBoundaryMarkers(liveRange) : null;

    const textNodes = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let textNode = walker.nextNode();
    while (textNode) {
      textNodes.push(textNode);
      textNode = walker.nextNode();
    }
    textNodes.forEach((node) => {
      const cleaned = String(node.textContent || "").replace(/\u200b/g, "");
      if (cleaned !== node.textContent) {
        node.textContent = cleaned;
      }
    });

    Array.from(editor.querySelectorAll("*")).reverse().forEach((node) => {
      if (isBoundaryMarker(node)) return;
      cleanupFormatElement(node);
      if (isManagedFormatElement(node) && !hasRenderableChildren(node)) {
        node.remove();
      }
    });

    editor.normalize();
    if (markers) {
      restoreSelectionFromMarkers(editor, markers);
    }
  }

  function wrapContainerWithState(container, formatState) {
    const next = normalizeTextFormatState(formatState);
    const order = ["subscript", "superscript", "overline", "underline", "italic", "bold"];
    order.forEach((formatKey) => {
      if (next[formatKey]) {
        wrapContainerWithFormat(container, formatKey);
      }
    });
  }

  function findLastTextNode(node) {
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) return node;
    const children = Array.from(node.childNodes || []);
    for (let idx = children.length - 1; idx >= 0; idx -= 1) {
      const match = findLastTextNode(children[idx]);
      if (match) return match;
    }
    return null;
  }

  function buildFormattedFragment(text, formatState) {
    const value = String(text || "");
    const container = document.createElement("div");
    const parts = value.split(/\n/);
    if (!parts.length) parts.push("");
    parts.forEach((part, idx) => {
      if (idx > 0) {
        container.appendChild(document.createElement("br"));
      }
      if (part.length || idx === parts.length - 1) {
        container.appendChild(document.createTextNode(part));
      }
    });
    wrapContainerWithState(container, formatState);

    const firstNode = container.firstChild;
    const lastNode = container.lastChild;
    const lastTextNode = findLastTextNode(container);
    const fragment = document.createDocumentFragment();
    while (container.firstChild) {
      fragment.appendChild(container.firstChild);
    }
    return {
      fragment: fragment,
      firstNode: firstNode,
      lastNode: lastNode,
      lastTextNode: lastTextNode,
    };
  }

  function insertCollapsedFormattedText(editor, text, formatState) {
    if (!editor) return false;
    const range = restoreRichTextSelection(editor, false);
    if (!range || !range.collapsed) return false;

    const marker = createBoundaryMarker("caret");
    range.insertNode(marker);
    TEXT_FORMAT_KEYS.forEach((key) => {
      const matcher = formatMatcherForKey(key);
      splitMatchingAncestorsAtMarker(marker, editor, matcher);
      liftMarkerAcrossMatchingAncestors(marker, editor, matcher, false);
    });

    const built = buildFormattedFragment(text, formatState);
    if (!built.firstNode || !built.lastNode) {
      const cleanupRoot = marker.parentNode;
      marker.remove();
      cleanupEmptyAncestors(cleanupRoot, editor);
      return false;
    }

    marker.parentNode.insertBefore(built.fragment, marker);
    const cleanupRoot = marker.parentNode;
    marker.remove();
    cleanupEmptyAncestors(cleanupRoot, editor);

    const nextRange = document.createRange();
    if (built.lastTextNode) {
      nextRange.setStart(built.lastTextNode, built.lastTextNode.textContent.length);
      nextRange.collapse(true);
    } else {
      nextRange.setStartAfter(built.lastNode);
      nextRange.collapse(true);
    }
    setEditorSelection(nextRange);
    return true;
  }

  function handleRichTextBeforeInput(evt, shape) {
    const editor = getRichTextEditorEl();
    if (!editor || !shape) return;
    const inputType = String(evt.inputType || "");
    if (!inputType || inputType.indexOf("delete") === 0 || inputType === "historyUndo" || inputType === "historyRedo") {
      return;
    }

    const available = remainingEditorTextCapacity(editor);
    const pending = getPendingRichTextFormat(shape.id);
    const range = inspectRichTextSelection(editor);
    if (pending && range && range.collapsed && (inputType === "insertText" || inputType === "insertCompositionText")) {
      evt.preventDefault();
      const clipped = String(evt.data || "").slice(0, Math.max(0, available));
      if (!clipped) return;
      if (insertCollapsedFormattedText(editor, clipped, pending)) {
        clearPendingRichTextFormat(shape.id);
        normalizeRichTextEditor(editor);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    if (pending && range && range.collapsed && (inputType === "insertParagraph" || inputType === "insertLineBreak")) {
      evt.preventDefault();
      if (available < 1) return;
      if (insertCollapsedFormattedText(editor, "\n", pending)) {
        clearPendingRichTextFormat(shape.id);
        normalizeRichTextEditor(editor);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    if (inputType === "insertText" || inputType === "insertCompositionText") {
      const text = String(evt.data || "");
      if (text.length <= available) return;
      evt.preventDefault();
      insertTextIntoEditor(text.slice(0, Math.max(0, available)));
      return;
    }

    if ((inputType === "insertParagraph" || inputType === "insertLineBreak") && available < 1) {
      evt.preventDefault();
      return;
    }

    if (inputType === "insertFromPaste" && available < 1) {
      evt.preventDefault();
    }
  }

  function handleRichTextPaste(evt, shape) {
    const editor = getRichTextEditorEl();
    if (!editor || !shape) return;
    const pasted = String(evt.clipboardData && evt.clipboardData.getData("text/plain") || "");
    const available = remainingEditorTextCapacity(editor);
    const clipped = pasted.slice(0, Math.max(0, available));
    const pending = getPendingRichTextFormat(shape.id);
    const range = inspectRichTextSelection(editor);
    if (pending && range && range.collapsed) {
      evt.preventDefault();
      if (!clipped) return;
      if (insertCollapsedFormattedText(editor, clipped, pending)) {
        clearPendingRichTextFormat(shape.id);
        normalizeRichTextEditor(editor);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }
    if (pasted.length <= available) return;
    evt.preventDefault();
    insertTextIntoEditor(clipped);
  }

  function getRichTextEditorEl() {
    return document.getElementById("ins-shape-text-editor");
  }

  function selectionInsideNode(node, selection) {
    if (!node || !selection || !selection.rangeCount) return false;
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    return (!!anchor && node.contains(anchor)) || (!!focus && node.contains(focus));
  }

  function captureRichTextSelection() {
    const editor = getRichTextEditorEl();
    if (!editor || !state.selected || state.selected.type !== "shape") return;
    const selection = window.getSelection();
    if (!selectionInsideNode(editor, selection) || !selection.rangeCount) {
      clearPendingRichTextFormat(state.selected.id);
      updateRichTextToolbarState();
      return;
    }
    const range = selection.getRangeAt(0).cloneRange();
    state.richTextSelection = {
      shapeId: state.selected.id,
      range: range,
    };
    if (!range.collapsed) {
      clearPendingRichTextFormat(state.selected.id);
    }
    updateRichTextToolbarState();
  }

  function restoreRichTextSelection(editor, fallbackToAll) {
    if (!editor) return null;
    const live = window.getSelection();
    if (selectionInsideNode(editor, live) && live.rangeCount) {
      return live.getRangeAt(0);
    }
    if (state.richTextSelection && state.selected && state.selected.type === "shape" && state.richTextSelection.shapeId === state.selected.id) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(state.richTextSelection.range.cloneRange());
      return selection.rangeCount ? selection.getRangeAt(0) : null;
    }
    if (!fallbackToAll) return null;
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  }

  function inspectRichTextSelection(editor) {
    if (!editor) return null;
    const live = window.getSelection();
    if (selectionInsideNode(editor, live) && live.rangeCount) {
      return live.getRangeAt(0);
    }
    if (state.richTextSelection && state.selected && state.selected.type === "shape" && state.richTextSelection.shapeId === state.selected.id) {
      return state.richTextSelection.range.cloneRange();
    }
    return null;
  }

  function setEditorSelection(range) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (range) selection.addRange(range);
  }

  function unwrapElement(node) {
    if (!node || !node.parentNode) return;
    while (node.firstChild) {
      node.parentNode.insertBefore(node.firstChild, node);
    }
    node.parentNode.removeChild(node);
  }

  function stripTextDecorationToken(styleText, token) {
    const nextTokens = parseTextDecoration(styleText).filter((value) => value !== token);
    return nextTokens.join(" ");
  }

  function cleanupFormatElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = String(node.tagName || "").toLowerCase();
    if (tag === "span" && !String(node.getAttribute("style") || "").trim()) {
      unwrapElement(node);
    }
  }

  function stripFormatFromContainer(container, formatKey) {
    Array.from(container.childNodes || []).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        stripFormatFromContainer(child, formatKey);
      }
    });

    Array.from(container.querySelectorAll ? container.querySelectorAll("*") : []).reverse().forEach((node) => {
      const tag = String(node.tagName || "").toLowerCase();
      if (formatKey === "bold" && (tag === "b" || tag === "strong")) {
        unwrapElement(node);
        return;
      }
      if (formatKey === "italic" && (tag === "i" || tag === "em")) {
        unwrapElement(node);
        return;
      }
      if (formatKey === "underline") {
        if (tag === "u") {
          unwrapElement(node);
          return;
        }
        if (node.style && node.style.textDecoration) {
          node.style.textDecoration = stripTextDecorationToken(node.style.textDecoration, "underline");
          if (!String(node.style.textDecoration || "").trim()) node.style.removeProperty("text-decoration");
          cleanupFormatElement(node);
        }
        return;
      }
      if (formatKey === "overline") {
        if (node.style && node.style.textDecoration) {
          node.style.textDecoration = stripTextDecorationToken(node.style.textDecoration, "overline");
          if (!String(node.style.textDecoration || "").trim()) node.style.removeProperty("text-decoration");
          cleanupFormatElement(node);
        }
        return;
      }
      if (formatKey === "subscript" && tag === "sub") {
        unwrapElement(node);
        return;
      }
      if (formatKey === "superscript" && tag === "sup") {
        unwrapElement(node);
      }
    });
  }

  function wrapContainerWithFormat(container, formatKey) {
    if (!container || !container.firstChild) return;
    let wrapper;
    if (formatKey === "bold") wrapper = document.createElement("strong");
    else if (formatKey === "italic") wrapper = document.createElement("em");
    else if (formatKey === "underline") wrapper = document.createElement("u");
    else if (formatKey === "subscript") wrapper = document.createElement("sub");
    else if (formatKey === "superscript") wrapper = document.createElement("sup");
    else {
      wrapper = document.createElement("span");
      wrapper.style.textDecoration = "overline";
    }
    while (container.firstChild) {
      wrapper.appendChild(container.firstChild);
    }
    container.appendChild(wrapper);
  }

  function formatMatcherForKey(formatKey) {
    return function (node) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
      const tag = String(node.tagName || "").toLowerCase();
      if (formatKey === "bold") return tag === "b" || tag === "strong";
      if (formatKey === "italic") return tag === "i" || tag === "em";
      if (formatKey === "underline") {
        return tag === "u" || textDecorationHas(String(node.style && node.style.textDecoration || ""), "underline");
      }
      if (formatKey === "overline") {
        return textDecorationHas(String(node.style && node.style.textDecoration || ""), "overline");
      }
      if (formatKey === "subscript") return tag === "sub";
      if (formatKey === "superscript") return tag === "sup";
      return false;
    };
  }

  function createBoundaryMarker(name) {
    const marker = document.createElement("span");
    marker.setAttribute("data-rt-boundary", name);
    marker.style.display = "inline-block";
    marker.style.width = "0";
    marker.style.overflow = "hidden";
    marker.style.lineHeight = "0";
    marker.textContent = "\u200b";
    return marker;
  }

  function insertRangeBoundaryMarkers(range) {
    const startMarker = createBoundaryMarker("start");
    const endMarker = createBoundaryMarker("end");
    const endRange = range.cloneRange();
    endRange.collapse(false);
    endRange.insertNode(endMarker);
    const startRange = range.cloneRange();
    startRange.collapse(true);
    startRange.insertNode(startMarker);
    return { startMarker: startMarker, endMarker: endMarker };
  }

  function splitElementAtMarker(element, marker) {
    if (!element || !marker || !element.parentNode) return;
    let current = marker;
    while (current.parentNode && current.parentNode !== element) {
      const parent = current.parentNode;
      const clone = parent.cloneNode(false);
      let next = current.nextSibling;
      while (next) {
        const move = next;
        next = next.nextSibling;
        clone.appendChild(move);
      }
      if (clone.firstChild) {
        parent.parentNode.insertBefore(clone, parent.nextSibling);
      }
      current = parent;
    }
    const elementClone = element.cloneNode(false);
    let next = current.nextSibling;
    while (next) {
      const move = next;
      next = next.nextSibling;
      elementClone.appendChild(move);
    }
    if (elementClone.firstChild) {
      element.parentNode.insertBefore(elementClone, element.nextSibling);
    }
  }

  function splitMatchingAncestorsAtMarker(marker, editor, matcher) {
    if (!marker || !editor || !matcher) return;
    let current = marker.parentNode;
    while (current && current !== editor) {
      const parent = current.parentNode;
      if (current.nodeType === Node.ELEMENT_NODE && matcher(current)) {
        splitElementAtMarker(current, marker);
      }
      current = parent;
    }
  }

  function isBoundaryMarker(node) {
    return !!(node && node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("data-rt-boundary"));
  }

  function hasRenderableChildren(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    return Array.from(node.childNodes || []).some((child) => {
      if (isBoundaryMarker(child)) return false;
      if (child.nodeType === Node.TEXT_NODE) {
        return String(child.textContent || "").replace(/\u200b/g, "").length > 0;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        return String(child.tagName || "").toLowerCase() !== "br";
      }
      return false;
    });
  }

  function cleanupEmptyAncestors(node, editor) {
    let current = node;
    while (current && current !== editor) {
      const parent = current.parentNode;
      if (current.nodeType === Node.ELEMENT_NODE && !hasRenderableChildren(current)) {
        current.remove();
      }
      current = parent;
    }
  }

  function liftMarkerAcrossMatchingAncestors(marker, editor, matcher, towardStart) {
    if (!marker || !editor || !matcher) return;
    let current = marker.parentNode;
    while (current && current !== editor) {
      const parent = current.parentNode;
      if (current.nodeType === Node.ELEMENT_NODE && matcher(current) && parent) {
        const cleanupRoot = marker.parentNode;
        parent.insertBefore(marker, towardStart ? current : current.nextSibling);
        cleanupEmptyAncestors(cleanupRoot, editor);
      }
      current = parent;
    }
  }

  function applyStyleToRange(range, styles, blockTag) {
    if (!range) return null;
    const tag = blockTag ? "div" : "span";
    const wrapper = document.createElement(tag);
    Object.keys(styles || {}).forEach((key) => {
      wrapper.style[key] = styles[key];
    });
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    return nextRange;
  }

  function toggleRangeFormat(shape, formatKey) {
    const editor = getRichTextEditorEl();
    if (!editor) return false;
    const range = restoreRichTextSelection(editor, false);
    if (!range || range.collapsed) return false;

    const currentState = getSelectionFormatState(editor, range);
    const shouldEnable = !currentState[formatKey];
    const markers = insertRangeBoundaryMarkers(range);
    const splitKeys = [formatKey];
    if (formatKey === "subscript") splitKeys.push("superscript");
    if (formatKey === "superscript") splitKeys.push("subscript");

    splitKeys.forEach((key) => {
      const matcher = formatMatcherForKey(key);
      splitMatchingAncestorsAtMarker(markers.endMarker, editor, matcher);
      splitMatchingAncestorsAtMarker(markers.startMarker, editor, matcher);
      liftMarkerAcrossMatchingAncestors(markers.startMarker, editor, matcher, true);
      liftMarkerAcrossMatchingAncestors(markers.endMarker, editor, matcher, false);
    });

    const isolatedRange = document.createRange();
    isolatedRange.setStartAfter(markers.startMarker);
    isolatedRange.setEndBefore(markers.endMarker);
    const fragmentContainer = document.createElement("div");
    fragmentContainer.appendChild(isolatedRange.extractContents());

    stripFormatFromContainer(fragmentContainer, formatKey);
    if (formatKey === "subscript") {
      stripFormatFromContainer(fragmentContainer, "superscript");
    } else if (formatKey === "superscript") {
      stripFormatFromContainer(fragmentContainer, "subscript");
    }
    if (shouldEnable) {
      wrapContainerWithFormat(fragmentContainer, formatKey);
    }

    const firstNode = fragmentContainer.firstChild;
    const lastNode = fragmentContainer.lastChild;
    if (!firstNode || !lastNode) {
      markers.startMarker.remove();
      markers.endMarker.remove();
      return false;
    }

    const fragment = document.createDocumentFragment();
    while (fragmentContainer.firstChild) {
      fragment.appendChild(fragmentContainer.firstChild);
    }
    markers.endMarker.parentNode.insertBefore(fragment, markers.endMarker);

    const nextRange = document.createRange();
    nextRange.setStartBefore(firstNode);
    nextRange.setEndAfter(lastNode);
    const startCleanupRoot = markers.startMarker.parentNode;
    const endCleanupRoot = markers.endMarker.parentNode;
    markers.startMarker.remove();
    markers.endMarker.remove();
    cleanupEmptyAncestors(startCleanupRoot, editor);
    cleanupEmptyAncestors(endCleanupRoot, editor);
    setEditorSelection(nextRange);
    clearPendingRichTextFormat(shape.id);
    captureRichTextSelection();
    syncShapeRichText(shape, editor, false);
    return true;
  }

  function syncShapeRichText(shape, editor, finalize) {
    if (!shape || !editor) return;
    const html = finalize ? sanitizeRichHtml(editor.innerHTML, shape.text) : String(editor.innerHTML || "");
    shape.richText = html;
    shape.text = richHtmlToPlainText(html);
    if (finalize) {
      editor.innerHTML = shape.richText;
      if (!shape.idManual) {
        updateAutoId(shape, shape.parentId);
      }
      render();
      captureRichTextSelection();
    } else {
      render(true);
      updateRichTextToolbarState();
    }
  }

  function executeTextCommand(shape, formatKey) {
    const editor = getRichTextEditorEl();
    if (!editor) return;
    const range = restoreRichTextSelection(editor, false);
    if (!range) return;
    pushHistory();
    if (!range.collapsed) {
      toggleRangeFormat(shape, formatKey);
      return;
    }

    const currentState = getSelectionFormatState(editor, range);
    const nextState = cloneTextFormatState(currentState);
    nextState[formatKey] = !currentState[formatKey];
    if (formatKey === "subscript" && nextState.subscript) nextState.superscript = false;
    if (formatKey === "superscript" && nextState.superscript) nextState.subscript = false;
    setPendingRichTextFormat(shape.id, nextState);
    captureRichTextSelection();
    updateRichTextToolbarState();
  }

  function executeOverlineCommand(shape) {
    const editor = getRichTextEditorEl();
    if (!editor) return;
    const range = restoreRichTextSelection(editor, false);
    if (!range) return;

    pushHistory();
    if (!range.collapsed) {
      toggleRangeFormat(shape, "overline");
      return;
    }
    const currentState = getSelectionFormatState(editor, range);
    const nextState = cloneTextFormatState(currentState);
    nextState.overline = !currentState.overline;
    setPendingRichTextFormat(shape.id, nextState);
    captureRichTextSelection();
    updateRichTextToolbarState();
  }

  function applyInlineStyleCommand(shape, styles, blockWhenAll) {
    const editor = getRichTextEditorEl();
    if (!editor) return;
    pushHistory();
    const range = restoreRichTextSelection(editor, false);
    if (range && !range.collapsed) {
      const nextRange = applyStyleToRange(range, styles, false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      if (nextRange) selection.addRange(nextRange);
      captureRichTextSelection();
      syncShapeRichText(shape, editor, false);
      return;
    }
    const fullRange = restoreRichTextSelection(editor, true);
    const nextRange = applyStyleToRange(fullRange, styles, blockWhenAll !== false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (nextRange) selection.addRange(nextRange);
    captureRichTextSelection();
    syncShapeRichText(shape, editor, false);
  }

  function hasActiveRichTextSelection() {
    const editor = getRichTextEditorEl();
    if (!editor) return false;
    const range = inspectRichTextSelection(editor);
    return !!(range && !range.collapsed);
  }

  function setButtonActive(id, active) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("active", !!active);
  }

  function updateRichTextToolbarState() {
    const editor = getRichTextEditorEl();
    if (!editor) return;
    const range = inspectRichTextSelection(editor);
    const formatState = getSelectionFormatState(editor, range);
    setButtonActive("fmt-bold", formatState.bold);
    setButtonActive("fmt-italic", formatState.italic);
    setButtonActive("fmt-underline", formatState.underline);
    setButtonActive("fmt-overline", formatState.overline);
    setButtonActive("fmt-subscript", formatState.subscript);
    setButtonActive("fmt-superscript", formatState.superscript);
  }

  function renderShapeInspector(shapeId) {
    const shape = shapeById(shapeId);
    if (!shape) {
      els.inspector.innerHTML = '<div class="empty-state">Shape not found.</div>';
      return;
    }

    const containers = state.model.shapes.filter((s) =>
      isContainerKind(s.kind) && s.id !== shape.id && !isDescendant(s.id, shape.id)
    );

    const palette = state.model.metadata.colorPalette || DEFAULT_COLOR_PALETTE;
    const borderPalette = palette.map((color) => borderNuance(color));
    const isComponentGroup = shape.kind === "component_group";
    const componentLabelsText = normalizeComponentLabels(shape.componentLabels, shape.componentCount).join("\n");
    const richText = sanitizeRichHtml(shape.richText, shape.text);
    const selectedFontFamily = normalizeFontFamily(shape.fontFamily);
    const fontFamilyOptions = FONT_FAMILY_OPTIONS
      .map((option) => '<option value="' + escapeHtml(option.value) + '"' + (selectedFontFamily === option.value ? " selected" : "") + '>' + escapeHtml(option.label) + '</option>')
      .join("");
    const parentOptions = ['<option value="">None</option>']
      .concat(containers.map((c) => '<option value="' + escapeHtml(c.id) + '"' + (shape.parentId === c.id ? " selected" : "") + '>' + escapeHtml(c.text) + ' (' + escapeHtml(c.id) + ')</option>'))
      .join("");
    state.richTextSelection = null;
    clearPendingRichTextFormat();

    els.inspector.innerHTML = [
      "<div>",
      '<div><label id="ins-shape-text-label">Text - ' + shape.text.length + '/' + MAX_SHAPE_TEXT_LENGTH + '</label><div id="ins-shape-text-editor" class="rich-text-editor" contenteditable="true" spellcheck="false">' + richText + "</div></div>",
      '<div class="format-row">' +
        '<button id="fmt-bold" type="button" title="Bold"><span class="format-icon"><strong>B</strong></span></button>' +
        '<button id="fmt-italic" type="button" title="Italic"><span class="format-icon"><em>I</em></span></button>' +
        '<button id="fmt-underline" type="button" title="Underline"><span class="format-icon"><span style="text-decoration:underline;">U</span></span></button>' +
        '<button id="fmt-overline" type="button" title="Overline"><span class="format-icon"><span style="text-decoration:overline;">O</span></span></button>' +
        '<button id="fmt-subscript" type="button" title="Subscript"><span class="format-icon">x₂</span></button>' +
        '<button id="fmt-superscript" type="button" title="Superscript"><span class="format-icon">x²</span></button>' +
      "</div>",
      '<div class="format-row">' +
        '<button id="fmt-align-left" type="button" title="Align left"' + (shape.textAlign === "left" ? ' class="active"' : "") + '><span class="format-icon align-icon left">≡</span></button>' +
        '<button id="fmt-align-center" type="button" title="Align center"' + (shape.textAlign === "center" ? ' class="active"' : "") + '><span class="format-icon align-icon center">≡</span></button>' +
        '<button id="fmt-align-right" type="button" title="Align right"' + (shape.textAlign === "right" ? ' class="active"' : "") + '><span class="format-icon align-icon right">≡</span></button>' +
        '<button id="fmt-v-top" type="button" title="Text top"' + (shape.textVAlign === "top" ? ' class="active"' : "") + '><span class="format-icon">⇡</span></button>' +
        '<button id="fmt-v-center" type="button" title="Text center"' + (shape.textVAlign === "center" ? ' class="active"' : "") + '><span class="format-icon">⇕</span></button>' +
        '<button id="fmt-v-bottom" type="button" title="Text bottom"' + (shape.textVAlign === "bottom" ? ' class="active"' : "") + '><span class="format-icon">⇣</span></button>' +
      "</div>",
      '<div class="text-style-row">' +
        '<select id="ins-shape-font-family" title="Font family">' + fontFamilyOptions + '</select>' +
        '<input id="ins-shape-font-color" class="compact-color" type="color" title="Font color" value="' + normalizeColor(shape.textColor, "#f4f7ff") + '"/>' +
        '<input id="ins-shape-font-size" class="font-size-input" type="number" min="8" max="1000" step="0.5" title="Font size" value="' + roundNum(shape.fontSize || 12) + '"/>' +
      "</div>",
      '<div><label>ID</label><input id="ins-shape-id" type="text" value="' + escapeHtml(shape.id) + '"/></div>',
      '<div class="switch-row"><label for="ins-shape-auto-id">Auto ID</label><label class="switch"><input id="ins-shape-auto-id" type="checkbox"' + (!shape.idManual ? " checked" : "") + '/><span class="switch-slider"></span></label></div>',
      '<div><label>Parent container:</label><select id="ins-parent">' + parentOptions + '</select></div>',
      "<h3>Style</h3>",
      '<div><label>Border</label><div class="border-controls">' +
        '<select id="ins-shape-border-style"><option value="solid"' + (shape.borderStyle === "solid" ? " selected" : "") + '>solid</option><option value="dashed"' + (shape.borderStyle === "dashed" ? " selected" : "") + '>dashed</option></select>' +
        '<input id="ins-shape-border-width" type="number" min="0.5" max="12" step="0.1" title="Border thickness" value="' + roundNum(shape.borderWidth || defaultBorderWidth(shape.kind)) + '"/>' +
      '</div></div>',
      '<div class="row"><label style="margin:0;"><input id="ins-shape-rounded" type="checkbox"' + (shape.rounded ? " checked" : "") + '> Rounded corners</label></div>',
      isComponentGroup
        ? '<h3>Group Layout</h3>' +
          '<div><label>Direction</label><select id="ins-group-direction"><option value="horizontal"' + (normalizeComponentDirection(shape.componentDirection) === "horizontal" ? " selected" : "") + '>horizontal</option><option value="vertical"' + (normalizeComponentDirection(shape.componentDirection) === "vertical" ? " selected" : "") + '>vertical</option></select></div>' +
          '<div><label>Components</label><input id="ins-group-count" type="number" min="1" max="24" step="1" value="' + Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)) ) + '"/></div>' +
          '<div><label>Component labels (one line per component)</label><textarea id="ins-group-labels">' + escapeHtml(componentLabelsText) + '</textarea></div>'
        : "",
      "<h3>Color</h3>",
      '<div><label>Fill palette</label><div class="palette" id="ins-shape-fill-palette"></div></div>',
      '<div><label>Border palette</label><div class="palette" id="ins-shape-stroke-palette"></div></div>',
      '<div><label>Fill</label><input id="ins-shape-fill" type="color" value="' + normalizeColor(shape.fill, "#1c2f4f") + '"/></div>',
      '<div><label>Border color</label><input id="ins-shape-stroke" type="color" value="' + normalizeColor(shape.stroke, "#80b6ff") + '"/></div>',
      "<h3>Geometry</h3>",
      '<div class="grid2">' +
        '<div class="inline-field"><label for="ins-shape-x">x:</label><input id="ins-shape-x" type="number" step="1" value="' + roundNum(shape.x) + '"/></div>' +
        '<div class="inline-field"><label for="ins-shape-y">y:</label><input id="ins-shape-y" type="number" step="1" value="' + roundNum(shape.y) + '"/></div>' +
        '<div class="inline-field"><label for="ins-shape-w">width:</label><input id="ins-shape-w" type="number" step="1" min="' + MIN_SHAPE_SIZE + '" value="' + roundNum(shape.width) + '"/></div>' +
        '<div class="inline-field"><label for="ins-shape-h">height:</label><input id="ins-shape-h" type="number" step="1" min="' + MIN_SHAPE_SIZE + '" value="' + roundNum(shape.height) + '"/></div>' +
      '</div>',
      "<h3>Z-Order</h3>",
      '<div class="row"><button id="ins-z-back">Send Back</button><button id="ins-z-front">Bring Front</button></div>',
      "</div>",
    ].join("");

    const textEditor = document.getElementById("ins-shape-text-editor");
    if (textEditor) {
      textEditor.innerHTML = richText;
      updateTextInspectorMeta(shape, textEditor);
    }

    const fillPaletteEl = document.getElementById("ins-shape-fill-palette");
    const strokePaletteEl = document.getElementById("ins-shape-stroke-palette");
    palette.forEach((color) => {
      if (fillPaletteEl) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "swatch" + (normalizeColor(shape.fill, "#1c2f4f") === normalizeColor(color, "#1c2f4f") ? " active" : "");
        sw.style.background = color;
        sw.addEventListener("click", () => {
          pushHistory();
          shape.fill = normalizeColor(color, shape.fill);
          render();
        });
        fillPaletteEl.appendChild(sw);
      }
    });
    borderPalette.forEach((color) => {
      if (strokePaletteEl) {
        const sw2 = document.createElement("button");
        sw2.type = "button";
        sw2.className = "swatch" + (normalizeColor(shape.stroke, "#80b6ff") === normalizeColor(color, "#80b6ff") ? " active" : "");
        sw2.style.background = color;
        sw2.addEventListener("click", () => {
          pushHistory();
          shape.stroke = normalizeColor(color, shape.stroke);
          render();
        });
        strokePaletteEl.appendChild(sw2);
      }
    });

    let pushedTextHistory = false;
    if (textEditor) {
      textEditor.addEventListener("beforeinput", (evt) => handleRichTextBeforeInput(evt, shape));
      textEditor.addEventListener("paste", (evt) => handleRichTextPaste(evt, shape));
      textEditor.addEventListener("input", () => {
        clearPendingRichTextFormat(shape.id);
        normalizeRichTextEditor(textEditor);
        if (!pushedTextHistory) {
          pushHistory();
          pushedTextHistory = true;
        }
        shape.richText = String(textEditor.innerHTML || "");
        shape.text = richHtmlToPlainText(shape.richText);
        if (shape.text.length > MAX_SHAPE_TEXT_LENGTH) {
          shape.text = shape.text.slice(0, MAX_SHAPE_TEXT_LENGTH);
          shape.richText = plainTextToRichHtml(shape.text);
          textEditor.innerHTML = shape.richText;
        }
        if (!shape.idManual) {
          updateAutoId(shape, shape.parentId);
        }
        updateTextInspectorMeta(shape, textEditor);
        captureRichTextSelection();
        render(true);
      });
      textEditor.addEventListener("keyup", () => {
        clearPendingRichTextFormat(shape.id);
        captureRichTextSelection();
      });
      textEditor.addEventListener("mouseup", () => {
        clearPendingRichTextFormat(shape.id);
        captureRichTextSelection();
      });
      textEditor.addEventListener("focus", () => {
        updateTextInspectorMeta(shape, textEditor);
        updateRichTextToolbarState();
      });
      textEditor.addEventListener("blur", () => {
        clearPendingRichTextFormat(shape.id);
        normalizeRichTextEditor(textEditor);
        syncShapeRichText(shape, textEditor, true);
      });
    }

    bindIconButton("fmt-bold", () => executeTextCommand(shape, "bold"));
    bindIconButton("fmt-italic", () => executeTextCommand(shape, "italic"));
    bindIconButton("fmt-underline", () => executeTextCommand(shape, "underline"));
    bindIconButton("fmt-overline", () => executeOverlineCommand(shape));
    bindIconButton("fmt-subscript", () => executeTextCommand(shape, "subscript"));
    bindIconButton("fmt-superscript", () => executeTextCommand(shape, "superscript"));
    bindIconButton("fmt-align-left", () => {
      pushHistory();
      shape.textAlign = "left";
      render();
    });
    bindIconButton("fmt-align-center", () => {
      pushHistory();
      shape.textAlign = "center";
      render();
    });
    bindIconButton("fmt-align-right", () => {
      pushHistory();
      shape.textAlign = "right";
      render();
    });
    bindIconButton("fmt-v-top", () => {
      pushHistory();
      shape.textVAlign = "top";
      render();
    });
    bindIconButton("fmt-v-center", () => {
      pushHistory();
      shape.textVAlign = "center";
      render();
    });
    bindIconButton("fmt-v-bottom", () => {
      pushHistory();
      shape.textVAlign = "bottom";
      render();
    });
    updateRichTextToolbarState();

    bindInput("ins-shape-id", "change", (value) => {
      pushHistory();
      const next = uniqueShapeId(sanitizeId(value || shape.id), shape.id);
      shape.idManual = true;
      renameShapeId(shape.id, next);
      render();
    });

    bindChecked("ins-shape-auto-id", (checked) => {
      pushHistory();
      shape.idManual = !checked;
      if (checked) {
        updateAutoId(shape, shape.parentId);
      }
      render();
    });

    bindInput("ins-shape-font-family", "change", (value) => {
      pushHistory();
      shape.fontFamily = normalizeFontFamily(value);
      render();
    });

    bindInput("ins-shape-font-color", "input", (value) => {
      const nextColor = normalizeColor(value, shape.textColor);
      if (hasActiveRichTextSelection()) {
        applyInlineStyleCommand(shape, { color: nextColor }, false);
        return;
      }
      pushHistory();
      shape.textColor = nextColor;
      render();
    });

    bindCommittedNumber("ins-shape-font-size", (num) => {
      const nextSize = normalizeFontSize(num, shape.fontSize || 12);
      pushHistory();
      shape.fontSize = nextSize;
      render();
    });

    bindInput("ins-shape-fill", "input", (value) => {
      pushHistory();
      shape.fill = normalizeColor(value, shape.fill);
      render();
    });

    bindInput("ins-shape-stroke", "input", (value) => {
      pushHistory();
      shape.stroke = normalizeColor(value, shape.stroke);
      render();
    });

    bindInput("ins-shape-border-style", "change", (value) => {
      pushHistory();
      shape.borderStyle = normalizeBorderStyle(value);
      render();
    });

    bindCommittedNumber("ins-shape-border-width", (num) => {
      pushHistory();
      shape.borderWidth = normalizeBorderWidth(num, shape.borderWidth || defaultBorderWidth(shape.kind));
      render();
    });

    if (isComponentGroup) {
      bindInput("ins-group-direction", "change", (value) => {
        pushHistory();
        shape.componentDirection = normalizeComponentDirection(value);
        render();
      });
      bindNumber("ins-group-count", "change", (num) => {
        pushHistory();
        shape.componentCount = Math.max(1, Math.min(24, Math.round(num || 1)));
        shape.componentLabels = normalizeComponentLabels(shape.componentLabels, shape.componentCount);
        render();
      });
      bindInput("ins-group-labels", "change", (value) => {
        pushHistory();
        const lines = String(value || "").split(/\r?\n/).map((v) => v.trim());
        shape.componentLabels = normalizeComponentLabels(lines, shape.componentCount);
        render();
      });
    }

    bindChecked("ins-shape-rounded", (checked) => {
      pushHistory();
      shape.rounded = checked;
      render();
    });

    bindCommittedNumber("ins-shape-x", (num) => {
      pushHistory();
      shape.x = num;
      render();
    });
    bindCommittedNumber("ins-shape-y", (num) => {
      pushHistory();
      shape.y = num;
      render();
    });
    bindCommittedNumber("ins-shape-w", (num) => {
      pushHistory();
      shape.width = Math.max(MIN_SHAPE_SIZE, num);
      if (shape.kind === "square" || shape.kind === "circle") {
        shape.height = shape.width;
      }
      render();
    });
    bindCommittedNumber("ins-shape-h", (num) => {
      pushHistory();
      shape.height = Math.max(MIN_SHAPE_SIZE, num);
      if (shape.kind === "square" || shape.kind === "circle") {
        shape.width = shape.height;
      }
      render();
    });

    const zBack = document.getElementById("ins-z-back");
    const zFront = document.getElementById("ins-z-front");
    if (zBack) {
      zBack.addEventListener("click", () => {
        pushHistory();
        const minZ = Math.min.apply(null, state.model.shapes.map((s) => s.z || 0));
        shape.z = minZ - 1;
        render();
      });
    }
    if (zFront) {
      zFront.addEventListener("click", () => {
        pushHistory();
        const maxZ = Math.max.apply(null, state.model.shapes.map((s) => s.z || 0));
        shape.z = maxZ + 1;
        render();
      });
    }

    const parentSel = document.getElementById("ins-parent");
    if (parentSel) {
      parentSel.addEventListener("change", () => {
        pushHistory();
        const prev = shape.parentId;
        shape.parentId = parentSel.value || null;
        if (!shape.idManual && prev !== shape.parentId) {
          updateAutoId(shape, prev);
        }
        render();
      });
    }
  }

  function setControlPoint(arrow, index, axis, value) {
    while (arrow.controlPoints.length < 2) {
      arrow.controlPoints.push({ x: 0, y: 0 });
    }
    arrow.controlPoints[index][axis] = value;
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

    const waypointRows = (arrow.waypoints || []).map((wp, idx) => {
      return '<div class="grid2">' +
        '<div><label>x</label><input data-waypoint-x="' + idx + '" type="number" step="1" value="' + roundNum(wp.x) + '"/></div>' +
        '<div><label>y</label><input data-waypoint-y="' + idx + '" type="number" step="1" value="' + roundNum(wp.y) + '"/></div>' +
        '<div class="row"><button data-waypoint-remove="' + idx + '" class="danger">Remove waypoint</button></div>' +
      '</div>';
    }).join("");

    els.inspector.innerHTML = [
      "<div>",
      '<div><label>ID</label><input id="ins-arrow-id" type="text" value="' + escapeHtml(arrow.id) + '"/></div>',
      '<div class="hint">From: <strong>' + escapeHtml(fromShape ? fromShape.id : arrow.from.shapeId) + '</strong> (' + arrow.from.side + ':' + arrow.from.anchorIndex + ')</div>',
      '<div class="hint">To: <strong>' + escapeHtml(toShape ? toShape.id : arrow.to.shapeId) + '</strong> (' + arrow.to.side + ':' + arrow.to.anchorIndex + ')</div>',
      "<h3>Style</h3>",
      '<div><label>Type</label><select id="ins-arrow-type"><option value="arrow"' + (arrow.connectionType === "arrow" ? " selected" : "") + '>Arrow</option><option value="bi"' + (arrow.connectionType === "bi" ? " selected" : "") + '>Bi-directional Arrow</option><option value="line"' + (arrow.connectionType === "line" ? " selected" : "") + '>Line</option></select></div>',
      '<div><label>Line style</label><select id="ins-arrow-line"><option value="solid"' + (arrow.lineStyle === "solid" ? " selected" : "") + '>solid</option><option value="dashed"' + (arrow.lineStyle === "dashed" ? " selected" : "") + '>dashed</option></select></div>',
      '<div><label>Routing</label><select id="ins-arrow-routing"><option value="angled"' + (arrow.routing === "angled" ? " selected" : "") + '>angled/orthogonal</option><option value="straight"' + (arrow.routing === "straight" ? " selected" : "") + '>straight</option><option value="curved"' + (arrow.routing === "curved" ? " selected" : "") + '>curved</option></select></div>',
      '<div><label>Color</label><input id="ins-arrow-color" type="color" value="' + normalizeColor(arrow.stroke, "#e8efff") + '"/></div>',
      '<div><label>Width</label><input id="ins-arrow-width" type="number" min="0.5" step="0.1" value="' + roundNum(arrow.width) + '"/></div>',
      arrow.routing === "curved"
        ? '<h3>Control Points</h3>' +
          '<div class="grid2">' +
            '<div><label>cp1 x</label><input id="ins-cp1x" type="number" step="1" value="' + roundNum(cp1.x) + '"/></div>' +
            '<div><label>cp1 y</label><input id="ins-cp1y" type="number" step="1" value="' + roundNum(cp1.y) + '"/></div>' +
            '<div><label>cp2 x</label><input id="ins-cp2x" type="number" step="1" value="' + roundNum(cp2.x) + '"/></div>' +
            '<div><label>cp2 y</label><input id="ins-cp2y" type="number" step="1" value="' + roundNum(cp2.y) + '"/></div>' +
          '</div>'
        : "",
      arrow.routing === "angled"
        ? '<h3>Waypoints</h3>' + (waypointRows || '<div class="hint">No waypoints. Add one to bend manually.</div>') + '<div class="row"><button id="ins-waypoint-add">Add waypoint</button></div>'
        : "",
      "</div>",
    ].join("");

    bindInput("ins-arrow-id", "change", (value) => {
      pushHistory();
      arrow.id = uniqueArrowId(sanitizeId(value || arrow.id), arrow.id);
      render();
    });

    bindInput("ins-arrow-type", "change", (value) => {
      pushHistory();
      arrow.connectionType = normalizeConnectionType(value);
      render();
    });

    bindInput("ins-arrow-line", "change", (value) => {
      pushHistory();
      arrow.lineStyle = normalizeLineStyle(value);
      render();
    });

    bindInput("ins-arrow-routing", "change", (value) => {
      pushHistory();
      arrow.routing = normalizeRouting(value);
      if (arrow.routing === "curved" && arrow.controlPoints.length < 2) {
        const geom = buildArrowGeometry(arrow);
        arrow.controlPoints = geom.controlPoints;
      }
      render();
    });

    bindInput("ins-arrow-color", "input", (value) => {
      pushHistory();
      arrow.stroke = normalizeColor(value, arrow.stroke);
      render();
    });

    bindNumber("ins-arrow-width", "input", (num) => {
      pushHistory();
      arrow.width = Math.max(0.5, num);
      render();
    });

    if (arrow.routing === "curved") {
      bindNumber("ins-cp1x", "input", (num) => {
        pushHistory();
        setControlPoint(arrow, 0, "x", num);
        render();
      });
      bindNumber("ins-cp1y", "input", (num) => {
        pushHistory();
        setControlPoint(arrow, 0, "y", num);
        render();
      });
      bindNumber("ins-cp2x", "input", (num) => {
        pushHistory();
        setControlPoint(arrow, 1, "x", num);
        render();
      });
      bindNumber("ins-cp2y", "input", (num) => {
        pushHistory();
        setControlPoint(arrow, 1, "y", num);
        render();
      });
    }

    if (arrow.routing === "angled") {
      const addBtn = document.getElementById("ins-waypoint-add");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          pushHistory();
          const geom = buildArrowGeometry(arrow);
          arrow.waypoints.push({ x: (geom.from.x + geom.to.x) / 2, y: (geom.from.y + geom.to.y) / 2 });
          render();
        });
      }

      (arrow.waypoints || []).forEach((_, idx) => {
        bindNumberByAttr("data-waypoint-x", idx, (num) => {
          pushHistory();
          arrow.waypoints[idx].x = num;
          render();
        });
        bindNumberByAttr("data-waypoint-y", idx, (num) => {
          pushHistory();
          arrow.waypoints[idx].y = num;
          render();
        });

        const removeBtn = document.querySelector('[data-waypoint-remove="' + idx + '"]');
        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            pushHistory();
            arrow.waypoints.splice(idx, 1);
            render();
          });
        }
      });
    }
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

  function syncElfFromInput() {
    state.elf = String(els.elfInput.value || "").trim();
    if (!state.elf) state.elf = "diagram.elf";
    if (!state.model.metadata) state.model.metadata = {};
    state.model.metadata.elf = state.elf;
  }

  async function loadModel() {
    syncElfFromInput();
    setStatus("Loading model for " + state.elf + "...");
    try {
      const payload = await apiLoadModel();
      state.model = payload.model || defaultModel(state.elf);
      state.history = [];
      state.future = [];
      ensureModelDefaults();
      state.selected = null;
      state.connectSourceId = null;
      render();
      setStatus("Loaded model from " + payload.paths.store, "ok");
    } catch (err) {
      setStatus("Load error: " + (err && err.message ? err.message : String(err)), "error");
    }
  }

  async function saveModel() {
    syncElfFromInput();
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
    syncElfFromInput();
    ensureModelDefaults();
    setStatus("Generating full renderPrimaryReferenceDiagram() function...");
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

  function bindEvents() {
    els.loadBtn.addEventListener("click", loadModel);
    els.saveBtn.addEventListener("click", saveModel);
    els.generateBtn.addEventListener("click", generateRenderer);

    els.toolSelectBtn.addEventListener("click", () => setMode("select"));
    els.toolConnectArrowBtn.addEventListener("click", () => setMode("connect_arrow"));
    els.toolConnectBiBtn.addEventListener("click", () => setMode("connect_bi"));
    els.toolConnectLineBtn.addEventListener("click", () => setMode("connect_line"));

    els.addSquareBtn.addEventListener("click", () => addShape("square"));
    els.addRectangleBtn.addEventListener("click", () => addShape("rectangle"));
    els.addTriangleBtn.addEventListener("click", () => addShape("triangle"));
    els.addCircleBtn.addEventListener("click", () => addShape("circle"));
    els.addOvalBtn.addEventListener("click", () => addShape("oval"));
    els.addContainerStandardBtn.addEventListener("click", () => addShape("container"));
    els.addContainerHeaderBtn.addEventListener("click", () => addShape("header_container"));
    els.addComponentGroupBtn.addEventListener("click", () => addShape("component_group"));

    els.deleteBtn.addEventListener("click", deleteSelected);

    els.zoomInBtn.addEventListener("click", () => setZoom(state.view.zoom * 1.12));
    els.zoomOutBtn.addEventListener("click", () => setZoom(state.view.zoom / 1.12));
    els.zoomResetBtn.addEventListener("click", resetView);

    els.svg.addEventListener("pointerdown", onBackgroundPointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    els.canvasScroll.addEventListener("wheel", (evt) => {
      if (!evt.ctrlKey && !evt.metaKey) return;
      evt.preventDefault();
      const factor = evt.deltaY < 0 ? 1.1 : 0.9;
      setZoom(state.view.zoom * factor);
    }, { passive: false });

    // Safari/macOS trackpad pinch support.
    let gestureStartZoom = 1;
    els.canvasScroll.addEventListener("gesturestart", (evt) => {
      evt.preventDefault();
      gestureStartZoom = state.view.zoom;
    }, { passive: false });
    els.canvasScroll.addEventListener("gesturechange", (evt) => {
      evt.preventDefault();
      const scale = Number(evt.scale) || 1;
      setZoom(gestureStartZoom * scale);
    }, { passive: false });

    els.elfInput.addEventListener("change", () => {
      syncElfFromInput();
      setStatus("Diagram name changed to " + state.elf + ". Save will use this name.", "ok");
    });

    document.addEventListener("selectionchange", captureRichTextSelection);

    window.addEventListener("keydown", (evt) => {
      const target = evt.target;
      const inInput = !!(target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        (target.closest && target.closest('[contenteditable="true"]'))
      ));

      if ((evt.ctrlKey || evt.metaKey) && !evt.shiftKey && evt.key.toLowerCase() === "z") {
        evt.preventDefault();
        undo();
        return;
      }

      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "c") {
        if (inInput) return;
        evt.preventDefault();
        copySelectedShapeBundle();
        return;
      }

      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "v") {
        if (inInput) return;
        evt.preventDefault();
        pasteClipboard();
        return;
      }

      if (evt.key === "Delete" || evt.key === "Backspace") {
        if (inInput) return;
        evt.preventDefault();
        deleteSelected();
        return;
      }

      if (evt.key === "Escape") {
        state.connectSourceId = null;
        state.drag = null;
        els.canvasScroll.classList.remove("panning");
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
    loadModel();
  }

  init();
})();
