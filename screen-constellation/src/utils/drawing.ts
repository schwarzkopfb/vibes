import { lerp, TWO_PI } from "./math.ts";
import {
  COLORS,
  EDGE,
  GRID,
  NODE,
  VIEWPORT_CULLING_PADDING,
} from "./config.ts";

export interface Point {
  x: number;
  y: number;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewportBounds: ViewportBounds
): void {
  const { minX, minY, maxX, maxY } = viewportBounds;
  const startX = Math.floor(minX / GRID.STEP) * GRID.STEP;
  const endX = Math.ceil(maxX / GRID.STEP) * GRID.STEP;
  const startY = Math.floor(minY / GRID.STEP) * GRID.STEP;
  const endY = Math.ceil(maxY / GRID.STEP) * GRID.STEP;

  ctx.save();
  ctx.strokeStyle = COLORS.GRID;
  ctx.globalAlpha = GRID.ALPHA;
  ctx.lineWidth = GRID.LINE_WIDTH;

  for (let x = startX; x <= endX; x += GRID.STEP) {
    const canvasX = x - minX + 0.5;
    ctx.beginPath();
    ctx.moveTo(canvasX, 0);
    ctx.lineTo(canvasX, maxY - minY);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += GRID.STEP) {
    const canvasY = y - minY + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, canvasY);
    ctx.lineTo(maxX - minX, canvasY);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  viewportBounds: ViewportBounds
): void {
  const width = viewportBounds.maxX - viewportBounds.minX;
  const height = viewportBounds.maxY - viewportBounds.minY;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, viewportBounds);
}

export function drawEdge(
  ctx: CanvasRenderingContext2D,
  point1: Point,
  point2: Point,
  distance: number,
  maxDistance: number,
  viewportBounds: ViewportBounds,
  viewportWidth: number,
  viewportHeight: number
): void {
  const { minX, minY } = viewportBounds;
  const canvasX1 = point1.x - minX;
  const canvasY1 = point1.y - minY;
  const canvasX2 = point2.x - minX;
  const canvasY2 = point2.y - minY;

  const minEdgeX = Math.min(canvasX1, canvasX2);
  const maxEdgeX = Math.max(canvasX1, canvasX2);
  const minEdgeY = Math.min(canvasY1, canvasY2);
  const maxEdgeY = Math.max(canvasY1, canvasY2);

  if (
    maxEdgeX < -VIEWPORT_CULLING_PADDING ||
    minEdgeX > viewportWidth + VIEWPORT_CULLING_PADDING ||
    maxEdgeY < -VIEWPORT_CULLING_PADDING ||
    minEdgeY > viewportHeight + VIEWPORT_CULLING_PADDING
  ) {
    return;
  }

  const normalizedDistance =
    maxDistance > 0 ? Math.min(distance / maxDistance, 1) : 0;
  const softness = 1 - Math.sqrt(normalizedDistance);

  ctx.save();
  ctx.globalAlpha = lerp(EDGE.ALPHA_MIN, EDGE.ALPHA_MAX, softness);
  ctx.lineWidth = lerp(EDGE.WIDTH_MIN, EDGE.WIDTH_MAX, softness);
  ctx.strokeStyle = COLORS.EDGE;
  ctx.beginPath();
  ctx.moveTo(canvasX1, canvasY1);
  ctx.lineTo(canvasX2, canvasY2);
  ctx.stroke();
  ctx.restore();
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  point: Point,
  center: Point,
  isSelf: boolean,
  viewportBounds: ViewportBounds,
  viewportWidth: number,
  viewportHeight: number
): void {
  const { minX, minY } = viewportBounds;
  const canvasX = point.x - minX;
  const canvasY = point.y - minY;

  const maxRadius =
    NODE.RADIUS_SELF + NODE.RADIUS_RANGE + NODE.RADIUS_VARIATION;
  const cullingPadding = maxRadius;

  if (
    canvasX < -cullingPadding ||
    canvasX > viewportWidth + cullingPadding ||
    canvasY < -cullingPadding ||
    canvasY > viewportHeight + cullingPadding
  ) {
    return;
  }

  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const angle = Math.atan2(dy, dx);
  const normalizedAngle = (angle + Math.PI) / TWO_PI;
  const radius =
    (isSelf ? NODE.RADIUS_SELF : NODE.RADIUS_OTHER) +
    (normalizedAngle - 0.5) * NODE.RADIUS_VARIATION;

  ctx.save();
  ctx.fillStyle = isSelf ? COLORS.NODE_SELF : COLORS.NODE_OTHER;
  ctx.globalAlpha = isSelf ? NODE.ALPHA_SELF : NODE.ALPHA_OTHER;
  ctx.beginPath();
  ctx.arc(canvasX, canvasY, radius, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}
