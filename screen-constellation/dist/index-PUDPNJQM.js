// src/utils/windowBoundsObserver.ts
function createWindowBoundsObserver(onUpdate) {
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

// src/utils/random.ts
var MULBERRY_SEED = 1831565813;
var UINT32_MAX = 4294967296;
var HASH_MULTIPLIER = 31;
function mulberry32(seed) {
  let state = seed | 0;
  return () => {
    state |= 0;
    state = state + MULBERRY_SEED | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / UINT32_MAX;
  };
}
function hashStringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = hash * HASH_MULTIPLIER + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

// src/utils/math.ts
var TWO_PI = Math.PI * 2;
function lerp(min, max, t) {
  return min + (max - min) * t;
}

// src/utils/config.ts
var BROADCAST_INTERVAL = 400;
var COLORS = {
  BACKGROUND: "#fafafa",
  GRID: "#959596",
  NODE_SELF: "#8c8c8c",
  NODE_OTHER: "#aba9a9",
  EDGE: "#43464a"
};
var EDGE = {
  ALPHA_MIN: 0.12,
  ALPHA_MAX: 0.4,
  WIDTH_MIN: 1.2,
  WIDTH_MAX: 2.5
};
var GRID = {
  ALPHA: 0.35,
  LINE_WIDTH: 0.5,
  STEP: 60
};
var NODE = {
  ALPHA_OTHER: 0.85,
  ALPHA_SELF: 0.95,
  RADIUS_MIN: 8,
  RADIUS_OTHER: 3.2,
  RADIUS_RANGE: 24,
  RADIUS_SELF: 4.2,
  RADIUS_VARIATION: 0.4,
  // animation speeds are in radians per millisecond (for oscillation cycles)
  SPEED_MIN: 35e-5,
  SPEED_RANGE: 45e-5
};
var MAX_EDGES_PER_NODE = 3;
var MIN_MAX_DISTANCE = 100;
var VIEWPORT_CULLING_PADDING = 50;

// src/utils/drawing.ts
function drawGrid(ctx2, viewportBounds2) {
  const { minX, minY, maxX, maxY } = viewportBounds2;
  const startX = Math.floor(minX / GRID.STEP) * GRID.STEP;
  const endX = Math.ceil(maxX / GRID.STEP) * GRID.STEP;
  const startY = Math.floor(minY / GRID.STEP) * GRID.STEP;
  const endY = Math.ceil(maxY / GRID.STEP) * GRID.STEP;
  ctx2.save();
  ctx2.strokeStyle = COLORS.GRID;
  ctx2.globalAlpha = GRID.ALPHA;
  ctx2.lineWidth = GRID.LINE_WIDTH;
  for (let x = startX; x <= endX; x += GRID.STEP) {
    const canvasX = x - minX + 0.5;
    ctx2.beginPath();
    ctx2.moveTo(canvasX, 0);
    ctx2.lineTo(canvasX, maxY - minY);
    ctx2.stroke();
  }
  for (let y = startY; y <= endY; y += GRID.STEP) {
    const canvasY = y - minY + 0.5;
    ctx2.beginPath();
    ctx2.moveTo(0, canvasY);
    ctx2.lineTo(maxX - minX, canvasY);
    ctx2.stroke();
  }
  ctx2.restore();
}
function drawBackground(ctx2, viewportBounds2) {
  const width = viewportBounds2.maxX - viewportBounds2.minX;
  const height = viewportBounds2.maxY - viewportBounds2.minY;
  ctx2.clearRect(0, 0, width, height);
  ctx2.fillStyle = COLORS.BACKGROUND;
  ctx2.fillRect(0, 0, width, height);
  drawGrid(ctx2, viewportBounds2);
}
function drawEdge(ctx2, point1, point2, distance, maxDistance, viewportBounds2, viewportWidth, viewportHeight) {
  const { minX, minY } = viewportBounds2;
  const canvasX1 = point1.x - minX;
  const canvasY1 = point1.y - minY;
  const canvasX2 = point2.x - minX;
  const canvasY2 = point2.y - minY;
  const minEdgeX = Math.min(canvasX1, canvasX2);
  const maxEdgeX = Math.max(canvasX1, canvasX2);
  const minEdgeY = Math.min(canvasY1, canvasY2);
  const maxEdgeY = Math.max(canvasY1, canvasY2);
  if (maxEdgeX < -VIEWPORT_CULLING_PADDING || minEdgeX > viewportWidth + VIEWPORT_CULLING_PADDING || maxEdgeY < -VIEWPORT_CULLING_PADDING || minEdgeY > viewportHeight + VIEWPORT_CULLING_PADDING) {
    return;
  }
  const normalizedDistance = maxDistance > 0 ? Math.min(distance / maxDistance, 1) : 0;
  const softness = 1 - Math.sqrt(normalizedDistance);
  ctx2.save();
  ctx2.globalAlpha = lerp(EDGE.ALPHA_MIN, EDGE.ALPHA_MAX, softness);
  ctx2.lineWidth = lerp(EDGE.WIDTH_MIN, EDGE.WIDTH_MAX, softness);
  ctx2.strokeStyle = COLORS.EDGE;
  ctx2.beginPath();
  ctx2.moveTo(canvasX1, canvasY1);
  ctx2.lineTo(canvasX2, canvasY2);
  ctx2.stroke();
  ctx2.restore();
}
function drawNode(ctx2, point, center, isSelf, viewportBounds2, viewportWidth, viewportHeight) {
  const { minX, minY } = viewportBounds2;
  const canvasX = point.x - minX;
  const canvasY = point.y - minY;
  const maxRadius = NODE.RADIUS_SELF + NODE.RADIUS_RANGE + NODE.RADIUS_VARIATION;
  const cullingPadding = maxRadius;
  if (canvasX < -cullingPadding || canvasX > viewportWidth + cullingPadding || canvasY < -cullingPadding || canvasY > viewportHeight + cullingPadding) {
    return;
  }
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const angle = Math.atan2(dy, dx);
  const normalizedAngle = (angle + Math.PI) / TWO_PI;
  const radius = (isSelf ? NODE.RADIUS_SELF : NODE.RADIUS_OTHER) + (normalizedAngle - 0.5) * NODE.RADIUS_VARIATION;
  ctx2.save();
  ctx2.fillStyle = isSelf ? COLORS.NODE_SELF : COLORS.NODE_OTHER;
  ctx2.globalAlpha = isSelf ? NODE.ALPHA_SELF : NODE.ALPHA_OTHER;
  ctx2.beginPath();
  ctx2.arc(canvasX, canvasY, radius, 0, TWO_PI);
  ctx2.fill();
  ctx2.restore();
}

// src/index.ts
var canvas = document.getElementById("canvas");
var ctx = canvas?.getContext("2d");
var nodeId = crypto.randomUUID && crypto.randomUUID() || Math.random().toString(36).slice(2);
var broadcastChannel = new BroadcastChannel("window-graph");
var nodePositions = /* @__PURE__ */ new Map();
var nodeParamsCache = /* @__PURE__ */ new Map();
var currentNodeBase = {
  baseX: 0,
  baseY: 0
};
var lastBroadcastTime = 0;
var viewportBounds = {
  minX: 0,
  minY: 0,
  maxX: window.innerWidth,
  maxY: window.innerHeight
};
function resizeCanvas() {
  if (!canvas || !ctx) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
function getNodeAnimationParams(nodeId2) {
  const cached = nodeParamsCache.get(nodeId2);
  if (cached) return cached;
  const random = mulberry32(hashStringToSeed(nodeId2) || 1);
  const params = {
    radius: NODE.RADIUS_MIN + random() * NODE.RADIUS_RANGE,
    speedX: NODE.SPEED_MIN + random() * NODE.SPEED_RANGE,
    speedY: NODE.SPEED_MIN + random() * NODE.SPEED_RANGE,
    phaseX: random() * TWO_PI,
    phaseY: random() * TWO_PI
  };
  nodeParamsCache.set(nodeId2, params);
  return params;
}
function calculateAnimatedPosition(nodeId2, baseX, baseY, time) {
  const params = getNodeAnimationParams(nodeId2);
  return {
    x: baseX + Math.cos(time * params.speedX + params.phaseX) * params.radius,
    y: baseY + Math.sin(time * params.speedY + params.phaseY) * params.radius
  };
}
function renderGraph() {
  if (!ctx) return;
  const renderingContext = ctx;
  const time = Date.now();
  const preciseTime = performance.now();
  nodePositions.set(nodeId, {
    baseX: currentNodeBase.baseX,
    baseY: currentNodeBase.baseY
  });
  if (preciseTime - lastBroadcastTime > BROADCAST_INTERVAL) {
    lastBroadcastTime = preciseTime;
    broadcastChannel.postMessage({
      type: "pos",
      id: nodeId,
      x: currentNodeBase.baseX,
      y: currentNodeBase.baseY
    });
  }
  const renderedNodes = Array.from(nodePositions.entries()).map(([id, nodeBase]) => {
    const position = calculateAnimatedPosition(id, nodeBase.baseX, nodeBase.baseY, time);
    return {
      id,
      x: position.x,
      y: position.y
    };
  });
  if (renderedNodes.length === 0) return;
  const nodeCount = renderedNodes.length;
  const centerX = renderedNodes.reduce((sum, node) => sum + node.x, 0) / nodeCount;
  const centerY = renderedNodes.reduce((sum, node) => sum + node.y, 0) / nodeCount;
  const viewportWidth = viewportBounds.maxX - viewportBounds.minX;
  const viewportHeight = viewportBounds.maxY - viewportBounds.minY;
  const edges = /* @__PURE__ */ new Set();
  const edgeDistances = [];
  for (let i = 0; i < nodeCount; i++) {
    const sourceNode = renderedNodes[i];
    const distances = [];
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const targetNode = renderedNodes[j];
      const dx = sourceNode.x - targetNode.x;
      const dy = sourceNode.y - targetNode.y;
      distances.push({
        nodeIndex: j,
        distanceSquared: dx * dx + dy * dy
      });
    }
    distances.sort((a, b) => a.distanceSquared - b.distanceSquared);
    const edgeCount = Math.min(MAX_EDGES_PER_NODE, distances.length);
    for (let m = 0; m < edgeCount; m++) {
      const targetIndex = distances[m].nodeIndex;
      const minIndex = Math.min(i, targetIndex);
      const maxIndex = Math.max(i, targetIndex);
      const edgeKey = `${minIndex}-${maxIndex}`;
      if (!edges.has(edgeKey)) {
        edges.add(edgeKey);
        const targetNode = renderedNodes[targetIndex];
        const dx = sourceNode.x - targetNode.x;
        const dy = sourceNode.y - targetNode.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0) {
          edgeDistances.push(distance);
        }
      }
    }
  }
  const maxDistance = Math.max(MIN_MAX_DISTANCE, ...edgeDistances);
  edges.clear();
  for (let i = 0; i < nodeCount; i++) {
    const sourceNode = renderedNodes[i];
    const distances = [];
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const targetNode = renderedNodes[j];
      const dx = sourceNode.x - targetNode.x;
      const dy = sourceNode.y - targetNode.y;
      distances.push({
        nodeIndex: j,
        distanceSquared: dx * dx + dy * dy
      });
    }
    distances.sort((a, b) => a.distanceSquared - b.distanceSquared);
    const edgeCount = Math.min(MAX_EDGES_PER_NODE, distances.length);
    for (let m = 0; m < edgeCount; m++) {
      const targetIndex = distances[m].nodeIndex;
      const minIndex = Math.min(i, targetIndex);
      const maxIndex = Math.max(i, targetIndex);
      const edgeKey = `${minIndex}-${maxIndex}`;
      if (edges.has(edgeKey)) continue;
      edges.add(edgeKey);
      const targetNode = renderedNodes[targetIndex];
      const dx = sourceNode.x - targetNode.x;
      const dy = sourceNode.y - targetNode.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0) continue;
      drawEdge(renderingContext, {
        x: sourceNode.x,
        y: sourceNode.y
      }, {
        x: targetNode.x,
        y: targetNode.y
      }, distance, maxDistance, viewportBounds, viewportWidth, viewportHeight);
    }
  }
  renderingContext.globalAlpha = 1;
  const center = {
    x: centerX,
    y: centerY
  };
  for (const node of renderedNodes) {
    drawNode(renderingContext, {
      x: node.x,
      y: node.y
    }, center, node.id === nodeId, viewportBounds, viewportWidth, viewportHeight);
  }
  renderingContext.globalAlpha = 1;
}
function animationLoop() {
  if (!ctx) return;
  drawBackground(ctx, viewportBounds);
  renderGraph();
  requestAnimationFrame(animationLoop);
}
var windowBoundsObserver = createWindowBoundsObserver((state) => {
  if (!canvas) return;
  const { viewportX, viewportY } = state;
  const { innerWidth, innerHeight } = window;
  const centerX = viewportX + innerWidth / 2;
  const centerY = viewportY + innerHeight / 2;
  currentNodeBase = {
    baseX: centerX,
    baseY: centerY
  };
  viewportBounds = {
    minX: viewportX,
    minY: viewportY,
    maxX: viewportX + innerWidth,
    maxY: viewportY + innerHeight
  };
  resizeCanvas();
});
broadcastChannel.onmessage = ({ data: { type, id, x, y } }) => {
  if (!type || id === nodeId) return;
  switch (type) {
    case "pos":
      nodePositions.set(id, {
        baseX: x,
        baseY: y
      });
      break;
    case "bye":
      nodePositions.delete(id);
      break;
  }
};
window.addEventListener("beforeunload", () => {
  broadcastChannel.postMessage({
    type: "bye",
    id: nodeId
  });
});
window.addEventListener("resize", () => {
  const { viewportX, viewportY } = windowBoundsObserver.getState();
  viewportBounds = {
    minX: viewportX,
    minY: viewportY,
    maxX: viewportX + window.innerWidth,
    maxY: viewportY + window.innerHeight
  };
  resizeCanvas();
});
resizeCanvas();
animationLoop();
