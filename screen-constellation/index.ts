import "./index.css";
import { createWindowBoundsObserver } from "./utils/windowBoundsObserver.ts";
import { mulberry32, hashStringToSeed } from "./utils/random.ts";
import { TWO_PI } from "./utils/math.ts";
import {
  BROADCAST_INTERVAL,
  MAX_EDGES_PER_NODE,
  MIN_MAX_DISTANCE,
  NODE,
} from "./utils/config.ts";
import {
  type Point,
  ViewportBounds,
  drawBackground,
  drawEdge,
  drawNode,
} from "./utils/drawing.ts";

interface NodeAnimationParams {
  radius: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
}

interface NodeBasePosition {
  baseX: number;
  baseY: number;
}

interface RenderedNode {
  id: string;
  x: number;
  y: number;
}

interface NodeDistance {
  nodeIndex: number;
  distanceSquared: number;
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
const ctx = canvas?.getContext("2d");
const nodeId =
  (crypto.randomUUID && crypto.randomUUID()) ||
  Math.random().toString(36).slice(2);
const broadcastChannel = new BroadcastChannel("window-graph");
const nodePositions = new Map<string, NodeBasePosition>();
const nodeParamsCache = new Map<string, NodeAnimationParams>();

let currentNodeBase: NodeBasePosition = { baseX: 0, baseY: 0 };
let lastBroadcastTime = 0;
let viewportBounds: ViewportBounds = {
  minX: 0,
  minY: 0,
  maxX: window.innerWidth,
  maxY: window.innerHeight,
};

function resizeCanvas(): void {
  if (!canvas || !ctx) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const devicePixelRatio = window.devicePixelRatio || 1;

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function getNodeAnimationParams(nodeId: string): NodeAnimationParams {
  const cached = nodeParamsCache.get(nodeId);
  if (cached) return cached;

  const random = mulberry32(hashStringToSeed(nodeId) || 1);
  const params: NodeAnimationParams = {
    radius: NODE.RADIUS_MIN + random() * NODE.RADIUS_RANGE,
    speedX: NODE.SPEED_MIN + random() * NODE.SPEED_RANGE,
    speedY: NODE.SPEED_MIN + random() * NODE.SPEED_RANGE,
    phaseX: random() * TWO_PI,
    phaseY: random() * TWO_PI,
  };

  nodeParamsCache.set(nodeId, params);
  return params;
}

function calculateAnimatedPosition(
  nodeId: string,
  baseX: number,
  baseY: number,
  time: number
): Point {
  const params = getNodeAnimationParams(nodeId);
  return {
    x: baseX + Math.cos(time * params.speedX + params.phaseX) * params.radius,
    y: baseY + Math.sin(time * params.speedY + params.phaseY) * params.radius,
  };
}

function renderGraph(): void {
  if (!ctx) return;

  const renderingContext = ctx;
  const time = Date.now();
  const preciseTime = performance.now();

  nodePositions.set(nodeId, {
    baseX: currentNodeBase.baseX,
    baseY: currentNodeBase.baseY,
  });

  if (preciseTime - lastBroadcastTime > BROADCAST_INTERVAL) {
    lastBroadcastTime = preciseTime;
    broadcastChannel.postMessage({
      type: "pos",
      id: nodeId,
      x: currentNodeBase.baseX,
      y: currentNodeBase.baseY,
    });
  }

  const renderedNodes: RenderedNode[] = Array.from(nodePositions.entries()).map(
    ([id, nodeBase]) => {
      const position = calculateAnimatedPosition(
        id,
        nodeBase.baseX,
        nodeBase.baseY,
        time
      );
      return { id, x: position.x, y: position.y };
    }
  );

  if (renderedNodes.length === 0) return;

  const nodeCount = renderedNodes.length;
  const centerX =
    renderedNodes.reduce((sum, node) => sum + node.x, 0) / nodeCount;
  const centerY =
    renderedNodes.reduce((sum, node) => sum + node.y, 0) / nodeCount;
  const viewportWidth = viewportBounds.maxX - viewportBounds.minX;
  const viewportHeight = viewportBounds.maxY - viewportBounds.minY;
  const edges = new Set<string>();
  const edgeDistances: number[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const sourceNode = renderedNodes[i];
    const distances: NodeDistance[] = [];

    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const targetNode = renderedNodes[j];
      const dx = sourceNode.x - targetNode.x;
      const dy = sourceNode.y - targetNode.y;
      distances.push({
        nodeIndex: j,
        distanceSquared: dx * dx + dy * dy,
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
    const distances: NodeDistance[] = [];

    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const targetNode = renderedNodes[j];
      const dx = sourceNode.x - targetNode.x;
      const dy = sourceNode.y - targetNode.y;
      distances.push({
        nodeIndex: j,
        distanceSquared: dx * dx + dy * dy,
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

      drawEdge(
        renderingContext,
        { x: sourceNode.x, y: sourceNode.y },
        { x: targetNode.x, y: targetNode.y },
        distance,
        maxDistance,
        viewportBounds,
        viewportWidth,
        viewportHeight
      );
    }
  }

  renderingContext.globalAlpha = 1;
  const center: Point = { x: centerX, y: centerY };
  for (const node of renderedNodes) {
    drawNode(
      renderingContext,
      { x: node.x, y: node.y },
      center,
      node.id === nodeId,
      viewportBounds,
      viewportWidth,
      viewportHeight
    );
  }
  renderingContext.globalAlpha = 1;
}

function animationLoop(): void {
  if (!ctx) return;

  drawBackground(ctx, viewportBounds);
  renderGraph();
  requestAnimationFrame(animationLoop);
}

const windowBoundsObserver = createWindowBoundsObserver((state) => {
  if (!canvas) return;

  const { viewportX, viewportY } = state;
  const { innerWidth, innerHeight } = window;
  const centerX = viewportX + innerWidth / 2;
  const centerY = viewportY + innerHeight / 2;

  currentNodeBase = { baseX: centerX, baseY: centerY };

  viewportBounds = {
    minX: viewportX,
    minY: viewportY,
    maxX: viewportX + innerWidth,
    maxY: viewportY + innerHeight,
  };

  resizeCanvas();
});

broadcastChannel.onmessage = ({ data: { type, id, x, y } }: MessageEvent) => {
  if (!type || id === nodeId) return;

  switch (type) {
    case "pos":
      nodePositions.set(id, { baseX: x, baseY: y });
      break;

    case "bye":
      nodePositions.delete(id);
      break;
  }
};

window.addEventListener("beforeunload", () => {
  broadcastChannel.postMessage({ type: "bye", id: nodeId });
});

window.addEventListener("resize", () => {
  const { viewportX, viewportY } = windowBoundsObserver.getState();

  viewportBounds = {
    minX: viewportX,
    minY: viewportY,
    maxX: viewportX + window.innerWidth,
    maxY: viewportY + window.innerHeight,
  };

  resizeCanvas();
});

resizeCanvas();
animationLoop();
