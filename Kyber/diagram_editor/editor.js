(function () {
  "use strict";

  const TYPE_COLOR_SWATCHES = [
    { key: "input", label: "Input", letter: "I", fill: "#21341d", stroke: "#5a7c3c" },
    { key: "process", label: "Process", letter: "P", fill: "#423548", stroke: "#9d81af" },
    { key: "data", label: "Data", letter: "D", fill: "#263347", stroke: "#6886b4" },
    { key: "random_generation", label: "Random generation", letter: "R", fill: "#4b3313", stroke: "#b18034" },
    { key: "output", label: "Output", letter: "O", fill: "#633c39", stroke: "#d6948c" },
    { key: "usage_hints", label: "Usage hints", letter: "U", fill: "#4e5a69", stroke: "#b6cadf" },
  ];
  const DEFAULT_COLOR_PALETTE = TYPE_COLOR_SWATCHES.map((entry) => entry.fill);
  const DEFAULT_SHAPE_FILL = "#1c2f4f";
  const DEFAULT_SHAPE_STROKE = "#80b6ff";
  const DEFAULT_TEXT_COLOR = "#f4f7ff";
  const DEFAULT_CONTAINER_FILL = "#0d172a";
  const DEFAULT_CONTAINER_STROKE = "#eef3ff";
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
    square: { width: 50, height: 50 },
    cube: { width: 80, height: 70 },
    rectangle: { width: 100, height: 50 },
    cuboid: { width: 110, height: 70 },
    triangle: { width: 90, height: 60 },
    cone: { width: 90, height: 90 },
    diamond: { width: 100, height: 60 },
    parallelogram: { width: 100, height: 60 },
    trapezoid: { width: 100, height: 60 },
    pentagon: { width: 90, height: 80 },
    hexagon: { width: 110, height: 70 },
    octagon: { width: 110, height: 70 },
    circle: { width: 60, height: 60 },
    oval: { width: 100, height: 90 },
    cylinder: { width: 110, height: 80 },
    hexagonal_prism: { width: 120, height: 80 },
    and: { width: 100, height: 60 },
    or: { width: 100, height: 60 },
    message: { width: 110, height: 70 },
    mail: { width: 110, height: 70 },
    actor: { width: 90, height: 120 },
    cloud: { width: 120, height: 80 },
    cloud_callout: { width: 130, height: 90 },
    card: { width: 80, height: 100 },
    note: { width: 90, height: 110 },
    text_box: { width: 120, height: 60 },
    container: { width: 240, height: 200 },
    header_container: { width: 240, height: 200 },
    table_group: { width: 240, height: 180 },
    component_group: { width: 200, height: 70 },
  };
  const DEFAULT_VIEWBOX = { x: 0, y: 0, width: 1000, height: 1000 };
  const GRID_MINOR_STEP = 10;
  const GRID_MAJOR_STEP = 40;
  const WORKSPACE_EXPAND_CHUNK = 1000;
  const WORKSPACE_SURROUND = 2000;
  const WORKSPACE_EXPAND_TRIGGER_PX = 20;
  const KEYBOARD_NUDGE_STEP = 1;
  const KEYBOARD_ROTATE_STEP = 1;
  const ZOOM_STEP = 0.05;
  const ZOOM_VISIBLE_WIDTH_AT_100 = 1280;
  const DEFAULT_ANCHOR_STOPS = Array.from({ length: 11 }, (_, idx) => idx / 10);
  const MAX_SHAPE_TEXT_LENGTH = 500;
  const MAX_GROUP_CELLS = 576;
  const TABLE_MIN_CELL_WIDTH = 70;
  const TABLE_MIN_CELL_HEIGHT = 40;
  const HEADER_MIN_THICKNESS = 20;
  const FREE_ENDPOINT_SNAP_DISTANCE = 8;
  const CONTAINER_FREE_ENDPOINT_MARGIN = 8;
  const SHAPE_TOOLS_PER_PAGE = 24;
  const ANCHOR_SIDE_SWITCH_HYSTERESIS = 144;
  const HANDLE_SIZE = 8;
  const ROTATE_HANDLE_RADIUS = 6.5;
  const ROTATE_HANDLE_OFFSET = 18;
  const MIN_SHAPE_SIZE = 24;
  const HISTORY_LIMIT = 120;
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  const CONNECT_MODES = {
    connect_directional_connector: "directional_connector",
    connect_bidirectional_connector: "bidirectional_connector",
    connect_line: "line",
  };
  const TEXT_FORMAT_KEYS = ["bold", "italic", "underline", "overline", "subscript", "superscript"];
  const SHAPE_TOOL_DEFS = [
    { kind: "square", label: "Square" },
    { kind: "cube", label: "Cube" },
    { kind: "rectangle", label: "Rectangle" },
    { kind: "cuboid", label: "Cuboid" },
    { kind: "triangle", label: "Triangle" },
    { kind: "cone", label: "Cone" },
    { kind: "diamond", label: "Diamond" },
    { kind: "parallelogram", label: "Parallelogram" },
    { kind: "trapezoid", label: "Trapezoid" },
    { kind: "pentagon", label: "Pentagon" },
    { kind: "hexagon", label: "Hexagon" },
    { kind: "octagon", label: "Octagon" },
    { kind: "circle", label: "Circle" },
    { kind: "oval", label: "Oval" },
    { kind: "cylinder", label: "Cylinder" },
    { kind: "hexagonal_prism", label: "Hexagonal Prism" },
    { kind: "and", label: "And" },
    { kind: "or", label: "Or" },
    { kind: "message", label: "Message" },
    { kind: "mail", label: "Mail" },
    { kind: "cloud", label: "Cloud" },
    { kind: "cloud_callout", label: "Cloud Callout" },
    { kind: "card", label: "Card" },
    { kind: "note", label: "Note" },
    { kind: "text_box", label: "Text" },
    { kind: "actor", label: "Actor" },
  ];
  const CONNECTION_TOOL_DEFS = [
    { mode: "connect_directional_connector", label: "Directional Connector" },
    { mode: "connect_bidirectional_connector", label: "Bi-directional Connector" },
    { mode: "connect_line", label: "Line" },
  ];
  const CONTAINER_TOOL_DEFS = [
    { kind: "container", label: "Standard Container" },
    { kind: "header_container", label: "Header Container" },
  ];
  const GROUP_TOOL_DEFS = [
    { kind: "table_group", label: "Table" },
    { kind: "component_group", label: "Component Group" },
  ];

  const CONTAINER_KINDS = new Set(["container", "header_container"]);
  const GROUP_FORM_KINDS = new Set(["table_group", "component_group"]);
  const FRAME_ANCHOR_EXCEPTION_KINDS = new Set([
    "actor",
    "cloud",
    "cloud_callout",
    "card",
    "note",
    "mail",
    "message",
  ]);
  const SHAPE_KINDS = new Set([
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
  ]);

  const state = {
    elf: "",
    model: null,
    mode: "select",
    selected: null, // {type: "shape" | "arrow", id: "..."}
    connectSourceId: null,
    connectSourceEndpoint: null,
    drag: null,
    arrowRenderCache: {},
    history: [],
    future: [],
    clipboard: null,
    selectedShapeIds: [],
    selectedArrowIds: [],
    selectedGroupComponents: [],
    selectedArrowHandle: null,
    shapeToolPage: 0,
    connectPreview: null,
    richTextSelection: null,
    richTextPendingFormat: null,
    richTextPendingSticky: false,
    richTextToolbarInteraction: false,
    view: {
      zoom: 1,
      minZoom: 0.05,
      maxZoom: 5,
      pendingScroll: null,
    },
  };

  const els = {
    elfInput: document.getElementById("elf-input"),
    loadBtn: document.getElementById("load-btn"),
    saveBtn: document.getElementById("save-btn"),
    generateBtn: document.getElementById("generate-btn"),
    toolSelectBtn: document.getElementById("tool-select"),
    connectionToolsGrid: document.getElementById("connection-tools-grid"),
    shapeToolsGrid: document.getElementById("shape-tools-grid"),
    shapePagePrev: document.getElementById("shape-page-prev"),
    shapePageInput: document.getElementById("shape-page-input"),
    shapePageNext: document.getElementById("shape-page-next"),
    containerToolsGrid: document.getElementById("container-tools-grid"),
    groupToolsGrid: document.getElementById("group-tools-grid"),
    deleteBtn: document.getElementById("delete-btn"),
    zoomInBtn: document.getElementById("zoom-in-btn"),
    zoomOutBtn: document.getElementById("zoom-out-btn"),
    recenterBtn: document.getElementById("recenter-btn"),
    zoomResetBtn: document.getElementById("zoom-reset-btn"),
    zoomCombobox: document.getElementById("zoom-combobox"),
    zoomInput: document.getElementById("zoom-input"),
    zoomMenuBtn: document.getElementById("zoom-menu-btn"),
    zoomPresetsMenu: document.getElementById("zoom-presets-menu"),
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

  function isGroupFormKind(kind) {
    return GROUP_FORM_KINDS.has(String(kind || "").trim().toLowerCase());
  }

  function usesContainerPalette(kind) {
    return isContainerKind(kind) || isGroupFormKind(kind);
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
    if (kind === "cube") return "Cube";
    if (kind === "rectangle") return "Rectangle";
    if (kind === "cuboid") return "Cuboid";
    if (kind === "container") return "Container";
    if (kind === "header_container") return "Header";
    if (kind === "circle") return "Circle";
    if (kind === "oval") return "Oval";
    if (kind === "triangle") return "Triangle";
    if (kind === "cone") return "Cone";
    if (kind === "diamond") return "Diamond";
    if (kind === "parallelogram") return "Parallelogram";
    if (kind === "trapezoid") return "Trapezoid";
    if (kind === "pentagon") return "Pentagon";
    if (kind === "hexagon") return "Hexagon";
    if (kind === "octagon") return "Octagon";
    if (kind === "cylinder") return "Cylinder";
    if (kind === "hexagonal_prism") return "Hexagonal Prism";
    if (kind === "and") return "And";
    if (kind === "or") return "Or";
    if (kind === "message") return "Message";
    if (kind === "mail") return "Mail";
    if (kind === "actor") return "Actor";
    if (kind === "cloud") return "Cloud";
    if (kind === "cloud_callout") return "Cloud Callout";
    if (kind === "card") return "Card";
    if (kind === "note") return "Note";
    if (kind === "text_box") return "Text";
    if (kind === "table_group") return "Table";
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

  function normalizeRotation(raw) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return 0;
    let normalized = value % 360;
    if (normalized < 0) normalized += 360;
    if (Math.abs(normalized - 360) < 0.000001) normalized = 0;
    return normalized;
  }

  function shapeRotation(shape) {
    return normalizeRotation(shape && shape.rotation);
  }

  function degreesToRadians(degrees) {
    return (Number(degrees) || 0) * Math.PI / 180;
  }

  function rotatePoint(point, center, degrees) {
    if (!point || !center) return point;
    const radians = degreesToRadians(degrees);
    if (Math.abs(radians) < 0.000001) {
      return { x: point.x, y: point.y };
    }
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  }

  function inverseRotatePoint(point, center, degrees) {
    return rotatePoint(point, center, -degrees);
  }

  function shapeLocalPoint(point, shape) {
    if (!point || !shape) return point;
    const rotation = shapeRotation(shape);
    if (!rotation) {
      return { x: point.x, y: point.y };
    }
    return inverseRotatePoint(point, shapeCenter(shape), rotation);
  }

  function shapeWorldPoint(point, shape) {
    if (!point || !shape) return point;
    const rotation = shapeRotation(shape);
    if (!rotation) {
      return { x: point.x, y: point.y };
    }
    return rotatePoint(point, shapeCenter(shape), rotation);
  }

  function shapeTransform(shape) {
    const rotation = shapeRotation(shape);
    if (!rotation) return "";
    const center = shapeCenter(shape);
    return "rotate(" + roundNum(rotation) + " " + roundNum(center.x) + " " + roundNum(center.y) + ")";
  }

  function rotatedRectCorners(shape) {
    if (!shape) return [];
    const corners = [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x + shape.width, y: shape.y + shape.height },
      { x: shape.x, y: shape.y + shape.height },
    ];
    const rotation = shapeRotation(shape);
    if (!rotation) return corners;
    const center = shapeCenter(shape);
    return corners.map((corner) => rotatePoint(corner, center, rotation));
  }

  function boundsFromPoints(points) {
    if (!Array.isArray(points) || !points.length) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const left = Math.min.apply(null, xs);
    const top = Math.min.apply(null, ys);
    const right = Math.max.apply(null, xs);
    const bottom = Math.max.apply(null, ys);
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
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

  function normalizeAnchorFraction(raw, fallback) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return clamp(Number(fallback), 0, 1);
    return clamp(value, 0, 1);
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
      version: 5,
      metadata: {
        elf: elfName || "",
        viewBox: {
          x: DEFAULT_VIEWBOX.x,
          y: DEFAULT_VIEWBOX.y,
          width: DEFAULT_VIEWBOX.width,
          height: DEFAULT_VIEWBOX.height,
        },
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
    return (state.model.arrows || []).slice().sort((a, b) => {
      if ((a.z || 0) !== (b.z || 0)) return (a.z || 0) - (b.z || 0);
      return a.id.localeCompare(b.id);
    });
  }

  function sortedRenderableItems() {
    return []
      .concat((state.model.shapes || []).map((shape) => ({ type: "shape", item: shape })))
      .concat((state.model.arrows || []).map((arrow) => ({ type: "arrow", item: arrow })))
      .sort((a, b) => {
        const az = a.item.z || 0;
        const bz = b.item.z || 0;
        if (az !== bz) return az - bz;
        if (a.type !== b.type) return a.type === "arrow" ? -1 : 1;
        return String(a.item.id || "").localeCompare(String(b.item.id || ""));
      });
  }

  function isArrowEntity(item) {
    return !!(item && typeof item === "object" && item.from && item.to);
  }

  function compareRenderableEntities(a, b) {
    const az = Number(a && a.z) || 0;
    const bz = Number(b && b.z) || 0;
    if (az !== bz) return az - bz;
    const aArrow = isArrowEntity(a);
    const bArrow = isArrowEntity(b);
    if (aArrow !== bArrow) return aArrow ? -1 : 1;
    return String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
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
    const style = String(raw || "").toLowerCase().trim();
    if (style === "dashed" || style === "dotted") return style;
    return "solid";
  }

  function normalizeConnectionType(raw) {
    const t = String(raw || "").toLowerCase().trim();
    if (t === "arrow") return "directional_connector";
    if (t === "bi") return "bidirectional_connector";
    if (t === "directional_connector" || t === "bidirectional_connector" || t === "line") return t;
    return "directional_connector";
  }

  function connectionTypeLabel(connectionType) {
    const normalized = normalizeConnectionType(connectionType);
    if (normalized === "bidirectional_connector") return "bi-directional connector";
    if (normalized === "line") return "line";
    return "directional connector";
  }

  function shapeSupportsRounding(kind) {
    return (
      kind === "square" ||
      kind === "rectangle" ||
      kind === "text_box" ||
      kind === "container" ||
      kind === "header_container" ||
      kind === "table_group" ||
      kind === "component_group" ||
      kind === "triangle" ||
      kind === "diamond" ||
      kind === "parallelogram" ||
      kind === "trapezoid" ||
      kind === "pentagon" ||
      kind === "hexagon" ||
      kind === "octagon"
    );
  }

  function normalizeBorderStyle(raw) {
    const style = String(raw || "").toLowerCase().trim();
    if (style === "none" || style === "dashed" || style === "dotted") return style;
    return "solid";
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

  function normalizeGroupHeaderSide(raw) {
    const side = String(raw || "").toLowerCase().trim();
    if (side === "top" || side === "right" || side === "bottom" || side === "left" || side === "none") {
      return side;
    }
    return "top";
  }

  function normalizeGroupHeaderSize(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return clamp(n, 0, 2000);
  }

  function normalizeFontSize(raw, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return clamp(n, 8, 40);
  }

  function normalizeTextInset(raw, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback || 0;
    return clamp(n, 0, 200);
  }

  function dashArrayForStyle(style) {
    const normalized = String(style || "").toLowerCase().trim();
    if (normalized === "dashed") return "7 4";
    if (normalized === "dotted") return "1.2 5";
    return "";
  }

  function lineCapForStyle(style) {
    return String(style || "").toLowerCase().trim() === "dotted" ? "round" : "";
  }

  function normalizeComponentLabels(rawLabels, count) {
    const out = [];
    const safeCount = Math.max(1, Math.min(MAX_GROUP_CELLS, Number(count) || 1));
    if (Array.isArray(rawLabels)) {
      rawLabels.forEach((txt) => out.push(String(txt || "").trim()));
    }
    while (out.length < safeCount) {
      out.push("Item " + (out.length + 1));
    }
    return out.slice(0, safeCount);
  }

  function normalizeSegmentFractions(rawFractions, count) {
    const safeCount = Math.max(1, Math.min(MAX_GROUP_CELLS, Math.round(Number(count) || 1)));
    if (safeCount === 1) return [1];
    const source = Array.isArray(rawFractions) ? rawFractions : [];
    const out = [];
    for (let idx = 0; idx < safeCount; idx += 1) {
      const value = Number(source[idx]);
      out.push(Number.isFinite(value) && value > 0 ? value : 1);
    }
    const total = out.reduce((sum, value) => sum + value, 0);
    if (!(total > 0)) {
      return new Array(safeCount).fill(1 / safeCount);
    }
    return out.map((value) => value / total);
  }

  function defaultGroupComponent(index, groupShape) {
    return {
      text: "Item " + (index + 1),
      richText: "",
      fill: normalizeColor(groupShape && groupShape.fill, DEFAULT_CONTAINER_FILL),
      fillOverride: false,
      textColor: normalizeColor(groupShape && groupShape.textColor, DEFAULT_TEXT_COLOR),
      textAlign: "center",
      textVAlign: "center",
      fontSize: normalizeFontSize(groupShape && groupShape.fontSize, 12),
      fontFamily: normalizeFontFamily(groupShape && groupShape.fontFamily),
      textOffsetUp: normalizeTextInset(groupShape && groupShape.textOffsetUp, 0),
      textOffsetDown: normalizeTextInset(groupShape && groupShape.textOffsetDown, 0),
      textOffsetLeft: normalizeTextInset(groupShape && groupShape.textOffsetLeft, 0),
      textOffsetRight: normalizeTextInset(groupShape && groupShape.textOffsetRight, 0),
      textPadding: normalizeTextInset(groupShape && groupShape.textPadding, 0),
    };
  }

  function normalizeGroupComponents(rawComponents, count, groupShape, fallbackLabels) {
    const safeCount = Math.max(1, Math.min(MAX_GROUP_CELLS, Number(count) || 1));
    const labels = normalizeComponentLabels(fallbackLabels, safeCount);
    const source = Array.isArray(rawComponents) ? rawComponents : [];
    const out = [];
    for (let idx = 0; idx < safeCount; idx += 1) {
      const defaults = defaultGroupComponent(idx, groupShape || {});
      const raw = source[idx];
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const hasText = Object.prototype.hasOwnProperty.call(raw, "text");
        const hasLabel = Object.prototype.hasOwnProperty.call(raw, "label");
        const textSource = hasText
          ? raw.text
          : (hasLabel ? raw.label : (labels[idx] != null ? labels[idx] : defaults.text));
        const text = String(textSource == null ? "" : textSource);
        raw.text = text;
        raw.richText = typeof raw.richText === "string"
          ? raw.richText
          : plainTextToRichHtml(text);
        raw.fill = normalizeColor(raw.fill, defaults.fill);
        raw.fillOverride = !!(raw.fillOverride || raw.override);
        raw.textColor = normalizeColor(raw.textColor, defaults.textColor);
        raw.textAlign = normalizeTextAlign(raw.textAlign || defaults.textAlign);
        raw.textVAlign = normalizeTextVAlign(raw.textVAlign || defaults.textVAlign);
        raw.fontSize = normalizeFontSize(raw.fontSize, defaults.fontSize);
        raw.fontFamily = normalizeFontFamily(raw.fontFamily || defaults.fontFamily);
        raw.textOffsetUp = normalizeTextInset(raw.textOffsetUp, defaults.textOffsetUp);
        raw.textOffsetDown = normalizeTextInset(raw.textOffsetDown, defaults.textOffsetDown);
        raw.textOffsetLeft = normalizeTextInset(raw.textOffsetLeft, defaults.textOffsetLeft);
        raw.textOffsetRight = normalizeTextInset(raw.textOffsetRight, defaults.textOffsetRight);
        raw.textPadding = normalizeTextInset(raw.textPadding, defaults.textPadding);
        out.push(raw);
        continue;
      }
      if (typeof raw === "string" && raw.trim()) {
        const text = raw.trim();
        const next = Object.assign({}, defaults);
        next.text = text;
        next.richText = plainTextToRichHtml(text);
        out.push(next);
        continue;
      }
      const next = Object.assign({}, defaults);
      next.text = labels[idx] || next.text;
      next.richText = plainTextToRichHtml(next.text);
      out.push(next);
    }
    return out;
  }

  function groupComponentSelectionKey(shapeId, componentIndex) {
    return "component:" + String(shapeId || "") + ":" + String(componentIndex);
  }

  function effectiveGroupComponentFill(shape, component) {
    if (!component || !component.fillOverride) {
      return normalizeColor(shape && shape.fill, DEFAULT_CONTAINER_FILL);
    }
    return normalizeColor(component.fill, normalizeColor(shape && shape.fill, DEFAULT_CONTAINER_FILL));
  }

  function normalizeColor(color, fallback) {
    const value = String(color || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    return fallback || "#1c2f4f";
  }

  function isNearlyInteger(value) {
    return Math.abs(Number(value) - Math.round(Number(value))) < 0.000001;
  }

  function snapToStep(value, step) {
    const safeStep = Math.max(1, Number(step) || 1);
    return Math.round(Number(value || 0) / safeStep) * safeStep;
  }

  function nudgeFromCurrent(value, direction, stepSize) {
    const current = Number(value) || 0;
    const step = Math.max(1, Number(stepSize) || 1);
    if (!isNearlyInteger(current)) {
      return direction > 0 ? Math.ceil(current) : Math.floor(current);
    }
    return current + direction * step;
  }

  function swatchTextColor(hex) {
    const value = normalizeColor(hex, "#1c2f4f").replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance >= 154 ? "#122033" : "#f7fbff";
  }

  function darken(hex, amount) {
    const h = String(hex || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#80b6ff";
    const r = clamp(parseInt(h.slice(0, 2), 16) + amount, 0, 255);
    const g = clamp(parseInt(h.slice(2, 4), 16) + amount, 0, 255);
    const b = clamp(parseInt(h.slice(4, 6), 16) + amount, 0, 255);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function ensureModelDefaults() {
    if (!state.model) state.model = defaultModel(state.elf);
    if (!state.model.metadata) state.model.metadata = {};
    if (!state.model.metadata.viewBox) {
      state.model.metadata.viewBox = {
        x: DEFAULT_VIEWBOX.x,
        y: DEFAULT_VIEWBOX.y,
        width: DEFAULT_VIEWBOX.width,
        height: DEFAULT_VIEWBOX.height,
      };
    }
    state.model.metadata.viewBox.x = Number.isFinite(Number(state.model.metadata.viewBox.x))
      ? Number(state.model.metadata.viewBox.x)
      : DEFAULT_VIEWBOX.x;
    state.model.metadata.viewBox.y = Number.isFinite(Number(state.model.metadata.viewBox.y))
      ? Number(state.model.metadata.viewBox.y)
      : DEFAULT_VIEWBOX.y;
    state.model.metadata.viewBox.width = Math.max(DEFAULT_VIEWBOX.width, Number(state.model.metadata.viewBox.width) || DEFAULT_VIEWBOX.width);
    state.model.metadata.viewBox.height = Math.max(DEFAULT_VIEWBOX.height, Number(state.model.metadata.viewBox.height) || DEFAULT_VIEWBOX.height);
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
      shape.rotation = normalizeRotation(shape.rotation);
      if (shape.kind === "square" || shape.kind === "circle") {
        const side = Math.max(shape.width, shape.height);
        shape.width = side;
        shape.height = side;
      }
      const usesContainerColors = usesContainerPalette(shape.kind);
      shape.fill = normalizeColor(shape.fill, usesContainerColors ? "#0d172a" : "#1c2f4f");
      shape.stroke = normalizeColor(shape.stroke, usesContainerColors ? "#eef3ff" : "#80b6ff");
      shape.borderStyle = normalizeBorderStyle(shape.kind === "text_box" && !shape.borderStyle ? "none" : shape.borderStyle);
      shape.borderWidth = normalizeBorderWidth(shape.borderWidth, defaultBorderWidth(shape.kind));
      shape.textColor = normalizeColor(shape.textColor, "#f4f7ff");
      shape.rounded = shapeSupportsRounding(shape.kind) ? shape.rounded !== false : false;
      shape.textAlign = normalizeTextAlign(shape.textAlign || "center");
      shape.textVAlign = normalizeTextVAlign(shape.textVAlign || "center");
      shape.fontSize = normalizeFontSize(shape.fontSize, 12);
      shape.fontFamily = normalizeFontFamily(shape.fontFamily);
      shape.noBackground = shape.kind === "text_box" ? shape.noBackground !== false : !!shape.noBackground;
      shape.textOffsetUp = normalizeTextInset(shape.textOffsetUp, 0);
      shape.textOffsetDown = normalizeTextInset(shape.textOffsetDown, 0);
      shape.textOffsetLeft = normalizeTextInset(shape.textOffsetLeft, 0);
      shape.textOffsetRight = normalizeTextInset(shape.textOffsetRight, 0);
      shape.textPadding = normalizeTextInset(shape.textPadding, 0);
      shape.groupHeaderSide = normalizeGroupHeaderSide(shape.groupHeaderSide);
      shape.groupHeaderSize = normalizeGroupHeaderSize(shape.groupHeaderSize);
      shape.componentDirection = normalizeComponentDirection(shape.componentDirection);
      const defaultComponentCount = shape.kind === "component_group" ? 4 : 1;
      shape.componentCount = Math.max(1, Math.min(24, Math.round(Number.isFinite(Number(shape.componentCount)) ? Number(shape.componentCount) : defaultComponentCount)));
      shape.componentFractions = normalizeSegmentFractions(shape.componentFractions, shape.componentCount);
      shape.tableRows = Math.max(1, Math.min(24, Math.round(Number.isFinite(Number(shape.tableRows)) ? Number(shape.tableRows) : 2)));
      shape.tableCols = Math.max(1, Math.min(24, Math.round(Number.isFinite(Number(shape.tableCols)) ? Number(shape.tableCols) : 2)));
      shape.rowFractions = normalizeSegmentFractions(shape.rowFractions, shape.tableRows);
      shape.colFractions = normalizeSegmentFractions(shape.colFractions, shape.tableCols);
      if (isGroupFormKind(shape.kind)) {
        const rawComponentLabels = Array.isArray(shape.componentLabels) && shape.componentLabels.length
          ? shape.componentLabels
          : [];
        const normalizedCount = shape.kind === "table_group"
          ? (shape.tableRows * shape.tableCols)
          : shape.componentCount;
        shape.components = normalizeGroupComponents(shape.components, normalizedCount, shape, rawComponentLabels);
      } else if (shape.components) {
        delete shape.components;
      }
      ensureShapeMinimumSizeByKind(shape);
      if (shape.componentLabels) delete shape.componentLabels;
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

    const maxShapeZ = state.model.shapes.length
      ? Math.max.apply(null, state.model.shapes.map((shape) => shape.z || 0))
      : 0;

    state.model.arrows.forEach((arrow, idx) => {
      arrow.id = sanitizeId(arrow.id || ("arrow_" + (idx + 1)));
      arrow.from = arrow.from && typeof arrow.from === "object" ? arrow.from : {};
      arrow.to = arrow.to && typeof arrow.to === "object" ? arrow.to : {};
      arrow.from.shapeId = shapeById(String(arrow.from.shapeId || "")) ? String(arrow.from.shapeId || "") : "";
      arrow.to.shapeId = shapeById(String(arrow.to.shapeId || "")) ? String(arrow.to.shapeId || "") : "";
      arrow.from.side = normalizeSide(arrow.from.side || "right");
      arrow.to.side = normalizeSide(arrow.to.side || "left");
      const maxAnchor = Math.max(1, anchorCount() - 1);
      const fallbackAnchor = Math.floor(maxAnchor / 2);
      arrow.from.anchorIndex = normalizeAnchorIndex(arrow.from.anchorIndex, maxAnchor, fallbackAnchor);
      arrow.to.anchorIndex = normalizeAnchorIndex(arrow.to.anchorIndex, maxAnchor, fallbackAnchor);
      arrow.from.anchorFraction = normalizeAnchorFraction(
        arrow.from.anchorFraction,
        anchorFractionForIndex(arrow.from.anchorIndex)
      );
      arrow.to.anchorFraction = normalizeAnchorFraction(
        arrow.to.anchorFraction,
        anchorFractionForIndex(arrow.to.anchorIndex)
      );
      arrow.from.x = Number.isFinite(Number(arrow.from.x)) ? Number(arrow.from.x) : 0;
      arrow.from.y = Number.isFinite(Number(arrow.from.y)) ? Number(arrow.from.y) : 0;
      arrow.to.x = Number.isFinite(Number(arrow.to.x)) ? Number(arrow.to.x) : 0;
      arrow.to.y = Number.isFinite(Number(arrow.to.y)) ? Number(arrow.to.y) : 0;
      arrow.lineStyle = normalizeLineStyle(arrow.lineStyle);
      arrow.routing = normalizeRouting(arrow.routing);
      arrow.connectionType = normalizeConnectionType(arrow.connectionType);
      arrow.stroke = normalizeColor(arrow.stroke, "#e8efff");
      arrow.width = Math.max(0.5, Number(arrow.width) || 1.7);
      arrow.z = Number(arrow.z);
      if (!Number.isFinite(arrow.z)) arrow.z = maxShapeZ + idx + 1;
      arrow.parentId = arrow.parentId ? String(arrow.parentId) : null;
      if (!Array.isArray(arrow.waypoints)) arrow.waypoints = [];
      if (!Array.isArray(arrow.controlPoints)) arrow.controlPoints = [];
      arrow.waypoints = arrow.waypoints.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
      arrow.controlPoints = arrow.controlPoints.slice(0, 2).map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
    });

    dedupeShapeIds();
    dedupeArrowIds();
    const currentContainerIds = new Set(state.model.shapes.filter((s) => isContainerKind(s.kind)).map((s) => s.id));
    state.model.arrows = state.model.arrows.filter((arrow) => {
      const fromValid = (arrow.from.shapeId && shapeById(arrow.from.shapeId)) || (!arrow.from.shapeId && Number.isFinite(arrow.from.x) && Number.isFinite(arrow.from.y));
      const toValid = (arrow.to.shapeId && shapeById(arrow.to.shapeId)) || (!arrow.to.shapeId && Number.isFinite(arrow.to.x) && Number.isFinite(arrow.to.y));
      return !!(fromValid && toValid);
    });
    state.model.arrows.forEach((arrow) => {
      if (!arrow.parentId || !currentContainerIds.has(arrow.parentId) || !arrowIsFullyFree(arrow)) {
        arrow.parentId = null;
      }
    });
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
      if (arrow.parentId === oldId) arrow.parentId = nextId;
    });
    if (state.selected && state.selected.type === "shape" && state.selected.id === oldId) {
      state.selected.id = nextId;
    }
    if (state.connectSourceId === oldId) {
      state.connectSourceId = nextId;
    }
    if (Array.isArray(state.selectedShapeIds) && state.selectedShapeIds.length) {
      state.selectedShapeIds = state.selectedShapeIds.map((id) => id === oldId ? nextId : id);
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
    state.selectedShapeIds = [];
    state.selectedArrowIds = [];
    state.selectedGroupComponents = [];
    state.connectSourceId = null;
    render();
    setStatus("Undo applied.", "ok");
  }

  function normalizeSelectionIds(ids) {
    const out = [];
    const seen = new Set();
    (ids || []).forEach((id) => {
      if (!id || seen.has(id) || !shapeById(id)) return;
      seen.add(id);
      out.push(id);
    });
    return out;
  }

  function currentSelectedShapeIds() {
    if (Array.isArray(state.selectedShapeIds) && state.selectedShapeIds.length) {
      return normalizeSelectionIds(state.selectedShapeIds);
    }
    if (state.selected && state.selected.type === "shape" && shapeById(state.selected.id)) {
      return [state.selected.id];
    }
    return [];
  }

  function normalizeArrowSelectionIds(ids) {
    const out = [];
    const seen = new Set();
    (ids || []).forEach((id) => {
      if (!id || seen.has(id) || !arrowById(id)) return;
      seen.add(id);
      out.push(id);
    });
    return out;
  }

  function currentSelectedArrowIds() {
    if (Array.isArray(state.selectedArrowIds) && state.selectedArrowIds.length) {
      return normalizeArrowSelectionIds(state.selectedArrowIds);
    }
    if (state.selected && state.selected.type === "arrow" && arrowById(state.selected.id)) {
      return [state.selected.id];
    }
    return [];
  }

  function normalizeArrowHandle(handle) {
    if (!handle || typeof handle !== "object") return null;
    const arrow = arrowById(handle.arrowId);
    if (!arrow) return null;
    const type = String(handle.type || "").toLowerCase();
    if (type === "endpoint") {
      const endpointKey = handle.endpointKey === "to" ? "to" : "from";
      return {
        type: "endpoint",
        arrowId: arrow.id,
        endpointKey: endpointKey,
      };
    }
    if (type === "waypoint") {
      const waypointIndex = Math.round(Number(handle.waypointIndex) || 0);
      if (!arrow.waypoints || !arrow.waypoints[waypointIndex]) return null;
      return {
        type: "waypoint",
        arrowId: arrow.id,
        waypointIndex: waypointIndex,
      };
    }
    if (type === "control") {
      const cpIndex = Math.round(Number(handle.cpIndex) || 0);
      if (cpIndex < 0 || cpIndex > 1) return null;
      return {
        type: "control",
        arrowId: arrow.id,
        cpIndex: cpIndex,
      };
    }
    return null;
  }

  function sameArrowHandle(a, b) {
    const ha = normalizeArrowHandle(a);
    const hb = normalizeArrowHandle(b);
    if (!ha && !hb) return true;
    if (!ha || !hb || ha.type !== hb.type || ha.arrowId !== hb.arrowId) return false;
    if (ha.type === "endpoint") return ha.endpointKey === hb.endpointKey;
    if (ha.type === "waypoint") return ha.waypointIndex === hb.waypointIndex;
    if (ha.type === "control") return ha.cpIndex === hb.cpIndex;
    return false;
  }

  function currentSelectedArrowHandle() {
    const handle = normalizeArrowHandle(state.selectedArrowHandle);
    if (!handle) return null;
    const selectedIds = currentSelectedArrowIds();
    if (selectedIds.length !== 1 || selectedIds[0] !== handle.arrowId) return null;
    return handle;
  }

  function setSelectedArrowHandle(handle, skipRender) {
    state.selectedArrowHandle = normalizeArrowHandle(handle);
    if (!skipRender) render();
  }

  function isArrowSelected(arrowId) {
    return currentSelectedArrowIds().indexOf(arrowId) >= 0;
  }

  function setArrowSelection(ids, primaryId, skipRender) {
    const nextIds = normalizeArrowSelectionIds(ids);
    state.selectedArrowIds = nextIds;
    state.selectedShapeIds = [];
    state.selectedGroupComponents = [];
    const nextHandle = currentSelectedArrowHandle();
    state.selectedArrowHandle = nextIds.length === 1 && nextHandle && nextHandle.arrowId === nextIds[0]
      ? nextHandle
      : null;
    if (!nextIds.length) {
      state.selected = null;
    } else {
      const primary = nextIds.indexOf(primaryId) >= 0 ? primaryId : nextIds[nextIds.length - 1];
      state.selected = { type: "arrow", id: primary };
    }
    if (!skipRender) render();
  }

  function normalizeGroupComponentSelections(entries) {
    const out = [];
    const seen = new Set();
    (entries || []).forEach((entry) => {
      const shape = shapeById(entry && entry.shapeId);
      if (!shape || !isGroupFormKind(shape.kind)) return;
      const count = groupFormLayout(shape).components.length;
      const componentIndex = clamp(Math.round(Number(entry && entry.componentIndex) || 0), 0, Math.max(0, count - 1));
      const key = groupComponentSelectionKey(shape.id, componentIndex);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ shapeId: shape.id, componentIndex: componentIndex });
    });
    return out;
  }

  function currentSelectedGroupComponents() {
    if (Array.isArray(state.selectedGroupComponents) && state.selectedGroupComponents.length) {
      return normalizeGroupComponentSelections(state.selectedGroupComponents);
    }
    if (state.selected && state.selected.type === "group_component") {
      return normalizeGroupComponentSelections([state.selected]);
    }
    return [];
  }

  function isGroupComponentSelected(shapeId, componentIndex) {
    const key = groupComponentSelectionKey(shapeId, componentIndex);
    return currentSelectedGroupComponents().some((entry) => groupComponentSelectionKey(entry.shapeId, entry.componentIndex) === key);
  }

  function setGroupComponentSelection(entries, primaryEntry, skipRender) {
    const nextEntries = normalizeGroupComponentSelections(entries);
    state.selectedGroupComponents = nextEntries;
    state.selectedShapeIds = [];
    state.selectedArrowIds = [];
    state.selectedArrowHandle = null;
    if (!nextEntries.length) {
      state.selected = null;
    } else {
      const primaryKey = primaryEntry ? groupComponentSelectionKey(primaryEntry.shapeId, primaryEntry.componentIndex) : "";
      const primary = nextEntries.find((entry) => groupComponentSelectionKey(entry.shapeId, entry.componentIndex) === primaryKey) || nextEntries[nextEntries.length - 1];
      state.selected = {
        type: "group_component",
        shapeId: primary.shapeId,
        componentIndex: primary.componentIndex,
      };
    }
    if (!skipRender) render();
  }

  function isShapeSelected(shapeId) {
    return currentSelectedShapeIds().indexOf(shapeId) >= 0;
  }

  function topLevelShapeIds(ids) {
    const selectedIds = normalizeSelectionIds(ids);
    return selectedIds.filter((id) => !selectedIds.some((otherId) => otherId !== id && isDescendant(id, otherId)));
  }

  function setShapeSelection(ids, primaryId, skipRender) {
    const nextIds = normalizeSelectionIds(ids);
    state.selectedShapeIds = nextIds;
    state.selectedArrowIds = [];
    state.selectedGroupComponents = [];
    state.selectedArrowHandle = null;
    if (!nextIds.length) {
      state.selected = null;
    } else {
      const primary = nextIds.indexOf(primaryId) >= 0 ? primaryId : nextIds[nextIds.length - 1];
      state.selected = { type: "shape", id: primary };
    }
    if (!skipRender) render();
  }

  function renderableItems() {
    return []
      .concat(state.model.shapes || [])
      .concat(state.model.arrows || []);
  }

  function minRenderableZ() {
    const items = renderableItems();
    return items.length ? Math.min.apply(null, items.map((item) => item.z || 0)) : 0;
  }

  function maxRenderableZ() {
    const items = renderableItems();
    return items.length ? Math.max.apply(null, items.map((item) => item.z || 0)) : 0;
  }

  function bringRenderableItemsToFront(items) {
    const ordered = (items || []).filter(Boolean).slice().sort(compareRenderableEntities);
    if (!ordered.length) return;
    let nextZ = maxRenderableZ();
    ordered.forEach((item) => {
      nextZ += 1;
      item.z = nextZ;
    });
  }

  function sendRenderableItemsToBack(items) {
    const ordered = (items || []).filter(Boolean).slice().sort(compareRenderableEntities);
    if (!ordered.length) return;
    let nextZ = minRenderableZ() - ordered.length;
    ordered.forEach((item) => {
      item.z = nextZ;
      nextZ += 1;
    });
  }

  function moveRenderableItemsInZ(items, direction) {
    if (direction === "back") {
      sendRenderableItemsToBack(items);
    } else {
      bringRenderableItemsToFront(items);
    }
    syncStackContainment();
  }

  function pointInShapeFrame(point, shape) {
    if (!point || !shape) return false;
    const local = shapeLocalPoint(point, shape);
    return (
      local.x >= shape.x &&
      local.x <= shape.x + shape.width &&
      local.y >= shape.y &&
      local.y <= shape.y + shape.height
    );
  }

  function rectInsideShapeFrame(rect, shape) {
    if (!rect || !shape) return false;
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height },
    ];
    return corners.every((corner) => pointInShapeFrame(corner, shape));
  }

  function candidateContainersForPoint(point, itemZ, excludeShapeId) {
    return (state.model.shapes || []).filter((shape) => {
      if (!isContainerKind(shape.kind)) return false;
      if (shape.id === excludeShapeId) return false;
      if (excludeShapeId && isDescendant(shape.id, excludeShapeId)) return false;
      if ((Number(itemZ) || 0) <= (Number(shape.z) || 0)) return false;
      return pointInShapeFrame(point, shape);
    }).sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      if (areaA !== areaB) return areaA - areaB;
      return (Number(b.z) || 0) - (Number(a.z) || 0);
    });
  }

  function containersContainingPoint(point) {
    return (state.model.shapes || []).filter((shape) => {
      if (!isContainerKind(shape.kind)) return false;
      return pointInShapeFrame(point, shape);
    }).sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      if (areaA !== areaB) return areaA - areaB;
      return (Number(b.z) || 0) - (Number(a.z) || 0);
    });
  }

  function pickStackContainerForShape(shape) {
    if (!shape) return null;
    return candidateContainersForPoint(shapeCenter(shape), shape.z, shape.id)[0] || null;
  }

  function arrowIsFullyFree(arrow) {
    return !!(arrow && arrow.from && arrow.to && !arrow.from.shapeId && !arrow.to.shapeId);
  }

  function arrowParentingPoints(arrow) {
    if (!arrowIsFullyFree(arrow)) return [];
    const points = [
      { x: Number(arrow.from.x) || 0, y: Number(arrow.from.y) || 0 },
      { x: Number(arrow.to.x) || 0, y: Number(arrow.to.y) || 0 },
    ];
    (arrow.waypoints || []).forEach((point) => {
      points.push({ x: Number(point.x) || 0, y: Number(point.y) || 0 });
    });
    (arrow.controlPoints || []).forEach((point) => {
      points.push({ x: Number(point.x) || 0, y: Number(point.y) || 0 });
    });
    return points;
  }

  function arrowParentingBounds(arrow) {
    const points = arrowParentingPoints(arrow);
    if (!points.length) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  function pickContainerForFreeArrow(arrow, requireAboveContainer) {
    if (!arrowIsFullyFree(arrow)) return null;
    const bounds = arrowParentingBounds(arrow);
    if (!bounds) return null;
    const candidates = (state.model.shapes || []).filter((shape) => {
      if (!isContainerKind(shape.kind)) return false;
      if (requireAboveContainer && (Number(arrow.z) || 0) <= (Number(shape.z) || 0)) return false;
      return rectInsideShapeFrame(bounds, shape);
    }).sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      if (areaA !== areaB) return areaA - areaB;
      return (Number(b.z) || 0) - (Number(a.z) || 0);
    });
    return candidates[0] || null;
  }

  function pickStackContainerForArrow(arrow) {
    return pickContainerForFreeArrow(arrow, true);
  }

  function syncShapeStackContainment(shape) {
    if (!shape) return;
    const prevParent = shape.parentId || null;
    const parent = pickStackContainerForShape(shape);
    const nextParent = parent ? parent.id : null;
    if (prevParent === nextParent) return;
    shape.parentId = nextParent;
    if (!shape.idManual) {
      updateAutoId(shape, prevParent);
    }
  }

  function syncArrowContainerAttachment(arrow) {
    if (!arrow) return;
    const parent = pickStackContainerForArrow(arrow);
    arrow.parentId = parent ? parent.id : null;
  }

  function finalizeMovedArrowContainment(arrow) {
    if (!arrow) return;
    if (!arrowIsFullyFree(arrow)) {
      arrow.parentId = null;
      return;
    }
    const parent = pickContainerForFreeArrow(arrow, false);
    if (!parent) {
      arrow.parentId = null;
      return;
    }
    arrow.z = Math.max(Number(arrow.z) || 0, containerFrontZ(parent) + 1);
    arrow.parentId = parent.id;
  }

  function promoteArrowAboveContainerPoints(arrow, points) {
    if (!arrow) return;
    let requiredTopZ = null;
    (points || []).forEach((point) => {
      containersContainingPoint(point).forEach((container) => {
        const frontZ = containerFrontZ(container);
        requiredTopZ = requiredTopZ === null ? frontZ : Math.max(requiredTopZ, frontZ);
      });
    });
    if (requiredTopZ === null) return;
    if ((Number(arrow.z) || 0) > requiredTopZ) return;
    arrow.z = requiredTopZ + 1;
  }

  function syncStackContainment() {
    (state.model.shapes || []).forEach((shape) => syncShapeStackContainment(shape));
    (state.model.arrows || []).forEach((arrow) => syncArrowContainerAttachment(arrow));
  }

  function containerFrontZ(container, excludeShapeId) {
    if (!container) return 0;
    let maxZ = Number(container.z) || 0;
    (state.model.shapes || []).forEach((shape) => {
      if (!shape || shape.id === container.id || shape.id === excludeShapeId) return;
      if (shape.parentId === container.id) {
        maxZ = Math.max(maxZ, Number(shape.z) || 0);
      }
    });
    (state.model.arrows || []).forEach((arrow) => {
      if (arrow.parentId === container.id) {
        maxZ = Math.max(maxZ, Number(arrow.z) || 0);
      }
    });
    return maxZ;
  }

  function moveShapeIdsForSelection(ids) {
    const rootIds = topLevelShapeIds(ids);
    const moveIds = [];
    const arrowIds = [];
    const seen = new Set();
    const seenArrows = new Set();
    rootIds.forEach((id) => {
      if (!seen.has(id)) {
        seen.add(id);
        moveIds.push(id);
      }
      const shape = shapeById(id);
      if (shape && isContainerKind(shape.kind)) {
        descendantsOf(id).forEach((childId) => {
          if (!seen.has(childId)) {
            seen.add(childId);
            moveIds.push(childId);
          }
        });
      }
    });
    moveIds.forEach((id) => {
      const shape = shapeById(id);
      if (!shape || !isContainerKind(shape.kind)) return;
      (state.model.arrows || []).forEach((arrow) => {
        if (arrow.parentId !== id || seenArrows.has(arrow.id)) return;
        seenArrows.add(arrow.id);
        arrowIds.push(arrow.id);
      });
    });
    return {
      rootIds: rootIds,
      moveIds: moveIds,
      arrowIds: arrowIds,
    };
  }

  function finalizeMovedRoots(rootIds) {
    (rootIds || []).forEach((rootId) => {
      const moved = shapeById(rootId);
      if (!moved) return;
      const prevParent = moved.parentId;
      const parent = pickContainerForShape(moved);
      if (parent) {
        moved.z = Math.max(Number(moved.z) || 0, containerFrontZ(parent, moved.id) + 1);
      }
      moved.parentId = parent ? parent.id : null;
      if (moved.parentId !== prevParent) {
        updateAutoId(moved, prevParent);
      }
    });
  }

  function promoteDraggedItemsAboveContainers(shapeIds, arrowIds) {
    const movedShapes = (shapeIds || []).map((id) => shapeById(id)).filter(Boolean);
    const movedArrows = (arrowIds || []).map((id) => arrowById(id)).filter(Boolean);
    const movedItems = movedShapes.concat(movedArrows);
    if (!movedItems.length) return;

    let requiredTopZ = null;
    movedShapes.forEach((shape) => {
      const parent = pickContainerForShape(shape);
      if (!parent) return;
      const frontZ = containerFrontZ(parent, shape.id);
      requiredTopZ = requiredTopZ === null ? frontZ : Math.max(requiredTopZ, frontZ);
    });
    movedArrows.forEach((arrow) => {
      const geom = buildArrowGeometry(arrow);
      [geom.from, geom.to]
        .concat(geom.waypoints || [])
        .concat(geom.controlPoints || [])
        .forEach((point) => {
          containersContainingPoint(point).forEach((container) => {
            const frontZ = containerFrontZ(container);
            requiredTopZ = requiredTopZ === null ? frontZ : Math.max(requiredTopZ, frontZ);
          });
        });
    });
    if (requiredTopZ === null) return;

    const currentTopZ = Math.max.apply(null, movedItems.map((item) => Number(item.z) || 0));
    if (currentTopZ > requiredTopZ) return;
    const delta = requiredTopZ + 1 - currentTopZ;
    movedItems.forEach((item) => {
      item.z = (Number(item.z) || 0) + delta;
    });
  }

  function moveSelectedShapesBy(dx, dy) {
    const selectedIds = currentSelectedShapeIds();
    if (!selectedIds.length) return false;
    const movePlan = moveShapeIdsForSelection(selectedIds);
    if (!movePlan.moveIds.length) return false;
    const primary = shapeById(state.selected && state.selected.type === "shape" ? state.selected.id : movePlan.rootIds[0]);
    const axisDx = dx
      ? (nudgeFromCurrent(primary ? primary.x : 0, Math.sign(dx), KEYBOARD_NUDGE_STEP) - (primary ? primary.x : 0))
      : 0;
    const axisDy = dy
      ? (nudgeFromCurrent(primary ? primary.y : 0, Math.sign(dy), KEYBOARD_NUDGE_STEP) - (primary ? primary.y : 0))
      : 0;
    if (!axisDx && !axisDy) return false;
    pushHistory();
    movePlan.moveIds.forEach((id) => {
      const shape = shapeById(id);
      if (!shape) return;
      shape.x += axisDx;
      shape.y += axisDy;
    });
    movePlan.arrowIds.forEach((id) => {
      const arrow = arrowById(id);
      if (!arrow) return;
      translateArrowBy(arrow, snapshotArrowForMove(arrow), axisDx, axisDy);
    });
    finalizeMovedRoots(movePlan.rootIds);
    syncStackContainment();
    syncCanvasRectToContent();
    render();
    return true;
  }

  function moveSelectedArrowsBy(dx, dy) {
    const arrows = currentSelectedArrowIds()
      .map((id) => arrowById(id))
      .filter((arrow) => arrow && arrowIsMovable(arrow));
    if (!arrows.length) return false;
    const primary = arrows[0];
    const referenceX = !primary.from.shapeId
      ? primary.from.x
      : (!primary.to.shapeId ? primary.to.x : (primary.waypoints[0] ? primary.waypoints[0].x : primary.controlPoints[0] && primary.controlPoints[0].x));
    const referenceY = !primary.from.shapeId
      ? primary.from.y
      : (!primary.to.shapeId ? primary.to.y : (primary.waypoints[0] ? primary.waypoints[0].y : primary.controlPoints[0] && primary.controlPoints[0].y));
    const axisDx = dx
      ? (nudgeFromCurrent(referenceX || 0, Math.sign(dx), KEYBOARD_NUDGE_STEP) - (referenceX || 0))
      : 0;
    const axisDy = dy
      ? (nudgeFromCurrent(referenceY || 0, Math.sign(dy), KEYBOARD_NUDGE_STEP) - (referenceY || 0))
      : 0;
    if (!axisDx && !axisDy) return false;
    pushHistory();
    arrows.forEach((arrow) => {
      translateArrowBy(arrow, snapshotArrowForMove(arrow), axisDx, axisDy);
    });
    arrows.forEach((arrow) => finalizeMovedArrowContainment(arrow));
    syncCanvasRectToContent();
    render();
    return true;
  }

  function rotateSelectedShapesBy(deltaDegrees) {
    const selectedIds = currentSelectedShapeIds();
    if (!selectedIds.length) return false;
    const shapes = selectedIds.map((id) => shapeById(id)).filter(Boolean);
    if (!shapes.length) return false;
    pushHistory();
    shapes.forEach((shape) => {
      shape.rotation = normalizeRotation(shapeRotation(shape) + deltaDegrees);
    });
    syncCanvasRectToContent();
    render();
    return true;
  }

  function copySelectedShapeBundle() {
    const selectedIds = currentSelectedShapeIds();
    if (!selectedIds.length) {
      setStatus("Select a shape/container to copy.", "error");
      return;
    }
    const rootIds = topLevelShapeIds(selectedIds);
    const ids = [];
    const seen = new Set();
    rootIds.forEach((rootId) => {
      if (!seen.has(rootId)) {
        seen.add(rootId);
        ids.push(rootId);
      }
      descendantsOf(rootId).forEach((childId) => {
        if (!seen.has(childId)) {
          seen.add(childId);
          ids.push(childId);
        }
      });
    });
    const idSet = new Set(ids);
    const bundle = state.model.shapes
      .filter((shape) => idSet.has(shape.id))
      .map((shape) => deepClone(shape));
    state.clipboard = {
      type: "shapeBundle",
      rootIds: rootIds,
      shapes: bundle,
      pasteCount: 0,
    };
    setStatus("Copied " + bundle.length + " shape(s).", "ok");
  }

  function copySelectedGroupComponent() {
    const selected = currentSelectedGroupComponent();
    if (!selected) {
      setStatus("Select a group cell to copy.", "error");
      return;
    }
    state.clipboard = {
      type: "groupComponent",
      component: deepClone(selected.component),
    };
    setStatus("Copied cell " + (selected.componentIndex + 1) + ".", "ok");
  }

  function pasteClipboard() {
    if (!state.clipboard) {
      setStatus("Clipboard is empty.", "error");
      return;
    }
    if (state.clipboard.type === "groupComponent") {
      const selected = currentSelectedGroupComponent();
      if (!selected) {
        setStatus("Select a target group cell to paste into.", "error");
        return;
      }
      pushHistory();
      Object.keys(selected.component).forEach((key) => delete selected.component[key]);
      Object.assign(selected.component, deepClone(state.clipboard.component || {}));
      render();
      setStatus("Pasted cell into " + selected.shape.text + ".", "ok");
      return;
    }
    if (state.clipboard.type !== "shapeBundle") {
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
      copied.idManual = false;
      copied.x = Number(copied.x || 0) + offset;
      copied.y = Number(copied.y || 0) + offset;
      copied.parentId = copied.parentId && idMap[copied.parentId] ? idMap[copied.parentId] : null;
      copied.z = (state.model.shapes.length ? Math.max.apply(null, state.model.shapes.map((s) => s.z || 0)) : 0) + 1;
      state.model.shapes.push(copied);
    });

    bundle.forEach((oldShape) => {
      const copied = shapeById(idMap[oldShape.id]);
      if (!copied) return;
      updateAutoId(copied, copied.parentId);
    });

    state.clipboard.pasteCount += 1;
    const pastedRootIds = normalizeSelectionIds((state.clipboard.rootIds || []).map((id) => {
      const copied = shapeById(idMap[id]);
      return copied ? copied.id : null;
    }));
    if (pastedRootIds.length) {
      setShapeSelection(pastedRootIds, pastedRootIds[pastedRootIds.length - 1], true);
    }
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

  function canvasBaseScale() {
    const viewportW = Math.max(320, els.canvasScroll.clientWidth || 0);
    return viewportW / ZOOM_VISIBLE_WIDTH_AT_100;
  }

  function workspaceExpandTriggerWorld() {
    const scale = Math.max(0.0001, effectiveCanvasScale(state.view.zoom || 1));
    return Math.max(GRID_MINOR_STEP, WORKSPACE_EXPAND_TRIGGER_PX / scale);
  }

  function effectiveCanvasScale(requestedZoom) {
    const zoom = clamp(Number(requestedZoom) || 1, state.view.minZoom, state.view.maxZoom);
    return canvasBaseScale() * zoom;
  }

  function worldPointToScrollPosition(point, scale) {
    const world = currentWorldRect();
    return {
      left: (point.x - world.x) * scale - (els.canvasScroll.clientWidth || 0) / 2,
      top: (point.y - world.y) * scale - (els.canvasScroll.clientHeight || 0) / 2,
    };
  }

  function formatZoomPercentValue(zoom) {
    return roundNum((Number(zoom) || 0) * 100);
  }

  function parseZoomPercentValue(raw) {
    const cleaned = String(raw || "").replace(/%/g, "").trim();
    if (!cleaned) return null;
    const value = Number(cleaned);
    if (!Number.isFinite(value)) return null;
    return clamp(value / 100, state.view.minZoom, state.view.maxZoom);
  }

  function syncZoomInput(force) {
    if (!els.zoomInput) return;
    if (!force && document.activeElement === els.zoomInput && els.zoomInput.dataset.dirty === "true") return;
    els.zoomInput.value = formatZoomPercentValue(state.view.zoom || 1);
    els.zoomInput.dataset.dirty = "false";
    if (els.zoomPresetsMenu) {
      Array.from(els.zoomPresetsMenu.querySelectorAll("[data-zoom-preset]")).forEach((btn) => {
        const active = Number(btn.getAttribute("data-zoom-preset")) === Math.round((state.view.zoom || 1) * 100);
        btn.classList.toggle("active", active);
      });
    }
  }

  function setZoomMenuOpen(open) {
    if (!els.zoomCombobox) return;
    els.zoomCombobox.classList.toggle("open", !!open);
  }

  function isRectOutsideCanvas(rect, trigger) {
    if (!rect) return false;
    const canvas = currentCanvasRect();
    const margin = Number.isFinite(trigger) ? trigger : workspaceExpandTriggerWorld();
    return (
      rect.x < canvas.x - margin ||
      rect.x + rect.width > canvas.x + canvas.width + margin ||
      rect.y < canvas.y - margin ||
      rect.y + rect.height > canvas.y + canvas.height + margin
    );
  }

  function adjustCanvasRectDuringInteraction(bounds, triggerOverride) {
    if (!state.model || !state.model.metadata) return false;
    const trigger = Number.isFinite(triggerOverride) ? triggerOverride : workspaceExpandTriggerWorld();
    const canvas = currentCanvasRect();
    const next = {
      x: canvas.x,
      y: canvas.y,
      width: canvas.width,
      height: canvas.height,
    };

    const safeBounds = bounds || contentBounds();
    if (!safeBounds) {
      const fallback = {
        x: DEFAULT_VIEWBOX.x,
        y: DEFAULT_VIEWBOX.y,
        width: DEFAULT_VIEWBOX.width,
        height: DEFAULT_VIEWBOX.height,
      };
      if (
        canvas.x === fallback.x &&
        canvas.y === fallback.y &&
        canvas.width === fallback.width &&
        canvas.height === fallback.height
      ) {
        return false;
      }
      queueViewportCompensation(canvas, fallback);
      state.model.metadata.viewBox = fallback;
      return true;
    }

    const boundsRight = safeBounds.x + safeBounds.width;
    const boundsBottom = safeBounds.y + safeBounds.height;
    const defaultRight = DEFAULT_VIEWBOX.x + DEFAULT_VIEWBOX.width;
    const defaultBottom = DEFAULT_VIEWBOX.y + DEFAULT_VIEWBOX.height;
    let changed = false;

    if (safeBounds.x < canvas.x - trigger) {
      next.x -= WORKSPACE_EXPAND_CHUNK;
      next.width += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    } else if (
      canvas.x < DEFAULT_VIEWBOX.x &&
      safeBounds.x >= canvas.x + WORKSPACE_EXPAND_CHUNK + trigger &&
      next.width - WORKSPACE_EXPAND_CHUNK >= DEFAULT_VIEWBOX.width &&
      boundsRight <= canvas.x + canvas.width
    ) {
      next.x += WORKSPACE_EXPAND_CHUNK;
      next.width -= WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }

    if (boundsRight > canvas.x + canvas.width + trigger) {
      next.width += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    } else if (
      canvas.x + canvas.width > defaultRight &&
      boundsRight <= canvas.x + canvas.width - WORKSPACE_EXPAND_CHUNK - trigger &&
      next.width - WORKSPACE_EXPAND_CHUNK >= DEFAULT_VIEWBOX.width
    ) {
      next.width -= WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }

    if (safeBounds.y < canvas.y - trigger) {
      next.y -= WORKSPACE_EXPAND_CHUNK;
      next.height += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    } else if (
      canvas.y < DEFAULT_VIEWBOX.y &&
      safeBounds.y >= canvas.y + WORKSPACE_EXPAND_CHUNK + trigger &&
      next.height - WORKSPACE_EXPAND_CHUNK >= DEFAULT_VIEWBOX.height &&
      boundsBottom <= canvas.y + canvas.height
    ) {
      next.y += WORKSPACE_EXPAND_CHUNK;
      next.height -= WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }

    if (boundsBottom > canvas.y + canvas.height + trigger) {
      next.height += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    } else if (
      canvas.y + canvas.height > defaultBottom &&
      boundsBottom <= canvas.y + canvas.height - WORKSPACE_EXPAND_CHUNK - trigger &&
      next.height - WORKSPACE_EXPAND_CHUNK >= DEFAULT_VIEWBOX.height
    ) {
      next.height -= WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }

    if (!changed) return false;
    queueViewportCompensation(canvas, next);
    state.model.metadata.viewBox = next;
    return true;
  }

  function updateCanvasDuringInteraction(rect) {
    return adjustCanvasRectDuringInteraction(contentBounds(), workspaceExpandTriggerWorld());
  }

  function applyPendingViewportScroll() {
    const pending = state.view.pendingScroll;
    if (!pending) return;
    state.view.pendingScroll = null;
    const maxLeft = Math.max(0, els.canvasScroll.scrollWidth - els.canvasScroll.clientWidth);
    const maxTop = Math.max(0, els.canvasScroll.scrollHeight - els.canvasScroll.clientHeight);
    els.canvasScroll.scrollLeft = clamp(pending.left, 0, maxLeft);
    els.canvasScroll.scrollTop = clamp(pending.top, 0, maxTop);
  }

  function queueViewportCompensation(previousCanvas, nextCanvas) {
    if (!previousCanvas || !nextCanvas) return;
    if (previousCanvas.x === nextCanvas.x && previousCanvas.y === nextCanvas.y) return;
    const scale = effectiveCanvasScale(state.view.zoom || 1);
    const prevWorldX = previousCanvas.x - WORKSPACE_SURROUND;
    const prevWorldY = previousCanvas.y - WORKSPACE_SURROUND;
    const nextWorldX = nextCanvas.x - WORKSPACE_SURROUND;
    const nextWorldY = nextCanvas.y - WORKSPACE_SURROUND;
    state.view.pendingScroll = {
      left: (els.canvasScroll.scrollLeft || 0) + (prevWorldX - nextWorldX) * scale,
      top: (els.canvasScroll.scrollTop || 0) + (prevWorldY - nextWorldY) * scale,
    };
  }

  function applyViewBox() {
    const world = currentWorldRect();
    const zoom = state.view.zoom || 1;
    const scale = effectiveCanvasScale(zoom);
    const widthPx = Math.round(world.width * scale);
    const heightPx = Math.round(world.height * scale);
    els.svg.setAttribute("viewBox", world.x + " " + world.y + " " + world.width + " " + world.height);
    els.svg.setAttribute("width", String(widthPx));
    els.svg.setAttribute("height", String(heightPx));
    syncZoomInput(false);
  }

  function setZoom(nextZoom, focusPoint) {
    const prev = state.view.zoom;
    const next = clamp(nextZoom, state.view.minZoom, state.view.maxZoom);
    if (Math.abs(next - prev) < 0.0001) {
      syncZoomInput(true);
      return;
    }

    const scroll = els.canvasScroll;
    const rect = scroll.getBoundingClientRect();
    const focusX = focusPoint && Number.isFinite(focusPoint.clientX)
      ? clamp(focusPoint.clientX - rect.left, 0, rect.width || 0)
      : scroll.clientWidth / 2;
    const focusY = focusPoint && Number.isFinite(focusPoint.clientY)
      ? clamp(focusPoint.clientY - rect.top, 0, rect.height || 0)
      : scroll.clientHeight / 2;
    const cx = scroll.scrollLeft + focusX;
    const cy = scroll.scrollTop + focusY;
    const prevScale = effectiveCanvasScale(prev);
    const nextScale = effectiveCanvasScale(next);
    const ratio = nextScale / prevScale;

    state.view.zoom = next;
    render();

    scroll.scrollLeft = Math.max(0, cx * ratio - focusX);
    scroll.scrollTop = Math.max(0, cy * ratio - focusY);
  }

  function recenterView() {
    const scale = effectiveCanvasScale(state.view.zoom || 1);
    const target = {
      x: DEFAULT_VIEWBOX.x + DEFAULT_VIEWBOX.width / 2,
      y: DEFAULT_VIEWBOX.y + DEFAULT_VIEWBOX.height / 2,
    };
    const scrollPos = worldPointToScrollPosition(target, scale);
    const maxLeft = Math.max(0, els.canvasScroll.scrollWidth - els.canvasScroll.clientWidth);
    const maxTop = Math.max(0, els.canvasScroll.scrollHeight - els.canvasScroll.clientHeight);
    els.canvasScroll.scrollLeft = clamp(scrollPos.left, 0, maxLeft);
    els.canvasScroll.scrollTop = clamp(scrollPos.top, 0, maxTop);
  }

  function resetView() {
    setZoom(1);
  }

  function eventTargetsCanvas(evt) {
    if (evt && evt.target && els.canvasScroll.contains(evt.target)) return true;
    if (evt && Number.isFinite(evt.clientX) && Number.isFinite(evt.clientY) && document.elementFromPoint) {
      const hit = document.elementFromPoint(evt.clientX, evt.clientY);
      return !!(hit && els.canvasScroll.contains(hit));
    }
    return false;
  }

  function zoomFromWheelEvent(evt) {
    if (!eventTargetsCanvas(evt)) return;
    const isPinchGesture = !!(evt.ctrlKey || evt.metaKey);
    if (!isPinchGesture) return;
    evt.preventDefault();
    const factor = Math.exp(-Number(evt.deltaY || 0) * 0.0025);
    setZoom(state.view.zoom * factor, { clientX: evt.clientX, clientY: evt.clientY });
  }

  function ensureDefs() {
    const defs = createSvg("defs");

    const minorGrid = createSvg("pattern", {
      id: "editor-grid-minor",
      width: GRID_MINOR_STEP,
      height: GRID_MINOR_STEP,
      patternUnits: "userSpaceOnUse",
    });
    minorGrid.appendChild(createSvg("path", {
      d: "M " + GRID_MINOR_STEP + " 0 L 0 0 0 " + GRID_MINOR_STEP,
      fill: "none",
      stroke: "#16263f",
      "stroke-width": 1,
    }));
    defs.appendChild(minorGrid);

    const majorGrid = createSvg("pattern", {
      id: "editor-grid-major",
      width: GRID_MAJOR_STEP,
      height: GRID_MAJOR_STEP,
      patternUnits: "userSpaceOnUse",
    });
    majorGrid.appendChild(createSvg("path", {
      d: "M " + GRID_MAJOR_STEP + " 0 L 0 0 0 " + GRID_MAJOR_STEP,
      fill: "none",
      stroke: "#294063",
      "stroke-width": 1.2,
    }));
    defs.appendChild(majorGrid);

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

  function proportionalInset(size, ratio, minInset, maxInset, minRemaining) {
    const safeMinRemaining = Math.max(8, Number(minRemaining) || 0);
    const upperBound = Math.max(minInset, Math.floor((Math.max(size, safeMinRemaining) - safeMinRemaining) / 2));
    return clamp(Math.round(size * ratio), minInset, Math.max(minInset, Math.min(maxInset, upperBound)));
  }

  function insetTextBox(shape, insetRatios, minSize) {
    const left = proportionalInset(shape.width, insetRatios.left, insetRatios.minX || 6, insetRatios.maxX || 20, minSize && minSize.width || 22);
    const right = proportionalInset(shape.width, insetRatios.right, insetRatios.minX || 6, insetRatios.maxX || 20, minSize && minSize.width || 22);
    const top = proportionalInset(shape.height, insetRatios.top, insetRatios.minY || 5, insetRatios.maxY || 18, minSize && minSize.height || 20);
    const bottom = proportionalInset(shape.height, insetRatios.bottom, insetRatios.minY || 5, insetRatios.maxY || 18, minSize && minSize.height || 20);
    const innerWidth = Math.max(8, shape.width - left - right);
    const innerHeight = Math.max(8, shape.height - top - bottom);
    return {
      x: shape.x + left,
      y: shape.y + top,
      width: innerWidth,
      height: innerHeight,
    };
  }

  function shapeCornerRadius(shape) {
    if (!shapeSupportsRounding(shape.kind) || shape.rounded === false) return 0;
    return Math.max(3, Math.min(14, Math.min(shape.width, shape.height) * 0.12));
  }

  function pointStr(point) {
    return point.x + "," + point.y;
  }

  function lerpPoint(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  function quadraticBezierPoint(a, control, b, t) {
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
    };
  }

  function distanceBetweenPoints(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function normalizeVector(dx, dy) {
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function roundedPolygonPath(points, radius) {
    if (!Array.isArray(points) || points.length < 3) return "";
    const r = Math.max(0, Number(radius) || 0);
    if (r <= 0.01) {
      return "M " + points.map(pointStr).join(" L ") + " Z";
    }
    const d = [];
    const len = points.length;
    for (let i = 0; i < len; i += 1) {
      const prev = points[(i - 1 + len) % len];
      const curr = points[i];
      const next = points[(i + 1) % len];
      const prevDist = distanceBetweenPoints(prev, curr);
      const nextDist = distanceBetweenPoints(curr, next);
      const cornerRadius = Math.min(r, prevDist / 2, nextDist / 2);
      const start = lerpPoint(curr, prev, cornerRadius / Math.max(0.001, prevDist));
      const end = lerpPoint(curr, next, cornerRadius / Math.max(0.001, nextDist));
      if (i === 0) {
        d.push("M " + start.x + " " + start.y);
      } else {
        d.push("L " + start.x + " " + start.y);
      }
      d.push("Q " + curr.x + " " + curr.y + " " + end.x + " " + end.y);
    }
    d.push("Z");
    return d.join(" ");
  }

  function roundedRectPathSelective(x, y, width, height, radii) {
    const safeW = Math.max(0, Number(width) || 0);
    const safeH = Math.max(0, Number(height) || 0);
    const next = {
      tl: Math.max(0, Number(radii && radii.tl) || 0),
      tr: Math.max(0, Number(radii && radii.tr) || 0),
      br: Math.max(0, Number(radii && radii.br) || 0),
      bl: Math.max(0, Number(radii && radii.bl) || 0),
    };
    const maxRadius = Math.min(safeW / 2, safeH / 2);
    Object.keys(next).forEach((key) => {
      next[key] = Math.min(next[key], maxRadius);
    });
    return [
      "M", x + next.tl, y,
      "L", x + safeW - next.tr, y,
      next.tr ? "Q " + (x + safeW) + " " + y + " " + (x + safeW) + " " + (y + next.tr) : "L " + (x + safeW) + " " + y,
      "L", x + safeW, y + safeH - next.br,
      next.br ? "Q " + (x + safeW) + " " + (y + safeH) + " " + (x + safeW - next.br) + " " + (y + safeH) : "L " + (x + safeW) + " " + (y + safeH),
      "L", x + next.bl, y + safeH,
      next.bl ? "Q " + x + " " + (y + safeH) + " " + x + " " + (y + safeH - next.bl) : "L " + x + " " + (y + safeH),
      "L", x, y + next.tl,
      next.tl ? "Q " + x + " " + y + " " + (x + next.tl) + " " + y : "L " + x + " " + y,
      "Z",
    ].join(" ");
  }

  function componentGroupHeaderHeight(shape) {
    return Math.max(HEADER_MIN_THICKNESS, Math.min(36, Math.round(shape.height * 0.22)));
  }

  function groupBodyMinimumForHeaderSide(shape, side) {
    if (!shape) return TABLE_MIN_CELL_HEIGHT;
    const normalizedSide = normalizeSide(side || groupHeaderSideForShape(shape));
    if (shape.kind === "table_group") {
      const rows = Math.max(1, Math.min(24, Math.round(Number(shape.tableRows) || 2)));
      const cols = Math.max(1, Math.min(24, Math.round(Number(shape.tableCols) || 2)));
      return (normalizedSide === "left" || normalizedSide === "right")
        ? cols * TABLE_MIN_CELL_WIDTH
        : rows * TABLE_MIN_CELL_HEIGHT;
    }
    if (shape.kind === "header_container") {
      return (normalizedSide === "left" || normalizedSide === "right")
        ? TABLE_MIN_CELL_WIDTH
        : TABLE_MIN_CELL_HEIGHT;
    }
    const count = Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)));
    const direction = normalizeComponentDirection(shape.componentDirection);
    if (normalizedSide === "left" || normalizedSide === "right") {
      return TABLE_MIN_CELL_WIDTH;
    }
    return direction === "vertical"
      ? count * TABLE_MIN_CELL_HEIGHT
      : TABLE_MIN_CELL_HEIGHT;
  }

  function clampGroupHeaderSize(shape, proposed, sideOverride) {
    if (!shape) return 0;
    const side = normalizeSide(sideOverride || groupHeaderSideForShape(shape));
    if (side === "none") return 0;
    const axisSize = (side === "left" || side === "right") ? shape.width : shape.height;
    const minThickness = HEADER_MIN_THICKNESS;
    const minBody = groupBodyMinimumForHeaderSide(shape, side);
    const maxThickness = Math.max(minThickness, axisSize - Math.max(1, minBody));
    const defaultThickness = shape.kind === "component_group"
      ? componentGroupHeaderHeight(shape)
      : Math.max(HEADER_MIN_THICKNESS, Math.min(36, Math.round(axisSize * 0.22)));
    const raw = Number(proposed);
    const next = Number.isFinite(raw) && raw > 0 ? raw : defaultThickness;
    return clamp(next, minThickness, maxThickness);
  }

  function groupHeaderSideForShape(shape) {
    if (!shape) return "none";
    if (shape.kind === "table_group") return normalizeGroupHeaderSide(shape.groupHeaderSide);
    if (shape.kind === "component_group" || shape.kind === "header_container") return "top";
    return "none";
  }

  function groupHeaderThickness(shape) {
    const side = groupHeaderSideForShape(shape);
    if (side === "none") return 0;
    const axisSize = (side === "left" || side === "right") ? shape.width : shape.height;
    const defaultThickness = shape.kind === "component_group"
      ? componentGroupHeaderHeight(shape)
      : Math.max(HEADER_MIN_THICKNESS, Math.min(36, Math.round(axisSize * 0.22)));
    const explicitThickness = normalizeGroupHeaderSize(shape.groupHeaderSize);
    return clampGroupHeaderSize(shape, explicitThickness || defaultThickness, side);
  }

  function groupHeaderRect(shape) {
    const side = groupHeaderSideForShape(shape);
    const thickness = groupHeaderThickness(shape);
    if (!thickness || side === "none") return null;
    if (side === "bottom") {
      return { side, thickness, x: shape.x, y: shape.y + shape.height - thickness, width: shape.width, height: thickness };
    }
    if (side === "left") {
      return { side, thickness, x: shape.x, y: shape.y, width: thickness, height: shape.height };
    }
    if (side === "right") {
      return { side, thickness, x: shape.x + shape.width - thickness, y: shape.y, width: thickness, height: shape.height };
    }
    return { side, thickness, x: shape.x, y: shape.y, width: shape.width, height: thickness };
  }

  function groupBodyRect(shape) {
    const header = groupHeaderRect(shape);
    const body = {
      x: shape.x + 1,
      y: shape.y + 1,
      width: Math.max(1, shape.width - 2),
      height: Math.max(1, shape.height - 2),
    };
    if (!header) return body;
    if (header.side === "top") {
      body.y += header.height;
      body.height = Math.max(1, body.height - header.height);
    } else if (header.side === "bottom") {
      body.height = Math.max(1, body.height - header.height);
    } else if (header.side === "left") {
      body.x += header.width;
      body.width = Math.max(1, body.width - header.width);
    } else if (header.side === "right") {
      body.width = Math.max(1, body.width - header.width);
    }
    return body;
  }

  function segmentBoxes(start, total, fractions) {
    const boxes = [];
    let cursor = start;
    fractions.forEach((fraction, index) => {
      const next = index === fractions.length - 1 ? (start + total) : (start + total * (fractions.slice(0, index + 1).reduce((sum, value) => sum + value, 0)));
      boxes.push({
        index,
        start: cursor,
        size: Math.max(1, next - cursor),
      });
      cursor = next;
    });
    return boxes;
  }

  function groupFormLayout(shape) {
    const header = groupHeaderRect(shape);
    const body = groupBodyRect(shape);
    if (shape.kind === "table_group") {
      const rows = Math.max(1, Math.min(24, Math.round(Number(shape.tableRows) || 2)));
      const cols = Math.max(1, Math.min(24, Math.round(Number(shape.tableCols) || 2)));
      const rowFractions = normalizeSegmentFractions(shape.rowFractions, rows);
      const colFractions = normalizeSegmentFractions(shape.colFractions, cols);
      const rowBoxes = segmentBoxes(body.y, body.height, rowFractions);
      const colBoxes = segmentBoxes(body.x, body.width, colFractions);
      const components = [];
      rowBoxes.forEach((row, rowIndex) => {
        colBoxes.forEach((col, colIndex) => {
          components.push({
            index: rowIndex * cols + colIndex,
            row: rowIndex,
            col: colIndex,
            x: col.start,
            y: row.start,
            width: col.size,
            height: row.size,
          });
        });
      });
      return {
        kind: "table_group",
        headerRect: header,
        headerSide: header ? header.side : "none",
        headerHeight: header && (header.side === "top" || header.side === "bottom") ? header.height : 0,
        bodyX: body.x,
        bodyY: body.y,
        bodyWidth: body.width,
        bodyHeight: body.height,
        rows,
        cols,
        rowFractions,
        colFractions,
        rowBoxes,
        colBoxes,
        components,
        verticalDividers: colBoxes.slice(1).map((col, index) => ({ index, x: col.start, y1: body.y, y2: body.y + body.height })),
        horizontalDividers: rowBoxes.slice(1).map((row, index) => ({ index, y: row.start, x1: body.x, x2: body.x + body.width })),
      };
    }

    const count = Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)));
    const direction = normalizeComponentDirection(shape.componentDirection);
    const fractions = normalizeSegmentFractions(shape.componentFractions, count);
    const segments = direction === "horizontal"
      ? segmentBoxes(body.x, body.width, fractions)
      : segmentBoxes(body.y, body.height, fractions);
    const components = segments.map((segment, idx) => ({
      index: idx,
      row: direction === "horizontal" ? 0 : idx,
      col: direction === "horizontal" ? idx : 0,
      x: direction === "horizontal" ? segment.start : body.x,
      y: direction === "horizontal" ? body.y : segment.start,
      width: direction === "horizontal" ? segment.size : body.width,
      height: direction === "horizontal" ? body.height : segment.size,
    }));
    return {
      kind: "component_group",
      headerRect: header,
      headerSide: "top",
      headerHeight: header ? header.height : 0,
      bodyX: body.x,
      bodyY: body.y,
      bodyWidth: body.width,
      bodyHeight: body.height,
      direction,
      componentFractions: fractions,
      components,
      verticalDividers: direction === "horizontal"
        ? components.slice(1).map((box, index) => ({ index, x: box.x, y1: body.y, y2: body.y + body.height }))
        : [],
      horizontalDividers: direction === "vertical"
        ? components.slice(1).map((box, index) => ({ index, y: box.y, x1: body.x, x2: body.x + body.width }))
        : [],
    };
  }

  function componentGroupLayout(shape) {
    return groupFormLayout(shape);
  }

  function groupCellCornerRadii(shape, layout, box) {
    const radius = shape.rounded ? Math.max(0, shapeCornerRadius(shape) - 1) : 0;
    if (!radius || !layout || !box) {
      return { tl: 0, tr: 0, br: 0, bl: 0 };
    }
    const touchesBodyLeft = Math.abs(box.x - layout.bodyX) < 0.5;
    const touchesBodyRight = Math.abs((box.x + box.width) - (layout.bodyX + layout.bodyWidth)) < 0.5;
    const touchesBodyTop = Math.abs(box.y - layout.bodyY) < 0.5;
    const touchesBodyBottom = Math.abs((box.y + box.height) - (layout.bodyY + layout.bodyHeight)) < 0.5;
    const bodyAtOuterLeft = layout.bodyX <= shape.x + 1.5;
    const bodyAtOuterRight = (layout.bodyX + layout.bodyWidth) >= (shape.x + shape.width - 1.5);
    const bodyAtOuterTop = layout.bodyY <= shape.y + 1.5;
    const bodyAtOuterBottom = (layout.bodyY + layout.bodyHeight) >= (shape.y + shape.height - 1.5);
    return {
      tl: touchesBodyLeft && touchesBodyTop && bodyAtOuterLeft && bodyAtOuterTop ? radius : 0,
      tr: touchesBodyRight && touchesBodyTop && bodyAtOuterRight && bodyAtOuterTop ? radius : 0,
      br: touchesBodyRight && touchesBodyBottom && bodyAtOuterRight && bodyAtOuterBottom ? radius : 0,
      bl: touchesBodyLeft && touchesBodyBottom && bodyAtOuterLeft && bodyAtOuterBottom ? radius : 0,
    };
  }

  function ensureTableMinimumCellSize(shape) {
    if (!shape || shape.kind !== "table_group") return;
    const rows = Math.max(1, Math.min(24, Math.round(Number(shape.tableRows) || 2)));
    const cols = Math.max(1, Math.min(24, Math.round(Number(shape.tableCols) || 2)));
    const layout = groupFormLayout(shape);
    let widthDelta = 0;
    let heightDelta = 0;
    const minBodyWidth = cols * TABLE_MIN_CELL_WIDTH;
    const minBodyHeight = rows * TABLE_MIN_CELL_HEIGHT;
    if (layout.bodyWidth < minBodyWidth) {
      widthDelta = minBodyWidth - layout.bodyWidth;
    }
    if (layout.bodyHeight < minBodyHeight) {
      heightDelta = minBodyHeight - layout.bodyHeight;
    }
    if (widthDelta > 0) {
      shape.width = snapToStep(shape.width + widthDelta, GRID_MINOR_STEP);
    }
    if (heightDelta > 0) {
      shape.height = snapToStep(shape.height + heightDelta, GRID_MINOR_STEP);
    }
  }

  function ensureComponentGroupMinimumCellSize(shape) {
    if (!shape || shape.kind !== "component_group") return;
    const count = Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)));
    const layout = groupFormLayout(shape);
    const direction = normalizeComponentDirection(shape.componentDirection);
    let widthDelta = 0;
    let heightDelta = 0;
    const minBodyWidth = direction === "horizontal"
      ? count * TABLE_MIN_CELL_WIDTH
      : TABLE_MIN_CELL_WIDTH;
    const minBodyHeight = direction === "vertical"
      ? count * TABLE_MIN_CELL_HEIGHT
      : TABLE_MIN_CELL_HEIGHT;
    if (layout.bodyWidth < minBodyWidth) {
      widthDelta = minBodyWidth - layout.bodyWidth;
    }
    if (layout.bodyHeight < minBodyHeight) {
      heightDelta = minBodyHeight - layout.bodyHeight;
    }
    if (widthDelta > 0) {
      shape.width = snapToStep(shape.width + widthDelta, GRID_MINOR_STEP);
    }
    if (heightDelta > 0) {
      shape.height = snapToStep(shape.height + heightDelta, GRID_MINOR_STEP);
    }
  }

  function ensureHeaderContainerMinimumSize(shape) {
    if (!shape || shape.kind !== "header_container") return;
    const headerThickness = groupHeaderThickness(shape);
    const minHeight = headerThickness + TABLE_MIN_CELL_HEIGHT;
    if (shape.height < minHeight) {
      shape.height = snapToStep(minHeight, GRID_MINOR_STEP);
    }
    if (shape.width < TABLE_MIN_CELL_WIDTH) {
      shape.width = snapToStep(TABLE_MIN_CELL_WIDTH, GRID_MINOR_STEP);
    }
  }

  function ensureShapeMinimumSizeByKind(shape) {
    if (!shape) return;
    if (shape.kind === "header_container") {
      ensureHeaderContainerMinimumSize(shape);
      return;
    }
    if (isGroupFormKind(shape.kind)) {
      ensureGroupFormMinimumCellSize(shape);
    }
  }

  function ensureGroupFormMinimumCellSize(shape) {
    if (!shape || !isGroupFormKind(shape.kind)) return;
    if (shape.kind === "table_group") {
      ensureTableMinimumCellSize(shape);
      return;
    }
    ensureComponentGroupMinimumCellSize(shape);
  }

  function insertTableRow(shape, rowIndex, insertAfter) {
    if (!shape || shape.kind !== "table_group") return null;
    const rows = Math.max(1, Math.min(24, Math.round(Number(shape.tableRows) || 2)));
    const cols = Math.max(1, Math.min(24, Math.round(Number(shape.tableCols) || 2)));
    if (rows >= 24) return null;
    const safeRow = clamp(Math.round(Number(rowIndex) || 0), 0, rows - 1);
    const insertAt = safeRow + (insertAfter ? 1 : 0);
    const current = normalizeGroupComponents(shape.components, rows * cols, shape);
    const next = [];
    for (let row = 0; row < rows + 1; row += 1) {
      if (row === insertAt) {
        for (let col = 0; col < cols; col += 1) {
          next.push(defaultGroupComponent(next.length, shape));
        }
        continue;
      }
      const sourceRow = row > insertAt ? row - 1 : row;
      for (let col = 0; col < cols; col += 1) {
        next.push(deepClone(current[sourceRow * cols + col] || defaultGroupComponent(next.length, shape)));
      }
    }
    shape.tableRows = rows + 1;
    shape.rowFractions = normalizeSegmentFractions([], shape.tableRows);
    shape.components = next;
    ensureTableMinimumCellSize(shape);
    return insertAt * cols + clamp(0, 0, cols - 1);
  }

  function insertTableColumn(shape, colIndex, insertAfter) {
    if (!shape || shape.kind !== "table_group") return null;
    const rows = Math.max(1, Math.min(24, Math.round(Number(shape.tableRows) || 2)));
    const cols = Math.max(1, Math.min(24, Math.round(Number(shape.tableCols) || 2)));
    if (cols >= 24) return null;
    const safeCol = clamp(Math.round(Number(colIndex) || 0), 0, cols - 1);
    const insertAt = safeCol + (insertAfter ? 1 : 0);
    const current = normalizeGroupComponents(shape.components, rows * cols, shape);
    const next = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols + 1; col += 1) {
        if (col === insertAt) {
          next.push(defaultGroupComponent(next.length, shape));
          continue;
        }
        const sourceCol = col > insertAt ? col - 1 : col;
        next.push(deepClone(current[row * cols + sourceCol] || defaultGroupComponent(next.length, shape)));
      }
    }
    shape.tableCols = cols + 1;
    shape.colFractions = normalizeSegmentFractions([], shape.tableCols);
    shape.components = next;
    ensureTableMinimumCellSize(shape);
    return clamp(0, 0, rows - 1) * shape.tableCols + insertAt;
  }

  function insertComponentGroupCell(shape, componentIndex, insertAfter) {
    if (!shape || shape.kind !== "component_group") return null;
    const count = Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)));
    if (count >= 24) return null;
    const safeIndex = clamp(Math.round(Number(componentIndex) || 0), 0, count - 1);
    const insertAt = safeIndex + (insertAfter ? 1 : 0);
    const current = normalizeGroupComponents(shape.components, count, shape);
    const next = [];
    for (let index = 0; index < count + 1; index += 1) {
      if (index === insertAt) {
        next.push(defaultGroupComponent(next.length, shape));
        continue;
      }
      const sourceIndex = index > insertAt ? index - 1 : index;
      next.push(deepClone(current[sourceIndex] || defaultGroupComponent(next.length, shape)));
    }
    shape.componentCount = count + 1;
    shape.componentFractions = normalizeSegmentFractions([], shape.componentCount);
    shape.components = next;
    ensureComponentGroupMinimumCellSize(shape);
    return insertAt;
  }

  function componentBoxTextBox(box) {
    const shapeLike = {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
    return insetTextBox(shapeLike, {
      left: 0.08,
      right: 0.08,
      top: 0.08,
      bottom: 0.08,
      minX: 6,
      maxX: 16,
      minY: 5,
      maxY: 16,
    }, { width: 18, height: 18 });
  }

  function applyTextBoxAdjustments(baseBox, spec, frameBox) {
    if (!baseBox || !spec) return baseBox;
    const outer = frameBox || {
      x: Number.isFinite(Number(spec.x)) ? Number(spec.x) : baseBox.x,
      y: Number.isFinite(Number(spec.y)) ? Number(spec.y) : baseBox.y,
      width: Number.isFinite(Number(spec.width)) ? Number(spec.width) : baseBox.width,
      height: Number.isFinite(Number(spec.height)) ? Number(spec.height) : baseBox.height,
    };
    const pad = normalizeTextInset(spec.textPadding, 0);
    const maxPadX = Math.max(0, Math.floor((outer.width - 8) / 2));
    const maxPadY = Math.max(0, Math.floor((outer.height - 8) / 2));
    const effectivePad = Math.min(pad, maxPadX, maxPadY);
    const baseLeft = clamp(baseBox.x - outer.x, 0, Math.max(0, outer.width - 8));
    const baseTop = clamp(baseBox.y - outer.y, 0, Math.max(0, outer.height - 8));
    const baseRight = clamp((outer.x + outer.width) - (baseBox.x + baseBox.width), 0, Math.max(0, outer.width - 8));
    const baseBottom = clamp((outer.y + outer.height) - (baseBox.y + baseBox.height), 0, Math.max(0, outer.height - 8));
    let leftInset = Math.max(effectivePad, baseLeft + normalizeTextInset(spec.textOffsetRight, 0) - normalizeTextInset(spec.textOffsetLeft, 0));
    let rightInset = Math.max(effectivePad, baseRight + normalizeTextInset(spec.textOffsetLeft, 0) - normalizeTextInset(spec.textOffsetRight, 0));
    let topInset = Math.max(effectivePad, baseTop + normalizeTextInset(spec.textOffsetDown, 0) - normalizeTextInset(spec.textOffsetUp, 0));
    let bottomInset = Math.max(effectivePad, baseBottom + normalizeTextInset(spec.textOffsetUp, 0) - normalizeTextInset(spec.textOffsetDown, 0));
    const maxExtraW = Math.max(0, outer.width - 8 - effectivePad * 2);
    const extraLeft = Math.max(0, leftInset - effectivePad);
    const extraRight = Math.max(0, rightInset - effectivePad);
    const extraW = extraLeft + extraRight;
    if (extraW > maxExtraW && extraW > 0) {
      const scale = maxExtraW / extraW;
      leftInset = effectivePad + extraLeft * scale;
      rightInset = effectivePad + extraRight * scale;
    }
    const maxExtraH = Math.max(0, outer.height - 8 - effectivePad * 2);
    const extraTop = Math.max(0, topInset - effectivePad);
    const extraBottom = Math.max(0, bottomInset - effectivePad);
    const extraH = extraTop + extraBottom;
    if (extraH > maxExtraH && extraH > 0) {
      const scale = maxExtraH / extraH;
      topInset = effectivePad + extraTop * scale;
      bottomInset = effectivePad + extraBottom * scale;
    }
    return {
      x: outer.x + leftInset,
      y: outer.y + topInset,
      width: Math.max(8, outer.width - leftInset - rightInset),
      height: Math.max(8, outer.height - topInset - bottomInset),
    };
  }

  function polygonVerticesForShape(shape) {
    const x = shape.x;
    const y = shape.y;
    const w = shape.width;
    const h = shape.height;
    const cx = x + w / 2;
    const kind = shape.kind;
    if (kind === "triangle") {
      return [
        { x: cx, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
      ];
    }
    if (kind === "diamond") {
      return [
        { x: cx, y: y },
        { x: x + w, y: y + h / 2 },
        { x: cx, y: y + h },
        { x: x, y: y + h / 2 },
      ];
    }
    if (kind === "parallelogram") {
      return [
        { x: x + w * 0.18, y: y },
        { x: x + w, y: y },
        { x: x + w * 0.82, y: y + h },
        { x: x, y: y + h },
      ];
    }
    if (kind === "trapezoid") {
      return [
        { x: x + w * 0.18, y: y },
        { x: x + w * 0.82, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
      ];
    }
    if (kind === "pentagon") {
      return [
        { x: cx, y: y },
        { x: x + w, y: y + h * 0.38 },
        { x: x + w * 0.82, y: y + h },
        { x: x + w * 0.18, y: y + h },
        { x: x, y: y + h * 0.38 },
      ];
    }
    if (kind === "hexagonal_prism") {
      const capHeight = Math.max(12, Math.min(22, h * 0.18));
      const prismHeight = Math.max(18, h - capHeight);
      const top = polygonVerticesForShape({ kind: "hexagon", x: x, y: y, width: w, height: capHeight });
      const bottom = top.map((point) => ({ x: point.x, y: point.y + prismHeight }));
      return [top[0], top[1], top[2], bottom[2], bottom[3], bottom[4], bottom[5], top[5]];
    }
    if (kind === "hexagon") {
      return [
        { x: x + w * 0.18, y: y },
        { x: x + w * 0.82, y: y },
        { x: x + w, y: y + h / 2 },
        { x: x + w * 0.82, y: y + h },
        { x: x + w * 0.18, y: y + h },
        { x: x, y: y + h / 2 },
      ];
    }
    if (kind === "octagon") {
      return [
        { x: x + w * 0.22, y: y },
        { x: x + w * 0.78, y: y },
        { x: x + w, y: y + h * 0.22 },
        { x: x + w, y: y + h * 0.78 },
        { x: x + w * 0.78, y: y + h },
        { x: x + w * 0.22, y: y + h },
        { x: x, y: y + h * 0.78 },
        { x: x, y: y + h * 0.22 },
      ];
    }
    if (kind === "message") {
      return [
        { x: x, y: y },
        { x: x + w, y: y },
        { x: x + w, y: y + h * 0.76 },
        { x: x + w * 0.42, y: y + h * 0.76 },
        { x: x + w * 0.26, y: y + h },
        { x: x + w * 0.3, y: y + h * 0.76 },
        { x: x, y: y + h * 0.76 },
      ];
    }
    if (kind === "card") {
      return [
        { x: x + w * 0.16, y: y },
        { x: x + w, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
        { x: x, y: y + h * 0.16 },
      ];
    }
    if (kind === "note") {
      return [
        { x: x, y: y },
        { x: x + w * 0.8, y: y },
        { x: x + w, y: y + h * 0.2 },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
      ];
    }
    if (kind === "cube" || kind === "cuboid") {
      const offX = Math.min(w * (kind === "cube" ? 0.22 : 0.26), 26);
      const offY = Math.min(h * 0.18, 18);
      return [
        { x: x, y: y },
        { x: x + w - offX, y: y },
        { x: x + w, y: y + offY },
        { x: x + w, y: y + h },
        { x: x + offX, y: y + h },
        { x: x, y: y + h - offY },
      ];
    }
    if (kind === "and") {
      return [
        { x: x, y: y },
        { x: x + w * 0.5, y: y },
        { x: x + w * 0.78, y: y + h * 0.04 },
        { x: x + w * 0.96, y: y + h * 0.28 },
        { x: x + w, y: y + h * 0.5 },
        { x: x + w * 0.96, y: y + h * 0.72 },
        { x: x + w * 0.78, y: y + h * 0.96 },
        { x: x + w * 0.5, y: y + h },
        { x: x, y: y + h },
      ];
    }
    if (kind === "or") {
      return [
        { x: x + w * 0.1, y: y },
        { x: x + w * 0.6, y: y },
        { x: x + w * 0.9, y: y + h * 0.24 },
        { x: x + w, y: y + h * 0.5 },
        { x: x + w * 0.9, y: y + h * 0.76 },
        { x: x + w * 0.6, y: y + h },
        { x: x + w * 0.1, y: y + h },
        { x: x + w * 0.24, y: y + h * 0.5 },
      ];
    }
    return null;
  }

  function createToolIconRoot(label) {
    const svg = createSvg("svg", {
      viewBox: "0 0 48 48",
      class: "tool-icon-svg",
      "aria-hidden": "true",
    });
    svg.setAttribute("focusable", "false");
    if (label) {
      const title = createSvg("title");
      title.textContent = label;
      svg.appendChild(title);
    }
    return svg;
  }

  function appendToolIconEl(svg, tag, attrs) {
    const el = createSvg(tag, attrs);
    svg.appendChild(el);
    return el;
  }

  function createShapeToolIcon(kind, label) {
    const svg = createToolIconRoot(label);
    const stroke = "#d8e6ff";
    const fill = "rgba(128, 182, 255, 0.16)";
    const dash = kind === "cloud_callout" ? "4 3" : "";
    const baseShape = kind === "card"
      ? { kind: kind, x: 13, y: 7, width: 21, height: 31 }
      : kind === "note"
        ? { kind: kind, x: 12, y: 6, width: 22, height: 32 }
        : { kind: kind, x: 8, y: 10, width: 32, height: 24 };
    const polygonKinds = new Set([
      "triangle",
      "diamond",
      "parallelogram",
      "trapezoid",
      "pentagon",
      "hexagon",
      "octagon",
      "message",
      "card",
      "note",
    ]);

    function addLine(x1, y1, x2, y2) {
      const line = appendToolIconEl(svg, "line", { x1, y1, x2, y2, stroke, "stroke-width": 1.8, "stroke-linecap": "round" });
      if (dash) line.setAttribute("stroke-dasharray", dash);
      return line;
    }

    function addPath(d, fillOverride) {
      const path = appendToolIconEl(svg, "path", { d, fill: fillOverride !== undefined ? fillOverride : fill, stroke, "stroke-width": 1.8, "stroke-linejoin": "round", "stroke-linecap": "round" });
      if (dash) path.setAttribute("stroke-dasharray", dash);
      return path;
    }

    function addPolygon(points, fillOverride) {
      const polygon = appendToolIconEl(svg, "polygon", {
        points: points.map(pointStr).join(" "),
        fill: fillOverride !== undefined ? fillOverride : fill,
        stroke,
        "stroke-width": 1.8,
        "stroke-linejoin": "round",
      });
      if (dash) polygon.setAttribute("stroke-dasharray", dash);
      return polygon;
    }

    function addFilledFace(points, fillColor) {
      return addPolygon(points, fillColor || "rgba(128, 182, 255, 0.11)");
    }

    if (polygonKinds.has(kind)) {
      addPolygon(polygonVerticesForShape(baseShape));
      if (kind === "note") {
        const foldX = baseShape.x + baseShape.width * 0.8;
        const foldY = baseShape.y + baseShape.height * 0.2;
        addLine(foldX, baseShape.y, foldX, foldY);
        addLine(foldX, foldY, baseShape.x + baseShape.width, foldY);
      } else if (kind === "card") {
        addLine(baseShape.x, baseShape.y + baseShape.height * 0.16, baseShape.x + baseShape.width * 0.16, baseShape.y);
      }
      return svg;
    }

    if (kind === "square" || kind === "rectangle") {
      const rect = appendToolIconEl(svg, "rect", {
        x: kind === "square" ? 11 : 8,
        y: 10,
        width: kind === "square" ? 26 : 32,
        height: 24,
        rx: 4,
        ry: 4,
        fill,
        stroke,
        "stroke-width": 1.8,
      });
      if (dash) rect.setAttribute("stroke-dasharray", dash);
      return svg;
    }

    if (kind === "cube" || kind === "cuboid") {
      const offX = kind === "cube" ? 6 : 8;
      const offY = 5;
      const backRect = { x: 10, y: 8, width: 22, height: 18 };
      const frontRect = { x: 10 + offX, y: 8 + offY, width: kind === "cube" ? 22 : 24, height: 18 };
      const back = appendToolIconEl(svg, "rect", {
        x: backRect.x,
        y: backRect.y,
        width: backRect.width,
        height: backRect.height,
        fill: "rgba(128, 182, 255, 0.08)",
        stroke,
        "stroke-width": 1.5,
      });
      addFilledFace([
        { x: backRect.x, y: backRect.y },
        { x: backRect.x + backRect.width, y: backRect.y },
        { x: frontRect.x + frontRect.width, y: frontRect.y },
        { x: frontRect.x, y: frontRect.y },
      ], "rgba(128, 182, 255, 0.18)");
      addFilledFace([
        { x: backRect.x + backRect.width, y: backRect.y },
        { x: backRect.x + backRect.width, y: backRect.y + backRect.height },
        { x: frontRect.x + frontRect.width, y: frontRect.y + frontRect.height },
        { x: frontRect.x + frontRect.width, y: frontRect.y },
      ], "rgba(128, 182, 255, 0.12)");
      const front = appendToolIconEl(svg, "rect", {
        x: frontRect.x,
        y: frontRect.y,
        width: frontRect.width,
        height: frontRect.height,
        fill,
        stroke,
        "stroke-width": 1.8,
      });
      if (dash) {
        back.setAttribute("stroke-dasharray", dash);
        front.setAttribute("stroke-dasharray", dash);
      }
      addLine(backRect.x, backRect.y, frontRect.x, frontRect.y);
      addLine(backRect.x + backRect.width, backRect.y, frontRect.x + frontRect.width, frontRect.y);
      addLine(backRect.x + backRect.width, backRect.y + backRect.height, frontRect.x + frontRect.width, frontRect.y + frontRect.height);
      addLine(backRect.x, backRect.y + backRect.height, frontRect.x, frontRect.y + frontRect.height);
      return svg;
    }

    if (kind === "circle" || kind === "oval") {
      const ellipse = appendToolIconEl(svg, "ellipse", {
        cx: 24,
        cy: 22,
        rx: kind === "circle" ? 13 : 16,
        ry: kind === "circle" ? 13 : 11,
        fill,
        stroke,
        "stroke-width": 1.8,
      });
      if (dash) ellipse.setAttribute("stroke-dasharray", dash);
      return svg;
    }

    if (kind === "cylinder") {
      const topY = 13;
      const bottomY = 30;
      appendToolIconEl(svg, "ellipse", { cx: 24, cy: bottomY, rx: 14, ry: 5, fill, stroke: "none" });
      appendToolIconEl(svg, "rect", { x: 10, y: topY, width: 28, height: bottomY - topY, fill, stroke: "none" });
      const top = appendToolIconEl(svg, "ellipse", { cx: 24, cy: topY, rx: 14, ry: 5, fill, stroke, "stroke-width": 1.8 });
      const bottom = appendToolIconEl(svg, "ellipse", { cx: 24, cy: bottomY, rx: 14, ry: 5, fill, stroke, "stroke-width": 1.8 });
      if (dash) {
        top.setAttribute("stroke-dasharray", dash);
        bottom.setAttribute("stroke-dasharray", dash);
      }
      addLine(10, topY, 10, bottomY);
      addLine(38, topY, 38, bottomY);
      return svg;
    }

    if (kind === "cone") {
      addPath("M 24 8 L 39 31 A 15 5 0 1 1 9 31 Z");
      const base = appendToolIconEl(svg, "ellipse", { cx: 24, cy: 31, rx: 15, ry: 5, fill: "none", stroke, "stroke-width": 1.3 });
      if (dash) base.setAttribute("stroke-dasharray", dash);
      return svg;
    }

    if (kind === "hexagonal_prism") {
      const top = polygonVerticesForShape({ kind: "hexagon", x: 11, y: 7, width: 26, height: 12 });
      const bottom = top.map((point) => ({ x: point.x, y: point.y + 17 }));
      addFilledFace([top[5], top[0], bottom[0], bottom[5]], "rgba(128, 182, 255, 0.1)");
      addFilledFace([top[0], top[1], bottom[1], bottom[0]], "rgba(128, 182, 255, 0.16)");
      addFilledFace([top[1], top[2], bottom[2], bottom[1]], "rgba(128, 182, 255, 0.12)");
      addPolygon(top, "rgba(128, 182, 255, 0.2)");
      addPolygon(bottom, fill);
      [0, 1, 2, 3, 4, 5].forEach((idx) => addLine(top[idx].x, top[idx].y, bottom[idx].x, bottom[idx].y));
      return svg;
    }

    if (kind === "and") {
      addPath("M 9 10 L 24 10 C 33 10 39 15 39 22 C 39 29 33 34 24 34 L 9 34 Z");
      return svg;
    }

    if (kind === "or") {
      addPath("M 13 10 Q 28 10 38 22 Q 28 34 13 34 Q 19 22 13 10 Z");
      return svg;
    }

    if (kind === "actor") {
      const head = appendToolIconEl(svg, "circle", { cx: 24, cy: 11.5, r: 5, fill, stroke, "stroke-width": 1.8 });
      if (dash) head.setAttribute("stroke-dasharray", dash);
      addLine(24, 16.5, 24, 30);
      addLine(15, 20.5, 33, 20.5);
      addLine(24, 30, 16, 38);
      addLine(24, 30, 32, 38);
      return svg;
    }

    if (kind === "mail") {
      const rect = appendToolIconEl(svg, "rect", {
        x: 8,
        y: 11,
        width: 32,
        height: 22,
        rx: 2,
        ry: 2,
        fill,
        stroke,
        "stroke-width": 1.8,
      });
      if (dash) rect.setAttribute("stroke-dasharray", dash);
      addLine(8, 11, 24, 23);
      addLine(40, 11, 24, 23);
      addLine(8, 33, 20, 22);
      addLine(40, 33, 28, 22);
      return svg;
    }

    if (kind === "cloud" || kind === "cloud_callout") {
      addPath("M 13 28 C 8 28 7 20 12 19 C 11 12 18 10 22 13 C 25 8 34 9 35 16 C 40 16 42 24 37 27 C 36 32 29 34 25 30 C 20 34 13 33 13 28 Z");
      if (kind === "cloud_callout") {
        addPolygon([{ x: 20, y: 29 }, { x: 16, y: 37 }, { x: 24, y: 31 }], fill);
      }
      return svg;
    }

    if (kind === "text_box") {
      const text = appendToolIconEl(svg, "text", {
        x: 24,
        y: 26,
        fill: stroke,
        "font-size": 12,
        "font-family": DEFAULT_FONT_FAMILY,
        "font-weight": "700",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      });
      text.textContent = "Text";
      return svg;
    }

    if (kind === "container" || kind === "header_container" || isGroupFormKind(kind)) {
      const rect = appendToolIconEl(svg, "rect", {
        x: 7,
        y: 8,
        width: 34,
        height: 28,
        rx: 4,
        ry: 4,
        fill,
        stroke,
        "stroke-width": 1.8,
      });
      if (dash) rect.setAttribute("stroke-dasharray", dash);
      if (kind !== "container") {
        addLine(7, 15, 41, 15);
      }
      if (kind === "table_group") {
        addLine(18.5, 15, 18.5, 36);
        addLine(29.5, 15, 29.5, 36);
        addLine(7, 25.5, 41, 25.5);
      } else if (kind === "component_group") {
        addLine(18.5, 15, 18.5, 36);
        addLine(29.5, 15, 29.5, 36);
      }
      return svg;
    }

    const fallback = appendToolIconEl(svg, "rect", {
      x: 8,
      y: 10,
      width: 32,
      height: 24,
      rx: 4,
      ry: 4,
      fill,
      stroke,
      "stroke-width": 1.8,
    });
    if (dash) fallback.setAttribute("stroke-dasharray", dash);
    return svg;
  }

  function createConnectionToolIcon(connectionType, label) {
    const svg = createToolIconRoot(label);
    const stroke = "#d8e6ff";
    appendToolIconEl(svg, "line", {
      x1: 8,
      y1: 24,
      x2: 40,
      y2: 24,
      fill: "none",
      stroke,
      "stroke-width": 2.1,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    if (connectionType === "line") return svg;
    const endHead = appendToolIconEl(svg, "polygon", {
      points: "34,20 40,24 34,28",
      fill: stroke,
      stroke: "none",
    });
    if (connectionType === "bidirectional_connector") {
      appendToolIconEl(svg, "polygon", {
        points: "14,20 8,24 14,28",
        fill: stroke,
        stroke: "none",
      });
    } else {
      endHead.setAttribute("fill", stroke);
    }
    return svg;
  }

  function shapeToolPageCount() {
    return Math.max(1, Math.ceil(SHAPE_TOOL_DEFS.length / SHAPE_TOOLS_PER_PAGE));
  }

  function clampShapeToolPage(page) {
    return clamp(Math.round(Number(page) || 0), 0, shapeToolPageCount() - 1);
  }

  function renderShapeToolPager() {
    const pageCount = shapeToolPageCount();
    state.shapeToolPage = clampShapeToolPage(state.shapeToolPage);
    if (els.shapePageInput) {
      els.shapePageInput.min = "1";
      els.shapePageInput.max = String(pageCount);
      els.shapePageInput.value = String(state.shapeToolPage + 1);
      els.shapePageInput.title = "Shape tool page " + (state.shapeToolPage + 1) + " of " + pageCount;
    }
    if (els.shapePagePrev) {
      els.shapePagePrev.disabled = pageCount <= 1 || state.shapeToolPage <= 0;
    }
    if (els.shapePageNext) {
      els.shapePageNext.disabled = pageCount <= 1 || state.shapeToolPage >= pageCount - 1;
    }
  }

  function setShapeToolPage(page) {
    const nextPage = clampShapeToolPage(page);
    if (nextPage === state.shapeToolPage) {
      renderShapeToolPager();
      return;
    }
    state.shapeToolPage = nextPage;
    renderToolButtons();
  }

  function renderToolButtons() {
    if (els.connectionToolsGrid) {
      els.connectionToolsGrid.innerHTML = "";
      CONNECTION_TOOL_DEFS.forEach((tool) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tool-icon-button";
        btn.dataset.mode = tool.mode;
        btn.title = tool.label;
        btn.setAttribute("aria-label", tool.label);
        btn.appendChild(createConnectionToolIcon(CONNECT_MODES[tool.mode], tool.label));
        els.connectionToolsGrid.appendChild(btn);
      });
    }
    if (els.shapeToolsGrid) {
      els.shapeToolsGrid.innerHTML = "";
      state.shapeToolPage = clampShapeToolPage(state.shapeToolPage);
      const start = state.shapeToolPage * SHAPE_TOOLS_PER_PAGE;
      SHAPE_TOOL_DEFS.slice(start, start + SHAPE_TOOLS_PER_PAGE).forEach((tool) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tool-icon-button";
        btn.dataset.kind = tool.kind;
        btn.title = tool.label;
        btn.setAttribute("aria-label", tool.label);
        btn.appendChild(createShapeToolIcon(tool.kind, tool.label));
        els.shapeToolsGrid.appendChild(btn);
      });
      renderShapeToolPager();
    }
    if (els.containerToolsGrid) {
      els.containerToolsGrid.innerHTML = "";
      CONTAINER_TOOL_DEFS.forEach((tool) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tool-icon-button";
        btn.dataset.kind = tool.kind;
        btn.title = tool.label;
        btn.setAttribute("aria-label", tool.label);
        btn.appendChild(createShapeToolIcon(tool.kind, tool.label));
        els.containerToolsGrid.appendChild(btn);
      });
    }
    if (els.groupToolsGrid) {
      els.groupToolsGrid.innerHTML = "";
      GROUP_TOOL_DEFS.forEach((tool) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tool-icon-button";
        btn.dataset.kind = tool.kind;
        btn.title = tool.label;
        btn.setAttribute("aria-label", tool.label);
        btn.appendChild(createShapeToolIcon(tool.kind, tool.label));
        els.groupToolsGrid.appendChild(btn);
      });
    }
  }

  function shapeTextBox(shape) {
    if (shape.kind === "header_container") {
      const headerRect = groupHeaderRect(shape);
      const headerH = headerRect ? headerRect.height : componentGroupHeaderHeight(shape);
      const padX = proportionalInset(shape.width, 0.04, 8, 18, 24);
      const padY = Math.max(2, proportionalInset(headerH, 0.16, 2, 8, 14));
      return applyTextBoxAdjustments({
        x: (headerRect ? headerRect.x : shape.x) + padX,
        y: (headerRect ? headerRect.y : shape.y) + padY,
        width: Math.max(8, (headerRect ? headerRect.width : shape.width) - padX * 2),
        height: Math.max(8, headerH - padY * 2),
      }, shape, {
        x: headerRect ? headerRect.x : shape.x,
        y: headerRect ? headerRect.y : shape.y,
        width: headerRect ? headerRect.width : shape.width,
        height: headerH,
      });
    }
    if (shape.kind === "component_group" || shape.kind === "table_group") {
      const headerRect = groupHeaderRect(shape);
      if (!headerRect) {
        return { x: shape.x, y: shape.y, width: 0, height: 0 };
      }
      const padX = proportionalInset(headerRect.width, 0.04, 6, 18, 24);
      const padY = Math.max(2, proportionalInset(headerRect.height, 0.16, 2, 8, 14));
      return applyTextBoxAdjustments({
        x: headerRect.x + padX,
        y: headerRect.y + padY,
        width: Math.max(8, headerRect.width - padX * 2),
        height: Math.max(8, headerRect.height - padY * 2),
      }, shape, {
        x: headerRect.x,
        y: headerRect.y,
        width: headerRect.width,
        height: headerRect.height,
      });
    }
    if (shape.kind === "circle" || shape.kind === "oval") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.18,
        right: 0.18,
        top: 0.14,
        bottom: 0.14,
        minX: 7,
        maxX: 24,
        minY: 6,
        maxY: 18,
      }, { width: 20, height: 20 }), shape, shape);
    }
    if (shape.kind === "cylinder") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.14,
        right: 0.14,
        top: 0.2,
        bottom: 0.14,
        minX: 8,
        maxX: 22,
        minY: 8,
        maxY: 22,
      }, { width: 22, height: 22 }), shape, shape);
    }
    if (shape.kind === "triangle") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.16,
        right: 0.16,
        top: 0.24,
        bottom: 0.18,
        minX: 8,
        maxX: 24,
        minY: 7,
        maxY: 22,
      }, { width: 20, height: 20 }), shape, shape);
    }
    if (shape.kind === "diamond" || shape.kind === "pentagon" || shape.kind === "hexagon" || shape.kind === "octagon") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.18,
        right: 0.18,
        top: 0.16,
        bottom: 0.16,
        minX: 8,
        maxX: 24,
        minY: 7,
        maxY: 20,
      }, { width: 22, height: 22 }), shape, shape);
    }
    if (shape.kind === "cone") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.18,
        right: 0.18,
        top: 0.14,
        bottom: 0.24,
        minX: 8,
        maxX: 24,
        minY: 8,
        maxY: 24,
      }, { width: 22, height: 24 }), shape, shape);
    }
    if (shape.kind === "cube" || shape.kind === "cuboid" || shape.kind === "hexagonal_prism") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.18,
        right: 0.08,
        top: 0.16,
        bottom: 0.1,
        minX: 10,
        maxX: 26,
        minY: 8,
        maxY: 20,
      }, { width: 22, height: 20 }), shape, shape);
    }
    if (shape.kind === "cloud" || shape.kind === "cloud_callout") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.18,
        right: 0.18,
        top: 0.18,
        bottom: shape.kind === "cloud_callout" ? 0.24 : 0.18,
        minX: 10,
        maxX: 28,
        minY: 9,
        maxY: 24,
      }, { width: 26, height: 24 }), shape, shape);
    }
    if (shape.kind === "mail") {
      return applyTextBoxAdjustments(insetTextBox(shape, {
        left: 0.12,
        right: 0.12,
        top: 0.26,
        bottom: 0.12,
        minX: 8,
        maxX: 20,
        minY: 8,
        maxY: 22,
      }, { width: 22, height: 20 }), shape, shape);
    }
    if (shape.kind === "actor") {
      return applyTextBoxAdjustments({
        x: shape.x + 8,
        y: shape.y + shape.height * 0.48,
        width: Math.max(18, shape.width - 16),
        height: Math.max(20, shape.height * 0.42),
      }, shape, shape);
    }
    if (shape.kind === "note") {
      return applyTextBoxAdjustments({
        x: shape.x + 10,
        y: shape.y + 10,
        width: Math.max(18, shape.width - 24),
        height: Math.max(18, shape.height - 20),
      }, shape, shape);
    }
    return applyTextBoxAdjustments(insetTextBox(shape, {
      left: 0.08,
      right: 0.08,
      top: 0.08,
      bottom: 0.08,
      minX: 6,
      maxX: 18,
      minY: 5,
      maxY: 16,
    }, { width: 20, height: 20 }), shape, shape);
  }

  function renderRichTextBlockSpec(group, spec, box) {
    const html = sanitizeRichHtml(spec.richText, spec.text);
    const foreign = createSvg("foreignObject", {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      style: "pointer-events:none;overflow:hidden",
    });
    const wrapper = createHtml("div", {
      xmlns: HTML_NS,
      style: [
        "width:100%",
        "height:100%",
        "display:flex",
        "align-items:" + richTextJustifyContent(normalizeTextVAlign(spec.textVAlign || "center")),
        "justify-content:stretch",
        "overflow:hidden",
        "color:" + normalizeColor(spec.textColor, "#f4f7ff"),
        "font-size:" + normalizeFontSize(spec.fontSize, 12) + "px",
        "font-family:" + normalizeFontFamily(spec.fontFamily),
        "text-align:" + normalizeTextAlign(spec.textAlign || "center"),
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

  function renderRichTextBlock(group, shape, box) {
    return renderRichTextBlockSpec(group, shape, box);
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
    const baseFill = shape.kind === "text_box" && shape.noBackground ? "none" : shape.fill;
    const borderStyle = normalizeBorderStyle(shape.borderStyle);
    const showOwnBorder = borderStyle !== "none";
    const highlightStroke = strokeColor !== shape.stroke;
    const outlineStyle = showOwnBorder ? borderStyle : (highlightStroke ? "solid" : "none");
    const structuralStyle = showOwnBorder ? borderStyle : "none";
    const dash = dashArrayForStyle(outlineStyle);
    const structuralDash = dashArrayForStyle(structuralStyle);
    const strokeLinecap = lineCapForStyle(outlineStyle);
    const structuralLinecap = lineCapForStyle(structuralStyle);
    const separatorWidth = Math.max(1, strokeWidth * 0.62);
    const minorSeparatorWidth = Math.max(1, strokeWidth * 0.56);
    const roundedRadius = shapeCornerRadius(shape);
    const commonStroke = {
      fill: baseFill,
      stroke: outlineStyle === "none" ? "none" : strokeColor,
      "stroke-width": outlineStyle === "none" ? 0 : strokeWidth,
      "stroke-dasharray": dash,
    };
    const kind = shape.kind;

    function appendShapeEl(tag, attrs, fillOverride) {
      const el = createSvg(tag, attrs);
      el.setAttribute("fill", fillOverride !== undefined ? fillOverride : baseFill);
      el.setAttribute("stroke", outlineStyle === "none" ? "none" : strokeColor);
      el.setAttribute("stroke-width", String(outlineStyle === "none" ? 0 : strokeWidth));
      if (dash) el.setAttribute("stroke-dasharray", dash);
      if (strokeLinecap) el.setAttribute("stroke-linecap", strokeLinecap);
      group.appendChild(el);
      return el;
    }

    function appendPathShape(d, fillOverride) {
      return appendShapeEl("path", { d: d }, fillOverride);
    }

    function appendPolygonShape(points, fillOverride) {
      if (roundedRadius > 0 && shapeSupportsRounding(kind)) {
        return appendPathShape(roundedPolygonPath(points, roundedRadius), fillOverride);
      }
      return appendShapeEl("polygon", { points: points.map(pointStr).join(" ") }, fillOverride);
    }

    function appendFacePolygon(points, fillOverride) {
      return appendPolygonShape(points, fillOverride);
    }

    function appendFilledPolygon(points, fillOverride) {
      const polygon = createSvg("polygon", {
        points: points.map(pointStr).join(" "),
        fill: fillOverride !== undefined ? fillOverride : baseFill,
        stroke: "none",
      });
      group.appendChild(polygon);
      return polygon;
    }

    function appendStrokeLine(attrs, widthOverride) {
      if (structuralStyle === "none") return null;
      const line = createSvg("line", attrs);
      line.setAttribute("stroke", strokeColor);
      line.setAttribute("stroke-width", String(widthOverride || strokeWidth));
      if (structuralDash) line.setAttribute("stroke-dasharray", structuralDash);
      if (structuralLinecap) line.setAttribute("stroke-linecap", structuralLinecap);
      group.appendChild(line);
      return line;
    }

    function appendStrokePath(d, widthOverride) {
      if (structuralStyle === "none") return null;
      const path = createSvg("path", {
        d: d,
        fill: "none",
        stroke: strokeColor,
        "stroke-width": widthOverride || strokeWidth,
        "stroke-linejoin": "round",
      });
      if (structuralDash) path.setAttribute("stroke-dasharray", structuralDash);
      if (structuralLinecap) path.setAttribute("stroke-linecap", structuralLinecap);
      group.appendChild(path);
      return path;
    }

    if (kind === "text_box" && shape.noBackground) {
      const hitRect = createSvg("rect", {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: roundedRadius,
        ry: roundedRadius,
        fill: "#ffffff",
        "fill-opacity": 0.001,
        stroke: "none",
        "pointer-events": "all",
      });
      group.appendChild(hitRect);
    }

    if (kind === "triangle" || kind === "diamond" || kind === "parallelogram" || kind === "trapezoid" || kind === "pentagon" || kind === "hexagon" || kind === "octagon" || kind === "message" || kind === "card" || kind === "note") {
      const points = polygonVerticesForShape(shape);
      appendPolygonShape(points);
      if (kind === "note") {
        const foldW = shape.width * 0.2;
        const foldH = shape.height * 0.2;
        appendStrokeLine({
          x1: shape.x + shape.width * 0.8,
          y1: shape.y,
          x2: shape.x + shape.width * 0.8,
          y2: shape.y + foldH,
        }, minorSeparatorWidth);
        appendStrokeLine({
          x1: shape.x + shape.width * 0.8,
          y1: shape.y + foldH,
          x2: shape.x + shape.width,
          y2: shape.y + foldH,
        }, minorSeparatorWidth);
      } else if (kind === "card") {
        appendStrokeLine({
          x1: shape.x,
          y1: shape.y + shape.height * 0.16,
          x2: shape.x + shape.width * 0.16,
          y2: shape.y,
        }, minorSeparatorWidth);
      }
    } else if (kind === "circle" || kind === "oval") {
      group.appendChild(createSvg("ellipse", Object.assign({
        cx: shape.x + shape.width / 2,
        cy: shape.y + shape.height / 2,
        rx: shape.width / 2,
        ry: shape.height / 2,
      }, commonStroke)));
    } else if (kind === "cylinder") {
      const rx = shape.width / 2;
      const ry = Math.max(8, Math.min(16, shape.height * 0.12));
      const topCy = shape.y + ry + 2;
      const bottomCy = shape.y + shape.height - ry - 2;
      group.appendChild(createSvg("ellipse", {
        cx: shape.x + rx,
        cy: bottomCy,
        rx: rx,
        ry: ry,
        fill: shape.fill,
        stroke: "none",
      }));
      group.appendChild(createSvg("rect", {
        x: shape.x,
        y: topCy,
        width: shape.width,
        height: Math.max(8, bottomCy - topCy),
        fill: shape.fill,
        stroke: "none",
      }));
      appendShapeEl("ellipse", {
        cx: shape.x + rx,
        cy: topCy,
        rx: rx,
        ry: ry,
      });
      group.appendChild(createSvg("ellipse", {
        cx: shape.x + rx,
        cy: bottomCy,
        rx: rx,
        ry: ry,
        fill: shape.fill,
        stroke: outlineStyle === "none" ? "none" : strokeColor,
        "stroke-width": outlineStyle === "none" ? 0 : strokeWidth,
        "stroke-dasharray": dash,
      }));
      appendStrokeLine({
        x1: shape.x,
        y1: topCy,
        x2: shape.x,
        y2: bottomCy,
      }, strokeWidth);
      appendStrokeLine({
        x1: shape.x + shape.width,
        y1: topCy,
        x2: shape.x + shape.width,
        y2: bottomCy,
      }, strokeWidth);
    } else if (kind === "cone") {
      const rx = shape.width / 2;
      const ry = Math.max(8, Math.min(14, shape.height * 0.11));
      const cx = shape.x + shape.width / 2;
      const apexY = shape.y;
      const baseCy = shape.y + shape.height - ry;
      const bodyPath = [
        "M " + cx + " " + apexY,
        "L " + (cx + rx) + " " + baseCy,
        "A " + rx + " " + ry + " 0 1 1 " + (cx - rx) + " " + baseCy,
        "Z",
      ].join(" ");
      appendPathShape(bodyPath);
      const baseEllipse = createSvg("ellipse", {
        cx: cx,
        cy: baseCy,
        rx: rx,
        ry: ry,
        fill: "none",
      });
      if (structuralStyle !== "none") {
        baseEllipse.setAttribute("stroke", strokeColor);
        baseEllipse.setAttribute("stroke-width", String(minorSeparatorWidth));
        if (structuralDash) baseEllipse.setAttribute("stroke-dasharray", structuralDash);
        if (structuralLinecap) baseEllipse.setAttribute("stroke-linecap", structuralLinecap);
      } else {
        baseEllipse.setAttribute("stroke", "none");
      }
      group.appendChild(baseEllipse);
    } else if (kind === "cube" || kind === "cuboid") {
      const offX = Math.min(shape.width * (kind === "cube" ? 0.22 : 0.26), 26);
      const offY = Math.min(shape.height * 0.18, 18);
      const a = { x: shape.x, y: shape.y };
      const b = { x: shape.x + shape.width - offX, y: shape.y };
      const c = { x: shape.x + shape.width, y: shape.y + offY };
      const d = { x: shape.x + shape.width, y: shape.y + shape.height };
      const e = { x: shape.x + offX, y: shape.y + shape.height };
      const f = { x: shape.x, y: shape.y + shape.height - offY };
      const g = { x: shape.x + offX, y: shape.y + offY };
      const h = { x: shape.x + shape.width - offX, y: shape.y + shape.height - offY };
      appendFilledPolygon([a, g, e, f], darken(shape.fill, -16));
      appendFilledPolygon([a, b, c, g], darken(shape.fill, -18));
      appendFilledPolygon([b, h, d, c], darken(shape.fill, -10));
      appendFilledPolygon([f, h, d, e], darken(shape.fill, -14));
      appendFilledPolygon([g, c, d, e], baseFill);
      [
        [a, b], [b, c], [c, d], [d, e], [e, f], [f, a],
        [a, g], [b, h], [h, d], [h, f], [f, e], [g, c], [g, e],
      ].forEach(([p1, p2]) => {
        appendStrokeLine({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }, minorSeparatorWidth);
      });
    } else if (kind === "hexagonal_prism") {
      const capHeight = Math.max(12, Math.min(22, shape.height * 0.18));
      const prismHeight = Math.max(18, shape.height - capHeight);
      const top = polygonVerticesForShape({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: capHeight,
        kind: "hexagon",
      });
      const bottom = top.map((point) => ({ x: point.x, y: point.y + prismHeight }));
      appendFilledPolygon([top[5], top[0], bottom[0], bottom[5]], darken(shape.fill, -12));
      appendFilledPolygon([top[0], top[1], bottom[1], bottom[0]], darken(shape.fill, -18));
      appendFilledPolygon([top[1], top[2], bottom[2], bottom[1]], darken(shape.fill, -8));
      appendFilledPolygon([top[0], top[1], top[2], top[3], top[4], top[5]], darken(shape.fill, -20));
      appendFilledPolygon([bottom[0], bottom[1], bottom[2], bottom[3], bottom[4], bottom[5]], baseFill);
      const outline = [top[0], top[1], top[2], bottom[2], bottom[3], bottom[4], bottom[5], top[5], top[0]];
      appendStrokePath(polylinePath(outline) + " Z", strokeWidth);
      [0, 1, 2, 3, 4, 5].forEach((idx) => {
        appendStrokeLine({
          x1: top[idx].x,
          y1: top[idx].y,
          x2: bottom[idx].x,
          y2: bottom[idx].y,
        }, minorSeparatorWidth);
      });
      for (let idx = 0; idx < 6; idx += 1) {
        const next = (idx + 1) % 6;
        appendStrokeLine({ x1: top[idx].x, y1: top[idx].y, x2: top[next].x, y2: top[next].y }, minorSeparatorWidth);
        appendStrokeLine({ x1: bottom[idx].x, y1: bottom[idx].y, x2: bottom[next].x, y2: bottom[next].y }, minorSeparatorWidth);
      }
    } else if (kind === "and") {
      const x0 = shape.x;
      const y0 = shape.y;
      const w = shape.width;
      const h = shape.height;
      const d = [
        "M " + x0 + " " + y0,
        "L " + (x0 + w * 0.5) + " " + y0,
        "C " + (x0 + w * 0.78) + " " + y0 + " " + (x0 + w) + " " + (y0 + h * 0.22) + " " + (x0 + w) + " " + (y0 + h / 2),
        "C " + (x0 + w) + " " + (y0 + h * 0.78) + " " + (x0 + w * 0.78) + " " + (y0 + h) + " " + (x0 + w * 0.5) + " " + (y0 + h),
        "L " + x0 + " " + (y0 + h),
        "Z",
      ].join(" ");
      appendPathShape(d);
    } else if (kind === "or") {
      const x0 = shape.x;
      const y0 = shape.y;
      const w = shape.width;
      const h = shape.height;
      const d = [
        "M " + (x0 + w * 0.1) + " " + y0,
        "Q " + (x0 + w * 0.62) + " " + y0 + " " + (x0 + w) + " " + (y0 + h / 2),
        "Q " + (x0 + w * 0.62) + " " + (y0 + h) + " " + (x0 + w * 0.1) + " " + (y0 + h),
        "Q " + (x0 + w * 0.26) + " " + (y0 + h / 2) + " " + (x0 + w * 0.1) + " " + y0,
        "Z",
      ].join(" ");
      appendPathShape(d);
    } else if (kind === "actor") {
      const headR = Math.min(shape.width * 0.16, shape.height * 0.12);
      const cx = shape.x + shape.width / 2;
      const headCy = shape.y + shape.height * 0.16;
      appendShapeEl("circle", {
        cx: cx,
        cy: headCy,
        r: headR,
      });
      const limbs = [
        { x1: cx, y1: headCy + headR, x2: cx, y2: shape.y + shape.height * 0.62 },
        { x1: shape.x + shape.width * 0.24, y1: shape.y + shape.height * 0.36, x2: shape.x + shape.width * 0.76, y2: shape.y + shape.height * 0.36 },
        { x1: cx, y1: shape.y + shape.height * 0.62, x2: shape.x + shape.width * 0.26, y2: shape.y + shape.height * 0.94 },
        { x1: cx, y1: shape.y + shape.height * 0.62, x2: shape.x + shape.width * 0.74, y2: shape.y + shape.height * 0.94 },
      ];
      limbs.forEach((line) => {
        appendStrokeLine({
          x1: line.x1,
          y1: line.y1,
          x2: line.x2,
          y2: line.y2,
        }, strokeWidth);
      });
    } else if (kind === "mail") {
      appendShapeEl("rect", {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: roundedRadius,
        ry: roundedRadius,
      });
      const centerX = shape.x + shape.width / 2;
      const flapY = shape.y + shape.height * 0.54;
      appendStrokeLine({ x1: shape.x, y1: shape.y, x2: centerX, y2: flapY }, minorSeparatorWidth);
      appendStrokeLine({ x1: shape.x + shape.width, y1: shape.y, x2: centerX, y2: flapY }, minorSeparatorWidth);
      appendStrokeLine({ x1: shape.x, y1: shape.y + shape.height, x2: shape.x + shape.width * 0.42, y2: flapY }, minorSeparatorWidth);
      appendStrokeLine({ x1: shape.x + shape.width, y1: shape.y + shape.height, x2: shape.x + shape.width * 0.58, y2: flapY }, minorSeparatorWidth);
    } else if (kind === "cloud" || kind === "cloud_callout") {
      const x0 = shape.x;
      const y0 = shape.y;
      const w = shape.width;
      const h = shape.height;
      const d = [
        "M " + (x0 + w * 0.2) + " " + (y0 + h * 0.68),
        "C " + (x0 + w * 0.04) + " " + (y0 + h * 0.68) + " " + (x0 + w * 0.04) + " " + (y0 + h * 0.46) + " " + (x0 + w * 0.18) + " " + (y0 + h * 0.44),
        "C " + (x0 + w * 0.12) + " " + (y0 + h * 0.2) + " " + (x0 + w * 0.34) + " " + (y0 + h * 0.12) + " " + (x0 + w * 0.46) + " " + (y0 + h * 0.24),
        "C " + (x0 + w * 0.52) + " " + (y0 + h * 0.04) + " " + (x0 + w * 0.8) + " " + (y0 + h * 0.08) + " " + (x0 + w * 0.84) + " " + (y0 + h * 0.28),
        "C " + (x0 + w * 0.98) + " " + (y0 + h * 0.3) + " " + (x0 + w) + " " + (y0 + h * 0.58) + " " + (x0 + w * 0.82) + " " + (y0 + h * 0.64),
        "C " + (x0 + w * 0.8) + " " + (y0 + h * 0.84) + " " + (x0 + w * 0.56) + " " + (y0 + h * 0.9) + " " + (x0 + w * 0.44) + " " + (y0 + h * 0.78),
        "C " + (x0 + w * 0.3) + " " + (y0 + h * 0.9) + " " + (x0 + w * 0.12) + " " + (y0 + h * 0.84) + " " + (x0 + w * 0.2) + " " + (y0 + h * 0.68),
        "Z",
      ].join(" ");
      appendPathShape(d);
      if (kind === "cloud_callout") {
        const tail = [
          { x: x0 + w * 0.28, y: y0 + h * 0.82 },
          { x: x0 + w * 0.18, y: y0 + h },
          { x: x0 + w * 0.4, y: y0 + h * 0.86 },
        ];
        appendPolygonShape(tail);
      }
    } else if (kind === "header_container") {
      const headerRect = groupHeaderRect(shape);
      const headerH = headerRect ? headerRect.height : componentGroupHeaderHeight(shape);
      group.appendChild(createSvg("rect", Object.assign({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: roundedRadius,
        ry: roundedRadius,
      }, commonStroke)));
      group.appendChild(createSvg("rect", {
        x: headerRect ? (headerRect.x + 1) : (shape.x + 1),
        y: headerRect ? (headerRect.y + 1) : (shape.y + 1),
        width: headerRect ? Math.max(1, headerRect.width - 2) : Math.max(1, shape.width - 2),
        height: Math.max(1, headerH - 1),
        fill: darken(shape.fill, -16),
        stroke: "none",
        rx: Math.max(0, roundedRadius - 1),
        ry: Math.max(0, roundedRadius - 1),
      }));
      appendStrokeLine({
        x1: shape.x,
        y1: headerRect ? (headerRect.y + headerRect.height) : (shape.y + headerH),
        x2: shape.x + shape.width,
        y2: headerRect ? (headerRect.y + headerRect.height) : (shape.y + headerH),
      }, separatorWidth);
    } else if (kind === "table_group") {
      const layout = groupFormLayout(shape);
      const components = normalizeGroupComponents(shape.components, layout.rows * layout.cols, shape);
      shape.components = components;
      const headerRect = layout.headerRect;
      group.appendChild(createSvg("rect", Object.assign({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: roundedRadius,
        ry: roundedRadius,
      }, commonStroke)));
      if (headerRect) {
        group.appendChild(createSvg("rect", {
          x: headerRect.x + 1,
          y: headerRect.y + 1,
          width: Math.max(1, headerRect.width - 2),
          height: Math.max(1, headerRect.height - 2),
          fill: darken(shape.fill, -14),
          stroke: "none",
          rx: Math.max(0, roundedRadius - 1),
          ry: Math.max(0, roundedRadius - 1),
        }));
        if (headerRect.side === "top") {
          appendStrokeLine({
            x1: shape.x,
            y1: headerRect.y + headerRect.height,
            x2: shape.x + shape.width,
            y2: headerRect.y + headerRect.height,
          }, separatorWidth);
        } else if (headerRect.side === "bottom") {
          appendStrokeLine({
            x1: shape.x,
            y1: headerRect.y,
            x2: shape.x + shape.width,
            y2: headerRect.y,
          }, separatorWidth);
        } else if (headerRect.side === "left") {
          appendStrokeLine({
            x1: headerRect.x + headerRect.width,
            y1: shape.y,
            x2: headerRect.x + headerRect.width,
            y2: shape.y + shape.height,
          }, separatorWidth);
        } else if (headerRect.side === "right") {
          appendStrokeLine({
            x1: headerRect.x,
            y1: shape.y,
            x2: headerRect.x,
            y2: shape.y + shape.height,
          }, separatorWidth);
        }
      }

      layout.components.forEach((box, idx) => {
        const component = components[idx] || defaultGroupComponent(idx, shape);
        const effectiveFill = effectiveGroupComponentFill(shape, component);
        const cornerRadii = groupCellCornerRadii(shape, layout, box);
        if (cornerRadii.tl || cornerRadii.tr || cornerRadii.br || cornerRadii.bl) {
          group.appendChild(createSvg("path", {
            d: roundedRectPathSelective(box.x, box.y, box.width, box.height, cornerRadii),
            fill: effectiveFill,
            stroke: "none",
            "data-group-component-index": idx,
          }));
        } else {
          group.appendChild(createSvg("rect", {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            fill: effectiveFill,
            stroke: "none",
            "data-group-component-index": idx,
          }));
        }
        renderRichTextBlockSpec(group, component, applyTextBoxAdjustments(componentBoxTextBox(box), component, {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        }));
      });

      layout.verticalDividers.forEach((divider) => {
        appendStrokeLine({
          x1: divider.x,
          y1: divider.y1,
          x2: divider.x,
          y2: divider.y2,
        }, minorSeparatorWidth);
      });
      layout.horizontalDividers.forEach((divider) => {
        appendStrokeLine({
          x1: divider.x1,
          y1: divider.y,
          x2: divider.x2,
          y2: divider.y,
        }, minorSeparatorWidth);
      });
    } else if (kind === "component_group") {
      const layout = componentGroupLayout(shape);
      const components = normalizeGroupComponents(shape.components, shape.componentCount, shape);
      const headerRect = layout.headerRect;
      const headerH = headerRect ? headerRect.height : componentGroupHeaderHeight(shape);
      shape.components = components;
      group.appendChild(createSvg("rect", Object.assign({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: roundedRadius,
        ry: roundedRadius,
      }, commonStroke)));
      group.appendChild(createSvg("rect", {
        x: headerRect ? (headerRect.x + 1) : (shape.x + 1),
        y: headerRect ? (headerRect.y + 1) : (shape.y + 1),
        width: headerRect ? Math.max(1, headerRect.width - 2) : Math.max(1, shape.width - 2),
        height: Math.max(1, headerH - 1),
        fill: darken(shape.fill, -14),
        stroke: "none",
        rx: Math.max(0, roundedRadius - 1),
        ry: Math.max(0, roundedRadius - 1),
      }));
      appendStrokeLine({
        x1: shape.x,
        y1: headerRect ? (headerRect.y + headerRect.height) : (shape.y + headerH),
        x2: shape.x + shape.width,
        y2: headerRect ? (headerRect.y + headerRect.height) : (shape.y + headerH),
      }, separatorWidth);

      layout.components.forEach((box, idx) => {
        const component = components[idx] || defaultGroupComponent(idx, shape);
        const effectiveFill = effectiveGroupComponentFill(shape, component);
        const cornerRadii = groupCellCornerRadii(shape, layout, box);
        let bodyEl;
        if (cornerRadii.tl || cornerRadii.tr || cornerRadii.br || cornerRadii.bl) {
          bodyEl = createSvg("path", {
            d: roundedRectPathSelective(box.x, box.y, box.width, box.height, cornerRadii),
            fill: effectiveFill,
            stroke: "none",
            "data-group-component-index": idx,
          });
        } else {
          bodyEl = createSvg("rect", {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            fill: effectiveFill,
            stroke: "none",
            "data-group-component-index": idx,
          });
        }
        group.appendChild(bodyEl);
        renderRichTextBlockSpec(group, component, applyTextBoxAdjustments(componentBoxTextBox(box), component, {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        }));
      });

      if (layout.direction === "horizontal") {
        layout.components.forEach((box, idx) => {
          if (idx === 0) return;
          appendStrokeLine({
            x1: box.x,
            y1: layout.bodyY,
            x2: box.x,
            y2: layout.bodyY + layout.bodyHeight,
          }, minorSeparatorWidth);
        });
      } else {
        layout.components.forEach((box, idx) => {
          if (idx === 0) return;
          appendStrokeLine({
            x1: layout.bodyX,
            y1: box.y,
            x2: layout.bodyX + layout.bodyWidth,
            y2: box.y,
          }, minorSeparatorWidth);
        });
      }
    } else {
      group.appendChild(createSvg("rect", Object.assign({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: roundedRadius,
        ry: roundedRadius,
      }, commonStroke)));
    }

    renderRichTextBlock(group, shape, shapeTextBox(shape));
  }

  function renderShape(shapeLayer, shape) {
    const isSelected = isShapeSelected(shape.id);
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
    const transform = shapeTransform(shape);
    if (transform) {
      group.setAttribute("transform", transform);
    }
    renderShapeVisual(group, shape, stroke, strokeWidth);
    group.addEventListener("pointerdown", (evt) => onShapePointerDown(evt, shape.id));
    shapeLayer.appendChild(group);
  }

  function getAnchorStops() {
    return state.model.anchors.stops && state.model.anchors.stops.length
      ? state.model.anchors.stops
      : DEFAULT_ANCHOR_STOPS;
  }

  function endpointFraction(endpoint) {
    if (endpoint && Number.isFinite(Number(endpoint.anchorFraction))) {
      return normalizeAnchorFraction(endpoint.anchorFraction, 0.5);
    }
    return anchorFractionForIndex(endpoint && endpoint.anchorIndex);
  }

  function endpointPoint(endpoint) {
    if (endpoint && endpoint.shapeId && shapeById(endpoint.shapeId)) {
      return getAnchorPoint(endpoint);
    }
    return {
      x: Number(endpoint && endpoint.x) || 0,
      y: Number(endpoint && endpoint.y) || 0,
    };
  }

  function describeEndpoint(endpoint) {
    const point = endpointPoint(endpoint || {});
    if (endpoint && endpoint.shapeId && shapeById(endpoint.shapeId)) {
      const fractionPct = Math.round(endpointFraction(endpoint) * 100);
      return escapeHtml(endpoint.shapeId) + " (" + normalizeSide(endpoint.side) + " " + fractionPct + "%)";
    }
    return "Free point (" + roundNum(point.x) + ", " + roundNum(point.y) + ")";
  }

  function shapePerimeterPreviewPath(shape) {
    if (!shape) return "";
    const samples = [];
    const sampleCount = 40;
    for (let i = 0; i <= sampleCount; i += 1) {
      samples.push(getAnchorPoint({ shapeId: shape.id, side: "top", anchorFraction: i / sampleCount }));
    }
    for (let i = 1; i <= sampleCount; i += 1) {
      samples.push(getAnchorPoint({ shapeId: shape.id, side: "right", anchorFraction: i / sampleCount }));
    }
    for (let i = sampleCount - 1; i >= 0; i -= 1) {
      samples.push(getAnchorPoint({ shapeId: shape.id, side: "bottom", anchorFraction: i / sampleCount }));
    }
    for (let i = sampleCount - 1; i >= 1; i -= 1) {
      samples.push(getAnchorPoint({ shapeId: shape.id, side: "left", anchorFraction: i / sampleCount }));
    }
    if (!samples.length) return "";
    const d = ["M " + samples[0].x + " " + samples[0].y];
    for (let i = 1; i < samples.length; i += 1) {
      d.push("L " + samples[i].x + " " + samples[i].y);
    }
    d.push("Z");
    return d.join(" ");
  }

  function appendPerimeterPreviewStroke(layer, tag, attrs) {
    const halo = createSvg(tag, Object.assign({}, attrs, {
      fill: "none",
      stroke: "#eef7ff",
      "stroke-width": 6,
      opacity: 0.68,
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none",
    }));
    const line = createSvg(tag, Object.assign({}, attrs, {
      fill: "none",
      stroke: "#36a3ff",
      "stroke-width": 2.4,
      "stroke-dasharray": "7 4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none",
    }));
    layer.appendChild(halo);
    layer.appendChild(line);
  }

  function groupFormCellMidpointMarks(shape) {
    if (!shape || !isGroupFormKind(shape.kind)) return [];
    const layout = groupFormLayout(shape);
    const bodyLeft = layout.bodyX;
    const bodyTop = layout.bodyY;
    const bodyRight = layout.bodyX + layout.bodyWidth;
    const bodyBottom = layout.bodyY + layout.bodyHeight;
    const marks = [];
    const seen = new Set();
    layout.components.forEach((box) => {
      const boxMarks = [];
      if (Math.abs(box.x - bodyLeft) < 0.5) {
        boxMarks.push({ x: box.x, y: box.y + box.height / 2 });
      }
      if (Math.abs((box.x + box.width) - bodyRight) < 0.5) {
        boxMarks.push({ x: box.x + box.width, y: box.y + box.height / 2 });
      }
      if (Math.abs(box.y - bodyTop) < 0.5) {
        boxMarks.push({ x: box.x + box.width / 2, y: box.y });
      }
      if (Math.abs((box.y + box.height) - bodyBottom) < 0.5) {
        boxMarks.push({ x: box.x + box.width / 2, y: box.y + box.height });
      }
      boxMarks.forEach((mark) => {
        const worldMark = shapeWorldPoint(mark, shape);
        const key = roundNum(worldMark.x) + ":" + roundNum(worldMark.y);
        if (seen.has(key)) return;
        seen.add(key);
        marks.push(worldMark);
      });
    });
    return marks;
  }

  function appendGroupFormCellMidpointMarks(layer, shape) {
    if (!layer || !shape || !isGroupFormKind(shape.kind)) return;
    groupFormCellMidpointMarks(shape).forEach((mark) => {
        layer.appendChild(createSvg("circle", {
          cx: mark.x,
          cy: mark.y,
          r: 3.2,
          fill: "#eef7ff",
          stroke: "#36a3ff",
          "stroke-width": 1.2,
          "vector-effect": "non-scaling-stroke",
          "pointer-events": "none",
        }));
    });
  }

  function endpointMatchesGroupFormMidpoint(endpoint) {
    if (!endpoint || !endpoint.shapeId) return false;
    const shape = shapeById(endpoint.shapeId);
    if (!shape || !isGroupFormKind(shape.kind)) return false;
    const point = endpointPoint(endpoint);
    return groupFormCellMidpointMarks(shape).some((mark) => distance2(point, mark) <= 4);
  }

  function renderConnectPerimeterPreview(layer, shape) {
    if (!shape) return;
    if (shape.kind === "circle" || shape.kind === "oval") {
      appendPerimeterPreviewStroke(layer, "ellipse", {
        cx: shape.x + shape.width / 2,
        cy: shape.y + shape.height / 2,
        rx: shape.width / 2,
        ry: shape.height / 2,
      });
      return;
    }
    const d = shapePerimeterPreviewPath(shape);
    if (!d) return;
    appendPerimeterPreviewStroke(layer, "path", { d: d });
    appendGroupFormCellMidpointMarks(layer, shape);
  }

  function sameConnectPreview(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.shapeId === b.shapeId;
  }

  function updateConnectPreview(point, preferredShapeId, skipRender) {
    let nextPreview = null;
    const anchor = point ? nearestAnchor(point, preferredShapeId || "") : null;
    if (anchor && anchor.shapeId) {
      nextPreview = { shapeId: anchor.shapeId };
    }
    if (sameConnectPreview(state.connectPreview, nextPreview)) return;
    state.connectPreview = nextPreview;
    if (!skipRender) render(true);
  }

  function getAnchorPoint(endpoint) {
    const shape = shapeById(endpoint.shapeId);
    if (!shape) {
      return {
        x: Number(endpoint && endpoint.x) || 0,
        y: Number(endpoint && endpoint.y) || 0,
      };
    }
    const frac = endpointFraction(endpoint);
    const side = normalizeSide(endpoint.side);
    const x0 = shape.x;
    const y0 = shape.y;
    const w = shape.width;
    const h = shape.height;
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;
    let anchor = null;

    if (FRAME_ANCHOR_EXCEPTION_KINDS.has(shape.kind)) {
      if (side === "left") anchor = { x: x0, y: y0 + h * frac };
      else if (side === "right") anchor = { x: x0 + w, y: y0 + h * frac };
      else if (side === "top") anchor = { x: x0 + w * frac, y: y0 };
      else anchor = { x: x0 + w * frac, y: y0 + h };
      return shapeWorldPoint(anchor, shape);
    }

    if (shape.kind === "circle" || shape.kind === "oval") {
      const rx = Math.max(0.01, w / 2);
      const ry = Math.max(0.01, h / 2);
      if (side === "left" || side === "right") {
        const y = y0 + h * frac;
        const ny = (y - cy) / ry;
        const k = Math.sqrt(Math.max(0, 1 - ny * ny));
        const x = cx + (side === "left" ? -rx : rx) * k;
        return shapeWorldPoint({ x: x, y: y }, shape);
      }
      const x = x0 + w * frac;
      const nx = (x - cx) / rx;
      const k = Math.sqrt(Math.max(0, 1 - nx * nx));
      const y = cy + (side === "top" ? -ry : ry) * k;
      return shapeWorldPoint({ x: x, y: y }, shape);
    }

    if (shape.kind === "triangle") {
      const top = { x: cx, y: y0 };
      const bl = { x: x0, y: y0 + h };
      const br = { x: x0 + w, y: y0 + h };
      if (side === "left") {
        anchor = {
          x: top.x + (bl.x - top.x) * frac,
          y: top.y + (bl.y - top.y) * frac,
        };
        return shapeWorldPoint(anchor, shape);
      }
      if (side === "right") {
        anchor = {
          x: top.x + (br.x - top.x) * frac,
          y: top.y + (br.y - top.y) * frac,
        };
        return shapeWorldPoint(anchor, shape);
      }
      if (side === "bottom") return shapeWorldPoint({ x: x0 + w * frac, y: y0 + h }, shape);
      if (frac <= 0.5) {
        const u = frac / 0.5;
        anchor = {
          x: bl.x + (top.x - bl.x) * u,
          y: bl.y + (top.y - bl.y) * u,
        };
        return shapeWorldPoint(anchor, shape);
      }
      const u = (frac - 0.5) / 0.5;
      anchor = {
        x: top.x + (br.x - top.x) * u,
        y: top.y + (br.y - top.y) * u,
      };
      return shapeWorldPoint(anchor, shape);
    }

    if (shape.kind === "cone") {
      const rx = w / 2;
      const ry = Math.max(8, Math.min(14, h * 0.11));
      const apex = { x: cx, y: y0 };
      const baseCy = y0 + h - ry;
      const leftBase = { x: cx - rx, y: baseCy };
      const rightBase = { x: cx + rx, y: baseCy };
      if (side === "left") return shapeWorldPoint(lerpPoint(apex, leftBase, frac), shape);
      if (side === "right") return shapeWorldPoint(lerpPoint(apex, rightBase, frac), shape);
      if (side === "bottom") {
        const targetX = cx - rx + rx * 2 * frac;
        const nx = (targetX - cx) / Math.max(0.01, rx);
        const k = Math.sqrt(Math.max(0, 1 - nx * nx));
        return shapeWorldPoint({ x: targetX, y: baseCy + ry * k }, shape);
      }
      if (frac <= 0.5) {
        return shapeWorldPoint(lerpPoint(leftBase, apex, frac / 0.5), shape);
      }
      return shapeWorldPoint(lerpPoint(apex, rightBase, (frac - 0.5) / 0.5), shape);
    }

    if (shape.kind === "or") {
      const curves = orCurvePoints(shape);
      if (side === "left") {
        return shapeWorldPoint(quadraticBezierPoint(curves.startTop, curves.leftControl, curves.startBottom, frac), shape);
      }
    }

    const polygonVertices = polygonVerticesForShape(shape);
    if (polygonVertices) {
      const target = side === "left"
        ? { x: x0, y: y0 + h * frac }
        : side === "right"
          ? { x: x0 + w, y: y0 + h * frac }
          : side === "top"
            ? { x: x0 + w * frac, y: y0 }
            : { x: x0 + w * frac, y: y0 + h };
      const projected = closestPointOnPolygon(target, polygonVertices);
      if (projected) return shapeWorldPoint({ x: projected.x, y: projected.y }, shape);
    }

    if (shape.kind === "cylinder") {
      const rx = Math.max(0.01, w / 2);
      const ry = Math.max(8, Math.min(16, h * 0.12));
      const topCy = y0 + ry + 2;
      const bottomCy = y0 + h - ry - 2;
      if (side === "left") return shapeWorldPoint({ x: x0, y: topCy + (bottomCy - topCy) * frac }, shape);
      if (side === "right") return shapeWorldPoint({ x: x0 + w, y: topCy + (bottomCy - topCy) * frac }, shape);
      const targetX = x0 + w * frac;
      const nx = (targetX - cx) / rx;
      const k = Math.sqrt(Math.max(0, 1 - nx * nx));
      const targetCy = side === "top" ? topCy : bottomCy;
      return shapeWorldPoint({ x: targetX, y: targetCy + (side === "top" ? -ry : ry) * k }, shape);
    }

    if (shape.kind === "cloud" || shape.kind === "cloud_callout") {
      const rx = Math.max(0.01, w / 2);
      const ry = Math.max(0.01, h * 0.42);
      if (side === "left" || side === "right") {
        const y = y0 + h * frac;
        const ny = (y - cy) / ry;
        const k = Math.sqrt(Math.max(0, 1 - ny * ny));
        return shapeWorldPoint({ x: cx + (side === "left" ? -rx : rx) * k, y: y }, shape);
      }
      const x = x0 + w * frac;
      const nx = (x - cx) / rx;
      const k = Math.sqrt(Math.max(0, 1 - nx * nx));
      return shapeWorldPoint({ x: x, y: cy + (side === "top" ? -ry : ry) * k }, shape);
    }

    if (side === "left") anchor = { x: x0, y: y0 + h * frac };
    else if (side === "right") anchor = { x: x0 + w, y: y0 + h * frac };
    else if (side === "top") anchor = { x: x0 + w * frac, y: y0 };
    else anchor = { x: x0 + w * frac, y: y0 + h };
    return shapeWorldPoint(anchor, shape);
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

  function closestPointOnPolygon(point, vertices) {
    if (!Array.isArray(vertices) || vertices.length < 2) return null;
    let best = null;
    for (let i = 0; i < vertices.length; i += 1) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];
      const projected = projectPointToSegment(point, a, b);
      if (!best || projected.d2 < best.d2) {
        best = projected;
      }
    }
    return best;
  }

  function orCurvePoints(shape) {
    const x = shape.x;
    const y = shape.y;
    const w = shape.width;
    const h = shape.height;
    return {
      startTop: { x: x + w * 0.1, y: y },
      topControl: { x: x + w * 0.62, y: y },
      rightMid: { x: x + w, y: y + h / 2 },
      bottomControl: { x: x + w * 0.62, y: y + h },
      startBottom: { x: x + w * 0.1, y: y + h },
      leftControl: { x: x + w * 0.26, y: y + h / 2 },
    };
  }

  function buildAnchorCandidate(shape, side, frac, point) {
    const anchor = getAnchorPoint({ shapeId: shape.id, side: side, anchorFraction: frac });
    return {
      shapeId: shape.id,
      side: side,
      anchorFraction: normalizeAnchorFraction(frac, 0.5),
      x: anchor.x,
      y: anchor.y,
      d2: distance2(point, anchor),
    };
  }

  function nearestAnchorForShape(shape, point, preferredSide) {
    if (!shape) return null;
    const localPoint = shapeLocalPoint(point, shape);
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
      const leftProj = projectPointToSegment(localPoint, top, bl);
      const rightProj = projectPointToSegment(localPoint, top, br);
      const bottomFrac = shape.width <= 0 ? 0.5 : clamp((localPoint.x - x0) / shape.width, 0, 1);

      candidates.push(buildAnchorCandidate(shape, "left", leftProj.t, point));
      candidates.push(buildAnchorCandidate(shape, "right", rightProj.t, point));
      candidates.push(buildAnchorCandidate(shape, "bottom", bottomFrac, point));
    } else if (shape.kind === "cone") {
      const rx = shape.width / 2;
      const ry = Math.max(8, Math.min(14, shape.height * 0.11));
      const apex = { x: cx, y: y0 };
      const baseCy = y0 + shape.height - ry;
      const leftBase = { x: cx - rx, y: baseCy };
      const rightBase = { x: cx + rx, y: baseCy };
      const leftProj = projectPointToSegment(localPoint, apex, leftBase);
      const rightProj = projectPointToSegment(localPoint, apex, rightBase);
      const bottomFrac = shape.width <= 0 ? 0.5 : clamp((localPoint.x - x0) / shape.width, 0, 1);
      candidates.push(buildAnchorCandidate(shape, "left", leftProj.t, point));
      candidates.push(buildAnchorCandidate(shape, "right", rightProj.t, point));
      candidates.push(buildAnchorCandidate(shape, "bottom", bottomFrac, point));
    } else if (shape.kind === "circle" || shape.kind === "oval") {
      const h = Math.max(0.01, shape.height);
      const w = Math.max(0.01, shape.width);
      candidates.push(buildAnchorCandidate(shape, "left", clamp((localPoint.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "right", clamp((localPoint.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "top", clamp((localPoint.x - x0) / w, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "bottom", clamp((localPoint.x - x0) / w, 0, 1), point));
    } else if (shape.kind === "cylinder" || polygonVerticesForShape(shape)) {
      const h = Math.max(0.01, shape.height);
      const w = Math.max(0.01, shape.width);
      candidates.push(buildAnchorCandidate(shape, "left", clamp((localPoint.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "right", clamp((localPoint.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "top", clamp((localPoint.x - x0) / w, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "bottom", clamp((localPoint.x - x0) / w, 0, 1), point));
    } else {
      const h = Math.max(0.01, shape.height);
      const w = Math.max(0.01, shape.width);
      candidates.push(buildAnchorCandidate(shape, "left", clamp((localPoint.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "right", clamp((localPoint.y - y0) / h, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "top", clamp((localPoint.x - x0) / w, 0, 1), point));
      candidates.push(buildAnchorCandidate(shape, "bottom", clamp((localPoint.x - x0) / w, 0, 1), point));
    }

    let best = null;
    let preferred = null;
    candidates.forEach((candidate) => {
      if (candidate.side === preferredSide && (!preferred || candidate.d2 < preferred.d2)) {
        preferred = candidate;
      }
      if (!best || candidate.d2 < best.d2) best = candidate;
    });
    if (preferred && best && best.side !== preferred.side && preferred.d2 <= best.d2 + ANCHOR_SIDE_SWITCH_HYSTERESIS) {
      return preferred;
    }
    return best;
  }

  function nearestAnchor(point, preferredShapeId, preferredSide) {
    const preferredShape = preferredShapeId ? shapeById(preferredShapeId) : null;
    let best = null;

    state.model.shapes.forEach((shape) => {
      const candidate = nearestAnchorForShape(shape, point, preferredShape && preferredShape.id === shape.id ? preferredSide : "");
      if (!candidate) return;
      const rawD2 = candidate.d2;
      let score = rawD2;
      if (preferredShape && preferredShape.id === shape.id) score -= 8;
      if (!best || score < best.score) {
        best = Object.assign({ score: score, rawD2: rawD2 }, candidate);
      }
    });

    if (!best) return null;
    if (best.rawD2 > (FREE_ENDPOINT_SNAP_DISTANCE * FREE_ENDPOINT_SNAP_DISTANCE)) {
      return null;
    }
    return {
      shapeId: best.shapeId,
      side: best.side,
      anchorFraction: best.anchorFraction,
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
    const from = endpointPoint(arrow.from);
    const to = endpointPoint(arrow.to);
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

    const isSelected = isArrowSelected(arrow.id);
    const stroke = isSelected ? "#ffd76b" : arrow.stroke;
    const width = isSelected ? (arrow.width + 1.2) : arrow.width;

    const attrs = {
      d: geom.path,
      fill: "none",
      stroke: stroke,
      "stroke-width": width,
      "stroke-dasharray": dashArrayForStyle(arrow.lineStyle),
      "stroke-linecap": lineCapForStyle(arrow.lineStyle),
      style: "cursor:pointer",
      "data-arrow-id": arrow.id,
    };

    const connType = normalizeConnectionType(arrow.connectionType);
    if (connType === "directional_connector") {
      attrs["marker-end"] = "url(#editor-arrow-head)";
    } else if (connType === "bidirectional_connector") {
      attrs["marker-start"] = "url(#editor-arrow-head)";
      attrs["marker-end"] = "url(#editor-arrow-head)";
    }

    const interactionPath = createSvg("path", {
      d: geom.path,
      fill: "none",
      stroke: "rgba(0,0,0,0)",
      "stroke-width": Math.max(14, width + 12),
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "pointer-events": "stroke",
      style: "cursor:pointer",
      "data-arrow-id": arrow.id,
    });
    const path = createSvg("path", Object.assign({ "pointer-events": "none" }, attrs));

    const onArrowPointerDown = (evt) => {
      evt.stopPropagation();
      if (evt.metaKey || evt.ctrlKey) {
        const selectedIds = currentSelectedArrowIds();
        const nextIds = selectedIds.slice();
        const existingIdx = nextIds.indexOf(arrow.id);
        if (existingIdx >= 0) {
          nextIds.splice(existingIdx, 1);
        } else {
          nextIds.push(arrow.id);
        }
        setArrowSelection(nextIds, arrow.id);
        return;
      }
      const currentIds = currentSelectedArrowIds();
      const selectionIds = currentIds.indexOf(arrow.id) >= 0 ? currentIds : [arrow.id];
      state.selectedArrowHandle = null;
      setArrowSelection(selectionIds, arrow.id, true);
      if (state.mode === "select" && evt.button === 0 && arrowIsMovable(arrow)) {
        startArrowMoveDrag(evt, arrow.id);
      } else {
        render();
      }
    };

    interactionPath.addEventListener("pointerdown", onArrowPointerDown);
    arrowLayer.appendChild(interactionPath);
    arrowLayer.appendChild(path);
  }

  function selectionBounds(shapeIds) {
    const shapes = normalizeSelectionIds(shapeIds)
      .map((id) => shapeById(id))
      .filter(Boolean);
    if (!shapes.length) return null;
    const bounds = shapes.map((shape) => shapeBounds(shape)).filter(Boolean);
    return boundsFromPoints(
      bounds.reduce((points, bound) => points.concat([
        { x: bound.x, y: bound.y },
        { x: bound.x + bound.width, y: bound.y },
        { x: bound.x + bound.width, y: bound.y + bound.height },
        { x: bound.x, y: bound.y + bound.height },
      ]), [])
    );
  }

  function rectFromPoints(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(a.x - b.x),
      height: Math.abs(a.y - b.y),
    };
  }

  function rectsIntersect(a, b) {
    if (!a || !b) return false;
    return a.x <= b.x + b.width &&
      a.x + a.width >= b.x &&
      a.y <= b.y + b.height &&
      a.y + a.height >= b.y;
  }

  function shapeBounds(shape) {
    if (!shape) return null;
    return boundsFromPoints(rotatedRectCorners(shape));
  }

  function currentCanvasRect() {
    const vb = state.model && state.model.metadata && state.model.metadata.viewBox
      ? state.model.metadata.viewBox
      : DEFAULT_VIEWBOX;
    return {
      x: Number(vb.x) || 0,
      y: Number(vb.y) || 0,
      width: Number(vb.width) || DEFAULT_VIEWBOX.width,
      height: Number(vb.height) || DEFAULT_VIEWBOX.height,
    };
  }

  function currentWorldRect() {
    const canvas = currentCanvasRect();
    return {
      x: canvas.x - WORKSPACE_SURROUND,
      y: canvas.y - WORKSPACE_SURROUND,
      width: canvas.width + WORKSPACE_SURROUND * 2,
      height: canvas.height + WORKSPACE_SURROUND * 2,
    };
  }

  function contentBounds() {
    const points = [];
    const shapes = state.model && Array.isArray(state.model.shapes) ? state.model.shapes : [];
    shapes.forEach((shape) => {
      const bounds = shapeBounds(shape);
      if (!bounds) return;
      points.push({ x: bounds.x, y: bounds.y });
      points.push({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    });

    const arrows = state.model && Array.isArray(state.model.arrows) ? state.model.arrows : [];
    arrows.forEach((arrow) => {
      const geom = buildArrowGeometry(arrow);
      if (geom && geom.from && geom.to) {
        points.push({ x: geom.from.x, y: geom.from.y });
        points.push({ x: geom.to.x, y: geom.to.y });
      }
      (geom && Array.isArray(geom.waypoints) ? geom.waypoints : []).forEach((point) => {
        points.push({ x: point.x, y: point.y });
      });
      (geom && Array.isArray(geom.controlPoints) ? geom.controlPoints : []).forEach((point) => {
        points.push({ x: point.x, y: point.y });
      });
    });

    if (!points.length) return null;
    const left = Math.min.apply(null, points.map((point) => point.x));
    const top = Math.min.apply(null, points.map((point) => point.y));
    const right = Math.max.apply(null, points.map((point) => point.x));
    const bottom = Math.max.apply(null, points.map((point) => point.y));
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }

  function normalizedCanvasRectForContent() {
    const bounds = contentBounds();
    const minX = Math.min(DEFAULT_VIEWBOX.x, bounds ? bounds.x : DEFAULT_VIEWBOX.x);
    const minY = Math.min(DEFAULT_VIEWBOX.y, bounds ? bounds.y : DEFAULT_VIEWBOX.y);
    const maxX = Math.max(
      DEFAULT_VIEWBOX.x + DEFAULT_VIEWBOX.width,
      bounds ? (bounds.x + bounds.width) : (DEFAULT_VIEWBOX.x + DEFAULT_VIEWBOX.width)
    );
    const maxY = Math.max(
      DEFAULT_VIEWBOX.y + DEFAULT_VIEWBOX.height,
      bounds ? (bounds.y + bounds.height) : (DEFAULT_VIEWBOX.y + DEFAULT_VIEWBOX.height)
    );
    const snappedMinX = Math.floor(minX / WORKSPACE_EXPAND_CHUNK) * WORKSPACE_EXPAND_CHUNK;
    const snappedMinY = Math.floor(minY / WORKSPACE_EXPAND_CHUNK) * WORKSPACE_EXPAND_CHUNK;
    const snappedMaxX = Math.ceil(maxX / WORKSPACE_EXPAND_CHUNK) * WORKSPACE_EXPAND_CHUNK;
    const snappedMaxY = Math.ceil(maxY / WORKSPACE_EXPAND_CHUNK) * WORKSPACE_EXPAND_CHUNK;
    return {
      x: snappedMinX,
      y: snappedMinY,
      width: Math.max(DEFAULT_VIEWBOX.width, snappedMaxX - snappedMinX),
      height: Math.max(DEFAULT_VIEWBOX.height, snappedMaxY - snappedMinY),
    };
  }

  function syncCanvasRectToContent() {
    if (!state.model || !state.model.metadata) return false;
    const current = currentCanvasRect();
    const next = normalizedCanvasRectForContent();
    if (
      current.x === next.x &&
      current.y === next.y &&
      current.width === next.width &&
      current.height === next.height
    ) {
      return false;
    }
    queueViewportCompensation(current, next);
    state.model.metadata.viewBox = next;
    return true;
  }

  function expandCanvasForRect(rect, triggerOverride) {
    if (!rect || !state.model || !state.model.metadata) return false;
    const canvas = currentCanvasRect();
    const trigger = Number.isFinite(triggerOverride) ? triggerOverride : workspaceExpandTriggerWorld();
    const next = {
      x: canvas.x,
      y: canvas.y,
      width: canvas.width,
      height: canvas.height,
    };
    let changed = false;
    if (rect.x < canvas.x - trigger) {
      next.x -= WORKSPACE_EXPAND_CHUNK;
      next.width += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }
    if (rect.x + rect.width > canvas.x + canvas.width + trigger) {
      next.width += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }
    if (rect.y < canvas.y - trigger) {
      next.y -= WORKSPACE_EXPAND_CHUNK;
      next.height += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }
    if (rect.y + rect.height > canvas.y + canvas.height + trigger) {
      next.height += WORKSPACE_EXPAND_CHUNK;
      changed = true;
    }
    if (changed) {
      queueViewportCompensation(canvas, next);
      state.model.metadata.viewBox = next;
    }
    return changed;
  }

  function shapeIdsInSelectionRect(rect) {
    if (!rect || rect.width < 1 || rect.height < 1) return [];
    return sortedShapes()
      .filter((shape) => rectsIntersect(rect, shapeBounds(shape)))
      .map((shape) => shape.id);
  }

  function renderGroupDividerHandles(overlayLayer, shape) {
    if (!shape || (shape.kind !== "header_container" && !isGroupFormKind(shape.kind))) return;
    const layout = isGroupFormKind(shape.kind) ? groupFormLayout(shape) : null;
    const dividerStroke = "#8ab8ff";
    const headerRect = layout ? layout.headerRect : groupHeaderRect(shape);
    if (headerRect) {
      if (headerRect.side === "top" || headerRect.side === "bottom") {
        const lineY = headerRect.side === "top" ? (headerRect.y + headerRect.height) : headerRect.y;
        overlayLayer.appendChild(createSvg("line", {
          x1: shape.x,
          y1: lineY,
          x2: shape.x + shape.width,
          y2: lineY,
          stroke: dividerStroke,
          "stroke-width": 1.2,
          "stroke-dasharray": "4 4",
          opacity: 0.7,
          "pointer-events": "none",
        }));
        const handle = createSvg("rect", {
          x: shape.x,
          y: lineY - 7,
          width: Math.max(12, shape.width),
          height: 14,
          fill: "rgba(0,0,0,0)",
          style: "cursor:row-resize",
        });
        handle.addEventListener("pointerdown", (evt) => {
          evt.stopPropagation();
          startGroupHeaderResize(evt, shape.id);
        });
        overlayLayer.appendChild(handle);
      } else {
        const lineX = headerRect.side === "left" ? (headerRect.x + headerRect.width) : headerRect.x;
        overlayLayer.appendChild(createSvg("line", {
          x1: lineX,
          y1: shape.y,
          x2: lineX,
          y2: shape.y + shape.height,
          stroke: dividerStroke,
          "stroke-width": 1.2,
          "stroke-dasharray": "4 4",
          opacity: 0.7,
          "pointer-events": "none",
        }));
        const handle = createSvg("rect", {
          x: lineX - 7,
          y: shape.y,
          width: 14,
          height: Math.max(12, shape.height),
          fill: "rgba(0,0,0,0)",
          style: "cursor:col-resize",
        });
        handle.addEventListener("pointerdown", (evt) => {
          evt.stopPropagation();
          startGroupHeaderResize(evt, shape.id);
        });
        overlayLayer.appendChild(handle);
      }
    }
    if (!layout) return;
    layout.verticalDividers.forEach((divider) => {
      overlayLayer.appendChild(createSvg("line", {
        x1: divider.x,
        y1: divider.y1,
        x2: divider.x,
        y2: divider.y2,
        stroke: dividerStroke,
        "stroke-width": 1.2,
        "stroke-dasharray": "4 4",
        opacity: 0.7,
        "pointer-events": "none",
      }));
      const handle = createSvg("rect", {
        x: divider.x - 7,
        y: divider.y1,
        width: 14,
        height: Math.max(12, divider.y2 - divider.y1),
        fill: "rgba(0,0,0,0)",
        style: "cursor:col-resize",
      });
      handle.addEventListener("pointerdown", (evt) => {
        evt.stopPropagation();
        startGroupDividerResize(evt, shape.id, "x", divider.index);
      });
      overlayLayer.appendChild(handle);
    });
    layout.horizontalDividers.forEach((divider) => {
      overlayLayer.appendChild(createSvg("line", {
        x1: divider.x1,
        y1: divider.y,
        x2: divider.x2,
        y2: divider.y,
        stroke: dividerStroke,
        "stroke-width": 1.2,
        "stroke-dasharray": "4 4",
        opacity: 0.7,
        "pointer-events": "none",
      }));
      const handle = createSvg("rect", {
        x: divider.x1,
        y: divider.y - 7,
        width: Math.max(12, divider.x2 - divider.x1),
        height: 14,
        fill: "rgba(0,0,0,0)",
        style: "cursor:row-resize",
      });
      handle.addEventListener("pointerdown", (evt) => {
        evt.stopPropagation();
        startGroupDividerResize(evt, shape.id, "y", divider.index);
      });
      overlayLayer.appendChild(handle);
    });
  }

  function createShapeOverlayGroup(overlayLayer, shape) {
    const group = createSvg("g");
    const transform = shapeTransform(shape);
    if (transform) {
      group.setAttribute("transform", transform);
    }
    overlayLayer.appendChild(group);
    return group;
  }

  function renderSelectionOverlay(overlayLayer) {
    if (state.connectPreview && state.connectPreview.shapeId) {
      const previewShape = shapeById(state.connectPreview.shapeId);
      renderConnectPerimeterPreview(overlayLayer, previewShape);
    }

    if (state.drag && state.drag.type === "marquee-select") {
      const marquee = rectFromPoints(state.drag.start, state.drag.current || state.drag.start);
      overlayLayer.appendChild(createSvg("rect", {
        x: marquee.x,
        y: marquee.y,
        width: marquee.width,
        height: marquee.height,
        fill: "rgba(126, 174, 255, 0.12)",
        stroke: "#8ab8ff",
        "stroke-width": 1.2,
        "stroke-dasharray": "6 4",
        rx: 4,
        ry: 4,
        "pointer-events": "none",
      }));
    }

    if (!state.selected) return;

    if (state.selected.type === "shape") {
      const selectedIds = currentSelectedShapeIds();
      if (!selectedIds.length) return;
      if (selectedIds.length > 1) {
        const bounds = selectionBounds(selectedIds);
        if (!bounds) return;
        overlayLayer.appendChild(createSvg("rect", {
          x: bounds.x - 6,
          y: bounds.y - 6,
          width: bounds.width + 12,
          height: bounds.height + 12,
          fill: "none",
          stroke: "#ffd76b",
          "stroke-width": 1.5,
          "stroke-dasharray": "8 5",
          rx: 8,
          ry: 8,
          "pointer-events": "none",
        }));
        return;
      }

      const shape = shapeById(selectedIds[0]);
      if (!shape) return;
      const shapeOverlay = createShapeOverlayGroup(overlayLayer, shape);
      shapeOverlay.appendChild(createSvg("rect", {
        x: shape.x - 4,
        y: shape.y - 4,
        width: shape.width + 8,
        height: shape.height + 8,
        fill: "none",
        stroke: "#ffd76b",
        "stroke-width": 1.5,
        "stroke-dasharray": "8 5",
        rx: 8,
        ry: 8,
        "pointer-events": "none",
      }));
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
        shapeOverlay.appendChild(handle);
      });
      const rotateHandleX = shape.x + shape.width + ROTATE_HANDLE_OFFSET;
      const rotateHandleY = shape.y - ROTATE_HANDLE_OFFSET;
      shapeOverlay.appendChild(createSvg("line", {
        x1: shape.x + shape.width,
        y1: shape.y,
        x2: rotateHandleX,
        y2: rotateHandleY,
        stroke: "#ffd76b",
        "stroke-width": 1.5,
        "pointer-events": "none",
      }));
      const rotateHandle = createSvg("circle", {
        cx: rotateHandleX,
        cy: rotateHandleY,
        r: ROTATE_HANDLE_RADIUS,
        fill: "#ffd76b",
        stroke: "#382a00",
        "stroke-width": 1.2,
        style: "cursor:grab",
      });
      rotateHandle.addEventListener("pointerdown", (evt) => {
        evt.stopPropagation();
        startShapeRotate(evt, shape.id);
      });
      shapeOverlay.appendChild(rotateHandle);
      renderGroupDividerHandles(shapeOverlay, shape);
      return;
    }

    if (state.selected.type === "group_component") {
      const selectedEntries = currentSelectedGroupComponents();
      if (!selectedEntries.length) return;
      selectedEntries.forEach((entry) => {
        const shape = shapeById(entry.shapeId);
        if (!shape || !isGroupFormKind(shape.kind)) return;
        const layout = groupFormLayout(shape);
        const box = layout.components[entry.componentIndex];
        if (!box) return;
        const localOverlay = createShapeOverlayGroup(overlayLayer, shape);
        const attrs = {
          fill: "none",
          stroke: "#ffd76b",
          "stroke-width": 1.5,
          "stroke-dasharray": "8 5",
          "pointer-events": "none",
        };
        const cornerRadii = groupCellCornerRadii(shape, layout, box);
        if (cornerRadii.tl || cornerRadii.tr || cornerRadii.br || cornerRadii.bl) {
          localOverlay.appendChild(createSvg("path", Object.assign({
            d: roundedRectPathSelective(box.x - 2, box.y - 2, box.width + 4, box.height + 4, {
              tl: cornerRadii.tl ? cornerRadii.tl + 2 : 0,
              tr: cornerRadii.tr ? cornerRadii.tr + 2 : 0,
              br: cornerRadii.br ? cornerRadii.br + 2 : 0,
              bl: cornerRadii.bl ? cornerRadii.bl + 2 : 0,
            }),
          }, attrs)));
        } else {
          localOverlay.appendChild(createSvg("rect", Object.assign({
            x: box.x - 2,
            y: box.y - 2,
            width: box.width + 4,
            height: box.height + 4,
            rx: 4,
            ry: 4,
          }, attrs)));
        }
      });
      if (selectedEntries.length === 1) {
        const selectedComponent = currentSelectedGroupComponent();
        if (selectedComponent) {
          renderGroupDividerHandles(createShapeOverlayGroup(overlayLayer, selectedComponent.shape), selectedComponent.shape);
        }
      }
      return;
    }

    if (state.selected.type === "arrow") {
      const arrowIds = currentSelectedArrowIds();
      if (arrowIds.length !== 1) return;
      const arrow = arrowById(arrowIds[0]);
      const geom = state.arrowRenderCache[arrowIds[0]];
      const selectedHandle = currentSelectedArrowHandle();
      if (!arrow || !geom) return;

      const markedShapes = new Set();
      [arrow.from, arrow.to].forEach((endpoint) => {
        const shape = endpoint && endpoint.shapeId ? shapeById(endpoint.shapeId) : null;
        if (!shape || !isGroupFormKind(shape.kind) || markedShapes.has(shape.id)) return;
        markedShapes.add(shape.id);
        appendGroupFormCellMidpointMarks(overlayLayer, shape);
      });

      [
        { key: "from", p: geom.from, fill: "#8fe6ff" },
        { key: "to", p: geom.to, fill: "#ff8f8f" },
      ].forEach((ep) => {
        const onMidpoint = endpointMatchesGroupFormMidpoint(arrow[ep.key]);
        const isActive = !!(selectedHandle
          && selectedHandle.type === "endpoint"
          && selectedHandle.arrowId === arrow.id
          && selectedHandle.endpointKey === ep.key);
        const c = createSvg("circle", {
          cx: ep.p.x,
          cy: ep.p.y,
          r: isActive ? 6.2 : 5.2,
          fill: onMidpoint ? "#4fd26b" : (isActive ? "#ffe48f" : ep.fill),
          stroke: isActive ? "#ffe48f" : (onMidpoint ? "#1f5d2b" : "#1a2235"),
          "stroke-width": isActive ? 2.1 : (onMidpoint ? 1.4 : 1),
          style: "cursor:crosshair",
        });
        c.addEventListener("pointerdown", (evt) => {
          evt.stopPropagation();
          setArrowSelection([arrow.id], arrow.id, true);
          setSelectedArrowHandle({ type: "endpoint", arrowId: arrow.id, endpointKey: ep.key }, true);
          startArrowEndpointDrag(evt, arrow.id, ep.key);
        });
        overlayLayer.appendChild(c);
      });

      if (arrow.routing === "curved") {
        geom.controlPoints.forEach((cp, idx) => {
          const isActive = !!(selectedHandle
            && selectedHandle.type === "control"
            && selectedHandle.arrowId === arrow.id
            && selectedHandle.cpIndex === idx);
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
            r: isActive ? 5.6 : 4.8,
            fill: isActive ? "#ffe48f" : "#d6dcff",
            stroke: isActive ? "#5a3900" : "#1a2235",
            "stroke-width": isActive ? 1.8 : 1,
            style: "cursor:move",
          });
          c.addEventListener("pointerdown", (evt) => {
            evt.stopPropagation();
            setArrowSelection([arrow.id], arrow.id, true);
            setSelectedArrowHandle({ type: "control", arrowId: arrow.id, cpIndex: idx }, true);
            startArrowControlPointDrag(evt, arrow.id, idx);
          });
          overlayLayer.appendChild(c);
        });
      } else if (arrow.routing === "angled") {
        (arrow.waypoints || []).forEach((wp, idx) => {
          const isActive = !!(selectedHandle
            && selectedHandle.type === "waypoint"
            && selectedHandle.arrowId === arrow.id
            && selectedHandle.waypointIndex === idx);
          const c = createSvg("rect", {
            x: wp.x - (isActive ? 4.8 : 4.2),
            y: wp.y - (isActive ? 4.8 : 4.2),
            width: isActive ? 9.6 : 8.4,
            height: isActive ? 9.6 : 8.4,
            fill: isActive ? "#ffe48f" : "#b6ffc8",
            stroke: isActive ? "#5a3900" : "#1a2235",
            "stroke-width": isActive ? 1.8 : 1,
            rx: 1.2,
            ry: 1.2,
            style: "cursor:move",
          });
          c.addEventListener("pointerdown", (evt) => {
            evt.stopPropagation();
            setArrowSelection([arrow.id], arrow.id, true);
            setSelectedArrowHandle({ type: "waypoint", arrowId: arrow.id, waypointIndex: idx }, true);
            startArrowWaypointDrag(evt, arrow.id, idx);
          });
          overlayLayer.appendChild(c);
        });
      }
    }
  }

  function renderCanvasTiles(tileLayer, canvas) {
    if (!tileLayer || !canvas) return;
    const minX = canvas.x;
    const minY = canvas.y;
    const maxX = canvas.x + canvas.width;
    const maxY = canvas.y + canvas.height;
    for (let x = minX; x < maxX; x += WORKSPACE_EXPAND_CHUNK) {
      for (let y = minY; y < maxY; y += WORKSPACE_EXPAND_CHUNK) {
        const tileWidth = Math.min(WORKSPACE_EXPAND_CHUNK, maxX - x);
        const tileHeight = Math.min(WORKSPACE_EXPAND_CHUNK, maxY - y);
        tileLayer.appendChild(createSvg("rect", {
          x: x,
          y: y,
          width: tileWidth,
          height: tileHeight,
          fill: "none",
          stroke: "#09111d",
          "stroke-width": 1.8,
          opacity: 0.22,
          "vector-effect": "non-scaling-stroke",
          "pointer-events": "none",
        }));
        tileLayer.appendChild(createSvg("rect", {
          x: x,
          y: y,
          width: tileWidth,
          height: tileHeight,
          fill: "none",
          stroke: "#6280a8",
          "stroke-width": 0.85,
          opacity: 0.34,
          "vector-effect": "non-scaling-stroke",
          "pointer-events": "none",
        }));
      }
    }
  }

  function render(skipInspector) {
    ensureModelDefaults();
    applyViewBox();

    els.svg.innerHTML = "";
    state.arrowRenderCache = {};
    ensureDefs();

    const canvas = currentCanvasRect();
    const world = currentWorldRect();
    els.svg.appendChild(createSvg("rect", {
      x: world.x,
      y: world.y,
      width: world.width,
      height: world.height,
      fill: "#060c18",
      "pointer-events": "none",
    }));
    els.svg.appendChild(createSvg("rect", {
      x: canvas.x,
      y: canvas.y,
      width: canvas.width,
      height: canvas.height,
      fill: state.model.metadata.background || "#0b1220",
      stroke: "#38527c",
      "stroke-width": 1.6,
      rx: 8,
      ry: 8,
    }));
    els.svg.appendChild(createSvg("rect", {
      x: canvas.x,
      y: canvas.y,
      width: canvas.width,
      height: canvas.height,
      fill: "url(#editor-grid-minor)",
      opacity: 0.9,
      "pointer-events": "none",
    }));
    els.svg.appendChild(createSvg("rect", {
      x: canvas.x,
      y: canvas.y,
      width: canvas.width,
      height: canvas.height,
      fill: "url(#editor-grid-major)",
      opacity: 1,
      "pointer-events": "none",
    }));

    const tileLayer = createSvg("g");
    const contentLayer = createSvg("g");
    const overlayLayer = createSvg("g");

    els.svg.appendChild(tileLayer);
    els.svg.appendChild(contentLayer);
    els.svg.appendChild(overlayLayer);

    renderCanvasTiles(tileLayer, canvas);
    sortedRenderableItems().forEach((entry) => {
      if (entry.type === "shape") {
        renderShape(contentLayer, entry.item);
      } else {
        renderArrow(contentLayer, entry.item);
      }
    });

    renderSelectionOverlay(overlayLayer);
    applyPendingViewportScroll();
    updateToolButtonStates();
    if (!skipInspector) {
      renderInspector();
    }
  }

  function updateToolButtonStates() {
    els.toolSelectBtn.classList.toggle("active", state.mode === "select");
    if (els.connectionToolsGrid) {
      Array.from(els.connectionToolsGrid.querySelectorAll("[data-mode]")).forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === state.mode);
      });
    }
  }

  function setSelected(sel) {
    if (!sel) {
      state.selected = null;
      state.selectedShapeIds = [];
      state.selectedArrowIds = [];
      state.selectedGroupComponents = [];
      state.selectedArrowHandle = null;
      render();
      return;
    }
    if (sel.type === "shape") {
      setShapeSelection([sel.id], sel.id);
      return;
    }
    if (sel.type === "group_component") {
      const shape = shapeById(sel.shapeId);
      if (!shape || !isGroupFormKind(shape.kind)) {
        state.selected = null;
        state.selectedShapeIds = [];
        state.selectedArrowIds = [];
        state.selectedGroupComponents = [];
        state.selectedArrowHandle = null;
        render();
        return;
      }
      const componentCount = groupFormLayout(shape).components.length;
      const maxIndex = Math.max(0, Math.min(componentCount - 1, Number(sel.componentIndex) || 0));
      setGroupComponentSelection([{ shapeId: shape.id, componentIndex: maxIndex }], {
        shapeId: shape.id,
        componentIndex: maxIndex,
      });
      return;
    }
    if (sel.type === "arrow") {
      setArrowSelection([sel.id], sel.id);
      return;
    }
    state.selected = sel;
    state.selectedShapeIds = [];
    state.selectedArrowIds = [];
    state.selectedGroupComponents = [];
    state.selectedArrowHandle = null;
    render();
  }

  function currentSelectedGroupComponent() {
    const selectedEntries = currentSelectedGroupComponents();
    if (!selectedEntries.length) return null;
    const primary = (state.selected && state.selected.type === "group_component")
      ? selectedEntries.find((entry) => entry.shapeId === state.selected.shapeId && entry.componentIndex === state.selected.componentIndex) || selectedEntries[selectedEntries.length - 1]
      : selectedEntries[selectedEntries.length - 1];
    const shape = shapeById(primary.shapeId);
    if (!shape || !isGroupFormKind(shape.kind)) return null;
    const count = groupFormLayout(shape).components.length;
    shape.components = normalizeGroupComponents(shape.components, count, shape);
    const index = Math.max(0, Math.min(shape.components.length - 1, Number(primary.componentIndex) || 0));
    const component = shape.components[index];
    if (!component) return null;
    return {
      shape: shape,
      component: component,
      componentIndex: index,
      key: groupComponentSelectionKey(shape.id, index),
    };
  }

  function getGroupComponentAt(shape, componentIndex) {
    if (!shape || !isGroupFormKind(shape.kind)) return null;
    const count = groupFormLayout(shape).components.length;
    shape.components = normalizeGroupComponents(shape.components, count, shape);
    const safeIndex = Math.max(0, Math.min(shape.components.length - 1, Number(componentIndex) || 0));
    return shape.components[safeIndex] || null;
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
    const canvas = currentCanvasRect();
    return { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 };
  }

  function freeEndpointAt(point) {
    return {
      shapeId: "",
      side: "right",
      anchorFraction: 0.5,
      x: point.x,
      y: point.y,
    };
  }

  function pointDistanceToShapeFrame(point, shape) {
    if (!shape) return Infinity;
    const local = shapeLocalPoint(point, shape);
    return Math.min(
      Math.abs(local.x - shape.x),
      Math.abs(local.x - (shape.x + shape.width)),
      Math.abs(local.y - shape.y),
      Math.abs(local.y - (shape.y + shape.height))
    );
  }

  function endpointForShapePointer(shape, point) {
    if (!shape) return freeEndpointAt(point);
    if ((isContainerKind(shape.kind) || isGroupFormKind(shape.kind)) && pointDistanceToShapeFrame(point, shape) > CONTAINER_FREE_ENDPOINT_MARGIN) {
      return freeEndpointAt(point);
    }
    const anchor = nearestAnchorForShape(shape, point);
    if (!anchor) return freeEndpointAt(point);
    return {
      shapeId: shape.id,
      side: anchor.side,
      anchorFraction: anchor.anchorFraction,
    };
  }

  function beginConnection(endpoint) {
    state.connectSourceEndpoint = endpoint ? Object.assign({}, endpoint) : null;
    state.connectSourceId = endpoint && endpoint.shapeId ? endpoint.shapeId : null;
  }

  function onBackgroundPointerDown(evt) {
    if (evt.button !== 0 && evt.button !== 1) return;
    evt.preventDefault();
    if (state.mode !== "select" && evt.button === 0 && !evt.altKey) {
      const point = clientToSvg(evt);
      const endpoint = freeEndpointAt(point);
      if (!state.connectSourceEndpoint) {
        beginConnection(endpoint);
        setStatus("Connection mode: source point selected. Click target shape or canvas point.", "ok");
        render();
        return;
      }
      createArrowBetweenEndpoints(state.connectSourceEndpoint, endpoint, CONNECT_MODES[state.mode] || "directional_connector");
      beginConnection(null);
      return;
    }

    state.connectSourceId = null;
    state.connectSourceEndpoint = null;
    const multiSelectModifier = !!(evt.metaKey || evt.ctrlKey);
    if (state.mode === "select" && evt.button === 0 && multiSelectModifier && !evt.altKey) {
      const start = clientToSvg(evt);
      const baseSelection = currentSelectedShapeIds();
      if (!baseSelection.length) {
        state.selected = null;
        state.selectedShapeIds = [];
        state.selectedArrowIds = [];
        state.selectedGroupComponents = [];
        state.selectedArrowHandle = null;
      }
      state.drag = {
        type: "marquee-select",
        start: start,
        current: start,
        additive: true,
        baseSelection: baseSelection,
      };
      render(true);
      return;
    }

    state.drag = {
      type: "pan-canvas",
      startClientX: evt.clientX,
      startClientY: evt.clientY,
      startScrollLeft: els.canvasScroll.scrollLeft,
      startScrollTop: els.canvasScroll.scrollTop,
      moved: false,
      clearSelectionOnClick: evt.button === 0,
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
      const point = clientToSvg(evt);
      const endpoint = endpointForShapePointer(shape, point);
      if (!state.connectSourceEndpoint) {
        beginConnection(endpoint);
        setStatus("Connection mode: source selected " + (endpoint.shapeId || "free point") + ". Click target shape or canvas point.", "ok");
        render();
        return;
      }
      if (state.connectSourceEndpoint.shapeId && state.connectSourceEndpoint.shapeId === shapeId && endpoint.shapeId === shapeId) {
        beginConnection(null);
        setStatus("Connection source deselected.");
        render();
        return;
      }
      createArrowBetweenEndpoints(state.connectSourceEndpoint, endpoint, CONNECT_MODES[state.mode] || "directional_connector");
      beginConnection(null);
      return;
    }

    const selectedIds = currentSelectedShapeIds();
    const modifier = !!(evt.metaKey || evt.ctrlKey);
    if (isGroupFormKind(shape.kind)) {
      const point = shapeLocalPoint(clientToSvg(evt), shape);
      const layout = groupFormLayout(shape);
      const rawIndex = layout.components.findIndex((box) => (
        point.x >= box.x
        && point.x <= box.x + box.width
        && point.y >= box.y
        && point.y <= box.y + box.height
      ));
      const componentIndex = rawIndex >= 0 ? rawIndex : null;
      const groupComponentSelected = !!(
        state.selected
        && state.selected.type === "group_component"
        && state.selected.shapeId === shapeId
      );
      const wholeGroupSelected = !!(
        state.selected
        && state.selected.type === "shape"
        && state.selected.id === shapeId
        && selectedIds.length === 1
      );

      if (modifier && componentIndex != null) {
        const currentEntries = currentSelectedGroupComponents();
        const nextEntries = currentEntries.slice();
        const key = groupComponentSelectionKey(shape.id, componentIndex);
        const existingIdx = nextEntries.findIndex((entry) => groupComponentSelectionKey(entry.shapeId, entry.componentIndex) === key);
        if (existingIdx >= 0) {
          nextEntries.splice(existingIdx, 1);
        } else {
          nextEntries.push({ shapeId: shape.id, componentIndex: componentIndex });
        }
        setGroupComponentSelection(nextEntries, { shapeId: shape.id, componentIndex: componentIndex });
        return;
      }

      if (!modifier && groupComponentSelected) {
        if (componentIndex != null) {
          setSelected({ type: "group_component", shapeId: shape.id, componentIndex: componentIndex });
          return;
        }
        setSelected({ type: "shape", id: shape.id });
        return;
      }

      if (!modifier && componentIndex != null && (wholeGroupSelected || evt.detail >= 2)) {
        setSelected({ type: "group_component", shapeId: shape.id, componentIndex: componentIndex });
        return;
      }
    }

    if (modifier) {
      const nextIds = selectedIds.slice();
      const existingIdx = nextIds.indexOf(shapeId);
      if (existingIdx >= 0) {
        nextIds.splice(existingIdx, 1);
      } else {
        nextIds.push(shapeId);
      }
      setShapeSelection(nextIds, shapeId);
      return;
    }

    if (!isShapeSelected(shapeId) || selectedIds.length <= 1) {
      setShapeSelection([shapeId], shapeId);
    } else {
      setShapeSelection(selectedIds, shapeId);
    }
    pushHistory();

    const start = clientToSvg(evt);
    const selection = isShapeSelected(shapeId) ? currentSelectedShapeIds() : [shapeId];
    const movePlan = moveShapeIdsForSelection(selection);
    const before = {};
    movePlan.moveIds.forEach((id) => {
      const s = shapeById(id);
      before[id] = { x: s.x, y: s.y };
    });
    const arrowBefore = {};
    movePlan.arrowIds.forEach((id) => {
      const arrow = arrowById(id);
      if (arrow) arrowBefore[id] = snapshotArrowForMove(arrow);
    });

    state.drag = {
      type: "move-shapes",
      shapeId: shapeId,
      rootShapeIds: movePlan.rootIds,
      movedShapeIds: movePlan.moveIds,
      movedArrowIds: movePlan.arrowIds,
      before: before,
      arrowBefore: arrowBefore,
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

  function angleBetweenPoints(center, point) {
    return Math.atan2((point.y || 0) - (center.y || 0), (point.x || 0) - (center.x || 0)) * 180 / Math.PI;
  }

  function startShapeRotate(evt, shapeId) {
    const shape = shapeById(shapeId);
    if (!shape) return;
    pushHistory();
    const point = clientToSvg(evt);
    const center = shapeCenter(shape);
    state.drag = {
      type: "rotate-shape",
      shapeId: shapeId,
      center: center,
      startAngle: angleBetweenPoints(center, point),
      beforeRotation: shapeRotation(shape),
    };
  }

  function startGroupDividerResize(evt, shapeId, axis, dividerIndex) {
    const shape = shapeById(shapeId);
    if (!shape || !isGroupFormKind(shape.kind)) return;
    pushHistory();
    state.drag = {
      type: "resize-group-divider",
      shapeId: shapeId,
      axis: axis,
      dividerIndex: dividerIndex,
      start: clientToSvg(evt),
      before: {
        componentFractions: Array.isArray(shape.componentFractions) ? shape.componentFractions.slice() : [],
        rowFractions: Array.isArray(shape.rowFractions) ? shape.rowFractions.slice() : [],
        colFractions: Array.isArray(shape.colFractions) ? shape.colFractions.slice() : [],
      },
    };
  }

  function startGroupHeaderResize(evt, shapeId) {
    const shape = shapeById(shapeId);
    if (!shape || (shape.kind !== "header_container" && !isGroupFormKind(shape.kind))) return;
    const header = groupHeaderRect(shape);
    if (!header) return;
    pushHistory();
    state.drag = {
      type: "resize-group-header",
      shapeId: shapeId,
      side: header.side,
      start: clientToSvg(evt),
      before: {
        groupHeaderSize: normalizeGroupHeaderSize(shape.groupHeaderSize),
      },
    };
  }

  function adjustDividerFractions(fractions, dividerIndex, targetOffset, totalSize) {
    const safeFractions = normalizeSegmentFractions(fractions, fractions.length || 1);
    if (safeFractions.length <= 1) return safeFractions;
    const total = Math.max(1, Number(totalSize) || 1);
    const minRatio = Math.min(0.45, 24 / total);
    const prefix = safeFractions.slice(0, dividerIndex).reduce((sum, value) => sum + value, 0);
    const pairTotal = safeFractions[dividerIndex] + safeFractions[dividerIndex + 1];
    const rawBoundary = clamp((Number(targetOffset) || 0) / total, 0, 1);
    const minBoundary = prefix + minRatio;
    const maxBoundary = prefix + pairTotal - minRatio;
    const nextBoundary = clamp(rawBoundary, minBoundary, maxBoundary);
    const next = safeFractions.slice();
    next[dividerIndex] = nextBoundary - prefix;
    next[dividerIndex + 1] = prefix + pairTotal - nextBoundary;
    return normalizeSegmentFractions(next, next.length);
  }

  function startArrowEndpointDrag(evt, arrowId, endpointKey) {
    pushHistory();
    state.selectedArrowHandle = normalizeArrowHandle({ type: "endpoint", arrowId: arrowId, endpointKey: endpointKey });
    state.drag = {
      type: "arrow-endpoint",
      arrowId: arrowId,
      endpointKey: endpointKey,
    };
  }

  function arrowIsMovable(arrow) {
    return !!(arrow && (!arrow.from.shapeId || !arrow.to.shapeId));
  }

  function snapshotArrowForMove(arrow) {
    return {
      from: Object.assign({}, arrow.from),
      to: Object.assign({}, arrow.to),
      waypoints: Array.isArray(arrow.waypoints) ? arrow.waypoints.map((point) => ({ x: point.x, y: point.y })) : [],
      controlPoints: Array.isArray(arrow.controlPoints) ? arrow.controlPoints.map((point) => ({ x: point.x, y: point.y })) : [],
    };
  }

  function translateArrowBy(arrow, before, dx, dy) {
    if (!arrow || !before) return;
    if (!before.from.shapeId) {
      arrow.from.x = (Number(before.from.x) || 0) + dx;
      arrow.from.y = (Number(before.from.y) || 0) + dy;
    }
    if (!before.to.shapeId) {
      arrow.to.x = (Number(before.to.x) || 0) + dx;
      arrow.to.y = (Number(before.to.y) || 0) + dy;
    }
    arrow.waypoints = before.waypoints.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    arrow.controlPoints = before.controlPoints.map((point) => ({ x: point.x + dx, y: point.y + dy }));
  }

  function anchoredEndpointAfterKeyboardMove(endpoint, dx, dy) {
    if (!endpoint || !endpoint.shapeId) return null;
    const shape = shapeById(endpoint.shapeId);
    if (!shape) return null;
    let side = normalizeSide(endpoint.side);
    let fraction = endpointFraction(endpoint);
    const width = Math.max(1, Number(shape.width) || 1);
    const height = Math.max(1, Number(shape.height) || 1);
    const xStep = clamp(Math.abs(dx) / width, 0.001, 1);
    const yStep = clamp(Math.abs(dy) / height, 0.001, 1);
    const cornerYThreshold = Math.max(yStep * 1.5, 0.02);
    const cornerXThreshold = Math.max(xStep * 1.5, 0.02);

    if ((shape.kind === "triangle" || shape.kind === "cone") && side === "top") {
      if (fraction <= 0.5) {
        side = "left";
        fraction = clamp(1 - (fraction / 0.5), 0, 1);
      } else {
        side = "right";
        fraction = clamp((fraction - 0.5) / 0.5, 0, 1);
      }
    }

    let nextSide = side;
    let nextFraction = fraction;

    if (shape.kind === "triangle" || shape.kind === "cone") {
      if (side === "left") {
        if (dy < 0) nextFraction = clamp(fraction - yStep, 0, 1);
        else if (dy > 0) nextFraction = clamp(fraction + yStep, 0, 1);
        else if (dx > 0) {
          if (fraction <= cornerYThreshold) {
            nextSide = "right";
            nextFraction = yStep;
          } else if (fraction >= 1 - cornerYThreshold) {
            nextSide = "bottom";
            nextFraction = xStep;
          }
        }
      } else if (side === "right") {
        if (dy < 0) nextFraction = clamp(fraction - yStep, 0, 1);
        else if (dy > 0) nextFraction = clamp(fraction + yStep, 0, 1);
        else if (dx < 0) {
          if (fraction <= cornerYThreshold) {
            nextSide = "left";
            nextFraction = yStep;
          } else if (fraction >= 1 - cornerYThreshold) {
            nextSide = "bottom";
            nextFraction = clamp(1 - xStep, 0, 1);
          }
        }
      } else if (side === "bottom") {
        if (dx < 0) nextFraction = clamp(fraction - xStep, 0, 1);
        else if (dx > 0) nextFraction = clamp(fraction + xStep, 0, 1);
        else if (dy < 0) {
          if (fraction <= cornerXThreshold) {
            nextSide = "left";
            nextFraction = clamp(1 - yStep, 0, 1);
          } else if (fraction >= 1 - cornerXThreshold) {
            nextSide = "right";
            nextFraction = clamp(1 - yStep, 0, 1);
          }
        }
      }

      if (nextSide === side && Math.abs(nextFraction - fraction) < 0.000001) {
        return null;
      }
      return {
        side: nextSide,
        anchorFraction: nextFraction,
        anchorIndex: anchorIndexForFraction(nextFraction),
      };
    }

    if (side === "left") {
      if (dy < 0) nextFraction = clamp(fraction - yStep, 0, 1);
      else if (dy > 0) nextFraction = clamp(fraction + yStep, 0, 1);
      else if (dx > 0) {
        if (fraction <= cornerYThreshold) {
          nextSide = "top";
          nextFraction = xStep;
        } else if (fraction >= 1 - cornerYThreshold) {
          nextSide = "bottom";
          nextFraction = xStep;
        }
      }
    } else if (side === "right") {
      if (dy < 0) nextFraction = clamp(fraction - yStep, 0, 1);
      else if (dy > 0) nextFraction = clamp(fraction + yStep, 0, 1);
      else if (dx < 0) {
        if (fraction <= cornerYThreshold) {
          nextSide = "top";
          nextFraction = clamp(1 - xStep, 0, 1);
        } else if (fraction >= 1 - cornerYThreshold) {
          nextSide = "bottom";
          nextFraction = clamp(1 - xStep, 0, 1);
        }
      }
    } else if (side === "top") {
      if (dx < 0) nextFraction = clamp(fraction - xStep, 0, 1);
      else if (dx > 0) nextFraction = clamp(fraction + xStep, 0, 1);
      else if (dy > 0) {
        if (fraction <= cornerXThreshold) {
          nextSide = "left";
          nextFraction = yStep;
        } else if (fraction >= 1 - cornerXThreshold) {
          nextSide = "right";
          nextFraction = yStep;
        }
      }
    } else {
      if (dx < 0) nextFraction = clamp(fraction - xStep, 0, 1);
      else if (dx > 0) nextFraction = clamp(fraction + xStep, 0, 1);
      else if (dy < 0) {
        if (fraction <= cornerXThreshold) {
          nextSide = "left";
          nextFraction = clamp(1 - yStep, 0, 1);
        } else if (fraction >= 1 - cornerXThreshold) {
          nextSide = "right";
          nextFraction = clamp(1 - yStep, 0, 1);
        }
      }
    }

    if (nextSide === side && Math.abs(nextFraction - fraction) < 0.000001) {
      return null;
    }
    return {
      side: nextSide,
      anchorFraction: nextFraction,
      anchorIndex: anchorIndexForFraction(nextFraction),
    };
  }

  function moveAnchoredEndpointByKeyboard(endpoint, dx, dy) {
    const next = anchoredEndpointAfterKeyboardMove(endpoint, dx, dy);
    if (!next) return false;
    endpoint.side = next.side;
    endpoint.anchorFraction = next.anchorFraction;
    endpoint.anchorIndex = next.anchorIndex;
    return true;
  }

  function moveSelectedArrowHandleBy(dx, dy) {
    const handle = currentSelectedArrowHandle();
    if (!handle) return false;
    const arrow = arrowById(handle.arrowId);
    if (!arrow) return false;
    if (handle.type === "endpoint") {
      const endpoint = arrow[handle.endpointKey];
      if (!endpoint) return false;
      if (endpoint.shapeId) {
        const next = anchoredEndpointAfterKeyboardMove(endpoint, dx, dy);
        if (!next) return false;
        pushHistory();
        endpoint.side = next.side;
        endpoint.anchorFraction = next.anchorFraction;
        endpoint.anchorIndex = next.anchorIndex;
        promoteArrowAboveContainerPoints(arrow, [getAnchorPoint(endpoint)]);
      } else {
        pushHistory();
        endpoint.x = (Number(endpoint.x) || 0) + dx;
        endpoint.y = (Number(endpoint.y) || 0) + dy;
        promoteArrowAboveContainerPoints(arrow, [{ x: endpoint.x, y: endpoint.y }]);
      }
      finalizeMovedArrowContainment(arrow);
      syncCanvasRectToContent();
      render();
      return true;
    }
    if (handle.type === "waypoint") {
      const waypoint = arrow.waypoints && arrow.waypoints[handle.waypointIndex];
      if (!waypoint) return false;
      pushHistory();
      waypoint.x = (Number(waypoint.x) || 0) + dx;
      waypoint.y = (Number(waypoint.y) || 0) + dy;
      promoteArrowAboveContainerPoints(arrow, [waypoint]);
      finalizeMovedArrowContainment(arrow);
      syncCanvasRectToContent();
      render();
      return true;
    }
    if (handle.type === "control") {
      while ((arrow.controlPoints || []).length < 2) {
        const geom = buildArrowGeometry(arrow);
        const fallback = geom.controlPoints[(arrow.controlPoints || []).length] || geom.from || { x: 0, y: 0 };
        arrow.controlPoints.push({ x: fallback.x, y: fallback.y });
      }
      const control = arrow.controlPoints && arrow.controlPoints[handle.cpIndex];
      if (!control) return false;
      pushHistory();
      control.x = (Number(control.x) || 0) + dx;
      control.y = (Number(control.y) || 0) + dy;
      promoteArrowAboveContainerPoints(arrow, [control]);
      syncCanvasRectToContent();
      render();
      return true;
    }
    return false;
  }

  function startArrowMoveDrag(evt, arrowId) {
    const selected = currentSelectedArrowIds()
      .map((id) => arrowById(id))
      .filter((arrow) => arrow && arrowIsMovable(arrow));
    const fallbackArrow = arrowById(arrowId);
    const arrows = selected.length
      ? selected
      : (fallbackArrow && arrowIsMovable(fallbackArrow) ? [fallbackArrow] : []);
    if (!arrows.length) {
      render();
      return;
    }
    pushHistory();
    const before = {};
    arrows.forEach((arrow) => {
      before[arrow.id] = snapshotArrowForMove(arrow);
    });
    state.drag = {
      type: "move-arrows",
      arrowIds: arrows.map((arrow) => arrow.id),
      before: before,
      start: clientToSvg(evt),
    };
  }

  function startArrowWaypointDrag(evt, arrowId, waypointIndex) {
    pushHistory();
    state.selectedArrowHandle = normalizeArrowHandle({ type: "waypoint", arrowId: arrowId, waypointIndex: waypointIndex });
    state.drag = {
      type: "arrow-waypoint",
      arrowId: arrowId,
      waypointIndex: waypointIndex,
    };
  }

  function startArrowControlPointDrag(evt, arrowId, cpIndex) {
    pushHistory();
    state.selectedArrowHandle = normalizeArrowHandle({ type: "control", arrowId: arrowId, cpIndex: cpIndex });
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
      return (a.z || 0) - (b.z || 0);
    });
    return candidates[0];
  }

  function handlePointerMove(evt) {
    if (!state.drag) {
      if (state.mode !== "select") {
        updateConnectPreview(clientToSvg(evt), state.connectSourceId || "");
      }
      return;
    }

    if (state.drag.type === "pan-canvas") {
      const dx = evt.clientX - state.drag.startClientX;
      const dy = evt.clientY - state.drag.startClientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        state.drag.moved = true;
      }
      els.canvasScroll.scrollLeft = state.drag.startScrollLeft - dx;
      els.canvasScroll.scrollTop = state.drag.startScrollTop - dy;
      return;
    }

    const point = clientToSvg(evt);

    if (state.drag.type === "move-shapes") {
      const dx = snapToStep(point.x - state.drag.start.x, GRID_MINOR_STEP);
      const dy = snapToStep(point.y - state.drag.start.y, GRID_MINOR_STEP);
      state.drag.movedShapeIds.forEach((id) => {
        const shape = shapeById(id);
        const before = state.drag.before[id];
        shape.x = before.x + dx;
        shape.y = before.y + dy;
      });
      (state.drag.movedArrowIds || []).forEach((id) => {
        const arrow = arrowById(id);
        if (!arrow) return;
        translateArrowBy(arrow, state.drag.arrowBefore[id], dx, dy);
      });
      promoteDraggedItemsAboveContainers(state.drag.movedShapeIds, state.drag.movedArrowIds);
      const movedBounds = selectionBounds(state.drag.rootShapeIds || state.drag.movedShapeIds);
      updateCanvasDuringInteraction(movedBounds);
      render();
      return;
    }

    if (state.drag.type === "move-arrows") {
      const dx = snapToStep(point.x - state.drag.start.x, GRID_MINOR_STEP);
      const dy = snapToStep(point.y - state.drag.start.y, GRID_MINOR_STEP);
      (state.drag.arrowIds || []).forEach((id) => {
        const arrow = arrowById(id);
        if (!arrow) return;
        translateArrowBy(arrow, state.drag.before[id], dx, dy);
      });
      promoteDraggedItemsAboveContainers([], state.drag.arrowIds);
      updateCanvasDuringInteraction(contentBounds());
      render();
      return;
    }

    if (state.drag.type === "marquee-select") {
      state.drag.current = point;
      render(true);
      return;
    }

    if (state.drag.type === "resize-shape") {
      const shape = shapeById(state.drag.shapeId);
      if (!shape) return;
      const b = state.drag.before;
      const deltaX = snapToStep(point.x - state.drag.start.x, GRID_MINOR_STEP);
      const deltaY = snapToStep(point.y - state.drag.start.y, GRID_MINOR_STEP);
      let x = b.x;
      let y = b.y;
      let w = b.width;
      let h = b.height;

      if (state.drag.corner.indexOf("e") >= 0) w = Math.max(MIN_SHAPE_SIZE, b.width + deltaX);
      if (state.drag.corner.indexOf("s") >= 0) h = Math.max(MIN_SHAPE_SIZE, b.height + deltaY);
      if (state.drag.corner.indexOf("w") >= 0) {
        const nx = b.x + deltaX;
        const maxX = b.x + b.width - MIN_SHAPE_SIZE;
        x = Math.min(nx, maxX);
        w = Math.max(MIN_SHAPE_SIZE, b.width - (x - b.x));
      }
      if (state.drag.corner.indexOf("n") >= 0) {
        const ny = b.y + deltaY;
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
      ensureShapeMinimumSizeByKind(shape);
      if (shape.kind === "header_container" || isGroupFormKind(shape.kind)) {
        shape.groupHeaderSize = clampGroupHeaderSize(shape, shape.groupHeaderSize, groupHeaderSideForShape(shape));
      }
      updateCanvasDuringInteraction(shapeBounds(shape));
      render();
      return;
    }

    if (state.drag.type === "rotate-shape") {
      const shape = shapeById(state.drag.shapeId);
      if (!shape) return;
      const nextAngle = angleBetweenPoints(state.drag.center, point);
      shape.rotation = normalizeRotation(state.drag.beforeRotation + (nextAngle - state.drag.startAngle));
      updateCanvasDuringInteraction(shapeBounds(shape));
      render();
      return;
    }

    if (state.drag.type === "resize-group-divider") {
      const shape = shapeById(state.drag.shapeId);
      if (!shape || !isGroupFormKind(shape.kind)) return;
      if (shape.kind === "table_group") {
        shape.rowFractions = normalizeSegmentFractions(state.drag.before.rowFractions, shape.tableRows);
        shape.colFractions = normalizeSegmentFractions(state.drag.before.colFractions, shape.tableCols);
      } else {
        shape.componentFractions = normalizeSegmentFractions(state.drag.before.componentFractions, shape.componentCount);
      }
      const layout = groupFormLayout(shape);
      if (state.drag.axis === "x") {
        const offset = snapToStep(point.x, GRID_MINOR_STEP) - layout.bodyX;
        if (shape.kind === "table_group") {
          shape.colFractions = adjustDividerFractions(layout.colFractions, state.drag.dividerIndex, offset, layout.bodyWidth);
        } else {
          shape.componentFractions = adjustDividerFractions(layout.componentFractions, state.drag.dividerIndex, offset, layout.bodyWidth);
        }
      } else {
        const offset = snapToStep(point.y, GRID_MINOR_STEP) - layout.bodyY;
        if (shape.kind === "table_group") {
          shape.rowFractions = adjustDividerFractions(layout.rowFractions, state.drag.dividerIndex, offset, layout.bodyHeight);
        } else {
          shape.componentFractions = adjustDividerFractions(layout.componentFractions, state.drag.dividerIndex, offset, layout.bodyHeight);
        }
      }
      render();
      return;
    }

    if (state.drag.type === "resize-group-header") {
      const shape = shapeById(state.drag.shapeId);
      if (!shape || (shape.kind !== "header_container" && !isGroupFormKind(shape.kind))) return;
      const side = normalizeSide(state.drag.side || groupHeaderSideForShape(shape));
      let proposed = groupHeaderThickness(shape);
      if (side === "top") {
        proposed = snapToStep(point.y - shape.y, GRID_MINOR_STEP);
      } else if (side === "bottom") {
        proposed = snapToStep((shape.y + shape.height) - point.y, GRID_MINOR_STEP);
      } else if (side === "left") {
        proposed = snapToStep(point.x - shape.x, GRID_MINOR_STEP);
      } else if (side === "right") {
        proposed = snapToStep((shape.x + shape.width) - point.x, GRID_MINOR_STEP);
      }
      shape.groupHeaderSize = clampGroupHeaderSize(shape, proposed, side);
      ensureGroupFormMinimumCellSize(shape);
      updateCanvasDuringInteraction(shapeBounds(shape));
      render();
      return;
    }

    if (state.drag.type === "arrow-endpoint") {
      const arrow = arrowById(state.drag.arrowId);
      if (!arrow) return;
      const currentEndpoint = arrow[state.drag.endpointKey] || {};
      const anchor = nearestAnchor(point, currentEndpoint.shapeId || "", currentEndpoint.side || "");
      updateConnectPreview(anchor ? point : null, anchor ? anchor.shapeId : "");
      arrow[state.drag.endpointKey] = anchor
        ? {
            shapeId: anchor.shapeId,
            side: anchor.side,
            anchorFraction: anchor.anchorFraction,
          }
        : freeEndpointAt(point);
      promoteArrowAboveContainerPoints(arrow, [endpointPoint(arrow[state.drag.endpointKey])]);
      updateCanvasDuringInteraction(contentBounds());
      render();
      return;
    }

    if (state.drag.type === "arrow-waypoint") {
      const arrow = arrowById(state.drag.arrowId);
      if (!arrow || !arrow.waypoints[state.drag.waypointIndex]) return;
      arrow.waypoints[state.drag.waypointIndex] = { x: point.x, y: point.y };
      promoteArrowAboveContainerPoints(arrow, [arrow.waypoints[state.drag.waypointIndex]]);
      updateCanvasDuringInteraction(contentBounds());
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
      promoteArrowAboveContainerPoints(arrow, [arrow.controlPoints[state.drag.cpIndex]]);
      updateCanvasDuringInteraction(contentBounds());
      render();
    }
  }

  function cancelActiveDrag() {
    if (!state.drag) return;
    const shouldRender = state.drag.type === "marquee-select";
    state.drag = null;
    updateConnectPreview(null, "", true);
    els.canvasScroll.classList.remove("panning");
    if (shouldRender) {
      render();
    }
  }

  function handlePointerUp() {
    if (!state.drag) return;
    const drag = state.drag;
    state.drag = null;

    if (drag.type === "move-shapes") {
      finalizeMovedRoots(drag.rootShapeIds);
      (drag.movedArrowIds || []).forEach((id) => finalizeMovedArrowContainment(arrowById(id)));
      syncStackContainment();
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "move-arrows") {
      (drag.arrowIds || []).forEach((id) => finalizeMovedArrowContainment(arrowById(id)));
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "resize-shape") {
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "rotate-shape") {
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "resize-group-divider") {
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "resize-group-header") {
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "arrow-endpoint") {
      updateConnectPreview(null, "", true);
      finalizeMovedArrowContainment(arrowById(drag.arrowId));
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "arrow-waypoint" || drag.type === "arrow-control") {
      finalizeMovedArrowContainment(arrowById(drag.arrowId));
      syncCanvasRectToContent();
      render();
    }

    if (drag.type === "marquee-select") {
      const rect = rectFromPoints(drag.start, drag.current || drag.start);
      const hitIds = shapeIdsInSelectionRect(rect);
      const nextIds = drag.additive
        ? normalizeSelectionIds((drag.baseSelection || []).concat(hitIds))
        : normalizeSelectionIds(hitIds);
      const isClick = rect.width < 4 && rect.height < 4;

      if (isClick) {
        if (!drag.additive) {
          state.selected = null;
          state.selectedShapeIds = [];
          state.selectedArrowIds = [];
          state.selectedGroupComponents = [];
          state.selectedArrowHandle = null;
        }
        render();
      } else {
        setShapeSelection(nextIds, nextIds[nextIds.length - 1] || "", true);
        render();
      }
    }

    if (drag.type === "pan-canvas") {
      els.canvasScroll.classList.remove("panning");
      if (drag.clearSelectionOnClick && !drag.moved) {
        state.selected = null;
        state.selectedShapeIds = [];
        state.selectedArrowIds = [];
        state.selectedGroupComponents = [];
        state.selectedArrowHandle = null;
        render();
      }
    }
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
    return {
      shapeId: isFromEndpoint ? fromShape.id : toShape.id,
      side: side,
      anchorFraction: 0.5,
    };
  }

  function createArrowBetweenEndpoints(fromEndpoint, toEndpoint, connectionType) {
    pushHistory();

    const id = uniqueArrowId("arrow_" + (state.model.arrows.length + 1), null);
    const arrow = {
      id: id,
      from: Object.assign({}, fromEndpoint || freeEndpointAt({ x: 0, y: 0 })),
      to: Object.assign({}, toEndpoint || freeEndpointAt({ x: 0, y: 0 })),
      lineStyle: "solid",
      routing: "angled",
      connectionType: normalizeConnectionType(connectionType),
      stroke: "#e8efff",
      width: 1.7,
      z: maxRenderableZ() + 1,
      parentId: null,
      waypoints: [],
      controlPoints: [],
    };
    state.model.arrows.push(arrow);
    finalizeMovedArrowContainment(arrow);
    setSelected({ type: "arrow", id: id });
    setStatus("Created " + connectionTypeLabel(arrow.connectionType) + " " + id + ".", "ok");
  }

  function createArrow(fromShapeId, toShapeId, connectionType) {
    const fromShape = shapeById(fromShapeId);
    const toShape = shapeById(toShapeId);
    if (!fromShape || !toShape) return;
    createArrowBetweenEndpoints(
      chooseEndpointForNewArrow(fromShape, toShape, true),
      chooseEndpointForNewArrow(fromShape, toShape, false),
      connectionType
    );
  }

  function addShape(kind) {
    const normalizedKind = normalizeShapeKind(kind);
    if (!SHAPE_KINDS.has(normalizedKind)) return;
    pushHistory();

    const size = defaultShapeSize(normalizedKind);
    const center = currentViewportCenter();
    const x = snapToStep(center.x - size.width / 2, GRID_MINOR_STEP);
    const y = snapToStep(center.y - size.height / 2, GRID_MINOR_STEP);
    const text = defaultShapeText(normalizedKind);
    const id = uniqueShapeId(deriveShapeId(text, ""), null);

    const isContainer = usesContainerPalette(normalizedKind);
    const isGroupForm = isGroupFormKind(normalizedKind);
    const componentCount = normalizedKind === "component_group" ? 4 : 1;
    const isTextBox = normalizedKind === "text_box";
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
      rotation: 0,
      fill: isContainer ? "#0d172a" : "#1c2f4f",
      stroke: isContainer ? "#eef3ff" : "#80b6ff",
      borderStyle: isTextBox ? "none" : "solid",
      borderWidth: defaultBorderWidth(normalizedKind),
      textColor: "#f4f7ff",
      rounded: shapeSupportsRounding(normalizedKind),
      textAlign: "center",
      textVAlign: "center",
      fontSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      noBackground: isTextBox,
      textOffsetUp: 0,
      textOffsetDown: 0,
      textOffsetLeft: 0,
      textOffsetRight: 0,
      textPadding: 0,
      groupHeaderSide: normalizedKind === "table_group" ? "top" : "none",
      groupHeaderSize: 0,
      componentDirection: "horizontal",
      componentCount: componentCount,
      componentFractions: normalizedKind === "component_group"
        ? normalizeSegmentFractions([], componentCount)
        : undefined,
      tableRows: normalizedKind === "table_group" ? 2 : undefined,
      tableCols: normalizedKind === "table_group" ? 2 : undefined,
      rowFractions: normalizedKind === "table_group"
        ? normalizeSegmentFractions([], 2)
        : undefined,
      colFractions: normalizedKind === "table_group"
        ? normalizeSegmentFractions([], 2)
        : undefined,
      components: isGroupForm
        ? normalizeGroupComponents([], normalizedKind === "table_group" ? 4 : componentCount, {
          fill: isContainer ? "#0d172a" : "#1c2f4f",
          textColor: "#f4f7ff",
          fontSize: 12,
          fontFamily: DEFAULT_FONT_FAMILY,
        })
        : undefined,
      z: (state.model.shapes.length ? Math.max.apply(null, state.model.shapes.map((s) => s.z || 0)) : 0) + 1,
      parentId: null,
    };

    ensureShapeMinimumSizeByKind(shape);

    state.model.shapes.push(shape);
    syncCanvasRectToContent();
    setSelected({ type: "shape", id: shape.id });
  }

  function deleteSelected() {
    if (!state.selected) return;
    if (state.selected.type === "group_component") return;
    pushHistory();

    if (state.selected.type === "shape") {
      const selectedIds = currentSelectedShapeIds();
      if (!selectedIds.length) return;
      const idSet = new Set();
      topLevelShapeIds(selectedIds).forEach((id) => {
        idSet.add(id);
        descendantsOf(id).forEach((childId) => idSet.add(childId));
      });
      state.model.shapes = state.model.shapes.filter((s) => !idSet.has(s.id));
      state.model.arrows = state.model.arrows.filter((a) => !idSet.has(a.from.shapeId) && !idSet.has(a.to.shapeId));
      state.selected = null;
      state.selectedShapeIds = [];
      state.selectedArrowIds = [];
      state.selectedGroupComponents = [];
      state.selectedArrowHandle = null;
      state.connectSourceId = null;
      syncCanvasRectToContent();
      render();
      return;
    }

    if (state.selected.type === "arrow") {
      const selectedArrowIds = currentSelectedArrowIds();
      const arrowIdSet = new Set(selectedArrowIds.length ? selectedArrowIds : [state.selected.id]);
      state.model.arrows = state.model.arrows.filter((a) => !arrowIdSet.has(a.id));
      state.selected = null;
      state.selectedShapeIds = [];
      state.selectedArrowIds = [];
      state.selectedGroupComponents = [];
      state.selectedArrowHandle = null;
      syncCanvasRectToContent();
      render();
    }
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === "select") {
      state.connectSourceId = null;
      state.connectSourceEndpoint = null;
      state.connectPreview = null;
    }
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
      const shapeIds = currentSelectedShapeIds();
      if (shapeIds.length > 1) {
        renderMultiShapeInspector(shapeIds);
        return;
      }
      renderShapeInspector(state.selected.id);
      return;
    }

    if (state.selected.type === "group_component") {
      state.richTextSelection = null;
      clearPendingRichTextFormat();
      const entries = currentSelectedGroupComponents();
      if (entries.length > 1) {
        renderMultiGroupComponentInspector(entries);
        return;
      }
      renderGroupComponentInspector(state.selected.shapeId, state.selected.componentIndex);
      return;
    }

    if (state.selected.type === "arrow") {
      state.richTextSelection = null;
      clearPendingRichTextFormat();
      const arrowIds = currentSelectedArrowIds();
      if (arrowIds.length > 1) {
        renderMultiArrowInspector(arrowIds);
        return;
      }
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

  function bindSmoothNumberElement(el, getter, setter, options) {
    if (!el) return;
    const opts = options || {};
    const step = Number.isFinite(Number(opts.step)) ? Number(opts.step) : 1;
    const renderFully = !!opts.renderFully;
    const syncCanvas = opts.syncCanvas !== false;
    const normalize = typeof opts.normalize === "function" ? opts.normalize : (value) => value;
    let pushed = false;

    const apply = (rawValue) => {
      const next = normalize(rawValue, getter());
      if (!Number.isFinite(next)) return;
      setter(next);
      if (syncCanvas) syncCanvasRectToContent();
      if (renderFully) render();
      else render(true);
    };

    const ensureHistory = () => {
      if (!pushed) {
        pushHistory();
        pushed = true;
      }
    };

    const commit = () => {
      const value = String(el.value || "").trim();
      if (!value) {
        pushed = false;
        el.value = roundNum(getter());
        return;
      }
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      ensureHistory();
      apply(num);
      pushed = false;
    };

    el.addEventListener("focus", () => {
      pushed = false;
      el.value = roundNum(getter());
    });
    el.addEventListener("blur", () => {
      pushed = false;
    });
    el.addEventListener("input", () => {
      const value = String(el.value || "").trim();
      if (!value) return;
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      ensureHistory();
      apply(num);
    });
    el.addEventListener("change", commit);
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        commit();
        el.blur();
        return;
      }
      if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
      evt.preventDefault();
      ensureHistory();
      apply(nudgeFromCurrent(getter(), evt.key === "ArrowUp" ? 1 : -1, step));
      el.value = roundNum(getter());
    });
  }

  function bindSmoothNumberInput(id, getter, setter, options) {
    bindSmoothNumberElement(document.getElementById(id), getter, setter, options);
  }

  function bindSmoothNumberByAttr(attr, index, getter, setter, options) {
    bindSmoothNumberElement(
      document.querySelector("[" + attr + '="' + index + '"]'),
      getter,
      setter,
      options
    );
  }

  function syncShapeGeometryInputs(shape) {
    const xEl = document.getElementById("ins-shape-x");
    const yEl = document.getElementById("ins-shape-y");
    const wEl = document.getElementById("ins-shape-w");
    const hEl = document.getElementById("ins-shape-h");
    if (xEl) xEl.value = roundNum(shape.x);
    if (yEl) yEl.value = roundNum(shape.y);
    if (wEl) wEl.value = roundNum(shape.width);
    if (hEl) hEl.value = roundNum(shape.height);
  }

  function bindIconButton(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    let handledPointerDown = false;
    const invoke = (evt) => {
      state.richTextToolbarInteraction = true;
      evt.preventDefault();
      const editor = getRichTextEditorEl();
      const target = currentRichTextTarget();
      const storedRange = storedRichTextRangeForTarget(target);
      if (editor && target && storedRange && !selectionInsideNode(editor, window.getSelection())) {
        editor.focus({ preventScroll: true });
        setEditorSelection(storedRange.cloneRange());
      }
      handler();
      window.setTimeout(() => {
        state.richTextToolbarInteraction = false;
      }, 0);
    };
    el.addEventListener("pointerdown", (evt) => {
      if (evt.button !== undefined && evt.button !== 0) return;
      handledPointerDown = true;
      invoke(evt);
    });
    el.addEventListener("mousedown", (evt) => evt.preventDefault());
    el.addEventListener("click", (evt) => {
      if (handledPointerDown) {
        handledPointerDown = false;
        evt.preventDefault();
        return;
      }
      invoke(evt);
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

  function setPendingRichTextFormat(shapeId, format, sticky) {
    state.richTextPendingFormat = {
      shapeId: shapeId,
      format: normalizeTextFormatState(format),
    };
    state.richTextPendingSticky = !!sticky;
  }

  function clearPendingRichTextFormat(shapeId) {
    if (!state.richTextPendingFormat) return;
    if (shapeId && state.richTextPendingFormat.shapeId !== shapeId) return;
    state.richTextPendingFormat = null;
    state.richTextPendingSticky = false;
  }

  function getPendingRichTextFormat(shapeId) {
    if (!state.richTextPendingFormat) return null;
    if (!shapeId || state.richTextPendingFormat.shapeId !== shapeId) return null;
    return cloneTextFormatState(state.richTextPendingFormat.format);
  }

  function shouldReleaseStickyTypingStateOnKeyup(evt) {
    const key = String(evt && evt.key || "");
    return key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "Backspace" ||
      key === "Delete" ||
      key === "Home" ||
      key === "End" ||
      key === "PageUp" ||
      key === "PageDown";
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
      const target = currentRichTextTarget();
      const pending = target ? getPendingRichTextFormat(target.key) : null;
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

  function editorContentRange(editor) {
    if (!editor) return null;
    const range = document.createRange();
    range.selectNodeContents(editor);
    return range;
  }

  function setEditorCaretToEnd(editor) {
    const range = editorContentRange(editor);
    if (!range) return null;
    range.collapse(false);
    setEditorSelection(range);
    return range;
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

  function makeShapeTextTarget(shape) {
    if (!shape) return null;
    return {
      type: "shape",
      key: "shape:" + shape.id,
      shape: shape,
      entity: shape,
    };
  }

  function makeGroupComponentTextTarget(shape, component, componentIndex) {
    if (!shape) return null;
    return {
      type: "group_component",
      key: groupComponentSelectionKey(shape.id, componentIndex),
      shape: shape,
      componentIndex: componentIndex,
      get component() {
        return getGroupComponentAt(shape, componentIndex);
      },
      get entity() {
        return getGroupComponentAt(shape, componentIndex);
      },
    };
  }

  function currentRichTextTarget() {
    if (!state.selected) return null;
    if (state.selected.type === "shape") {
      return makeShapeTextTarget(shapeById(state.selected.id));
    }
    if (state.selected.type === "group_component") {
      const selectedComponent = currentSelectedGroupComponent();
      if (!selectedComponent) return null;
      return makeGroupComponentTextTarget(
        selectedComponent.shape,
        selectedComponent.component,
        selectedComponent.componentIndex
      );
    }
    return null;
  }

  function updateTextInspectorMeta(target, editor) {
    const entity = target && target.entity ? target.entity : target;
    const label = document.getElementById("ins-shape-text-label");
    const idInput = document.getElementById("ins-shape-id");
    if (label) {
      const currentLength = editor ? currentEditorTextLength(editor) : String(entity && entity.text || "").length;
      label.textContent = "Text - " + currentLength + "/" + MAX_SHAPE_TEXT_LENGTH;
    }
    if (idInput && target && target.type === "shape" && target.shape && !target.shape.idManual) {
      idInput.value = target.shape.id;
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

  function handleRichTextBeforeInput(evt, target) {
    const editor = getRichTextEditorEl();
    if (!editor || !target) return;
    const inputType = String(evt.inputType || "");
    if (!inputType || inputType.indexOf("delete") === 0 || inputType === "historyUndo" || inputType === "historyRedo") {
      return;
    }

    const available = remainingEditorTextCapacity(editor);
    const pending = getPendingRichTextFormat(target.key);
    const range = inspectRichTextSelection(editor);
    if (pending && range && range.collapsed && (inputType === "insertText" || inputType === "insertCompositionText")) {
      evt.preventDefault();
      const clipped = String(evt.data || "").slice(0, Math.max(0, available));
      if (!clipped) return;
      if (insertCollapsedFormattedText(editor, clipped, pending)) {
        normalizeRichTextEditor(editor);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    if (pending && range && range.collapsed && (inputType === "insertParagraph" || inputType === "insertLineBreak")) {
      evt.preventDefault();
      if (available < 1) return;
      if (insertCollapsedFormattedText(editor, "\n", pending)) {
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

  function handleRichTextPaste(evt, target) {
    const editor = getRichTextEditorEl();
    if (!editor || !target) return;
    const pasted = String(evt.clipboardData && evt.clipboardData.getData("text/plain") || "");
    const available = remainingEditorTextCapacity(editor);
    const clipped = pasted.slice(0, Math.max(0, available));
    const pending = getPendingRichTextFormat(target.key);
    const range = inspectRichTextSelection(editor);
    if (pending && range && range.collapsed) {
      evt.preventDefault();
      if (!clipped) return;
      if (insertCollapsedFormattedText(editor, clipped, pending)) {
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

  function isRichTextEditorActive(editor) {
    if (!editor) return false;
    const selection = window.getSelection();
    return document.activeElement === editor || selectionInsideNode(editor, selection);
  }

  function storedRichTextRangeForTarget(target) {
    if (!target || !state.richTextSelection || state.richTextSelection.targetKey !== target.key) return null;
    return state.richTextSelection.range.cloneRange();
  }

  function captureRichTextSelection() {
    const editor = getRichTextEditorEl();
    const target = currentRichTextTarget();
    if (!editor || !target) return;
    const selection = window.getSelection();
    if (!selectionInsideNode(editor, selection) || !selection.rangeCount) {
      if (storedRichTextRangeForTarget(target) && (
        state.richTextToolbarInteraction || state.richTextPendingSticky
      )) {
        updateRichTextToolbarState();
        return;
      }
      clearPendingRichTextFormat(target.key);
      updateRichTextToolbarState();
      return;
    }
    const range = selection.getRangeAt(0).cloneRange();
    const existing = storedRichTextRangeForTarget(target);
    if (state.richTextToolbarInteraction && range.collapsed && existing && !existing.collapsed) {
      updateRichTextToolbarState();
      return;
    }
    state.richTextSelection = {
      targetKey: target.key,
      range: range,
    };
    if (!range.collapsed) {
      clearPendingRichTextFormat(target.key);
    }
    updateRichTextToolbarState();
  }

  function syncPendingFormatFromCollapsedCaret(target, editor) {
    if (!target || !editor) return;
    const range = inspectRichTextSelection(editor);
    if (!range || !range.collapsed) return;
    setPendingRichTextFormat(target.key, getCaretFormatState(editor, range), false);
    updateRichTextToolbarState();
  }

  function restoreRichTextSelection(editor, fallbackToAll) {
    if (!editor) return null;
    const live = window.getSelection();
    if (selectionInsideNode(editor, live) && live.rangeCount) {
      return live.getRangeAt(0);
    }
    const target = currentRichTextTarget();
    if (state.richTextSelection && target && state.richTextSelection.targetKey === target.key) {
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
    const target = currentRichTextTarget();
    const stored = storedRichTextRangeForTarget(target);
    if (selectionInsideNode(editor, live) && live.rangeCount) {
      const liveRange = live.getRangeAt(0).cloneRange();
      if (stored && !stored.collapsed && liveRange.collapsed) {
        return stored;
      }
      return liveRange;
    }
    return stored;
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
    if (isBoundaryMarker(node)) return;
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

  function toggleRangeFormat(target, formatKey, options) {
    const editor = getRichTextEditorEl();
    if (!editor) return false;
    const range = options && options.range
      ? options.range.cloneRange()
      : restoreRichTextSelection(editor, false);
    const applyLiveSelection = !!(options && options.applyLiveSelection);
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
    if (applyLiveSelection) {
      setEditorSelection(nextRange);
    } else {
      state.richTextSelection = {
        targetKey: target.key,
        range: nextRange.cloneRange(),
      };
    }
    clearPendingRichTextFormat(target.key);
    if (applyLiveSelection) {
      captureRichTextSelection();
    } else {
      updateRichTextToolbarState();
    }
    syncTextTargetRichText(target, editor, false);
    return true;
  }

  function syncTextTargetRichText(target, editor, finalize) {
    if (!target || !target.entity || !editor) return;
    const entity = target.entity;
    const html = finalize ? sanitizeRichHtml(editor.innerHTML, entity.text) : String(editor.innerHTML || "");
    entity.richText = html;
    entity.text = richHtmlToPlainText(html);
    if (finalize) {
      editor.innerHTML = entity.richText;
      if (target.type === "shape" && target.shape && !target.shape.idManual) {
        updateAutoId(target.shape, target.shape.parentId);
      }
      render();
      captureRichTextSelection();
    } else {
      render(true);
      updateRichTextToolbarState();
    }
  }

  function toggleWholeEditorFormat(target, formatKey, preservedRange) {
    const editor = getRichTextEditorEl();
    if (!editor) return false;
    const fullRange = editorContentRange(editor);
    if (!fullRange) return false;
    const currentState = getSelectionFormatState(editor, fullRange);
    const shouldEnable = !currentState[formatKey];
    const collapsedRange = preservedRange && preservedRange.collapsed ? preservedRange.cloneRange() : null;
    const markers = collapsedRange ? insertRangeBoundaryMarkers(collapsedRange) : null;

    stripFormatFromContainer(editor, formatKey);
    if (formatKey === "subscript") {
      stripFormatFromContainer(editor, "superscript");
    } else if (formatKey === "superscript") {
      stripFormatFromContainer(editor, "subscript");
    }
    if (shouldEnable && hasRenderableChildren(editor)) {
      wrapContainerWithFormat(editor, formatKey);
    }

    normalizeRichTextEditor(editor);
    if (markers) {
      window.getSelection().removeAllRanges();
      restoreSelectionFromMarkers(editor, markers);
      clearPendingRichTextFormat(target.key);
      captureRichTextSelection();
      syncTextTargetRichText(target, editor, false);
      return true;
    }
    clearPendingRichTextFormat(target.key);
    syncTextTargetRichText(target, editor, false);
    return true;
  }

  function executeTextCommand(target, formatKey) {
    const editor = getRichTextEditorEl();
    if (!editor) return;
    const selection = window.getSelection();
    const hasLiveSelection = selectionInsideNode(editor, selection) && selection.rangeCount;
    const range = inspectRichTextSelection(editor);
    pushHistory();
    if (range && !range.collapsed) {
      toggleRangeFormat(target, formatKey, {
        range: range,
        applyLiveSelection: !!hasLiveSelection,
      });
      return;
    }

    if (range) {
      const currentState = getPendingRichTextFormat(target.key) ||
        getCaretFormatState(editor, range.cloneRange());
      const nextState = cloneTextFormatState(currentState);
      nextState[formatKey] = !currentState[formatKey];
      if (formatKey === "subscript" && nextState.subscript) nextState.superscript = false;
      if (formatKey === "superscript" && nextState.superscript) nextState.subscript = false;
      setPendingRichTextFormat(target.key, nextState, true);
      applyToolbarFormatState(nextState);
      return;
    }

    if (currentEditorTextLength(editor) > 0) {
      toggleWholeEditorFormat(target, formatKey, range);
      return;
    }

    const currentState = getPendingRichTextFormat(target.key) || emptyTextFormatState();
    const nextState = cloneTextFormatState(currentState);
    nextState[formatKey] = !currentState[formatKey];
    if (formatKey === "subscript" && nextState.subscript) nextState.superscript = false;
    if (formatKey === "superscript" && nextState.superscript) nextState.subscript = false;
    setPendingRichTextFormat(target.key, nextState, true);
    applyToolbarFormatState(nextState);
  }

  function executeOverlineCommand(target) {
    const editor = getRichTextEditorEl();
    if (!editor) return;
    const selection = window.getSelection();
    const hasLiveSelection = selectionInsideNode(editor, selection) && selection.rangeCount;
    const range = inspectRichTextSelection(editor);

    pushHistory();
    if (range && !range.collapsed) {
      toggleRangeFormat(target, "overline", {
        range: range,
        applyLiveSelection: !!hasLiveSelection,
      });
      return;
    }

    if (range) {
      const currentState = getPendingRichTextFormat(target.key) ||
        getCaretFormatState(editor, range.cloneRange());
      const nextState = cloneTextFormatState(currentState);
      nextState.overline = !currentState.overline;
      setPendingRichTextFormat(target.key, nextState, true);
      applyToolbarFormatState(nextState);
      return;
    }

    if (currentEditorTextLength(editor) > 0) {
      toggleWholeEditorFormat(target, "overline", range);
      return;
    }
    const currentState = getPendingRichTextFormat(target.key) || emptyTextFormatState();
    const nextState = cloneTextFormatState(currentState);
    nextState.overline = !currentState.overline;
    setPendingRichTextFormat(target.key, nextState, true);
    applyToolbarFormatState(nextState);
  }

  function applyInlineStyleCommand(target, styles, blockWhenAll) {
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
      syncTextTargetRichText(target, editor, false);
      return;
    }
    const fullRange = restoreRichTextSelection(editor, true);
    const nextRange = applyStyleToRange(fullRange, styles, blockWhenAll !== false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (nextRange) selection.addRange(nextRange);
    captureRichTextSelection();
    syncTextTargetRichText(target, editor, false);
  }

  function hasActiveRichTextSelection() {
    const editor = getRichTextEditorEl();
    if (!editor) return false;
    if (!isRichTextEditorActive(editor)) return false;
    const range = inspectRichTextSelection(editor);
    return !!(range && !range.collapsed);
  }

  function setButtonActive(id, active) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("active", !!active);
  }

  function applyToolbarFormatState(formatState) {
    const next = normalizeTextFormatState(formatState);
    setButtonActive("fmt-bold", next.bold);
    setButtonActive("fmt-italic", next.italic);
    setButtonActive("fmt-underline", next.underline);
    setButtonActive("fmt-overline", next.overline);
    setButtonActive("fmt-subscript", next.subscript);
    setButtonActive("fmt-superscript", next.superscript);
  }

  function updateRichTextToolbarState() {
    const editor = getRichTextEditorEl();
    if (!editor) return;
    const range = inspectRichTextSelection(editor);
    const target = currentRichTextTarget();
    let formatState;
    if (range) {
      formatState = getSelectionFormatState(editor, range);
    } else {
      const pending = target ? getPendingRichTextFormat(target.key) : null;
      if (pending) {
        formatState = pending;
      } else if (currentEditorTextLength(editor) > 0) {
        formatState = getSelectionFormatState(editor, editorContentRange(editor));
      } else {
        formatState = pending || emptyTextFormatState();
      }
    }
    applyToolbarFormatState(formatState);
  }

  function textSpacingControlsHtml(prefix, spec) {
    const base = prefix || "ins-spacing";
    return [
      '<div class="spacing-grid">',
      '<div class="spacing-title">Spacing</div>',
      '<div class="spacing-control spacing-up"><input id="' + base + '-up" type="number" min="0" max="200" step="1" value="' + roundNum(normalizeTextInset(spec.textOffsetUp, 0)) + '"/><label for="' + base + '-up">UP</label></div>',
      '<div class="spacing-control spacing-padding"><input id="' + base + '-padding" type="number" min="0" max="200" step="1" value="' + roundNum(normalizeTextInset(spec.textPadding, 0)) + '"/><label for="' + base + '-padding">Padding</label></div>',
      '<div class="spacing-control spacing-left"><input id="' + base + '-left" type="number" min="0" max="200" step="1" value="' + roundNum(normalizeTextInset(spec.textOffsetLeft, 0)) + '"/><label for="' + base + '-left">Left</label></div>',
      '<div class="spacing-control spacing-down"><input id="' + base + '-down" type="number" min="0" max="200" step="1" value="' + roundNum(normalizeTextInset(spec.textOffsetDown, 0)) + '"/><label for="' + base + '-down">DOWN</label></div>',
      '<div class="spacing-control spacing-right"><input id="' + base + '-right" type="number" min="0" max="200" step="1" value="' + roundNum(normalizeTextInset(spec.textOffsetRight, 0)) + '"/><label for="' + base + '-right">Right</label></div>',
      "</div>",
    ].join("");
  }

  function rotationControlsHtml(prefix, angle) {
    const base = prefix || "ins-rotation";
    const normalized = normalizeRotation(angle);
    return [
      '<div class="rotation-controls">',
      '<input id="' + base + '-angle" class="rotation-angle-input" type="number" min="0" max="359" step="1" value="' + roundNum(normalized) + '"/>',
      '<input id="' + base + '-slider" class="rotation-slider" type="range" min="0" max="359" step="1" value="' + roundNum(normalized) + '"/>',
      "</div>",
      '<div class="row"><button id="' + base + '-quarter-turn" type="button">Rotate 90°</button></div>',
    ].join("");
  }

  function rotationGeometryControlsHtml(prefix, angle) {
    const base = prefix || "ins-rotation";
    const normalized = normalizeRotation(angle);
    return [
      '<div class="inline-field"><label for="' + base + '-angle">angle:</label><input id="' + base + '-angle" class="rotation-angle-input" type="number" min="0" max="359" step="1" value="' + roundNum(normalized) + '"/></div>',
      '<div class="rotation-geometry-tools"><input id="' + base + '-slider" class="rotation-slider" type="range" min="0" max="359" step="1" value="' + roundNum(normalized) + '"/><button id="' + base + '-quarter-turn" type="button">Rotate 90°</button></div>',
    ].join("");
  }

  function bindRotationControls(prefix, getter, setter) {
    const base = prefix || "ins-rotation";
    const angleEl = document.getElementById(base + "-angle");
    const sliderEl = document.getElementById(base + "-slider");
    let anglePushed = false;
    let sliderPushed = false;

    const applyRotation = (rawValue) => {
      const next = normalizeRotation(rawValue);
      setter(next);
      syncCanvasRectToContent();
      render(true);
      return next;
    };

    const syncControls = (options) => {
      const opts = options || {};
      const value = roundNum(normalizeRotation(getter()));
      if (sliderEl && !opts.skipSlider) sliderEl.value = value;
      if (angleEl && !opts.skipAngle) angleEl.value = value;
    };

    if (sliderEl) {
      sliderEl.addEventListener("focus", () => {
        sliderPushed = false;
        sliderEl.value = roundNum(normalizeRotation(getter()));
      });
      sliderEl.addEventListener("input", () => {
        const num = Number(sliderEl.value);
        if (!Number.isFinite(num)) return;
        if (!sliderPushed) {
          pushHistory();
          sliderPushed = true;
        }
        const next = applyRotation(num);
        if (angleEl) angleEl.value = roundNum(next);
      });
      sliderEl.addEventListener("change", () => {
        sliderPushed = false;
        syncControls();
      });
      sliderEl.addEventListener("blur", () => {
        sliderPushed = false;
        syncControls();
      });
    }

    if (angleEl) {
      angleEl.addEventListener("focus", () => {
        anglePushed = false;
      });
      angleEl.addEventListener("input", () => {
        const value = String(angleEl.value || "").trim();
        if (!value) return;
        const num = Number(value);
        if (!Number.isFinite(num)) return;
        if (!anglePushed) {
          pushHistory();
          anglePushed = true;
        }
        const next = applyRotation(num);
        if (sliderEl) sliderEl.value = roundNum(next);
      });
      angleEl.addEventListener("change", () => {
        anglePushed = false;
        syncControls();
      });
      angleEl.addEventListener("blur", () => {
        anglePushed = false;
        syncControls();
      });
      angleEl.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          angleEl.blur();
        }
      });
    }

    const quarterTurnBtn = document.getElementById(base + "-quarter-turn");
    if (quarterTurnBtn) {
      quarterTurnBtn.addEventListener("click", () => {
        pushHistory();
        setter(normalizeRotation(getter() + 90));
        syncCanvasRectToContent();
        render();
      });
    }
  }

  function bindTextSpacingControls(prefix, entity) {
    const base = prefix || "ins-spacing";
    const bindField = (suffix, key) => {
      const inputId = base + "-" + suffix;
      const el = document.getElementById(inputId);
      if (!el) return;
      let pushed = false;
      const apply = (num) => {
        entity[key] = normalizeTextInset(num, entity[key] || 0);
        render(true);
      };
      const commit = () => {
        const value = String(el.value || "").trim();
        if (!value) {
          pushed = false;
          return;
        }
        const num = Number(value);
        if (!Number.isFinite(num)) return;
        if (!pushed) {
          pushHistory();
          pushed = true;
        }
        apply(num);
        pushed = false;
      };
      el.addEventListener("focus", () => {
        pushed = false;
      });
      el.addEventListener("input", () => {
        const value = String(el.value || "").trim();
        if (!value) return;
        const num = Number(value);
        if (!Number.isFinite(num)) return;
        if (!pushed) {
          pushHistory();
          pushed = true;
        }
        apply(num);
      });
      el.addEventListener("change", commit);
      el.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          commit();
          el.blur();
        }
      });
    };
    bindField("up", "textOffsetUp");
    bindField("down", "textOffsetDown");
    bindField("left", "textOffsetLeft");
    bindField("right", "textOffsetRight");
    bindField("padding", "textPadding");
  }

  function commonValue(items, getter, normalizer) {
    if (!items || !items.length) return null;
    const normalize = typeof normalizer === "function" ? normalizer : (value) => value;
    let first = null;
    let hasFirst = false;
    for (let idx = 0; idx < items.length; idx += 1) {
      const value = normalize(getter(items[idx], idx));
      if (!hasFirst) {
        first = value;
        hasFirst = true;
        continue;
      }
      if (value !== first) return null;
    }
    return hasFirst ? first : null;
  }

  function minimumValue(items, getter, normalizer, fallback) {
    if (!items || !items.length) return fallback;
    const normalize = typeof normalizer === "function" ? normalizer : (value) => value;
    let min = null;
    items.forEach((item, idx) => {
      const value = normalize(getter(item, idx));
      if (min === null || value < min) min = value;
    });
    return min === null ? fallback : min;
  }

  function mixedOptionHtml(selectedValue) {
    return '<option value=""' + (selectedValue === null ? " selected" : "") + '>mixed</option>';
  }

  function fontFamilyOptionsHtml(selectedValue, allowMixed) {
    const options = [];
    if (allowMixed) {
      options.push(mixedOptionHtml(selectedValue));
    }
    FONT_FAMILY_OPTIONS.forEach((option) => {
      options.push('<option value="' + escapeHtml(option.value) + '"' + (selectedValue === option.value ? " selected" : "") + '>' + escapeHtml(option.label) + '</option>');
    });
    return options.join("");
  }

  function wholeEntityTextFormatState(entity) {
    const container = document.createElement("div");
    container.innerHTML = sanitizeRichHtml(entity && entity.richText, entity && entity.text);
    normalizeRichTextEditor(container);
    const fullRange = editorContentRange(container);
    if (!fullRange || !hasRenderableChildren(container)) return emptyTextFormatState();
    return getSelectionFormatState(container, fullRange);
  }

  function applyWholeEntityFormat(entity, formatKey, shouldEnable) {
    const container = document.createElement("div");
    container.innerHTML = sanitizeRichHtml(entity && entity.richText, entity && entity.text);
    stripFormatFromContainer(container, formatKey);
    if (formatKey === "subscript") {
      stripFormatFromContainer(container, "superscript");
    } else if (formatKey === "superscript") {
      stripFormatFromContainer(container, "subscript");
    }
    if (shouldEnable && hasRenderableChildren(container)) {
      wrapContainerWithFormat(container, formatKey);
    }
    normalizeRichTextEditor(container);
    entity.richText = sanitizeRichHtml(container.innerHTML, entity.text);
    entity.text = richHtmlToPlainText(entity.richText);
  }

  function multiTextFormatState(entities) {
    const next = emptyTextFormatState();
    TEXT_FORMAT_KEYS.forEach((key) => {
      next[key] = !!(entities && entities.length) && entities.every((entity) => wholeEntityTextFormatState(entity)[key]);
    });
    if (next.subscript && next.superscript) {
      next.superscript = false;
    }
    return next;
  }

  function bindMultiTextFormatButtons(entities) {
    const toggleFormat = (formatKey) => {
      const current = multiTextFormatState(entities);
      const shouldEnable = !current[formatKey];
      pushHistory();
      entities.forEach((entity) => applyWholeEntityFormat(entity, formatKey, shouldEnable));
      render();
    };
    bindIconButton("fmt-bold", () => toggleFormat("bold"));
    bindIconButton("fmt-italic", () => toggleFormat("italic"));
    bindIconButton("fmt-underline", () => toggleFormat("underline"));
    bindIconButton("fmt-overline", () => toggleFormat("overline"));
    bindIconButton("fmt-subscript", () => toggleFormat("subscript"));
    bindIconButton("fmt-superscript", () => toggleFormat("superscript"));
    applyToolbarFormatState(multiTextFormatState(entities));
  }

  function bindMultiDeltaNumberInput(id, items, getter, setter, normalize, fallback, renderFully) {
    const el = document.getElementById(id);
    if (!el || !items || !items.length) return;
    const normalizeValue = typeof normalize === "function" ? normalize : (value) => value;
    const currentMin = () => minimumValue(items, getter, normalizeValue, fallback);
    let base = currentMin();
    let pushed = false;
    el.value = roundNum(base);

    const apply = (rawNum) => {
      const nextBase = normalizeValue(rawNum, base);
      if (!Number.isFinite(nextBase)) return;
      const delta = nextBase - base;
      if (!delta) {
        el.value = roundNum(base);
        return;
      }
      items.forEach((item) => {
        setter(item, normalizeValue(getter(item) + delta, getter(item)));
      });
      base = currentMin();
      el.value = roundNum(base);
      if (renderFully) {
        render();
      } else {
        render(true);
      }
    };

    const commit = () => {
      const value = String(el.value || "").trim();
      if (!value) {
        pushed = false;
        el.value = roundNum(base);
        return;
      }
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      if (!pushed) {
        pushHistory();
        pushed = true;
      }
      apply(num);
      pushed = false;
    };

    el.addEventListener("focus", () => {
      pushed = false;
      base = currentMin();
      el.value = roundNum(base);
    });
    el.addEventListener("input", () => {
      const value = String(el.value || "").trim();
      if (!value) return;
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      if (!pushed) {
        pushHistory();
        pushed = true;
      }
      apply(num);
    });
    el.addEventListener("change", commit);
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        commit();
        el.blur();
      }
    });
  }

  function bindMultiAbsoluteNumberInput(id, items, getter, setter, normalize, fallback, renderFully) {
    const el = document.getElementById(id);
    if (!el || !items || !items.length) return;
    const normalizeValue = typeof normalize === "function" ? normalize : (value) => value;
    const currentMin = () => minimumValue(items, getter, normalizeValue, fallback);
    let pushed = false;
    el.value = roundNum(currentMin());

    const apply = (rawNum) => {
      const nextValue = normalizeValue(rawNum, fallback);
      items.forEach((item) => setter(item, nextValue));
      el.value = roundNum(nextValue);
      if (renderFully) {
        render();
      } else {
        render(true);
      }
    };

    const commit = () => {
      const value = String(el.value || "").trim();
      if (!value) {
        pushed = false;
        el.value = roundNum(currentMin());
        return;
      }
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      if (!pushed) {
        pushHistory();
        pushed = true;
      }
      apply(num);
      pushed = false;
    };

    el.addEventListener("focus", () => {
      pushed = false;
      el.value = roundNum(currentMin());
    });
    el.addEventListener("input", () => {
      const value = String(el.value || "").trim();
      if (!value) return;
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      if (!pushed) {
        pushHistory();
        pushed = true;
      }
      apply(num);
    });
    el.addEventListener("change", commit);
    el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        commit();
        el.blur();
      }
    });
  }

  function bindMultiSpacingControls(prefix, entities) {
    const base = prefix || "ins-spacing";
    bindMultiDeltaNumberInput(base + "-up", entities, (entity) => normalizeTextInset(entity.textOffsetUp, 0), (entity, value) => { entity.textOffsetUp = value; }, normalizeTextInset, 0, false);
    bindMultiDeltaNumberInput(base + "-down", entities, (entity) => normalizeTextInset(entity.textOffsetDown, 0), (entity, value) => { entity.textOffsetDown = value; }, normalizeTextInset, 0, false);
    bindMultiDeltaNumberInput(base + "-left", entities, (entity) => normalizeTextInset(entity.textOffsetLeft, 0), (entity, value) => { entity.textOffsetLeft = value; }, normalizeTextInset, 0, false);
    bindMultiDeltaNumberInput(base + "-right", entities, (entity) => normalizeTextInset(entity.textOffsetRight, 0), (entity, value) => { entity.textOffsetRight = value; }, normalizeTextInset, 0, false);
    bindMultiDeltaNumberInput(base + "-padding", entities, (entity) => normalizeTextInset(entity.textPadding, 0), (entity, value) => { entity.textPadding = value; }, normalizeTextInset, 0, false);
  }

  function bindMultiAlignButtons(entities, getter, setter, idsByValue) {
    Object.keys(idsByValue).forEach((value) => {
      bindIconButton(idsByValue[value], () => {
        pushHistory();
        entities.forEach((entity) => setter(entity, value));
        render();
      });
    });
    const common = commonValue(entities, getter, (value) => value);
    Object.keys(idsByValue).forEach((value) => {
      setButtonActive(idsByValue[value], common === value);
    });
  }

  function renderMultiShapeInspector(shapeIds) {
    const shapes = normalizeSelectionIds(shapeIds).map((id) => shapeById(id)).filter(Boolean);
    if (!shapes.length) {
      els.inspector.innerHTML = '<div class="empty-state">Shapes not found.</div>';
      return;
    }

    state.richTextSelection = null;
    clearPendingRichTextFormat();

    const commonFontFamily = commonValue(shapes, (shape) => normalizeFontFamily(shape.fontFamily), normalizeFontFamily);
    const commonTextColor = commonValue(shapes, (shape) => normalizeColor(shape.textColor, DEFAULT_TEXT_COLOR), (value) => normalizeColor(value, DEFAULT_TEXT_COLOR));
    const minFontSize = minimumValue(shapes, (shape) => normalizeFontSize(shape.fontSize, 12), normalizeFontSize, 12);
    const commonTextAlign = commonValue(shapes, (shape) => shape.textAlign || "center");
    const commonTextVAlign = commonValue(shapes, (shape) => shape.textVAlign || "center");
    const commonFill = commonValue(shapes, (shape) => normalizeColor(shape.fill, DEFAULT_SHAPE_FILL), (value) => normalizeColor(value, DEFAULT_SHAPE_FILL));
    const commonStroke = commonValue(shapes, (shape) => normalizeColor(shape.stroke, DEFAULT_SHAPE_STROKE), (value) => normalizeColor(value, DEFAULT_SHAPE_STROKE));
    const commonBorderStyle = commonValue(shapes, (shape) => normalizeBorderStyle(shape.borderStyle), normalizeBorderStyle);
    const minBorderWidth = minimumValue(shapes, (shape) => normalizeBorderWidth(shape.borderWidth, defaultBorderWidth(shape.kind)), normalizeBorderWidth, 1);
    const minRotation = minimumValue(shapes, (shape) => shapeRotation(shape), normalizeRotation, 0);
    const roundableShapes = shapes.filter((shape) => shapeSupportsRounding(shape.kind));
    const roundedAll = roundableShapes.length ? roundableShapes.every((shape) => !!shape.rounded) : false;
    const roundedMixed = roundableShapes.length > 1 && !roundableShapes.every((shape) => !!shape.rounded === roundedAll);

    els.inspector.innerHTML = [
      "<div>",
      '<div class="hint"><strong>' + shapes.length + '</strong> items selected</div>',
      '<div class="format-row">' +
        '<button id="fmt-bold" type="button" title="Bold"><span class="format-icon"><strong>B</strong></span></button>' +
        '<button id="fmt-italic" type="button" title="Italic"><span class="format-icon"><em>I</em></span></button>' +
        '<button id="fmt-underline" type="button" title="Underline"><span class="format-icon"><span style="text-decoration:underline;">U</span></span></button>' +
        '<button id="fmt-overline" type="button" title="Overline"><span class="format-icon"><span style="text-decoration:overline;">O</span></span></button>' +
        '<button id="fmt-subscript" type="button" title="Subscript"><span class="format-icon">x₂</span></button>' +
        '<button id="fmt-superscript" type="button" title="Superscript"><span class="format-icon">x²</span></button>' +
      '</div>',
      '<div class="format-row">' +
        '<button id="fmt-align-left" type="button" title="Align left"><span class="format-icon align-icon left">≡</span></button>' +
        '<button id="fmt-align-center" type="button" title="Align center"><span class="format-icon align-icon center">≡</span></button>' +
        '<button id="fmt-align-right" type="button" title="Align right"><span class="format-icon align-icon right">≡</span></button>' +
        '<button id="fmt-v-top" type="button" title="Text top"><span class="format-icon">⇡</span></button>' +
        '<button id="fmt-v-center" type="button" title="Text center"><span class="format-icon">⇕</span></button>' +
        '<button id="fmt-v-bottom" type="button" title="Text bottom"><span class="format-icon">⇣</span></button>' +
      '</div>',
      '<div class="text-style-row">' +
        '<select id="ins-shape-font-family" title="Font family">' + fontFamilyOptionsHtml(commonFontFamily, true) + '</select>' +
        '<input id="ins-shape-font-color" class="compact-color" type="color" title="Font color" value="' + normalizeColor(commonTextColor || DEFAULT_TEXT_COLOR, DEFAULT_TEXT_COLOR) + '"/>' +
        '<input id="ins-shape-font-size" class="font-size-input" type="number" min="8" max="1000" step="0.5" title="Font size" value="' + roundNum(minFontSize) + '"/>' +
      '</div>',
      textSpacingControlsHtml("ins-spacing", {
        textOffsetUp: minimumValue(shapes, (shape) => normalizeTextInset(shape.textOffsetUp, 0), normalizeTextInset, 0),
        textOffsetDown: minimumValue(shapes, (shape) => normalizeTextInset(shape.textOffsetDown, 0), normalizeTextInset, 0),
        textOffsetLeft: minimumValue(shapes, (shape) => normalizeTextInset(shape.textOffsetLeft, 0), normalizeTextInset, 0),
        textOffsetRight: minimumValue(shapes, (shape) => normalizeTextInset(shape.textOffsetRight, 0), normalizeTextInset, 0),
        textPadding: minimumValue(shapes, (shape) => normalizeTextInset(shape.textPadding, 0), normalizeTextInset, 0),
      }),
      '<div class="section-heading-row"><h3>Border</h3>' +
        (roundableShapes.length
          ? '<label class="inline-toggle"><input id="ins-shape-rounded" type="checkbox"' + (roundedAll ? " checked" : "") + '> Rounded corners</label>'
          : "") +
      '</div>',
      '<div><div class="border-controls">' +
        '<select id="ins-shape-border-style">' + mixedOptionHtml(commonBorderStyle) + '<option value="none"' + (commonBorderStyle === "none" ? " selected" : "") + '>none</option><option value="solid"' + (commonBorderStyle === "solid" ? " selected" : "") + '>solid</option><option value="dashed"' + (commonBorderStyle === "dashed" ? " selected" : "") + '>dashed</option><option value="dotted"' + (commonBorderStyle === "dotted" ? " selected" : "") + '>dotted</option></select>' +
        '<input id="ins-shape-border-width" type="number" min="0.5" max="12" step="0.1" title="Border thickness" value="' + roundNum(minBorderWidth) + '"/>' +
      '</div></div>',
      "<h3>Color</h3>",
      '<div class="palette-block"><label>Fill palette</label><div class="palette" id="ins-shape-fill-palette"></div></div>',
      '<div class="palette-block spaced"><label>Border palette</label><div class="palette" id="ins-shape-stroke-palette"></div></div>',
      '<div class="color-inline-row"><label for="ins-shape-fill">Fill:</label><input id="ins-shape-fill" type="color" value="' + normalizeColor(commonFill || DEFAULT_SHAPE_FILL, DEFAULT_SHAPE_FILL) + '"/><label for="ins-shape-stroke">Border:</label><input id="ins-shape-stroke" type="color" value="' + normalizeColor(commonStroke || DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_STROKE) + '"/></div>',
      "<h3>Z-Order</h3>",
      '<div class="row"><button id="ins-z-back">Send Back</button><button id="ins-z-front">Bring Front</button></div>',
      "<h3>Rotation</h3>",
      rotationControlsHtml("ins-rotation", minRotation),
      "</div>",
    ].join("");

    const fillPaletteEl = document.getElementById("ins-shape-fill-palette");
    const strokePaletteEl = document.getElementById("ins-shape-stroke-palette");
    TYPE_COLOR_SWATCHES.forEach((entry) => {
      if (fillPaletteEl) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "swatch" + (commonFill && normalizeColor(commonFill, DEFAULT_SHAPE_FILL) === normalizeColor(entry.fill, DEFAULT_SHAPE_FILL) ? " active" : "");
        sw.style.background = entry.fill;
        sw.style.color = swatchTextColor(entry.fill);
        sw.style.textShadow = swatchTextColor(entry.fill) === "#122033"
          ? "0 1px 0 rgba(255,255,255,0.28)"
          : "0 1px 0 rgba(0,0,0,0.22)";
        sw.title = entry.label + " fill";
        sw.textContent = entry.letter;
        sw.addEventListener("click", () => {
          pushHistory();
          shapes.forEach((shape) => {
            if (shape.kind === "text_box" && shape.noBackground) return;
            shape.fill = normalizeColor(entry.fill, shape.fill);
          });
          render();
        });
        fillPaletteEl.appendChild(sw);
      }
      if (strokePaletteEl) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "swatch" + (commonStroke && normalizeColor(commonStroke, DEFAULT_SHAPE_STROKE) === normalizeColor(entry.stroke, DEFAULT_SHAPE_STROKE) ? " active" : "");
        sw.style.background = entry.stroke;
        sw.style.color = swatchTextColor(entry.stroke);
        sw.style.textShadow = swatchTextColor(entry.stroke) === "#122033"
          ? "0 1px 0 rgba(255,255,255,0.28)"
          : "0 1px 0 rgba(0,0,0,0.22)";
        sw.title = entry.label + " border";
        sw.textContent = entry.letter;
        sw.addEventListener("click", () => {
          pushHistory();
          shapes.forEach((shape) => {
            shape.stroke = normalizeColor(entry.stroke, shape.stroke);
          });
          render();
        });
        strokePaletteEl.appendChild(sw);
      }
    });

    bindMultiTextFormatButtons(shapes);
    bindMultiAlignButtons(shapes, (shape) => shape.textAlign || "center", (shape, value) => { shape.textAlign = value; }, {
      left: "fmt-align-left",
      center: "fmt-align-center",
      right: "fmt-align-right",
    });
    bindMultiAlignButtons(shapes, (shape) => shape.textVAlign || "center", (shape, value) => { shape.textVAlign = value; }, {
      top: "fmt-v-top",
      center: "fmt-v-center",
      bottom: "fmt-v-bottom",
    });

    bindInput("ins-shape-font-family", "change", (value) => {
      if (!value) return;
      pushHistory();
      shapes.forEach((shape) => {
        shape.fontFamily = normalizeFontFamily(value);
      });
      render();
    });
    bindInput("ins-shape-font-color", "input", (value) => {
      pushHistory();
      shapes.forEach((shape) => {
        shape.textColor = normalizeColor(value, shape.textColor);
      });
      render();
    });
    bindMultiDeltaNumberInput("ins-shape-font-size", shapes, (shape) => normalizeFontSize(shape.fontSize, 12), (shape, value) => {
      shape.fontSize = value;
    }, normalizeFontSize, 12, false);
    bindMultiSpacingControls("ins-spacing", shapes);

    bindInput("ins-shape-border-style", "change", (value) => {
      if (!value) return;
      pushHistory();
      shapes.forEach((shape) => {
        shape.borderStyle = normalizeBorderStyle(value);
      });
      render();
    });
    bindMultiAbsoluteNumberInput("ins-shape-border-width", shapes, (shape) => normalizeBorderWidth(shape.borderWidth, defaultBorderWidth(shape.kind)), (shape, value) => {
      shape.borderWidth = value;
    }, normalizeBorderWidth, 1, false);
    if (roundableShapes.length) {
      const roundedInput = document.getElementById("ins-shape-rounded");
      if (roundedInput) {
        roundedInput.indeterminate = roundedMixed;
      }
      bindChecked("ins-shape-rounded", (checked) => {
        pushHistory();
        roundableShapes.forEach((shape) => {
          shape.rounded = checked;
        });
        render();
      });
    }

    bindInput("ins-shape-fill", "input", (value) => {
      pushHistory();
      shapes.forEach((shape) => {
        if (shape.kind === "text_box" && shape.noBackground) return;
        shape.fill = normalizeColor(value, shape.fill);
      });
      render();
    });
    bindInput("ins-shape-stroke", "input", (value) => {
      pushHistory();
      shapes.forEach((shape) => {
        shape.stroke = normalizeColor(value, shape.stroke);
      });
      render();
    });

    const moveSelected = (direction) => {
      const selected = normalizeSelectionIds(shapes.map((shape) => shape.id))
        .map((id) => shapeById(id))
        .filter(Boolean)
        .sort(compareRenderableEntities);
      if (!selected.length) return;
      pushHistory();
      moveRenderableItemsInZ(selected, direction);
      render();
    };
    const zBack = document.getElementById("ins-z-back");
    const zFront = document.getElementById("ins-z-front");
    if (zBack) zBack.addEventListener("click", () => moveSelected("back"));
    if (zFront) zFront.addEventListener("click", () => moveSelected("front"));
    bindRotationControls("ins-rotation", () => minRotation, (value) => {
      const next = normalizeRotation(value);
      shapes.forEach((shape) => {
        shape.rotation = next;
      });
    });
  }

  function renderMultiGroupComponentInspector(entries) {
    const selections = normalizeGroupComponentSelections(entries).map((entry) => {
      const shape = shapeById(entry.shapeId);
      const component = getGroupComponentAt(shape, entry.componentIndex);
      return shape && component ? {
        shape: shape,
        component: component,
        componentIndex: entry.componentIndex,
      } : null;
    }).filter(Boolean);
    if (!selections.length) {
      els.inspector.innerHTML = '<div class="empty-state">Cells not found.</div>';
      return;
    }

    const components = selections.map((entry) => entry.component);
    const commonFontFamily = commonValue(components, (component) => normalizeFontFamily(component.fontFamily), normalizeFontFamily);
    const commonTextColor = commonValue(components, (component) => normalizeColor(component.textColor, DEFAULT_TEXT_COLOR), (value) => normalizeColor(value, DEFAULT_TEXT_COLOR));
    const minFontSize = minimumValue(components, (component) => normalizeFontSize(component.fontSize, 12), normalizeFontSize, 12);
    const commonTextAlign = commonValue(components, (component) => component.textAlign || "center");
    const commonTextVAlign = commonValue(components, (component) => component.textVAlign || "center");
    const effectiveFills = selections.map((entry) => effectiveGroupComponentFill(entry.shape, entry.component));
    const commonEffectiveFill = commonValue(effectiveFills, (value) => normalizeColor(value, DEFAULT_CONTAINER_FILL), (value) => normalizeColor(value, DEFAULT_CONTAINER_FILL));
    const overrideAll = components.every((component) => !!component.fillOverride);
    const overrideMixed = components.some((component) => !!component.fillOverride) && !overrideAll;

    state.richTextSelection = null;
    clearPendingRichTextFormat();

    els.inspector.innerHTML = [
      "<div>",
      '<div class="hint"><strong>' + components.length + '</strong> cells selected</div>',
      '<div class="format-row">' +
        '<button id="fmt-bold" type="button" title="Bold"><span class="format-icon"><strong>B</strong></span></button>' +
        '<button id="fmt-italic" type="button" title="Italic"><span class="format-icon"><em>I</em></span></button>' +
        '<button id="fmt-underline" type="button" title="Underline"><span class="format-icon"><span style="text-decoration:underline;">U</span></span></button>' +
        '<button id="fmt-overline" type="button" title="Overline"><span class="format-icon"><span style="text-decoration:overline;">O</span></span></button>' +
        '<button id="fmt-subscript" type="button" title="Subscript"><span class="format-icon">x₂</span></button>' +
        '<button id="fmt-superscript" type="button" title="Superscript"><span class="format-icon">x²</span></button>' +
      '</div>',
      '<div class="format-row">' +
        '<button id="fmt-align-left" type="button" title="Align left"><span class="format-icon align-icon left">≡</span></button>' +
        '<button id="fmt-align-center" type="button" title="Align center"><span class="format-icon align-icon center">≡</span></button>' +
        '<button id="fmt-align-right" type="button" title="Align right"><span class="format-icon align-icon right">≡</span></button>' +
        '<button id="fmt-v-top" type="button" title="Text top"><span class="format-icon">⇡</span></button>' +
        '<button id="fmt-v-center" type="button" title="Text center"><span class="format-icon">⇕</span></button>' +
        '<button id="fmt-v-bottom" type="button" title="Text bottom"><span class="format-icon">⇣</span></button>' +
      '</div>',
      '<div class="text-style-row">' +
        '<select id="ins-shape-font-family" title="Font family">' + fontFamilyOptionsHtml(commonFontFamily, true) + '</select>' +
        '<input id="ins-shape-font-color" class="compact-color" type="color" title="Font color" value="' + normalizeColor(commonTextColor || DEFAULT_TEXT_COLOR, DEFAULT_TEXT_COLOR) + '"/>' +
        '<input id="ins-shape-font-size" class="font-size-input" type="number" min="8" max="1000" step="0.5" title="Font size" value="' + roundNum(minFontSize) + '"/>' +
      '</div>',
      textSpacingControlsHtml("ins-spacing", {
        textOffsetUp: minimumValue(components, (component) => normalizeTextInset(component.textOffsetUp, 0), normalizeTextInset, 0),
        textOffsetDown: minimumValue(components, (component) => normalizeTextInset(component.textOffsetDown, 0), normalizeTextInset, 0),
        textOffsetLeft: minimumValue(components, (component) => normalizeTextInset(component.textOffsetLeft, 0), normalizeTextInset, 0),
        textOffsetRight: minimumValue(components, (component) => normalizeTextInset(component.textOffsetRight, 0), normalizeTextInset, 0),
        textPadding: minimumValue(components, (component) => normalizeTextInset(component.textPadding, 0), normalizeTextInset, 0),
      }),
      '<div class="section-heading-row"><h3>Color</h3><label class="inline-toggle"><input id="ins-comp-fill-override" type="checkbox"' + (overrideAll ? " checked" : "") + '> Override</label></div>',
      '<div class="palette-block section-offset"><label>Fill palette</label><div class="palette" id="ins-comp-fill-palette"></div></div>',
      '<div class="color-inline-row"><label for="ins-comp-fill">Fill:</label><input id="ins-comp-fill" type="color" value="' + normalizeColor(commonEffectiveFill || DEFAULT_CONTAINER_FILL, DEFAULT_CONTAINER_FILL) + '"' + (overrideAll ? "" : " disabled") + '/></div>',
      "</div>",
    ].join("");

    const fillPaletteEl = document.getElementById("ins-comp-fill-palette");
    TYPE_COLOR_SWATCHES.forEach((entry) => {
      if (!fillPaletteEl) return;
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "swatch" + (commonEffectiveFill && normalizeColor(commonEffectiveFill, DEFAULT_CONTAINER_FILL) === normalizeColor(entry.fill, DEFAULT_CONTAINER_FILL) ? " active" : "");
      sw.style.background = entry.fill;
      sw.style.color = swatchTextColor(entry.fill);
      sw.style.textShadow = swatchTextColor(entry.fill) === "#122033"
        ? "0 1px 0 rgba(255,255,255,0.28)"
        : "0 1px 0 rgba(0,0,0,0.22)";
      sw.textContent = entry.letter;
      sw.title = entry.label + " fill";
      sw.disabled = !overrideAll;
      sw.addEventListener("click", () => {
        if (!overrideAll) return;
        pushHistory();
        selections.forEach((entrySel) => {
          entrySel.component.fill = normalizeColor(entry.fill, entrySel.component.fill || effectiveGroupComponentFill(entrySel.shape, entrySel.component));
        });
        render();
      });
      fillPaletteEl.appendChild(sw);
    });

    bindMultiTextFormatButtons(components);
    bindMultiAlignButtons(components, (component) => component.textAlign || "center", (component, value) => { component.textAlign = value; }, {
      left: "fmt-align-left",
      center: "fmt-align-center",
      right: "fmt-align-right",
    });
    bindMultiAlignButtons(components, (component) => component.textVAlign || "center", (component, value) => { component.textVAlign = value; }, {
      top: "fmt-v-top",
      center: "fmt-v-center",
      bottom: "fmt-v-bottom",
    });

    bindInput("ins-shape-font-family", "change", (value) => {
      if (!value) return;
      pushHistory();
      components.forEach((component) => {
        component.fontFamily = normalizeFontFamily(value);
      });
      render();
    });
    bindInput("ins-shape-font-color", "input", (value) => {
      pushHistory();
      components.forEach((component) => {
        component.textColor = normalizeColor(value, component.textColor);
      });
      render();
    });
    bindMultiDeltaNumberInput("ins-shape-font-size", components, (component) => normalizeFontSize(component.fontSize, 12), (component, value) => {
      component.fontSize = value;
    }, normalizeFontSize, 12, false);
    bindMultiSpacingControls("ins-spacing", components);

    const overrideInput = document.getElementById("ins-comp-fill-override");
    if (overrideInput) {
      overrideInput.indeterminate = overrideMixed;
    }
    bindChecked("ins-comp-fill-override", (checked) => {
      pushHistory();
      selections.forEach((entrySel) => {
        if (checked && !entrySel.component.fillOverride) {
          entrySel.component.fill = effectiveGroupComponentFill(entrySel.shape, entrySel.component);
        }
        entrySel.component.fillOverride = checked;
      });
      render();
    });
    bindInput("ins-comp-fill", "input", (value) => {
      if (!overrideAll) return;
      pushHistory();
      selections.forEach((entrySel) => {
        entrySel.component.fill = normalizeColor(value, entrySel.component.fill || effectiveGroupComponentFill(entrySel.shape, entrySel.component));
      });
      render();
    });
  }

  function renderMultiArrowInspector(arrowIds) {
    const arrows = normalizeArrowSelectionIds(arrowIds).map((id) => arrowById(id)).filter(Boolean);
    if (!arrows.length) {
      els.inspector.innerHTML = '<div class="empty-state">Connections not found.</div>';
      return;
    }

    state.richTextSelection = null;
    clearPendingRichTextFormat();

    const commonType = commonValue(arrows, (arrow) => normalizeConnectionType(arrow.connectionType), normalizeConnectionType);
    const commonLineStyle = commonValue(arrows, (arrow) => normalizeLineStyle(arrow.lineStyle), normalizeLineStyle);
    const commonRouting = commonValue(arrows, (arrow) => normalizeRouting(arrow.routing), normalizeRouting);
    const commonColor = commonValue(arrows, (arrow) => normalizeColor(arrow.stroke, "#e8efff"), (value) => normalizeColor(value, "#e8efff"));
    const minWidth = minimumValue(arrows, (arrow) => Math.max(0.5, Number(arrow.width) || 0.5), (value) => clamp(Number(value) || 0.5, 0.5, 24), 0.5);

    els.inspector.innerHTML = [
      "<div>",
      '<div class="hint"><strong>' + arrows.length + '</strong> connections selected</div>',
      "<h3>Style</h3>",
      '<div><label>Type</label><select id="ins-arrow-type">' + mixedOptionHtml(commonType) + '<option value="directional_connector"' + (commonType === "directional_connector" ? " selected" : "") + '>Directional Connector</option><option value="bidirectional_connector"' + (commonType === "bidirectional_connector" ? " selected" : "") + '>Bi-directional Connector</option><option value="line"' + (commonType === "line" ? " selected" : "") + '>Line</option></select></div>',
      '<div><label>Line style</label><select id="ins-arrow-line">' + mixedOptionHtml(commonLineStyle) + '<option value="solid"' + (commonLineStyle === "solid" ? " selected" : "") + '>solid</option><option value="dashed"' + (commonLineStyle === "dashed" ? " selected" : "") + '>dashed</option><option value="dotted"' + (commonLineStyle === "dotted" ? " selected" : "") + '>dotted</option></select></div>',
      '<div><label>Routing</label><select id="ins-arrow-routing">' + mixedOptionHtml(commonRouting) + '<option value="angled"' + (commonRouting === "angled" ? " selected" : "") + '>angled/orthogonal</option><option value="straight"' + (commonRouting === "straight" ? " selected" : "") + '>straight</option><option value="curved"' + (commonRouting === "curved" ? " selected" : "") + '>curved</option></select></div>',
      '<div><label>Color</label><input id="ins-arrow-color" type="color" value="' + normalizeColor(commonColor || "#e8efff", "#e8efff") + '"/></div>',
      '<div><label>Width</label><input id="ins-arrow-width" type="number" min="0.5" step="0.1" value="' + roundNum(minWidth) + '"/></div>',
      "<h3>Z-Order</h3>",
      '<div class="row"><button id="ins-z-back">Send Back</button><button id="ins-z-front">Bring Front</button></div>',
      "</div>",
    ].join("");

    bindInput("ins-arrow-type", "change", (value) => {
      if (!value) return;
      pushHistory();
      arrows.forEach((arrow) => {
        arrow.connectionType = normalizeConnectionType(value);
      });
      syncCanvasRectToContent();
      render();
    });
    bindInput("ins-arrow-line", "change", (value) => {
      if (!value) return;
      pushHistory();
      arrows.forEach((arrow) => {
        arrow.lineStyle = normalizeLineStyle(value);
      });
      syncCanvasRectToContent();
      render();
    });
    bindInput("ins-arrow-routing", "change", (value) => {
      if (!value) return;
      pushHistory();
      arrows.forEach((arrow) => {
        arrow.routing = normalizeRouting(value);
        if (arrow.routing === "curved" && arrow.controlPoints.length < 2) {
          const geom = buildArrowGeometry(arrow);
          arrow.controlPoints = geom.controlPoints;
        }
      });
      syncCanvasRectToContent();
      render();
    });
    bindInput("ins-arrow-color", "input", (value) => {
      pushHistory();
      arrows.forEach((arrow) => {
        arrow.stroke = normalizeColor(value, arrow.stroke);
      });
      render();
    });
    bindMultiAbsoluteNumberInput("ins-arrow-width", arrows, (arrow) => Math.max(0.5, Number(arrow.width) || 0.5), (arrow, value) => {
      arrow.width = Math.max(0.5, value);
    }, (value) => clamp(Number(value) || 0.5, 0.5, 24), 0.5, false);

    const zBack = document.getElementById("ins-z-back");
    const zFront = document.getElementById("ins-z-front");
    if (zBack) {
      zBack.addEventListener("click", () => {
        pushHistory();
        moveRenderableItemsInZ(arrows, "back");
        render();
      });
    }
    if (zFront) {
      zFront.addEventListener("click", () => {
        pushHistory();
        moveRenderableItemsInZ(arrows, "front");
        render();
      });
    }
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

    const colorSwatches = TYPE_COLOR_SWATCHES;
    const isGroupForm = isGroupFormKind(shape.kind);
    const isComponentGroup = shape.kind === "component_group";
    const isTableGroup = shape.kind === "table_group";
    if (isGroupForm) {
      const componentTotal = isTableGroup
        ? (Math.max(1, Math.min(24, Math.round(Number(shape.tableRows) || 2))) * Math.max(1, Math.min(24, Math.round(Number(shape.tableCols) || 2))))
        : Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)));
      shape.components = normalizeGroupComponents(shape.components, componentTotal, shape);
    }
    const textTarget = makeShapeTextTarget(shape);
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
      textSpacingControlsHtml("ins-spacing", shape),
      '<div class="section-heading-row"><h3>ID</h3><label class="inline-toggle"><input id="ins-shape-auto-id" type="checkbox"' + (!shape.idManual ? " checked" : "") + '> Auto ID</label></div>',
      '<div><input id="ins-shape-id" type="text" value="' + escapeHtml(shape.id) + '"/></div>',
      '<div><label>Parent container:</label><select id="ins-parent">' + parentOptions + '</select></div>',
      '<div class="section-heading-row"><h3>Border</h3>' +
        (shapeSupportsRounding(shape.kind)
          ? '<label class="inline-toggle"><input id="ins-shape-rounded" type="checkbox"' + (shape.rounded ? " checked" : "") + '> Rounded corners</label>'
          : "") +
      '</div>',
      '<div><div class="border-controls">' +
        '<select id="ins-shape-border-style"><option value="none"' + (shape.borderStyle === "none" ? " selected" : "") + '>none</option><option value="solid"' + (shape.borderStyle === "solid" ? " selected" : "") + '>solid</option><option value="dashed"' + (shape.borderStyle === "dashed" ? " selected" : "") + '>dashed</option><option value="dotted"' + (shape.borderStyle === "dotted" ? " selected" : "") + '>dotted</option></select>' +
        '<input id="ins-shape-border-width" type="number" min="0.5" max="12" step="0.1" title="Border thickness" value="' + roundNum(shape.borderWidth || defaultBorderWidth(shape.kind)) + '"/>' +
      '</div></div>',
      isComponentGroup
        ? '<h3>Group Layout</h3>' +
          '<div><label>Direction</label><select id="ins-group-direction"><option value="horizontal"' + (normalizeComponentDirection(shape.componentDirection) === "horizontal" ? " selected" : "") + '>horizontal</option><option value="vertical"' + (normalizeComponentDirection(shape.componentDirection) === "vertical" ? " selected" : "") + '>vertical</option></select></div>' +
          '<div><label>Components</label><input id="ins-group-count" type="number" min="1" max="24" step="1" value="' + Math.max(1, Math.min(24, Math.round(Number(shape.componentCount) || 4)) ) + '"/></div>'
        : (isTableGroup
          ? '<h3>Group Layout</h3>' +
            '<div><label>Main header</label><select id="ins-group-header-side"><option value="top"' + (normalizeGroupHeaderSide(shape.groupHeaderSide) === "top" ? " selected" : "") + '>top</option><option value="right"' + (normalizeGroupHeaderSide(shape.groupHeaderSide) === "right" ? " selected" : "") + '>right</option><option value="bottom"' + (normalizeGroupHeaderSide(shape.groupHeaderSide) === "bottom" ? " selected" : "") + '>bottom</option><option value="left"' + (normalizeGroupHeaderSide(shape.groupHeaderSide) === "left" ? " selected" : "") + '>left</option><option value="none"' + (normalizeGroupHeaderSide(shape.groupHeaderSide) === "none" ? " selected" : "") + '>none</option></select></div>' +
            '<div class="grid2">' +
              '<div class="inline-field"><label for="ins-group-cols">Vertical cells:</label><input id="ins-group-cols" type="number" min="1" max="24" step="1" value="' + Math.max(1, Math.min(24, Math.round(Number(shape.tableCols) || 2))) + '"/></div>' +
              '<div class="inline-field"><label for="ins-group-rows">Horizontal cells:</label><input id="ins-group-rows" type="number" min="1" max="24" step="1" value="' + Math.max(1, Math.min(24, Math.round(Number(shape.tableRows) || 2))) + '"/></div>' +
            '</div>'
          : ""),
      (shape.kind === "text_box"
        ? '<div class="section-heading-row"><h3>Color</h3><label class="inline-toggle"><input id="ins-shape-no-bg" type="checkbox"' + (shape.noBackground ? " checked" : "") + '> No background</label></div>'
        : "<h3>Color</h3>"),
      '<div class="palette-block"><label>Fill palette</label><div class="palette" id="ins-shape-fill-palette"></div></div>',
      '<div class="palette-block spaced"><label>Border palette</label><div class="palette" id="ins-shape-stroke-palette"></div></div>',
      '<div class="color-inline-row"><label for="ins-shape-fill">Fill:</label><input id="ins-shape-fill" type="color" value="' + normalizeColor(shape.fill, "#1c2f4f") + '"' + (shape.kind === "text_box" && shape.noBackground ? " disabled" : "") + '/><label for="ins-shape-stroke">Border:</label><input id="ins-shape-stroke" type="color" value="' + normalizeColor(shape.stroke, "#80b6ff") + '"/></div>',
      "<h3>Geometry</h3>",
      '<div class="grid2">' +
        '<div class="inline-field"><label for="ins-shape-x">x:</label><input id="ins-shape-x" type="number" step="1" value="' + roundNum(shape.x) + '"/></div>' +
        '<div class="inline-field"><label for="ins-shape-y">y:</label><input id="ins-shape-y" type="number" step="1" value="' + roundNum(shape.y) + '"/></div>' +
        rotationGeometryControlsHtml("ins-rotation", shapeRotation(shape)) +
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
      updateTextInspectorMeta(textTarget, textEditor);
    }

    const fillPaletteEl = document.getElementById("ins-shape-fill-palette");
    const strokePaletteEl = document.getElementById("ins-shape-stroke-palette");
    colorSwatches.forEach((entry) => {
      if (fillPaletteEl) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "swatch" + (normalizeColor(shape.fill, "#1c2f4f") === normalizeColor(entry.fill, "#1c2f4f") ? " active" : "");
        sw.style.background = entry.fill;
        sw.style.color = swatchTextColor(entry.fill);
        sw.style.textShadow = swatchTextColor(entry.fill) === "#122033"
          ? "0 1px 0 rgba(255,255,255,0.28)"
          : "0 1px 0 rgba(0,0,0,0.22)";
        sw.title = entry.label + " fill";
        sw.textContent = entry.letter;
        sw.disabled = shape.kind === "text_box" && shape.noBackground;
        sw.addEventListener("click", () => {
          if (shape.kind === "text_box" && shape.noBackground) return;
          pushHistory();
          shape.fill = normalizeColor(entry.fill, shape.fill);
          render();
        });
        fillPaletteEl.appendChild(sw);
      }
    });
    colorSwatches.forEach((entry) => {
      if (strokePaletteEl) {
        const sw2 = document.createElement("button");
        sw2.type = "button";
        sw2.className = "swatch" + (normalizeColor(shape.stroke, "#80b6ff") === normalizeColor(entry.stroke, "#80b6ff") ? " active" : "");
        sw2.style.background = entry.stroke;
        sw2.style.color = swatchTextColor(entry.stroke);
        sw2.style.textShadow = swatchTextColor(entry.stroke) === "#122033"
          ? "0 1px 0 rgba(255,255,255,0.28)"
          : "0 1px 0 rgba(0,0,0,0.22)";
        sw2.title = entry.label + " border";
        sw2.textContent = entry.letter;
        sw2.addEventListener("click", () => {
          pushHistory();
          shape.stroke = normalizeColor(entry.stroke, shape.stroke);
          render();
        });
        strokePaletteEl.appendChild(sw2);
      }
    });

    let pushedTextHistory = false;
    if (textEditor) {
      textEditor.addEventListener("beforeinput", (evt) => handleRichTextBeforeInput(evt, textTarget));
      textEditor.addEventListener("paste", (evt) => handleRichTextPaste(evt, textTarget));
      textEditor.addEventListener("input", () => {
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
        updateTextInspectorMeta(textTarget, textEditor);
        captureRichTextSelection();
        render(true);
      });
      textEditor.addEventListener("keyup", (evt) => {
        if (!state.richTextToolbarInteraction && shouldReleaseStickyTypingStateOnKeyup(evt)) {
          state.richTextPendingSticky = false;
          syncPendingFormatFromCollapsedCaret(textTarget, textEditor);
        }
        captureRichTextSelection();
      });
      textEditor.addEventListener("mouseup", () => {
        if (!state.richTextToolbarInteraction) {
          state.richTextPendingSticky = false;
          syncPendingFormatFromCollapsedCaret(textTarget, textEditor);
        }
        captureRichTextSelection();
      });
      textEditor.addEventListener("focus", () => {
        updateTextInspectorMeta(textTarget, textEditor);
        syncPendingFormatFromCollapsedCaret(textTarget, textEditor);
        updateRichTextToolbarState();
      });
      textEditor.addEventListener("blur", () => {
        if (state.richTextToolbarInteraction || (
          storedRichTextRangeForTarget(textTarget) && state.richTextPendingSticky
        )) return;
        clearPendingRichTextFormat(textTarget.key);
        normalizeRichTextEditor(textEditor);
        syncTextTargetRichText(textTarget, textEditor, true);
      });
    }

    bindIconButton("fmt-bold", () => executeTextCommand(textTarget, "bold"));
    bindIconButton("fmt-italic", () => executeTextCommand(textTarget, "italic"));
    bindIconButton("fmt-underline", () => executeTextCommand(textTarget, "underline"));
    bindIconButton("fmt-overline", () => executeOverlineCommand(textTarget));
    bindIconButton("fmt-subscript", () => executeTextCommand(textTarget, "subscript"));
    bindIconButton("fmt-superscript", () => executeTextCommand(textTarget, "superscript"));
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
        applyInlineStyleCommand(textTarget, { color: nextColor }, false);
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

    bindTextSpacingControls("ins-spacing", shape);

    bindInput("ins-shape-fill", "input", (value) => {
      if (shape.kind === "text_box" && shape.noBackground) return;
      pushHistory();
      shape.fill = normalizeColor(value, shape.fill);
      render();
    });

    bindInput("ins-shape-stroke", "input", (value) => {
      pushHistory();
      shape.stroke = normalizeColor(value, shape.stroke);
      render();
    });

    if (shape.kind === "text_box") {
      bindChecked("ins-shape-no-bg", (checked) => {
        pushHistory();
        shape.noBackground = checked;
        render();
      });
    }

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
        shape.componentFractions = normalizeSegmentFractions([], shape.componentCount);
        ensureComponentGroupMinimumCellSize(shape);
        syncCanvasRectToContent();
        render();
      });
      bindNumber("ins-group-count", "change", (num) => {
        pushHistory();
        shape.componentCount = Math.max(1, Math.min(24, Math.round(num || 1)));
        shape.components = normalizeGroupComponents(shape.components, shape.componentCount, shape);
        shape.componentFractions = normalizeSegmentFractions([], shape.componentCount);
        ensureComponentGroupMinimumCellSize(shape);
        syncCanvasRectToContent();
        render();
      });
    } else if (isTableGroup) {
      bindInput("ins-group-header-side", "change", (value) => {
        pushHistory();
        shape.groupHeaderSide = normalizeGroupHeaderSide(value);
        ensureTableMinimumCellSize(shape);
        syncCanvasRectToContent();
        render();
      });
      bindNumber("ins-group-rows", "change", (num) => {
        pushHistory();
        shape.tableRows = Math.max(1, Math.min(24, Math.round(num || 1)));
        shape.rowFractions = normalizeSegmentFractions([], shape.tableRows);
        shape.components = normalizeGroupComponents(shape.components, shape.tableRows * shape.tableCols, shape);
        ensureTableMinimumCellSize(shape);
        syncCanvasRectToContent();
        render();
      });
      bindNumber("ins-group-cols", "change", (num) => {
        pushHistory();
        shape.tableCols = Math.max(1, Math.min(24, Math.round(num || 1)));
        shape.colFractions = normalizeSegmentFractions([], shape.tableCols);
        shape.components = normalizeGroupComponents(shape.components, shape.tableRows * shape.tableCols, shape);
        ensureTableMinimumCellSize(shape);
        syncCanvasRectToContent();
        render();
      });
    }

    if (shapeSupportsRounding(shape.kind)) {
      bindChecked("ins-shape-rounded", (checked) => {
        pushHistory();
        shape.rounded = checked;
        render();
      });
    }

    function commitGeometryChange(mutator) {
      pushHistory();
      mutator();
      syncCanvasRectToContent();
      render();
    }

    function stepGeometryValue(id, getter, applyValue) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("keydown", (evt) => {
        if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
        evt.preventDefault();
        const direction = evt.key === "ArrowUp" ? 1 : -1;
        pushHistory();
        applyValue(nudgeFromCurrent(getter(), direction, 1));
        syncCanvasRectToContent();
        render(true);
        syncShapeGeometryInputs(shape);
      });
    }

    bindCommittedNumber("ins-shape-x", (num) => {
      commitGeometryChange(() => {
        shape.x = num;
      });
    });
    bindCommittedNumber("ins-shape-y", (num) => {
      commitGeometryChange(() => {
        shape.y = num;
      });
    });
    bindCommittedNumber("ins-shape-w", (num) => {
      commitGeometryChange(() => {
        shape.width = Math.max(MIN_SHAPE_SIZE, num);
        if (shape.kind === "square" || shape.kind === "circle") {
          shape.height = shape.width;
        }
      });
    });
    bindCommittedNumber("ins-shape-h", (num) => {
      commitGeometryChange(() => {
        shape.height = Math.max(MIN_SHAPE_SIZE, num);
        if (shape.kind === "square" || shape.kind === "circle") {
          shape.width = shape.height;
        }
      });
    });
    stepGeometryValue("ins-shape-x", () => shape.x, (next) => { shape.x = next; });
    stepGeometryValue("ins-shape-y", () => shape.y, (next) => { shape.y = next; });
    stepGeometryValue("ins-shape-w", () => shape.width, (next) => {
      shape.width = Math.max(MIN_SHAPE_SIZE, next);
      if (shape.kind === "square" || shape.kind === "circle") {
        shape.height = shape.width;
      }
    });
    stepGeometryValue("ins-shape-h", () => shape.height, (next) => {
      shape.height = Math.max(MIN_SHAPE_SIZE, next);
      if (shape.kind === "square" || shape.kind === "circle") {
        shape.width = shape.height;
      }
    });

    const zBack = document.getElementById("ins-z-back");
    const zFront = document.getElementById("ins-z-front");
    if (zBack) {
      zBack.addEventListener("click", () => {
        pushHistory();
        moveRenderableItemsInZ([shape], "back");
        render();
      });
    }
    if (zFront) {
      zFront.addEventListener("click", () => {
        pushHistory();
        moveRenderableItemsInZ([shape], "front");
        render();
      });
    }

    bindRotationControls("ins-rotation", () => shapeRotation(shape), (value) => {
      shape.rotation = normalizeRotation(value);
    });

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

  function renderGroupComponentInspector(shapeId, componentIndex) {
    const shape = shapeById(shapeId);
    if (!shape || !isGroupFormKind(shape.kind)) {
      els.inspector.innerHTML = '<div class="empty-state">Component not found.</div>';
      return;
    }
    const layout = groupFormLayout(shape);
    shape.components = normalizeGroupComponents(shape.components, layout.components.length, shape);
    const safeIndex = Math.max(0, Math.min(shape.components.length - 1, Number(componentIndex) || 0));
    const selectedBox = layout.components[safeIndex];
    const currentComponent = () => getGroupComponentAt(shape, safeIndex);
    const component = currentComponent();
    if (!component) {
      els.inspector.innerHTML = '<div class="empty-state">Component not found.</div>';
      return;
    }
    const target = makeGroupComponentTextTarget(shape, component, safeIndex);
    const richText = sanitizeRichHtml(component.richText, component.text);
    const selectedFontFamily = normalizeFontFamily(component.fontFamily);
    const fontFamilyOptions = FONT_FAMILY_OPTIONS
      .map((option) => '<option value="' + escapeHtml(option.value) + '"' + (selectedFontFamily === option.value ? " selected" : "") + '>' + escapeHtml(option.label) + '</option>')
      .join("");
    const fillValue = effectiveGroupComponentFill(shape, component);
    const structureHtml = shape.kind === "table_group"
      ? '<div class="section-heading-row"><h3>Structure</h3></div>' +
        '<div class="structure-grid">' +
          '<button id="ins-row-before" type="button">Row before</button>' +
          '<button id="ins-row-after" type="button">Row after</button>' +
          '<button id="ins-col-before" type="button">Column before</button>' +
          '<button id="ins-col-after" type="button">Column after</button>' +
        '</div>'
      : '<div class="section-heading-row"><h3>Structure</h3></div>' +
        '<div class="structure-grid">' +
          '<button id="ins-comp-before" type="button">Component before</button>' +
          '<button id="ins-comp-after" type="button">Component after</button>' +
        '</div>';

    state.richTextSelection = null;
    clearPendingRichTextFormat();

    els.inspector.innerHTML = [
      "<div>",
      '<div class="hint">Cell <strong>' + (shape.kind === "table_group" ? ((layout.components[safeIndex].row + 1) + "," + (layout.components[safeIndex].col + 1)) : (safeIndex + 1)) + '</strong> in <strong>' + escapeHtml(shape.text) + "</strong></div>",
      '<div><label id="ins-shape-text-label">Text - ' + component.text.length + '/' + MAX_SHAPE_TEXT_LENGTH + '</label><div id="ins-shape-text-editor" class="rich-text-editor" contenteditable="true" spellcheck="false">' + richText + "</div></div>",
      '<div class="format-row">' +
        '<button id="fmt-bold" type="button" title="Bold"><span class="format-icon"><strong>B</strong></span></button>' +
        '<button id="fmt-italic" type="button" title="Italic"><span class="format-icon"><em>I</em></span></button>' +
        '<button id="fmt-underline" type="button" title="Underline"><span class="format-icon"><span style="text-decoration:underline;">U</span></span></button>' +
        '<button id="fmt-overline" type="button" title="Overline"><span class="format-icon"><span style="text-decoration:overline;">O</span></span></button>' +
        '<button id="fmt-subscript" type="button" title="Subscript"><span class="format-icon">x₂</span></button>' +
        '<button id="fmt-superscript" type="button" title="Superscript"><span class="format-icon">x²</span></button>' +
      "</div>",
      '<div class="format-row">' +
        '<button id="fmt-align-left" type="button" title="Align left"' + (component.textAlign === "left" ? ' class="active"' : "") + '><span class="format-icon align-icon left">≡</span></button>' +
        '<button id="fmt-align-center" type="button" title="Align center"' + (component.textAlign === "center" ? ' class="active"' : "") + '><span class="format-icon align-icon center">≡</span></button>' +
        '<button id="fmt-align-right" type="button" title="Align right"' + (component.textAlign === "right" ? ' class="active"' : "") + '><span class="format-icon align-icon right">≡</span></button>' +
        '<button id="fmt-v-top" type="button" title="Text top"' + (component.textVAlign === "top" ? ' class="active"' : "") + '><span class="format-icon">⇡</span></button>' +
        '<button id="fmt-v-center" type="button" title="Text center"' + (component.textVAlign === "center" ? ' class="active"' : "") + '><span class="format-icon">⇕</span></button>' +
        '<button id="fmt-v-bottom" type="button" title="Text bottom"' + (component.textVAlign === "bottom" ? ' class="active"' : "") + '><span class="format-icon">⇣</span></button>' +
      "</div>",
      '<div class="text-style-row">' +
        '<select id="ins-shape-font-family" title="Font family">' + fontFamilyOptions + '</select>' +
        '<input id="ins-shape-font-color" class="compact-color" type="color" title="Font color" value="' + normalizeColor(component.textColor, "#f4f7ff") + '"/>' +
        '<input id="ins-shape-font-size" class="font-size-input" type="number" min="8" max="1000" step="0.5" title="Font size" value="' + roundNum(component.fontSize || 12) + '"/>' +
      "</div>",
      textSpacingControlsHtml("ins-spacing", component),
      structureHtml,
      '<div class="section-heading-row"><h3>Color</h3><label class="inline-toggle"><input id="ins-comp-fill-override" type="checkbox"' + (component.fillOverride ? " checked" : "") + '> Override</label></div>',
      '<div class="palette-block section-offset"><label>Fill palette</label><div class="palette" id="ins-comp-fill-palette"></div></div>',
      '<div class="color-inline-row"><label for="ins-comp-fill">Fill:</label><input id="ins-comp-fill" type="color" value="' + normalizeColor(fillValue, "#0d172a") + '"' + (component.fillOverride ? "" : " disabled") + '/></div>',
      "</div>",
    ].join("");

    const textEditor = document.getElementById("ins-shape-text-editor");
    if (textEditor) {
      textEditor.innerHTML = richText;
      updateTextInspectorMeta(target, textEditor);
    }

    const fillPaletteEl = document.getElementById("ins-comp-fill-palette");
    TYPE_COLOR_SWATCHES.forEach((entry) => {
      if (!fillPaletteEl) return;
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "swatch" + (normalizeColor(fillValue, "#0d172a") === normalizeColor(entry.fill, "#0d172a") ? " active" : "");
      sw.style.background = entry.fill;
      sw.style.color = swatchTextColor(entry.fill);
      sw.style.textShadow = swatchTextColor(entry.fill) === "#122033"
        ? "0 1px 0 rgba(255,255,255,0.28)"
        : "0 1px 0 rgba(0,0,0,0.22)";
      sw.textContent = entry.letter;
      sw.title = entry.label + " fill";
      sw.disabled = !component.fillOverride;
      sw.addEventListener("click", () => {
        const nextComponent = currentComponent();
        if (!nextComponent || !nextComponent.fillOverride) return;
        pushHistory();
        nextComponent.fill = normalizeColor(entry.fill, nextComponent.fill || fillValue);
        render();
      });
      fillPaletteEl.appendChild(sw);
    });

    let pushedTextHistory = false;
    if (textEditor) {
      textEditor.addEventListener("beforeinput", (evt) => handleRichTextBeforeInput(evt, target));
      textEditor.addEventListener("paste", (evt) => handleRichTextPaste(evt, target));
      textEditor.addEventListener("input", () => {
        normalizeRichTextEditor(textEditor);
        if (!pushedTextHistory) {
          pushHistory();
          pushedTextHistory = true;
        }
        const nextComponent = currentComponent();
        if (!nextComponent) return;
        nextComponent.richText = String(textEditor.innerHTML || "");
        nextComponent.text = richHtmlToPlainText(nextComponent.richText);
        if (nextComponent.text.length > MAX_SHAPE_TEXT_LENGTH) {
          nextComponent.text = nextComponent.text.slice(0, MAX_SHAPE_TEXT_LENGTH);
          nextComponent.richText = plainTextToRichHtml(nextComponent.text);
          textEditor.innerHTML = nextComponent.richText;
        }
        updateTextInspectorMeta(target, textEditor);
        captureRichTextSelection();
        render(true);
      });
      textEditor.addEventListener("keyup", (evt) => {
        if (!state.richTextToolbarInteraction && shouldReleaseStickyTypingStateOnKeyup(evt)) {
          state.richTextPendingSticky = false;
          syncPendingFormatFromCollapsedCaret(target, textEditor);
        }
        captureRichTextSelection();
      });
      textEditor.addEventListener("mouseup", () => {
        if (!state.richTextToolbarInteraction) {
          state.richTextPendingSticky = false;
          syncPendingFormatFromCollapsedCaret(target, textEditor);
        }
        captureRichTextSelection();
      });
      textEditor.addEventListener("focus", () => {
        updateTextInspectorMeta(target, textEditor);
        syncPendingFormatFromCollapsedCaret(target, textEditor);
        updateRichTextToolbarState();
      });
      textEditor.addEventListener("blur", () => {
        if (state.richTextToolbarInteraction || (
          storedRichTextRangeForTarget(target) && state.richTextPendingSticky
        )) return;
        clearPendingRichTextFormat(target.key);
        normalizeRichTextEditor(textEditor);
        syncTextTargetRichText(target, textEditor, true);
      });
    }

    bindIconButton("fmt-bold", () => executeTextCommand(target, "bold"));
    bindIconButton("fmt-italic", () => executeTextCommand(target, "italic"));
    bindIconButton("fmt-underline", () => executeTextCommand(target, "underline"));
    bindIconButton("fmt-overline", () => executeOverlineCommand(target));
    bindIconButton("fmt-subscript", () => executeTextCommand(target, "subscript"));
    bindIconButton("fmt-superscript", () => executeTextCommand(target, "superscript"));
    bindIconButton("fmt-align-left", () => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.textAlign = "left";
      render();
    });
    bindIconButton("fmt-align-center", () => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.textAlign = "center";
      render();
    });
    bindIconButton("fmt-align-right", () => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.textAlign = "right";
      render();
    });
    bindIconButton("fmt-v-top", () => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.textVAlign = "top";
      render();
    });
    bindIconButton("fmt-v-center", () => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.textVAlign = "center";
      render();
    });
    bindIconButton("fmt-v-bottom", () => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.textVAlign = "bottom";
      render();
    });
    updateRichTextToolbarState();

    bindInput("ins-shape-font-family", "change", (value) => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.fontFamily = normalizeFontFamily(value);
      render();
    });

    bindInput("ins-shape-font-color", "input", (value) => {
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      const nextColor = normalizeColor(value, nextComponent.textColor);
      if (hasActiveRichTextSelection()) {
        applyInlineStyleCommand(target, { color: nextColor }, false);
        return;
      }
      pushHistory();
      nextComponent.textColor = nextColor;
      render();
    });

    bindCommittedNumber("ins-shape-font-size", (num) => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      nextComponent.fontSize = normalizeFontSize(num, nextComponent.fontSize || 12);
      render();
    });

    const liveComponent = currentComponent();
    if (liveComponent) {
      bindTextSpacingControls("ins-spacing", liveComponent);
    }

    bindChecked("ins-comp-fill-override", (checked) => {
      pushHistory();
      const nextComponent = currentComponent();
      if (!nextComponent) return;
      if (checked && !nextComponent.fillOverride) {
        nextComponent.fill = effectiveGroupComponentFill(shape, nextComponent);
      }
      nextComponent.fillOverride = checked;
      render();
    });

    bindInput("ins-comp-fill", "input", (value) => {
      const nextComponent = currentComponent();
      if (!nextComponent || !nextComponent.fillOverride) return;
      pushHistory();
      nextComponent.fill = normalizeColor(value, nextComponent.fill || fillValue);
      render();
    });

    if (selectedBox) {
      const bindInsert = (id, handler) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener("click", handler);
      };
      if (shape.kind === "table_group") {
        bindInsert("ins-row-before", () => {
          pushHistory();
          const originalRow = clamp(selectedBox.row, 0, shape.tableRows - 1);
          const originalCol = clamp(selectedBox.col, 0, shape.tableCols - 1);
          const insertedIndex = insertTableRow(shape, originalRow, false);
          if (insertedIndex == null) return;
          syncCanvasRectToContent();
          setSelected({ type: "group_component", shapeId: shape.id, componentIndex: (originalRow + 1) * shape.tableCols + originalCol });
        });
        bindInsert("ins-row-after", () => {
          pushHistory();
          const originalRow = clamp(selectedBox.row, 0, shape.tableRows - 1);
          const originalCol = clamp(selectedBox.col, 0, shape.tableCols - 1);
          const insertedIndex = insertTableRow(shape, originalRow, true);
          if (insertedIndex == null) return;
          syncCanvasRectToContent();
          setSelected({ type: "group_component", shapeId: shape.id, componentIndex: originalRow * shape.tableCols + originalCol });
        });
        bindInsert("ins-col-before", () => {
          pushHistory();
          const originalRow = clamp(selectedBox.row, 0, shape.tableRows - 1);
          const originalCol = clamp(selectedBox.col, 0, shape.tableCols - 1);
          const insertedIndex = insertTableColumn(shape, originalCol, false);
          if (insertedIndex == null) return;
          syncCanvasRectToContent();
          setSelected({ type: "group_component", shapeId: shape.id, componentIndex: originalRow * shape.tableCols + (originalCol + 1) });
        });
        bindInsert("ins-col-after", () => {
          pushHistory();
          const originalRow = clamp(selectedBox.row, 0, shape.tableRows - 1);
          const originalCol = clamp(selectedBox.col, 0, shape.tableCols - 1);
          const insertedIndex = insertTableColumn(shape, originalCol, true);
          if (insertedIndex == null) return;
          syncCanvasRectToContent();
          setSelected({ type: "group_component", shapeId: shape.id, componentIndex: originalRow * shape.tableCols + originalCol });
        });
      } else if (shape.kind === "component_group") {
        bindInsert("ins-comp-before", () => {
          pushHistory();
          const originalIndex = clamp(safeIndex, 0, shape.componentCount - 1);
          const insertedIndex = insertComponentGroupCell(shape, originalIndex, false);
          if (insertedIndex == null) return;
          syncCanvasRectToContent();
          setSelected({ type: "group_component", shapeId: shape.id, componentIndex: originalIndex + 1 });
        });
        bindInsert("ins-comp-after", () => {
          pushHistory();
          const originalIndex = clamp(safeIndex, 0, shape.componentCount - 1);
          const insertedIndex = insertComponentGroupCell(shape, originalIndex, true);
          if (insertedIndex == null) return;
          syncCanvasRectToContent();
          setSelected({ type: "group_component", shapeId: shape.id, componentIndex: originalIndex });
        });
      }
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

    const cp1 = arrow.controlPoints[0] || { x: 0, y: 0 };
    const cp2 = arrow.controlPoints[1] || { x: 0, y: 0 };
    const connectionType = normalizeConnectionType(arrow.connectionType);

    const waypointRows = (arrow.waypoints || []).map((wp, idx) => {
      return '<div class="waypoint-grid">' +
        '<div><label>x</label><input data-waypoint-x="' + idx + '" type="number" step="1" value="' + roundNum(wp.x) + '"/></div>' +
        '<div><label>y</label><input data-waypoint-y="' + idx + '" type="number" step="1" value="' + roundNum(wp.y) + '"/></div>' +
        '<button data-waypoint-remove="' + idx + '" class="danger waypoint-remove">Remove waypoint</button>' +
      '</div>';
    }).join("");

    els.inspector.innerHTML = [
      "<div>",
      '<div><label>ID</label><input id="ins-arrow-id" type="text" value="' + escapeHtml(arrow.id) + '"/></div>',
      '<div class="hint">From: <strong>' + describeEndpoint(arrow.from) + '</strong></div>',
      '<div class="hint">To: <strong>' + describeEndpoint(arrow.to) + '</strong></div>',
      "<h3>Style</h3>",
      '<div><label>Type</label><select id="ins-arrow-type"><option value="directional_connector"' + (connectionType === "directional_connector" ? " selected" : "") + '>Directional Connector</option><option value="bidirectional_connector"' + (connectionType === "bidirectional_connector" ? " selected" : "") + '>Bi-directional Connector</option><option value="line"' + (connectionType === "line" ? " selected" : "") + '>Line</option></select></div>',
      '<div><label>Line style</label><select id="ins-arrow-line"><option value="solid"' + (arrow.lineStyle === "solid" ? " selected" : "") + '>solid</option><option value="dashed"' + (arrow.lineStyle === "dashed" ? " selected" : "") + '>dashed</option><option value="dotted"' + (arrow.lineStyle === "dotted" ? " selected" : "") + '>dotted</option></select></div>',
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
      "<h3>Z-Order</h3>",
      '<div class="row"><button id="ins-z-back">Send Back</button><button id="ins-z-front">Bring Front</button></div>',
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
      syncCanvasRectToContent();
      render();
    });

    bindInput("ins-arrow-line", "change", (value) => {
      pushHistory();
      arrow.lineStyle = normalizeLineStyle(value);
      syncCanvasRectToContent();
      render();
    });

    bindInput("ins-arrow-routing", "change", (value) => {
      pushHistory();
      arrow.routing = normalizeRouting(value);
      if (arrow.routing === "curved" && arrow.controlPoints.length < 2) {
        const geom = buildArrowGeometry(arrow);
        arrow.controlPoints = geom.controlPoints;
      }
      syncCanvasRectToContent();
      render();
    });

    bindInput("ins-arrow-color", "input", (value) => {
      pushHistory();
      arrow.stroke = normalizeColor(value, arrow.stroke);
      render();
    });

    bindSmoothNumberInput(
      "ins-arrow-width",
      () => Math.max(0.5, Number(arrow.width) || 0.5),
      (num) => {
        arrow.width = Math.max(0.5, num);
      },
      {
        step: 0.1,
        syncCanvas: false,
      }
    );

    const zBack = document.getElementById("ins-z-back");
    const zFront = document.getElementById("ins-z-front");
    if (zBack) {
      zBack.addEventListener("click", () => {
        pushHistory();
        moveRenderableItemsInZ([arrow], "back");
        render();
      });
    }
    if (zFront) {
      zFront.addEventListener("click", () => {
        pushHistory();
        moveRenderableItemsInZ([arrow], "front");
        render();
      });
    }

    if (arrow.routing === "curved") {
      bindSmoothNumberInput(
        "ins-cp1x",
        () => ((arrow.controlPoints[0] && arrow.controlPoints[0].x) || 0),
        (num) => setControlPoint(arrow, 0, "x", num),
        { step: 1, syncCanvas: true }
      );
      bindSmoothNumberInput(
        "ins-cp1y",
        () => ((arrow.controlPoints[0] && arrow.controlPoints[0].y) || 0),
        (num) => setControlPoint(arrow, 0, "y", num),
        { step: 1, syncCanvas: true }
      );
      bindSmoothNumberInput(
        "ins-cp2x",
        () => ((arrow.controlPoints[1] && arrow.controlPoints[1].x) || 0),
        (num) => setControlPoint(arrow, 1, "x", num),
        { step: 1, syncCanvas: true }
      );
      bindSmoothNumberInput(
        "ins-cp2y",
        () => ((arrow.controlPoints[1] && arrow.controlPoints[1].y) || 0),
        (num) => setControlPoint(arrow, 1, "y", num),
        { step: 1, syncCanvas: true }
      );
    }

    if (arrow.routing === "angled") {
      const addBtn = document.getElementById("ins-waypoint-add");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          pushHistory();
          const geom = buildArrowGeometry(arrow);
          arrow.waypoints.push({ x: (geom.from.x + geom.to.x) / 2, y: (geom.from.y + geom.to.y) / 2 });
          syncCanvasRectToContent();
          render();
        });
      }

      (arrow.waypoints || []).forEach((_, idx) => {
        bindSmoothNumberByAttr(
          "data-waypoint-x",
          idx,
          () => (arrow.waypoints[idx] ? arrow.waypoints[idx].x : 0),
          (num) => {
            if (!arrow.waypoints[idx]) return;
            arrow.waypoints[idx].x = num;
          },
          { step: 1, syncCanvas: true }
        );
        bindSmoothNumberByAttr(
          "data-waypoint-y",
          idx,
          () => (arrow.waypoints[idx] ? arrow.waypoints[idx].y : 0),
          (num) => {
            if (!arrow.waypoints[idx]) return;
            arrow.waypoints[idx].y = num;
          },
          { step: 1, syncCanvas: true }
        );

        const removeBtn = document.querySelector('[data-waypoint-remove="' + idx + '"]');
        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            pushHistory();
            arrow.waypoints.splice(idx, 1);
            syncCanvasRectToContent();
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
      syncCanvasRectToContent();
      state.selected = null;
      state.selectedShapeIds = [];
      state.selectedArrowIds = [];
      state.selectedGroupComponents = [];
      state.selectedArrowHandle = null;
      state.connectSourceId = null;
      render();
      recenterView();
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
      syncCanvasRectToContent();
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
      syncCanvasRectToContent();
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
    if (els.connectionToolsGrid) {
      els.connectionToolsGrid.addEventListener("click", (evt) => {
        const button = evt.target && evt.target.closest("[data-mode]");
        if (!button) return;
        setMode(button.getAttribute("data-mode") || "select");
      });
    }

    if (els.shapeToolsGrid) {
      els.shapeToolsGrid.addEventListener("click", (evt) => {
        const button = evt.target && evt.target.closest("[data-kind]");
        if (!button) return;
        addShape(button.getAttribute("data-kind") || "square");
      });
    }

    if (els.shapePagePrev) {
      els.shapePagePrev.addEventListener("click", () => {
        setShapeToolPage(state.shapeToolPage - 1);
      });
    }
    if (els.shapePageNext) {
      els.shapePageNext.addEventListener("click", () => {
        setShapeToolPage(state.shapeToolPage + 1);
      });
    }
    if (els.shapePageInput) {
      const commitShapePageInput = () => {
        setShapeToolPage(Number(els.shapePageInput.value) - 1);
      };
      els.shapePageInput.addEventListener("change", commitShapePageInput);
      els.shapePageInput.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          commitShapePageInput();
          els.shapePageInput.blur();
        } else if (evt.key === "Escape") {
          evt.preventDefault();
          renderShapeToolPager();
          els.shapePageInput.blur();
        }
      });
    }

    if (els.containerToolsGrid) {
      els.containerToolsGrid.addEventListener("click", (evt) => {
        const button = evt.target && evt.target.closest("[data-kind]");
        if (!button) return;
        addShape(button.getAttribute("data-kind") || "container");
      });
    }

    if (els.groupToolsGrid) {
      els.groupToolsGrid.addEventListener("click", (evt) => {
        const button = evt.target && evt.target.closest("[data-kind]");
        if (!button) return;
        addShape(button.getAttribute("data-kind") || "table_group");
      });
    }

    els.deleteBtn.addEventListener("click", deleteSelected);

    els.zoomInBtn.addEventListener("click", () => setZoom(state.view.zoom + ZOOM_STEP));
    els.zoomOutBtn.addEventListener("click", () => setZoom(state.view.zoom - ZOOM_STEP));
    els.recenterBtn.addEventListener("click", recenterView);
    els.zoomResetBtn.addEventListener("click", resetView);

    if (els.zoomInput) {
      const commitZoomInput = () => {
        setZoomMenuOpen(false);
        const parsed = parseZoomPercentValue(els.zoomInput.value);
        if (parsed === null) {
          syncZoomInput(true);
          return;
        }
        els.zoomInput.dataset.dirty = "false";
        setZoom(parsed);
      };

      els.zoomInput.addEventListener("input", () => {
        els.zoomInput.dataset.dirty = "true";
      });
      els.zoomInput.addEventListener("focus", () => {
        setZoomMenuOpen(true);
      });
      els.zoomInput.addEventListener("click", () => {
        setZoomMenuOpen(true);
      });
      els.zoomInput.addEventListener("change", commitZoomInput);
      els.zoomInput.addEventListener("blur", commitZoomInput);
      els.zoomInput.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          commitZoomInput();
        } else if (evt.key === "Escape") {
          evt.preventDefault();
          setZoomMenuOpen(false);
          syncZoomInput(true);
          els.zoomInput.blur();
        } else if (evt.key === "ArrowDown") {
          evt.preventDefault();
          setZoomMenuOpen(true);
        }
      });
    }

    if (els.zoomMenuBtn) {
      els.zoomMenuBtn.addEventListener("pointerdown", (evt) => {
        evt.preventDefault();
      });
      els.zoomMenuBtn.addEventListener("click", () => {
        setZoomMenuOpen(!els.zoomCombobox.classList.contains("open"));
      });
    }

    if (els.zoomPresetsMenu) {
      els.zoomPresetsMenu.addEventListener("pointerdown", (evt) => {
        evt.preventDefault();
      });
      els.zoomPresetsMenu.addEventListener("click", (evt) => {
        const btn = evt.target && evt.target.closest("[data-zoom-preset]");
        if (!btn) return;
        const value = Number(btn.getAttribute("data-zoom-preset"));
        if (!Number.isFinite(value)) return;
        setZoomMenuOpen(false);
        els.zoomInput.dataset.dirty = "false";
        setZoom(value / 100);
      });
    }

    document.addEventListener("pointerdown", (evt) => {
      if (!els.zoomCombobox) return;
      if (els.zoomCombobox.contains(evt.target)) return;
      setZoomMenuOpen(false);
    });

    els.svg.addEventListener("pointerdown", onBackgroundPointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", cancelActiveDrag);

    window.addEventListener("wheel", zoomFromWheelEvent, { passive: false });

    // Safari/macOS trackpad pinch support.
    let gestureStartZoom = 1;
    els.canvasScroll.addEventListener("gesturestart", (evt) => {
      if (!eventTargetsCanvas(evt)) return;
      evt.preventDefault();
      gestureStartZoom = state.view.zoom;
    }, { passive: false });
    els.canvasScroll.addEventListener("gesturechange", (evt) => {
      if (!eventTargetsCanvas(evt)) return;
      evt.preventDefault();
      const scale = Number(evt.scale) || 1;
      setZoom(gestureStartZoom * scale, { clientX: evt.clientX, clientY: evt.clientY });
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
        if (state.selected && state.selected.type === "group_component") {
          copySelectedGroupComponent();
        } else {
          copySelectedShapeBundle();
        }
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

      const moveKey = String(evt.key || "").toLowerCase();
      if (!inInput && (moveKey === "w" || moveKey === "a" || moveKey === "s" || moveKey === "d")) {
        const deltas = {
          w: { x: 0, y: -KEYBOARD_NUDGE_STEP },
          a: { x: -KEYBOARD_NUDGE_STEP, y: 0 },
          s: { x: 0, y: KEYBOARD_NUDGE_STEP },
          d: { x: KEYBOARD_NUDGE_STEP, y: 0 },
        };
        const delta = deltas[moveKey];
        if (delta && currentSelectedArrowHandle()) {
          evt.preventDefault();
          moveSelectedArrowHandleBy(delta.x, delta.y);
          return;
        }
        if (delta && (moveSelectedShapesBy(delta.x, delta.y) || moveSelectedArrowsBy(delta.x, delta.y))) {
          evt.preventDefault();
        }
        return;
      }

      if (!inInput && moveKey === "q") {
        if (rotateSelectedShapesBy(-KEYBOARD_ROTATE_STEP)) {
          evt.preventDefault();
        }
        return;
      }

      if (!inInput && moveKey === "e") {
        if (rotateSelectedShapesBy(KEYBOARD_ROTATE_STEP)) {
          evt.preventDefault();
        }
        return;
      }

      if (evt.key === "Escape") {
        state.connectSourceId = null;
        cancelActiveDrag();
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
    renderToolButtons();
    bindEvents();
    render();
    recenterView();
    loadModel();
  }

  init();
})();
