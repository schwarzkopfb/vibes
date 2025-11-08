// utils/positioner.ts
function createScreenLens(onUpdate) {
  let tracking = false;
  let frameId = 0;
  let lastTime = 0;
  let lastState = computeState();
  function computeState() {
    const sx = window.screenX ?? window.screenLeft ?? 0;
    const sy = window.screenY ?? window.screenTop ?? 0;
    const outerW = window.outerWidth || window.innerWidth;
    const outerH = window.outerHeight || window.innerHeight;
    const innerW = window.innerWidth;
    const innerH = window.innerHeight;
    const viewportX = sx + (outerW - innerW) / 2;
    const viewportY = sy + (outerH - innerH);
    return {
      viewportX,
      viewportY,
      canvasOffsetX: -viewportX,
      canvasOffsetY: -viewportY
    };
  }
  function hasChanged(a, b) {
    return a.viewportX !== b.viewportX || a.viewportY !== b.viewportY || a.canvasOffsetX !== b.canvasOffsetX || a.canvasOffsetY !== b.canvasOffsetY;
  }
  function shouldTrack() {
    return document.visibilityState === "visible" && document.hasFocus();
  }
  function tick(t) {
    if (!tracking) return;
    if (!shouldTrack()) {
      tracking = false;
      return;
    }
    if (t - lastTime >= 50) {
      const next = computeState();
      if (hasChanged(lastState, next)) {
        lastState = next;
        onUpdate(next);
      }
      lastTime = t;
    }
    frameId = requestAnimationFrame(tick);
  }
  function start() {
    if (tracking || !shouldTrack()) return;
    tracking = true;
    frameId = requestAnimationFrame(tick);
  }
  function stopInternal() {
    tracking = false;
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }
  function handleResize() {
    const next = computeState();
    if (hasChanged(lastState, next)) {
      lastState = next;
      onUpdate(next);
    }
    start();
  }
  function handleVisibilityOrFocus() {
    if (shouldTrack()) {
      const next = computeState();
      if (hasChanged(lastState, next)) {
        lastState = next;
        onUpdate(next);
      }
      start();
    } else {
      stopInternal();
    }
  }
  window.addEventListener("resize", handleResize);
  window.addEventListener("focus", handleVisibilityOrFocus);
  window.addEventListener("blur", handleVisibilityOrFocus);
  document.addEventListener("visibilitychange", handleVisibilityOrFocus);
  onUpdate(lastState);
  if (shouldTrack()) start();
  return {
    stop() {
      stopInternal();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("blur", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    },
    getState() {
      return lastState;
    }
  };
}

// utils/random.ts
var MULBERRY_SEED = 1831565813;
var UINT32_MAX = 4294967296;
var HASH_MULTIPLIER = 31;
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = a + MULBERRY_SEED | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / UINT32_MAX;
  };
}
function hashStringToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = h * HASH_MULTIPLIER + str.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

// utils/math.ts
var TWO_PI = Math.PI * 2;
function lerp(min, max, t) {
  return min + (max - min) * t;
}

// utils/config.ts
var BROADCAST_INTERVAL = 400;
var COLORS = {
  BACKGROUND: "#fafafa",
  GRID: "#959596",
  NODE_SELF: "#8c8c8c",
  NODE_OTHER: "#aba9a9",
  EDGE: "#43464a"
};
var EDGE = {
  ALPHA_MIN: 0.04,
  ALPHA_MAX: 0.26,
  WIDTH_MIN: 0.4,
  WIDTH_MAX: 1.2
};
var GRID = {
  ALPHA: 0.35,
  LINE_WIDTH: 0.5,
  STEP: 80
};
var NODE = {
  ALPHA_OTHER: 0.85,
  ALPHA_SELF: 0.95,
  RADIUS_MIN: 8,
  RADIUS_OTHER: 3.2,
  RADIUS_RANGE: 24,
  RADIUS_SELF: 4.2,
  RADIUS_VARIATION: 0.4,
  SPEED_MIN: 0.35,
  SPEED_RANGE: 0.45
};
var MAX_EDGES_PER_NODE = 3;
var TIME_SCALE = 1e-3;
var WORLD_HEIGHT = 1080;
var WORLD_WIDTH = 1920;
var MAX_DISTANCE = Math.hypot(WORLD_WIDTH, WORLD_HEIGHT);

// index.ts
var canvas = document.getElementById("canvas");
var ctx = canvas?.getContext("2d");
var id = crypto.randomUUID && crypto.randomUUID() || Math.random().toString(36).slice(2);
var channel = new BroadcastChannel("window-graph");
var nodes = /* @__PURE__ */ new Map();
var nodeParamsCache = /* @__PURE__ */ new Map();
var selfBase = {
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2
};
var lastBroadcast = 0;
function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.style.width = `${WORLD_WIDTH}px`;
  canvas.style.height = `${WORLD_HEIGHT}px`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = WORLD_WIDTH * dpr;
  canvas.height = WORLD_HEIGHT * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function getNodeParams(nodeId) {
  let p = nodeParamsCache.get(nodeId);
  if (p) return p;
  const r = mulberry32(hashStringToSeed(nodeId) || 1);
  p = {
    radius: NODE.RADIUS_MIN + r() * NODE.RADIUS_RANGE,
    s1: NODE.SPEED_MIN + r() * NODE.SPEED_RANGE,
    s2: NODE.SPEED_MIN + r() * NODE.SPEED_RANGE,
    phi: r() * TWO_PI,
    psi: r() * TWO_PI
  };
  nodeParamsCache.set(nodeId, p);
  return p;
}
function getDrawPos(nodeId, baseX, baseY, t) {
  const p = getNodeParams(nodeId);
  return {
    x: baseX + Math.cos(t * p.s1 + p.phi) * p.radius,
    y: baseY + Math.sin(t * p.s2 + p.psi) * p.radius
  };
}
function drawGrid() {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = COLORS.GRID;
  ctx.globalAlpha = GRID.ALPHA;
  ctx.lineWidth = GRID.LINE_WIDTH;
  for (let x = 0; x <= WORLD_WIDTH; x += GRID.STEP) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += GRID.STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WORLD_WIDTH, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}
