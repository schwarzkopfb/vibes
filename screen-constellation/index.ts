import "./index.css";
import { createScreenLens } from "./utils/positioner.ts";
import { mulberry32, hashStringToSeed } from "./utils/random.ts";
import { lerp, TWO_PI } from "./utils/math.ts";
import {
  BROADCAST_INTERVAL,
  COLORS,
  EDGE,
  GRID,
  MAX_DISTANCE,
  MAX_EDGES_PER_NODE,
  NODE,
  TIME_SCALE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./utils/config.ts";

type NodeParams = {
  radius: number;
  s1: number;
  s2: number;
  phi: number;
  psi: number;
};

type Node = { baseX: number; baseY: number };
type NodeEntry = { id: string; x: number; y: number };
type Distance = { j: number; d2: number };

const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
const ctx = canvas?.getContext("2d");
const id =
  (crypto.randomUUID && crypto.randomUUID()) ||
  Math.random().toString(36).slice(2);
const channel = new BroadcastChannel("window-graph");
const nodes = new Map<string, Node>();
const nodeParamsCache = new Map<string, NodeParams>();

let selfBase = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
let lastBroadcast = 0;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.style.width = `${WORLD_WIDTH}px`;
  canvas.style.height = `${WORLD_HEIGHT}px`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = WORLD_WIDTH * dpr;
  canvas.height = WORLD_HEIGHT * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getNodeParams(nodeId: string): NodeParams {
  let p = nodeParamsCache.get(nodeId);
  if (p) return p;
  const r = mulberry32(hashStringToSeed(nodeId) || 1);
  p = {
    radius: NODE.RADIUS_MIN + r() * NODE.RADIUS_RANGE,
    s1: NODE.SPEED_MIN + r() * NODE.SPEED_RANGE,
    s2: NODE.SPEED_MIN + r() * NODE.SPEED_RANGE,
    phi: r() * TWO_PI,
    psi: r() * TWO_PI,
  };
  nodeParamsCache.set(nodeId, p);
  return p;
}

function getDrawPos(nodeId: string, baseX: number, baseY: number, t: number) {
  const p = getNodeParams(nodeId);
  return {
    x: baseX + Math.cos(t * p.s1 + p.phi) * p.radius,
    y: baseY + Math.sin(t * p.s2 + p.psi) * p.radius,
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

function drawEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  distance: number
) {
  const softness = 1 - Math.min(distance / MAX_DISTANCE, 1);
  ctx.globalAlpha = lerp(EDGE.ALPHA_MIN, EDGE.ALPHA_MAX, softness);
  ctx.lineWidth = lerp(EDGE.WIDTH_MIN, EDGE.WIDTH_MAX, softness);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = COLORS.EDGE;
  ctx.stroke();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  isSelf: boolean
) {
  const dx = x - centerX;
  const dy = y - centerY;
  const angle = Math.atan2(dy, dx);
  const tAngle = (angle + Math.PI) / TWO_PI;
  const r =
    (isSelf ? NODE.RADIUS_SELF : NODE.RADIUS_OTHER) +
    (tAngle - 0.5) * NODE.RADIUS_VARIATION;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, TWO_PI);
  ctx.fillStyle = isSelf ? COLORS.NODE_SELF : COLORS.NODE_OTHER;
  ctx.globalAlpha = isSelf ? NODE.ALPHA_SELF : NODE.ALPHA_OTHER;
  ctx.fill();
}

function drawGraph(t: number) {
  if (!ctx) return;

  nodes.set(id, { baseX: selfBase.x, baseY: selfBase.y });

  const now = performance.now();
  if (now - lastBroadcast > BROADCAST_INTERVAL) {
    lastBroadcast = now;
    channel.postMessage({ type: "pos", id, x: selfBase.x, y: selfBase.y });
  }

  const entries: NodeEntry[] = Array.from(nodes.entries()).map(([nid, n]) => {
    const pos = getDrawPos(nid, n.baseX, n.baseY, t);
    return { id: nid, x: pos.x, y: pos.y };
  });

  if (entries.length === 0) return;

  const n = entries.length;
  const centerX = entries.reduce((sum, node) => sum + node.x, 0) / n;
  const centerY = entries.reduce((sum, node) => sum + node.y, 0) / n;
  const edges = new Set<string>();

  function addEdge(i: number, j: number) {
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
    const dists: Distance[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = entries[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      dists.push({ j, d2: dx * dx + dy * dy });
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
    nodes.set(msg.id, { baseX: msg.x, baseY: msg.y });
  }
  if (msg.type === "bye" && msg.id !== id) {
    nodes.delete(msg.id);
  }
};

window.addEventListener("beforeunload", () => {
  channel.postMessage({ type: "bye", id });
});

createScreenLens((state) => {
  if (!canvas) return;
  const cx = state.viewportX + window.innerWidth / 2;
  const cy = state.viewportY + window.innerHeight / 2;
  selfBase = { x: cx, y: cy };
  canvas.style.transform = `translate(${state.canvasOffsetX}px, ${state.canvasOffsetY}px)`;
});

loop();