function drawBackground() {
  if (!ctx) return;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  drawGrid();
}
function drawEdge(ctx2, x1, y1, x2, y2, distance) {
  const softness = 1 - Math.min(distance / MAX_DISTANCE, 1);
  ctx2.globalAlpha = lerp(EDGE.ALPHA_MIN, EDGE.ALPHA_MAX, softness);
  ctx2.lineWidth = lerp(EDGE.WIDTH_MIN, EDGE.WIDTH_MAX, softness);
  ctx2.beginPath();
  ctx2.moveTo(x1, y1);
  ctx2.lineTo(x2, y2);
  ctx2.strokeStyle = COLORS.EDGE;
  ctx2.stroke();
}
function drawNode(ctx2, x, y, centerX, centerY, isSelf) {
  const dx = x - centerX;
  const dy = y - centerY;
  const angle = Math.atan2(dy, dx);
  const tAngle = (angle + Math.PI) / TWO_PI;
  const r = (isSelf ? NODE.RADIUS_SELF : NODE.RADIUS_OTHER) + (tAngle - 0.5) * NODE.RADIUS_VARIATION;
  ctx2.beginPath();
  ctx2.arc(x, y, r, 0, TWO_PI);
  ctx2.fillStyle = isSelf ? COLORS.NODE_SELF : COLORS.NODE_OTHER;
  ctx2.globalAlpha = isSelf ? NODE.ALPHA_SELF : NODE.ALPHA_OTHER;
  ctx2.fill();
}
function drawGraph(t) {
  if (!ctx) return;
  nodes.set(id, {
    baseX: selfBase.x,
    baseY: selfBase.y
  });
  const now = performance.now();
  if (now - lastBroadcast > BROADCAST_INTERVAL) {
    lastBroadcast = now;
    channel.postMessage({
      type: "pos",
      id,
      x: selfBase.x,
      y: selfBase.y
    });
  }
  const entries = Array.from(nodes.entries()).map(([nid, n2]) => {
    const pos = getDrawPos(nid, n2.baseX, n2.baseY, t);
    return {
      id: nid,
      x: pos.x,
      y: pos.y
    };
  });
  if (entries.length === 0) return;
  const n = entries.length;
  const centerX = entries.reduce((sum, node) => sum + node.x, 0) / n;
  const centerY = entries.reduce((sum, node) => sum + node.y, 0) / n;
  const edges = /* @__PURE__ */ new Set();
  function addEdge(i, j) {
    if (i === j) return;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const key = `${a}-${b}`;
    if (edges.has(key)) return;
    edges.add(key);
    const na = entries[a];
    const nb = entries[b];
    const dx = na.x - nb.x;
    const dy = na.y - nb.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    if (ctx) drawEdge(ctx, na.x, na.y, nb.x, nb.y, distance);
  }
  for (let i = 0; i < n; i++) {
    const a = entries[i];
    const dists = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = entries[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      dists.push({
        j,
        d2: dx * dx + dy * dy
      });
    }
    dists.sort((u, v) => u.d2 - v.d2);
    const k = Math.min(MAX_EDGES_PER_NODE, dists.length);
    for (let m = 0; m < k; m++) {
      addEdge(i, dists[m].j);
    }
  }
  ctx.globalAlpha = 1;
  for (const node of entries) {
    if (ctx) drawNode(ctx, node.x, node.y, centerX, centerY, node.id === id);
  }
  ctx.globalAlpha = 1;
}
function loop() {
  const t = Date.now() * TIME_SCALE;
  drawBackground();
  drawGraph(t);
  requestAnimationFrame(loop);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
channel.onmessage = (event) => {
  const msg = event.data;
  if (!msg?.type) return;
  if (msg.type === "pos" && msg.id !== id) {
    nodes.set(msg.id, {
      baseX: msg.x,
      baseY: msg.y
    });
  }
  if (msg.type === "bye" && msg.id !== id) {
    nodes.delete(msg.id);
  }
};
window.addEventListener("beforeunload", () => {
  channel.postMessage({
    type: "bye",
    id
  });
});
createScreenLens((state) => {
  if (!canvas) return;
  const cx = state.viewportX + window.innerWidth / 2;
  const cy = state.viewportY + window.innerHeight / 2;
  selfBase = {
    x: cx,
    y: cy
  };
  canvas.style.transform = `translate(${state.canvasOffsetX}px, ${state.canvasOffsetY}px)`;
});
loop();
